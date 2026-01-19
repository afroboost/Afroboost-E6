# Afroboost - Product Requirements Document

## Original Problem Statement
Application de réservation de casques audio pour des cours de fitness Afroboost. Design sombre néon avec fond noir pur (#000000) et accents rose/violet.

## User Personas
- **Utilisateurs**: Participants aux cours de fitness qui réservent des casques audio
- **Coach**: Administrateur qui gère les cours, offres, réservations, codes promo et campagnes marketing

## Core Requirements

### Système de Réservation
- [x] Sélection de cours et dates
- [x] Choix d'offres (Cours à l'unité, Carte 10 cours, Abonnement)
- [x] Formulaire d'information utilisateur (Nom, Email, WhatsApp)
- [x] Application de codes promo avec validation en temps réel
- [x] Liens de paiement (Stripe, PayPal, Twint)
- [x] Confirmation de réservation avec code unique

### Mode Coach Secret
- [x] Accès par 3 clics rapides sur le copyright
- [x] Login avec credentials (coach@afroboost.com / afroboost123)
- [x] Tableau de bord avec 7 onglets (Réservations, Concept, Cours, Offres, Paiements, Codes promo, Campagnes)

### Administration (Mode Coach)
- [x] **Réservations**: Tableau complet avec export CSV
- [x] **Concept & Visuel**: 
  - Description du concept (textarea)
  - URL Média 16:9 (YouTube/Vimeo/Image)
  - URL du Logo (Splash Screen & PWA)
  - URL du Favicon
- [x] **Cours**: CRUD complet avec jour, heure, lieu, lien Maps, toggle visibilité
- [x] **Offres**: 
  - Nom, Prix, URL miniature, Visible
  - Description pour icône "i" (max 150 caractères)
- [x] **Paiements**: Configuration liens Stripe/PayPal/Twint, WhatsApp Coach
- [x] **Codes Promo**: 
  - Création avec type (100%, %, CHF), valeur, bénéficiaire
  - Liste cours autorisés avec scroll
  - Bouton supprimer (poubelle rouge)
  - Import CSV
- [x] **📢 Campagnes Marketing** (NOUVEAU):
  - Création de campagnes multi-canaux (WhatsApp, Email, Instagram)
  - Programmation multi-dates (chaque date = ligne distincte)
  - Sélection de contacts ciblés
  - Aperçu visuel du média
  - Lancement et suivi des envois
  - Indicateurs d'erreur visuels (point rouge pour numéros invalides)

### Internationalisation (i18n)
- [x] FR, EN, DE
- [x] Changement instantané via icône globe

### Design
- [x] Fond noir pur (#000000)
- [x] Bordures néon rose/violet
- [x] Effets de lueur
- [x] Bouton paiement avec dégradé pulsant

---

## What's Been Implemented (Jan 2026)

### Module Gestionnaire de Campagnes (13 Jan 2026)
1. ✅ **Création de campagnes marketing**:
   - Formulaire complet: nom, message avec variables {prénom}, URL média, format (9:16/16:9)
   - Canaux d'envoi: WhatsApp, Email, Instagram
   - Ciblage: Tous les contacts ou sélection individuelle
   
2. ✅ **Programmation multi-dates**:
   - Option "Programmer (multi-dates)" avec ajout/suppression de créneaux
   - Chaque date crée une campagne distincte avec statut "Programmé"
   - Calendrier avec restriction aux dates futures
   
3. ✅ **Génération de liens WhatsApp optimisée**:
   - Format: `https://api.whatsapp.com/send?phone=41XXXXXXXXX&text=...`
   - Nettoyage automatique des numéros suisses (0765203363 → 41765203363)
   - URL du média à la fin du message (active l'aperçu WhatsApp)
   
4. ✅ **Indicateurs d'erreur visuels**:
   - Point rouge 🔴 pour numéros invalides ou emails manquants
   - Panel d'erreurs récentes en haut de l'historique
   - Message "⚠️ Certains contacts ont des informations manquantes"
   
5. ✅ **Historique des campagnes**:
   - Tableau avec colonnes: Campagne, Contacts, Canaux, Statut, Date, Actions
   - Statuts: Brouillon, Programmé, En cours, Envoyé
   - Détails d'envoi expandables avec progression

### Corrections techniques précédentes (13 Jan 2026)
1. ✅ **Lecteur vidéo étanche 16:9**
2. ✅ **Description du concept dynamique**
3. ✅ **Favicon & Logo dynamique**
4. ✅ **Codes promo robustes** (insensible à la casse, espaces, mise à jour temps réel)

### Tests
- Backend: 31/31 tests passés (pytest)
- Frontend: Toutes les fonctionnalités vérifiées
- Tests spécifiques campagnes: 8/8 passés

### Corrections Bug Fixes (15 Jan 2026)
1. ✅ **Scanner QR amélioré**:
   - Test direct de la caméra avant initialisation html5-qrcode
   - Indicateur de chargement pendant l'initialisation
   - Messages d'erreur plus clairs avec bouton "Réessayer"
   - Fallback robuste vers saisie manuelle
   
2. ✅ **Icône "i" sur les offres**:
   - Cercle rose visible sur les offres avec descriptions
   - Panneau de description s'affiche au clic
   - Bouton de fermeture (×) pour revenir à l'image

3. ✅ **Badges de statut**:
   - "✅ Validé" avec fond vert
   - "⏳ En attente" avec fond jaune
   - Affichés dans le tableau des réservations

4. ✅ **Slider horizontal des offres - SWIPE FLUIDE (corrigé)**:
   - CSS optimisé avec `-webkit-overflow-scrolling: touch !important`
   - `touch-action: pan-x` pour swipe mobile
   - `scroll-snap-type: x mandatory` pour arrêt net sur chaque carte
   - Suppression des styles inline conflictuels
   - Effet LED néon rose (#d91cd2) sur l'offre sélectionnée
   - Badge "✓ Sélectionné" visible

5. ✅ **Affichage images des offres (corrigé)**:
   - Priorité: `offer.images[0] > offer.thumbnail > defaultImage`
   - Points de navigation discrets pour cartes multi-images
   - Carrousel avec navigation au clic sur les points
   - Zoom modal avec flèches de navigation
   - Synchronisation correcte après édition coach (`fetchData()` appelé au retour)

6. ✅ **Cartes non tronquées (corrigé)**:
   - `.offer-card.selected { height: auto !important; max-height: none !important; }`
   - Conteneur flexible qui s'adapte au contenu

7. ✅ **Rich Preview (Open Graph)**:
   - Meta tags og:title, og:description, og:image ajoutés
   - Image og-image.png générée (1.3MB)
   - Twitter Card meta tags ajoutés
   - Aperçu riche pour partage WhatsApp/Instagram

### Refactoring Modulaire Vercel P1 (15 Jan 2026)
1. ✅ **Composants extraits de App.js**:
   - `/components/OfferCard.js` - OfferCard + OfferCardSlider avec multi-images
   - `/components/QRScanner.js` - Modal scanner avec gestion propre caméra (stop/start)
   - `/components/AdminCampaigns.js` - Hooks + composants pour campagnes marketing
   - `/components/index.js` - Export centralisé de tous les composants

2. ✅ **CSS organisé par sections**:
   - Section "OFFERS SLIDER STYLES" - Swipe mobile iOS/Android
   - Section "QR SCANNER STYLES" - Conteneur visible
   - Section "OFFER CARD STYLES" - Multi-images et sélection
   - Section "COACH MODE ADMIN STYLES" - Tabs coach
   - Section "CAMPAIGNS STYLES" - Gestionnaire marketing

3. ✅ **Vérifications post-refactoring**:
   - Bouton "Voir les avis" : Fonctionnel ✓
   - Champ adresse conditionnel (produits) : Fonctionnel ✓
   - Scanner QR : Modal + boutons fonctionnels ✓
   - Swipe offres mobile : Fonctionnel ✓

### Fonctionnalités Avis Google (15 Jan 2026)
1. ✅ **Mode Coach - Champ Lien des avis Google**:
   - Onglet "Concept & Visuel" - nouveau champ `googleReviewsUrl`
   - Indicateur visuel "✓ Lien configuré" en vert
   - Lien "Tester le lien" pour prévisualisation
   - Persistance via API `/api/concept`

2. ✅ **Mode Client - Bouton "Voir les avis"**:
   - Positionné entre offres et formulaire
   - Design néon transparent avec bordure lumineuse rose/violet
   - Icône étoile + icône lien externe
   - Ouvre le lien Google dans un nouvel onglet
   - Masqué si aucun lien configuré

### Intégration EmailJS (15 Jan 2026)
1. ✅ **Service EmailJS créé**:
   - `/services/emailService.js` - Envoi automatisé avec @emailjs/browser
   - Fonctions: `sendEmail`, `sendBulkEmails`, `testEmailJSConfig`
   - Stockage config dans localStorage (pas de backend)

2. ✅ **Interface Admin EmailJS**:
   - Panneau de configuration avec 3 champs (Service ID, Template ID, Public Key)
   - Bouton "💾 Sauvegarder" + "🧪 Tester" avec email de test
   - Instructions pour créer un template EmailJS

### Intégration WhatsApp API Twilio (15 Jan 2026)
1. ✅ **Service WhatsApp créé**:
   - `/services/whatsappService.js` - Envoi automatisé via Twilio API
   - Fonctions: `sendWhatsAppMessage`, `sendBulkWhatsApp`, `testWhatsAppConfig`
   - Format E.164 automatique pour les numéros suisses (+41)
   - Support des médias (images/vidéos) via MediaUrl

2. ✅ **Interface Admin WhatsApp**:
   - Panneau de configuration avec 3 champs (Account SID, Auth Token, From Number)
   - Auth Token masqué pour sécurité
   - Bouton "💾 Sauvegarder" + "🧪 Tester" avec numéro de test
   - Instructions Sandbox Twilio détaillées

3. ✅ **Champ URL du média**:
   - Champ "📎 URL du média (image/vidéo)" dans le mode Envoi Direct
   - Aperçu miniature si URL valide
   - Transmis comme `media_url` dans les appels API

4. ✅ **Envoi groupé automatique**:
   - Bouton gradient "🚀 Envoyer Email + WhatsApp"
   - Barre de progression globale indiquant le canal en cours
   - Récapitulatif final avec stats par canal
   - Mode manuel WhatsApp conservé (←/Ouvrir/→)

### Agent IA WhatsApp (15 Jan 2026)
1. ✅ **Backend IA avec OpenAI via Emergent LLM Key**:
   - `/backend/server.py` - Endpoints `/api/ai-config`, `/api/ai-logs`, `/api/ai-test`, `/api/webhook/whatsapp`
   - Service `aiResponseService.js` côté frontend pour configuration
   - Utilise `emergentintegrations` pour l'intégration OpenAI
   - Session par numéro de téléphone pour contexte multi-tour

2. ✅ **Mémorisation du contexte**:
   - Recherche automatique du client par numéro dans les réservations
   - Personnalisation avec le prénom du client dans les réponses
   - Référence au dernier média envoyé (`lastMediaUrl`)

3. ✅ **Interface Admin IA**:
   - Panneau "🤖 Agent IA WhatsApp" avec toggle activation
   - Prompt système personnalisable (personnalité de l'IA)
   - Sélecteurs Provider (OpenAI, Anthropic, Google) et Modèle
   - URL Webhook Twilio affichée pour configuration
   - Zone de test IA avec réponse en temps réel

4. ✅ **Logs de l'IA**:
   - Affichage des dernières réponses (heure + prénom + extrait)
   - Bouton "🗑️ Effacer" pour nettoyer les logs
   - Stockage dans MongoDB (50 derniers logs)

---

## Technical Architecture

```
/app/
├── backend/
│   ├── server.py       # FastAPI avec AI Webhook, MongoDB
│   ├── requirements.txt
│   └── tests/
│       ├── test_afroboost_api.py
│       └── test_campaigns_api.py
└── frontend/
    ├── src/
    │   ├── App.js      # Composant React principal (~4000 lignes)
    │   ├── App.css     # Styles néon organisés par sections
    │   ├── config/
    │   │   ├── index.js      # Configuration groupée
    │   │   └── constants.js  # Constantes exportées
    │   ├── services/
    │   │   ├── index.js            # Export centralisé services
    │   │   ├── emailService.js     # EmailJS automatisé
    │   │   ├── whatsappService.js  # WhatsApp Twilio API
    │   │   └── aiResponseService.js # IA WhatsApp config (NOUVEAU)
    │   ├── components/
    │   │   ├── index.js          # Export centralisé
    │   │   ├── OfferCard.js      # Composants offres + multi-images
    │   │   ├── QRScanner.js      # Scanner QR avec gestion caméra
    │   │   ├── AdminCampaigns.js # Hooks + composants campagnes
    │   │   ├── LanguageSelector.jsx
    │   │   └── ui/
    │   │       └── index.jsx     # Composants UI de base
    │   ├── hooks/
    │   │   └── index.js      # Hooks personnalisés
    │   └── utils/
    │       └── i18n.js       # Internationalisation
    ├── vercel.json           # Configuration déploiement Vercel
    ├── ARCHITECTURE.md       # Documentation structure
    └── public/
        ├── index.html  # PWA meta tags + Open Graph
        └── manifest.json
```

### Data Models (MongoDB)
- `courses`: id, name, weekday, time, locationName, mapsUrl, visible
- `offers`: id, name, price, thumbnail, description, visible
- `users`: id, name, email, whatsapp, createdAt
- `reservations`: id, reservationCode, userId, userName, userEmail, courseId, selectedDates (List[str]), selectedDatesText, totalPrice, ...
- `discount_codes`: id, code, type, value, assignedEmail, courses, maxUses, used, active
- `concept`: id, description, heroImageUrl, logoUrl, faviconUrl
- `payment_links`: id, stripe, paypal, twint, coachWhatsapp
- `campaigns`: id, name, message, mediaUrl, mediaFormat, targetType, selectedContacts, channels, scheduledAt, status, results, createdAt

---

## Prioritized Backlog

### P0 - Completed ✅
- [x] Module Gestionnaire de Campagnes complet
- [x] Envoi WhatsApp avec aperçu média
- [x] Programmation multi-dates
- [x] Indicateurs d'erreur visuels
- [x] Swipe fluide des offres (mobile)
- [x] Affichage correct des images d'offres
- [x] Cartes non tronquées
- [x] Architecture config Vercel initiée
- [x] Bouton "Voir les avis Google" côté client
- [x] Champ "Lien des avis Google" dans Mode Coach
- [x] Gestionnaire de Campagnes opérationnel (Email BCC, WhatsApp nav, Instagram DM)
- [x] Intégration EmailJS automatisée avec barre de progression
- [x] Refactoring modulaire P1 (composants + services)
- [x] **Navigation Client Dynamique (15 Jan 2026)**:
  - Barre de filtres chips néon (🔥 Tout, 📅 Sessions, 🎁 Offres, 🛍️ Shop)
  - Barre de recherche textuelle filtrant offres par nom/description
  - Composant SearchBar.js modulaire avec NavigationBar et LandingSectionSelector
- [x] **Contrôle Admin Section d'atterrissage (15 Jan 2026)**:
  - Sélecteur "📍 Section d'atterrissage par défaut" dans Mode Coach > Concept & Visuel
  - Persistance MongoDB via champ defaultLandingSection dans modèle Concept
  - Scroll automatique vers la section configurée au chargement de l'app
- [x] **Navigation Épurée & Flux Mobile (15 Jan 2026)**:
  - **Design épuré** : Filtres sans fond, bordure néon rose uniquement sur l'élément sélectionné
  - **Logique de filtrage corrigée** : "Offres" = abonnements + sessions, "Shop" = produits physiques uniquement
  - **Recherche par titre** : Bordure rose, filtrage en temps réel par titre uniquement
  - **Fix scroll mobile** : overflow-y: auto sur html/body, -webkit-overflow-scrolling: touch
  - **Smooth scroll** : Navigation automatique vers la section lors du clic sur un filtre
  - **Indicateur de scroll** : Flèche animée après 3s sans scroll pour guider les nouveaux utilisateurs
- [x] **Vérification Médias & Optimisation Vidéo (15 Jan 2026)**:
  - **Validation URL côté Admin** : Badge "✓ Valide" ou "✗ Format inconnu" à côté du champ média
  - **Formats supportés** : YouTube, Vimeo, .mp4, .webm, .jpg, .jpeg, .png, .webp, .gif
  - **Fallback placeholder** : Image Afroboost par défaut si média ne charge pas (onError)
  - **Overlays réduits** : Bandes haut/bas réduites de 55/80px à 35/50px et plus transparentes (70% → 30%)
  - **Lisibilité texte** : text-shadow ajouté au titre et description pour contraste sur vidéo
- [x] **Réparation Médias, Logos & Persistence (15 Jan 2026)**:
  - **Lecteur vidéo amélioré** : parseMediaUrl supporte YouTube shorts, v/, embed formats + WebM, MOV, AVI
  - **Overlays supprimés** : Plus aucun overlay sombre sur la vidéo - 100% visible
  - **Hook Logo/Favicon** : Mise à jour dynamique du favicon avec priorité faviconUrl > logoUrl
  - **CDNs supportés** : ImgBB, Cloudinary, Imgur, Unsplash, Pexels reconnus
  - **Logs d'erreur améliorés** : Messages détaillés côté frontend et backend pour diagnostiquer les échecs
  - **Navigation vérifiée** : Filtres épurés, recherche rose, scroll mobile fluide fonctionnels
- [x] **Navigation Épurée & Contrôle d'Atterrissage (15 Jan 2026)**:
  - **Filtres masqués** : Boutons "Tout", "Sessions", "Offres", "Shop" cachés côté client
  - **Barre de recherche rose uniquement** : Seul élément de navigation visible, bordure rose
  - **Sélecteur admin "📍 Section d'atterrissage"** : Dans Concept & Visuel avec options Sessions/Offres/Shop
  - **Scroll automatique** : Au chargement, scroll fluide vers la section configurée dans MongoDB
  - **Recherche fonctionnelle** : Filtre en temps réel par titre des offres/produits
- [x] **Liens Externes, Paiements & Fix Sauvegarde (15 Jan 2026)**:
  - **🔗 Liens Externes** : 2 champs (titre + URL) dans Concept & Visuel, affichés en boutons en bas de page côté client
  - **💳 Modes de paiement** : Checkboxes Twint, PayPal, Carte de Crédit dans l'admin
  - **Icônes paiement** : Rectangle pied de page avec icônes des paiements cochés (🔵 Twint, 🅿️ PayPal, 💳 Carte)
  - **Sauvegarde fonctionnelle** : Backend mis à jour avec nouveaux champs dans modèle Concept
- [x] **Navigation Textuelle & Logos Paiement (15 Jan 2026)**:
  - **Footer minimaliste** : Navigation horizontale textuelle sans icônes (Lien1 | Lien2 | Installer | ©)
  - **Logos officiels** : Twint, PayPal, Visa, Mastercard en blanc (filtre invert) sans rectangle
  - **Toggles admin** : Interrupteurs ON/OFF pour activer/désactiver chaque logo de paiement
  - **Police fine** : Style minimaliste avec font-weight 300 et letter-spacing
- [x] **Widget IA avec Capture de Données (15 Jan 2026)**:
  - **Bouton flottant WhatsApp** : Icône verte en bas à droite (bottom: 80px) avec ombre
  - **Formulaire Lead Generation** : Prénom, WhatsApp, Email obligatoires avant chat
  - **Sauvegarde MongoDB** : Collection 'leads' avec id, firstName, whatsapp, email, createdAt, source
  - **Chat IA personnalisé** : "Enchanté [Prénom] ! Je suis l'assistant IA d'Afroboost..."
  - **Contexte enrichi** : L'IA utilise la description Afroboost et les cours disponibles
  - **API Endpoints** : POST /api/leads, GET /api/leads, POST /api/chat
- [x] **Amélioration UX Carrousel des Offres (17 Jan 2026)**:
  - **Auto-play** : Défilement automatique toutes les 3.5 secondes pour montrer la multiplicité des offres
  - **Indicateur "Auto"** : Badge en haut à droite avec point rose pulsant quand l'auto-play est actif
  - **Pause intelligente** : Auto-play se met en pause au survol de souris ou au toucher (reprend après 5s)
  - **Consigne visuelle** : Texte rose "👉 Sélectionnez une offre pour continuer" au-dessus du carrousel
  - **Points de pagination** : Indicateurs cliquables pour naviguer manuellement entre les offres
  - **Scroll automatique vers formulaire** : Après clic sur une offre, scroll fluide vers "Vos informations"
  - **Badge "✓ Sélectionné"** : Visible sur l'offre choisie avec effet glow rose
  - **Composant OffersSliderAutoPlay** : Nouveau composant dans App.js (lignes 946-1081)
- [x] **Amélioration Partage WhatsApp avec QR Code (17 Jan 2026)**:
  - **html2canvas** : Bibliothèque installée pour convertir le ticket en image PNG
  - **Bouton "Enregistrer mon ticket"** : Télécharge le ticket complet (QR + infos) en image haute qualité
  - **Bouton "Partager sur WhatsApp"** : Nouveau bouton vert côte à côte avec Enregistrer
  - **Texte de partage** : "Voici ma réservation Afroboost : https://afroboost.com"
  - **afroboost.ch → afroboost.com** : URL corrigée dans tout le projet
- [x] **Mise à jour Son, Visuels et PWA (17 Jan 2026)**:
  - **Bouton Mute/Unmute** : Ajouté sous la vidéo YouTube/Vimeo, permet d'activer le son manuellement
  - **Logo Twint corrigé** : Remplacé l'image cassée par un texte SVG "TWINT" blanc
  - **Manifest PWA dynamique** : Endpoint `/api/manifest.json` utilise le logo configuré par le coach
- [x] **Génération de Codes Promo en Série (17 Jan 2026)**:
  - **Mode série** : Checkbox "Génération en série" pour basculer entre mode unique et mode batch
  - **Préfixe personnalisé** : Champ "Préfixe du code" (ex: VIP → VIP-1, VIP-2, VIP-3...)
  - **Nombre de codes** : Champ "Nombre de codes" avec maximum 20 par série
  - **Paramètres partagés** : Type, valeur, expiration et cours autorisés appliqués à tous les codes de la série
  - **Message de succès** : Alert "✅ X codes créés avec succès !" après génération
  - **Rafraîchissement automatique** : Liste mise à jour immédiatement après création
  - **Gestion individuelle** : Chaque code reste modifiable/activable/supprimable individuellement
  - **Tests complets** : 12/12 tests backend + 10/10 fonctionnalités frontend vérifiées
- [x] **Export CSV des Codes Promo (17 Jan 2026)**:
  - **Bouton "📥 Exporter CSV"** : Ajouté à côté du bouton "Importer CSV" avec fond violet
  - **Format de fichier** : CSV avec colonnes (Code, Type, Valeur, Bénéficiaire, Utilisations Max, Utilisé, Date Expiration, Actif, Cours Autorisés)
  - **Encodage UTF-8 BOM** : Pour compatibilité Excel
  - **Nom automatique** : `codes_promo_YYYY-MM-DD.csv`
- [x] **Refactoring Majeur App.js (17 Jan 2026)**:
  - **Extraction CoachDashboard** : Composant de 3383 lignes extrait dans `/components/CoachDashboard.js`
  - **Réduction App.js** : De 6402 lignes à 3055 lignes (réduction de 52%)
  - **Imports mis à jour** : `import { CoachDashboard } from "./components/CoachDashboard"`
  - **Fonctionnalité préservée** : Tous les onglets et fonctions du Mode Coach fonctionnent
- [x] **Affiche Événement (Popup d'accueil) (17 Jan 2026)**:
  - **Popup modal** : S'affiche automatiquement à l'arrivée du visiteur (après splash screen)
  - **Support média** : Images (Unsplash, CDN) et vidéos (YouTube, Vimeo)
  - **Fermeture facile** : Bouton × visible en haut à droite
  - **SessionStorage** : Le popup ne réapparaît pas après fermeture (mémorisation session)
  - **Administration** : Section "🎉 Affiche Événement" dans Mode Coach → Concept & Visuel
  - **Toggle activation** : Activer/désactiver l'affiche avec un switch
  - **Aperçu en direct** : Prévisualisation de l'image ou vidéo dans l'admin
  - **Backend** : Champs `eventPosterEnabled` et `eventPosterMediaUrl` ajoutés au modèle Concept
- [x] **Correction Glow Offres (17 Jan 2026)**:
  - **Glow adouci** : Réduction de `0 0 30px/60px` à `0 0 10px rgba(217, 28, 210, 0.4)`
  - **CSS + inline** : Correction dans App.css et App.js (ligne 956)
  - **Margin-top** : Ajout pour éviter que le glow soit coupé en haut
  - **Padding-top slider** : Ajout `padding: 20px 20px 10px 20px` au conteneur `.offers-slider`
- [x] **Notifications Automatiques Coach (17 Jan 2026)**:
  - **Backend** : Champs `coachNotificationEmail` et `coachNotificationPhone` ajoutés au modèle PaymentLinks
  - **Endpoint** : `/api/notify-coach` pour formater les messages de notification
  - **Interface Admin** : Section "🔔 Notifications automatiques" dans Mode Coach → Paiements
  - **Intégration** : Fonction `notifyCoachAutomatic()` appelée après chaque réservation réussie
  - **Support** : Email via EmailJS + WhatsApp via API Twilio (si configurés)
  - **Message formaté** : Nom client, email, WhatsApp, offre, cours, date, montant, code réservation
- [x] **Fix WEEKDAYS_MAP (17 Jan 2026)**:
  - **Erreur corrigée** : `ReferenceError: WEEKDAYS_MAP is not defined` dans CoachDashboard.js
  - **Solution** : Ajout de la constante `WEEKDAYS_MAP` directement dans le fichier CoachDashboard.js
- [x] **Recherche Floue / Fuzzy Search (17 Jan 2026)**:
  - **Normalisation accents** : "seance" trouve "séance", "cafe" trouve "café"
  - **Synonymes intégrés** : session↔séance, abonnement↔abo↔forfait, cardio↔fitness
  - **Champ mots-clés** : Nouveau champ invisible dans les offres pour améliorer la recherche
  - **Recherche étendue** : Titre + description + mots-clés
- [x] **UI Cours avec Scroll et Suppression (17 Jan 2026)**:
  - **Scroll** : maxHeight 400px avec overflow-y auto et scrollbar personnalisée
  - **Bouton supprimer** : Icône poubelle rouge pour chaque cours avec confirmation
  - **Amélioration UX** : Interface plus propre avec padding ajusté
- [x] **Scroll Sessions Côté Client (17 Jan 2026)**:
  - **maxHeight 400px** : Appliqué à la liste des sessions sur la page d'accueil
  - **Custom scrollbar** : Barre de défilement violet cohérente avec le design
  - **Mobile-friendly** : Meilleure expérience sur petits écrans
- [x] **Séparation TOTALE Cours/Produits (17 Jan 2026)**:
  - **Découplage JSX** : Section "🛒 Boutique" rendue indépendamment des cours
  - **Variables séparées** : `filteredServices`, `filteredProducts`, `visibleCourses`
  - **Affichage indépendant** : Les produits s'affichent TOUJOURS même sans sélection de cours
  - **Bug résolu** : Masquer les cours n'impacte plus les produits
- [x] **Fonction Duplication Cours (17 Jan 2026)**:
  - **Bouton duplication** : Icône violet à côté du bouton archiver
  - **Copie automatique** : Crée un nouveau cours avec "(copie)" dans le nom
  - **Gain de temps** : Permet de créer rapidement des créneaux similaires (ex: mardi ET jeudi)
- [x] **Archivage des Cours (17 Jan 2026)**:
  - **Bouton archiver** : Icône 📁 orange (remplace la suppression définitive)
  - **Section "Cours archivés"** : Affiche les cours archivés avec compteur
  - **Bouton restaurer** : Permet de récupérer un cours archivé
  - **Backend** : Champ `archived: bool` ajouté au modèle Course + endpoint /archive
- [x] **UI Ultra-Minimaliste avec Navigation Onglets (17 Jan 2026)**:
  - **3 icônes de navigation** : Tout, Cours, Shop (style micro 26px, cercles fins)
  - **Design similaire au globe** : Icônes en traits fins (strokeWidth 1.5)
  - **État actif** : Bordure et fond rose (#D91CD2) sur l'icône sélectionnée
  - **Filtrage fonctionnel** : Cliquer sur "Shop" masque complètement les sessions
  - **Texte Shop** : Blanc pur (#ffffff) et police fine (fontWeight 300)
  - **Scrollbar sessions** : Rose (#D91CD2), 4px de largeur
  - **Padding glow** : 30px en haut pour éviter que l'effet glow soit coupé
- [x] **Sélecteur de Variantes Interactif (17 Jan 2026)**:
  - **Chips cliquables** : Tailles, couleurs présentées en boutons arrondis
  - **Style** : Bordure rose fine, fond rose sur sélection
  - **Validation obligatoire** : Le client DOIT sélectionner une variante avant l'ajout au panier
  - **Message d'erreur** : "Veuillez sélectionner: taille, couleur" si non sélectionné
  - **Récapitulatif** : Les variantes choisies apparaissent sur le ticket de confirmation
  - **Backend** : Champs `selectedVariants` et `variantsText` dans le modèle Reservation
- [x] **Personnalisation Identité Application (17 Jan 2026)**:
  - **Section Admin** : "🎨 Identité de l'application" dans Mode Coach → Concept & Visuel
  - **Nom de l'application** : Champ pour changer le titre principal ("Afroboost" → custom)
  - **URL du Logo** : Champ pour configurer le logo (Splash Screen & PWA)
  - **Persistance MongoDB** : Champ `appName` ajouté au modèle Concept
  - **Dynamique** : Le titre du site utilise `concept.appName` au lieu de la traduction
- [x] **Fix Régression Visibilité Offres (17 Jan 2026)**:
  - **Bug critique** : Les offres avec `visible=false` s'affichaient toujours
  - **Correction** : Changement de `visible !== false` en `visible === true` (égalité stricte)
  - **Impact** : Offres, produits et cours décochés dans l'admin sont maintenant correctement masqués
  - **Manifest PWA dynamique** : `/api/manifest.json` utilise `appName` et `logoUrl` du concept
  - **Tests** : 15/15 tests backend pytest + 11/11 tests frontend passés
- [x] **Sélection de Dates Multiples pour Réservations (18 Jan 2026)**:
  - **Logique toggle** : Clic ajoute une date, re-clic la retire (sélection multiple)
  - **Style sélection** : Bordure rose (#D91CD2) et coche (✔) sur chaque date sélectionnée
  - **Affichage résumé** : Section "📅 Dates sélectionnées (N)" avec badges des dates choisies
  - **Calcul prix** : Total = prix offre × nombre de dates (ex: 3 dates × 30 CHF = 90 CHF)
  - **Section offres** : Visible uniquement si au moins une date est sélectionnée
  - **Backend** : Modèles `Reservation` et `ReservationCreate` mis à jour avec `selectedDates: List[str]` et `selectedDatesText: str`
  - **UNE seule réservation** : Créée avec le tableau de toutes les dates sélectionnées
  - **Tests** : 8/8 tests backend pytest + 100% tests frontend passés
- [x] **Optimisation Performance & Pagination (18 Jan 2026)**:
  - **Pagination backend** : GET /api/reservations?page=1&limit=20 (20 dernières par défaut)
  - **Structure réponse** : `{data: [], pagination: {page, limit, total, pages}}`
  - **Projections MongoDB** : Ne récupère que les champs nécessaires à l'affichage
  - **Export CSV** : `all_data=true` récupère TOUTES les réservations
  - **UI pagination** : Affichage "Affichage X-Y sur Z réservations" + boutons Précédent/Suivant
  - **Tests** : 12/12 tests backend pytest passés
- [x] **Fix Mots-clés Offres (18 Jan 2026)**:
  - **Édition** : Champ `keywords` pré-rempli lors du clic sur "Modifier" une offre
  - **Recherche client** : Filtre par titre + description + mots-clés instantanément
  - **Tests** : Keywords persistence et search functionality vérifiés
- [x] **Système de Cache Frontend (18 Jan 2026)**:
  - **Cache mémoire** : TTL 5 minutes pour courses/offers, 10 min pour concept/paymentLinks
  - **Invalidation** : Cache invalidé automatiquement en sortant du Mode Coach
  - **Logs console** : `📦 Cache: ✓courses ✓offers ↓concept` (✓=cache hit, ↓=fetch)
  - **Navigation fluide** : Onglets Tout/Cours/Shop sans re-téléchargement
  - **Tests** : 14/14 tests backend pytest + 100% frontend passés
- [x] **Refactoring CoachLoginModal (18 Jan 2026)**:
  - **Extraction** : Composant extrait vers `/components/CoachLoginModal.js` (226 lignes)
  - **App.js réduit** : De 3552 à 3444 lignes (-108 lignes)
  - **Fonctionnalités** : Login, récupération mot de passe intactes
- [x] **Amélioration Assistant IA - Mémorisation & UI (18 Jan 2026)**:
  - **UI Scroll** : `max-height: 80vh` et `overflow-y: auto` sur le conteneur du chat
  - **Mémorisation client** : Données sauvegardées dans localStorage (`af_chat_client`)
  - **Client reconnu** : Badge ✓ rose sur le bouton WhatsApp + chat direct sans formulaire
  - **Message personnalisé** : "Bonjour [Prénom] ! 😊 Ravi de te revoir !"
  - **Header personnalisé** : Affiche "👋 [Prénom]" quand client reconnu
  - **Synchronisation contacts** : Création/mise à jour automatique dans Users via `syncContactToDatabase()`
  - **Changer d'identité** : Lien "Pas [Prénom] ? Changer d'identité" efface localStorage
  - **Backend** : Ajout endpoint `PUT /api/users/{id}` pour mise à jour des contacts
  - **Tests** : 11/11 tests backend pytest + 100% frontend passés
- [x] **Fondations Service Audio - Feature Flags & Abonnements (18 Jan 2026)**:
  - **Feature Flags** : Collection `feature_flags` avec `AUDIO_SERVICE_ENABLED: false` par défaut
  - **Coach Subscription** : Collection `coach_subscriptions` avec droits par service (`hasAudioService`, etc.)
  - **Vérification d'accès** : Endpoint `/api/verify-service-access/{service}` 
  - **Logique métier** : Accès = Feature Flag ON + Coach Subscription OK
  - **Frontend service** : `/services/serviceAccess.js` avec cache et helpers
  - **Collections MongoDB** : `feature_flags`, `coach_subscriptions`
  - **Interface inchangée** : Aucune modification visuelle du site
- [x] **Authentification Google OAuth pour Super Admin (18 Jan 2026)**:
  - **Remplacement complet** : L'authentification par mot de passe a été supprimée
  - **Bouton Google officiel** : "Se connecter avec Google" avec icône multicolore
  - **Restriction email** : ~~`coach@afroboost.com`~~ → **`contact.artboost@gmail.com`** (mis à jour)
  - **Message "Accès réservé"** : Si autre email tente de se connecter
  - **Endpoints backend** : `/api/auth/google/session`, `/api/auth/me`, `/api/auth/logout`
  - **Session sécurisée** : Cookie httpOnly avec expiration 7 jours
  - **Collections MongoDB** : `google_users`, `coach_sessions`
  - **Affichage utilisateur** : Avatar et email affichés dans le header du Dashboard
- [x] **Gestion Audio/Playlist pour les Cours (18 Jan 2026)**:
  - **Bouton 🎵** : "Gérer l'Audio" visible à côté de chaque cours (onglet "Cours")
  - **Modal playlist** : Ajouter/supprimer des URLs audio (MP3, streams, Soundcloud, Spotify)
  - **Modèle Course** : Champ `playlist: Optional[List[str]]` ajouté
  - **PUT partiel** : `/api/courses/{id}` supporte les mises à jour partielles
  - **Sauvegarde** : Playlist liée à l'ID du cours et persistée en MongoDB
  - **Tests** : 10/10 backend pytest passés
  - **Onglets inchangés** : Paiements et Réservations non modifiés
- [x] **Lecteur Audio Immersif Client (18 Jan 2026)**:
  - **Bouton conditionnel** : "🎧 Rejoindre l'expérience immersive" visible uniquement si :
    - Le cours sélectionné a une playlist (`playlist.length > 0`)
    - ET le feature flag `AUDIO_SERVICE_ENABLED` est activé
  - **Positionnement** : Juste au-dessus du bouton "Payer et Réserver"
  - **Style** : Dégradé violet/rose (`linear-gradient(135deg, #8b5cf6, #d91cd2)`) avec ombre portée
  - **Log console** : `Audio Service: ENABLED/DISABLED` affiché au chargement
  - **Lecteur mini** : S'ouvre en bas de l'écran (fixed) sans bloquer l'interface de réservation
  - **Contrôles** : Play/Pause, piste suivante/précédente, volume slider
  - **Info piste** : "Piste 1 / 3" avec nom du cours affiché
  - **Fermeture** : Bouton × pour fermer le lecteur
  - **Testable sans paiement** : Le lecteur est accessible avant le paiement pour permettre les tests
  - **Tests** : Tous les scénarios conditionnels vérifiés (flag ON/OFF, avec/sans playlist)
- [x] **Icône Audio 🎧 dans les Sessions (18 Jan 2026)**:
  - **Affichage conditionnel** : Icône 🎧 rose (#d91cd2) visible dans chaque case horaire de cours avec playlist
  - **Positionnement** : À côté de l'heure via `flex` (texte non décalé)
  - **Comportement** : Clic sur l'icône ouvre le lecteur audio (sans interférer avec la sélection de date)
  - **Style hover** : Effet `scale(1.3)` + `drop-shadow` rose au survol
  - **Protocole anti-casse** : Fonctions `totalPrice`, `handleBooking`, `TwintButton` non modifiées
  - **Test de régression** : Prix total + bouton "Payer" fonctionnels après modification
- [x] **Refactoring App.js - Phase 2 (19 Jan 2026)**:
  - **Composants extraits** :
    - `AudioPlayer.js` : Lecteur audio immersif (mini-player fixé)
    - `SessionList.js` : Liste des cours avec icônes 🎧
    - `OffersSlider.js` : Carrousel d'offres auto-play
    - `BookingForm.js` : Formulaire de réservation complet
  - **Réduction** : App.js de ~3719 à ~3424 lignes (-295 lignes, -8%)
  - **Architecture** : Composants reçoivent données via props, logique métier reste dans App.js
  - **Protocole anti-casse** : Aucune modification de `totalPrice`, `handleBooking`, `TwintButton`
  - **Tests de régression** : 7/7 vérifications passées (sessions, dates, icônes audio, offres, prix, boutons)
- [x] **Espace Dédié Coachs - Multi-tenant (19 Jan 2026)**:
  - **Authentification** : Google OAuth pour tous les coachs enregistrés (pas uniquement Super Admin)
  - **Filtrage données** : Champs `authorEmail` ajoutés aux modèles `Course` et `Offer`
  - **Endpoints filtrés** : `/api/coach/courses`, `/api/coach/offers`, `/api/coach/reservations`
  - **Interface conditionnelle** :
    - Super Admin (`contact.artboost@gmail.com`) : Tous les onglets + gestion des coachs
    - Coachs normaux : Uniquement Réservations, Cours, Offres (onglets concept, payments, codes, campaigns masqués)
  - **Nouvel onglet "👥 Coachs"** : Permet au Super Admin d'enregistrer/supprimer des coachs
  - **Sécurité** : Un coach ne voit QUE ses propres cours/offres + ceux sans auteur assigné
  - **Tests** : Filtrage vérifié (coach.test@example.com voit 5 cours, autre.coach voit 4)
- [x] **Permutation Vidéo/Audio Héro (19 Jan 2026)**:
  - **État `isAudioMode`** : Permute l'affichage entre vidéo héro et lecteur audio intégré
  - **Mêmes dimensions** : Conteneur 16:9 identique (pas de CLS - Cumulative Layout Shift)
  - **Composant `HeroMediaWithAudio`** : Encapsule la logique de permutation vidéo ↔ audio
  - **Lecteur audio intégré** :
    - Icône 🎧 animée + nom du cours + "Piste X / Y"
    - Bouton Play/Pause central avec dégradé violet/rose
    - Navigation pistes (⏮ / ⏭) + contrôle volume
    - Bouton ✕ pour revenir à la vidéo
  - **Suppression lecteur flottant** : Plus de mini-player en bas de page
  - **Footer mis à jour** : Lien "Connexion Coach" visible à côté d'Instagram
  - **Widget WhatsApp** : Non gêné (bien séparé en bas à droite)
  - **Paramètres vidéo** : Non modifiés dans "Concept & Visuel"
- [x] **Silent Disco Live - Phase 1 (19 Jan 2026)**:
  - **Backend WebSocket** : Endpoint `/ws/session/{session_id}` pour synchronisation temps réel
  - **SilentDiscoManager** : Gestion des connexions, états de session, diffusion des commandes
  - **Console DJ Coach** : Interface Live Control dans l'onglet "Cours" (Super Admin)
    - Sélection du cours pour démarrer une session
    - Boutons Play/Pause/Navigation pistes synchronisés
    - Affichage du nombre de participants connectés
    - Code de session à partager aux participants
  - **Récepteur Participant** : Mode passif dans HeroMediaWithAudio
    - Bouton "🎧 REJOINDRE LE LIVE" superposé sur la vidéo héro
    - Modal pour entrer le code de session
    - Synchronisation automatique avec le coach (< 500ms de latency)
    - Seul le contrôle du volume est autorisé (pas de navigation)
    - Badge "LIVE" rouge + compteur de participants
  - **Synchronisation** : Commandes PLAY, PAUSE, SEEK, TRACK_CHANGE avec timestamp serveur
  - **Fix Mobile** : Cartes de coachs responsive (flex-col sur mobile)

### P1 - À faire
- [x] ~~**CRITICAL: Refactoring de App.js**~~ - ✅ COMPLÉTÉ - App.js réduit de 52%
- [x] ~~**Notifications email après réservation**~~ - ✅ COMPLÉTÉ
- [x] ~~**Recherche floue**~~ - ✅ COMPLÉTÉ
- [x] ~~**Duplication cours**~~ - ✅ COMPLÉTÉ
- [x] ~~**Séparation Cours/Produits**~~ - ✅ COMPLÉTÉ
- [x] ~~**Archivage cours**~~ - ✅ COMPLÉTÉ
- [x] ~~**Espace Dédié Coachs**~~ - ✅ COMPLÉTÉ
- [x] ~~**Permutation Vidéo/Audio**~~ - ✅ COMPLÉTÉ
- [x] ~~**Silent Disco Live Phase 1**~~ - ✅ COMPLÉTÉ
- [ ] **Optimisation Backend MongoDB** - Appliquer pagination et projection sur les requêtes pour améliorer les performances en production.
- [ ] Tests automatisés pour les composants extraits

### P2 - Backlog
- [ ] **Silent Disco Phase 2** : Drag & Drop playlist + Speed Control
- [ ] **Silent Disco Phase 3** : Micro externe via Web Audio API + Media Session API
- [ ] Créer pages dédiées: /boutique, /profil (routing Vercel)
- [ ] Envoi Email via mailto: avec sujet personnalisé
- [ ] Envoi Instagram via ig.me
- [ ] Dashboard analytics pour le coach
- [ ] Ajouter une vue "Leads" dans le Mode Coach pour visualiser les contacts capturés

---

## Credentials
- **Super Admin**: Uniquement via Google OAuth avec l'email `contact.artboost@gmail.com`
- **Coachs**: Via Google OAuth, doivent être enregistrés par le Super Admin dans l'onglet "👥 Coachs"
- **Coach Access**: 3 clics rapides sur "© Afroboost 2026"

---

## Known Limitations
~~⚠️ **DONNÉES NON PERSISTANTES**: Le backend utilise actuellement des listes en mémoire.~~ 
✅ **Résolu**: Toutes les données sont maintenant persistées dans MongoDB (cours, offres, réservations, configurations, leads).

---

## Silent Disco - Phase 1 (Janvier 2026)

### Description
Fonctionnalité de synchronisation audio en temps réel entre le Coach (DJ) et les participants via WebSocket.

### État: ✅ COMPLÉTÉ

### Fonctionnalités implémentées

#### Backend (server.py)
- [x] Classe `SilentDiscoManager` pour gérer les sessions WebSocket
- [x] Endpoint WebSocket `/api/ws/session/{session_id}` (compatible Kubernetes ingress)
- [x] Endpoint WebSocket `/ws/session/{session_id}` (accès direct)
- [x] Commandes supportées: JOIN, PLAY, PAUSE, SEEK, TRACK_CHANGE, SESSION_START, SESSION_END
- [x] Diffusion temps réel des commandes du Coach vers tous les participants
- [x] Compteur de participants en temps réel
- [x] Endpoints REST: GET `/api/silent-disco/sessions`, GET `/api/silent-disco/session/{id}`

#### Frontend - Console DJ (CoachDashboard.js)
- [x] Interface pour démarrer/arrêter une session Live
- [x] Boutons PLAY/PAUSE synchronisés
- [x] Affichage du code de session à partager
- [x] Compteur de participants connectés

#### Frontend - Lecteur Récepteur (App.js)
- [x] Bouton "REJOINDRE LE LIVE" dans HeroMediaWithAudio
- [x] Modal pour entrer le code de session
- [x] Mode récepteur passif (suit les commandes du Coach)
- [x] Contrôle du volume local uniquement
- [x] Badge "LIVE" avec indicateur de connexion

### Corrections UI Mobile (19 Janvier 2026)
- [x] Bouton LIVE repositionné en haut à gauche sur mobile (ne cache plus le bouton Son)
- [x] Style minimaliste avec fond semi-transparent
- [x] Dashboard Coach: boutons Supprimer alignés correctement sur écrans <400px

### Tests automatisés
- `/app/tests/test_websocket_silent_disco.py` - 4 tests passés
- Test de connexion WebSocket participant
- Test commandes Coach (PLAY/PAUSE)

---

## Prochaines étapes (Phases futures)

### P1: Silent Disco - Console DJ Avancée
- [ ] Réarrangement de la playlist par glisser-déposer
- [ ] Contrôle du tempo

### P1: Silent Disco - Mixage Micro
- [ ] Option "Activer Micro" pour le coach
- [ ] Mixage voix par-dessus la musique

### P1: Silent Disco - Lecture en Arrière-Plan
- [ ] Media Session API pour continuité audio sur mobile

### P2: Dashboard Analytics
- [ ] Statistiques réservations et revenus

### P2: Multi-pages
- [ ] react-router-dom pour navigation


---

## Corrections UI - 19 Janvier 2026 (Session 2)

### Corrections appliquées

#### 1. FIX REACT IMPORT (CRITIQUE)
- **Fichier:** `/app/frontend/src/components/CoachDashboard.js`
- **Problème:** `useCallback is not defined` - bloquait l'accès au dashboard admin
- **Solution:** Ajout de `useCallback` dans l'import React

#### 2. REPOSITIONNEMENT BOUTON LIVE
- **Fichier:** `/app/frontend/src/App.js`
- **Changements:**
  - Position: haut droite (top: 12px, right: 60px)
  - Largeur max: 160px (actuel: 79px)
  - Design minimaliste (fond semi-transparent noir, bordure rose)
  - Ne masque plus le bouton "Son" de la vidéo

#### 3. ALIGNEMENT COACHS (DASHBOARD)
- **Fichier:** `/app/frontend/src/components/CoachDashboard.js`
- **Changements:**
  - Layout vertical (`flex-col`) sur mobile
  - Layout horizontal (`sm:flex-row`) sur desktop
  - Bouton "Supprimer" pleine largeur sur mobile (`w-full sm:w-auto`)
  - Email avec `word-break: break-word` pour éviter débordement

#### 4. VALIDATION URLS AUDIO
- **Fichier:** `/app/frontend/src/components/CoachDashboard.js`
- **Changements:**
  - Alerte explicite si URL sans extension audio (.mp3, .wav, .ogg, etc.)
  - Confirmation requise pour ajouter une URL non-audio

### Tests validés
- ✅ Compilation frontend réussie
- ✅ Bouton LIVE visible et bien positionné (79px largeur, haut droite)
- ✅ Bouton Son accessible (bas droite, non masqué)
- ✅ Pas d'erreur React (écran rouge disparu)


---

## Silent Disco Phase 2 - Interface Épurée & Moteur DJ (19 Janvier 2026)

### Fonctionnalités implémentées

#### 1. UI ÉPURÉE (Zone Héro)
- **Bouton LIVE centré** : "🎧 REJOINDRE LE LIVE" positionné en bas au centre de la zone héro
- **Menu "⋮" (trois points)** : Icône 40px en haut à droite avec menu déroulant contenant :
  - Contrôle du volume (slider)
  - Bouton Mute/Unmute
  - Infos de session
- **z-index élevé** (100-200) pour garantir la cliquabilité sur iPhone

#### 2. MOTEUR SILENT DISCO (WebSocket)
- **Latence mesurée** : 3.4ms (bien en dessous du seuil de 200ms requis)
- **Reconnexion automatique** : Si le participant perd la connexion, tentative de reconnexion après 2 secondes
- **Commandes supportées** : PLAY, PAUSE, STOP, SEEK, TRACK_CHANGE, SESSION_START, SESSION_END
- **Indicateur "EN DIRECT"** : Badge rouge avec point animé quand connecté au live

#### 3. WEB AUDIO API (Fix Son Mobile)
- **AudioContext** initialisé au premier clic pour débloquer l'audio sur iOS
- **MediaElementSource** : Son routé vers le canal "Media" (casques/écouteurs)
- **Indicateur de synchronisation** : "⏳ Synchronisation..." pendant la reconnexion

#### 4. DASHBOARD DJ (CoachDashboard.js)
- **Section "Live Control"** simplifiée dans l'onglet Cours
- **Bouton unique par cours** : Gradient rose/violet avec icône ▶️
- **Console active** : Bouton Play/Pause central (vert pour play, rouge pour pause)
- **Navigation pistes** : Boutons Préc/Suiv et indicateur de piste actuelle
- **Code session** : Affichage avec bouton de copie
- **Bouton "TERMINER LA SÉANCE"** : Rouge pour arrêter la diffusion

### Tests validés
- ✅ Latence WebSocket : 3.4ms < 200ms
- ✅ Bouton LIVE centré et cliquable
- ✅ Menu "..." accessible (z-index 100)
- ✅ Modal de connexion fonctionnelle
- ✅ Compilation frontend réussie

### Fichiers modifiés
- `/app/frontend/src/App.js` : HeroMediaWithAudio avec menu "...", Web Audio API, reconnexion
- `/app/frontend/src/components/CoachDashboard.js` : Console DJ simplifiée


---

## Silent Disco Phase 3 - Lecture Arrière-Plan & Sécurité DJ (19 Janvier 2026)

### Fonctionnalités implémentées

#### 1. BACKGROUND AUDIO (Media Session API)
- **navigator.mediaSession.metadata** : Affiche le nom du cours et "Afroboost" sur l'écran de verrouillage
- **Artwork** : favicon.ico, logo192.png, logo512.png pour l'image sur l'écran de verrouillage
- **Contrôles désactivés** : Les handlers play/pause/seek sont mis à `null` pour empêcher le participant de contrôler
- **playbackState** : Synchronisé avec l'état de lecture (playing/paused)

#### 2. SÉCURITÉ DJ (WebSocket)
- **Double vérification** dans `handle_coach_command`:
  1. `is_coach` doit être `true` dans les infos utilisateur
  2. L'émetteur doit être le `session_coaches[session_id]` enregistré
- **Message d'erreur** : "Action non autorisée. Seul le coach peut contrôler la session."
- **Logging** : Toutes les tentatives bloquées sont loguées avec l'email de l'attaquant
- **Test validé** : Participant bloqué avec succès lors de tentative PLAY

#### 3. VISUEL "● LIVE"
- **Badge rouge** à côté du nom du cours dans la zone héro
- **Point blanc clignotant** (animation pulse) pour indiquer la connexion active
- **Style** : `background: rgba(220, 38, 38, 0.9)`, `padding: 3px 8px`, `borderRadius: 10px`

#### 4. COMPATIBILITÉ MOBILE
- **iPhone SE (320px)** : Bouton LIVE centré ✅
- **iPhone 14 Pro (390px)** : Bouton LIVE centré ✅
- **Hitbox 40px** sur le menu "⋮" pour faciliter le clic sur iPhone

### Tests validés
- ✅ Sécurité : Participant bloqué pour commande PLAY
- ✅ Bouton LIVE centré sur iPhone SE et iPhone Pro
- ✅ Compilation frontend réussie
- ✅ Backend redémarré sans erreur

### Fichiers modifiés
- `/app/frontend/src/App.js` : Media Session API, indicateur "● LIVE" à côté du titre
- `/app/backend/server.py` : Double vérification sécurité dans handle_coach_command


---

## Silent Disco Phase 4 - Fix Audio & Proxy Cloud (19 Janvier 2026)

### Problème résolu
Le système audio était bloqué car les URLs Cloud (Google Drive, Dropbox) ne sont pas directement lisibles par le lecteur HTML5.

### Fonctionnalités implémentées

#### 1. PROXY AUDIO (Conversion URLs Cloud)
- **Google Drive**: `/file/d/ID/view` → `uc?export=download&id=ID`
- **Google Drive**: `open?id=ID` → `uc?export=download&id=ID`
- **Dropbox**: `dl=0` → `dl=1` + domaine `dl.dropboxusercontent.com`
- Conversion automatique à l'ajout ET à la lecture

#### 2. LECTEUR AUDIO AMÉLIORÉ
- **Attribut `crossOrigin="anonymous"`** pour les CORS
- **Gestion d'erreur** : Affiche message rouge si lecture impossible
- **onCanPlay** : Reset l'erreur quand le fichier est chargé
- **onError** : Log console + message utilisateur

#### 3. VALIDATION URL (Dashboard Coach)
- **État `audioUrlError`** : Affiche erreur rouge immédiate
- **Formats valides** : .mp3, .wav, .ogg, .m4a, .aac, .flac, .webm
- **Cloud valides** : Google Drive, Dropbox, OneDrive
- **Conversion automatique** : Les URLs Cloud sont converties avant stockage

#### 4. NETTOYAGE UI
- ❌ Supprimé : Icônes 🎧 dans les sessions
- ❌ Supprimé : Bouton "Rejoindre l'expérience immersive" en bas
- ✅ Gardé : Bouton "REJOINDRE LE LIVE" centré dans la zone héro
- ✅ Gardé : Menu "⋮" pour Volume/Mute/Infos

### Tests validés
- ✅ Compilation frontend réussie
- ✅ Bouton LIVE centré (0px de décalage)
- ✅ Bouton "Expérience audio" supprimé

### Fichiers modifiés
- `/app/frontend/src/App.js` : Fonction `convertCloudUrlToDirect`, `isValidAudioUrl`, gestion erreur audio
- `/app/frontend/src/components/CoachDashboard.js` : Validation URL, état `audioUrlError`, conversion automatique


---

## Silent Disco Phase 5 - Console Live DJ (19 Janvier 2026)

### Fonctionnalités implémentées

#### 1. BOUTON "CONSOLE LIVE" (Onglet Cours)
- Bouton accordéon déployable avec gradient rose/violet
- Indicateur "🔴 EN DIRECT" + code session quand actif
- Compteur de participants connectés

#### 2. CONSOLE DJ DÉPLOYÉE
- **DÉMARRER LE FLUX** : Bouton vert qui lance la lecture sur tous les appareils
- **PAUSE TOUT** : Bouton rouge qui met en pause tous les participants
- **VOLUME GÉNÉRAL** : Slider avec affichage du pourcentage
- **Navigation pistes** : Précédent / Suivant avec indicateur

#### 3. CODE SESSION À 4 CHIFFRES
- Généré automatiquement au démarrage (ex: 1234, 5678...)
- Affiché en gros dans la console (font-mono, text-4xl)
- Bouton "📋 Copier" pour partager facilement
- Les participants n'ont qu'à entrer ce code pour rejoindre

#### 4. PRÉVISUALISATION AUDIO (Dashboard Coach)
- Bouton ▶ à côté de chaque piste dans la playlist
- Lecteur de prévisualisation avec barre verte
- Détection automatique des URLs invalides
- Conversion Cloud appliquée à la prévisualisation

### Tests validés
- ✅ Code à 4 chiffres "1234" fonctionne
- ✅ Coach envoie PLAY → Élève reçoit instantanément
- ✅ Compilation frontend réussie

### Fichiers modifiés
- `/app/frontend/src/components/CoachDashboard.js` : Console Live, code 4 chiffres, prévisualisation audio


---

## Monétisation Admin - Système d'Abonnement & Commissions (19 Janvier 2026)

### Fonctionnalités implémentées

#### 1. CHAMP "ABONNEMENT ACTIF" (Coach)
- Nouveau champ `subscriptionActive` (boolean) dans la collection `coach_subscriptions`
- Champ `subscriptionEndDate` pour future gestion automatique
- Badge visuel "✓ Actif" (vert) ou "✗ Inactif" (rouge) dans la liste des coachs
- Bouton toggle "▶ Activer" / "⏸ Désactiver" pour chaque coach

#### 2. BLOCAGE ACCÈS DASHBOARD
- Vérification à la connexion Google OAuth dans `/api/auth/google/callback`
- Si `subscriptionActive: false` → Message d'erreur "⛔ Votre abonnement n'est pas actif"
- Super Admin (contact.artboost@gmail.com) toujours autorisé
- Session stocke `subscription_active` pour vérifications futures

#### 3. COMMISSION 10% SUR TRANSACTIONS TWINT
- Calcul automatique à la création de réservation (`POST /api/reservations`)
- Champ `commission` ajouté à chaque réservation:
  ```json
  {
    "rate": 0.10,
    "adminAmount": 5.00,
    "coachAmount": 45.00,
    "totalAmount": 50.00
  }
  ```
- Endpoint `GET /api/admin/commissions` pour statistiques:
  - Filtres: day, week, month, year, all
  - Totaux: revenue, commission admin, part coach
  - Liste des 20 dernières transactions

### Endpoints API
- `PUT /api/coaches/{email}` : Met à jour l'abonnement
- `GET /api/admin/commissions?period=month` : Statistiques commissions

### Tests validés
- ✅ Compilation frontend réussie
- ✅ Toggle abonnement coach fonctionne
- ✅ Endpoint commissions retourne les données

### Fichiers modifiés
- `/app/backend/server.py` : Commission 10%, endpoint PUT coaches, endpoint commissions
- `/app/frontend/src/components/CoachDashboard.js` : UI gestion abonnements

### Note importante
⚠️ La commission est calculée et stockée mais le split réel de paiement Twint doit être fait manuellement. Twint ne supporte pas le split automatique.


---

## Fix Interface iPhone (19 Janvier 2026)

### Corrections appliquées

#### 1. BOUTON "REJOINDRE LE LIVE" - 100% largeur
- Position: `left: 12px, right: 12px` au lieu de `left: 50%, transform: translateX(-50%)`
- Largeur: `width: 100%` 
- Résultat: 301px (86% de la zone vidéo)
- Padding: 14px vertical, 20px horizontal
- Font: 16px bold, icône 20px

#### 2. MENU "..." - Hitbox 50px
- Taille: 50x50px (augmentée de 40px)
- Font: 24px (augmentée de 20px)
- Position: top 8px, right 8px
- Test: Position confirmée (top=283px, right=33px)

#### 3. TABLEAUX SCROLLABLES
- CSS ajouté pour `overflow-x: auto` sur tous les tableaux
- `-webkit-overflow-scrolling: touch` pour momentum scroll iOS
- `min-width: 600px` sur les tableaux pour forcer le scroll
- Scrollbar stylisée (rose/violet)
- `body { overflow-x: hidden }` pour empêcher le scroll horizontal global

### Tests validés
- ✅ iPhone (375px): Bouton LIVE 301px, Menu 50x50px
- ✅ Compilation frontend réussie

### Fichiers modifiés
- `/app/frontend/src/App.js` : Bouton LIVE pleine largeur, Menu 50px
- `/app/frontend/src/App.css` : Styles tableaux scrollables


---

## Business Model & Flux Audio Activés (19 Janvier 2026)

### Fonctionnalités implémentées

#### 1. MOTEUR AUDIO ROBUSTE - Conversion Dropbox
- URL Dropbox: `dl=0` → `raw=1` (plus fiable pour streaming)
- URL Dropbox: `www.dropbox.com` → `dl.dropboxusercontent.com`
- Ajout automatique de `raw=1` si manquant
- OneDrive: `redir` → `download`

#### 2. CONSOLE MAÎTRE (DJ) - WebSocket
- Boutons: [DÉMARRER LA SÉANCE] et [PAUSE GÉNÉRALE]
- Envoi WebSocket PLAY/PAUSE à tous les participants
- Test validé: Coach → PLAY → Participant reçoit et joue

#### 3. MONÉTISATION - Commission 10% + Verrou
- Commission 10% calculée sur chaque réservation Twint
- Champ `commission`: `{adminAmount, coachAmount, totalAmount}`
- **Verrou abonnement**: Si `subscriptionActive: false`:
  - Message "🔒 Abonnement requis" affiché
  - Bouton "DÉMARRER" désactivé et grisé
  - Super Admin (contact.artboost@gmail.com) toujours autorisé

#### 4. ÉPURATION FINALE
- Anciens boutons audio supprimés (fait précédemment)
- Seule la zone Héro gère le son
- Menu "⋮" avec 50px hitbox conservé

### Tests validés
- ✅ WebSocket: PLAY/PAUSE transmis aux participants
- ✅ Bouton LIVE: 301px de large (pleine largeur mobile)
- ✅ Menu "...": 50x50px hitbox
- ✅ Compilation frontend réussie

### Fichiers modifiés
- `/app/frontend/src/App.js` : Conversion Dropbox raw=1
- `/app/frontend/src/components/CoachDashboard.js` : Verrou abonnement sur bouton DÉMARRER

