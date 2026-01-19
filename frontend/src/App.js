import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import "@/App.css";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import html2canvas from "html2canvas";
import { 
  getEmailJSConfig, 
  saveEmailJSConfig, 
  isEmailJSConfigured, 
  sendEmail,
  sendBulkEmails,
  testEmailJSConfig 
} from "./services/emailService";
import {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  isWhatsAppConfigured,
  sendWhatsAppMessage,
  sendBulkWhatsApp,
  testWhatsAppConfig
} from "./services/whatsappService";
import {
  setLastMediaUrl as setLastMediaUrlService
} from "./services/aiResponseService";
import { 
  NavigationBar, 
  LandingSectionSelector,
  ScrollIndicator,
  useScrollIndicator
} from "./components/SearchBar";
import { ChatWidget } from "./components/ChatWidget";
import { CoachDashboard } from "./components/CoachDashboard";
import CoachLoginModal from "./components/CoachLoginModal";
import { useDataCache, invalidateCache } from "./hooks/useDataCache";
// Composants extraits pour réduire la taille de App.js
import { SessionList } from "./components/SessionList";
import { OffersSliderAutoPlay } from "./components/OffersSlider";
import { BookingForm } from "./components/BookingForm";
// AudioPlayer est maintenant intégré dans HeroMediaWithAudio (pas d'import séparé)

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Configuration Admin - Vercel Compatible
const ADMIN_EMAIL = 'contact.artboost@gmail.com';
const APP_VERSION = '2.0.0';

// Translations
const translations = {
  fr: {
    appTitle: "Afroboost",
    conceptDefault: "Le concept Afroboost : cardio + danse afrobeat + casques audio immersifs. Un entraînement fun, énergétique et accessible à tous.",
    chooseSession: "Choisissez votre session",
    chooseOffer: "Choisissez votre offre",
    yourInfo: "Vos informations",
    fullName: "Nom complet",
    emailRequired: "Email (obligatoire)",
    whatsappRequired: "WhatsApp (obligatoire)",
    promoCode: "Code promo",
    total: "Total",
    alreadySubscribed: "Je suis déjà abonné",
    selectProfile: "Sélectionnez votre profil...",
    acceptTerms: "J'accepte les",
    termsLink: "conditions générales",
    termsTitle: "Conditions Générales",
    quantity: "Quantité",
    payAndReserve: "💳 Payer et réserver",
    reserveFree: "Réserver gratuitement",
    loading: "Chargement...",
    copyright: "© Afroboost 2026",
    coachLogin: "Connexion Coach",
    email: "Email",
    password: "Mot de passe",
    login: "Se connecter",
    forgotPassword: "Mot de passe oublié ?",
    cancel: "Annuler",
    coachMode: "Mode Coach",
    back: "← Retour",
    logout: "🚪 Déconnexion",
    reservations: "Réservations",
    conceptVisual: "Concept & Visuel",
    courses: "Cours",
    offers: "Offres",
    payments: "Paiements",
    promoCodes: "Codes promo",
    reservationsList: "Liste des réservations",
    downloadCSV: "📥 Télécharger CSV",
    code: "Code",
    name: "Nom",
    date: "Date",
    time: "Heure",
    offer: "Offre",
    qty: "Qté",
    noReservations: "Aucune réservation pour le moment",
    deleteReservation: "Supprimer cette réservation",
    confirmDeleteReservation: "Êtes-vous sûr de vouloir supprimer cette réservation ?",
    addManualContact: "➕ Ajouter un contact",
    manualContactName: "Nom",
    manualContactEmail: "Email",
    manualContactWhatsapp: "WhatsApp",
    conceptDescription: "Description du concept",
    mediaUrl: "URL Média Accueil (YouTube, Vimeo, Image)",
    save: "Sauvegarder",
    courseName: "Nom du cours",
    location: "Lieu",
    mapsLink: "Lien Google Maps",
    weekday: "Jour",
    addCourse: "Ajouter un cours",
    offerName: "Nom de l'offre",
    price: "Prix (CHF)",
    visible: "Visible",
    thumbnail: "URL miniature",
    addOffer: "Ajouter une offre",
    stripeLink: "Lien Stripe",
    paypalLink: "Lien PayPal",
    twintLink: "Lien Twint",
    coachWhatsapp: "WhatsApp Coach",
    codePromo: "Code (ex: GRATUIT)",
    type: "Type",
    value: "Valeur",
    beneficiary: "Bénéficiaire",
    selectBeneficiary: "Sélectionner un client...",
    assignedEmail: "Email assigné",
    allowedCourses: "Cours autorisés",
    allCourses: "Tous les cours",
    maxUses: "Utilisations max",
    expiresAt: "Date d'expiration",
    importCSV: "Importer CSV",
    exportCSV: "Exporter CSV",
    add: "Ajouter",
    noPromoCode: "Aucun code promo",
    active: "Actif",
    inactive: "Inactif",
    used: "Utilisé",
    paymentDone: "Paiement effectué ?",
    paymentConfirmText: "Si vous avez terminé le paiement, cliquez ci-dessous pour valider.",
    confirmPayment: "✅ Confirmer mon paiement",
    reservationConfirmed: "Réservation confirmée !",
    reservationCode: "Code",
    print: "🖨️ Imprimer",
    share: "📱 Partager",
    saveTicket: "📥 Enregistrer mon ticket",
    shareWithImage: "📤 Partager avec QR",
    generatingImage: "Génération en cours...",
    emailWhatsappRequired: "L'email et le numéro WhatsApp sont obligatoires.",
    invalidPromoCode: "Code promo invalide.",
    noPaymentConfigured: "Paiement requis – réservation impossible.",
    subscriberOnlyCode: "Seuls les abonnés peuvent utiliser ce code.",
    wrongCredentials: "Email ou mot de passe incorrect",
    discount: "Réduction",
    sunday: "Dimanche", monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi",
    thursday: "Jeudi", friday: "Vendredi", saturday: "Samedi",
    logoUrl: "URL du Logo (Splash Screen & PWA)",
    offerDescription: "Description (icône \"i\")",
    confirmDelete: "Supprimer ce code ?",
    delete: "Supprimer",
    termsText: "Texte des Conditions Générales",
    termsPlaceholder: "Entrez le texte de vos conditions générales de vente...",
    scanToValidate: "Scannez pour valider",
    batchGeneration: "Génération en série",
    batchCount: "Nombre de codes",
    codePrefix: "Préfixe du code",
    generateBatch: "🚀 Générer la série",
    batchSuccess: "codes créés avec succès !",
    batchMax: "Maximum 20 codes par série",
  },
  en: {
    appTitle: "Afroboost",
    conceptDefault: "The Afroboost concept: cardio + afrobeat dance + immersive audio headsets. A fun, energetic workout for everyone.",
    chooseSession: "Choose your session",
    chooseOffer: "Choose your offer",
    yourInfo: "Your information",
    fullName: "Full name",
    emailRequired: "Email (required)",
    whatsappRequired: "WhatsApp (required)",
    promoCode: "Promo code",
    total: "Total",
    alreadySubscribed: "I'm already subscribed",
    selectProfile: "Select your profile...",
    acceptTerms: "I accept the",
    termsLink: "terms and conditions",
    termsTitle: "Terms and Conditions",
    quantity: "Quantity",
    payAndReserve: "💳 Pay and reserve",
    reserveFree: "Reserve for free",
    loading: "Loading...",
    copyright: "© Afroboost 2026",
    coachLogin: "Coach Login",
    email: "Email",
    password: "Password",
    login: "Log in",
    forgotPassword: "Forgot password?",
    cancel: "Cancel",
    coachMode: "Coach Mode",
    back: "← Back",
    logout: "🚪 Logout",
    reservations: "Reservations",
    conceptVisual: "Concept & Visual",
    courses: "Courses",
    offers: "Offers",
    payments: "Payments",
    promoCodes: "Promo codes",
    reservationsList: "Reservations list",
    downloadCSV: "📥 Download CSV",
    code: "Code",
    name: "Name",
    date: "Date",
    time: "Time",
    offer: "Offer",
    qty: "Qty",
    noReservations: "No reservations yet",
    deleteReservation: "Delete this reservation",
    confirmDeleteReservation: "Are you sure you want to delete this reservation?",
    addManualContact: "➕ Add contact",
    manualContactName: "Name",
    manualContactEmail: "Email",
    manualContactWhatsapp: "WhatsApp",
    conceptDescription: "Concept description",
    mediaUrl: "Media URL (YouTube, Vimeo, Image)",
    save: "Save",
    courseName: "Course name",
    location: "Location",
    mapsLink: "Google Maps link",
    weekday: "Day",
    addCourse: "Add course",
    offerName: "Offer name",
    price: "Price (CHF)",
    visible: "Visible",
    thumbnail: "Thumbnail URL",
    addOffer: "Add offer",
    stripeLink: "Stripe link",
    paypalLink: "PayPal link",
    twintLink: "Twint link",
    coachWhatsapp: "Coach WhatsApp",
    codePromo: "Code (e.g. FREE)",
    type: "Type",
    value: "Value",
    beneficiary: "Beneficiary",
    selectBeneficiary: "Select a customer...",
    assignedEmail: "Assigned email",
    allowedCourses: "Allowed courses",
    allCourses: "All courses",
    maxUses: "Max uses",
    expiresAt: "Expiration date",
    importCSV: "Import CSV",
    exportCSV: "Export CSV",
    add: "Add",
    noPromoCode: "No promo code",
    active: "Active",
    inactive: "Inactive",
    used: "Used",
    paymentDone: "Payment done?",
    paymentConfirmText: "If you completed the payment, click below to validate.",
    confirmPayment: "✅ Confirm my payment",
    reservationConfirmed: "Reservation confirmed!",
    reservationCode: "Code",
    print: "🖨️ Print",
    share: "📱 Share",
    saveTicket: "📥 Save my ticket",
    shareWithImage: "📤 Share with QR",
    generatingImage: "Generating...",
    emailWhatsappRequired: "Email and WhatsApp are required.",
    invalidPromoCode: "Invalid promo code.",
    noPaymentConfigured: "Payment required – reservation impossible.",
    subscriberOnlyCode: "Only subscribers can use this code.",
    wrongCredentials: "Wrong email or password",
    discount: "Discount",
    sunday: "Sunday", monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
    thursday: "Thursday", friday: "Friday", saturday: "Saturday",
    logoUrl: "Logo URL (Splash Screen & PWA)",
    offerDescription: "Description (\"i\" icon)",
    confirmDelete: "Delete this code?",
    delete: "Delete",
    termsText: "Terms and Conditions Text",
    termsPlaceholder: "Enter your terms and conditions text...",
    scanToValidate: "Scan to validate",
    batchGeneration: "Batch Generation",
    batchCount: "Number of codes",
    codePrefix: "Code prefix",
    generateBatch: "🚀 Generate batch",
    batchSuccess: "codes created successfully!",
    batchMax: "Maximum 20 codes per batch",
  },
  de: {
    appTitle: "Afroboost",
    conceptDefault: "Das Afroboost-Konzept: Cardio + Afrobeat-Tanz + immersive Audio-Kopfhörer. Ein spaßiges Training für alle.",
    chooseSession: "Wählen Sie Ihre Sitzung",
    chooseOffer: "Wählen Sie Ihr Angebot",
    yourInfo: "Ihre Informationen",
    fullName: "Vollständiger Name",
    emailRequired: "E-Mail (erforderlich)",
    whatsappRequired: "WhatsApp (erforderlich)",
    promoCode: "Promo-Code",
    total: "Gesamt",
    alreadySubscribed: "Ich bin bereits abonniert",
    selectProfile: "Wählen Sie Ihr Profil...",
    acceptTerms: "Ich akzeptiere die",
    termsLink: "Allgemeinen Geschäftsbedingungen",
    termsTitle: "Allgemeine Geschäftsbedingungen",
    quantity: "Menge",
    payAndReserve: "💳 Zahlen und reservieren",
    reserveFree: "Kostenlos reservieren",
    loading: "Laden...",
    copyright: "© Afroboost 2026",
    coachLogin: "Coach-Anmeldung",
    email: "E-Mail",
    password: "Passwort",
    login: "Anmelden",
    forgotPassword: "Passwort vergessen?",
    cancel: "Abbrechen",
    coachMode: "Coach-Modus",
    back: "← Zurück",
    logout: "🚪 Abmelden",
    reservations: "Reservierungen",
    conceptVisual: "Konzept & Visuell",
    courses: "Kurse",
    offers: "Angebote",
    payments: "Zahlungen",
    promoCodes: "Promo-Codes",
    reservationsList: "Reservierungsliste",
    downloadCSV: "📥 CSV herunterladen",
    code: "Code",
    name: "Name",
    date: "Datum",
    time: "Zeit",
    offer: "Angebot",
    qty: "Menge",
    noReservations: "Noch keine Reservierungen",
    deleteReservation: "Reservierung löschen",
    confirmDeleteReservation: "Möchten Sie diese Reservierung wirklich löschen?",
    addManualContact: "➕ Kontakt hinzufügen",
    manualContactName: "Name",
    manualContactEmail: "E-Mail",
    manualContactWhatsapp: "WhatsApp",
    conceptDescription: "Konzeptbeschreibung",
    mediaUrl: "Medien-URL (YouTube, Vimeo, Bild)",
    save: "Speichern",
    courseName: "Kursname",
    location: "Ort",
    mapsLink: "Google Maps Link",
    weekday: "Tag",
    addCourse: "Kurs hinzufügen",
    offerName: "Angebotsname",
    price: "Preis (CHF)",
    visible: "Sichtbar",
    thumbnail: "Miniatur-URL",
    addOffer: "Angebot hinzufügen",
    stripeLink: "Stripe-Link",
    paypalLink: "PayPal-Link",
    twintLink: "Twint-Link",
    coachWhatsapp: "Coach WhatsApp",
    codePromo: "Code (z.B. GRATIS)",
    type: "Typ",
    value: "Wert",
    beneficiary: "Begünstigter",
    selectBeneficiary: "Kunden auswählen...",
    assignedEmail: "Zugewiesene E-Mail",
    allowedCourses: "Erlaubte Kurse",
    allCourses: "Alle Kurse",
    maxUses: "Max. Nutzungen",
    expiresAt: "Ablaufdatum",
    importCSV: "CSV importieren",
    exportCSV: "CSV exportieren",
    add: "Hinzufügen",
    noPromoCode: "Kein Promo-Code",
    active: "Aktiv",
    inactive: "Inaktiv",
    used: "Verwendet",
    paymentDone: "Zahlung abgeschlossen?",
    paymentConfirmText: "Wenn Sie die Zahlung abgeschlossen haben, klicken Sie unten.",
    confirmPayment: "✅ Zahlung bestätigen",
    reservationConfirmed: "Reservierung bestätigt!",
    reservationCode: "Code",
    print: "🖨️ Drucken",
    share: "📱 Teilen",
    saveTicket: "📥 Ticket speichern",
    shareWithImage: "📤 Mit QR teilen",
    generatingImage: "Wird generiert...",
    emailWhatsappRequired: "E-Mail und WhatsApp sind erforderlich.",
    invalidPromoCode: "Ungültiger Promo-Code.",
    noPaymentConfigured: "Zahlung erforderlich.",
    subscriberOnlyCode: "Nur Abonnenten können diesen Code verwenden.",
    wrongCredentials: "Falsche E-Mail oder Passwort",
    discount: "Rabatt",
    sunday: "Sonntag", monday: "Montag", tuesday: "Dienstag", wednesday: "Mittwoch",
    thursday: "Donnerstag", friday: "Freitag", saturday: "Samstag",
    logoUrl: "Logo-URL (Splash Screen & PWA)",
    offerDescription: "Beschreibung (\"i\" Symbol)",
    confirmDelete: "Diesen Code löschen?",
    delete: "Löschen",
    termsText: "AGB-Text",
    termsPlaceholder: "Geben Sie Ihren AGB-Text ein...",
    scanToValidate: "Zum Validieren scannen",
    batchGeneration: "Serien-Generierung",
    batchCount: "Anzahl der Codes",
    codePrefix: "Code-Präfix",
    generateBatch: "🚀 Serie generieren",
    batchSuccess: "Codes erfolgreich erstellt!",
    batchMax: "Maximal 20 Codes pro Serie",
  }
};

const WEEKDAYS_MAP = {
  fr: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
  en: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  de: ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
};

// Helper functions
function getNextOccurrences(weekday, count = 4) {
  const now = new Date();
  const results = [];
  const day = now.getDay();
  let diff = weekday - day;
  if (diff < 0) diff += 7;
  let current = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  for (let i = 0; i < count; i++) {
    results.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return results;
}

function formatDate(d, time, lang) {
  const formatted = d.toLocaleDateString(lang === 'de' ? 'de-CH' : lang === 'en' ? 'en-GB' : 'fr-CH', {
    weekday: "short", day: "2-digit", month: "2-digit"
  });
  return `${formatted} • ${time}`;
}

// Parse media URL (YouTube, Vimeo, Image)
function parseMediaUrl(url) {
  if (!url || typeof url !== 'string') return null;
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return null;
  
  // YouTube - Support multiple formats
  // youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/v/ID
  const ytMatch = trimmedUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { type: 'youtube', id: ytMatch[1] };
  
  // Vimeo - Support multiple formats
  const vimeoMatch = trimmedUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };
  
  // Video files - MP4, WebM, MOV, AVI
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.m4v', '.ogv'];
  const lowerUrl = trimmedUrl.toLowerCase();
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return { type: 'video', url: trimmedUrl };
  }
  
  // Image - Accept all common formats and CDN URLs
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const imageCDNs = ['imgbb.com', 'cloudinary.com', 'imgur.com', 'unsplash.com', 'pexels.com', 'i.ibb.co'];
  
  if (imageExtensions.some(ext => lowerUrl.includes(ext)) || imageCDNs.some(cdn => lowerUrl.includes(cdn))) {
    return { type: 'image', url: trimmedUrl };
  }
  
  // Default: treat as image (many CDNs don't have extensions in URLs)
  return { type: 'image', url: trimmedUrl };
}

// Globe Icon - Clean, no background
const GlobeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

// Location Icon
const LocationIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

// Folder Icon for CSV Import
const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
);

// Splash Screen - Pure Black with configurable logo and PWA fallback
const SplashScreen = ({ logoUrl }) => {
  const [imgError, setImgError] = useState(false);
  // Use PWA logo as fallback if no logoUrl or image fails to load
  const fallbackLogo = '/logo512.png';
  const showLogo = logoUrl && !imgError;
  const showFallback = !logoUrl || imgError;
  
  return (
    <div className="splash-screen" style={{ background: '#000000' }}>
      {showLogo && (
        <img 
          src={logoUrl} 
          alt="Afroboost" 
          className="splash-logo" 
          onError={() => setImgError(true)}
        />
      )}
      {showFallback && (
        <img 
          src={fallbackLogo} 
          alt="Afroboost" 
          className="splash-logo" 
          style={{ maxWidth: '150px', maxHeight: '150px' }}
          onError={(e) => { 
            // Ultimate fallback: show emoji if PWA logo also fails
            e.target.style.display = 'none';
            e.target.parentNode.querySelector('.splash-headset-fallback').style.display = 'block';
          }}
        />
      )}
      <div className="splash-headset-fallback" style={{ display: 'none', fontSize: '80px' }}>🎧</div>
      <div className="splash-text">Afroboost</div>
    </div>
  );
};

// Language Selector - Clean without background
const LanguageSelector = ({ lang, setLang }) => {
  const [open, setOpen] = useState(false);
  const languages = [{ code: 'fr', label: 'FR' }, { code: 'en', label: 'EN' }, { code: 'de', label: 'DE' }];

  return (
    <div className="lang-selector" onClick={() => setOpen(!open)} data-testid="lang-selector">
      <GlobeIcon />
      <span style={{ color: '#FFFFFF', fontWeight: '500', fontSize: '14px' }}>{lang.toUpperCase()}</span>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '8px',
          background: 'rgba(0, 0, 0, 0.95)', border: '1px solid rgba(139, 92, 246, 0.4)',
          borderRadius: '8px', overflow: 'hidden', minWidth: '70px'
        }}>
          {languages.map(l => (
            <div key={l.code} onClick={(e) => { e.stopPropagation(); setLang(l.code); setOpen(false); }}
              style={{ padding: '10px 16px', color: '#FFFFFF', cursor: 'pointer', fontSize: '14px',
                background: lang === l.code ? 'rgba(139, 92, 246, 0.3)' : 'transparent' }}
              data-testid={`lang-${l.code}`}>{l.label}</div>
          ))}
        </div>
      )}
    </div>
  );
};

// ========== UTILITAIRE: Convertir les URLs Cloud en liens directs ==========
const convertCloudUrlToDirect = (url) => {
  if (!url) return url;
  
  // Google Drive: /file/d/ID/view -> lien direct
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    const fileId = driveMatch[1];
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  
  // Google Drive: open?id=
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${driveOpenMatch[1]}`;
  }
  
  // Dropbox: Convertir en lien raw pour lecture directe
  // dl=0 -> raw=1 (plus fiable que dl=1 pour le streaming audio)
  if (url.includes('dropbox.com')) {
    let directUrl = url
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('dl=0', 'raw=1')
      .replace('dl=1', 'raw=1');
    // Ajouter raw=1 si pas présent (même après le remplacement de domaine)
    if (!directUrl.includes('raw=1')) {
      directUrl = directUrl.includes('?') ? `${directUrl}&raw=1` : `${directUrl}?raw=1`;
    }
    return directUrl;
  }
  
  // OneDrive: Convertir en lien de téléchargement direct
  if (url.includes('1drv.ms') || url.includes('onedrive.live.com')) {
    return url.replace('redir', 'download');
  }
  
  return url;
};

// Vérifier si une URL est un lien audio valide
const isValidAudioUrl = (url) => {
  if (!url) return false;
  
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'];
  const hasAudioExtension = audioExtensions.some(ext => url.toLowerCase().includes(ext));
  
  // URLs de streaming connues
  const isKnownStream = url.includes('drive.google.com') || 
                        url.includes('dropbox.com') || 
                        url.includes('githubusercontent.com') ||
                        url.includes('cloudinary.com') ||
                        url.includes('s3.amazonaws.com');
  
  return hasAudioExtension || isKnownStream;
};

// ========== HERO MEDIA WITH AUDIO SWITCH + SILENT DISCO LIVE ==========
// Composant qui permute entre :
// 1. Vidéo héro normale
// 2. Lecteur audio local (mode solo)
// 3. Récepteur Silent Disco Live (synchronisé avec le Coach DJ)
// Garde les mêmes dimensions pour éviter le CLS (Cumulative Layout Shift)
const HeroMediaWithAudio = ({ 
  videoUrl, 
  isAudioMode, 
  selectedCourse, 
  audioFeatureEnabled,
  onCloseAudio,
  className 
}) => {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const currentSessionIdRef = useRef(null); // Pour la reconnexion
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioError, setAudioError] = useState(null);
  const [audioVolume, setAudioVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // ========== SILENT DISCO LIVE STATE ==========
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveSessionId, setLiveSessionId] = useState('');
  const [liveWebSocket, setLiveWebSocket] = useState(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveParticipants, setLiveParticipants] = useState(0);
  const [liveCourseName, setLiveCourseName] = useState('');
  const [liveCourseImage, setLiveCourseImage] = useState(''); // Image de couverture du cours
  const [showJoinLive, setShowJoinLive] = useState(false);
  const [joinSessionInput, setJoinSessionInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [waitingForCoach, setWaitingForCoach] = useState(false); // En attente du lancement
  const [audioUnlocked, setAudioUnlocked] = useState(false); // Audio déverrouillé sur mobile
  const [audioLoadError, setAudioLoadError] = useState(false); // Erreur chargement après 5s
  const audioLoadTimeoutRef = useRef(null); // Timeout pour erreur 5s

  // ========== AUDIO UNLOCK: Réveiller le haut-parleur mobile (CRITIQUE pour iOS/Android) ==========
  const unlockAudioForMobile = useCallback(() => {
    return new Promise((resolve) => {
      try {
        console.log('[AudioUnlock] 🔓 Démarrage du déverrouillage audio mobile...');
        
        // ÉTAPE 1: Créer et résumer un AudioContext
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const tempContext = new AudioContextClass();
        
        // Forcer le resume() pour iOS Safari
        if (tempContext.state === 'suspended') {
          tempContext.resume();
        }
        
        // ÉTAPE 2: Créer un oscillateur silencieux (0.1s à volume quasi-nul)
        const oscillator = tempContext.createOscillator();
        const gainNode = tempContext.createGain();
        
        // Volume presque à zéro mais pas 0 (iOS nécessite un son réel)
        gainNode.gain.setValueAtTime(0.001, tempContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(tempContext.destination);
        
        oscillator.frequency.value = 1; // Fréquence très basse (inaudible)
        oscillator.start(tempContext.currentTime);
        oscillator.stop(tempContext.currentTime + 0.1); // 0.1 seconde
        
        // ÉTAPE 3: Préparer l'élément audio pour lecture future
        if (audioRef.current) {
          audioRef.current.volume = audioVolume;
          audioRef.current.muted = false;
          audioRef.current.load();
          
          // Tenter un play/pause immédiat pour débloquer (technique iOS)
          const playAttempt = audioRef.current.play();
          if (playAttempt) {
            playAttempt
              .then(() => {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                console.log('[AudioUnlock] ✅ Audio element pré-activé');
              })
              .catch(() => {
                // Ignorer les erreurs - l'important c'est la tentative
                console.log('[AudioUnlock] Audio element en attente');
              });
          }
        }
        
        // ÉTAPE 4: Finaliser après le son silencieux
        setTimeout(() => {
          // SÉCURITÉ: Vérifier que le contexte n'est pas déjà fermé
          if (tempContext && tempContext.state !== 'closed') {
            tempContext.close().catch(() => {});
          }
          setAudioUnlocked(true);
          console.log('[AudioUnlock] ✅ Haut-parleur mobile DÉVERROUILLÉ - Prêt à recevoir audio');
          resolve(true);
        }, 150);
        
      } catch (e) {
        console.warn('[AudioUnlock] ⚠️ Erreur (fallback activé):', e);
        setAudioUnlocked(true); // Marquer comme fait même en cas d'erreur
        resolve(false);
      }
    });
  }, [audioVolume]);

  // ========== FORCE AUDIO PLAY: Maintenir le canal audio ouvert avec silence en boucle ==========
  const silenceIntervalRef = useRef(null);
  const silenceContextRef = useRef(null);
  
  const forceAudioPlay = useCallback(() => {
    console.log('[ForceAudio] 🔊 Activation du maintien de canal audio...');
    
    try {
      // Créer un AudioContext persistant
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      silenceContextRef.current = ctx;
      
      // Fonction qui joue 1 seconde de silence
      const playSilence = () => {
        if (!silenceContextRef.current || silenceContextRef.current.state === 'closed') return;
        
        try {
          const oscillator = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          // Volume à 0.0001 (quasi-inaudible mais actif)
          gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
          
          oscillator.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          oscillator.frequency.value = 1; // 1 Hz inaudible
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 1); // 1 seconde
          
          console.log('[ForceAudio] ♪ Silence joué pour maintenir canal actif');
        } catch (e) {
          // Ignorer les erreurs mineures
        }
      };
      
      // Jouer le premier silence immédiatement
      if (ctx.state === 'suspended') {
        ctx.resume().then(playSilence);
      } else {
        playSilence();
      }
      
      // Répéter toutes les 900ms (avant que le 1s précédent finisse)
      silenceIntervalRef.current = setInterval(playSilence, 900);
      
      console.log('[ForceAudio] ✅ Canal audio maintenu ouvert en boucle');
      return true;
      
    } catch (e) {
      console.error('[ForceAudio] ❌ Erreur:', e);
      return false;
    }
  }, []);

  // Arrêter le maintien du silence quand on quitte la session
  const stopForceAudio = useCallback(() => {
    if (silenceIntervalRef.current) {
      clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
    // SÉCURITÉ: Vérifier que le contexte n'est pas déjà fermé avant de fermer
    if (silenceContextRef.current && silenceContextRef.current.state !== 'closed') {
      silenceContextRef.current.close().catch(() => {});
    }
    silenceContextRef.current = null;
    console.log('[ForceAudio] Canal audio fermé');
  }, []);

  // ========== WEB AUDIO API: Forcer le canal Media ==========
  const initWebAudio = useCallback(() => {
    if (!audioContextRef.current && audioRef.current) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContext();
        
        // Créer le nœud source connecté à l'élément audio
        if (!sourceNodeRef.current) {
          sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
          sourceNodeRef.current.connect(audioContextRef.current.destination);
        }
        
        console.log('[WebAudio] AudioContext initialisé - Canal Media activé');
      } catch (e) {
        console.warn('[WebAudio] Fallback sur audio standard:', e);
      }
    }
    
    // Reprendre le contexte audio si suspendu (iOS)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  // ========== MEDIA SESSION API: Lecture en arrière-plan ==========
  const updateMediaSession = useCallback((courseName, isPlaying) => {
    if ('mediaSession' in navigator) {
      try {
        // Metadata pour l'écran de verrouillage
        navigator.mediaSession.metadata = new MediaMetadata({
          title: courseName || 'Silent Disco Live',
          artist: 'Afroboost',
          album: 'Session en Direct',
          artwork: [
            { src: '/favicon.ico', sizes: '96x96', type: 'image/x-icon' },
            { src: '/logo192.png', sizes: '192x192', type: 'image/png' },
            { src: '/logo512.png', sizes: '512x512', type: 'image/png' }
          ]
        });
        
        // État de lecture
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        
        // IMPORTANT: Supprimer tous les handlers pour empêcher le participant de contrôler
        // On ne définit PAS de handlers pour play/pause/seekbackward/seekforward
        // Cela désactive les boutons sur l'écran de verrouillage
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('stop', null);
        
        console.log('[MediaSession] Updated:', courseName, isPlaying ? 'playing' : 'paused');
      } catch (e) {
        console.warn('[MediaSession] Error:', e);
      }
    }
  }, []);

  // Mettre à jour Media Session quand le mode live change
  useEffect(() => {
    if (isLiveMode && liveConnected) {
      updateMediaSession(liveCourseName, isPlaying);
    }
  }, [isLiveMode, liveConnected, liveCourseName, isPlaying, updateMediaSession]);

  // Reset track index when course changes
  useEffect(() => {
    setCurrentTrackIndex(0);
    setIsPlaying(false);
  }, [selectedCourse?.id]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : audioVolume;
    }
  }, [audioVolume, isMuted]);

  // Cleanup WebSocket et AudioContext on unmount
  useEffect(() => {
    return () => {
      if (liveWebSocket) {
        liveWebSocket.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (audioLoadTimeoutRef.current) {
        clearTimeout(audioLoadTimeoutRef.current);
      }
      // SÉCURITÉ: Vérifier que le contexte n'est pas déjà fermé
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [liveWebSocket]);

  // Fermer le menu quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showSettingsMenu && !e.target.closest('.settings-menu-container')) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSettingsMenu]);

  // ========== SILENT DISCO: Rejoindre une session Live avec Reconnexion ==========
  const joinLiveSession = useCallback(async (sessionId, isReconnect = false) => {
    if (!sessionId) return;
    
    // Stocker le sessionId pour la reconnexion
    currentSessionIdRef.current = sessionId;
    
    // ========== AUDIO UNLOCK + FORCE AUDIO PLAY ==========
    if (!isReconnect) {
      console.log('[Silent Disco] Déverrouillage audio mobile...');
      await unlockAudioForMobile();
      // Initialiser Web Audio API pour canal Media
      initWebAudio();
      // ========== FORCE AUDIO PLAY: Maintenir le canal ouvert avec silence en boucle ==========
      forceAudioPlay();
    }
    
    // Nettoyer la connexion précédente
    if (liveWebSocket) {
      liveWebSocket.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    const API_URL = process.env.REACT_APP_BACKEND_URL || '';
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = API_URL.replace(/^https?:\/\//, '').replace('/api', '');
    const wsUrl = `${wsProtocol}//${wsHost}/api/ws/session/${sessionId}`;
    
    console.log(`[Silent Disco] ${isReconnect ? 'Reconnexion' : 'Connexion'} à:`, wsUrl);
    setIsSyncing(true);
    setWaitingForCoach(true); // Attente du coach
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('[Silent Disco Participant] Connected');
      ws.send(JSON.stringify({
        type: "JOIN",
        data: {
          email: "participant@live",
          name: "Participant",
          is_coach: false
        }
      }));
      setLiveConnected(true);
      setLiveSessionId(sessionId);
      setIsSyncing(false);
    };
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('[Silent Disco Participant] Message:', msg.type);
        
        switch (msg.type) {
          case "STATE_SYNC":
            setLiveParticipants(msg.data.participant_count || 0);
            setLiveCourseName(msg.data.course_name || '');
            // ========== RÉCUPÉRER L'IMAGE DE COUVERTURE DU COURS ==========
            if (msg.data.course_image) {
              setLiveCourseImage(msg.data.course_image);
            }
            if (msg.data.track_index !== undefined) {
              setCurrentTrackIndex(msg.data.track_index);
            }
            // ========== SYNC IMMÉDIAT: Si session déjà en cours (PLAY actif) ==========
            // Note: Le backend envoie directement playing/position dans data (pas session_state)
            if (msg.data.playing) {
              setWaitingForCoach(false);
              console.log('[Silent Disco] Session en cours détectée - synchronisation immédiate');
              
              // Récupérer la position actuelle et synchroniser
              if (audioRef.current && msg.data.position !== undefined) {
                const serverTime = msg.data.server_time 
                  ? new Date(msg.data.server_time).getTime() 
                  : Date.now();
                const now = Date.now();
                const latency = (now - serverTime) / 1000;
                const targetPosition = (msg.data.position || 0) + latency;
                
                console.log(`[Silent Disco] Sync immédiat: position=${targetPosition.toFixed(2)}s`);
                
                // Démarrer la lecture immédiatement
                audioRef.current.currentTime = Math.max(0, targetPosition);
                const playPromise = audioRef.current.play();
                if (playPromise) {
                  playPromise
                    .then(() => {
                      console.log('[Silent Disco] ✅ Audio synchronisé avec session en cours');
                      setIsPlaying(true);
                    })
                    .catch(err => {
                      console.error('[Silent Disco] Erreur sync initial:', err);
                      // Retry
                      setTimeout(() => {
                        audioRef.current?.play().catch(() => {});
                        setIsPlaying(true);
                      }, 300);
                    });
                }
              }
            } else {
              setWaitingForCoach(true);
            }
            break;
            
          case "PARTICIPANT_COUNT":
            setLiveParticipants(msg.data.count);
            break;
            
          case "PLAY":
            // ========== RE-SYNC IMMÉDIAT: Rattraper le retard ==========
            setWaitingForCoach(false);
            setAudioLoadError(false); // Reset erreur
            
            // Annuler le timeout précédent s'il existe
            if (audioLoadTimeoutRef.current) {
              clearTimeout(audioLoadTimeoutRef.current);
            }
            
            if (audioRef.current) {
              // Forcer le rechargement du flux audio pour garantir la lecture
              const currentSrc = audioRef.current.src;
              
              // S'assurer que l'URL contient raw=1 pour Dropbox
              let audioSrc = currentSrc;
              if (audioSrc.includes('dropbox') && !audioSrc.includes('raw=1')) {
                audioSrc = audioSrc.replace('dl=0', 'raw=1').replace('dl=1', 'raw=1');
                if (!audioSrc.includes('raw=1')) {
                  audioSrc = audioSrc.includes('?') ? `${audioSrc}&raw=1` : `${audioSrc}?raw=1`;
                }
                audioRef.current.src = audioSrc;
                console.log('[Silent Disco] URL Dropbox corrigée avec raw=1');
              }
              
              // ========== TIMEOUT 5S: Erreur si audio ne charge pas ==========
              audioLoadTimeoutRef.current = setTimeout(() => {
                if (!isPlaying && audioRef.current && audioRef.current.readyState < 3) {
                  console.error('[Silent Disco] ❌ Audio non chargé après 5 secondes');
                  setAudioLoadError(true);
                  setAudioError('Impossible de charger le flux audio. Vérifiez votre connexion.');
                }
              }, 5000);
              
              // Synchroniser la position avec compensation de latence
              const serverTime = new Date(msg.data.server_timestamp).getTime();
              const now = Date.now();
              const latency = (now - serverTime) / 1000; // en secondes
              const targetPosition = (msg.data.position || 0) + latency;
              
              console.log(`[Silent Disco] PLAY sync: position=${targetPosition.toFixed(2)}s, latency=${(latency * 1000).toFixed(0)}ms`);
              
              // Charger et jouer
              audioRef.current.load();
              audioRef.current.currentTime = Math.min(targetPosition, audioRef.current.duration || 9999);
              
              // Forcer la lecture avec retry
              const playPromise = audioRef.current.play();
              if (playPromise) {
                playPromise
                  .then(() => {
                    console.log('[Silent Disco] ✅ Audio démarré avec succès');
                    setIsPlaying(true);
                  })
                  .catch(err => {
                    console.error('[Silent Disco] Erreur lecture:', err);
                    // Retry après un court délai
                    setTimeout(() => {
                      audioRef.current.play().catch(e => console.error('[Silent Disco] Retry échoué:', e));
                    }, 200);
                  });
              }
            }
            setIsPlaying(true);
            break;
            
          case "PAUSE":
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current.currentTime = msg.data.position || 0;
            }
            setIsPlaying(false);
            setWaitingForCoach(true); // Retour en attente
            break;
            
          case "SEEK":
            if (audioRef.current) {
              audioRef.current.currentTime = msg.data.position || 0;
            }
            break;
            
          case "TRACK_CHANGE":
            setCurrentTrackIndex(msg.data.track_index || 0);
            if (audioRef.current && msg.data.session_state?.playing) {
              setTimeout(() => {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(console.error);
              }, 100);
            }
            break;
            
          case "SESSION_START":
            setLiveCourseName(msg.data.course_name || '');
            setIsSyncing(false);
            setLastSyncTime(Date.now());
            setWaitingForCoach(true);
            break;
            
          case "SESSION_END":
            setIsPlaying(false);
            setWaitingForCoach(false);
            if (audioRef.current) {
              audioRef.current.pause();
            }
            break;
            
          default:
            break;
        }
        
        // Mettre à jour le temps de sync
        setLastSyncTime(Date.now());
        setIsSyncing(false);
      } catch (e) {
        console.error('[Silent Disco Participant] Parse error:', e);
      }
    };
    
    ws.onerror = (error) => {
      console.error('[Silent Disco Participant] WebSocket error:', error);
      setLiveConnected(false);
      setIsSyncing(false);
    };
    
    ws.onclose = () => {
      console.log('[Silent Disco Participant] Connection closed');
      setLiveConnected(false);
      setLiveWebSocket(null);
      setIsSyncing(false);
      // Note: la reconnexion est gérée par useEffect
    };
    
    setLiveWebSocket(ws);
    setIsLiveMode(true);
    setShowJoinLive(false);
  }, [liveWebSocket, unlockAudioForMobile, initWebAudio, forceAudioPlay, isPlaying]);

  // ========== RECONNEXION AUTOMATIQUE ==========
  useEffect(() => {
    // Reconnexion si la connexion est perdue mais le mode live est actif
    if (isLiveMode && !liveConnected && !liveWebSocket && currentSessionIdRef.current) {
      console.log('[Silent Disco] Tentative de reconnexion dans 2s...');
      reconnectTimeoutRef.current = setTimeout(() => {
        const sessionId = currentSessionIdRef.current;
        if (sessionId && isLiveMode) {
          joinLiveSession(sessionId, true);
        }
      }, 2000);
      
      return () => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };
    }
  }, [isLiveMode, liveConnected, liveWebSocket, joinLiveSession]);

  const leaveLiveSession = () => {
    // Nettoyer la ref pour empêcher la reconnexion
    currentSessionIdRef.current = null;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (liveWebSocket) {
      liveWebSocket.close();
    }
    // ========== ARRÊTER le silence en boucle ==========
    stopForceAudio();
    
    setIsLiveMode(false);
    setLiveConnected(false);
    setLiveSessionId('');
    setLiveWebSocket(null);
    setIsPlaying(false);
    setWaitingForCoach(false);
    setAudioUnlocked(false);
    setLiveCourseImage(''); // Reset l'image de couverture
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // Container style (mêmes dimensions 16:9 que MediaDisplay)
  const containerStyle = {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%',
    overflow: 'hidden',
    borderRadius: '16px',
    border: '1px solid rgba(217, 28, 210, 0.3)',
    boxShadow: '0 0 30px rgba(217, 28, 210, 0.2)',
    background: '#0a0a0a'
  };

  const contentStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  };

  // ========== AFFICHAGE: Mode Normal (Vidéo) ==========
  if (!isAudioMode && !isLiveMode) {
    return (
      <div className={className} style={{ position: 'relative' }}>
        <MediaDisplay url={videoUrl} />
        
        {/* Menu "..." en haut à droite (50px hitbox pour iPhone) - z-index élevé */}
        {audioFeatureEnabled && (
          <div className="settings-menu-container" style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 100
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsMenu(!showSettingsMenu);
              }}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(217, 28, 210, 0.5)',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'auto'
              }}
              data-testid="settings-menu-btn"
            >
              ⋮
            </button>
            
            {/* Menu déroulant */}
            {showSettingsMenu && (
              <div style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                background: 'rgba(20, 20, 30, 0.98)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(217, 28, 210, 0.3)',
                padding: '8px',
                minWidth: '180px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
                zIndex: 500 // ÉLEVÉ pour passer au-dessus du bouton REJOINDRE
              }}>
                {/* Volume */}
                <div style={{ padding: '8px 12px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '6px' }}>Volume</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🔈</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioVolume}
                      onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                      style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        appearance: 'none',
                        background: `linear-gradient(to right, #d91cd2 0%, #d91cd2 ${audioVolume * 100}%, rgba(255,255,255,0.2) ${audioVolume * 100}%, rgba(255,255,255,0.2) 100%)`,
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '14px' }}>🔊</span>
                  </div>
                </div>
                
                {/* Mute Vidéo */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: isMuted ? 'rgba(217, 28, 210, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isMuted ? '🔇' : '🔊'} {isMuted ? 'Activer le son' : 'Couper le son'}
                </button>
                
                {/* Infos */}
                <button
                  onClick={() => alert('Afroboost Silent Disco\n\nRejoignez une session Live pour vous synchroniser avec le coach.')}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  ℹ️ Infos
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Bouton REJOINDRE LE LIVE - 100% largeur sur mobile */}
        {audioFeatureEnabled && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            zIndex: 100
          }}>
            <button
              onClick={() => {
                initWebAudio();
                setShowJoinLive(true);
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #d91cd2, #8b5cf6)',
                border: 'none',
                borderRadius: '16px',
                padding: '14px 20px',
                color: '#fff',
                fontWeight: 700,
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 20px rgba(217, 28, 210, 0.5)',
                transition: 'all 0.2s ease',
                pointerEvents: 'auto'
              }}
              data-testid="join-live-btn"
            >
              <span style={{ fontSize: '20px' }}>🎧</span>
              REJOINDRE LE LIVE
            </button>
          </div>
        )}

        {/* Modal pour entrer le code de session */}
        {showJoinLive && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: '#1a1a2e',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              border: '1px solid rgba(217, 28, 210, 0.3)',
              boxShadow: '0 0 50px rgba(217, 28, 210, 0.3)'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <span style={{ fontSize: '64px' }}>🎧</span>
                <h2 style={{ color: '#fff', fontSize: '24px', marginTop: '16px' }}>Rejoindre le Live</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginTop: '8px' }}>
                  Entrez le code de session donné par votre coach
                </p>
              </div>
              
              <input
                type="text"
                value={joinSessionInput}
                onChange={(e) => setJoinSessionInput(e.target.value)}
                placeholder="Code de session (ex: live_abc123_...)"
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(217, 28, 210, 0.3)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  color: '#fff',
                  fontSize: '16px',
                  marginBottom: '16px',
                  outline: 'none'
                }}
                data-testid="live-session-input"
              />
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowJoinLive(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    color: '#fff',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={() => joinLiveSession(joinSessionInput)}
                  disabled={!joinSessionInput.trim()}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: joinSessionInput.trim() ? 'linear-gradient(135deg, #d91cd2, #8b5cf6)' : 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: joinSessionInput.trim() ? 'pointer' : 'not-allowed'
                  }}
                  data-testid="confirm-join-live"
                >
                  🔊 Rejoindre
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== AFFICHAGE: Mode Live (Récepteur Passif) ==========
  if (isLiveMode && liveConnected) {
    const playlist = selectedCourse?.playlist || [];
    
    return (
      <div className={className} style={containerStyle} data-testid="live-receiver-player">
        <div style={{
          ...contentStyle,
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(217, 28, 210, 0.4) 50%, rgba(0, 0, 0, 0.95) 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-around', // SPACE-AROUND pour distribution verticale
          padding: '16px 12px',
          overflow: 'hidden', // CRITIQUE: Aucun élément ne sort du cadre
          boxSizing: 'border-box',
          position: 'relative'
        }}>
          {/* Menu "..." en haut à droite (40px hitbox) */}
          <div className="settings-menu-container" style={{
            position: 'absolute',
            top: '8px',
            right: '56px',
            zIndex: 25
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettingsMenu(!showSettingsMenu);
              }}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              data-testid="live-settings-btn"
            >
              ⋮
            </button>
            
            {/* Menu déroulant Live */}
            {showSettingsMenu && (
              <div style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                background: 'rgba(20, 20, 30, 0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(217, 28, 210, 0.3)',
                padding: '8px',
                minWidth: '180px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                zIndex: 500 // ÉLEVÉ pour passer au-dessus de tous les éléments
              }}>
                {/* Volume */}
                <div style={{ padding: '8px 12px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px', marginBottom: '6px' }}>Volume</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🔈</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={audioVolume}
                      onChange={(e) => {
                        const vol = parseFloat(e.target.value);
                        setAudioVolume(vol);
                        if (audioRef.current) audioRef.current.volume = vol;
                      }}
                      style={{
                        flex: 1,
                        height: '4px',
                        borderRadius: '2px',
                        appearance: 'none',
                        background: `linear-gradient(to right, #d91cd2 0%, #d91cd2 ${audioVolume * 100}%, rgba(255,255,255,0.2) ${audioVolume * 100}%, rgba(255,255,255,0.2) 100%)`,
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '14px' }}>🔊</span>
                  </div>
                </div>
                
                {/* Mute */}
                <button
                  onClick={() => {
                    setIsMuted(!isMuted);
                    if (audioRef.current) audioRef.current.volume = isMuted ? audioVolume : 0;
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: isMuted ? 'rgba(217, 28, 210, 0.2)' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isMuted ? '🔇' : '🔊'} {isMuted ? 'Réactiver' : 'Couper le son'}
                </button>
                
                {/* Infos */}
                <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '4px' }}>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
                    Session: {liveSessionId.slice(0, 20)}...
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Bouton quitter en haut à droite */}
          <button
            onClick={leaveLiveSession}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '18px'
            }}
            data-testid="leave-live-btn"
          >
            ✕
          </button>

          {/* Badge EN DIRECT avec point rouge animé */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            background: 'rgba(220, 38, 38, 0.9)',
            padding: '6px 14px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ 
              width: '10px', 
              height: '10px', 
              borderRadius: '50%', 
              background: '#ff3b3b',
              boxShadow: '0 0 8px #ff3b3b',
              animation: 'pulse 1s infinite' 
            }}></span>
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>EN DIRECT</span>
          </div>

          {/* Indicateur de synchronisation */}
          {isSyncing && (
            <div style={{
              position: 'absolute',
              top: '48px',
              left: '12px',
              background: 'rgba(59, 130, 246, 0.9)',
              padding: '4px 10px',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '10px'
            }}>
              ⏳ Synchronisation...
            </div>
          )}

          {/* ========== TITRE DU COURS (ÉPURÉ - sans badge LIVE doublon) ========== */}
          <h3 style={{
            color: '#fff',
            fontSize: 'clamp(16px, 4vw, 22px)',
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 8px 0',
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            flexShrink: 0
          }}>
            {liveCourseName || 'Silent Disco Live'}
          </h3>

          {/* ========== MINIATURE DU COURS (image réelle de l'offre) ========== */}
          <div style={{
            width: 'clamp(120px, 35vw, 160px)',
            height: 'clamp(120px, 35vw, 160px)',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: isPlaying 
              ? '0 0 30px rgba(217, 28, 210, 0.6)' 
              : '0 4px 20px rgba(0,0,0,0.4)',
            border: isPlaying 
              ? '3px solid rgba(217, 28, 210, 0.8)' 
              : '2px solid rgba(255,255,255,0.2)',
            flexShrink: 0,
            background: liveCourseImage 
              ? `url(${liveCourseImage}) center/cover no-repeat` 
              : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)',
            animation: isPlaying ? 'pulse-glow 2s infinite' : 'none'
          }} data-testid="live-course-thumbnail">
            {/* Pas d'icône fallback - juste le fond dégradé si pas d'image */}
          </div>

          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '13px',
            margin: '8px 0',
            flexShrink: 0
          }}>
            {liveParticipants} connecté{liveParticipants !== 1 ? 's' : ''} • Piste {currentTrackIndex + 1}
          </p>

          {/* Indicateur de lecture - bouton stylé */}
          <div style={{
            width: 'clamp(60px, 15vw, 80px)',
            height: 'clamp(60px, 15vw, 80px)',
            borderRadius: '50%',
            background: isPlaying 
              ? 'linear-gradient(135deg, #d91cd2, #8b5cf6)' 
              : 'rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isPlaying ? '0 0 30px rgba(217, 28, 210, 0.7)' : 'none',
            transition: 'all 0.3s',
            flexShrink: 0
          }}>
            <span style={{ fontSize: 'clamp(24px, 6vw, 32px)', color: '#fff' }}>
              {isPlaying ? '♪' : '⏸'}
            </span>
          </div>

          <p style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '11px',
            textAlign: 'center',
            maxWidth: '95%',
            margin: '8px 0 0 0',
            flexShrink: 0
          }}>
            {audioError ? (
              <span style={{ color: '#ef4444' }}>❌ {audioError}</span>
            ) : audioLoadError ? (
              <span style={{ color: '#f59e0b' }}>⚠️ Chargement audio lent</span>
            ) : waitingForCoach ? (
              <span style={{ color: '#22c55e' }}>● En attente du coach...</span>
            ) : isPlaying ? (
              <span style={{ color: '#d91cd2' }}>● Audio en cours</span>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>● En pause</span>
            )}
          </p>

          {/* Audio element avec Web Audio API pour canal Media mobile */}
          <audio
            ref={audioRef}
            src={convertCloudUrlToDirect(playlist[currentTrackIndex])}
            onPlay={() => {
              setIsPlaying(true);
              setAudioError(null);
              setAudioLoadError(false);
              // Annuler le timeout d'erreur si l'audio démarre
              if (audioLoadTimeoutRef.current) {
                clearTimeout(audioLoadTimeoutRef.current);
                audioLoadTimeoutRef.current = null;
              }
              initWebAudio();
            }}
            onPause={() => setIsPlaying(false)}
            onError={(e) => {
              console.error('[Audio] Erreur de lecture:', e);
              setAudioError('Impossible de lire ce fichier audio');
              setIsPlaying(false);
              setAudioLoadError(true);
            }}
            onCanPlay={() => {
              setAudioError(null);
              setAudioLoadError(false);
              // Annuler le timeout si l'audio est prêt
              if (audioLoadTimeoutRef.current) {
                clearTimeout(audioLoadTimeoutRef.current);
                audioLoadTimeoutRef.current = null;
              }
            }}
            onLoadStart={() => {
              console.log('[Audio] Chargement démarré...');
            }}
            preload="auto"
            crossOrigin="anonymous"
          />
        </div>
      </div>
    );
  }

  // ========== AFFICHAGE: Mode Audio Local (Solo) ==========
  const hasPlaylist = selectedCourse?.playlist?.length > 0 && audioFeatureEnabled;
  if (!hasPlaylist) {
    onCloseAudio();
    return <MediaDisplay url={videoUrl} className={className} />;
  }

  const playlist = selectedCourse.playlist;

  // Obtenir l'URL audio convertie
  const currentAudioUrl = convertCloudUrlToDirect(playlist[currentTrackIndex]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handlePrevTrack = () => {
    const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(newIndex);
    if (audioRef.current && isPlaying) {
      audioRef.current.load();
      audioRef.current.play().catch(console.error);
    }
  };

  const handleNextTrack = () => {
    const newIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(newIndex);
    if (audioRef.current && isPlaying) {
      audioRef.current.load();
      audioRef.current.play().catch(console.error);
    }
  };

  const handleClose = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onCloseAudio();
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setAudioVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const handleTrackEnded = () => {
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().catch(console.error);
    }
  };

  return (
    <div className={className} style={containerStyle} data-testid="audio-hero-player">
      {/* Background avec dégradé et effet visuel */}
      <div style={{
        ...contentStyle,
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(217, 28, 210, 0.3) 50%, rgba(0, 0, 0, 0.9) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {/* Bouton fermer (retour à la vidéo) */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '18px',
            transition: 'all 0.2s'
          }}
          data-testid="close-audio-hero"
          title="Revenir à la vidéo"
        >
          ✕
        </button>

        {/* Icône animée */}
        <div style={{
          fontSize: '64px',
          marginBottom: '16px',
          animation: isPlaying ? 'pulse 1.5s infinite' : 'none'
        }}>
          🎧
        </div>

        {/* Titre du cours */}
        <h3 style={{
          color: '#fff',
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '8px',
          textAlign: 'center',
          maxWidth: '90%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {selectedCourse.name}
        </h3>

        <p style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '14px',
          marginBottom: '20px'
        }}>
          Expérience immersive • Piste {currentTrackIndex + 1} / {playlist.length}
        </p>

        {/* Contrôles audio */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px'
        }}>
          {/* Piste précédente */}
          {playlist.length > 1 && (
            <button
              onClick={handlePrevTrack}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff'
              }}
              data-testid="audio-prev-hero"
            >
              ⏮
            </button>
          )}

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            style={{
              background: 'linear-gradient(135deg, #d91cd2, #8b5cf6)',
              border: 'none',
              borderRadius: '50%',
              width: '64px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: isPlaying ? '0 0 30px rgba(217, 28, 210, 0.6)' : '0 4px 20px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.3s',
              transform: isPlaying ? 'scale(1.05)' : 'scale(1)'
            }}
            data-testid="audio-play-pause-hero"
          >
            <span style={{ fontSize: '28px', color: '#fff', marginLeft: isPlaying ? 0 : '4px' }}>
              {isPlaying ? '⏸' : '▶'}
            </span>
          </button>

          {/* Piste suivante */}
          {playlist.length > 1 && (
            <button
              onClick={handleNextTrack}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#fff'
              }}
              data-testid="audio-next-hero"
            >
              ⏭
            </button>
          )}
        </div>

        {/* Contrôle du volume */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '80%',
          maxWidth: '300px'
        }}>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '16px' }}>🔈</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={audioVolume}
            onChange={handleVolumeChange}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              appearance: 'none',
              background: `linear-gradient(to right, #d91cd2 0%, #d91cd2 ${audioVolume * 100}%, rgba(255,255,255,0.2) ${audioVolume * 100}%, rgba(255,255,255,0.2) 100%)`,
              cursor: 'pointer'
            }}
            data-testid="audio-volume-hero"
          />
          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '16px' }}>🔊</span>
        </div>

        {/* Affichage d'erreur audio */}
        {audioError && (
          <div style={{
            marginTop: '12px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            color: '#ef4444',
            fontSize: '12px',
            textAlign: 'center'
          }}>
            ❌ {audioError}
          </div>
        )}

        {/* Élément audio avec conversion URL Cloud */}
        <audio
          ref={audioRef}
          src={currentAudioUrl}
          onEnded={handleTrackEnded}
          onPlay={() => {
            setIsPlaying(true);
            setAudioError(null);
          }}
          onPause={() => setIsPlaying(false)}
          onError={(e) => {
            console.error('[Audio Solo] Erreur:', e);
            setAudioError('Impossible de lire ce fichier audio. Vérifiez le lien.');
            setIsPlaying(false);
          }}
          onCanPlay={() => setAudioError(null)}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  );
};

// Media Display Component (YouTube, Vimeo, Image, Video) - Clean display without dark overlays
// Media Display Component with Discreet Sound Control
const MediaDisplay = ({ url, className }) => {
  const [hasError, setHasError] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Muted par défaut pour garantir l'autoplay et la boucle
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const media = parseMediaUrl(url);
  
  // Placeholder Afroboost par défaut
  const placeholderUrl = "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&h=450&fit=crop";
  
  // Return null if no valid media URL
  if (!media || !url || url.trim() === '') return null;

  // Toggle mute
  const toggleMute = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
    
    // Pour YouTube, recharger l'iframe avec le nouveau paramètre mute
    if (iframeRef.current && media.type === 'youtube') {
      const currentSrc = iframeRef.current.src;
      const newSrc = currentSrc.replace(/mute=[01]/, `mute=${newMuted ? '1' : '0'}`);
      iframeRef.current.src = newSrc;
    }
  };

  // 16:9 container wrapper
  const containerStyle = {
    position: 'relative',
    width: '100%',
    paddingBottom: '56.25%',
    overflow: 'hidden',
    borderRadius: '16px',
    border: '1px solid rgba(217, 28, 210, 0.3)',
    boxShadow: '0 0 30px rgba(217, 28, 210, 0.2)',
    background: '#0a0a0a'
  };

  const contentStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%'
  };

  // Petite icône discrète en bas à droite - VISIBLE quand muted
  const smallMuteStyle = {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    zIndex: 100,
    padding: isMuted ? '8px 16px' : '8px',
    minWidth: isMuted ? 'auto' : '32px',
    height: '32px',
    borderRadius: isMuted ? '16px' : '50%',
    background: isMuted ? 'linear-gradient(135deg, #d91cd2 0%, #8b5cf6 100%)' : 'rgba(0, 0, 0, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    color: '#fff',
    fontSize: '14px',
    opacity: 1,
    transition: 'all 0.2s ease',
    boxShadow: isMuted ? '0 0 15px rgba(217, 28, 210, 0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
    animation: isMuted ? 'pulse 2s infinite' : 'none'
  };

  // Couche transparente COMPLÈTE pour bloquer TOUS les clics vers YouTube
  const fullBlockerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 50,
    cursor: 'default',
    background: 'transparent',
    pointerEvents: 'auto'  // IMPORTANT: Capture tous les clics
  };

  if (hasError) {
    return (
      <div className={className} style={containerStyle} data-testid="media-container-placeholder">
        <img src={placeholderUrl} alt="Afroboost" style={{ ...contentStyle, objectFit: 'cover' }}/>
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.7)',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.8)'
        }}>
          ⚠️ Média non disponible
        </div>
      </div>
    );
  }

  if (media.type === 'youtube') {
    const muteParam = isMuted ? '1' : '0';
    // URL YouTube avec TOUS les paramètres pour masquer les contrôles et empêcher la sortie
    // Note: Les navigateurs bloquent autoplay+son, YouTube affiche son bouton Play
    const youtubeUrl = `https://www.youtube.com/embed/${media.id}?autoplay=1&mute=${muteParam}&loop=1&playlist=${media.id}&playsinline=1&modestbranding=1&rel=0&showinfo=0&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`;
    
    return (
      <div className={className} style={containerStyle} data-testid="media-container-16-9">
        <iframe 
          ref={iframeRef}
          src={youtubeUrl}
          frameBorder="0" 
          allow="autoplay; encrypted-media; accelerometer; gyroscope" 
          style={{ ...contentStyle, pointerEvents: 'none' }}
          title="YouTube video"
          onError={() => setHasError(true)}
        />
        {/* Couche transparente TOTALE pour bloquer tous les clics */}
        <div 
          style={fullBlockerStyle} 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
        {/* Bouton mute discret au-dessus de la couche bloquante */}
        <button 
          onClick={toggleMute}
          onTouchStart={toggleMute}
          style={smallMuteStyle}
          data-testid="mute-btn"
        >
          {isMuted ? '🔇 Son' : '🔊'}
        </button>
      </div>
    );
  }
  
  if (media.type === 'vimeo') {
    const mutedParam = isMuted ? '1' : '0';
    const vimeoUrl = `https://player.vimeo.com/video/${media.id}?autoplay=1&muted=${mutedParam}&loop=1&background=1&playsinline=1&title=0&byline=0&portrait=0`;
    
    return (
      <div className={className} style={containerStyle} data-testid="media-container-16-9">
        <iframe 
          src={vimeoUrl}
          frameBorder="0" 
          allow="autoplay" 
          style={{ ...contentStyle, pointerEvents: 'none' }}
          title="Vimeo video"
          onError={() => setHasError(true)}
        />
        {/* Couche transparente TOTALE pour bloquer tous les clics */}
        <div 
          style={fullBlockerStyle} 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
        {/* Bouton mute */}
        <button 
          onClick={toggleMute}
          onTouchStart={toggleMute}
          style={smallMuteStyle}
          data-testid="mute-btn"
        >
          {isMuted ? '🔇 Son' : '🔊'}
        </button>
      </div>
    );
  }
  
  if (media.type === 'video') {
    return (
      <div className={className} style={containerStyle} data-testid="media-container-16-9">
        <video 
          ref={videoRef}
          src={media.url} 
          autoPlay 
          loop 
          muted={isMuted}
          playsInline 
          style={{ ...contentStyle, objectFit: 'cover' }}
          onError={() => setHasError(true)}
        />
        <button 
          onClick={toggleMute}
          style={smallMuteStyle}
          data-testid="mute-btn"
        >
          {isMuted ? '🔇 Son' : '🔊'}
        </button>
      </div>
    );
  }
  
  // Image type
  return (
    <div className={className} style={containerStyle} data-testid="media-container-16-9">
      <img 
        src={media.url} 
        alt="Media" 
        style={{ ...contentStyle, objectFit: 'cover' }}
        onError={() => setHasError(true)}
      />
    </div>
  );
};

// Info Icon Component
const InfoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

// Close Icon Component
const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// Offer Card - Clean Design with Full Image + Info icon + Discrete dots navigation
const OfferCard = ({ offer, selected, onClick }) => {
  const [showDescription, setShowDescription] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const defaultImage = "https://picsum.photos/seed/default/400/200";
  
  // PRIORITÉ: offer.images[0] > offer.thumbnail > defaultImage
  const images = (offer.images && Array.isArray(offer.images) && offer.images.length > 0) 
    ? offer.images.filter(img => img && typeof img === 'string' && img.trim()) 
    : (offer.thumbnail && typeof offer.thumbnail === 'string' ? [offer.thumbnail] : [defaultImage]);
  
  const currentImage = images[currentImageIndex] || images[0] || defaultImage;
  const hasMultipleImages = images.length > 1;
  
  const toggleDescription = (e) => {
    e.stopPropagation();
    setShowDescription(!showDescription);
  };
  
  return (
    <div onClick={onClick} className={`offer-card rounded-xl overflow-hidden ${selected ? 'selected' : ''}`} data-testid={`offer-card-${offer.id}`}>
      <div style={{ position: 'relative', height: '140px' }}>
        {!showDescription ? (
          <>
            <img 
              src={currentImage} 
              alt={offer.name} 
              className="offer-card-image"
              onError={(e) => { e.target.src = defaultImage; }}
            />
            
            {/* Points discrets cliquables si plusieurs images */}
            {hasMultipleImages && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5" style={{ zIndex: 10 }}>
                {images.map((_, idx) => (
                  <div 
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                    className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${idx === currentImageIndex ? 'bg-pink-500 scale-125' : 'bg-white/40'}`}
                  />
                ))}
              </div>
            )}
            
            {/* Info Icon (i) - Only if description exists */}
            {offer.description && (
              <div 
                className="offer-info-btn"
                onClick={toggleDescription}
                data-testid={`offer-info-${offer.id}`}
                title="Voir la description"
              >
                <InfoIcon />
              </div>
            )}
          </>
        ) : (
          <div 
            className="offer-description-panel"
            data-testid={`offer-description-panel-${offer.id}`}
          >
            <p className="offer-description-text">{offer.description}</p>
            <button 
              className="offer-close-btn"
              onClick={toggleDescription}
              data-testid={`offer-close-${offer.id}`}
              title="Fermer"
            >
              <CloseIcon />
            </button>
          </div>
        )}
      </div>
      <div className="offer-card-content">
        <h3 className="font-semibold text-white text-sm">{offer.name}</h3>
        <span className="font-bold" style={{ color: '#d91cd2', fontSize: '18px' }}>CHF {offer.price}.-</span>
      </div>
    </div>
  );
};

// Offer Card for Horizontal Slider - With LED effect, Loupe, Info icon + Discrete dots
const OfferCardSlider = ({ offer, selected, onClick }) => {
  const [showDescription, setShowDescription] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const defaultImage = "https://picsum.photos/seed/default/400/300";
  
  // PRIORITÉ: offer.images[0] > offer.thumbnail > defaultImage
  const images = (offer.images && Array.isArray(offer.images) && offer.images.length > 0) 
    ? offer.images.filter(img => img && typeof img === 'string' && img.trim()) 
    : (offer.thumbnail && typeof offer.thumbnail === 'string' ? [offer.thumbnail] : [defaultImage]);
  
  const currentImage = images[currentImageIndex] || images[0] || defaultImage;
  const hasMultipleImages = images.length > 1;
  
  const toggleDescription = (e) => {
    e.stopPropagation();
    setShowDescription(!showDescription);
  };
  
  const toggleZoom = (e) => {
    e.stopPropagation();
    setShowZoom(!showZoom);
  };
  
  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  };
  
  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  };
  
  return (
    <>
      {/* Zoom Modal - flèches uniquement dans le zoom */}
      {showZoom && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={toggleZoom}
        >
          <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
            <img 
              src={currentImage} 
              alt={offer.name} 
              className="max-w-full max-h-[80vh] object-contain rounded-xl"
              style={{ boxShadow: '0 0 40px rgba(217, 28, 210, 0.5)' }}
            />
            
            {/* Flèches UNIQUEMENT dans le zoom */}
            {hasMultipleImages && (
              <>
                <button 
                  onClick={prevImage}
                  className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-pink-600 text-xl"
                >
                  ‹
                </button>
                <button 
                  onClick={nextImage}
                  className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-pink-600 text-xl"
                >
                  ›
                </button>
              </>
            )}
            
            <button 
              className="absolute top-2 right-2 w-10 h-10 rounded-full bg-black/50 text-white text-2xl hover:bg-black/80 flex items-center justify-center"
              onClick={toggleZoom}
            >
              ×
            </button>
            <p className="text-center text-white mt-4 text-lg font-semibold">{offer.name}</p>
            
            {hasMultipleImages && (
              <p className="text-center text-pink-400 text-sm mt-2">{currentImageIndex + 1} / {images.length}</p>
            )}
          </div>
        </div>
      )}
      
      <div 
        className="flex-shrink-0 snap-start"
        style={{ width: '300px', minWidth: '300px', padding: '4px' }}
      >
        <div 
          onClick={onClick}
          className={`offer-card-slider rounded-xl overflow-visible cursor-pointer transition-all duration-300`}
          style={{
            boxShadow: selected 
              ? '0 0 0 3px #d91cd2, 0 0 10px rgba(217, 28, 210, 0.4)' 
              : '0 4px 20px rgba(0,0,0,0.4)',
            border: 'none',
            transform: selected ? 'scale(1.02)' : 'scale(1)',
            background: 'linear-gradient(180deg, rgba(20,10,30,0.98) 0%, rgba(5,0,15,0.99) 100%)',
            borderRadius: '16px',
            overflow: 'hidden'
          }}
          data-testid={`offer-card-${offer.id}`}
        >
          {/* Image Section - 250px HEIGHT */}
          <div style={{ position: 'relative', height: '250px', overflow: 'hidden' }}>
            {!showDescription ? (
              <>
                <img 
                  src={currentImage} 
                  alt={offer.name} 
                  className="w-full h-full"
                  style={{ objectFit: 'cover', objectPosition: 'center', height: '250px' }}
                  onError={(e) => { e.target.src = defaultImage; }}
                />
                
                {/* Points discrets cliquables - PAS de flèches */}
                {hasMultipleImages && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5" style={{ zIndex: 15 }}>
                    {images.map((_, idx) => (
                      <div 
                        key={idx} 
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                        className={`w-1.5 h-1.5 rounded-full cursor-pointer transition-all ${idx === currentImageIndex ? 'bg-pink-500 scale-150' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                )}
                
                {/* Zoom Button (Loupe) - Top Left */}
                <div 
                  className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                  style={{ 
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(4px)'
                  }}
                  onClick={toggleZoom}
                  title="Agrandir l'image"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                    <path d="M11 8v6M8 11h6"/>
                  </svg>
                </div>
                
                {/* Info Icon "i" - Top Right */}
                {offer.description && (
                  <div 
                    className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                    style={{ 
                      background: 'rgba(217, 28, 210, 0.85)',
                      boxShadow: '0 0 8px rgba(217, 28, 210, 0.5)'
                    }}
                    onClick={toggleDescription}
                    data-testid={`offer-info-${offer.id}`}
                    title="Voir la description"
                  >
                    <span className="text-white text-sm font-bold">i</span>
                  </div>
                )}
                
                {/* Selected indicator */}
                {selected && (
                  <div 
                    className="absolute bottom-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1"
                    style={{ 
                      background: 'linear-gradient(135deg, #d91cd2 0%, #8b5cf6 100%)', 
                      boxShadow: '0 0 15px rgba(217, 28, 210, 0.7)' 
                    }}
                  >
                    <span>✓</span> Sélectionné
                  </div>
                )}
              </>
            ) : (
              /* Description Panel */
              <div 
                className="w-full h-full flex flex-col justify-center p-4"
                style={{ background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.95) 0%, rgba(217, 28, 210, 0.9) 100%)' }}
              >
                <p className="text-white text-sm leading-relaxed">{offer.description}</p>
                <button 
                  className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 transition-all text-white"
                  onClick={toggleDescription}
                  title="Fermer"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          
          {/* Content Section */}
          <div className="p-4">
            <p className="font-semibold text-white mb-2" style={{ fontSize: '17px' }}>{offer.name}</p>
            <div className="flex items-baseline gap-2">
              <span 
                className="text-2xl font-bold" 
                style={{ 
                  color: '#d91cd2', 
                  textShadow: selected ? '0 0 15px rgba(217, 28, 210, 0.6)' : 'none' 
                }}
              >
                CHF {offer.price}.-
              </span>
              {offer.tva > 0 && (
                <span className="text-xs text-white opacity-50">TVA {offer.tva}%</span>
              )}
            </div>
            {offer.isProduct && offer.shippingCost > 0 && (
              <p className="text-xs text-white opacity-50 mt-1">+ CHF {offer.shippingCost} frais de port</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// OffersSliderAutoPlay est maintenant importé depuis ./components/OffersSlider

// QR Scanner Modal with Camera Support - Enhanced Version
const QRScannerModal = ({ onClose, onValidate, scanResult, scanError, onManualValidation }) => {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [manualMode, setManualMode] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('unknown'); // unknown, granted, denied
  const [initializingCamera, setInitializingCamera] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // Check camera permissions - Enhanced with direct getUserMedia test
  const checkCameraPermission = async () => {
    try {
      // Check if we're on HTTPS (required for camera access)
      const isLocalhost = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' ||
                          window.location.hostname.includes('.local');
      const isSecure = window.location.protocol === 'https:' || isLocalhost;
      
      if (!isSecure) {
        setCameraError("Le scan caméra nécessite une connexion HTTPS sécurisée.");
        setManualMode(true);
        return false;
      }

      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Votre navigateur ne supporte pas l'accès à la caméra.");
        setManualMode(true);
        return false;
      }

      // Try to get permission status via Permissions API first
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' });
          setPermissionStatus(result.state);
          if (result.state === 'denied') {
            setCameraError("L'accès à la caméra a été refusé. Autorisez l'accès dans les paramètres de votre navigateur, puis réessayez.");
            return false;
          }
        } catch (e) {
          // Permission query not supported (e.g., Safari), continue anyway
          console.log("Permissions API not supported, continuing...");
        }
      }
      return true;
    } catch (err) {
      console.error("Permission check error:", err);
      return true; // Try anyway
    }
  };

  // Direct camera test before using html5-qrcode
  const testCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      // Successfully got access, stop the stream immediately
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error("Direct camera test failed:", err);
      return false;
    }
  };

  // Start camera scanning with enhanced error handling
  const startScanning = async () => {
    setCameraError(null);
    setInitializingCamera(true);
    
    // Check permissions first
    const canProceed = await checkCameraPermission();
    if (!canProceed) {
      setInitializingCamera(false);
      return;
    }

    // Direct camera access test
    const cameraWorks = await testCameraAccess();
    if (!cameraWorks) {
      setCameraError("Impossible d'accéder à la caméra. Vérifiez les permissions et réessayez.");
      setInitializingCamera(false);
      return;
    }

    setScanning(true);
    setInitializingCamera(false);
    
    try {
      // Wait for the DOM element to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const readerElement = document.getElementById("qr-reader");
      if (!readerElement) {
        throw new Error("Scanner container not found");
      }

      // IMPORTANT: Stop any previous session first using getState()
      if (html5QrCodeRef.current) {
        try {
          // getState(): 0 = NOT_STARTED, 1 = SCANNING, 2 = PAUSED
          if (html5QrCodeRef.current.getState && html5QrCodeRef.current.getState() !== 0) {
            await html5QrCodeRef.current.stop();
          }
          html5QrCodeRef.current = null;
        } catch (e) {
          console.log("Clearing previous session:", e);
          html5QrCodeRef.current = null;
        }
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;
      
      // Get available cameras
      let cameras = [];
      try {
        cameras = await Html5Qrcode.getCameras();
      } catch (camErr) {
        console.error("Camera enumeration error:", camErr);
        // Fallback: try with facingMode constraint
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0 },
          handleQrCodeSuccess,
          () => {}
        );
        setPermissionStatus('granted');
        return;
      }
      
      if (!cameras || cameras.length === 0) {
        // Try facingMode fallback
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0 },
          handleQrCodeSuccess,
          () => {}
        );
        setPermissionStatus('granted');
        return;
      }
      
      // Prefer back camera on mobile (usually last in list)
      const backCamera = cameras.find(c => c.label?.toLowerCase().includes('back') || c.label?.toLowerCase().includes('arrière'));
      const cameraId = backCamera?.id || (cameras.length > 1 ? cameras[cameras.length - 1].id : cameras[0].id);
      
      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0
        },
        handleQrCodeSuccess,
        () => {} // Ignore scan errors (expected when no QR visible)
      );
      
      setPermissionStatus('granted');
    } catch (err) {
      console.error("Camera error:", err);
      handleCameraError(err);
      setScanning(false);
    }
  };

  // Handle QR code detection
  const handleQrCodeSuccess = (decodedText) => {
    // QR code detected - extract reservation code from URL
    let code = decodedText;
    if (decodedText.includes('/validate/')) {
      code = decodedText.split('/validate/').pop().toUpperCase();
    } else if (decodedText.includes('AFR-')) {
      // Extract AFR-XXXXXX pattern
      const match = decodedText.match(/AFR-[A-Z0-9]+/i);
      if (match) code = match[0].toUpperCase();
    }
    
    // Stop scanning and validate
    stopScanning();
    if (code) {
      onValidate(code);
    }
  };

  // Handle camera errors with user-friendly messages
  const handleCameraError = (err) => {
    const errString = err?.message || err?.toString() || '';
    let errorMessage = "Impossible d'accéder à la caméra.";
    
    if (errString.includes('Permission') || errString.includes('NotAllowed')) {
      errorMessage = "Permission caméra refusée. Autorisez l'accès dans les paramètres de votre navigateur, puis réessayez.";
      setPermissionStatus('denied');
    } else if (errString.includes('NotFound') || errString.includes('détectée') || errString.includes('No video')) {
      errorMessage = "Aucune caméra détectée sur cet appareil.";
    } else if (errString.includes('NotReadable') || errString.includes('already in use') || errString.includes('AbortError')) {
      errorMessage = "La caméra est déjà utilisée. Fermez les autres applications utilisant la caméra et réessayez.";
    } else if (errString.includes('OverconstrainedError')) {
      errorMessage = "Votre caméra ne supporte pas les paramètres requis. Essayez un autre appareil.";
    }
    
    setCameraError(errorMessage);
  };

  // Retry camera access
  const retryCamera = async () => {
    setCameraError(null);
    setManualMode(false);
    // Small delay before retry
    setTimeout(() => startScanning(), 300);
  };

  // Stop camera scanning
  const stopScanning = () => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Handle close
  const handleClose = () => {
    stopScanning();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content glass rounded-xl p-6 max-w-md w-full neon-border" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">📷 Scanner un ticket</h3>
          <button onClick={handleClose} className="text-2xl text-white hover:text-purple-400">×</button>
        </div>
        
        {/* Success Result */}
        {scanResult?.success && (
          <div className="p-4 rounded-lg bg-green-600/30 border border-green-500 mb-4 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="text-5xl">✅</span>
              <div>
                <p className="text-white font-bold text-xl">Ticket validé !</p>
                <p className="text-green-300 text-lg">{scanResult.reservation?.userName}</p>
                <p className="text-green-300 text-sm">{scanResult.reservation?.reservationCode}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error */}
        {scanError && (
          <div className="p-4 rounded-lg bg-red-600/30 border border-red-500 mb-4">
            <p className="text-red-300">❌ {scanError}</p>
          </div>
        )}
        
        {/* Camera Error with Retry Button */}
        {cameraError && (
          <div className="p-4 rounded-lg bg-yellow-600/30 border border-yellow-500 mb-4">
            <p className="text-yellow-300 text-sm mb-3">⚠️ {cameraError}</p>
            <button 
              onClick={retryCamera}
              className="w-full py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-sm flex items-center justify-center gap-2"
            >
              🔄 Réessayer l'accès caméra
            </button>
          </div>
        )}
        
        {/* Camera Scanner */}
        {!scanResult?.success && !manualMode && (
          <div className="mb-4">
            {/* Initializing Camera Indicator */}
            {initializingCamera && (
              <div className="flex flex-col items-center justify-center py-8 mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
                <p className="text-white text-sm">Initialisation de la caméra...</p>
              </div>
            )}
            
            <div 
              id="qr-reader" 
              ref={scannerRef}
              className="rounded-lg overflow-hidden mb-4"
              style={{ 
                width: '300px', 
                height: scanning ? '300px' : '0px',
                minHeight: scanning ? '300px' : '0px',
                background: scanning ? '#000' : 'transparent',
                display: initializingCamera ? 'none' : 'block',
                margin: '0 auto'
              }}
            />
            
            {!scanning && !initializingCamera ? (
              <button 
                onClick={startScanning}
                className="w-full py-4 rounded-lg btn-primary flex items-center justify-center gap-2 text-lg"
                data-testid="start-camera-btn"
              >
                📷 Activer la caméra
              </button>
            ) : (
              <button 
                onClick={stopScanning}
                className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white"
              >
                ⏹ Arrêter le scan
              </button>
            )}
            
            <button 
              onClick={() => { stopScanning(); setManualMode(true); }}
              className="w-full mt-3 py-2 rounded-lg glass text-white text-sm opacity-70 hover:opacity-100"
            >
              ⌨️ Saisie manuelle
            </button>
          </div>
        )}
        
        {/* Manual code input (fallback) */}
        {!scanResult?.success && manualMode && (
          <div>
            <form onSubmit={onManualValidation} className="space-y-4">
              <p className="text-white text-sm opacity-70">Entrez le code de réservation :</p>
              <input 
                type="text" 
                name="code"
                placeholder="AFR-XXXXXX"
                className="w-full px-4 py-3 rounded-lg neon-input uppercase text-center text-xl tracking-widest"
                autoFocus
                data-testid="manual-code-input"
              />
              <button type="submit" className="w-full py-3 rounded-lg btn-primary" data-testid="validate-code-btn">
                ✓ Valider le ticket
              </button>
            </form>
            <button 
              onClick={() => setManualMode(false)}
              className="w-full mt-3 py-2 rounded-lg glass text-white text-sm opacity-70 hover:opacity-100"
            >
              📷 Retour au scan caméra
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// CoachLoginModal is now imported from ./components/CoachLoginModal

// Event Poster Modal (Popup d'accueil)
const EventPosterModal = ({ mediaUrl, onClose }) => {
  const [mediaType, setMediaType] = useState('image');
  
  useEffect(() => {
    if (!mediaUrl) return;
    const url = mediaUrl.toLowerCase();
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
      setMediaType('video');
    } else {
      setMediaType('image');
    }
  }, [mediaUrl]);
  
  // Parse video URL
  const getVideoEmbed = () => {
    if (!mediaUrl) return null;
    
    if (mediaUrl.includes('youtu.be')) {
      const id = mediaUrl.split('/').pop().split('?')[0];
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
    }
    if (mediaUrl.includes('youtube.com')) {
      const urlParams = new URLSearchParams(new URL(mediaUrl).search);
      const id = urlParams.get('v');
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1`;
    }
    if (mediaUrl.includes('vimeo.com')) {
      const id = mediaUrl.split('/').pop();
      return `https://player.vimeo.com/video/${id}?autoplay=1&muted=1`;
    }
    return null;
  };
  
  if (!mediaUrl) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.85)' }}
      onClick={onClose}
    >
      <div 
        className="relative max-w-2xl w-full rounded-xl overflow-hidden"
        style={{ 
          background: 'linear-gradient(180deg, #0a0a0f 0%, #1a0a1f 100%)',
          border: '2px solid rgba(217, 28, 210, 0.5)',
          boxShadow: '0 0 30px rgba(217, 28, 210, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{ 
            background: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
          data-testid="close-event-poster"
        >
          <span className="text-white text-2xl font-light">×</span>
        </button>
        
        {/* Media Content */}
        <div className="w-full">
          {mediaType === 'video' ? (
            <div className="aspect-video">
              <iframe 
                src={getVideoEmbed()}
                className="w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Event poster"
              />
            </div>
          ) : (
            <img 
              src={mediaUrl} 
              alt="Événement Afroboost"
              className="w-full h-auto max-h-[80vh] object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Success Overlay with Image Share Functionality
const SuccessOverlay = ({ t, data, onClose }) => {
  const ticketRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // URL officielle du site
  const AFROBOOST_URL = 'https://afroboost.com';
  
  const handlePrint = () => window.print();
  
  // Generate ticket image using html2canvas
  const generateTicketImage = async () => {
    if (!ticketRef.current) return null;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#1a0a1f',
        scale: 2,
        useCORS: true,
        logging: false
      });
      return canvas;
    } catch (err) {
      console.error('Error generating image:', err);
      return null;
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Download ticket as image
  const handleSaveTicket = async () => {
    const canvas = await generateTicketImage();
    if (canvas) {
      const link = document.createElement('a');
      link.download = `ticket-afroboost-${data.reservationCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };
  
  // Text message for WhatsApp with site URL
  const getShareMessage = () => {
    return `🎧 ${t('reservationConfirmed')}\n\n👤 ${t('name')}: ${data.userName}\n📧 ${t('email')}: ${data.userEmail}\n💰 ${t('offer')}: ${data.offerName}\n💵 ${t('total')}: CHF ${data.totalPrice}\n📅 ${t('courses')}: ${data.courseName}\n🎫 ${t('code')}: ${data.reservationCode}\n\n🔗 ${AFROBOOST_URL}`;
  };
  
  // Share with image - uses Web Share API if available, otherwise fallback
  const handleShareWithImage = async () => {
    const canvas = await generateTicketImage();
    if (!canvas) {
      handleTextShare();
      return;
    }
    
    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        handleTextShare();
        return;
      }
      
      const file = new File([blob], `ticket-afroboost-${data.reservationCode}.png`, { type: 'image/png' });
      const shareData = {
        title: `🎧 ${t('reservationConfirmed')}`,
        text: `${t('reservationCode')}: ${data.reservationCode}\n${AFROBOOST_URL}`,
        files: [file]
      };
      
      // Check if Web Share API with files is supported (mobile mainly)
      if (navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return; // Success, exit
        } catch (err) {
          if (err.name === 'AbortError') return; // User cancelled
        }
      }
      
      // Fallback for PC/browsers without file share support:
      // 1. Save the image
      // 2. Open WhatsApp Web with text + URL
      const link = document.createElement('a');
      link.download = `ticket-afroboost-${data.reservationCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      // Open WhatsApp Web with message including afroboost.com URL
      setTimeout(() => {
        window.open(`https://wa.me/?text=${encodeURIComponent(getShareMessage())}`, '_blank');
      }, 300);
    }, 'image/png');
  };
  
  // NEW: Share on WhatsApp with image + specific text
  const handleShareWhatsApp = async () => {
    const canvas = await generateTicketImage();
    if (!canvas) {
      // Fallback to text-only if image fails
      window.open(`https://wa.me/?text=${encodeURIComponent('Voici ma réservation Afroboost : https://afroboost.com')}`, '_blank');
      return;
    }
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        window.open(`https://wa.me/?text=${encodeURIComponent('Voici ma réservation Afroboost : https://afroboost.com')}`, '_blank');
        return;
      }
      
      const file = new File([blob], `ticket-afroboost-${data.reservationCode}.png`, { type: 'image/png' });
      const shareData = {
        title: 'Ma réservation Afroboost',
        text: 'Voici ma réservation Afroboost : https://afroboost.com',
        files: [file]
      };
      
      // Use Web Share API if available (mobile)
      if (navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
        }
      }
      
      // Fallback for PC: download image + open WhatsApp Web
      const link = document.createElement('a');
      link.download = `ticket-afroboost-${data.reservationCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      setTimeout(() => {
        window.open(`https://wa.me/?text=${encodeURIComponent('Voici ma réservation Afroboost : https://afroboost.com')}`, '_blank');
      }, 300);
    }, 'image/png');
  };
  
  // Text-only share (fallback) - includes afroboost.com URL
  const handleTextShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getShareMessage())}`, '_blank');
  };

  // QR Code contains the validation URL for coach scanning
  const validationUrl = `${window.location.origin}/validate/${data.reservationCode}`;

  return (
    <div className="success-overlay">
      <div className="success-message glass rounded-xl p-6 max-w-md w-full text-center neon-border relative print-proof">
        <button onClick={onClose} className="absolute top-3 right-4 text-2xl text-white" data-testid="close-success">×</button>
        
        {/* Ticket content - captured for image */}
        <div ref={ticketRef} className="ticket-capture-zone" style={{ padding: '16px', background: 'linear-gradient(180deg, #1a0a1f 0%, #0d0510 100%)', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px' }}>🎧</div>
          <p className="font-bold text-white my-2" style={{ fontSize: '20px' }}>{t('reservationConfirmed')}</p>
          
          {/* QR Code for coach validation - contains validation URL */}
          <div className="my-4 p-4 rounded-lg bg-white flex flex-col items-center">
            <QRCodeSVG 
              value={validationUrl} 
              size={150} 
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#000000"
            />
            <p className="text-xs text-gray-600 mt-2">{t('scanToValidate') || 'Scannez pour valider'}</p>
          </div>
          
          <div className="my-3 p-3 rounded-lg bg-white/10 border-2 border-dashed" style={{ borderColor: '#d91cd2' }}>
            <p className="text-xs text-white opacity-60">{t('reservationCode')}:</p>
            <p className="text-2xl font-bold tracking-widest text-white" data-testid="reservation-code">{data.reservationCode}</p>
          </div>
          <div className="text-sm text-left space-y-1 text-white opacity-80">
            <p><strong>{t('name')}:</strong> {data.userName}</p>
            <p><strong>{t('courses')}:</strong> {data.courseName}</p>
            {/* Afficher les variantes si présentes */}
            {data.variantsText && (
              <p><strong>Options:</strong> {data.variantsText}</p>
            )}
            <p><strong>{t('total')}:</strong> CHF {data.totalPrice}{data.quantity > 1 ? ` (x${data.quantity})` : ''}</p>
          </div>
          
          {/* Afroboost branding in ticket */}
          <p className="text-xs text-white/40 mt-4">afroboost.com</p>
        </div>
        
        {/* Action buttons - outside capture zone */}
        <div className="mt-4 space-y-3">
          {/* Primary row: Save + Share WhatsApp side by side */}
          <div className="flex gap-2">
            <button 
              onClick={handleSaveTicket} 
              disabled={isGenerating}
              className="flex-1 p-3 rounded-lg font-semibold text-white transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #d91cd2 0%, #8b5cf6 100%)',
                boxShadow: '0 0 15px rgba(217, 28, 210, 0.4)'
              }}
              data-testid="save-ticket-btn"
            >
              {isGenerating ? t('generatingImage') : t('saveTicket')}
            </button>
            <button 
              onClick={handleShareWhatsApp} 
              disabled={isGenerating}
              className="flex-1 p-3 rounded-lg font-semibold text-white transition-all"
              style={{ 
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                boxShadow: '0 0 15px rgba(37, 211, 102, 0.4)'
              }}
              data-testid="share-whatsapp-btn"
            >
              📤 Partager sur WhatsApp
            </button>
          </div>
          
          {/* Secondary action: Print */}
          <button onClick={handlePrint} className="w-full p-2 glass rounded-lg text-white text-sm">{t('print')}</button>
        </div>
      </div>
    </div>
  );
};

// Confirm Payment Overlay
const ConfirmPaymentOverlay = ({ t, onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal-content glass rounded-xl p-6 max-w-md w-full text-center neon-border">
      <div style={{ fontSize: '48px' }}>💳</div>
      <p className="font-bold text-white my-4" style={{ fontSize: '20px' }}>{t('paymentDone')}</p>
      <p className="mb-6 text-white opacity-80 text-sm">{t('paymentConfirmText')}</p>
      <button onClick={onConfirm} className="w-full btn-primary py-3 rounded-lg font-bold mb-3">{t('confirmPayment')}</button>
      <button onClick={onCancel} className="w-full py-2 glass rounded-lg text-white opacity-60">{t('cancel')}</button>
    </div>
  </div>
);

// Main App
function App() {
  const [lang, setLang] = useState(localStorage.getItem("af_lang") || "fr");
  const [showSplash, setShowSplash] = useState(true);
  const [showCoachLogin, setShowCoachLogin] = useState(false);
  const [coachMode, setCoachMode] = useState(false);
  const [coachUser, setCoachUser] = useState(null); // Utilisateur connecté via Google OAuth
  const [validationCode, setValidationCode] = useState(null); // For /validate/:code URL

  const [courses, setCourses] = useState([]);
  const [offers, setOffers] = useState([]);
  const [users, setUsers] = useState([]);
  const [paymentLinks, setPaymentLinks] = useState({ stripe: "", paypal: "", twint: "", coachWhatsapp: "" });
  const [concept, setConcept] = useState({ appName: "Afroboost", description: "", heroImageUrl: "", logoUrl: "", faviconUrl: "", termsText: "", googleReviewsUrl: "", defaultLandingSection: "sessions", externalLink1Title: "", externalLink1Url: "", externalLink2Title: "", externalLink2Url: "", paymentTwint: false, paymentPaypal: false, paymentCreditCard: false, eventPosterEnabled: false, eventPosterMediaUrl: "" });
  const [showEventPoster, setShowEventPoster] = useState(false);
  const [discountCodes, setDiscountCodes] = useState([]);

  // ========== AUDIO PLAYER STATE ==========
  // isAudioMode: Permute l'affichage entre vidéo héro et lecteur audio intégré
  // showAudioPlayer est remplacé par isAudioMode pour une meilleure UX (même emplacement que la vidéo)
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [audioFeatureEnabled, setAudioFeatureEnabled] = useState(false);

  // Vérifier si le feature flag Audio est activé
  useEffect(() => {
    const checkAudioFeature = async () => {
      try {
        const response = await axios.get(`${API}/feature-flags`);
        const audioEnabled = response.data?.AUDIO_SERVICE_ENABLED || false;
        setAudioFeatureEnabled(audioEnabled);
        console.log(`Audio Service: ${audioEnabled ? 'ENABLED' : 'DISABLED'}`);
      } catch (err) {
        console.log('Audio Service: UNAVAILABLE (feature flags not accessible)');
        setAudioFeatureEnabled(false);
      }
    };
    checkAudioFeature();
  }, []);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]); // MULTI-SELECT: Array de dates sélectionnées
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [quantity, setQuantity] = useState(1); // Quantité pour achats multiples
  const [showTermsModal, setShowTermsModal] = useState(false); // Modal CGV
  const [selectedVariants, setSelectedVariants] = useState({}); // Variantes sélectionnées { size: "M", color: "Noir" }

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userWhatsapp, setUserWhatsapp] = useState("");
  const [shippingAddress, setShippingAddress] = useState(""); // Adresse de livraison pour produits physiques
  const [discountCode, setDiscountCode] = useState("");
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [promoMessage, setPromoMessage] = useState({ type: '', text: '' }); // New: dedicated promo message

  // Toggle une date dans la sélection multiple
  const toggleDateSelection = (date) => {
    setSelectedDates(prev => {
      if (prev.includes(date)) {
        return prev.filter(d => d !== date); // Enlever si déjà sélectionnée
      } else {
        return [...prev, date]; // Ajouter sinon
      }
    });
  };

  const [showSuccess, setShowSuccess] = useState(false);
  const [showConfirmPayment, setShowConfirmPayment] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");
  const [pendingReservation, setPendingReservation] = useState(null);
  const [lastReservation, setLastReservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [appliedDiscount, setAppliedDiscount] = useState(null);

  // Navigation et filtrage
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Indicateur de scroll pour les nouveaux utilisateurs
  const showScrollIndicator = useScrollIndicator();

  // Check for /validate/:code URL on mount
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/validate/')) {
      const code = path.replace('/validate/', '').toUpperCase();
      if (code) {
        setValidationCode(code);
        setShowCoachLogin(true);
      }
    }
  }, []);

  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // PWA Install Prompt State
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const t = useCallback((key) => translations[lang][key] || key, [lang]);

  useEffect(() => { localStorage.setItem("af_lang", lang); }, [lang]);

  // PWA Install Prompt - Capture beforeinstallprompt event
  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    const handleBeforeInstallPrompt = (e) => {
      // Prevent Chrome 67+ from automatically showing the prompt
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e);
      // Check if user hasn't dismissed the banner before
      const dismissed = localStorage.getItem('af_pwa_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    
    if (isStandalone) {
      setShowInstallBanner(false);
    } else if (iOS) {
      // Show banner for iOS with manual instructions
      const dismissed = localStorage.getItem('af_pwa_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle PWA install button click
  const handleInstallClick = async () => {
    if (isIOS) {
      // For iOS, show instructions (can't auto-prompt)
      alert('Pour installer Afroboost sur iOS:\n\n1. Appuyez sur le bouton Partager (📤)\n2. Sélectionnez "Sur l\'écran d\'accueil"\n3. Appuyez sur "Ajouter"');
      return;
    }
    
    if (!installPrompt) return;
    
    // Show the install prompt
    installPrompt.prompt();
    
    // Wait for user response
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installed');
    }
    
    // Clear the prompt
    setInstallPrompt(null);
    setShowInstallBanner(false);
  };

  // Dismiss install banner
  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('af_pwa_dismissed', 'true');
  };

  // MÉMORISATION CLIENT: Load saved client info from localStorage on mount
  useEffect(() => {
    const savedClient = localStorage.getItem("af_client_info");
    if (savedClient) {
      try {
        const client = JSON.parse(savedClient);
        // Pre-fill if data exists
        if (client.name) setUserName(client.name);
        if (client.email) setUserEmail(client.email);
        if (client.whatsapp) setUserWhatsapp(client.whatsapp);
      } catch (e) { console.error("Error loading client info:", e); }
    }
  }, []);

  // MÉMORISATION CLIENT: Auto-fill when email matches saved client
  const handleEmailChange = (email) => {
    setUserEmail(email);
    // Check if email matches a saved client
    const savedClient = localStorage.getItem("af_client_info");
    if (savedClient && email.length > 3) {
      try {
        const client = JSON.parse(savedClient);
        if (client.email && client.email.toLowerCase() === email.toLowerCase()) {
          // Auto-fill name and whatsapp
          if (client.name && !userName) setUserName(client.name);
          if (client.whatsapp && !userWhatsapp) setUserWhatsapp(client.whatsapp);
        }
      } catch (e) { /* ignore */ }
    }
  };

  // MÉMORISATION CLIENT: Save client info after successful reservation
  const saveClientInfo = (name, email, whatsapp) => {
    localStorage.setItem("af_client_info", JSON.stringify({ name, email, whatsapp }));
  };

  // === SYSTÈME DE CACHE OPTIMISÉ ===
  // Cache en mémoire avec TTL pour éviter les re-téléchargements inutiles
  const cacheRef = useRef({
    courses: { data: null, timestamp: 0 },
    offers: { data: null, timestamp: 0 },
    concept: { data: null, timestamp: 0 },
    paymentLinks: { data: null, timestamp: 0 }
  });

  // Vérifier si le cache est valide (TTL: 5 minutes)
  const isCacheValid = useCallback((key) => {
    const cached = cacheRef.current[key];
    const cacheTTL = 5 * 60 * 1000; // 5 minutes
    return cached.data && (Date.now() - cached.timestamp < cacheTTL);
  }, []);

  // Fonction pour charger les données avec cache
  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      // Utiliser le cache si disponible et pas de force refresh
      const cachedCourses = !forceRefresh && isCacheValid('courses') ? cacheRef.current.courses.data : null;
      const cachedOffers = !forceRefresh && isCacheValid('offers') ? cacheRef.current.offers.data : null;
      const cachedConcept = !forceRefresh && isCacheValid('concept') ? cacheRef.current.concept.data : null;
      const cachedLinks = !forceRefresh && isCacheValid('paymentLinks') ? cacheRef.current.paymentLinks.data : null;

      // Construire les requêtes uniquement pour les données non cachées
      const requests = [];
      const requestMap = {};

      if (!cachedCourses) {
        requestMap.courses = requests.length;
        requests.push(axios.get(`${API}/courses`));
      }
      if (!cachedOffers) {
        requestMap.offers = requests.length;
        requests.push(axios.get(`${API}/offers`));
      }
      if (!cachedLinks) {
        requestMap.links = requests.length;
        requests.push(axios.get(`${API}/payment-links`));
      }
      if (!cachedConcept) {
        requestMap.concept = requests.length;
        requests.push(axios.get(`${API}/concept`));
      }

      // Toujours récupérer users et discount codes (données dynamiques)
      requestMap.users = requests.length;
      requests.push(axios.get(`${API}/users`));
      requestMap.codes = requests.length;
      requests.push(axios.get(`${API}/discount-codes`));

      const responses = await Promise.all(requests);

      // Mettre à jour le cache et les états
      const now = Date.now();

      if (cachedCourses) {
        setCourses(cachedCourses);
      } else if (requestMap.courses !== undefined) {
        const coursesData = responses[requestMap.courses].data;
        cacheRef.current.courses = { data: coursesData, timestamp: now };
        setCourses(coursesData);
      }

      if (cachedOffers) {
        setOffers(cachedOffers);
      } else if (requestMap.offers !== undefined) {
        const offersData = responses[requestMap.offers].data;
        cacheRef.current.offers = { data: offersData, timestamp: now };
        setOffers(offersData);
      }

      if (cachedLinks) {
        setPaymentLinks(cachedLinks);
      } else if (requestMap.links !== undefined) {
        const linksData = responses[requestMap.links].data;
        cacheRef.current.paymentLinks = { data: linksData, timestamp: now };
        setPaymentLinks(linksData);
      }

      if (cachedConcept) {
        setConcept(cachedConcept);
      } else if (requestMap.concept !== undefined) {
        const conceptData = responses[requestMap.concept].data;
        cacheRef.current.concept = { data: conceptData, timestamp: now };
        setConcept(conceptData);
      }

      // Données dynamiques (toujours rafraîchies)
      if (requestMap.users !== undefined) {
        setUsers(responses[requestMap.users].data);
      }
      if (requestMap.codes !== undefined) {
        setDiscountCodes(responses[requestMap.codes].data);
      }

      console.log(`📦 Cache: ${cachedCourses ? '✓' : '↓'}courses ${cachedOffers ? '✓' : '↓'}offers ${cachedConcept ? '✓' : '↓'}concept`);

    } catch (err) { console.error("Error:", err); }
  }, [isCacheValid]);

  // Invalider le cache (appelé après modifications dans CoachDashboard)
  const invalidateDataCache = useCallback((key) => {
    if (key) {
      cacheRef.current[key] = { data: null, timestamp: 0 };
    } else {
      // Invalider tout le cache
      Object.keys(cacheRef.current).forEach(k => {
        cacheRef.current[k] = { data: null, timestamp: 0 };
      });
    }
  }, []);

  // Charger les données au démarrage
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Recharger les données quand on sort du Mode Coach (avec force refresh)
  useEffect(() => {
    if (!coachMode) {
      // Invalider le cache quand on sort du mode coach car des modifications ont pu être faites
      invalidateDataCache();
      fetchData(true);
    }
  }, [coachMode, fetchData, invalidateDataCache]);

  // Afficher le popup Affiche Événement si activé
  useEffect(() => {
    // Ne pas afficher si on est en mode Coach ou pendant le splash
    if (coachMode || showSplash || showCoachLogin) return;
    
    // Vérifier si le popup a déjà été fermé dans cette session
    const posterDismissed = sessionStorage.getItem('eventPosterDismissed');
    
    if (concept.eventPosterEnabled && concept.eventPosterMediaUrl && !posterDismissed) {
      // Petit délai pour laisser le temps au site de se charger
      const timer = setTimeout(() => {
        setShowEventPoster(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [concept.eventPosterEnabled, concept.eventPosterMediaUrl, coachMode, showSplash, showCoachLogin]);

  // Fonction pour fermer le popup et mémoriser
  const closeEventPoster = () => {
    setShowEventPoster(false);
    sessionStorage.setItem('eventPosterDismissed', 'true');
  };

  // =====================================================
  // FAVICON & PWA: Fonction centralisée pour mettre à jour le favicon
  // Supprime TOUS les favicons existants avant d'en injecter un seul
  // =====================================================
  
  const updateAllFavicons = useCallback((newFaviconUrl) => {
    if (!newFaviconUrl || newFaviconUrl.trim() === '') return;
    
    // 1. SUPPRIMER tous les liens favicon existants
    const existingIcons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"], link[rel~="icon"]');
    existingIcons.forEach(icon => icon.remove());
    
    // 2. SUPPRIMER tous les apple-touch-icon existants
    const existingAppleIcons = document.querySelectorAll('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]');
    existingAppleIcons.forEach(icon => icon.remove());
    
    // 3. CRÉER un seul nouveau favicon
    const newFavicon = document.createElement('link');
    newFavicon.rel = 'icon';
    newFavicon.type = 'image/png';
    newFavicon.href = newFaviconUrl;
    document.head.appendChild(newFavicon);
    
    // 4. CRÉER un seul apple-touch-icon pour PWA
    const newAppleIcon = document.createElement('link');
    newAppleIcon.rel = 'apple-touch-icon';
    newAppleIcon.href = newFaviconUrl;
    document.head.appendChild(newAppleIcon);
    
    // 5. Mettre à jour le manifest pour PWA
    let manifestLink = document.querySelector("link[rel='manifest']");
    if (manifestLink) {
      const apiUrl = process.env.REACT_APP_BACKEND_URL || '';
      manifestLink.href = `${apiUrl}/api/manifest.json?v=${Date.now()}`;
    }
    
    console.log("✅ Favicon unique mis à jour:", newFaviconUrl);
  }, []);

  // Update favicon when faviconUrl changes (priority)
  useEffect(() => {
    if (concept.faviconUrl && concept.faviconUrl.trim() !== '') {
      updateAllFavicons(concept.faviconUrl);
    }
  }, [concept.faviconUrl, updateAllFavicons]);

  // Update favicon when logoUrl changes (fallback if no faviconUrl)
  useEffect(() => {
    if (concept.logoUrl && concept.logoUrl.trim() !== '' && (!concept.faviconUrl || concept.faviconUrl.trim() === '')) {
      updateAllFavicons(concept.logoUrl);
    }
  }, [concept.logoUrl, concept.faviconUrl, updateAllFavicons]);

  // Scroll vers la section par défaut au chargement (si configuré par le coach)
  useEffect(() => {
    // Ne pas scroller si en mode coach ou pendant le splash
    if (coachMode || showSplash) return;
    
    // Attendre que les données soient chargées et le splash terminé
    if (concept.defaultLandingSection && concept.defaultLandingSection !== 'all' && concept.defaultLandingSection !== 'sessions') {
      // Délai plus long pour s'assurer que tout est prêt
      const timer = setTimeout(() => {
        let sectionId = null;
        if (concept.defaultLandingSection === 'offers' || concept.defaultLandingSection === 'shop') {
          sectionId = 'offers-section';
        }
        
        if (sectionId) {
          const element = document.getElementById(sectionId);
          if (element) {
            console.log(`Auto-scrolling to: ${sectionId}`);
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        
        // Mettre à jour le filtre actif
        setActiveFilter(concept.defaultLandingSection);
      }, 800); // Délai augmenté pour attendre le splash
      return () => clearTimeout(timer);
    }
  }, [concept.defaultLandingSection, coachMode, showSplash]);

  useEffect(() => { const timer = setTimeout(() => setShowSplash(false), 1500); return () => clearTimeout(timer); }, []);

  // LOGIQUE CODE PROMO: Validation en temps réel - Case Insensitive avec trim
  useEffect(() => {
    const validateCode = async () => {
      // Normalize input: trim spaces
      const normalizedCode = discountCode?.trim() || '';
      
      // Reset if no code entered
      if (!normalizedCode) { 
        setAppliedDiscount(null); 
        setPromoMessage({ type: '', text: '' });
        return; 
      }
      
      // Need to select a course first
      if (!selectedCourse) { 
        setAppliedDiscount(null);
        setPromoMessage({ type: 'warning', text: '⚠️ Sélectionnez d\'abord un cours' });
        return; 
      }
      
      try {
        // Send normalized code to backend (backend will also normalize)
        const res = await axios.post(`${API}/discount-codes/validate`, { 
          code: normalizedCode,
          email: userEmail?.trim() || '', 
          courseId: selectedCourse.id 
        });
        
        if (res.data.valid) { 
          const code = res.data.code;
          setAppliedDiscount(code);
          
          // Calculate the actual discount amount for display
          let discountAmount = 0;
          let discountText = '';
          
          if (code.type === '100%' || (code.type === '%' && parseFloat(code.value) >= 100)) {
            discountAmount = selectedOffer ? selectedOffer.price : 0;
            discountText = `Code validé : -${discountAmount.toFixed(2)} CHF (GRATUIT)`;
          } else if (code.type === '%') {
            discountAmount = selectedOffer ? (selectedOffer.price * parseFloat(code.value) / 100) : 0;
            discountText = `Code validé : -${discountAmount.toFixed(2)} CHF (-${code.value}%)`;
          } else if (code.type === 'CHF') {
            discountAmount = parseFloat(code.value);
            discountText = `Code validé : -${discountAmount.toFixed(2)} CHF`;
          }
          
          setPromoMessage({ type: 'success', text: `✅ ${discountText}` });
        } else { 
          setAppliedDiscount(null);
          // Display specific error message from backend
          const errorMsg = res.data.message || 'Code inconnu ou non applicable à ce cours';
          setPromoMessage({ type: 'error', text: `❌ ${errorMsg}` });
        }
      } catch (err) { 
        console.error("Promo validation error:", err);
        setAppliedDiscount(null); 
        setPromoMessage({ type: 'error', text: '❌ Code inconnu ou non applicable à ce cours' });
      }
    };
    
    // Debounce to avoid too many API calls
    const debounce = setTimeout(validateCode, 400);
    return () => clearTimeout(debounce);
  }, [discountCode, selectedCourse, selectedOffer, userEmail]);

  // Secret coach access: 3 rapid clicks
  const handleCopyrightClick = () => {
    const now = Date.now();
    if (now - lastClickTime < 500) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 3) { setShowCoachLogin(true); setClickCount(0); }
    } else { setClickCount(1); }
    setLastClickTime(now);
  };

  const isDiscountFree = (code) => code && (code.type === "100%" || (code.type === "%" && parseFloat(code.value) >= 100));

  const calculateTotal = () => {
    if (!selectedOffer) return 0;
    // Pour les produits physiques: utiliser quantity
    // Pour les services/cours: utiliser le nombre de dates sélectionnées
    const isPhysicalProduct = selectedOffer?.isProduct || selectedOffer?.isPhysicalProduct;
    const multiplier = isPhysicalProduct ? quantity : Math.max(1, selectedDates.length);
    let total = selectedOffer.price * multiplier;
    if (appliedDiscount) {
      if (appliedDiscount.type === "100%" || (appliedDiscount.type === "%" && parseFloat(appliedDiscount.value) >= 100)) total = 0;
      else if (appliedDiscount.type === "%") total = total * (1 - parseFloat(appliedDiscount.value) / 100);
      else if (appliedDiscount.type === "CHF") total = Math.max(0, total - parseFloat(appliedDiscount.value));
    }
    return total.toFixed(2);
  };

  const resetForm = () => {
    setPendingReservation(null); setSelectedCourse(null); setSelectedDates([]);
    setSelectedOffer(null); setSelectedSession(null); setUserName(""); 
    setUserEmail(""); setUserWhatsapp(""); setDiscountCode(""); 
    setHasAcceptedTerms(false); setAppliedDiscount(null); setPromoMessage({ type: '', text: '' });
    setQuantity(1); // Reset quantité
  };

  // Reset form but keep client info (for repeat purchases)
  const resetFormKeepClient = () => {
    setPendingReservation(null); setSelectedCourse(null); setSelectedDates([]);
    setSelectedOffer(null); setSelectedSession(null); setDiscountCode(""); 
    setHasAcceptedTerms(false); setAppliedDiscount(null); setPromoMessage({ type: '', text: '' });
    setQuantity(1); setShippingAddress(""); // Reset quantité et adresse
    // Keep userName, userEmail, userWhatsapp for convenience
  };

  // Sélection d'offre avec smooth scroll vers le formulaire "Vos informations"
  const handleSelectOffer = (offer) => {
    setSelectedOffer(offer);
    // Réinitialiser les variantes quand une nouvelle offre est sélectionnée
    setSelectedVariants({});
    
    // Smooth scroll vers la section "Vos informations" après un court délai
    // pour laisser le temps au DOM de se mettre à jour
    setTimeout(() => {
      const formSection = document.getElementById('user-info-section');
      if (formSection) {
        formSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        });
      }
    }, 150);
  };

  const sendWhatsAppNotification = (reservation, isCoach) => {
    const phone = isCoach ? paymentLinks.coachWhatsapp : reservation.userWhatsapp;
    if (!phone?.trim()) return;
    const dateStr = new Date(reservation.datetime).toLocaleDateString('fr-CH');
    const msg = `🎧 ${isCoach ? 'Nouvelle réservation' : 'Confirmation'} Afroboost\n\n👤 ${reservation.userName}\n📧 ${reservation.userEmail}\n💰 ${reservation.offerName} - CHF ${reservation.totalPrice}\n📅 ${reservation.courseName} - ${dateStr}\n🎫 ${reservation.reservationCode}`;
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Notification automatique au coach (email + WhatsApp via API)
  const notifyCoachAutomatic = async (reservation) => {
    try {
      // Appeler l'endpoint backend pour obtenir les configs de notification
      const dateStr = new Date(reservation.datetime).toLocaleDateString('fr-CH', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      
      const notifyResponse = await axios.post(`${API}/notify-coach`, {
        clientName: reservation.userName,
        clientEmail: reservation.userEmail,
        clientWhatsapp: reservation.userWhatsapp,
        offerName: reservation.offerName,
        courseName: reservation.courseName,
        sessionDate: dateStr,
        amount: reservation.totalPrice,
        reservationCode: reservation.reservationCode
      });

      if (!notifyResponse.data.success) {
        console.log("Coach notification not configured:", notifyResponse.data.message);
        return;
      }

      const { coachEmail, coachPhone, message, subject } = notifyResponse.data;

      // Envoyer notification email si configuré et EmailJS est actif
      if (coachEmail && isEmailJSConfigured()) {
        try {
          await sendEmail({
            to_email: coachEmail,
            to_name: "Coach Afroboost",
            subject: subject,
            message: message
          });
          console.log("✅ Email notification sent to coach");
        } catch (emailErr) {
          console.error("Email notification failed:", emailErr);
        }
      }

      // Envoyer notification WhatsApp si configuré et Twilio est actif
      if (coachPhone && isWhatsAppConfigured()) {
        try {
          await sendWhatsAppMessage({
            to: coachPhone,
            message: message,
            contactName: "Coach"
          });
          console.log("✅ WhatsApp notification sent to coach");
        } catch (waErr) {
          console.error("WhatsApp notification failed:", waErr);
        }
      }
    } catch (err) {
      console.error("Coach notification error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Pour les produits physiques, pas besoin de cours/dates
    const isPhysicalProduct = selectedOffer?.isProduct || selectedOffer?.isPhysicalProduct;
    if (!isPhysicalProduct && (!selectedCourse || selectedDates.length === 0)) return;
    if (!selectedOffer || !hasAcceptedTerms) return;

    // Direct validation - private fields only
    if (!userEmail?.trim() || !userWhatsapp?.trim()) {
      setValidationMessage(t('emailWhatsappRequired'));
      setTimeout(() => setValidationMessage(""), 4000);
      return;
    }
    
    // Validation des variantes si le produit en a
    if (selectedOffer?.variants && Object.keys(selectedOffer.variants).length > 0) {
      const missingVariants = [];
      if (selectedOffer.variants.sizes?.length > 0 && !selectedVariants.size) {
        missingVariants.push('taille');
      }
      if (selectedOffer.variants.colors?.length > 0 && !selectedVariants.color) {
        missingVariants.push('couleur');
      }
      if (selectedOffer.variants.weights?.length > 0 && !selectedVariants.weight) {
        missingVariants.push('poids');
      }
      
      if (missingVariants.length > 0) {
        setValidationMessage(`Veuillez sélectionner: ${missingVariants.join(', ')}`);
        setTimeout(() => setValidationMessage(""), 4000);
        return;
      }
    }

    // Calcul de la date pour les services (cours) - utilise la première date sélectionnée
    let dt = new Date();
    const selectedDate = selectedDates[0]; // Première date pour la réservation principale
    if (selectedCourse && selectedDate) {
      const [h, m] = selectedCourse.time.split(':');
      dt = new Date(selectedDate);
      dt.setHours(parseInt(h), parseInt(m), 0, 0);
    }
    
    // Nombre de dates sélectionnées (pour le calcul du prix)
    const dateCount = selectedDates.length || 1;

    const totalPrice = parseFloat(calculateTotal());
    
    // Formatter les variantes sélectionnées pour l'affichage
    const variantsText = Object.entries(selectedVariants)
      .filter(([_, v]) => v)
      .map(([k, v]) => `${k === 'size' ? 'Taille' : k === 'color' ? 'Couleur' : 'Poids'}: ${v}`)
      .join(', ');
    
    // Formatter les dates sélectionnées
    const selectedDatesText = selectedDates.map(d => new Date(d).toLocaleDateString('fr-FR')).join(', ');

    const reservation = {
      userId: `user-${Date.now()}`,
      userName: userName,
      userEmail: userEmail, 
      userWhatsapp: userWhatsapp,
      shippingAddress: isPhysicalProduct ? shippingAddress : null, // Adresse si produit physique
      selectedVariants: Object.keys(selectedVariants).length > 0 ? selectedVariants : null, // Variantes choisies
      variantsText: variantsText || null, // Texte formaté des variantes
      selectedDates: selectedDates, // Toutes les dates sélectionnées
      selectedDatesText: selectedDatesText || null, // Texte formaté des dates
      courseId: selectedCourse?.id || 'N/A', 
      courseName: selectedCourse?.name || 'Produit physique',
      courseTime: selectedCourse?.time || '', 
      datetime: dt.toISOString(),
      offerId: selectedOffer.id, 
      offerName: selectedOffer.name,
      price: selectedOffer.price, 
      quantity: dateCount, // Nombre de dates sélectionnées comme quantité
      totalPrice,
      discountCode: appliedDiscount?.code || null,
      discountType: appliedDiscount?.type || null,
      discountValue: appliedDiscount?.value || null,
      appliedDiscount,
      isProduct: isPhysicalProduct
    };

    // DYNAMISME DU BOUTON: Si total = 0 (100% gratuit), réservation directe sans paiement
    if (totalPrice === 0) {
      setLoading(true);
      try {
        // Create user
        try { await axios.post(`${API}/users`, { name: userName, email: userEmail, whatsapp: userWhatsapp }); }
        catch (err) { console.error("User creation error:", err); }
        
        // Create reservation directly (no payment needed)
        const res = await axios.post(`${API}/reservations`, reservation);
        
        // Mark discount code as used
        if (appliedDiscount) {
          await axios.post(`${API}/discount-codes/${appliedDiscount.id}/use`);
        }
        
        // MÉMORISATION CLIENT: Save client info for next visit
        saveClientInfo(userName, userEmail, userWhatsapp);
        
        setLastReservation(res.data);
        sendWhatsAppNotification(res.data, true);
        sendWhatsAppNotification(res.data, false);
        
        // NOTIFICATION AUTOMATIQUE AU COACH (email + WhatsApp API)
        notifyCoachAutomatic(res.data);
        
        setShowSuccess(true);
        resetFormKeepClient();
      } catch (err) { console.error(err); }
      setLoading(false);
      return;
    }

    // PAID RESERVATION: Check if payment is configured
    if (!paymentLinks.stripe?.trim() && !paymentLinks.paypal?.trim() && !paymentLinks.twint?.trim()) {
      setValidationMessage(t('noPaymentConfigured'));
      setTimeout(() => setValidationMessage(""), 4000);
      return;
    }

    setPendingReservation(reservation);
    
    // Create user
    try { await axios.post(`${API}/users`, { name: userName, email: userEmail, whatsapp: userWhatsapp }); }
    catch (err) { console.error("User creation error:", err); }

    // Open payment link
    if (paymentLinks.twint?.trim()) window.open(paymentLinks.twint, '_blank');
    else if (paymentLinks.stripe?.trim()) window.open(paymentLinks.stripe, '_blank');
    else if (paymentLinks.paypal?.trim()) window.open(paymentLinks.paypal, '_blank');

    setTimeout(() => setShowConfirmPayment(true), 800);
  };

  const confirmPayment = async () => {
    if (!pendingReservation) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/reservations`, pendingReservation);
      if (pendingReservation.appliedDiscount) await axios.post(`${API}/discount-codes/${pendingReservation.appliedDiscount.id}/use`);
      
      // MÉMORISATION CLIENT: Save client info after successful payment
      saveClientInfo(pendingReservation.userName, pendingReservation.userEmail, pendingReservation.userWhatsapp);
      
      setLastReservation(res.data);
      sendWhatsAppNotification(res.data, true);
      sendWhatsAppNotification(res.data, false);
      
      // NOTIFICATION AUTOMATIQUE AU COACH (email + WhatsApp API)
      notifyCoachAutomatic(res.data);
      
      setShowSuccess(true);
      setShowConfirmPayment(false);
      resetFormKeepClient();
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const renderDates = (course) => {
    const dates = getNextOccurrences(course.weekday);
    const hasPlaylist = course.playlist && course.playlist.length > 0 && audioFeatureEnabled;
    
    return (
      <div className="grid grid-cols-2 gap-2 mt-3">
        {dates.map((date, idx) => {
          const dateISO = date.toISOString();
          const isSelected = selectedCourse?.id === course.id && selectedDates.includes(dateISO);
          return (
            <button key={idx} type="button"
              onClick={() => { 
                // Sélectionner le cours si différent
                if (selectedCourse?.id !== course.id) {
                  setSelectedCourse(course);
                  setSelectedDates([dateISO]); // Reset et ajouter la première date
                } else {
                  // Toggle la date (ajouter/retirer)
                  toggleDateSelection(dateISO);
                }
              }}
              className={`session-btn px-3 py-2 rounded-lg text-sm font-medium ${isSelected ? 'selected' : ''}`}
              style={{ color: 'white', position: 'relative' }} data-testid={`date-btn-${course.id}-${idx}`}>
              <span className="flex items-center justify-center gap-2">
                {formatDate(date, course.time, lang)} {isSelected && '✔'}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  // Fonction de déconnexion Google OAuth
  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (err) {
      console.error('Erreur déconnexion:', err);
    }
    setCoachMode(false);
    setCoachUser(null);
  };

  // Fonction de connexion Google OAuth
  const handleGoogleLogin = (userData) => {
    setCoachUser(userData);
    setCoachMode(true);
    setShowCoachLogin(false);
  };

  if (showSplash) return <SplashScreen logoUrl={concept.logoUrl} />;
  if (showCoachLogin) return <CoachLoginModal t={t} onLogin={handleGoogleLogin} onCancel={() => setShowCoachLogin(false)} />;
  if (coachMode) return <CoachDashboard t={t} lang={lang} onBack={() => setCoachMode(false)} onLogout={handleLogout} coachUser={coachUser} />;

  // Filtrer les offres et cours selon visibilité, filtre actif et recherche
  // =====================================================
  // SÉPARATION TOTALE : PRODUITS vs COURS/SESSIONS
  // Les produits physiques sont COMPLÈTEMENT INDÉPENDANTS des cours
  // =====================================================
  // FILTRAGE PAR VISIBILITÉ - Une offre invisible NE DOIT JAMAIS apparaître
  // Utilise 'visible !== false' pour inclure les offres sans champ visible défini
  // =====================================================
  
  // 1. PRODUITS PHYSIQUES (isProduct: true) - Filtrés par visibilité
  const visibleProducts = offers.filter(o => 
    o.isProduct === true && o.visible !== false
  );
  
  // 2. OFFRES/SERVICES (isProduct: false ou undefined) - Filtrés par visibilité
  const visibleServices = offers.filter(o => 
    !o.isProduct && o.visible !== false
  );
  
  // 3. COURS avec leur propre visibilité (exclure les archivés et invisibles)
  const baseCourses = courses.filter(c => c.visible !== false && c.archived !== true);
  
  // Fonction de recherche floue (fuzzy search)
  const fuzzyMatch = (text, query) => {
    if (!text || !query) return false;
    const normalizedText = text.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "");
    const normalizedQuery = query.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "");
    
    if (normalizedText.includes(normalizedQuery)) return true;
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
    return queryWords.every(word => normalizedText.includes(word));
  };
  
  // Synonymes courants pour la recherche
  const synonyms = {
    'session': ['séance', 'cours', 'class'],
    'seance': ['session', 'cours', 'class'],
    'abonnement': ['abo', 'forfait', 'pack'],
    'abo': ['abonnement', 'forfait', 'pack'],
    'cardio': ['fitness', 'sport', 'entrainement'],
    'afrobeat': ['afro', 'danse', 'dance'],
    'produit': ['article', 'shop', 'boutique'],
    'tshirt': ['t-shirt', 'tee', 'haut'],
    't-shirt': ['tshirt', 'tee', 'haut']
  };
  
  const searchWithSynonyms = (text, query) => {
    if (fuzzyMatch(text, query)) return true;
    const queryNorm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const [key, values] of Object.entries(synonyms)) {
      if (queryNorm.includes(key)) {
        for (const syn of values) {
          if (fuzzyMatch(text, query.replace(new RegExp(key, 'gi'), syn))) return true;
        }
      }
    }
    return false;
  };
  
  // =====================================================
  // FILTRAGE SÉPARÉ : Sessions/Offres vs Produits vs Cours
  // =====================================================
  
  // Filtrer les SERVICES (sessions, abonnements) selon la recherche
  let filteredServices = visibleServices;
  if (searchQuery.trim()) {
    const query = searchQuery.trim();
    filteredServices = visibleServices.filter(offer => 
      searchWithSynonyms(offer.name || '', query) ||
      searchWithSynonyms(offer.description || '', query) ||
      searchWithSynonyms(offer.keywords || '', query)
    );
  }
  
  // Filtrer les PRODUITS selon la recherche
  let filteredProducts = visibleProducts;
  if (searchQuery.trim()) {
    const query = searchQuery.trim();
    filteredProducts = visibleProducts.filter(product => 
      searchWithSynonyms(product.name || '', query) ||
      searchWithSynonyms(product.description || '', query) ||
      searchWithSynonyms(product.keywords || '', query)
    );
  }
  
  // Filtrer les COURS selon la recherche
  let visibleCourses = baseCourses;
  if (activeFilter === 'shop') {
    visibleCourses = []; // Masquer les cours sur la page Shop
  } else if (searchQuery.trim()) {
    const query = searchQuery.trim();
    visibleCourses = baseCourses.filter(course => 
      searchWithSynonyms(course.name || '', query) ||
      searchWithSynonyms(course.locationName || '', query)
    );
  }
  
  // =====================================================
  // VARIABLE COMBINÉE pour l'affichage selon le filtre actif
  // =====================================================
  let visibleOffers;
  if (activeFilter === 'shop') {
    visibleOffers = filteredProducts; // Uniquement produits
  } else if (activeFilter === 'sessions' || activeFilter === 'offers') {
    visibleOffers = filteredServices; // Uniquement services
  } else {
    visibleOffers = [...filteredServices, ...filteredProducts]; // Tout
  }
  
  const totalPrice = calculateTotal();

  return (
    <div className="w-full min-h-screen p-6 relative section-gradient" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <LanguageSelector lang={lang} setLang={setLang} />

      {/* Event Poster Modal (Popup d'accueil) */}
      {showEventPoster && concept.eventPosterMediaUrl && (
        <EventPosterModal 
          mediaUrl={concept.eventPosterMediaUrl} 
          onClose={closeEventPoster} 
        />
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div 
          className="fixed top-0 left-0 right-0 z-50 px-4 py-3"
          style={{ 
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(217, 28, 210, 0.95) 100%)',
            boxShadow: '0 4px 20px rgba(217, 28, 210, 0.4)'
          }}
          data-testid="pwa-install-banner"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isIOS ? '📤' : '📲'}</span>
              <div>
                <p className="text-white font-semibold text-sm">Installer Afroboost</p>
                <p className="text-white text-xs opacity-80">
                  {isIOS ? 'Appuyez sur Partager puis "Sur l\'écran d\'accueil"' : 'Accès rapide depuis votre écran d\'accueil'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleInstallClick}
                className="px-4 py-2 rounded-full text-sm font-semibold"
                style={{ background: '#000', color: '#fff' }}
                data-testid="pwa-install-btn"
              >
                {isIOS ? 'Comment ?' : 'Installer'}
              </button>
              <button 
                onClick={dismissInstallBanner}
                className="p-2 text-white opacity-70 hover:opacity-100"
                data-testid="pwa-dismiss-btn"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmPayment && <ConfirmPaymentOverlay t={t} onConfirm={confirmPayment} onCancel={() => { setShowConfirmPayment(false); setPendingReservation(null); }} />}
      {showSuccess && lastReservation && <SuccessOverlay t={t} data={lastReservation} onClose={() => setShowSuccess(false)} />}

      <div className="max-w-4xl mx-auto pt-12">
        <div className="text-center mb-8">
          {/* Titre dynamique - utilise appName du concept ou la traduction par défaut */}
          <h1 className="font-bold mb-2 text-white" style={{ 
            fontSize: '44px', 
            textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 30px rgba(217, 28, 210, 0.4)' 
          }} data-testid="app-title">{concept.appName || t('appTitle')}</h1>
          <p className="max-w-2xl mx-auto text-white" style={{ 
            fontSize: '15px', 
            textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.5)',
            lineHeight: '1.6'
          }}>{concept.description || t('conceptDefault')}</p>
        </div>

        {/* Hero Media - YouTube, Vimeo, Image, Video - avec permutation Audio */}
        {/* Utilise HeroMediaWithAudio pour basculer entre vidéo et lecteur audio */}
        {concept.heroImageUrl && concept.heroImageUrl.trim() !== '' && (
          <HeroMediaWithAudio 
            videoUrl={concept.heroImageUrl}
            isAudioMode={isAudioMode}
            selectedCourse={selectedCourse}
            audioFeatureEnabled={audioFeatureEnabled}
            onCloseAudio={() => setIsAudioMode(false)}
            className="hero-media-container mb-8"
          />
        )}

        {/* Barre de Recherche + Navigation par onglets (Tout, Cours, Shop) */}
        <NavigationBar 
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showSearch={true}
          showFilters={true}
        />

        {/* Message si aucun résultat */}
        {filteredServices.length === 0 && filteredProducts.length === 0 && visibleCourses.length === 0 && searchQuery.trim() && (
          <div className="text-center py-8 mb-8 rounded-xl" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
            <p className="text-white opacity-70">🔍 Aucun résultat pour "{searchQuery}"</p>
            <button 
              onClick={() => { setSearchQuery(''); setActiveFilter('all'); }}
              className="mt-3 px-4 py-2 rounded-lg text-sm"
              style={{ background: 'rgba(217, 28, 210, 0.3)', color: '#fff' }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {/* Section Sessions - Masquée si filtre Shop actif */}
        {activeFilter !== 'shop' && visibleCourses.length > 0 && (
          <div id="sessions-section" className="mb-8">
            <h2 className="font-semibold mb-4 text-white" style={{ fontSize: '18px' }}>{t('chooseSession')}</h2>
            {/* Container avec scroll pour mobile - scrollbar rose fine 4px */}
            <div 
              className="space-y-4 sessions-scrollbar" 
              style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}
            >
              {visibleCourses.map(course => (
                <div key={course.id} className={`course-card rounded-xl p-5 ${selectedCourse?.id === course.id ? 'selected' : ''}`} data-testid={`course-card-${course.id}`}>
                  <h3 className="font-semibold text-white">{course.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-white opacity-60 mb-1">
                    <LocationIcon />
                    <span>{course.locationName}</span>
                    {course.mapsUrl && (
                      <a href={course.mapsUrl} target="_blank" rel="noopener noreferrer" className="ml-2 flex items-center gap-1" style={{ color: '#8b5cf6' }}
                        onClick={(e) => e.stopPropagation()}>
                        <LocationIcon /> Maps
                      </a>
                    )}
                  </div>
                  {renderDates(course)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================
            SECTION OFFRES/SERVICES - Affichée si cours + dates sélectionnées
            ===================================================== */}
        {selectedCourse && selectedDates.length > 0 && filteredServices.length > 0 && (
          <div id="offers-section" className="mb-8">
            <h2 className="font-semibold mb-2 text-white" style={{ fontSize: '18px' }}>{t('chooseOffer')}</h2>
            
            <p className="text-sm mb-4" style={{ color: '#d91cd2' }}>
              👉 Sélectionnez une offre pour continuer
            </p>
            
            <OffersSliderAutoPlay 
              offers={filteredServices}
              selectedOffer={selectedOffer}
              onSelectOffer={handleSelectOffer}
            />
          </div>
        )}

        {/* =====================================================
            LECTEUR AUDIO - Maintenant intégré dans la section héro (MediaDisplay)
            Le lecteur flottant a été supprimé pour une meilleure UX mobile
            ===================================================== */}

        {/* =====================================================
            SECTION PRODUITS PHYSIQUES - TOUJOURS VISIBLE si produits disponibles
            Complètement indépendante des cours
            ===================================================== */}
        {filteredProducts.length > 0 && (activeFilter === 'shop' || activeFilter === 'all') && (
          <div id="products-section" className="mb-8" style={{ paddingTop: '10px' }}>
            <h2 className="font-semibold mb-2 text-white" style={{ fontSize: '18px' }}>
              🛒 {t('shop') || 'Boutique'}
            </h2>
            
            {/* Texte blanc pur et police fine */}
            <p className="text-sm mb-4" style={{ color: '#ffffff', fontWeight: '300', letterSpacing: '0.3px' }}>
              Nos produits physiques - livraison disponible
            </p>
            
            <OffersSliderAutoPlay 
              offers={filteredProducts}
              selectedOffer={selectedOffer}
              onSelectOffer={(product) => {
                // Pour les produits, pas besoin de cours/dates
                setSelectedCourse(null);
                setSelectedDates([]);
                handleSelectOffer(product);
              }}
            />
          </div>
        )}

        {/* Bouton Voir les avis Google - affiché si configuré par le coach */}
        {selectedOffer && concept.googleReviewsUrl && (
          <div className="mb-6 flex justify-center">
            <a 
              href={concept.googleReviewsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 hover:scale-105"
              style={{
                background: 'transparent',
                border: '2px solid rgba(217, 28, 210, 0.7)',
                boxShadow: '0 0 15px rgba(217, 28, 210, 0.4), inset 0 0 10px rgba(139, 92, 246, 0.1)',
                color: '#fff'
              }}
              data-testid="google-reviews-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span className="font-medium">Voir les avis</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </a>
          </div>
        )}

        {selectedOffer && (
          <form onSubmit={handleSubmit}>
            <div id="user-info-section" className="form-section rounded-xl p-6 mb-6" data-testid="user-info-section">
              <h2 className="font-semibold mb-4 text-white" style={{ fontSize: '18px' }}>{t('yourInfo')}</h2>
              <div className="space-y-4">
                {/* Private input fields with auto-fill support */}
                <input type="text" required placeholder={t('fullName')} value={userName} onChange={e => setUserName(e.target.value)} className="w-full p-3 rounded-lg neon-input" data-testid="user-name-input" autoComplete="name" />
                <input type="email" required placeholder={t('emailRequired')} value={userEmail} onChange={e => handleEmailChange(e.target.value)} className="w-full p-3 rounded-lg neon-input" data-testid="user-email-input" autoComplete="email" />
                <input type="tel" required placeholder={t('whatsappRequired')} value={userWhatsapp} onChange={e => setUserWhatsapp(e.target.value)} className="w-full p-3 rounded-lg neon-input" data-testid="user-whatsapp-input" autoComplete="tel" />
                
                {/* Champ Adresse - Affiché uniquement pour les produits physiques */}
                {(selectedOffer?.isProduct || selectedOffer?.isPhysicalProduct) && (
                  <div className="border border-purple-500/30 rounded-lg p-3 bg-purple-900/20">
                    <p className="text-xs text-purple-400 mb-2">📦 Produit physique - Adresse de livraison requise</p>
                    <input 
                      type="text" 
                      required 
                      placeholder="Adresse complète (rue, numéro, code postal, ville)" 
                      value={shippingAddress} 
                      onChange={e => setShippingAddress(e.target.value)} 
                      className="w-full p-3 rounded-lg neon-input" 
                      data-testid="shipping-address-input" 
                      autoComplete="street-address" 
                    />
                  </div>
                )}
                
                {/* Sélecteur de variantes interactif - Affiché si le produit a des variantes */}
                {selectedOffer?.variants && Object.keys(selectedOffer.variants).length > 0 && (
                  <div className="border border-pink-500/30 rounded-lg p-4 bg-pink-900/10" data-testid="variants-selector">
                    <p className="text-xs text-pink-400 mb-3 font-medium">🎨 Sélectionnez vos options</p>
                    
                    {/* Tailles */}
                    {selectedOffer.variants.sizes && selectedOffer.variants.sizes.length > 0 && (
                      <div className="mb-4">
                        <p className="variant-label">Taille</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedOffer.variants.sizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setSelectedVariants(prev => ({ ...prev, size }))}
                              className={`variant-chip ${selectedVariants.size === size ? 'selected' : ''}`}
                              data-testid={`variant-size-${size}`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>
                        {!selectedVariants.size && (
                          <p className="text-xs text-red-400 mt-1">* Veuillez sélectionner une taille</p>
                        )}
                      </div>
                    )}
                    
                    {/* Couleurs */}
                    {selectedOffer.variants.colors && selectedOffer.variants.colors.length > 0 && (
                      <div className="mb-4">
                        <p className="variant-label">Couleur</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedOffer.variants.colors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setSelectedVariants(prev => ({ ...prev, color }))}
                              className={`variant-chip ${selectedVariants.color === color ? 'selected' : ''}`}
                              data-testid={`variant-color-${color}`}
                            >
                              {color}
                            </button>
                          ))}
                        </div>
                        {!selectedVariants.color && (
                          <p className="text-xs text-red-400 mt-1">* Veuillez sélectionner une couleur</p>
                        )}
                      </div>
                    )}
                    
                    {/* Autres variantes (poids, etc.) */}
                    {selectedOffer.variants.weights && selectedOffer.variants.weights.length > 0 && (
                      <div className="mb-2">
                        <p className="variant-label">Poids</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedOffer.variants.weights.map((weight) => (
                            <button
                              key={weight}
                              type="button"
                              onClick={() => setSelectedVariants(prev => ({ ...prev, weight }))}
                              className={`variant-chip ${selectedVariants.weight === weight ? 'selected' : ''}`}
                              data-testid={`variant-weight-${weight}`}
                            >
                              {weight}
                            </button>
                          ))}
                        </div>
                        {!selectedVariants.weight && (
                          <p className="text-xs text-red-400 mt-1">* Veuillez sélectionner un poids</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Promo code input - Accept any case (minuscules/majuscules) */}
                <div>
                  <input type="text" placeholder={t('promoCode')} value={discountCode} onChange={e => setDiscountCode(e.target.value)}
                    className={`w-full p-3 rounded-lg ${appliedDiscount ? 'valid-code' : 'neon-input'}`} data-testid="discount-code-input" autoComplete="off" />
                  
                  {/* FEEDBACK VISUEL: Message clair sous le champ code promo */}
                  {promoMessage.text && (
                    <p className={`mt-2 text-sm font-medium ${promoMessage.type === 'success' ? 'text-green-400' : promoMessage.type === 'error' ? 'text-red-400' : 'text-yellow-400'}`} data-testid="promo-message">
                      {promoMessage.text}
                    </p>
                  )}
                </div>
                
                {/* Other validation messages */}
                {validationMessage && (
                  <p className="text-red-400 text-sm font-medium" data-testid="validation-message">{validationMessage}</p>
                )}
                
                {/* Price summary with quantity selector and discount */}
                <div className="p-4 rounded-lg card-gradient">
                  {selectedOffer && (
                    <>
                      <div className="flex justify-between items-center text-white text-sm mb-2">
                        <span>{selectedOffer.name}</span>
                        <span>CHF {selectedOffer.price.toFixed(2)}</span>
                      </div>
                      
                      {/* Pour les services/cours: Afficher les dates sélectionnées */}
                      {!selectedOffer?.isProduct && !selectedOffer?.isPhysicalProduct && selectedDates.length > 0 && (
                        <div className="mb-3 p-3 rounded-lg" style={{ 
                          background: 'rgba(217, 28, 210, 0.1)', 
                          border: '1px solid rgba(217, 28, 210, 0.3)' 
                        }}>
                          <p className="text-xs text-pink-400 mb-2 font-medium">📅 Dates sélectionnées ({selectedDates.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDates.map((dateISO, idx) => (
                              <span 
                                key={idx}
                                className="px-2 py-1 rounded-full text-xs text-white"
                                style={{ 
                                  background: 'rgba(217, 28, 210, 0.3)',
                                  border: '1px solid #D91CD2'
                                }}
                              >
                                {new Date(dateISO).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                              </span>
                            ))}
                          </div>
                          {selectedDates.length > 1 && (
                            <p className="text-xs text-white opacity-70 mt-2">
                              💡 Cliquez sur les dates ci-dessus pour en ajouter ou retirer
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* Quantity selector - Visible uniquement pour les produits physiques */}
                      {(selectedOffer?.isProduct || selectedOffer?.isPhysicalProduct) && (
                        <div className="flex justify-between items-center text-white text-sm mb-2">
                          <span>{t('quantity') || 'Quantité'}:</span>
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                              data-testid="quantity-minus"
                            >-</button>
                            <span className="w-8 text-center font-bold" data-testid="quantity-value">{quantity}</span>
                            <button 
                              type="button"
                              onClick={() => setQuantity(quantity + 1)}
                              className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold"
                              data-testid="quantity-plus"
                            >+</button>
                          </div>
                        </div>
                      )}
                      
                      {/* Sous-total pour produits physiques */}
                      {(selectedOffer?.isProduct || selectedOffer?.isPhysicalProduct) && quantity > 1 && (
                        <div className="flex justify-between text-white text-xs opacity-60 mb-1">
                          <span>Sous-total ({quantity} x CHF {selectedOffer.price.toFixed(2)})</span>
                          <span>CHF {(selectedOffer.price * quantity).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {/* Sous-total pour services/cours avec multi-dates */}
                      {!selectedOffer?.isProduct && !selectedOffer?.isPhysicalProduct && selectedDates.length > 1 && (
                        <div className="flex justify-between text-white text-xs opacity-60 mb-1">
                          <span>Sous-total ({selectedDates.length} dates x CHF {selectedOffer.price.toFixed(2)})</span>
                          <span>CHF {(selectedOffer.price * selectedDates.length).toFixed(2)}</span>
                        </div>
                      )}
                      
                      {appliedDiscount && (
                        <div className="flex justify-between text-green-400 text-sm mb-1">
                          <span>Réduction ({appliedDiscount.code})</span>
                          <span>
                            {appliedDiscount.type === '100%' ? '-100%' : 
                             appliedDiscount.type === '%' ? `-${appliedDiscount.value}%` : 
                             `-${appliedDiscount.value} CHF`}
                          </span>
                        </div>
                      )}
                      <hr className="border-gray-600 my-2" />
                    </>
                  )}
                  <p className="font-bold text-white text-lg flex justify-between" data-testid="total-price">
                    <span>{t('total')}:</span>
                    <span style={{ color: parseFloat(totalPrice) === 0 ? '#4ade80' : '#d91cd2' }}>
                      CHF {totalPrice}
                      {parseFloat(totalPrice) === 0 && <span className="ml-2 text-sm">(GRATUIT)</span>}
                    </span>
                  </p>
                </div>
                
                {/* CGV checkbox with clickable link */}
                <label className="flex items-start gap-2 cursor-pointer text-xs text-white opacity-70">
                  <input type="checkbox" required checked={hasAcceptedTerms} onChange={e => setHasAcceptedTerms(e.target.checked)} data-testid="terms-checkbox" />
                  <span>
                    {t('acceptTerms')}{' '}
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}
                      className="underline hover:text-purple-400"
                      style={{ color: '#d91cd2' }}
                      data-testid="terms-link"
                    >
                      {t('termsLink') || 'conditions générales'}
                    </button>
                    {' '}et confirme ma réservation.
                  </span>
                </label>
              </div>
            </div>
            
            {/* DYNAMISME DU BOUTON: Change selon le montant total */}
            <button type="submit" disabled={!hasAcceptedTerms || loading} 
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-wide ${parseFloat(totalPrice) === 0 ? 'btn-free' : 'btn-primary'}`} 
              data-testid="submit-reservation-btn">
              {loading ? t('loading') : parseFloat(totalPrice) === 0 ? '🎁 Réserver gratuitement' : t('payAndReserve')}
            </button>
          </form>
        )}

        {/* CGV Modal */}
        {showTermsModal && (
          <div className="modal-overlay" onClick={() => setShowTermsModal(false)}>
            <div className="modal-content glass rounded-xl p-6 max-w-lg w-full neon-border" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{t('termsTitle') || 'Conditions Générales'}</h3>
                <button onClick={() => setShowTermsModal(false)} className="text-2xl text-white hover:text-purple-400">×</button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto text-white text-sm opacity-80 whitespace-pre-wrap">
                {concept.termsText || 'Les conditions générales ne sont pas encore définies. Veuillez contacter l\'administrateur.'}
              </div>
              <button 
                onClick={() => setShowTermsModal(false)} 
                className="mt-4 w-full py-3 rounded-lg btn-primary"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Footer minimaliste avec navigation textuelle et logos paiement */}
        <footer className="mt-12 mb-8 text-center">
          
          {/* Logos de paiement - Sans rectangle, juste les logos */}
          {(concept.paymentTwint || concept.paymentPaypal || concept.paymentCreditCard) && (
            <div className="flex justify-center items-center gap-6 mb-6" data-testid="payment-logos-footer">
              {concept.paymentTwint && (
                <div 
                  style={{ 
                    height: '24px', 
                    display: 'flex', 
                    alignItems: 'center',
                    opacity: 0.8 
                  }}
                  title="Twint"
                >
                  <svg width="60" height="24" viewBox="0 0 120 40" fill="white">
                    <text x="0" y="28" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="bold" fill="white">TWINT</text>
                  </svg>
                </div>
              )}
              {concept.paymentPaypal && (
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" 
                  alt="PayPal" 
                  style={{ height: '22px', filter: 'brightness(0) invert(1)', opacity: 0.7 }}
                  title="PayPal"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              {concept.paymentCreditCard && (
                <div className="flex items-center gap-2">
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" 
                    alt="Visa" 
                    style={{ height: '18px', filter: 'brightness(0) invert(1)', opacity: 0.7 }}
                    title="Visa"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <img 
                    src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" 
                    alt="Mastercard" 
                    style={{ height: '20px', filter: 'brightness(0) invert(1)', opacity: 0.7 }}
                    title="Mastercard"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Navigation textuelle horizontale - Police fine, sans icônes */}
          <div 
            className="flex justify-center items-center flex-wrap gap-x-2 gap-y-1"
            style={{ 
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontWeight: 300,
              fontSize: '12px',
              letterSpacing: '0.5px'
            }}
          >
            {concept.externalLink1Url && concept.externalLink1Title && (
              <>
                <a 
                  href={concept.externalLink1Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-pink-400 transition-colors"
                  style={{ opacity: 0.6 }}
                  data-testid="external-link-1"
                >
                  {concept.externalLink1Title}
                </a>
                <span className="text-white" style={{ opacity: 0.3 }}>|</span>
              </>
            )}
            {concept.externalLink2Url && concept.externalLink2Title && (
              <>
                <a 
                  href={concept.externalLink2Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-pink-400 transition-colors"
                  style={{ opacity: 0.6 }}
                  data-testid="external-link-2"
                >
                  {concept.externalLink2Title}
                </a>
                <span className="text-white" style={{ opacity: 0.3 }}>|</span>
              </>
            )}
            {(installPrompt || isIOS) && !window.matchMedia('(display-mode: standalone)').matches && (
              <>
                <button 
                  onClick={handleInstallClick}
                  className="text-white hover:text-pink-400 transition-colors"
                  style={{ opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}
                  data-testid="footer-install-link"
                >
                  Installer Afroboost
                </button>
                <span className="text-white" style={{ opacity: 0.3 }}>|</span>
              </>
            )}
            {/* Lien Connexion Coach - Visible pour tous */}
            <button 
              onClick={handleCopyrightClick}
              className="text-white hover:text-pink-400 transition-colors"
              style={{ opacity: 0.6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}
              data-testid="footer-coach-login"
            >
              Connexion Coach
            </button>
            <span className="text-white" style={{ opacity: 0.3 }}>|</span>
            <span 
              className="text-white" 
              style={{ opacity: 0.4 }}
              data-testid="copyright-text"
            >
              {t('copyright')}
            </span>
          </div>
        </footer>
        
        {/* Indicateur de scroll pour les nouveaux utilisateurs */}
        <ScrollIndicator show={showScrollIndicator && !coachMode && !showSplash} />
        
        {/* Widget Chat IA flottant */}
        <ChatWidget />
      </div>
    </div>
  );
}

export default App;
