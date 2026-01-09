
import nodemailer from 'nodemailer';

async function main() {
    console.log("Testing SMTP Connection with Main Account Auth and Alias From...");

    const user = 'joebadaro@gmail.com'; // Main account
    const pass = 'azfl tqoc sxez yjpe'; // App password
    const alias = 'info@groupenettoyageempire.com';

    console.log(`Authenticating as: ${user}`);
    console.log(`Sending FROM: ${alias}`);

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user,
            pass: pass.replace(/\s+/g, '')
        }
    });

    try {
        const info = await transporter.sendMail({
            from: `"Groupe Empire" <${alias}>`,
            to: 'joebadaro@gmail.com', // Send to self to verify
            subject: "Test Email (Fix Verification)",
            text: "If you see this, sending AS the alias works!"
        });
        console.log("Message sent: %s", info.messageId);
        console.log("Check your inbox to see if the FROM address is correct.");
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

main();
