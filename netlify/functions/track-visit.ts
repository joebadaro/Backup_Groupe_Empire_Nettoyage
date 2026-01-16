import twilio from "twilio";

export default async (req: Request, context: any) => {
    // Only allow POST requests (or GET if preferred, but POST is safer for triggers)
    // For simplicity here, we'll allow any method since it's just a trigger.

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const toNumber = process.env.TO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
        console.error("Missing Twilio credentials");
        return new Response(JSON.stringify({ error: "Configuration error" }), { status: 500 });
    }

    const client = twilio(accountSid, authToken);

    // Extract city from Netlify headers
    // Header is x-nf-geo-city
    const city = req.headers.get("x-nf-geo-city") || "Unknown City";
    const country = req.headers.get("x-nf-geo-country-code") || "Unknown Country";

    const messageBody = `🔔 New Visitor!\n📍 Location: ${city}, ${country}\n⏰ Time: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })}`;

    try {
        await client.messages.create({
            body: messageBody,
            from: fromNumber,
            to: toNumber,
        });

        console.log(`SMS sent for visitor from ${city}`);
        return new Response(JSON.stringify({ success: true, city }), { status: 200 });
    } catch (error: any) {
        console.error("Twilio Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
