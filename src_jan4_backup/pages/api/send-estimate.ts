
import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

export const POST: APIRoute = async ({ request }) => {
    const appPassword = import.meta.env.GMAIL_APP_PASSWORD;
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
        const deliveryMethod = formData.get('deliveryMethod') as string;
        const adminEmail = 'info@groupenettoyageempire.com';

        console.log('Received Estimate Request:', {
            clientName,
            clientEmail,
            deliveryMethod,
            pdfSize: pdfBlob ? pdfBlob.size : 0
        });

        if (!pdfBlob) {
            console.error('Error: No PDF file attached');
            return new Response(JSON.stringify({ error: 'No PDF file attached' }), { status: 400 });
        }

        // Convert Blob to Buffer for Nodemailer
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
                    subject: 'Votre Estimation - Groupe Nettoyage Empire',
                    html: `
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

        return new Response(JSON.stringify({ success: true, message: 'Emails sent successfully' }), { status: 200 });

    } catch (error) {
        console.error('SMTP Error (General):', error);
        return new Response(JSON.stringify({ error: 'Failed to send email', details: error }), { status: 500 });
    }
};
