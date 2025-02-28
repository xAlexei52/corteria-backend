// src/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transporte de correo
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Servicio para enviar correos electrónicos
 */
const emailService = {
  /**
   * Envía un correo electrónico
   * @param {string} to - Dirección de correo del destinatario
   * @param {string} subject - Asunto del correo
   * @param {string} html - Contenido HTML del correo
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendEmail(to, subject, html) {
    try {
      const mailOptions = {
        from: `"ERP La Corteria" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      };
      
      const info = await transporter.sendMail(mailOptions);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error(`Could not send email: ${error.message}`);
    }
  },

  /**
   * Envía un correo de recuperación de contraseña
   * @param {string} to - Dirección de correo del destinatario
   * @param {string} name - Nombre del usuario
   * @param {string} token - Token para resetear la contraseña
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendPasswordResetEmail(to, name, token) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password/${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f7f9fc;
          }
          .email-container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          }
          .email-header {
            background-color: #1a4b8c;
            color: white;
            padding: 25px;
            text-align: center;
          }
          .email-logo {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .email-content {
            padding: 30px;
          }
          .email-title {
            color: #1a4b8c;
            font-size: 22px;
            margin-top: 0;
            margin-bottom: 20px;
          }
          .reset-button {
            display: inline-block;
            background-color: #2e6bc7;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 25px 0;
            transition: background-color 0.3s;
          }
          .reset-button:hover {
            background-color: #1a4b8c;
          }
          .email-footer {
            background-color: #f0f4f9;
            padding: 20px;
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            border-top: 1px solid #e3e8ef;
          }
          .help-text {
            font-size: 14px;
            color: #6c757d;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #e3e8ef;
          }
          .company-name {
            font-weight: bold;
            color: #1a4b8c;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <div class="email-logo">ERP La Corteria</div>
            <div>Enterprise Resource Planning System</div>
          </div>
          
          <div class="email-content">
            <h1 class="email-title">Hello ${name},</h1>
            
            <p>We have received a request to reset the password for your ERP La Corteria account.</p>
            
            <p>To create a new password, click the button below:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="reset-button">Reset my password</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste the following link in your browser:</p>
            <p><a href="${resetUrl}" style="color: #2e6bc7; word-break: break-all;">${resetUrl}</a></p>
            
            <p><strong>Important:</strong> This link is valid for 1 hour from now.</p>
            
            <div class="help-text">
              <p>If you didn't request a password reset, you can ignore this email. Your account is still secure and no changes have been made.</p>
              <p>If you have any questions or need additional assistance, please don't hesitate to contact our support team.</p>
              <p>Regards,<br><span class="company-name">ERP La Corteria Team</span></p>
            </div>
          </div>
          
          <div class="email-footer">
            <p>&copy; 2024 La Corteria. All rights reserved.</p>
            <p>This is an automated email, please do not reply to this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(to, 'Password Reset - ERP La Corteria', html);
  }
};

module.exports = emailService;