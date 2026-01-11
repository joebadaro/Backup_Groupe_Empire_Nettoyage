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
        const isCommercial = formData.get('isCommercial') as string; // Check flag
        const callBackRequested = formData.get('callBackRequested') as string || 'no';
        const adminEmail = 'info@groupenettoyageempire.com';

        console.log('Received Estimate Request:', {
            clientName,
            clientEmail,
            deliveryMethod,
            pdfSize: pdfBlob ? pdfBlob.size : 0,
            isCommercial
        });

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
            <p><strong>Téléphone:</strong> ${clientPhone || 'Non fourni'}</p>
            <p><strong>Adresse:</strong> ${clientStreet || ''} ${clientApt ? '#' + clientApt : ''}, ${clientCity || ''} ${clientPostal || ''}</p>
            ${clientNotes ? `<p><strong>Notes:</strong><br>${clientNotes}</p>` : ''}
            <p><strong>Demande de rendez-vous :</strong> ${callBackRequested === 'yes' ? 'Oui' : 'Non'}</p>
            <hr>
            <p><strong>Détails Techniques:</strong></p>
            <p><strong>Email:</strong> ${clientEmail || 'Non fourni'}</p>
            <p><strong>Type:</strong> ${isCommercial === 'true' ? 'COMMERCIAL' : 'Résidentiel'}</p>
            <p><strong>Méthode de livraison:</strong> ${deliveryMethod === 'sms' ? 'SMS' : 'Email'}</p>
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
            throw adminErr;
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
            ` : (callBackRequested === 'yes' ? `
              <h1>Bonjour ${clientName}</h1>
              <p>Voici l’estimation que vous avez demandée.</p>
              <p>Un membre de notre équipe vous contactera sous peu afin de planifier votre rendez vous.</p>
              <p>Vous pouvez également nous joindre directement par téléphone au 514-893-9939.</p>
              <p>L’équipe Groupe Nettoyage Empire</p>
            ` : `
              <h1>Bonjour ${clientName}</h1>
              <p>Voici l’estimation que vous avez demandée.</p>
              <p>Si vous souhaitez planifier un rendez-vous ou obtenir des informations supplémentaires, vous pouvez nous joindre directement par téléphone au 514-893-9939 ou simplement répondre à ce courriel.</p>
              <p>Cordialement,<br>L’équipe Groupe Nettoyage Empire</p>
            `),
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
            }
        } else {
            console.log('No client email provided (likely SMS selected). Skipping client email.');
        }

        // 3. Send SMS to Client (if SMS selected + phone provided)
        if (deliveryMethod === 'sms' && clientPhone) {
            console.log(`Attempting to send SMS to Client (${clientPhone})...`);

            const missingCreds: string[] = [];
            if (!accountSid) missingCreds.push('TWILIO_ACCOUNT_SID');
            if (!authToken) missingCreds.push('TWILIO_AUTH_TOKEN');
            if (!twilioPhoneNumber) missingCreds.push('TWILIO_PHONE_NUMBER');
            if (!supabaseUrl) missingCreds.push('SUPABASE_URL');
            if (!supabaseKey) missingCreds.push('SUPABASE_KEY');

            if (missingCreds.length === 0) {
                try {

                    // Initialize Twilio
                    const client = twilio(accountSid, authToken);

                    // Initialize Supabase and Upload PDF for ALL SMS (Commercial & Residential)
                    const supabase = createClient(supabaseUrl, supabaseKey);
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
                        console.error("Supabase Upload Error:", uploadError);
                        throw new Error(`Supabase Upload Error: ${uploadError.message}`);
                    }

                    const { data: { publicUrl } } = supabase
                        .storage
                        .from('estimates')
                        .getPublicUrl(filename);

                    console.log(`PDF Hosted at: ${publicUrl}`);

                    // Message body differs based on Commercial vs Residential
                    let messageBody = '';

                    if (isCommercial === 'true') {
                        // --- COMMERCIAL SMS (with PDF) ---
                        if (lang === 'en') {
                            messageBody = "Thank you for contacting Groupe Nettoyage Empire. Our team will analyze your request. Your estimate will follow shortly. If additional information is required, a team member will contact you.";
                        } else {
                            messageBody = "Merci d'avoir contacté Groupe Nettoyage Empire. Notre équipe analysera votre demande. Votre estimation suivra sous peu. Si des informations supplémentaires sont requises, un membre de notre équipe communiquera avec vous.";
                        }
                    } else {
                        // --- RESIDENTIAL SMS (with PDF) ---
                        // --- RESIDENTIAL SMS (with PDF) ---
                        if (callBackRequested === 'yes') {
                            messageBody = `Bonjour ${clientName}, voici l’estimation que vous avez demandée. Un membre de notre équipe vous contactera sous peu afin de planifier votre rendez vous. 514-893-9939 - Groupe Nettoyage Empire`;
                            if (lang === 'en') {
                                messageBody = `Hello ${clientName}, here is the estimate you requested. A member of our team will contact you shortly to schedule your appointment. 514-893-9939 - Groupe Nettoyage Empire`;
                            }
                        } else {
                            messageBody = `Merci d’avoir contacté Groupe Nettoyage Empire, voici votre estimé.\nSi vous souhaitez planifier un rendez-vous ou obtenir plus d’informations, vous pouvez nous joindre au 514-893-9939 par téléphone ou par message texte, selon votre préférence.\nMerci et à bientôt.`;
                            if (lang === 'en') {
                                messageBody = `Thank you for contacting Groupe Nettoyage Empire. If you would like to schedule an appointment, simply reply "YES" and a team member will contact you shortly. You can also reach us directly at 514-893-9939.`;
                            }
                        }
                    }

                    console.log('DEBUG MSG BODY:', messageBody);

                    const message = await client.messages.create({
                        body: messageBody,
                        from: twilioPhoneNumber,
                        to: clientPhone,
                        mediaUrl: [publicUrl] // PDF included for both Commercial & Residential
                    });

                    console.log('✅ SMS sent successfully (LIVE). SID:', message.sid);

                    // --- ADMIN COPY ---
                    // Send DETAILED message (with PDF) to the admin/owner
                    const adminPhone = '+15148939939';
                    try {
                        const fullAddress = `${clientStreet || ''} ${clientApt ? '#' + clientApt : ''}, ${clientCity || ''} ${clientPostal || ''}`.trim();

                        const adminBody = `[NOUVELLE ESTIMATION]\nClient: ${clientName}\nTel: ${clientPhone}\nAdresse: ${fullAddress}\nNotes: ${clientNotes || 'Aucune'}\nDemande de rendez-vous : ${callBackRequested === 'yes' ? 'Oui' : 'Non'}`;

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
