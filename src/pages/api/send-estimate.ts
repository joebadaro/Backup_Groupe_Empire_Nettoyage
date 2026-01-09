import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
    const appPassword = import.meta.env.GMAIL_APP_PASSWORD;
    const accountSid = import.meta.env.TWILIO_ACCOUNT_SID;
    const authToken = import.meta.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = import.meta.env.TWILIO_PHONE_NUMBER;
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseKey = import.meta.env.SUPABASE_KEY;

    if (!appPassword) {
        return new Response(JSON.stringify({ error: 'Missing GMAIL_APP_PASSWORD' }), { status: 500 });
    }

    // Create Transporter (Gmail)
    console.log('Attempts to create transporter...');
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'joebadaro@gmail.com',
            pass: appPassword.replace(/\s+/g, '')
        }
    });

    try {
        const formData = await request.formData();
        const pdfBlob = formData.get('pdf') as Blob;
        const clientEmail = formData.get('clientEmail') as string;
        const clientName = formData.get('clientName') as string;
        const clientPhone = formData.get('clientPhone') as string;
        const clientCity = formData.get('clientCity') as string;
        const clientNotes = formData.get('clientNotes') as string;
        const clientStreet = formData.get('clientStreet') as string;
        const clientApt = formData.get('clientApt') as string;
        const clientPostal = formData.get('clientPostal') as string;
        const total = formData.get('total') as string; // Ideally passed from frontend, otherwise 0
        const summary = formData.get('summary') as string; // Text summary of items
        const deliveryMethod = formData.get('deliveryMethod') as string;
        const lang = formData.get('lang') as string || 'fr';
        const adminEmail = 'info@groupenettoyageempire.com';

        console.log('Received Estimate Request:', {
            clientName,
            clientEmail,
            deliveryMethod,
            pdfSize: pdfBlob ? pdfBlob.size : 0,
            _timestamp: 'DEBUG_CHECK_2026_01_05_TIMESTAMP'
        });
        console.log('!!! EXECUTING NEW SEND-ESTIMATE CODE - VERSION 2026-01-05 !!!');

        if (!pdfBlob) {
            console.error('Error: No PDF file attached');
            return new Response(JSON.stringify({ error: 'No PDF file attached' }), { status: 400 });
        }

        // Convert Blob to Buffer for Nodemailer and Supabase
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Send Email to Admin (Self-mail)
        console.log(`Sending email to Admin (${adminEmail})...`);
        try {
            const adminInfo = await transporter.sendMail({
                from: `"Groupe Nettoyage Empire" <info@groupenettoyageempire.com>`,
                to: adminEmail,
                subject: `Nouvelle Estimation: ${clientName} (${clientCity})`,
                html: `
            <h1>Nouvelle demande d'estimation</h1>
            <p><strong>Client:</strong> ${clientName}</p>
            <p><strong>Email:</strong> ${clientEmail || 'Non fourni'}</p>
            <p><strong>Téléphone:</strong> ${clientPhone || 'Non fourni'}</p>
            <p><strong>Ville:</strong> ${clientCity || 'Non fourni'}</p>
            <p><strong>Méthode de livraison:</strong> ${deliveryMethod === 'sms' ? 'SMS' : 'Email'}</p>
            ${clientNotes ? `<p><strong>Notes:</strong><br>${clientNotes}</p>` : ''}
            <hr>
            <p>Veuillez trouver l'estimation PDF ci-jointe.</p>
          `,
                attachments: [
                    {
                        filename: `Estimation_${clientName.replace(/\s+/g, '_')}.pdf`,
                        content: buffer,
                        contentType: 'application/pdf'
                    },
                ],
            });
            console.log('Admin email sent:', adminInfo.messageId);
        } catch (adminErr) {
            console.error('Failed to send admin email:', adminErr);
            throw adminErr; // Re-throw to trigger catch block
        }

        // 2. Send Email to Client (if email is provided)
        if (clientEmail) {
            console.log(`Sending email to Client (${clientEmail})...`);
            try {
                const clientInfo = await transporter.sendMail({
                    from: `"Groupe Nettoyage Empire" <info@groupenettoyageempire.com>`,
                    to: clientEmail,
                    subject: lang === 'en' ? 'Your Estimate - Groupe Nettoyage Empire' : 'Votre Estimation - Groupe Nettoyage Empire',
                    html: lang === 'en' ? `
              <h1>Thank you for your request, ${clientName}!</h1>
              <p>Here is the estimate you requested.</p>
              <p>Our team will contact you shortly to confirm the details.</p>
              <p>Best regards,<br>The Groupe Nettoyage Empire Team</p>
            ` : `
              <h1>Merci pour votre demande, ${clientName}!</h1>
              <p>Voici l'estimation que vous avez demandée.</p>
              <p>Notre équipe vous contactera sous peu pour confirmer les détails.</p>
              <p>Cordialement,<br>L'équipe Groupe Nettoyage Empire</p>
            `,
                    attachments: [
                        {
                            filename: `Estimation_GroupeEmpire.pdf`,
                            content: buffer,
                            contentType: 'application/pdf'
                        },
                    ],
                });
                console.log('Client email sent:', clientInfo.messageId);
            } catch (clientErr) {
                console.error('Failed to send client email:', clientErr);
                // Don't fail the whole request if client email fails, just log it? 
                // Or maybe we should warn logic? For now let's just log.
            }
        } else {
            console.log('No client email provided (likely SMS selected). Skipping client email.');
        }

        // 3. Send SMS to Client (if SMS selected + phone provided)
        if (deliveryMethod === 'sms' && clientPhone) {
            console.log(`Attempting to send SMS to Client (${clientPhone})...`);

            const missingCreds = [];
            if (!accountSid) missingCreds.push('TWILIO_ACCOUNT_SID');
            if (!authToken) missingCreds.push('TWILIO_AUTH_TOKEN');
            if (!twilioPhoneNumber) missingCreds.push('TWILIO_PHONE_NUMBER');
            if (!supabaseUrl) missingCreds.push('SUPABASE_URL');
            if (!supabaseKey) missingCreds.push('SUPABASE_KEY');

            if (missingCreds.length === 0) {
                try {
                    // Initialize Supabase
                    const supabase = createClient(supabaseUrl, supabaseKey);

                    // Upload PDF to Supabase Storage
                    // Filename includes client name for better identification
                    const filename = `Estimation_${clientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
                    console.log(`Uploading PDF to Supabase: ${filename}...`);

                    const { data: uploadData, error: uploadError } = await supabase
                        .storage
                        .from('estimates')
                        .upload(filename, buffer, {
                            contentType: 'application/pdf',
                            cacheControl: '3600',
                            upsert: false
                        });

                    if (uploadError) {
                        throw new Error(`Supabase Upload Error: ${uploadError.message}`);
                    }

                    // Get Public URL
                    const { data: { publicUrl } } = supabase
                        .storage
                        .from('estimates')
                        .getPublicUrl(filename);

                    console.log(`PDF Hosted at: ${publicUrl}`);

                    // Initialize Twilio
                    const client = twilio(accountSid, authToken);

                    // Single SMS with PDF + Call to Action
                    let messageBody = `Merci d'avoir contacté Groupe Nettoyage Empire.\n\n📄 Votre fichier: Estimation (${clientName})\n\nSi vous désirez un rendez-vous, répondez simplement par OUI pour qu'un membre de notre équipe vous contacte sous peu, ou appelez-nous directement au 514-893-9939.`;

                    if (lang === 'en') {
                        messageBody = `Thank you for contacting Groupe Nettoyage Empire.\n\n📄 Your file: Estimate (${clientName})\n\nIf you would like an appointment, simply reply YES so a team member can contact you shortly, or call us directly at 514-893-9939.`;
                    }
                    console.log('DEBUG MSG BODY:', messageBody);

                    const message = await client.messages.create({
                        body: messageBody,
                        from: twilioPhoneNumber,
                        to: clientPhone,
                        mediaUrl: [publicUrl]
                    });

                    console.log('✅ SMS (MMS) sent successfully (LIVE). SID:', message.sid);

                    // --- ADMIN COPY ---
                    // Send DETAILED message (with PDF) to the admin/owner
                    const adminPhone = '+15148939939';
                    try {
                        const fullAddress = `${clientStreet || ''} ${clientApt ? '#' + clientApt : ''}, ${clientCity || ''} ${clientPostal || ''}`.trim();

                        const adminBody = `[NOUVELLE ESTIMATION]\nClient: ${clientName}\nTel: ${clientPhone}\nAdresse: ${fullAddress}\nNotes: ${clientNotes || 'Aucune'}`;

                        const adminMsg = await client.messages.create({
                            body: adminBody,
                            from: twilioPhoneNumber,
                            to: adminPhone,
                            mediaUrl: [publicUrl]
                        });
                        console.log('✅ Admin Copy sent. SID:', adminMsg.sid);
                    } catch (adminSmsErr) {
                        console.error('⚠️ Failed to send Admin Copy:', adminSmsErr);
                    }
                    // ------------------

                } catch (smsErr) {
                    console.error('❌ Failed to send SMS/MMS (LIVE):', smsErr);
                    // Do not fail the whole request, just log error
                }
            } else {
                // DRY RUN MODE
                console.warn(`⚠️ Skipping live SMS: Missing credentials (${missingCreds.join(', ')}). Switching to DRY RUN.`);

                console.log('================= SMS DRY RUN =================');
                console.log(`From (Env): ${twilioPhoneNumber || '[MISSING]'}`);
                console.log(`To: ${clientPhone}`);
                console.log(`Body: Bonjour ${clientName}, ... Total: ${total}$ ...`);
                console.log(`Media URL (Simulated): [SUPABASE-PDF-LINK]`);
                console.log('===============================================');
            }
        }

        return new Response(JSON.stringify({ success: true, message: 'Estimates processed successfully' }), { status: 200 });

    } catch (error) {
        console.error('Backend Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process request', details: error }), { status: 500 });
    }
};
