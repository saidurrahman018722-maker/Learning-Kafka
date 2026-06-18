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


export const sendOrderFailedForInventory = async (userEmail, userName, orderId, failedItems) => {
  try {
    // 1. Dynamically generate the HTML rows for the out-of-stock items
    const itemsHtml = failedItems.map(item => `
      <tr>
        <td style="padding: 16px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333333;">
          <strong style="display: block; margin-bottom: 4px;">Product ID: ${item.productId}</strong>
          <span style="color: #999999; font-size: 12px;">We currently only have ${item.available} in stock.</span>
        </td>
        <td style="padding: 16px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #ff6a00; text-align: right; font-weight: bold;">
          Requested: ${item.requested}
        </td>
      </tr>
    `).join('');

    // 2. Send the email via Nodemailer
    const info = await transporter.sendMail({
      from: `"My E-Commerce Store" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Action Required: Update on Order #${orderId.substring(0, 8)}`,
      text: `Hi ${userName},\n\nWe're sorry, but part of your order #${orderId} could not be fulfilled because some items are out of stock. Your payment has not been charged.\n\nBest,\nThe Support Team`,
      
      // 3. The Alibaba-inspired E-Commerce HTML Template
      html: `
      <div style="background-color: #f2f2f2; padding: 40px 20px; font-family: Arial, Helvetica, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden; border: 1px solid #e1e1e1;">
          
          <div style="background-color: #ff6a00; padding: 24px 40px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 1px;">
              ORDER UPDATE
            </h1>
          </div>
          
          <div style="padding: 40px;">
            
            <h2 style="color: #333333; font-size: 20px; font-weight: bold; margin-top: 0; margin-bottom: 16px;">
              Hi ${userName},
            </h2>
            
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
              We apologize, but we are unable to process your recent order because some of the items you requested are currently out of stock. <strong>Rest assured, your credit card has not been charged.</strong>
            </p>
            
            <div style="background-color: #fcf8f5; border-left: 4px solid #ff6a00; padding: 16px; margin-bottom: 32px;">
              <span style="color: #666666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Order Reference Number</span><br>
              <strong style="color: #333333; font-size: 18px;">#${orderId}</strong>
            </div>
            
            <h3 style="color: #333333; font-size: 16px; border-bottom: 2px solid #333333; padding-bottom: 8px; margin-bottom: 0;">
              Out of Stock Items
            </h3>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin-bottom: 32px;">
              ${itemsHtml}
            </table>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/cart" style="background-color: #ff6a00; color: #ffffff; padding: 14px 32px; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 4px;">
                Return to Store
              </a>
            </div>
            
            <p style="color: #999999; font-size: 13px; line-height: 1.5; margin-top: 0; margin-bottom: 0; text-align: center;">
              If you have any questions, simply reply to this email to reach our customer service team.<br>We are here to help!
            </p>
            
          </div>
          
          <div style="background-color: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #b3b3b3; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} My E-Commerce Store. All rights reserved.
            </p>
          </div>
          
        </div>
      </div>
      `,
    });

    console.log(`Failed order email sent successfully for Order ID: ${orderId}`);
    return true; 
  } catch (error) {
    console.error("Error sending order failed email:", error);
    return false;
  }
};


export const sendPaymentSuccessfulEmail = async (userEmail, orderId) => {
  try {
    const info = await transporter.sendMail({
      from: `"My E-Commerce Store" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Payment Confirmed: Order #${orderId.substring(0, 8)}`,
      text: `Great news! We have successfully received your payment for order #${orderId}. Our team is now preparing it for shipment.\n\nBest,\nThe Support Team`,
      
      // The Alibaba-inspired E-Commerce HTML Template
      html: `
      <div style="background-color: #f2f2f2; padding: 40px 20px; font-family: Arial, Helvetica, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden; border: 1px solid #e1e1e1;">
          
          <div style="background-color: #ff6a00; padding: 24px 40px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 1px;">
              PAYMENT CONFIRMED
            </h1>
          </div>
          
          <div style="padding: 40px;">
            
            <h2 style="color: #333333; font-size: 20px; font-weight: bold; margin-top: 0; margin-bottom: 16px;">
              Thank you for your purchase!
            </h2>
            
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
              Great news! We have successfully received your payment. Your order is now confirmed and our team is getting it ready for shipment.
            </p>
            
            <div style="background-color: #fcf8f5; border-left: 4px solid #ff6a00; padding: 16px; margin-bottom: 32px;">
              <span style="color: #666666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Order Reference Number</span><br>
              <strong style="color: #333333; font-size: 18px;">#${orderId}</strong>
            </div>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/orders/${orderId}" style="background-color: #ff6a00; color: #ffffff; padding: 14px 32px; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 4px;">
                View Order Status
              </a>
            </div>
            
            <p style="color: #999999; font-size: 13px; line-height: 1.5; margin-top: 0; margin-bottom: 0; text-align: center;">
              If you have any questions, simply reply to this email to reach our customer service team.<br>We are here to help!
            </p>
            
          </div>
          
          <div style="background-color: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #b3b3b3; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} My E-Commerce Store. All rights reserved.
            </p>
          </div>
          
        </div>
      </div>
      `,
    });

    console.log(`Payment success email sent successfully for Order ID: ${orderId}`);
    return true; 
  } catch (error) {
    console.error("Error sending payment success email:", error);
    return false;
  }
};

export const sendPaymentFailedEmail = async (userEmail, orderId) => {
  try {
    const info = await transporter.sendMail({
      from: `"My E-Commerce Store" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Action Required: Payment Declined for Order #${orderId.substring(0, 8)}`,
      text: `Hi there,\n\nUnfortunately, we were unable to process the payment for your recent order #${orderId}. Don't worry, your card has not been charged. Please update your payment method to complete your purchase.\n\nBest,\nThe Support Team`,
      
      // The Alibaba-inspired E-Commerce HTML Template
      html: `
      <div style="background-color: #f2f2f2; padding: 40px 20px; font-family: Arial, Helvetica, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; overflow: hidden; border: 1px solid #e1e1e1;">
          
          <div style="background-color: #ff6a00; padding: 24px 40px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 1px;">
              PAYMENT DECLINED
            </h1>
          </div>
          
          <div style="padding: 40px;">
            
            <h2 style="color: #333333; font-size: 20px; font-weight: bold; margin-top: 0; margin-bottom: 16px;">
              There was an issue with your payment.
            </h2>
            
            <p style="color: #666666; font-size: 15px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">
              Unfortunately, we were unable to process the payment for your recent order. <strong>Don't worry, your account has not been charged.</strong> To complete your purchase and secure your items, please update your payment method.
            </p>
            
            <div style="background-color: #fcf8f5; border-left: 4px solid #ff6a00; padding: 16px; margin-bottom: 32px;">
              <span style="color: #666666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Order Reference Number</span><br>
              <strong style="color: #333333; font-size: 18px;">#${orderId}</strong>
            </div>
            
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/checkout/${orderId}" style="background-color: #ff6a00; color: #ffffff; padding: 14px 32px; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block; border-radius: 4px;">
                Try Payment Again
              </a>
            </div>
            
            <p style="color: #999999; font-size: 13px; line-height: 1.5; margin-top: 0; margin-bottom: 0; text-align: center;">
              If you have any questions, simply reply to this email to reach our customer service team.<br>We are here to help!
            </p>
            
          </div>
          
          <div style="background-color: #fafafa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #b3b3b3; font-size: 12px; margin: 0;">
              &copy; ${new Date().getFullYear()} My E-Commerce Store. All rights reserved.
            </p>
          </div>
          
        </div>
      </div>
      `,
    });

    console.log(`Payment failed email sent successfully for Order ID: ${orderId}`);
    return true; 
  } catch (error) {
    console.error("Error sending payment failed email:", error);
    return false;
  }
};