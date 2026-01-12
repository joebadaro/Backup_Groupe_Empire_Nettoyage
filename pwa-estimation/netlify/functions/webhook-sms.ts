import type { Handler } from '@netlify/functions';
import twilio from 'twilio';

export const handler: Handler = async (event) => {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Admin phone to forward messages TO
    const adminPhone = '+15148939939';

    try {
        const params = new URLSearchParams(event.body || '');
        const from = params.get('From');
        const body = params.get('Body');

        if (!from || !body) {
            return { statusCode: 400, body: 'Missing From or Body' };
        }

        console.log(`📩 Incoming SMS from ${from}: ${body}`);

        if (accountSid && authToken && twilioPhoneNumber) {
            const client = twilio(accountSid, authToken);

            // Forward to Admin
            await client.messages.create({
                body: `📩 Réponse de ${from}: ${body}`,
                from: twilioPhoneNumber,
                to: adminPhone
            });
            console.log("✅ Message forwarded to admin.");
        } else {
            console.error("Missing Twilio Credentials in Environment");
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/xml' },
            body: '<Response></Response>'
        };

    } catch (error) {
        console.error('Error forwarding SMS:', error);
        return { statusCode: 500, body: 'Internal Server Error' };
    }
};
