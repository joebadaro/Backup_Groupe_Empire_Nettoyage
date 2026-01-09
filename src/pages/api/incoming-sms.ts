import type { APIRoute } from 'astro';
import twilio from 'twilio';

export const POST: APIRoute = async ({ request }) => {
    const accountSid = import.meta.env.TWILIO_ACCOUNT_SID;
    const authToken = import.meta.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = import.meta.env.TWILIO_PHONE_NUMBER;

    // Admin phone to forward messages TO
    const adminPhone = '+15148939939';

    try {
        const formData = await request.formData();
        const from = formData.get('From') as string;
        const body = formData.get('Body') as string;

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
        }

        // Return TwiML to Twilio (empty response to acknowledge receipt)
        const MessagingResponse = twilio.twiml.MessagingResponse;
        const response = new MessagingResponse();

        return new Response(response.toString(), {
            headers: { 'Content-Type': 'text/xml' }
        });

    } catch (error) {
        console.error("Error processing incoming SMS:", error);
        return new Response("Error", { status: 500 });
    }
};
