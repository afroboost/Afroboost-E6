// emailService.js - Service d'envoi d'emails automatisés via EmailJS
// Compatible Vercel - Clés configurables via Admin ou variables d'environnement
import emailjs from '@emailjs/browser';

// === CONFIGURATION PAR DÉFAUT ===
// Ces valeurs peuvent être remplacées par les variables d'environnement Vercel
// ou par la configuration stockée dans localStorage
const DEFAULT_CONFIG = {
  serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID || '',
  templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID || '',
  publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY || ''
};

// Clé localStorage pour la configuration admin
const EMAILJS_CONFIG_KEY = 'afroboost_emailjs_config';

/**
 * Récupère la configuration EmailJS (localStorage > env vars)
 */
export const getEmailJSConfig = () => {
  try {
    const stored = localStorage.getItem(EMAILJS_CONFIG_KEY);
    if (stored) {
      const config = JSON.parse(stored);
      // Retourne la config stockée si elle a des valeurs
      if (config.serviceId && config.templateId && config.publicKey) {
        return config;
      }
    }
  } catch (e) {
    console.error('Error reading EmailJS config:', e);
  }
  return DEFAULT_CONFIG;
};

/**
 * Sauvegarde la configuration EmailJS dans localStorage
 */
export const saveEmailJSConfig = (config) => {
  try {
    localStorage.setItem(EMAILJS_CONFIG_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('Error saving EmailJS config:', e);
    return false;
  }
};

/**
 * Vérifie si EmailJS est configuré
 */
export const isEmailJSConfigured = () => {
  const config = getEmailJSConfig();
  return !!(config.serviceId && config.templateId && config.publicKey);
};

/**
 * Initialise EmailJS avec la clé publique
 */
export const initEmailJS = () => {
  const config = getEmailJSConfig();
  if (config.publicKey) {
    emailjs.init(config.publicKey);
    return true;
  }
  return false;
};

/**
 * Envoie un email à un destinataire unique
 * @param {Object} params - Paramètres du template
 * @param {string} params.to_email - Email du destinataire
 * @param {string} params.to_name - Nom du destinataire
 * @param {string} params.subject - Sujet de l'email
 * @param {string} params.message - Corps du message
 * @param {string} [params.media_url] - URL du média (optionnel)
 * @returns {Promise<Object>} Résultat de l'envoi
 */
export const sendEmail = async (params) => {
  const config = getEmailJSConfig();
  
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    throw new Error('EmailJS non configuré. Veuillez configurer les clés dans l\'onglet Campagnes.');
  }

  // Personnaliser le message avec le prénom
  let personalizedMessage = params.message;
  if (params.to_name) {
    const firstName = params.to_name.split(' ')[0];
    personalizedMessage = params.message.replace(/{prénom}/gi, firstName);
  }

  // Ajouter le média au message si présent
  const fullMessage = params.media_url 
    ? `${personalizedMessage}\n\n🔗 Voir le visuel: ${params.media_url}`
    : personalizedMessage;

  const templateParams = {
    to_email: params.to_email,
    to_name: params.to_name || 'Client',
    subject: params.subject || 'Afroboost - Message',
    message: fullMessage,
    from_name: 'Afroboost',
    reply_to: 'contact.artboost@gmail.com'
  };

  try {
    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      config.publicKey
    );
    return { success: true, response };
  } catch (error) {
    console.error('EmailJS send error:', error);
    return { success: false, error: error.text || error.message };
  }
};

/**
 * Envoie des emails en masse avec progression
 * @param {Array} recipients - Liste des destinataires [{email, name}]
 * @param {Object} campaign - Données de la campagne {name, message, mediaUrl}
 * @param {Function} onProgress - Callback de progression (current, total, status)
 * @returns {Promise<Object>} Résultats {sent, failed, errors}
 */
export const sendBulkEmails = async (recipients, campaign, onProgress) => {
  const results = {
    sent: 0,
    failed: 0,
    errors: [],
    details: []
  };

  const total = recipients.length;

  // Initialiser EmailJS
  if (!initEmailJS()) {
    return {
      ...results,
      failed: total,
      errors: ['EmailJS non configuré']
    };
  }

  // Envoyer les emails un par un avec délai pour éviter le rate limiting
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    // Callback de progression
    if (onProgress) {
      onProgress(i + 1, total, 'sending', recipient.name || recipient.email);
    }

    try {
      const result = await sendEmail({
        to_email: recipient.email,
        to_name: recipient.name,
        subject: campaign.name,
        message: campaign.message,
        media_url: campaign.mediaUrl
      });

      if (result.success) {
        results.sent++;
        results.details.push({
          email: recipient.email,
          name: recipient.name,
          status: 'sent'
        });
      } else {
        results.failed++;
        results.errors.push(`${recipient.email}: ${result.error}`);
        results.details.push({
          email: recipient.email,
          name: recipient.name,
          status: 'failed',
          error: result.error
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`${recipient.email}: ${error.message}`);
      results.details.push({
        email: recipient.email,
        name: recipient.name,
        status: 'failed',
        error: error.message
      });
    }

    // Délai entre les envois (200ms) pour éviter le rate limiting
    if (i < recipients.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Callback final
  if (onProgress) {
    onProgress(total, total, 'completed');
  }

  return results;
};

/**
 * Teste la configuration EmailJS en envoyant un email de test
 * @param {string} testEmail - Email de test
 * @returns {Promise<Object>} Résultat du test
 */
export const testEmailJSConfig = async (testEmail) => {
  return sendEmail({
    to_email: testEmail,
    to_name: 'Test',
    subject: 'Test EmailJS - Afroboost',
    message: '🎉 Félicitations ! Votre configuration EmailJS fonctionne correctement.\n\nCe message a été envoyé automatiquement pour tester l\'intégration.'
  });
};

export default {
  getEmailJSConfig,
  saveEmailJSConfig,
  isEmailJSConfigured,
  initEmailJS,
  sendEmail,
  sendBulkEmails,
  testEmailJSConfig
};
