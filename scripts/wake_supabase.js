import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Load Environment Variables manually (robust parser)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env');

let supabaseUrl = '';
let supabaseKey = '';

console.log(`Reading .env from: ${envPath}`);

try {
    if (!fs.existsSync(envPath)) {
        console.error('ERROR: .env file not found!');
        process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split(/\r?\n/); // Handle Windows/Unix newlines

    console.log('Keys found in .env:');

    for (const line of lines) {
        // Match KEY=VALUE, handling leading/trailing whitespace
        const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)?$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2] ? match[2].trim() : '';

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            console.log(` - ${key}`);

            if (key === 'SUPABASE_URL') supabaseUrl = value;
            if (key === 'SUPABASE_KEY') supabaseKey = value;
        }
    }
} catch (e) {
    console.error('Error reading .env file:', e);
    process.exit(1);
}

if (!supabaseUrl || !supabaseKey) {
    console.error('\nError: Could not find SUPABASE_URL or SUPABASE_KEY in .env');
    console.log('Required keys not found. Please check your .env file.');
    process.exit(1);
}

// 2. Call Supabase Storage API using fetch
async function wakeUp() {
    console.log(`\nPinging Supabase Project: ${supabaseUrl}`);

    // Using the Storage API to list files in 'estimates' bucket
    // Endpoint: POST /storage/v1/object/list/:bucketName
    // NOTE: If SUPABASE_URL ends with trailing slash, remove it or handle it.
    const baseUrl = supabaseUrl.replace(/\/$/, '');
    const endpoint = `${baseUrl}/storage/v1/object/list/estimates`;

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
                limit: 5,
                offset: 0,
                sortBy: { column: 'name', order: 'desc' }
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error ${response.status}: ${text}`);
        }

        const data = await response.json();
        console.log('✅ Success! Supabase activity registered.');
        console.log(`Found ${data.length} files in 'estimates' bucket.`);

        if (data.length > 0) {
            console.log('Sample file:', data[0].name);
        }

    } catch (error) {
        console.error('❌ Failed to ping Supabase:', error);
        process.exit(1);
    }
}

wakeUp();
