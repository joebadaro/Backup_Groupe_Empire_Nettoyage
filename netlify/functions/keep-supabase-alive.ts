import nodemailer from 'nodemailer';

export default async (req: Request) => {
    // 1. Get credentials from Netlify Environment Variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    const adminEmail = 'info@groupenettoyageempire.com';

    // 2. Logging for debug (visible in Netlify Function Logs)
    console.log(`[Keep-Alive] Triggered at ${new Date().toISOString()}`);

    if (!supabaseUrl || !supabaseKey || !gmailAppPassword) {
        console.error('[Keep-Alive] Error: Missing Creds (SUPABASE_URL, SUPABASE_KEY, or GMAIL_APP_PASSWORD)');
        return new Response('Configuration Error: Missing Credentials', { status: 500 });
    }

    // 3. Ping Supabase Storage
    const baseUrl = supabaseUrl.replace(/\/$/, '');
    const endpoint = `${baseUrl}/storage/v1/object/list/estimates`;

    console.log(`[Keep-Alive] Pinging: ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prefix: '',
                limit: 1,
                offset: 0,
                sortBy: { column: 'name', order: 'desc' }
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`[Keep-Alive] API Error ${response.status}: ${text}`);
            return new Response(`Supabase API Error: ${text}`, { status: 500 });
        }

        const data = await response.json();
        const fileCount = Array.isArray(data) ? data.length : 0;

        console.log(`[Keep-Alive] Success! Activity registered. Found ${fileCount} files.`);

        // 4. Send Confirmation Email (Only on Success)
        console.log('[Keep-Alive] Sending confirmation email...');

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'joebadaro@gmail.com',
                pass: gmailAppPassword.replace(/\s+/g, '')
            }
        });

        await transporter.sendMail({
            from: `"Groupe Nettoyage Empire" <info@groupenettoyageempire.com>`,
            to: adminEmail,
            subject: 'Supabase Wake-Up: Success',
            html: `
                <h2>Supabase Activity Registered</h2>
                <p><strong>Status:</strong> Success ✅</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString('fr-CA', { timeZone: 'America/New_York' })}</p>
                <p><strong>Details:</strong> The system successfully connected to your Supabase project (Estimates Bucket).</p>
                <p><strong>Files Found:</strong> ${fileCount}</p>
                <hr>
                <p><em>This is an automated message to confirm your database is active and will not be paused.</em></p>
            `,
        });

        console.log('[Keep-Alive] Email sent successfully.');

        return new Response(JSON.stringify({
            success: true,
            message: 'Supabase activity registered + Email Sent.',
            filesFound: fileCount
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Keep-Alive] Network or logic error:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
