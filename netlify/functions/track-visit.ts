import twilio from "twilio";

export default async (req: Request, context: any) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const toNumber = process.env.TO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber || !toNumber) {
        console.error("Missing Twilio credentials");
        return new Response(JSON.stringify({ error: "Configuration error" }), { status: 500 });
    }

    const client = twilio(accountSid, authToken);

    // Get visitor IP from headers
    const visitorIP = req.headers.get("x-forwarded-for")?.split(",")[0] ||
        req.headers.get("x-real-ip") ||
        "Unknown IP";

    let city = "Unknown City";
    let country = "Unknown Country";

    // Try to get location from IP using ip-api.com (free, no key required)
    try {
        if (visitorIP !== "Unknown IP") {
            const geoResponse = await fetch(`http://ip-api.com/json/${visitorIP}`);
            const geoData = await geoResponse.json();

            if (geoData.status === "success") {
                city = geoData.city || "Unknown City";
                country = geoData.country || "Unknown Country";
            }
        }
    } catch (error) {
        console.error("Geolocation API error:", error);
        // Fallback to Netlify headers
        city = req.headers.get("x-nf-geo-city") || "Unknown City";
        country = req.headers.get("x-nf-geo-country-code") || "Unknown Country";
    }

    const messageBody = `🔔 New Visitor!\n📍 Location: ${city}, ${country}\n⏰ Time: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })}`;

    try {
        await client.messages.create({
            body: messageBody,
            from: fromNumber,
            to: toNumber,
        });

        console.log(`SMS sent for visitor from ${city}`);
        return new Response(JSON.stringify({ success: true, city, country }), { status: 200 });
    } catch (error: any) {
        console.error("Twilio Error:", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
