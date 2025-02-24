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
      // No falla en certificados autofirmados
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
  async enviarEmail(to, subject, html) {
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
      console.error('Error al enviar email:', error);
      throw new Error(`No se pudo enviar el correo: ${error.message}`);
    }
  },

  /**
   * Envía un correo de recuperación de contraseña
   * @param {string} to - Dirección de correo del destinatario
   * @param {string} nombre - Nombre del usuario
   * @param {string} token - Token para resetear la contraseña
   * @returns {Promise<Object>} Resultado del envío
   */
  async enviarEmailRecuperacion(to, nombre, token) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/request/${token}`;
    
    const html = `
      <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecimiento de Contraseña</title>
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
      <div>Sistema de Gestión Empresarial</div>
    </div>
    
    <div class="email-content">
      <h1 class="email-title">Hola ${nombre},</h1>
      
      <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en ERP La Corteria.</p>
      
      <p>Para crear una nueva contraseña, haz clic en el siguiente botón:</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="reset-button">Restablecer mi contraseña</a>
      </div>
      
      <p>Si el botón no funciona, también puedes copiar y pegar el siguiente enlace en tu navegador:</p>
      <p><a href="${resetUrl}" style="color: #2e6bc7; word-break: break-all;">${resetUrl}</a></p>
      
      <p><strong>Importante:</strong> Este enlace es válido por 1 hora a partir de ahora.</p>
      
      <div class="help-text">
        <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo. Tu cuenta sigue segura y no se ha realizado ningún cambio.</p>
        <p>Si tienes alguna pregunta o necesitas ayuda adicional, no dudes en contactar a nuestro equipo de soporte.</p>
        <p>Saludos,<br><span class="company-name">Equipo de ERP La Corteria</span></p>
      </div>
    </div>
    
    <div class="email-footer">
      <p>&copy; 2024 La Corteria. Todos los derechos reservados.</p>
      <p>Este es un correo electrónico automático, por favor no responda a este mensaje.</p>
    </div>
  </div>
</body>
</html>
    `;
    
    return await this.enviarEmail(to, 'Restablecimiento de contraseña - ERP La Corteria', html);
  }
};

module.exports = emailService;