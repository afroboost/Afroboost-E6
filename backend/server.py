from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'afroboost_db')]

app = FastAPI(title="Afroboost API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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

class CourseCreate(BaseModel):
    name: str
    weekday: int
    time: str
    locationName: str
    mapsUrl: Optional[str] = ""
    visible: bool = True

class Offer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    thumbnail: Optional[str] = ""
    videoUrl: Optional[str] = ""
    description: Optional[str] = ""
    visible: bool = True

class OfferCreate(BaseModel):
    name: str
    price: float
    thumbnail: Optional[str] = ""
    videoUrl: Optional[str] = ""
    description: Optional[str] = ""
    visible: bool = True

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

class PaymentLinksUpdate(BaseModel):
    stripe: Optional[str] = ""
    paypal: Optional[str] = ""
    twint: Optional[str] = ""
    coachWhatsapp: Optional[str] = ""

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
    description: str = "Le concept Afroboost : cardio + danse afrobeat + casques audio immersifs. Un entraînement fun, énergétique et accessible à tous."
    heroImageUrl: str = ""
    heroVideoUrl: str = ""
    logoUrl: str = ""
    faviconUrl: str = ""

class ConceptUpdate(BaseModel):
    description: Optional[str] = None
    heroImageUrl: Optional[str] = None
    heroVideoUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    faviconUrl: Optional[str] = None

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

class CoachAuth(BaseModel):
    email: str
    password: str

class CoachLogin(BaseModel):
    email: str
    password: str

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
async def update_course(course_id: str, course: CourseCreate):
    await db.courses.update_one({"id": course_id}, {"$set": course.model_dump()})
    updated = await db.courses.find_one({"id": course_id}, {"_id": 0})
    return updated

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
    await db.offers.delete_one({"id": offer_id})
    return {"success": True}

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

# --- Reservations ---
@api_router.get("/reservations", response_model=List[Reservation])
async def get_reservations():
    reservations = await db.reservations.find({}, {"_id": 0}).to_list(1000)
    for res in reservations:
        if isinstance(res.get('createdAt'), str):
            res['createdAt'] = datetime.fromisoformat(res['createdAt'].replace('Z', '+00:00'))
    return reservations

@api_router.post("/reservations", response_model=Reservation)
async def create_reservation(reservation: ReservationCreate):
    res_code = f"AFR-{str(uuid.uuid4())[:6].upper()}"
    res_obj = Reservation(**reservation.model_dump(), reservationCode=res_code)
    doc = res_obj.model_dump()
    doc['createdAt'] = doc['createdAt'].isoformat()
    await db.reservations.insert_one(doc)
    return res_obj

@api_router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str):
    await db.reservations.delete_one({"id": reservation_id})
    return {"success": True}

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
    updates = {k: v for k, v in concept.model_dump().items() if v is not None}
    await db.concept.update_one({"id": "concept"}, {"$set": updates}, upsert=True)
    return await db.concept.find_one({"id": "concept"}, {"_id": 0})

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

# --- Coach Auth ---
@api_router.get("/coach-auth")
async def get_coach_auth():
    auth = await db.coach_auth.find_one({"id": "coach_auth"}, {"_id": 0})
    if not auth:
        default_auth = {"id": "coach_auth", "email": "coach@afroboost.com", "password": "afroboost123"}
        await db.coach_auth.insert_one(default_auth)
        return {"email": default_auth["email"]}
    return {"email": auth["email"]}

@api_router.post("/coach-auth/login")
async def coach_login(login: CoachLogin):
    auth = await db.coach_auth.find_one({"id": "coach_auth"}, {"_id": 0})
    if not auth:
        auth = {"email": "coach@afroboost.com", "password": "afroboost123"}
    
    if login.email == auth["email"] and login.password == auth["password"]:
        return {"success": True, "message": "Connexion réussie"}
    return {"success": False, "message": "Email ou mot de passe incorrect"}

@api_router.put("/coach-auth")
async def update_coach_auth(auth: CoachAuth):
    await db.coach_auth.update_one({"id": "coach_auth"}, {"$set": auth.model_dump()}, upsert=True)
    return {"success": True}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
