import type { APIRoute } from 'astro';

export const POST: APIRoute = async () => {
    // TwiML to forward the call to the Admin
    // Using the same 514 number
    const adminPhone = '+15148939939';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>${adminPhone}</Dial>
</Response>`;

    return new Response(twiml, {
        headers: {
            'Content-Type': 'text/xml'
        }
    });
};
