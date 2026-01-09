
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log("Testing SMTP Connection (Attempt 2)...");

    // Authenticate with the MAIN Google account
    const user = 'joebadaro@gmail.com';
    const pass = 'azfl tqoc sxez yjpe';

    // Try to send AS the business alias
    const fromAlias = 'info@groupenettoyageempire.com';

    console.log(`User: ${user}`);
    console.log(`Pass: ${pass.substring(0, 4)}... (Length: ${pass.length})`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass.replace(/\s+/g, '')
        }
    });

    try {
        const info = await transporter.sendMail({
            from: `"Groupe Empire" <${user}>`, // Use authenticated user to pass security check
            to: user,
            replyTo: fromAlias, // If alias fails, reply-to handles it
            subject: "Test Email (Correct Auth)",
            text: "If you see this, the App Password connection is working!"
        });
        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

main();
