/**
 * Netlify Function — endpoint: /.netlify/functions/promo-form-submit
 *
 * Recoit les soumissions de formulaire des landing pages promo
 * (/promo/tapis, /promo/meubles, /promo/tuiles, /promo/matelas)
 *
 * Actions:
 * 1. Forward vers webhook GHL (cree contact + opportunite)
 * 2. Envoie notification email via Netlify Email (ou fallback log)
 * 3. Retourne JSON succes/erreur
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Methode non autorisee. Utilisez POST.' }),
    };
  }

  try {
    // --- Parser le body (JSON ou form-urlencoded) ---
    let data;
    const contentType = event.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
      data = JSON.parse(event.body || '{}');
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      data = Object.fromEntries(new URLSearchParams(event.body));
    } else {
      // Tenter JSON par defaut
      try {
        data = JSON.parse(event.body || '{}');
      } catch {
        data = Object.fromEntries(new URLSearchParams(event.body));
      }
    }

    // --- Valider les champs requis ---
    const { name, phone, email, service, address, message, source } = data;

    if (!name || !phone) {
      return {
        statusCode: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Champs requis manquants: name, phone',
        }),
      };
    }

    // --- Construire le payload pour GHL ---
    const ghlPayload = {
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || '',
      phone: phone,
      email: email || '',
      address1: address || '',
      tags: [`promo-${service || 'general'}`, 'lead-web', 'landing-page'],
      source: source || 'Landing Page Promo',
      customField: {
        service_demande: service || '',
        message_client: message || '',
        page_source: source || '',
        date_soumission: new Date().toISOString(),
      },
    };

    // --- Forward vers webhook GHL ---
    const GHL_WEBHOOK_URL = process.env.GHL_WEBHOOK_URL;
    let ghlResult = null;

    if (GHL_WEBHOOK_URL) {
      const ghlResponse = await fetch(GHL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ghlPayload),
      });

      if (ghlResponse.ok) {
        try {
          ghlResult = await ghlResponse.json();
        } catch {
          ghlResult = { status: 'ok', statusCode: ghlResponse.status };
        }
        console.log('Lead envoye a GHL avec succes:', name, phone);
      } else {
        const errorText = await ghlResponse.text();
        console.error(`Erreur GHL webhook (${ghlResponse.status}):`, errorText);
        // On continue quand meme - le lead ne doit pas etre perdu
      }
    } else {
      console.warn('GHL_WEBHOOK_URL non configure. Lead non envoye a GHL.');
    }

    // --- Notification email (via webhook email ou log) ---
    const EMAIL_WEBHOOK_URL = process.env.EMAIL_WEBHOOK_URL;

    if (EMAIL_WEBHOOK_URL) {
      const emailPayload = {
        to: 'info@groupenettoyageempire.com',
        subject: `Nouveau lead promo - ${service || 'General'} - ${name}`,
        body: [
          `Nouveau lead depuis la landing page promo`,
          ``,
          `Nom: ${name}`,
          `Telephone: ${phone}`,
          `Email: ${email || 'Non fourni'}`,
          `Service: ${service || 'Non precise'}`,
          `Adresse: ${address || 'Non fournie'}`,
          `Message: ${message || 'Aucun'}`,
          `Source: ${source || 'Landing page'}`,
          `Date: ${new Date().toLocaleString('fr-CA', { timeZone: 'America/Montreal' })}`,
        ].join('\n'),
      };

      try {
        await fetch(EMAIL_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailPayload),
        });
        console.log('Notification email envoyee pour:', name);
      } catch (emailErr) {
        console.error('Erreur envoi email:', emailErr.message);
      }
    } else {
      // Fallback: log complet du lead pour ne rien perdre
      console.log('=== NOUVEAU LEAD PROMO ===');
      console.log(JSON.stringify({ name, phone, email, service, address, message, source }, null, 2));
      console.log('==========================');
    }

    // --- Reponse succes ---
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Merci! Nous vous contacterons sous peu.',
        ghl: ghlResult ? 'sent' : 'skipped',
      }),
    };

  } catch (error) {
    console.error('Erreur promo-form-submit:', error);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Une erreur est survenue. Veuillez reessayer ou appeler le (450) 977-4636.',
      }),
    };
  }
};
