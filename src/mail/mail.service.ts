import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    // For development, you can use a service like Mailtrap or Ethereal
    // For production, use your actual email service (Gmail, SendGrid, etc.)
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.MAIL_PORT!) || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  async sendWelcomeEmail(
    email: string,
    temporaryPassword: string,
    firstName: string,
  ) {
    const mailOptions = {
      from: process.env.MAIL_FROM || 'noreply@yourapp.com',
      to: email,
      subject: 'Welcome - Your Account Has Been Created',
      html: `
        <h1>Welcome ${firstName}!</h1>
        <p>Your account has been created successfully.</p>
        <p><strong>Your temporary password is:</strong> ${temporaryPassword}</p>
        <p>Please log in and change your password immediately.</p>
        <p>Login URL: ${process.env.APP_URL || 'http://localhost:3000'}/auth/login</p>
        <br>
        <p>Best regards,</p>
        <p>Your Team</p>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent: ', info.messageId);
      // For development with Ethereal, log the preview URL
      console.log('Preview URL: ', nodemailer.getTestMessageUrl(info));
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}
