
import nodemailer from 'nodemailer';

async function main() {
    console.log("Testing SMTP Connection with Alias Auth (Expected to Fail if alias)...");

    // The code in send-estimate.ts uses this user:
    const user = 'info@groupenettoyageempire.com';
    // Using the working password from test-email.js
    const pass = 'azfl tqoc sxez yjpe';

    console.log(`User: ${user}`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass.replace(/\s+/g, '')
        }
    });

    try {
        const info = await transporter.sendMail({
            from: `"Groupe Empire" <${user}>`,
            to: 'joebadaro@gmail.com',
            subject: "Test Email (Alias Auth)",
            text: "This should fail if info@... is an alias and not a real user account."
        });
        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("Error sending email as expected:", error.message);
    }
}

main();
