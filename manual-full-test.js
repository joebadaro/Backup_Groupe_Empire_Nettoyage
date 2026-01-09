
import nodemailer from 'nodemailer';
import fs from 'fs';

// Configuration (Same as in src/pages/api/send-estimate.ts)
const config = {
    service: 'gmail',
    auth: {
        user: 'joebadaro@gmail.com', // Main account
        pass: 'azfl tqoc sxez yjpe'  // App Password
    },
    fromAlias: 'info@groupenettoyageempire.com'
};

async function main() {
    console.log("=== STARTING FULL EMAIL TEST ===");
    console.log("Auth User:", config.auth.user);
    console.log("From Alias:", config.fromAlias);

    const transporter = nodemailer.createTransport({
        service: config.service,
        auth: {
            user: config.auth.user,
            pass: config.auth.pass.replace(/\s+/g, '')
        }
    });

    // Create a dummy PDF buffer (just text content)
    const pdfContent = "This is a dummy PDF file content for testing.";
    const buffer = Buffer.from(pdfContent, 'utf-8');

    const clientName = "Test User";
    const clientEmail = "joebadaro@gmail.com"; // Sending to self for verification
    const adminEmail = "info@groupenettoyageempire.com";

    // 1. Test Admin Email
    console.log(`\n1. Sending Admin Email to ${adminEmail}...`);
    try {
        const info = await transporter.sendMail({
            from: `"Groupe Empire Test" <${config.fromAlias}>`,
            to: adminEmail,
            subject: "TEST: Nouvelle Estimation (Admin)",
            html: "<h1>Test Email</h1><p>This is a test email imitating the Admin notification.</p>",
            attachments: [
                {
                    filename: 'Test_Estimation.pdf',
                    content: buffer,
                    contentType: 'application/pdf'
                }
            ]
        });
        console.log("✅ Admin Email Sent! Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Admin Email Failed:", error);
    }

    // 2. Test Client Email
    console.log(`\n2. Sending Client Email to ${clientEmail}...`);
    try {
        const info = await transporter.sendMail({
            from: `"Groupe Empire Test" <${config.fromAlias}>`,
            to: clientEmail,
            subject: "TEST: Votre Estimation (Client)",
            html: "<h1>Test Email</h1><p>This is a test email imitating the Client notification.</p>",
            attachments: [
                {
                    filename: 'Test_Estimation.pdf',
                    content: buffer,
                    contentType: 'application/pdf'
                }
            ]
        });
        console.log("✅ Client Email Sent! Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Client Email Failed:", error);
    }

    console.log("\n=== TEST COMPLETED ===");
}

main();
