import { config } from 'dotenv';
import nodemailer from 'nodemailer';

config();
export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET, 
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});


// Function to send email
export  const sendRegistrationWelcomeEmail = async (userEmail, userName) => {
  try {
    const info = await transporter.sendMail({
      from: `"My Awesome App" <${process.env.EMAIL_USER}>`, // Change this to your app's name
      to: userEmail,
      subject: 'Welcome! Registration Successful',
      text: `Hi ${userName},\n\nThank you for registering! We are thrilled to have you on board.\n\nBest,\nThe EmailSending Team`,
      // HTML version looks much better in modern email clients
      html:`
  <div style="background-color: #f4f5f7; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #eef0f3;">
      
      <div style="background-color: #6366f1; height: 6px;"></div>
      
      <div style="padding: 40px 48px;">
        
        <h1 style="color: #1f2937; font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 16px; line-height: 1.3;">
          Welcome aboard, ${userName}! ✨
        </h1>
        
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
          Your account has been successfully created. We are absolutely thrilled to have you join us. Get ready to experience a whole new way of managing your workflow.
        </p>
        
        <div style="margin-bottom: 32px; margin-top: 28px;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" style="background-color: #6366f1; color: #ffffff; padding: 14px 28px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);">
            Get Started Safely
          </a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-top: 0; margin-bottom: 0;">
          Have questions or need assistance? Simply reply directly to this email—our support crew is always happy to help out.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
        
        <p style="color: #9ca3af; font-size: 14px; line-height: 1.5; margin: 0;">
          Warm regards,<br>
          <strong style="color: #4b5563; font-weight: 600;">The EmailSending Team</strong>
        </p>
        
      </div>
    </div>
  </div>
`,
    });

    console.log('Welcome email sent successfully: %s', info.messageId);
    return true; 
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return false;
  }
};