from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Set
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import json

# Stripe Checkout Integration
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - with fallback for production environments
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError("MONGO_URL environment variable is required")

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'afroboost_db')]

app = FastAPI(title="Afroboost API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== HEALTH CHECK (Required for Kubernetes) ====================

@app.get("/health")
async def health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    try:
        # Test MongoDB connection
        await client.admin.command('ping')
        return JSONResponse(
            status_code=200,
            content={"status": "healthy", "database": "connected"}
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": "disconnected", "error": str(e)}
        )

@app.get("/api/health")
async def api_health_check():
    """Health check endpoint via /api prefix for Kubernetes"""
    return await health_check()

# Favicon endpoint to prevent 404 errors
@app.get("/api/favicon.ico")
async def favicon():
    """Return empty response for favicon requests to prevent 404 errors"""
    from starlette.responses import Response
    return Response(status_code=204)

@api_router.get("/favicon.ico")
async def api_favicon():
    """Return empty response for favicon requests via API router"""
    from starlette.responses import Response
    return Response(status_code=204)

# ==================== SILENT DISCO - WEBSOCKET MANAGER ====================
# Gestionnaire de connexions WebSocket pour la synchronisation audio temps réel

# ========== NOTIFICATION MANAGER: Broadcast global SESSION_START/SESSION_END ==========
class NotificationManager:
    """
    Gère les notifications globales vers tous les clients connectés.
    Utilisé pour informer instantanément de SESSION_START/SESSION_END.
    """
    def __init__(self):
        self.global_subscribers: Set[WebSocket] = set()
    
    async def subscribe(self, websocket: WebSocket):
        """Ajoute un client aux notifications globales"""
        self.global_subscribers.add(websocket)
        logger.info(f"[Notifications] Client subscribed. Total: {len(self.global_subscribers)}")
    
    def unsubscribe(self, websocket: WebSocket):
        """Retire un client des notifications globales"""
        self.global_subscribers.discard(websocket)
        logger.info(f"[Notifications] Client unsubscribed. Total: {len(self.global_subscribers)}")
    
    async def broadcast_session_event(self, event_type: str, data: dict = None):
        """
        Broadcast un événement SESSION_START ou SESSION_END à tous les clients.
        Appelé par le SilentDiscoManager quand le coach démarre/termine.
        """
        message = {
            "type": event_type,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        disconnected = []
        for ws in self.global_subscribers:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"[Notifications] Failed to send to client: {e}")
                disconnected.append(ws)
        
        # Nettoyer les connexions mortes
        for ws in disconnected:
            self.unsubscribe(ws)
        
        logger.info(f"[Notifications] Broadcast {event_type} to {len(self.global_subscribers)} clients")

# Instance globale du gestionnaire de notifications
notification_manager = NotificationManager()

class SilentDiscoManager:
    """
    Gère les sessions de Silent Disco avec synchronisation temps réel.
    - Le Coach (DJ) envoie des commandes (PLAY, PAUSE, SEEK, TRACK_CHANGE)
    - Les Participants reçoivent ces commandes et synchronisent leur lecteur
    """
    def __init__(self):
        # Connexions actives par session: {session_id: {websocket: user_info}}
        self.active_connections: Dict[str, Dict[WebSocket, dict]] = {}
        # État actuel de chaque session: {session_id: {playing, track_index, position, timestamp}}
        self.session_states: Dict[str, dict] = {}
        # Coach actif par session: {session_id: websocket}
        self.session_coaches: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str, user_info: dict):
        """Connecte un utilisateur à une session"""
        await websocket.accept()
        
        if session_id not in self.active_connections:
            self.active_connections[session_id] = {}
            self.session_states[session_id] = {
                "playing": False,
                "track_index": 0,
                "position": 0.0,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "course_id": None,
                "course_name": None
            }
        
        self.active_connections[session_id][websocket] = user_info
        
        # Si c'est le coach (Super Admin), l'enregistrer
        if user_info.get("is_coach", False):
            self.session_coaches[session_id] = websocket
        
        # Envoyer l'état actuel au nouvel arrivant
        await self.send_state_to_client(websocket, session_id)
        
        # Notifier tous les participants du nouveau compteur
        await self.broadcast_participant_count(session_id)
        
        logger.info(f"[Silent Disco] {user_info.get('email', 'Anonymous')} joined session {session_id}")
    
    def disconnect(self, websocket: WebSocket, session_id: str):
        """Déconnecte un utilisateur d'une session"""
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                user_info = self.active_connections[session_id].pop(websocket)
                logger.info(f"[Silent Disco] {user_info.get('email', 'Anonymous')} left session {session_id}")
            
            # Si c'était le coach, le retirer
            if self.session_coaches.get(session_id) == websocket:
                del self.session_coaches[session_id]
            
            # Si plus personne dans la session, nettoyer
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
                if session_id in self.session_states:
                    del self.session_states[session_id]
    
    async def send_state_to_client(self, websocket: WebSocket, session_id: str):
        """Envoie l'état actuel de la session à un client"""
        if session_id in self.session_states:
            state = self.session_states[session_id]
            participant_count = len(self.active_connections.get(session_id, {}))
            await websocket.send_json({
                "type": "STATE_SYNC",
                "data": {
                    **state,
                    "participant_count": participant_count,
                    "server_time": datetime.now(timezone.utc).isoformat()
                }
            })
    
    async def broadcast_participant_count(self, session_id: str):
        """Diffuse le nombre de participants à tous"""
        if session_id in self.active_connections:
            count = len(self.active_connections[session_id])
            await self.broadcast(session_id, {
                "type": "PARTICIPANT_COUNT",
                "data": {"count": count}
            })
    
    async def broadcast(self, session_id: str, message: dict, exclude: WebSocket = None):
        """Diffuse un message à tous les participants d'une session"""
        if session_id in self.active_connections:
            disconnected = []
            for ws in self.active_connections[session_id]:
                if ws != exclude:
                    try:
                        await ws.send_json(message)
                    except Exception as e:
                        logger.warning(f"[Silent Disco] Failed to send to client: {e}")
                        disconnected.append(ws)
            
            # Nettoyer les connexions mortes
            for ws in disconnected:
                self.disconnect(ws, session_id)
    
    async def handle_coach_command(self, session_id: str, command: dict, sender_ws: WebSocket):
        """
        Traite une commande du coach et la diffuse aux participants.
        SÉCURITÉ: Seul le coach enregistré peut envoyer des commandes PLAY/PAUSE/etc.
        Les participants sont bloqués automatiquement.
        """
        # Récupérer les infos de l'émetteur
        sender_info = self.active_connections.get(session_id, {}).get(sender_ws, {})
        is_coach = sender_info.get("is_coach", False)
        sender_email = sender_info.get("email", "unknown")
        
        # SÉCURITÉ: Vérifier que c'est bien un coach authentifié
        if not is_coach:
            logger.warning(f"[Silent Disco] BLOCKED: Participant {sender_email} tried to send {command.get('type')}")
            await sender_ws.send_json({
                "type": "ERROR",
                "data": {
                    "message": "Action non autorisée. Seul le coach peut contrôler la session.",
                    "code": "UNAUTHORIZED"
                }
            })
            return
        
        # Vérifier que c'est bien le coach de cette session
        if self.session_coaches.get(session_id) != sender_ws:
            logger.warning(f"[Silent Disco] BLOCKED: Coach {sender_email} is not the session owner")
            await sender_ws.send_json({
                "type": "ERROR",
                "data": {
                    "message": "Vous n'êtes pas le coach de cette session.",
                    "code": "NOT_SESSION_OWNER"
                }
            })
            return
        
        cmd_type = command.get("type")
        cmd_data = command.get("data", {})
        server_timestamp = datetime.now(timezone.utc).isoformat()
        
        logger.info(f"[Silent Disco] Coach {sender_email} sending {cmd_type} to session {session_id}")
        
        # Mettre à jour l'état de la session
        if cmd_type == "PLAY":
            self.session_states[session_id]["playing"] = True
            self.session_states[session_id]["position"] = cmd_data.get("position", 0.0)
            self.session_states[session_id]["timestamp"] = server_timestamp
        
        elif cmd_type == "PAUSE":
            self.session_states[session_id]["playing"] = False
            self.session_states[session_id]["position"] = cmd_data.get("position", 0.0)
            self.session_states[session_id]["timestamp"] = server_timestamp
        
        elif cmd_type == "SEEK":
            self.session_states[session_id]["position"] = cmd_data.get("position", 0.0)
            self.session_states[session_id]["timestamp"] = server_timestamp
        
        elif cmd_type == "TRACK_CHANGE":
            self.session_states[session_id]["track_index"] = cmd_data.get("track_index", 0)
            self.session_states[session_id]["position"] = 0.0
            self.session_states[session_id]["timestamp"] = server_timestamp
        
        elif cmd_type == "SESSION_START":
            self.session_states[session_id]["course_id"] = cmd_data.get("course_id")
            self.session_states[session_id]["course_name"] = cmd_data.get("course_name")
            self.session_states[session_id]["course_image"] = cmd_data.get("course_image")  # Image de couverture
            self.session_states[session_id]["playing"] = False
            self.session_states[session_id]["track_index"] = 0
            self.session_states[session_id]["position"] = 0.0
            # ========== BROADCAST GLOBAL: Notifier tous les clients ==========
            await notification_manager.broadcast_session_event("SESSION_START", {
                "session_id": session_id,
                "course_name": cmd_data.get("course_name"),
                "course_image": cmd_data.get("course_image")
            })
        
        elif cmd_type == "SESSION_END":
            self.session_states[session_id]["playing"] = False
            # ========== BROADCAST GLOBAL: Notifier tous les clients ==========
            await notification_manager.broadcast_session_event("SESSION_END", {
                "session_id": session_id
            })
        
        # Diffuser la commande à tous les participants (sauf le coach)
        broadcast_message = {
            "type": cmd_type,
            "data": {
                **cmd_data,
                "server_timestamp": server_timestamp,
                "session_state": self.session_states[session_id]
            }
        }
        
        await self.broadcast(session_id, broadcast_message, exclude=None)
        logger.info(f"[Silent Disco] Command {cmd_type} broadcast to {len(self.active_connections.get(session_id, {}))} clients")
    
    def get_session_info(self, session_id: str) -> dict:
        """Retourne les informations sur une session"""
        return {
            "session_id": session_id,
            "participant_count": len(self.active_connections.get(session_id, {})),
            "has_coach": session_id in self.session_coaches,
            "state": self.session_states.get(session_id, {})
        }

# Instance globale du gestionnaire Silent Disco
silent_disco_manager = SilentDiscoManager()

# ==================== WEBSOCKET ENDPOINTS ====================

# ========== WEBSOCKET NOTIFICATIONS GLOBALES ==========
@app.websocket("/ws/notifications")
async def websocket_notifications(websocket: WebSocket):
    """WebSocket pour recevoir les notifications globales SESSION_START/SESSION_END"""
    await handle_notifications_websocket(websocket)

@app.websocket("/api/ws/notifications")
async def websocket_notifications_api(websocket: WebSocket):
    """WebSocket notifications via /api prefix for Kubernetes ingress"""
    await handle_notifications_websocket(websocket)

async def handle_notifications_websocket(websocket: WebSocket):
    """
    WebSocket global pour notifications temps réel.
    Les clients reçoivent SESSION_START/SESSION_END sans avoir à rejoindre une session.
    """
    try:
        await websocket.accept()
        await notification_manager.subscribe(websocket)
        
        # Envoyer l'état initial (y a-t-il une session active?)
        has_active = any(
            state.get("course_name") for state in silent_disco_manager.session_states.values()
        )
        await websocket.send_json({
            "type": "SESSION_ACTIVE" if has_active else "NO_ACTIVE_SESSION",
            "data": {"has_active": has_active}
        })
        
        # Garder la connexion ouverte et répondre aux pings
        while True:
            try:
                message = await websocket.receive_json()
                if message.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                elif message.get("type") == "SUBSCRIBE":
                    # Confirmation de souscription
                    await websocket.send_json({"type": "SUBSCRIBED", "data": {"events": ["SESSION_START", "SESSION_END"]}})
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.warning(f"[Notifications WS] Error: {e}")
                break
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[Notifications WS] Connection error: {e}")
    finally:
        notification_manager.unsubscribe(websocket)

# WebSocket sans préfixe /api (pour connexion directe)
@app.websocket("/ws/session/{session_id}")
async def websocket_session(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint pour la synchronisation Silent Disco.
    
    Connexion: Envoyer un message JSON initial avec user_info:
    {"type": "JOIN", "data": {"email": "...", "name": "...", "is_coach": true/false}}
    
    Commandes Coach (is_coach=true):
    - {"type": "PLAY", "data": {"position": 0.0}}
    - {"type": "PAUSE", "data": {"position": 45.2}}
    - {"type": "SEEK", "data": {"position": 30.0}}
    - {"type": "TRACK_CHANGE", "data": {"track_index": 1}}
    - {"type": "SESSION_START", "data": {"course_id": "...", "course_name": "..."}}
    - {"type": "SESSION_END", "data": {}}
    """
    await handle_websocket_session(websocket, session_id)

# WebSocket avec préfixe /api (pour passer par l'ingress Kubernetes)
@app.websocket("/api/ws/session/{session_id}")
async def websocket_session_api(websocket: WebSocket, session_id: str):
    """WebSocket endpoint via /api prefix for Kubernetes ingress compatibility"""
    await handle_websocket_session(websocket, session_id)

async def handle_websocket_session(websocket: WebSocket, session_id: str):
    """Logique commune pour les WebSocket endpoints Silent Disco"""
    user_info = {"email": "anonymous", "name": "Participant", "is_coach": False}
    
    try:
        # Attendre le message de connexion initial
        await websocket.accept()
        initial_msg = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
        
        if initial_msg.get("type") == "JOIN":
            user_info = initial_msg.get("data", user_info)
        
        # Enregistrer la connexion
        if session_id not in silent_disco_manager.active_connections:
            silent_disco_manager.active_connections[session_id] = {}
            silent_disco_manager.session_states[session_id] = {
                "playing": False,
                "track_index": 0,
                "position": 0.0,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "course_id": None,
                "course_name": None,
                "course_image": None  # Image de couverture du cours
            }
        
        silent_disco_manager.active_connections[session_id][websocket] = user_info
        
        # Si c'est le coach (Super Admin), l'enregistrer
        if user_info.get("is_coach", False):
            silent_disco_manager.session_coaches[session_id] = websocket
            logger.info(f"[Silent Disco] Coach {user_info.get('email')} connected to session {session_id}")
        else:
            logger.info(f"[Silent Disco] Participant {user_info.get('email')} joined session {session_id}")
        
        # Envoyer l'état actuel
        await silent_disco_manager.send_state_to_client(websocket, session_id)
        await silent_disco_manager.broadcast_participant_count(session_id)
        
        # Boucle de réception des messages
        while True:
            try:
                message = await websocket.receive_json()
                msg_type = message.get("type")
                
                if msg_type == "PING":
                    await websocket.send_json({"type": "PONG", "data": {"server_time": datetime.now(timezone.utc).isoformat()}})
                
                elif msg_type in ["PLAY", "PAUSE", "SEEK", "TRACK_CHANGE", "SESSION_START", "SESSION_END"]:
                    # Commandes du coach uniquement
                    await silent_disco_manager.handle_coach_command(session_id, message, websocket)
                
                elif msg_type == "GET_STATE":
                    await silent_disco_manager.send_state_to_client(websocket, session_id)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"[Silent Disco] Error processing message: {e}")
                break
    
    except asyncio.TimeoutError:
        logger.warning("[Silent Disco] Connection timeout - no JOIN message received")
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"[Silent Disco] WebSocket error: {e}")
    finally:
        silent_disco_manager.disconnect(websocket, session_id)
        await silent_disco_manager.broadcast_participant_count(session_id)

@api_router.get("/silent-disco/sessions")
async def get_active_sessions():
    """Retourne la liste des sessions Silent Disco actives"""
    sessions = []
    for session_id in silent_disco_manager.active_connections:
        sessions.append(silent_disco_manager.get_session_info(session_id))
    return sessions

@api_router.get("/silent-disco/session/{session_id}")
async def get_session_info(session_id: str):
    """Retourne les informations d'une session spécifique"""
    if session_id not in silent_disco_manager.active_connections:
        raise HTTPException(status_code=404, detail="Session not found")
    return silent_disco_manager.get_session_info(session_id)

@api_router.get("/silent-disco/active-sessions")
async def get_active_sessions_public():
    """
    Retourne la liste des sessions actives (celles où le coach a démarré).
    Utilisé par le frontend pour afficher/masquer le bouton REJOINDRE LE LIVE.
    """
    active = []
    for session_id, state in silent_disco_manager.session_states.items():
        if state.get("course_name"):  # Session démarrée = a un course_name
            active.append({
                "session_id": session_id,
                "course_name": state.get("course_name"),
                "course_image": state.get("course_image"),
                "playing": state.get("playing", False),
                "participant_count": len(silent_disco_manager.active_connections.get(session_id, {}))
            })
    return {"active_sessions": active, "has_active": len(active) > 0}

# ==================== MODELS ====================

class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    weekday: int
    time: str
    locationName: str
    mapsUrl: Optional[str] = ""
    visible: bool = True
    archived: bool = False  # Archive au lieu de supprimer
    playlist: Optional[List[str]] = None  # Liste des URLs audio pour ce cours
    authorEmail: Optional[str] = None  # Email du coach propriétaire (None = tous les coachs)

class CourseCreate(BaseModel):
    name: str
    weekday: int
    time: str
    locationName: str
    mapsUrl: Optional[str] = ""
    visible: bool = True
    archived: bool = False
    playlist: Optional[List[str]] = None  # Liste des URLs audio
    authorEmail: Optional[str] = None  # Email du coach propriétaire

class Offer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    thumbnail: Optional[str] = ""
    videoUrl: Optional[str] = ""
    description: Optional[str] = ""
    keywords: Optional[str] = ""  # Mots-clés pour la recherche (invisible)
    visible: bool = True
    images: List[str] = []  # Support multi-images (max 5)
    # E-commerce fields
    category: Optional[str] = ""  # Ex: "service", "tshirt", "shoes", "supplement"
    isProduct: bool = False  # True = physical product, False = service/course
    variants: Optional[dict] = None  # { sizes: ["S","M","L"], colors: ["Noir","Blanc"], weights: ["0.5kg","1kg"] }
    tva: float = 0.0  # TVA percentage
    shippingCost: float = 0.0  # Frais de port
    stock: int = -1  # -1 = unlimited
    authorEmail: Optional[str] = None  # Email du coach propriétaire

class OfferCreate(BaseModel):
    name: str
    price: float
    thumbnail: Optional[str] = ""
    videoUrl: Optional[str] = ""
    description: Optional[str] = ""
    keywords: Optional[str] = ""  # Mots-clés pour la recherche
    visible: bool = True
    images: List[str] = []  # Support multi-images (max 5)
    # E-commerce fields
    category: Optional[str] = ""
    isProduct: bool = False
    variants: Optional[dict] = None
    tva: float = 0.0
    shippingCost: float = 0.0
    stock: int = -1
    authorEmail: Optional[str] = None  # Email du coach propriétaire

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    whatsapp: Optional[str] = ""
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    name: str
    email: str
    whatsapp: Optional[str] = ""

class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reservationCode: str
    userId: str
    userName: str
    userEmail: str
    userWhatsapp: Optional[str] = ""
    courseId: str
    courseName: str
    courseTime: str
    datetime: str
    offerId: str
    offerName: str
    price: float
    quantity: int = 1
    totalPrice: float
    discountCode: Optional[str] = None
    discountType: Optional[str] = None
    discountValue: Optional[float] = None
    createdAt: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # E-commerce / Shipping fields
    validated: bool = False
    validatedAt: Optional[str] = None
    selectedVariants: Optional[dict] = None  # { size: "M", color: "Noir" }
    variantsText: Optional[str] = None  # "Taille: M, Couleur: Noir"
    shippingAddress: Optional[str] = None  # Adresse de livraison
    isProduct: bool = False  # True si produit physique
    tva: float = 0.0
    shippingCost: float = 0.0
    trackingNumber: Optional[str] = None  # Numéro de suivi colis
    shippingStatus: str = "pending"  # pending, shipped, delivered
    # Multi-date selection support
    selectedDates: Optional[List[str]] = None  # Array of ISO date strings
    selectedDatesText: Optional[str] = None  # Formatted text of selected dates

class ReservationCreate(BaseModel):
    userId: str
    userName: str
    userEmail: str
    userWhatsapp: Optional[str] = ""
    courseId: str
    courseName: str
    courseTime: str
    datetime: str
    offerId: str
    offerName: str
    price: float
    quantity: int = 1
    totalPrice: float
    discountCode: Optional[str] = None
    discountType: Optional[str] = None
    discountValue: Optional[float] = None
    selectedVariants: Optional[dict] = None
    variantsText: Optional[str] = None
    shippingAddress: Optional[str] = None
    isProduct: bool = False
    # Multi-date selection support
    selectedDates: Optional[List[str]] = None  # Array of ISO date strings
    selectedDatesText: Optional[str] = None  # Formatted text of selected dates

class DiscountCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    type: str  # "100%", "%", "CHF"
    value: float
    assignedEmail: Optional[str] = None
    expiresAt: Optional[str] = None
    courses: List[str] = []
    maxUses: Optional[int] = None
    used: int = 0
    active: bool = True

class DiscountCodeCreate(BaseModel):
    code: str
    type: str
    value: float
    assignedEmail: Optional[str] = None
    expiresAt: Optional[str] = None
    courses: List[str] = []
    maxUses: Optional[int] = None

class PaymentLinks(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "payment_links"
    stripe: str = ""
    paypal: str = ""
    twint: str = ""
    coachWhatsapp: str = ""
    # Notifications automatiques pour le coach
    coachNotificationEmail: str = ""  # Email pour recevoir les alertes
    coachNotificationPhone: str = ""  # Téléphone pour recevoir les alertes WhatsApp

class PaymentLinksUpdate(BaseModel):
    stripe: Optional[str] = ""
    paypal: Optional[str] = ""
    twint: Optional[str] = ""
    coachWhatsapp: Optional[str] = ""
    coachNotificationEmail: Optional[str] = ""
    coachNotificationPhone: Optional[str] = ""

# Campaign Models for Marketing Module
class CampaignResult(BaseModel):
    contactId: str
    contactName: str
    contactEmail: Optional[str] = ""
    contactPhone: Optional[str] = ""
    channel: str  # "whatsapp", "email", "instagram"
    status: str = "pending"  # "pending", "sent", "failed"
    sentAt: Optional[str] = None

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    message: str
    mediaUrl: Optional[str] = ""
    mediaFormat: str = "16:9"  # "9:16" or "16:9"
    targetType: str = "all"  # "all" or "selected"
    selectedContacts: List[str] = []
    channels: dict = Field(default_factory=lambda: {"whatsapp": True, "email": False, "instagram": False})
    scheduledAt: Optional[str] = None  # ISO date or null for immediate
    status: str = "draft"  # "draft", "scheduled", "sending", "completed"
    results: List[dict] = []
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CampaignCreate(BaseModel):
    name: str
    message: str
    mediaUrl: Optional[str] = ""
    mediaFormat: str = "16:9"
    targetType: str = "all"
    selectedContacts: List[str] = []
    channels: dict = Field(default_factory=lambda: {"whatsapp": True, "email": False, "instagram": False})
    scheduledAt: Optional[str] = None

class Concept(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "concept"
    appName: str = "Afroboost"  # Nom de l'application (titre principal)
    description: str = "Le concept Afroboost : cardio + danse afrobeat + casques audio immersifs. Un entraînement fun, énergétique et accessible à tous."
    heroImageUrl: str = ""
    heroVideoUrl: str = ""
    logoUrl: str = ""
    faviconUrl: str = ""
    termsText: str = ""  # CGV - Conditions Générales de Vente
    googleReviewsUrl: str = ""  # Lien avis Google
    defaultLandingSection: str = "sessions"  # Section d'atterrissage par défaut: "sessions", "offers", "shop"
    # Liens externes
    externalLink1Title: str = ""
    externalLink1Url: str = ""
    externalLink2Title: str = ""
    externalLink2Url: str = ""
    # Modes de paiement acceptés
    paymentTwint: bool = False
    paymentPaypal: bool = False
    paymentCreditCard: bool = False
    # Affiche Événement (popup)
    eventPosterEnabled: bool = False
    eventPosterMediaUrl: str = ""  # URL image ou vidéo

class ConceptUpdate(BaseModel):
    appName: Optional[str] = None  # Nom de l'application
    description: Optional[str] = None
    heroImageUrl: Optional[str] = None
    heroVideoUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    faviconUrl: Optional[str] = None
    termsText: Optional[str] = None  # CGV - Conditions Générales de Vente
    googleReviewsUrl: Optional[str] = None  # Lien avis Google
    defaultLandingSection: Optional[str] = None  # Section d'atterrissage par défaut
    # Liens externes
    externalLink1Title: Optional[str] = None
    externalLink1Url: Optional[str] = None
    externalLink2Title: Optional[str] = None
    externalLink2Url: Optional[str] = None
    # Modes de paiement acceptés
    paymentTwint: Optional[bool] = None
    paymentPaypal: Optional[bool] = None
    paymentCreditCard: Optional[bool] = None
    # Affiche Événement (popup)
    eventPosterEnabled: Optional[bool] = None
    eventPosterMediaUrl: Optional[str] = None

class AppConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "app_config"
    background_color: str = "#020617"
    gradient_color: str = "#3b0764"
    primary_color: str = "#d91cd2"
    secondary_color: str = "#8b5cf6"
    text_color: str = "#ffffff"
    font_family: str = "system-ui"
    font_size: int = 16
    app_title: str = "Afroboost"
    app_subtitle: str = "Réservation de casque"
    concept_description: str = "Le concept Afroboost : cardio + danse afrobeat + casques audio immersifs."
    choose_session_text: str = "Choisissez votre session"
    choose_offer_text: str = "Choisissez votre offre"
    user_info_text: str = "Vos informations"
    button_text: str = "Réserver maintenant"

# ==================== FEATURE FLAGS - Services Additionnels ====================
# Business Model: Super Admin contrôle les feature flags globaux
# Les Coachs doivent avoir l'abonnement correspondant pour accéder aux services

class FeatureFlags(BaseModel):
    """
    Configuration globale des services (contrôlée par Super Admin)
    Par défaut, tous les services additionnels sont désactivés
    """
    model_config = ConfigDict(extra="ignore")
    id: str = "feature_flags"
    # Service Audio - Interrupteur général
    AUDIO_SERVICE_ENABLED: bool = False
    # Futurs services (préparation)
    VIDEO_SERVICE_ENABLED: bool = False
    STREAMING_SERVICE_ENABLED: bool = False
    # Timestamp de dernière modification
    updatedAt: Optional[str] = None
    updatedBy: Optional[str] = None  # "super_admin" ou email

class FeatureFlagsUpdate(BaseModel):
    """Mise à jour partielle des feature flags"""
    AUDIO_SERVICE_ENABLED: Optional[bool] = None
    VIDEO_SERVICE_ENABLED: Optional[bool] = None
    STREAMING_SERVICE_ENABLED: Optional[bool] = None

# ==================== COACH SUBSCRIPTION - Droits d'accès aux services ====================
# Business Model: Chaque coach a un profil d'abonnement qui définit ses droits

class CoachSubscription(BaseModel):
    """
    Profil d'abonnement d'un coach - définit les services auxquels il a accès
    Relation: coach_auth.email -> coach_subscription.coachEmail
    """
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    coachEmail: str  # Email du coach (clé de liaison avec coach_auth)
    # Services disponibles selon l'abonnement
    hasAudioService: bool = False  # Accès au service Audio
    hasVideoService: bool = False  # Futur: service Vidéo
    hasStreamingService: bool = False  # Futur: service Streaming
    # Informations d'abonnement
    subscriptionPlan: str = "free"  # "free", "basic", "premium", "enterprise"
    subscriptionStartDate: Optional[str] = None
    subscriptionEndDate: Optional[str] = None
    isActive: bool = True
    # Métadonnées
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: Optional[str] = None

class CoachSubscriptionUpdate(BaseModel):
    """Mise à jour partielle de l'abonnement coach"""
    hasAudioService: Optional[bool] = None
    hasVideoService: Optional[bool] = None
    hasStreamingService: Optional[bool] = None
    subscriptionPlan: Optional[str] = None
    subscriptionEndDate: Optional[str] = None
    isActive: Optional[bool] = None

class CoachAuth(BaseModel):
    email: str
    password: str

class CoachLogin(BaseModel):
    email: str
    password: str

# --- Lead Model (Widget IA) ---
class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = ""
    firstName: str
    whatsapp: str
    email: str
    createdAt: str = ""
    source: str = "widget_ia"

class ChatMessage(BaseModel):
    message: str
    leadId: str = ""
    firstName: str = ""

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Afroboost API"}

# --- Courses ---
@api_router.get("/courses", response_model=List[Course])
async def get_courses():
    courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    if not courses:
        # Insert default courses
        default_courses = [
            {"id": str(uuid.uuid4()), "name": "Afroboost Silent – Session Cardio", "weekday": 3, "time": "18:30", "locationName": "Rue des Vallangines 97, Neuchâtel", "mapsUrl": ""},
            {"id": str(uuid.uuid4()), "name": "Afroboost Silent – Sunday Vibes", "weekday": 0, "time": "18:30", "locationName": "Rue des Vallangines 97, Neuchâtel", "mapsUrl": ""}
        ]
        await db.courses.insert_many(default_courses)
        return default_courses
    return courses

@api_router.post("/courses", response_model=Course)
async def create_course(course: CourseCreate):
    course_obj = Course(**course.model_dump())
    await db.courses.insert_one(course_obj.model_dump())
    return course_obj

@api_router.put("/courses/{course_id}", response_model=Course)
async def update_course(course_id: str, course_update: dict):
    """Update a course - supports partial updates including playlist"""
    # Récupérer le cours existant
    existing = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cours non trouvé")
    
    # Fusionner les données (mise à jour partielle)
    update_data = {k: v for k, v in course_update.items() if v is not None}
    
    await db.courses.update_one({"id": course_id}, {"$set": update_data})
    updated = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return updated

@api_router.put("/courses/{course_id}/archive")
async def archive_course(course_id: str):
    """Archive a course instead of deleting it"""
    await db.courses.update_one({"id": course_id}, {"$set": {"archived": True}})
    updated = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return {"success": True, "course": updated}

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str):
    await db.courses.delete_one({"id": course_id})
    return {"success": True}

# --- Offers ---
@api_router.get("/offers", response_model=List[Offer])
async def get_offers():
    offers = await db.offers.find({}, {"_id": 0}).to_list(100)
    if not offers:
        default_offers = [
            {"id": str(uuid.uuid4()), "name": "Cours à l'unité", "price": 30, "thumbnail": "", "videoUrl": "", "description": "", "visible": True},
            {"id": str(uuid.uuid4()), "name": "Carte 10 cours", "price": 150, "thumbnail": "", "videoUrl": "", "description": "", "visible": True},
            {"id": str(uuid.uuid4()), "name": "Abonnement 1 mois", "price": 109, "thumbnail": "", "videoUrl": "", "description": "", "visible": True}
        ]
        await db.offers.insert_many(default_offers)
        return default_offers
    return offers

@api_router.post("/offers", response_model=Offer)
async def create_offer(offer: OfferCreate):
    offer_obj = Offer(**offer.model_dump())
    await db.offers.insert_one(offer_obj.model_dump())
    return offer_obj

@api_router.put("/offers/{offer_id}", response_model=Offer)
async def update_offer(offer_id: str, offer: OfferCreate):
    await db.offers.update_one({"id": offer_id}, {"$set": offer.model_dump()})
    updated = await db.offers.find_one({"id": offer_id}, {"_id": 0})
    return updated

@api_router.delete("/offers/{offer_id}")
async def delete_offer(offer_id: str):
    """Supprime une offre et nettoie les références dans les codes promo"""
    # 1. Supprimer l'offre
    await db.offers.delete_one({"id": offer_id})
    
    # 2. Nettoyer les références dans les codes promo (retirer l'offre des 'courses'/articles autorisés)
    await db.discount_codes.update_many(
        {"courses": offer_id},
        {"$pull": {"courses": offer_id}}
    )
    
    return {"success": True, "message": "Offre supprimée et références nettoyées"}

# --- Product Categories ---
@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories if categories else [
        {"id": "service", "name": "Services & Cours", "icon": "🎧"},
        {"id": "tshirt", "name": "T-shirts", "icon": "👕"},
        {"id": "shoes", "name": "Chaussures", "icon": "👟"},
        {"id": "supplement", "name": "Compléments", "icon": "💊"},
        {"id": "accessory", "name": "Accessoires", "icon": "🎒"}
    ]

@api_router.post("/categories")
async def create_category(category: dict):
    category["id"] = category.get("id") or str(uuid.uuid4())[:8]
    await db.categories.insert_one(category)
    return category

# --- Shipping / Tracking ---
@api_router.put("/reservations/{reservation_id}/tracking")
async def update_tracking(reservation_id: str, tracking_data: dict):
    """Update shipping tracking for an order"""
    update_fields = {}
    if "trackingNumber" in tracking_data:
        update_fields["trackingNumber"] = tracking_data["trackingNumber"]
    if "shippingStatus" in tracking_data:
        update_fields["shippingStatus"] = tracking_data["shippingStatus"]
    
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": update_fields}
    )
    updated = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    return {"success": True, "reservation": updated}

# --- Users ---
@api_router.get("/users", response_model=List[User])
async def get_users():
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get('createdAt'), str):
            user['createdAt'] = datetime.fromisoformat(user['createdAt'].replace('Z', '+00:00'))
    return users

@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate):
    user_obj = User(**user.model_dump())
    doc = user_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.users.insert_one(doc)
    return user_obj

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if isinstance(user.get('createdAt'), str):
        user['createdAt'] = datetime.fromisoformat(user['createdAt'].replace('Z', '+00:00'))
    return user

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user: UserCreate):
    """Update an existing user/contact"""
    existing = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user.model_dump()
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0})
    if isinstance(updated.get('createdAt'), str):
        updated['createdAt'] = datetime.fromisoformat(updated['createdAt'].replace('Z', '+00:00'))
    return updated

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Supprime un utilisateur/contact et nettoie les références dans les codes promo"""
    # 1. Récupérer l'email de l'utilisateur avant suppression
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_email = user.get("email")
    
    # 2. Supprimer l'utilisateur
    await db.users.delete_one({"id": user_id})
    
    # 3. Nettoyer les références dans les codes promo (retirer l'email des assignedEmail)
    if user_email:
        await db.discount_codes.update_many(
            {"assignedEmail": user_email},
            {"$set": {"assignedEmail": None}}
        )
    
    return {"success": True, "message": "Contact supprimé et références nettoyées"}

# --- Reservations ---
@api_router.get("/reservations")
async def get_reservations(
    page: int = 1,
    limit: int = 20,
    all_data: bool = False
):
    """
    Get reservations with pagination for performance optimization.
    - page: Page number (default 1)
    - limit: Items per page (default 20)
    - all_data: If True, returns all reservations (for export CSV)
    """
    # Projection optimisée: ne récupérer que les champs nécessaires pour l'affichage initial
    projection = {
        "_id": 0,
        "id": 1,
        "reservationCode": 1,
        "userName": 1,
        "userEmail": 1,
        "userWhatsapp": 1,
        "courseName": 1,
        "courseTime": 1,
        "datetime": 1,
        "offerName": 1,
        "totalPrice": 1,
        "quantity": 1,
        "validated": 1,
        "validatedAt": 1,
        "createdAt": 1,
        "selectedDates": 1,
        "selectedDatesText": 1,
        "selectedVariants": 1,
        "variantsText": 1,
        "isProduct": 1,
        "shippingStatus": 1,
        "trackingNumber": 1
    }
    
    if all_data:
        # Pour l'export CSV, récupérer tous les champs
        reservations = await db.reservations.find({}, {"_id": 0}).sort("createdAt", -1).to_list(10000)
    else:
        # Pagination avec tri par date de création (les plus récentes en premier)
        skip = (page - 1) * limit
        reservations = await db.reservations.find({}, projection).sort("createdAt", -1).skip(skip).limit(limit).to_list(limit)
    
    # Compter le total pour la pagination
    total_count = await db.reservations.count_documents({})
    
    for res in reservations:
        if isinstance(res.get('createdAt'), str):
            res['createdAt'] = datetime.fromisoformat(res['createdAt'].replace('Z', '+00:00'))
    
    return {
        "data": reservations,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit  # Ceiling division
        }
    }

@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(reservation: ReservationCreate):
    res_code = f"AFR-{str(uuid.uuid4())[:6].upper()}"
    res_obj = Reservation(**reservation.model_dump(), reservationCode=res_code)
    doc = res_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    
    # ========== CALCUL DE LA COMMISSION ADMIN (10%) ==========
    total_price = float(doc.get('totalPrice', 0))
    commission_rate = 0.10  # 10%
    commission_amount = round(total_price * commission_rate, 2)
    coach_amount = round(total_price - commission_amount, 2)
    
    doc['commission'] = {
        'rate': commission_rate,
        'adminAmount': commission_amount,
        'coachAmount': coach_amount,
        'totalAmount': total_price
    }
    
    await db.reservations.insert_one(doc)
    
    # Log de la commission pour le suivi
    logger.info(f"[Commission] Réservation {res_code}: Total={total_price}CHF, Admin={commission_amount}CHF (10%), Coach={coach_amount}CHF")
    
    return res_obj

# ========== ENDPOINT STATISTIQUES COMMISSIONS ==========
@api_router.get("/admin/commissions")
async def get_admin_commissions(period: str = "month"):
    """
    Récupère les statistiques de commissions pour l'admin.
    period: 'day', 'week', 'month', 'year', 'all'
    """
    from datetime import timedelta
    
    # Calculer la date de début selon la période
    now = datetime.now(timezone.utc)
    if period == "day":
        start_date = now - timedelta(days=1)
    elif period == "week":
        start_date = now - timedelta(weeks=1)
    elif period == "month":
        start_date = now - timedelta(days=30)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:  # all
        start_date = datetime(2020, 1, 1, tzinfo=timezone.utc)
    
    # Récupérer toutes les réservations de la période
    reservations = await db.reservations.find(
        {"createdAt": {"$gte": start_date.isoformat()}},
        {"_id": 0, "totalPrice": 1, "commission": 1, "createdAt": 1, "reservationCode": 1}
    ).to_list(10000)
    
    # Calculer les totaux
    total_revenue = 0
    total_commission = 0
    total_coach = 0
    transactions = []
    
    for res in reservations:
        price = float(res.get('totalPrice', 0))
        total_revenue += price
        
        commission = res.get('commission', {})
        if commission:
            total_commission += float(commission.get('adminAmount', 0))
            total_coach += float(commission.get('coachAmount', 0))
        else:
            # Pour les anciennes réservations sans commission calculée
            admin_amount = round(price * 0.10, 2)
            coach_amount = round(price * 0.90, 2)
            total_commission += admin_amount
            total_coach += coach_amount
        
        transactions.append({
            'code': res.get('reservationCode', ''),
            'date': res.get('createdAt', ''),
            'total': price,
            'adminCommission': commission.get('adminAmount', round(price * 0.10, 2)),
            'coachAmount': commission.get('coachAmount', round(price * 0.90, 2))
        })
    
    return {
        'period': period,
        'totalTransactions': len(reservations),
        'totalRevenue': round(total_revenue, 2),
        'totalAdminCommission': round(total_commission, 2),
        'totalCoachAmount': round(total_coach, 2),
        'commissionRate': '10%',
        'recentTransactions': sorted(transactions, key=lambda x: x['date'], reverse=True)[:20]
    }

@api_router.post("/reservations/{reservation_code}/validate")
async def validate_reservation(reservation_code: str):
    """Validate a reservation by QR code scan (coach action)"""
    reservation = await db.reservations.find_one({"reservationCode": reservation_code}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Réservation non trouvée")
    
    # Mark as validated
    await db.reservations.update_one(
        {"reservationCode": reservation_code},
        {"$set": {"validated": True, "validatedAt": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "message": "Réservation validée", "reservation": reservation}

@api_router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str):
    await db.reservations.delete_one({"id": reservation_id})
    return {"success": True}

# ==================== COACH NOTIFICATIONS ====================

class CoachNotificationPayload(BaseModel):
    """Payload for coach notification"""
    clientName: str
    clientEmail: str
    clientWhatsapp: str
    offerName: str
    courseName: str
    sessionDate: str
    amount: float
    reservationCode: str

@api_router.post("/notify-coach")
async def notify_coach(payload: CoachNotificationPayload):
    """
    Endpoint to trigger coach notification.
    Returns the notification config so frontend can send via EmailJS/WhatsApp.
    """
    try:
        # Get payment links config which contains coach notification settings
        payment_links = await db.payment_links.find_one({"id": "payment_links"}, {"_id": 0})
        if not payment_links:
            return {"success": False, "message": "Configuration non trouvée"}
        
        coach_email = payment_links.get("coachNotificationEmail", "")
        coach_phone = payment_links.get("coachNotificationPhone", "")
        
        if not coach_email and not coach_phone:
            return {"success": False, "message": "Aucune adresse de notification configurée"}
        
        # Format notification message
        notification_message = f"""🎉 NOUVELLE RÉSERVATION !

👤 Client: {payload.clientName}
📧 Email: {payload.clientEmail}
📱 WhatsApp: {payload.clientWhatsapp}

🎯 Offre: {payload.offerName}
📅 Cours: {payload.courseName}
🕐 Date: {payload.sessionDate}
💰 Montant: {payload.amount} CHF

🔑 Code: {payload.reservationCode}

---
Notification automatique Afroboost"""

        return {
            "success": True,
            "coachEmail": coach_email,
            "coachPhone": coach_phone,
            "message": notification_message,
            "subject": f"🎉 Nouvelle réservation - {payload.clientName}"
        }
    except Exception as e:
        logger.error(f"Error in notify-coach: {e}")
        return {"success": False, "message": str(e)}

# --- Discount Codes ---
@api_router.get("/discount-codes", response_model=List[DiscountCode])
async def get_discount_codes():
    codes = await db.discount_codes.find({}, {"_id": 0}).to_list(1000)
    return codes

@api_router.post("/discount-codes", response_model=DiscountCode)
async def create_discount_code(code: DiscountCodeCreate):
    code_obj = DiscountCode(**code.model_dump())
    await db.discount_codes.insert_one(code_obj.model_dump())
    return code_obj

@api_router.put("/discount-codes/{code_id}")
async def update_discount_code(code_id: str, updates: dict):
    await db.discount_codes.update_one({"id": code_id}, {"$set": updates})
    updated = await db.discount_codes.find_one({"id": code_id}, {"_id": 0})
    return updated

@api_router.delete("/discount-codes/{code_id}")
async def delete_discount_code(code_id: str):
    await db.discount_codes.delete_one({"id": code_id})
    return {"success": True}

@api_router.post("/discount-codes/validate")
async def validate_discount_code(data: dict):
    code_str = data.get("code", "").strip().upper()  # Normalize: trim + uppercase
    user_email = data.get("email", "").strip()
    course_id = data.get("courseId", "").strip()
    
    # Case-insensitive search using regex
    code = await db.discount_codes.find_one({
        "code": {"$regex": f"^{code_str}$", "$options": "i"},  # Case insensitive match
        "active": True
    }, {"_id": 0})
    
    if not code:
        return {"valid": False, "message": "Code inconnu ou invalide"}
    
    # Check expiration date
    if code.get("expiresAt"):
        try:
            expiry = code["expiresAt"]
            if isinstance(expiry, str):
                # Handle various date formats
                expiry = expiry.replace('Z', '+00:00')
                if 'T' not in expiry:
                    expiry = expiry + "T23:59:59+00:00"
                expiry_date = datetime.fromisoformat(expiry)
            else:
                expiry_date = expiry
            if expiry_date < datetime.now(timezone.utc):
                return {"valid": False, "message": "Code promo expiré"}
        except Exception as e:
            print(f"Date parsing error: {e}")
    
    # Check max uses
    if code.get("maxUses") and code.get("used", 0) >= code["maxUses"]:
        return {"valid": False, "message": "Code promo épuisé (nombre max d'utilisations atteint)"}
    
    # Check if course is allowed - IMPORTANT: empty list = all courses allowed
    allowed_courses = code.get("courses", [])
    if allowed_courses and len(allowed_courses) > 0:
        if course_id not in allowed_courses:
            return {"valid": False, "message": "Code non applicable à ce cours"}
    
    # Check assigned email
    if code.get("assignedEmail") and code["assignedEmail"].strip():
        if code["assignedEmail"].strip().lower() != user_email.lower():
            return {"valid": False, "message": "Code réservé à un autre compte"}
    
    return {"valid": True, "code": code}

@api_router.post("/discount-codes/{code_id}/use")
async def use_discount_code(code_id: str):
    await db.discount_codes.update_one({"id": code_id}, {"$inc": {"used": 1}})
    return {"success": True}

# ==================== SANITIZE DATA (Nettoyage des données fantômes) ====================

@api_router.post("/sanitize-data")
async def sanitize_data():
    """
    Nettoie automatiquement les données fantômes:
    - Retire des codes promo les IDs d'offres/cours qui n'existent plus
    - Retire des codes promo les emails de bénéficiaires qui n'existent plus
    """
    # 1. Récupérer tous les IDs valides
    valid_offer_ids = set()
    valid_course_ids = set()
    valid_user_emails = set()
    
    offers = await db.offers.find({}, {"id": 1, "_id": 0}).to_list(1000)
    for o in offers:
        if o.get("id"):
            valid_offer_ids.add(o["id"])
    
    courses = await db.courses.find({}, {"id": 1, "_id": 0}).to_list(1000)
    for c in courses:
        if c.get("id"):
            valid_course_ids.add(c["id"])
    
    users = await db.users.find({}, {"email": 1, "_id": 0}).to_list(1000)
    for u in users:
        if u.get("email"):
            valid_user_emails.add(u["email"])
    
    all_valid_article_ids = valid_offer_ids | valid_course_ids
    
    # 2. Nettoyer les codes promo
    discount_codes = await db.discount_codes.find({}, {"_id": 0}).to_list(1000)
    cleaned_count = 0
    
    for code in discount_codes:
        updates = {}
        
        # Nettoyer les articles (courses) fantômes
        if code.get("courses"):
            valid_courses = [c for c in code["courses"] if c in all_valid_article_ids]
            if len(valid_courses) != len(code["courses"]):
                updates["courses"] = valid_courses
        
        # Nettoyer les bénéficiaires fantômes
        if code.get("assignedEmail") and code["assignedEmail"] not in valid_user_emails:
            updates["assignedEmail"] = None
        
        # Appliquer les mises à jour
        if updates:
            await db.discount_codes.update_one({"id": code["id"]}, {"$set": updates})
            cleaned_count += 1
    
    return {
        "success": True,
        "message": f"Nettoyage terminé: {cleaned_count} codes promo nettoyés",
        "stats": {
            "valid_offers": len(valid_offer_ids),
            "valid_courses": len(valid_course_ids),
            "valid_users": len(valid_user_emails),
            "codes_cleaned": cleaned_count
        }
    }

# --- Campaigns (Marketing Module) ---
@api_router.get("/campaigns")
async def get_campaigns():
    campaigns = await db.campaigns.find({}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return campaigns

@api_router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@api_router.post("/campaigns")
async def create_campaign(campaign: CampaignCreate):
    campaign_data = Campaign(
        name=campaign.name,
        message=campaign.message,
        mediaUrl=campaign.mediaUrl,
        mediaFormat=campaign.mediaFormat,
        targetType=campaign.targetType,
        selectedContacts=campaign.selectedContacts,
        channels=campaign.channels,
        scheduledAt=campaign.scheduledAt,
        status="scheduled" if campaign.scheduledAt else "draft"
    ).model_dump()
    await db.campaigns.insert_one(campaign_data)
    return {k: v for k, v in campaign_data.items() if k != "_id"}

@api_router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, data: dict):
    data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    await db.campaigns.update_one({"id": campaign_id}, {"$set": data})
    return await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    await db.campaigns.delete_one({"id": campaign_id})
    return {"success": True}

@api_router.post("/campaigns/{campaign_id}/launch")
async def launch_campaign(campaign_id: str):
    """Mark campaign as sending and prepare results"""
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get contacts based on targetType
    if campaign.get("targetType") == "all":
        contacts = await db.users.find({}, {"_id": 0}).to_list(1000)
    else:
        selected_ids = campaign.get("selectedContacts", [])
        contacts = await db.users.find({"id": {"$in": selected_ids}}, {"_id": 0}).to_list(1000)
    
    # Prepare results for each contact and channel
    results = []
    channels = campaign.get("channels", {})
    for contact in contacts:
        for channel, enabled in channels.items():
            if enabled:
                results.append({
                    "contactId": contact.get("id", ""),
                    "contactName": contact.get("name", ""),
                    "contactEmail": contact.get("email", ""),
                    "contactPhone": contact.get("whatsapp", ""),
                    "channel": channel,
                    "status": "pending",
                    "sentAt": None
                })
    
    # Update campaign
    await db.campaigns.update_one(
        {"id": campaign_id},
        {"$set": {
            "status": "sending",
            "results": results,
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})

@api_router.post("/campaigns/{campaign_id}/mark-sent")
async def mark_campaign_sent(campaign_id: str, data: dict):
    """Mark specific result as sent"""
    contact_id = data.get("contactId")
    channel = data.get("channel")
    
    await db.campaigns.update_one(
        {"id": campaign_id, "results.contactId": contact_id, "results.channel": channel},
        {"$set": {
            "results.$.status": "sent",
            "results.$.sentAt": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Check if all results are sent
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    if campaign:
        all_sent = all(r.get("status") == "sent" for r in campaign.get("results", []))
        if all_sent:
            await db.campaigns.update_one(
                {"id": campaign_id},
                {"$set": {"status": "completed", "updatedAt": datetime.now(timezone.utc).isoformat()}}
            )
    
    return {"success": True}

# --- Payment Links ---
@api_router.get("/payment-links", response_model=PaymentLinks)
async def get_payment_links():
    links = await db.payment_links.find_one({"id": "payment_links"}, {"_id": 0})
    if not links:
        default_links = PaymentLinks().model_dump()
        await db.payment_links.insert_one(default_links)
        return default_links
    return links

@api_router.put("/payment-links")
async def update_payment_links(links: PaymentLinksUpdate):
    await db.payment_links.update_one(
        {"id": "payment_links"}, 
        {"$set": links.model_dump()}, 
        upsert=True
    )
    return await db.payment_links.find_one({"id": "payment_links"}, {"_id": 0})

# --- Concept ---
@api_router.get("/concept", response_model=Concept)
async def get_concept():
    concept = await db.concept.find_one({"id": "concept"}, {"_id": 0})
    if not concept:
        default_concept = Concept().model_dump()
        await db.concept.insert_one(default_concept)
        return default_concept
    return concept

@api_router.put("/concept")
async def update_concept(concept: ConceptUpdate):
    try:
        updates = {k: v for k, v in concept.model_dump().items() if v is not None}
        print(f"Updating concept with: {updates}")
        result = await db.concept.update_one({"id": "concept"}, {"$set": updates}, upsert=True)
        print(f"Update result: matched={result.matched_count}, modified={result.modified_count}")
        updated = await db.concept.find_one({"id": "concept"}, {"_id": 0})
        return updated
    except Exception as e:
        print(f"Error updating concept: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Config ---
@api_router.get("/config", response_model=AppConfig)
async def get_config():
    config = await db.config.find_one({"id": "app_config"}, {"_id": 0})
    if not config:
        default_config = AppConfig().model_dump()
        await db.config.insert_one(default_config)
        return default_config
    return config

@api_router.put("/config")
async def update_config(config_update: dict):
    await db.config.update_one({"id": "app_config"}, {"$set": config_update}, upsert=True)
    return await db.config.find_one({"id": "app_config"}, {"_id": 0})

# ==================== GOOGLE OAUTH AUTHENTICATION ====================
# Business: Authentification Google exclusive pour le Super Admin / Coach
# Seul l'email autorisé peut accéder au dashboard

# Email autorisé pour l'accès Coach/Super Admin
AUTHORIZED_COACH_EMAIL = os.environ.get("AUTHORIZED_COACH_EMAIL", "contact.artboost@gmail.com")

class GoogleAuthSession(BaseModel):
    """Session d'authentification Google"""
    model_config = ConfigDict(extra="ignore")
    session_id: str
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GoogleUser(BaseModel):
    """Utilisateur authentifié via Google"""
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    is_coach: bool = False
    is_super_admin: bool = False  # True si email == AUTHORIZED_COACH_EMAIL
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None

@api_router.post("/auth/google/session")
async def process_google_session(request: Request, response: Response):
    """
    Traite le session_id reçu après authentification Google.
    Vérifie que l'email est autorisé (coach@afroboost.com).
    
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    try:
        body = await request.json()
        session_id = body.get("session_id")
        
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id requis")
        
        # Appeler l'API Emergent pour récupérer les données de session
        import httpx
        async with httpx.AsyncClient() as client:
            emergent_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            
            if emergent_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Session invalide ou expirée")
            
            user_data = emergent_response.json()
        
        email = user_data.get("email", "").lower()
        name = user_data.get("name", "")
        picture = user_data.get("picture", "")
        session_token = user_data.get("session_token", "")
        
        # ===== VÉRIFICATION : Déterminer le niveau d'accès =====
        is_super_admin = email == AUTHORIZED_COACH_EMAIL.lower()
        subscription_active = True  # Par défaut pour Super Admin
        
        # Si pas Super Admin, vérifier si l'email est enregistré comme coach
        if not is_super_admin:
            coach_record = await db.coach_subscriptions.find_one({"coachEmail": email}, {"_id": 0})
            if not coach_record:
                # L'utilisateur n'est ni Super Admin ni coach enregistré
                return {
                    "success": False,
                    "error": "access_denied",
                    "message": f"⛔ Accès refusé. Vous n'êtes pas enregistré comme coach. Contactez {AUTHORIZED_COACH_EMAIL}."
                }
            
            # Vérifier si l'abonnement est actif
            subscription_active = coach_record.get("subscriptionActive", False)
            if not subscription_active:
                return {
                    "success": False,
                    "error": "subscription_expired",
                    "message": "⛔ Votre abonnement n'est pas actif. Veuillez contacter l'administrateur pour renouveler votre accès."
                }
        
        # Créer ou mettre à jour l'utilisateur
        user_id = f"coach_{uuid.uuid4().hex[:12]}"
        existing_user = await db.google_users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user.get("user_id", user_id)
            await db.google_users.update_one(
                {"email": email},
                {"$set": {
                    "name": name,
                    "picture": picture,
                    "is_super_admin": is_super_admin,
                    "subscription_active": subscription_active,
                    "last_login": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            await db.google_users.insert_one({
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "is_coach": True,
                "is_super_admin": is_super_admin,
                "subscription_active": subscription_active,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_login": datetime.now(timezone.utc).isoformat()
            })
        
        # Créer la session
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        await db.coach_sessions.delete_many({"user_id": user_id})  # Supprimer les anciennes sessions
        await db.coach_sessions.insert_one({
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "email": email,
            "name": name,
            "is_super_admin": is_super_admin,
            "subscription_active": subscription_active,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Définir le cookie httpOnly
        response.set_cookie(
            key="coach_session_token",
            value=session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,  # 7 jours
            path="/"
        )
        
        return {
            "success": True,
            "user": {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "is_coach": True,
                "is_super_admin": is_super_admin,
                "subscription_active": subscription_active
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Google auth error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me")
async def get_current_user(request: Request):
    """
    Vérifie la session actuelle et retourne les infos utilisateur.
    Utilisé pour vérifier si l'utilisateur est connecté.
    """
    # Récupérer le token depuis le cookie ou le header Authorization
    session_token = request.cookies.get("coach_session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    # Vérifier la session
    session = await db.coach_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")
    
    # Vérifier l'expiration
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.coach_sessions.delete_one({"session_token": session_token})
        raise HTTPException(status_code=401, detail="Session expirée")
    
    # Récupérer l'utilisateur
    user = await db.google_users.find_one(
        {"user_id": session.get("user_id")},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    
    return {
        "user_id": user.get("user_id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "picture": user.get("picture"),
        "is_coach": user.get("is_coach", True),
        "is_super_admin": user.get("is_super_admin", user.get("email", "").lower() == AUTHORIZED_COACH_EMAIL.lower())
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """
    Déconnexion: supprime la session et le cookie.
    """
    session_token = request.cookies.get("coach_session_token")
    
    if session_token:
        await db.coach_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(
        key="coach_session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"success": True, "message": "Déconnexion réussie"}

# ==================== COACH MANAGEMENT (Super Admin Only) ====================

@api_router.get("/coaches")
async def get_all_coaches():
    """Récupère la liste des coachs enregistrés (Super Admin seulement)"""
    coaches = await db.coach_subscriptions.find({}, {"_id": 0}).to_list(100)
    return coaches

@api_router.post("/coaches")
async def register_coach(coach_data: dict):
    """Enregistre un nouveau coach (Super Admin seulement)"""
    email = coach_data.get("coachEmail", "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email requis")
    
    # Vérifier si le coach existe déjà
    existing = await db.coach_subscriptions.find_one({"coachEmail": email})
    if existing:
        raise HTTPException(status_code=400, detail="Ce coach est déjà enregistré")
    
    # Créer l'entrée du coach avec champ abonnement
    new_coach = {
        "coachEmail": email,
        "coachName": coach_data.get("coachName", ""),
        "hasAudio": coach_data.get("hasAudio", False),
        "hasVideo": coach_data.get("hasVideo", False),
        "hasStreaming": coach_data.get("hasStreaming", False),
        "subscriptionActive": coach_data.get("subscriptionActive", False),  # Abonnement actif O/N
        "subscriptionEndDate": coach_data.get("subscriptionEndDate", ""),   # Date de fin d'abonnement
        "createdAt": datetime.now(timezone.utc).isoformat()
    }
    await db.coach_subscriptions.insert_one(new_coach)
    return {"success": True, "coach": {k: v for k, v in new_coach.items() if k != "_id"}}

@api_router.put("/coaches/{coach_email}")
async def update_coach(coach_email: str, coach_data: dict):
    """Met à jour un coach (Super Admin seulement) - notamment l'abonnement"""
    existing = await db.coach_subscriptions.find_one({"coachEmail": coach_email.lower()})
    if not existing:
        raise HTTPException(status_code=404, detail="Coach non trouvé")
    
    # Mettre à jour les champs fournis
    update_fields = {}
    allowed_fields = ["coachName", "hasAudio", "hasVideo", "hasStreaming", "subscriptionActive", "subscriptionEndDate"]
    for field in allowed_fields:
        if field in coach_data:
            update_fields[field] = coach_data[field]
    
    if update_fields:
        await db.coach_subscriptions.update_one(
            {"coachEmail": coach_email.lower()},
            {"$set": update_fields}
        )
    
    updated = await db.coach_subscriptions.find_one({"coachEmail": coach_email.lower()}, {"_id": 0})
    return {"success": True, "coach": updated}

@api_router.delete("/coaches/{coach_email}")
async def delete_coach(coach_email: str):
    """Supprime un coach (Super Admin seulement)"""
    result = await db.coach_subscriptions.delete_one({"coachEmail": coach_email.lower()})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coach non trouvé")
    return {"success": True}

# ==================== FILTERED DATA ENDPOINTS (For Coach Dashboard) ====================

@api_router.get("/coach/courses")
async def get_coach_courses(coach_email: str = None, include_all: bool = False):
    """
    Récupère les cours filtrés par coach.
    - Si include_all=True ou coach_email est Super Admin: retourne tous les cours
    - Sinon: retourne uniquement les cours de ce coach OU les cours sans auteur assigné
    """
    if include_all or (coach_email and coach_email.lower() == AUTHORIZED_COACH_EMAIL.lower()):
        # Super Admin voit tout
        courses = await db.courses.find({}, {"_id": 0}).to_list(100)
    else:
        # Coach normal: voit ses cours + les cours sans auteur
        courses = await db.courses.find(
            {"$or": [
                {"authorEmail": coach_email},
                {"authorEmail": None},
                {"authorEmail": {"$exists": False}}
            ]},
            {"_id": 0}
        ).to_list(100)
    return courses

@api_router.get("/coach/offers")
async def get_coach_offers(coach_email: str = None, include_all: bool = False):
    """
    Récupère les offres filtrées par coach.
    """
    if include_all or (coach_email and coach_email.lower() == AUTHORIZED_COACH_EMAIL.lower()):
        offers = await db.offers.find({}, {"_id": 0}).to_list(100)
    else:
        offers = await db.offers.find(
            {"$or": [
                {"authorEmail": coach_email},
                {"authorEmail": None},
                {"authorEmail": {"$exists": False}}
            ]},
            {"_id": 0}
        ).to_list(100)
    return offers

@api_router.get("/coach/reservations")
async def get_coach_reservations(
    coach_email: str = None, 
    include_all: bool = False,
    page: int = 1,
    limit: int = 20
):
    """
    Récupère les réservations filtrées par coach.
    Pour les coachs non-Super Admin: filtre par les cours dont ils sont auteurs.
    """
    skip = (page - 1) * limit
    
    if include_all or (coach_email and coach_email.lower() == AUTHORIZED_COACH_EMAIL.lower()):
        # Super Admin voit tout
        query = {}
    else:
        # Coach normal: voit les réservations pour ses cours
        # D'abord, obtenir les IDs des cours de ce coach
        coach_courses = await db.courses.find(
            {"$or": [
                {"authorEmail": coach_email},
                {"authorEmail": None},
                {"authorEmail": {"$exists": False}}
            ]},
            {"id": 1, "_id": 0}
        ).to_list(100)
        course_ids = [c.get("id") for c in coach_courses if c.get("id")]
        
        # Filtrer les réservations par ces cours
        # Note: Le champ "courses" dans reservation est le nom du cours, pas l'ID
        course_names = []
        for cid in course_ids:
            course = await db.courses.find_one({"id": cid}, {"name": 1, "_id": 0})
            if course:
                course_names.append(course.get("name"))
        
        query = {"courses": {"$in": course_names}} if course_names else {"courses": {"$exists": False}}
    
    total = await db.reservations.count_documents(query)
    reservations = await db.reservations.find(query, {"_id": 0}).sort("createdAt", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "reservations": reservations,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit
        }
    }

# --- Legacy Coach Auth (conservé pour compatibilité mais déprécié) ---
@api_router.get("/coach-auth")
async def get_coach_auth():
    """DÉPRÉCIÉ: Utilisez /auth/me à la place"""
    return {"email": AUTHORIZED_COACH_EMAIL, "auth_method": "google_oauth"}

@api_router.post("/coach-auth/login")
async def coach_login(login: CoachLogin):
    """DÉPRÉCIÉ: Utilisez l'authentification Google OAuth"""
    return {
        "success": False, 
        "message": "L'authentification par mot de passe a été désactivée. Veuillez utiliser 'Se connecter avec Google'."
    }

# ==================== FEATURE FLAGS API (Super Admin Only) ====================
# Business: Seul le Super Admin peut activer/désactiver les services globaux

@api_router.get("/feature-flags")
async def get_feature_flags():
    """
    Récupère la configuration des feature flags
    Par défaut, tous les services additionnels sont désactivés
    """
    flags = await db.feature_flags.find_one({"id": "feature_flags"}, {"_id": 0})
    if not flags:
        # Créer la config par défaut (tout désactivé)
        default_flags = {
            "id": "feature_flags",
            "AUDIO_SERVICE_ENABLED": False,
            "VIDEO_SERVICE_ENABLED": False,
            "STREAMING_SERVICE_ENABLED": False,
            "updatedAt": None,
            "updatedBy": None
        }
        await db.feature_flags.insert_one(default_flags.copy())  # .copy() pour éviter mutation
        # Retourner sans _id
        return {k: v for k, v in default_flags.items() if k != "_id"}
    return flags

@api_router.put("/feature-flags")
async def update_feature_flags(update: FeatureFlagsUpdate):
    """
    Met à jour les feature flags (Super Admin only)
    TODO: Ajouter authentification Super Admin
    """
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    update_data["updatedBy"] = "super_admin"  # TODO: Récupérer depuis le token
    
    await db.feature_flags.update_one(
        {"id": "feature_flags"}, 
        {"$set": update_data}, 
        upsert=True
    )
    return await db.feature_flags.find_one({"id": "feature_flags"}, {"_id": 0})

# ==================== COACH SUBSCRIPTION API ====================
# Business: Gestion des abonnements et droits des coachs

@api_router.get("/coach-subscription")
async def get_coach_subscription():
    """
    Récupère l'abonnement du coach actuel
    Utilise l'email de coach_auth pour trouver l'abonnement correspondant
    """
    # Récupérer l'email du coach actuel
    coach_auth = await db.coach_auth.find_one({"id": "coach_auth"}, {"_id": 0})
    if not coach_auth:
        return {"error": "Coach auth not found"}
    
    coach_email = coach_auth.get("email", "coach@afroboost.com")
    
    # Chercher l'abonnement correspondant
    subscription = await db.coach_subscriptions.find_one(
        {"coachEmail": coach_email}, 
        {"_id": 0}
    )
    
    if not subscription:
        # Créer un abonnement par défaut (free, sans services additionnels)
        default_sub = {
            "id": str(uuid.uuid4()),
            "coachEmail": coach_email,
            "hasAudioService": False,
            "hasVideoService": False,
            "hasStreamingService": False,
            "subscriptionPlan": "free",
            "subscriptionStartDate": datetime.now(timezone.utc).isoformat(),
            "subscriptionEndDate": None,
            "isActive": True,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "updatedAt": None
        }
        await db.coach_subscriptions.insert_one(default_sub.copy())  # .copy() pour éviter mutation
        # Retourner sans _id
        return {k: v for k, v in default_sub.items() if k != "_id"}
    
    return subscription

@api_router.put("/coach-subscription")
async def update_coach_subscription(update: CoachSubscriptionUpdate):
    """
    Met à jour l'abonnement du coach
    TODO: Ajouter vérification Super Admin pour modifications sensibles
    """
    coach_auth = await db.coach_auth.find_one({"id": "coach_auth"}, {"_id": 0})
    if not coach_auth:
        raise HTTPException(status_code=404, detail="Coach auth not found")
    
    coach_email = coach_auth.get("email", "coach@afroboost.com")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    
    await db.coach_subscriptions.update_one(
        {"coachEmail": coach_email},
        {"$set": update_data},
        upsert=True
    )
    
    return await db.coach_subscriptions.find_one({"coachEmail": coach_email}, {"_id": 0})

# ==================== SERVICE ACCESS VERIFICATION ====================
# Business: Fonction centrale pour vérifier l'accès aux services

@api_router.get("/verify-service-access/{service_name}")
async def verify_service_access(service_name: str):
    """
    Vérifie si un service est accessible pour le coach actuel.
    
    Logique de vérification (BOTH conditions must be true):
    1. Feature flag global activé (Super Admin)
    2. Coach a l'abonnement correspondant
    
    Args:
        service_name: "audio", "video", "streaming"
    
    Returns:
        {
            "hasAccess": bool,
            "reason": str,
            "featureFlagEnabled": bool,
            "coachHasSubscription": bool
        }
    """
    # Mapper les noms de service aux champs
    service_map = {
        "audio": ("AUDIO_SERVICE_ENABLED", "hasAudioService"),
        "video": ("VIDEO_SERVICE_ENABLED", "hasVideoService"),
        "streaming": ("STREAMING_SERVICE_ENABLED", "hasStreamingService")
    }
    
    if service_name not in service_map:
        raise HTTPException(status_code=400, detail=f"Service inconnu: {service_name}")
    
    flag_field, sub_field = service_map[service_name]
    
    # 1. Vérifier le feature flag global
    flags = await db.feature_flags.find_one({"id": "feature_flags"}, {"_id": 0})
    feature_enabled = flags.get(flag_field, False) if flags else False
    
    # 2. Vérifier l'abonnement du coach
    coach_auth = await db.coach_auth.find_one({"id": "coach_auth"}, {"_id": 0})
    coach_email = coach_auth.get("email", "coach@afroboost.com") if coach_auth else "coach@afroboost.com"
    
    subscription = await db.coach_subscriptions.find_one({"coachEmail": coach_email}, {"_id": 0})
    coach_has_service = subscription.get(sub_field, False) if subscription else False
    
    # Déterminer l'accès et la raison
    has_access = feature_enabled and coach_has_service
    
    if not feature_enabled:
        reason = f"Service {service_name} désactivé globalement (contacter l'administrateur)"
    elif not coach_has_service:
        reason = f"Votre abonnement n'inclut pas le service {service_name}"
    else:
        reason = "Accès autorisé"
    
    return {
        "hasAccess": has_access,
        "reason": reason,
        "featureFlagEnabled": feature_enabled,
        "coachHasSubscription": coach_has_service,
        "service": service_name
    }

# ==================== EMAILJS CONFIG (MongoDB) ====================

class EmailJSConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "emailjs_config"
    serviceId: str = ""
    templateId: str = ""
    publicKey: str = ""

class EmailJSConfigUpdate(BaseModel):
    serviceId: Optional[str] = None
    templateId: Optional[str] = None
    publicKey: Optional[str] = None

@api_router.get("/emailjs-config")
async def get_emailjs_config():
    config = await db.emailjs_config.find_one({"id": "emailjs_config"}, {"_id": 0})
    if not config:
        return {"id": "emailjs_config", "serviceId": "", "templateId": "", "publicKey": ""}
    return config

@api_router.put("/emailjs-config")
async def update_emailjs_config(config: EmailJSConfigUpdate):
    updates = {k: v for k, v in config.model_dump().items() if v is not None}
    updates["id"] = "emailjs_config"
    await db.emailjs_config.update_one({"id": "emailjs_config"}, {"$set": updates}, upsert=True)
    return await db.emailjs_config.find_one({"id": "emailjs_config"}, {"_id": 0})

# ==================== WHATSAPP CONFIG (MongoDB) ====================

class WhatsAppConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "whatsapp_config"
    accountSid: str = ""
    authToken: str = ""
    fromNumber: str = ""
    apiMode: str = "twilio"

class WhatsAppConfigUpdate(BaseModel):
    accountSid: Optional[str] = None
    authToken: Optional[str] = None
    fromNumber: Optional[str] = None
    apiMode: Optional[str] = None

@api_router.get("/whatsapp-config")
async def get_whatsapp_config():
    config = await db.whatsapp_config.find_one({"id": "whatsapp_config"}, {"_id": 0})
    if not config:
        return {"id": "whatsapp_config", "accountSid": "", "authToken": "", "fromNumber": "", "apiMode": "twilio"}
    return config

@api_router.put("/whatsapp-config")
async def update_whatsapp_config(config: WhatsAppConfigUpdate):
    updates = {k: v for k, v in config.model_dump().items() if v is not None}
    updates["id"] = "whatsapp_config"
    await db.whatsapp_config.update_one({"id": "whatsapp_config"}, {"$set": updates}, upsert=True)
    return await db.whatsapp_config.find_one({"id": "whatsapp_config"}, {"_id": 0})

# ==================== DATA MIGRATION (localStorage -> MongoDB) ====================

class MigrationData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    emailJSConfig: Optional[dict] = None
    whatsAppConfig: Optional[dict] = None
    aiConfig: Optional[dict] = None
    reservations: Optional[List[dict]] = None
    coachAuth: Optional[dict] = None

@api_router.post("/migrate-data")
async def migrate_localstorage_to_mongodb(data: MigrationData):
    """
    Endpoint pour migrer les données du localStorage vers MongoDB.
    Appelé une seule fois lors de la première utilisation après la migration.
    """
    migrated = {"emailJS": False, "whatsApp": False, "ai": False, "reservations": 0, "coachAuth": False}
    
    # Migration EmailJS Config
    if data.emailJSConfig and data.emailJSConfig.get("serviceId"):
        existing = await db.emailjs_config.find_one({"id": "emailjs_config"})
        if not existing or not existing.get("serviceId"):
            await db.emailjs_config.update_one(
                {"id": "emailjs_config"}, 
                {"$set": {**data.emailJSConfig, "id": "emailjs_config"}}, 
                upsert=True
            )
            migrated["emailJS"] = True
    
    # Migration WhatsApp Config
    if data.whatsAppConfig and data.whatsAppConfig.get("accountSid"):
        existing = await db.whatsapp_config.find_one({"id": "whatsapp_config"})
        if not existing or not existing.get("accountSid"):
            await db.whatsapp_config.update_one(
                {"id": "whatsapp_config"}, 
                {"$set": {**data.whatsAppConfig, "id": "whatsapp_config"}}, 
                upsert=True
            )
            migrated["whatsApp"] = True
    
    # Migration AI Config
    if data.aiConfig and data.aiConfig.get("systemPrompt"):
        existing = await db.ai_config.find_one({"id": "ai_config"})
        if not existing or not existing.get("systemPrompt"):
            await db.ai_config.update_one(
                {"id": "ai_config"}, 
                {"$set": {**data.aiConfig, "id": "ai_config"}}, 
                upsert=True
            )
            migrated["ai"] = True
    
    # Migration Reservations
    if data.reservations:
        for res in data.reservations:
            if res.get("reservationCode"):
                existing = await db.reservations.find_one({"reservationCode": res["reservationCode"]})
                if not existing:
                    await db.reservations.insert_one(res)
                    migrated["reservations"] += 1
    
    # Migration Coach Auth
    if data.coachAuth:
        existing = await db.coach_auth.find_one({"id": "coach_auth"})
        if not existing:
            await db.coach_auth.update_one(
                {"id": "coach_auth"}, 
                {"$set": {**data.coachAuth, "id": "coach_auth"}}, 
                upsert=True
            )
            migrated["coachAuth"] = True
    
    logger.info(f"Migration completed: {migrated}")
    return {"success": True, "migrated": migrated}

@api_router.get("/migration-status")
async def get_migration_status():
    """Vérifie si les données ont été migrées vers MongoDB"""
    emailjs = await db.emailjs_config.find_one({"id": "emailjs_config"}, {"_id": 0})
    whatsapp = await db.whatsapp_config.find_one({"id": "whatsapp_config"}, {"_id": 0})
    ai = await db.ai_config.find_one({"id": "ai_config"}, {"_id": 0})
    reservations_count = await db.reservations.count_documents({})
    
    return {
        "emailJS": bool(emailjs and emailjs.get("serviceId")),
        "whatsApp": bool(whatsapp and whatsapp.get("accountSid")),
        "ai": bool(ai and ai.get("systemPrompt")),
        "reservationsCount": reservations_count,
        "migrationComplete": True
    }

# ==================== AI WHATSAPP AGENT ====================

class AIConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "ai_config"
    enabled: bool = False
    systemPrompt: str = """Tu es l'assistant virtuel d'Afroboost, une expérience fitness unique combinant cardio, danse afrobeat et casques audio immersifs.

Ton rôle:
- Répondre aux questions sur les cours, les offres et les réservations
- Être chaleureux, dynamique et motivant comme un coach fitness
- Utiliser un ton amical et des emojis appropriés
- Personnaliser les réponses avec le prénom du client quand disponible

Si tu ne connais pas la réponse, oriente vers le contact: contact.artboost@gmail.com"""
    model: str = "gpt-4o-mini"
    provider: str = "openai"
    lastMediaUrl: str = ""

class AIConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    systemPrompt: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    lastMediaUrl: Optional[str] = None

class AILog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    fromPhone: str
    clientName: Optional[str] = None
    incomingMessage: str
    aiResponse: str
    responseTime: float = 0  # En secondes

class WhatsAppWebhook(BaseModel):
    From: str  # whatsapp:+41XXXXXXXXX
    Body: str
    To: Optional[str] = None
    MediaUrl0: Optional[str] = None

# --- AI Config Routes ---
@api_router.get("/ai-config")
async def get_ai_config():
    config = await db.ai_config.find_one({"id": "ai_config"}, {"_id": 0})
    if not config:
        default_config = AIConfig().model_dump()
        await db.ai_config.insert_one(default_config)
        return default_config
    return config

@api_router.put("/ai-config")
async def update_ai_config(config: AIConfigUpdate):
    updates = {k: v for k, v in config.model_dump().items() if v is not None}
    await db.ai_config.update_one({"id": "ai_config"}, {"$set": updates}, upsert=True)
    return await db.ai_config.find_one({"id": "ai_config"}, {"_id": 0})

# --- AI Logs Routes ---
@api_router.get("/ai-logs")
async def get_ai_logs():
    logs = await db.ai_logs.find({}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    return logs

@api_router.delete("/ai-logs")
async def clear_ai_logs():
    await db.ai_logs.delete_many({})
    return {"success": True}

# --- WhatsApp Webhook (Twilio) ---
@api_router.post("/webhook/whatsapp")
async def handle_whatsapp_webhook(webhook: WhatsAppWebhook):
    """
    Webhook pour recevoir les messages WhatsApp entrants via Twilio
    Répond automatiquement avec l'IA si activée
    """
    import time
    start_time = time.time()
    
    # Récupérer la config IA
    ai_config = await db.ai_config.find_one({"id": "ai_config"}, {"_id": 0})
    if not ai_config or not ai_config.get("enabled"):
        logger.info(f"AI disabled, ignoring message from {webhook.From}")
        return {"status": "ai_disabled"}
    
    # Extraire le numéro de téléphone
    from_phone = webhook.From.replace("whatsapp:", "")
    incoming_message = webhook.Body
    
    logger.info(f"Incoming WhatsApp from {from_phone}: {incoming_message}")
    
    # Chercher le client dans les réservations
    client_name = None
    normalized_phone = from_phone.replace("+", "").replace(" ", "")
    reservations = await db.reservations.find({}, {"_id": 0}).to_list(1000)
    
    for res in reservations:
        res_phone = (res.get("whatsapp") or res.get("phone") or "").replace("+", "").replace(" ", "").replace("-", "")
        if res_phone and normalized_phone.endswith(res_phone[-9:]):
            client_name = res.get("userName") or res.get("name")
            break
    
    # Construire le contexte
    context = ""
    if client_name:
        context += f"\n\nLe client qui te parle s'appelle {client_name}. Utilise son prénom dans ta réponse."
    
    last_media = ai_config.get("lastMediaUrl", "")
    if last_media:
        context += f"\n\nNote: Tu as récemment envoyé un média à ce client: {last_media}. Tu peux lui demander s'il l'a bien reçu."
    
    full_system_prompt = ai_config.get("systemPrompt", "") + context
    
    # Appeler l'IA
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        emergent_key = os.environ.get("EMERGENT_LLM_KEY")
        if not emergent_key:
            logger.error("EMERGENT_LLM_KEY not configured")
            return {"status": "error", "message": "AI key not configured"}
        
        # Créer une session unique par numéro de téléphone
        session_id = f"whatsapp_{normalized_phone}"
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=session_id,
            system_message=full_system_prompt
        ).with_model(ai_config.get("provider", "openai"), ai_config.get("model", "gpt-4o-mini"))
        
        user_message = UserMessage(text=incoming_message)
        ai_response = await chat.send_message(user_message)
        
        response_time = time.time() - start_time
        
        # Sauvegarder le log
        log_entry = AILog(
            fromPhone=from_phone,
            clientName=client_name,
            incomingMessage=incoming_message,
            aiResponse=ai_response,
            responseTime=response_time
        ).model_dump()
        await db.ai_logs.insert_one(log_entry)
        
        logger.info(f"AI responded to {from_phone} in {response_time:.2f}s")
        
        # Retourner la réponse (Twilio attend un TwiML ou un JSON)
        # Pour une réponse automatique, Twilio utilise TwiML
        return {
            "status": "success",
            "response": ai_response,
            "clientName": client_name,
            "responseTime": response_time
        }
        
    except Exception as e:
        logger.error(f"AI error: {str(e)}")
        return {"status": "error", "message": str(e)}

# --- Endpoint pour tester l'IA manuellement ---
@api_router.post("/ai-test")
async def test_ai_response(data: dict):
    """Test l'IA avec un message manuel"""
    import time
    start_time = time.time()
    
    message = data.get("message", "")
    client_name = data.get("clientName", "")
    
    if not message:
        raise HTTPException(status_code=400, detail="Message requis")
    
    # Récupérer la config IA
    ai_config = await db.ai_config.find_one({"id": "ai_config"}, {"_id": 0})
    if not ai_config:
        ai_config = AIConfig().model_dump()
    
    # Construire le contexte
    context = ""
    if client_name:
        context += f"\n\nLe client qui te parle s'appelle {client_name}. Utilise son prénom dans ta réponse."
    
    last_media = ai_config.get("lastMediaUrl", "")
    if last_media:
        context += f"\n\nNote: Tu as récemment envoyé un média à ce client: {last_media}."
    
    full_system_prompt = ai_config.get("systemPrompt", "") + context
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        emergent_key = os.environ.get("EMERGENT_LLM_KEY")
        if not emergent_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY non configuré")
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"test_{int(time.time())}",
            system_message=full_system_prompt
        ).with_model(ai_config.get("provider", "openai"), ai_config.get("model", "gpt-4o-mini"))
        
        user_message = UserMessage(text=message)
        ai_response = await chat.send_message(user_message)
        
        response_time = time.time() - start_time
        
        return {
            "success": True,
            "response": ai_response,
            "responseTime": response_time
        }
        
    except Exception as e:
        logger.error(f"AI test error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Leads Routes (Widget IA) ---
@api_router.get("/leads")
async def get_leads():
    """Récupère tous les leads capturés via le widget IA"""
    leads = await db.leads.find({}, {"_id": 0}).sort("createdAt", -1).to_list(500)
    return leads

@api_router.post("/leads")
async def create_lead(lead: Lead):
    """Enregistre un nouveau lead depuis le widget IA"""
    from datetime import datetime, timezone
    
    lead_data = lead.model_dump()
    lead_data["id"] = f"lead_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{lead.whatsapp[-4:]}"
    lead_data["createdAt"] = datetime.now(timezone.utc).isoformat()
    
    # Vérifier si le lead existe déjà (même email ou WhatsApp)
    existing = await db.leads.find_one({
        "$or": [
            {"email": lead.email},
            {"whatsapp": lead.whatsapp}
        ]
    })
    
    if existing:
        # Mettre à jour le lead existant
        await db.leads.update_one(
            {"id": existing["id"]},
            {"$set": {"firstName": lead.firstName, "updatedAt": lead_data["createdAt"]}}
        )
        existing["firstName"] = lead.firstName
        return {**existing, "_id": None}
    
    await db.leads.insert_one(lead_data)
    return {k: v for k, v in lead_data.items() if k != "_id"}

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str):
    """Supprime un lead"""
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"success": True}

# --- Chat IA Widget ---
@api_router.post("/chat")
async def chat_with_ai(data: ChatMessage):
    """Chat avec l'IA depuis le widget client"""
    import time
    start_time = time.time()
    
    message = data.message
    first_name = data.firstName
    
    if not message:
        raise HTTPException(status_code=400, detail="Message requis")
    
    # Récupérer la config IA
    ai_config = await db.ai_config.find_one({"id": "ai_config"}, {"_id": 0})
    if not ai_config:
        ai_config = AIConfig().model_dump()
    
    if not ai_config.get("enabled"):
        return {"response": "L'assistant IA est actuellement désactivé. Veuillez contacter le coach directement.", "responseTime": 0}
    
    # Construire le contexte avec le prénom
    context = ""
    if first_name:
        context += f"\n\nLe client qui te parle s'appelle {first_name}. Utilise son prénom dans ta réponse pour être chaleureux."
    
    # Récupérer les infos du concept pour contexte
    concept = await db.concept.find_one({"id": "concept"}, {"_id": 0})
    if concept:
        context += f"\n\nContexte Afroboost: {concept.get('description', '')}"
    
    # Récupérer les cours disponibles
    courses = await db.courses.find({"visible": {"$ne": False}}, {"_id": 0}).to_list(10)
    if courses:
        courses_info = "\n".join([f"- {c.get('name', '')} le {c.get('date', '')} à {c.get('time', '')}" for c in courses[:5]])
        context += f"\n\nCours disponibles:\n{courses_info}"
    
    full_system_prompt = ai_config.get("systemPrompt", "Tu es l'assistant IA d'Afroboost, une application de réservation de cours de fitness.") + context
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid
        
        emergent_key = os.environ.get("EMERGENT_LLM_KEY")
        if not emergent_key:
            return {"response": "Configuration IA incomplète. Contactez l'administrateur.", "responseTime": 0}
        
        # Generate a unique session ID for this chat
        session_id = f"afroboost_chat_{uuid.uuid4().hex[:8]}"
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=session_id,
            system_message=full_system_prompt
        )
        
        user_msg = UserMessage(text=message)
        ai_response = await chat.send_message(user_msg)
        response_time = round(time.time() - start_time, 2)
        
        # Log la conversation
        await db.ai_logs.insert_one({
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "from": f"widget_{first_name or 'anonymous'}",
            "message": message,
            "response": ai_response,
            "responseTime": response_time
        })
        
        return {
            "response": ai_response,
            "responseTime": response_time
        }
        
    except Exception as e:
        logger.error(f"Chat AI error: {str(e)}")
        return {"response": "Désolé, une erreur s'est produite. Veuillez réessayer.", "responseTime": 0}

# ==================== STRIPE CHECKOUT INTEGRATION ====================

class StripeCheckoutRequest(BaseModel):
    """Request model for Stripe checkout"""
    offer_id: str
    offer_name: str
    price: float  # En CHF
    user_name: str
    user_email: str
    course_id: str
    course_name: str
    origin_url: str  # URL du frontend pour redirect

@api_router.post("/stripe/create-checkout")
async def create_stripe_checkout(request: Request, checkout_data: StripeCheckoutRequest):
    """
    Crée une session Stripe Checkout et retourne l'URL de paiement.
    La réservation sera validée uniquement après réception du webhook checkout.session.completed.
    """
    try:
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        # URLs de redirection
        host_url = str(request.base_url).rstrip('/')
        webhook_url = f"{host_url}/api/webhook/stripe"
        success_url = f"{checkout_data.origin_url}/success?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{checkout_data.origin_url}/cancel"
        
        # Générer un code de réservation temporaire
        temp_reservation_code = f"AFR-{str(uuid.uuid4())[:6].upper()}"
        
        # Commission 10% Admin
        total_price = float(checkout_data.price)
        commission_rate = 0.10
        commission_amount = round(total_price * commission_rate, 2)
        coach_amount = round(total_price - commission_amount, 2)
        
        # Metadata pour le webhook
        metadata = {
            "reservation_code": temp_reservation_code,
            "offer_id": checkout_data.offer_id,
            "offer_name": checkout_data.offer_name,
            "user_name": checkout_data.user_name,
            "user_email": checkout_data.user_email,
            "course_id": checkout_data.course_id,
            "course_name": checkout_data.course_name,
            "total_price": str(total_price),
            "admin_commission": str(commission_amount),
            "coach_amount": str(coach_amount)
        }
        
        # Initialiser Stripe Checkout
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
        
        # Créer la session de paiement avec TWINT activé pour la Suisse
        # TWINT nécessite d'être activé dans le dashboard Stripe:
        # https://dashboard.stripe.com/account/payments/settings
        checkout_request = CheckoutSessionRequest(
            amount=total_price,  # En décimal
            currency="chf",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            payment_methods=["card", "twint"]  # TWINT activé pour les clients suisses
        )
        
        session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
        
        # Créer une transaction de paiement PENDING dans la base
        payment_transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.session_id,
            "reservation_code": temp_reservation_code,
            "amount": total_price,
            "currency": "chf",
            "payment_status": "pending",
            "metadata": metadata,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(payment_transaction)
        
        logger.info(f"[Stripe] Session créée: {session.session_id} pour {checkout_data.user_email}")
        
        return {
            "url": session.url,
            "session_id": session.session_id,
            "reservation_code": temp_reservation_code
        }
        
    except Exception as e:
        logger.error(f"[Stripe] Erreur création checkout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/stripe/checkout-status/{session_id}")
async def get_stripe_checkout_status(session_id: str):
    """Vérifie le statut d'une session de paiement Stripe"""
    try:
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        status: CheckoutStatusResponse = await stripe_checkout.get_checkout_status(session_id)
        
        # Mettre à jour la transaction dans la base si le statut a changé
        if status.payment_status == "paid":
            # Vérifier si déjà traité pour éviter les doublons
            existing = await db.payment_transactions.find_one({"session_id": session_id})
            if existing and existing.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "paidAt": datetime.now(timezone.utc).isoformat()}}
                )
                
                # Créer la réservation finale
                await _create_paid_reservation(session_id, status.metadata)
        
        return {
            "status": status.status,
            "payment_status": status.payment_status,
            "amount_total": status.amount_total,
            "currency": status.currency,
            "metadata": status.metadata
        }
        
    except Exception as e:
        logger.error(f"[Stripe] Erreur vérification statut: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """
    Webhook Stripe pour recevoir les événements de paiement.
    checkout.session.completed → Valide la réservation et génère le QR Code.
    """
    try:
        stripe_api_key = os.environ.get('STRIPE_API_KEY')
        if not stripe_api_key:
            raise HTTPException(status_code=500, detail="Stripe API key not configured")
        
        body = await request.body()
        signature = request.headers.get("Stripe-Signature")
        
        stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url="")
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"[Stripe Webhook] Event: {webhook_response.event_type}, Session: {webhook_response.session_id}")
        
        if webhook_response.event_type == "checkout.session.completed":
            # Paiement confirmé - créer la réservation
            session_id = webhook_response.session_id
            metadata = webhook_response.metadata
            
            # Éviter les doublons
            existing_reservation = await db.reservations.find_one({"reservationCode": metadata.get("reservation_code")})
            if not existing_reservation:
                await _create_paid_reservation(session_id, metadata)
                logger.info(f"[Stripe Webhook] Réservation créée: {metadata.get('reservation_code')}")
            else:
                logger.info(f"[Stripe Webhook] Réservation déjà existante: {metadata.get('reservation_code')}")
            
            # Mettre à jour la transaction
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid", "paidAt": datetime.now(timezone.utc).isoformat()}}
            )
        
        return {"received": True}
        
    except Exception as e:
        logger.error(f"[Stripe Webhook] Erreur: {str(e)}")
        return {"received": False, "error": str(e)}

async def _create_paid_reservation(session_id: str, metadata: dict):
    """Crée une réservation validée après paiement confirmé"""
    try:
        reservation_code = metadata.get("reservation_code")
        total_price = float(metadata.get("total_price", 0))
        commission_amount = float(metadata.get("admin_commission", 0))
        coach_amount = float(metadata.get("coach_amount", 0))
        
        reservation = {
            "id": str(uuid.uuid4()),
            "reservationCode": reservation_code,
            "userName": metadata.get("user_name"),
            "userEmail": metadata.get("user_email"),
            "offerId": metadata.get("offer_id"),
            "offerName": metadata.get("offer_name"),
            "courseId": metadata.get("course_id"),
            "courseName": metadata.get("course_name"),
            "totalPrice": total_price,
            "paymentStatus": "paid",
            "paymentMethod": "stripe",
            "stripeSessionId": session_id,
            "commission": {
                "rate": 0.10,
                "adminAmount": commission_amount,
                "coachAmount": coach_amount,
                "totalAmount": total_price
            },
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "paidAt": datetime.now(timezone.utc).isoformat()
        }
        
        await db.reservations.insert_one(reservation)
        logger.info(f"[Stripe] Réservation PAYÉE créée: {reservation_code} - {total_price}CHF")
        
        return reservation
        
    except Exception as e:
        logger.error(f"[Stripe] Erreur création réservation payée: {str(e)}")
        raise

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamic manifest.json endpoint for PWA
@app.get("/api/manifest.json")
async def get_dynamic_manifest():
    """Serve dynamic manifest.json with logo and name from coach settings"""
    concept = await db.concept.find_one({})
    
    # Use coach-configured favicon (priority) or logo as fallback
    logo_url = None
    app_name = "Afroboost"  # Default name
    if concept:
        # faviconUrl has priority, then logoUrl (same as frontend)
        logo_url = concept.get("faviconUrl") or concept.get("logoUrl")
        # Use custom appName if configured
        if concept.get("appName"):
            app_name = concept.get("appName")
    
    manifest = {
        "short_name": app_name,
        "name": f"{app_name} - Réservation de casque",
        "description": concept.get("description", "Le concept Afroboost : cardio + danse afrobeat + casques audio immersifs.") if concept else "Le concept Afroboost : cardio + danse afrobeat + casques audio immersifs.",
        "icons": [
            {
                "src": "favicon.ico",
                "sizes": "64x64 32x32 24x24 16x16",
                "type": "image/x-icon"
            }
        ],
        "start_url": ".",
        "display": "standalone",
        "theme_color": "#000000",
        "background_color": "#000000",
        "orientation": "portrait-primary"
    }
    
    # Add dynamic logo icons if configured
    if logo_url:
        manifest["icons"] = [
            {
                "src": logo_url,
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": logo_url,
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            },
            {
                "src": "favicon.ico",
                "sizes": "64x64 32x32 24x24 16x16",
                "type": "image/x-icon"
            }
        ]
    else:
        # Fallback to default icons
        manifest["icons"] = [
            {
                "src": "favicon.ico",
                "sizes": "64x64 32x32 24x24 16x16",
                "type": "image/x-icon"
            },
            {
                "src": "logo192.png",
                "type": "image/png",
                "sizes": "192x192",
                "purpose": "any maskable"
            },
            {
                "src": "logo512.png",
                "type": "image/png",
                "sizes": "512x512",
                "purpose": "any maskable"
            }
        ]
    
    from fastapi.responses import JSONResponse
    return JSONResponse(content=manifest, media_type="application/manifest+json")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
