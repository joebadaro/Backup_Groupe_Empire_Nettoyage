import twilio from 'twilio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
    console.error('❌ Missing Twilio Credentials in .env');
    process.exit(1);
}

const client = twilio(accountSid, authToken);
const SITE_URL = 'https://groupe-empire-2026.netlify.app';

async function configureTwilio() {
    console.log('🔄 Fetching Twilio Phone Numbers...');
    try {
        const numbers = await client.incomingPhoneNumbers.list({ limit: 5 });

        if (numbers.length === 0) {
            console.error('❌ No phone numbers found on this account.');
            return;
        }

        for (const number of numbers) {
            console.log(`Found Number: ${number.phoneNumber} (${number.friendlyName})`);

            // We update ALL numbers found (assuming he only has the one business number)
            // Or we could filter by +1450... but user context implies only one active line for this.

            console.log(`   👉 Updating Voice & SMS URLs...`);

            await client.incomingPhoneNumbers(number.sid).update({
                voiceUrl: `${SITE_URL}/api/incoming-call`,
                voiceMethod: 'POST',
                smsUrl: `${SITE_URL}/api/incoming-sms`,
                smsMethod: 'POST'
            });

            console.log(`   ✅ SUCCESS! Updated ${number.phoneNumber}`);
            console.log(`      Voice: ${SITE_URL}/api/incoming-call`);
            console.log(`      SMS:   ${SITE_URL}/api/incoming-sms`);
        }

    } catch (error) {
        console.error('❌ Error configuring Twilio:', error);
    }
}

configureTwilio();
