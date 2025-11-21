import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { AlarmResponseDto } from '../alarms/dto/alarm-response.dto';

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

  async sendAlarmNotificationEmail(
    email: string,
    alarm: AlarmResponseDto,
    locationName?: string,
  ) {
    const severityColor =
      alarm.severity === 'critical'
        ? '#dc3545'
        : alarm.severity === 'warning'
          ? '#ffc107'
          : '#17a2b8';

    const severityEmoji =
      alarm.severity === 'critical'
        ? '🔴'
        : alarm.severity === 'warning'
          ? '⚠️'
          : 'ℹ️';

    const mailOptions = {
      from: process.env.MAIL_FROM || 'noreply@yourapp.com',
      to: email,
      subject: `${severityEmoji} ${alarm.severity.toUpperCase()} Alert - ${alarm.deviceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${severityColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; }
            .details { background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #666; }
            .detail-value { color: #333; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .button { background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${severityEmoji} ${alarm.severity.toUpperCase()} ALARM</h1>
              <p style="margin: 0; font-size: 18px;">${locationName || alarm.deviceName}</p>
            </div>
            <div class="content">
              <p><strong>Alert Message:</strong></p>
              <p style="font-size: 16px; color: ${severityColor};">${alarm.message}</p>
              
              <div class="details">
                <h3>Sensor Readings</h3>
                <div class="detail-row">
                  <span class="detail-label">Device ID:</span>
                  <span class="detail-value">${alarm.deviceName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Turbidity:</span>
                  <span class="detail-value">${alarm.turbidity} NTU</span>
                </div>
                ${
                  alarm.ph
                    ? `
                <div class="detail-row">
                  <span class="detail-label">pH Level:</span>
                  <span class="detail-value">${alarm.ph}</span>
                </div>
                `
                    : ''
                }
                ${
                  alarm.temperature
                    ? `
                <div class="detail-row">
                  <span class="detail-label">Temperature:</span>
                  <span class="detail-value">${alarm.temperature}°C</span>
                </div>
                `
                    : ''
                }
                <div class="detail-row">
                  <span class="detail-label">Voltage:</span>
                  <span class="detail-value">${alarm.voltage}V</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Condition:</span>
                  <span class="detail-value">${alarm.condition}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${new Date(alarm.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">
                  View Dashboard
                </a>
              </div>
            </div>
            <div class="footer">
              <p>This is an automated alert from your Water Quality Monitoring System</p>
              <p>Please do not reply to this email</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(
        'Alarm notification sent to:',
        email,
        '| Message ID:',
        info.messageId,
      );
      console.log('Preview URL: ', nodemailer.getTestMessageUrl(info));
      return info;
    } catch (error) {
      console.error('Error sending alarm notification:', error);
      // Don't throw - we don't want email failures to break the alarm processing
      return null;
    }
  }
}
