// utils/email.js
const nodemailer = require('nodemailer');
const logger = require('./logger');
const { generateRandomString } = require('./helpers');

class Email {
  constructor() {
    this.transporter = null;
    this._initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  _initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      logger.info('Email transporter initialized');
    } catch (error) {
      logger.error('Failed to initialize email transporter', { error: error.message });
    }
  }

  /**
   * Send email with template
   */
  async sendEmail(to, subject, template, data = {}) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const html = this._renderTemplate(template, data);
      const text = this._htmlToText(html);

      const mailOptions = {
        from: `"AI Global Tutor" <${process.env.SMTP_FROM}>`,
        to,
        subject,
        text,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', { 
        to, 
        subject, 
        messageId: result.messageId 
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Failed to send email', { 
        to, 
        subject, 
        error: error.message 
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Render email template
   */
  _renderTemplate(template, data) {
    const templates = {
      welcome: this._welcomeTemplate(data),
      verification: this._verificationTemplate(data),
      passwordReset: this._passwordResetTemplate(data),
      testResults: this._testResultsTemplate(data),
      studyReminder: this._studyReminderTemplate(data)
    };

    return templates[template] || this._defaultTemplate(data);
  }

  /**
   * Welcome email template
   */
  _welcomeTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to AI Global Tutor! 🎓</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Welcome to your personalized learning journey with AI Global Tutor! We're excited to help you prepare for ${data.examType}.</p>
            
            <p><strong>What you can do:</strong></p>
            <ul>
              <li>Take AI-generated mock tests</li>
              <li>Get personalized study plans</li>
              <li>Receive instant explanations</li>
              <li>Track your progress with analytics</li>
            </ul>

            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/dashboard" class="button">Start Learning</a>
            </div>

            <p>If you have any questions, feel free to reply to this email.</p>
            
            <p>Happy learning!<br>The AI Global Tutor Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AI Global Tutor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Email verification template
   */
  _verificationTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 5px; margin: 20px 0; color: #4facfe; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Please use the following code to verify your email address:</p>
            
            <div class="code">${data.verificationCode}</div>
            
            <p>This code will expire in 1 hour.</p>
            <p>If you didn't request this verification, please ignore this email.</p>
            
            <p>Best regards,<br>The AI Global Tutor Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AI Global Tutor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Password reset template
   */
  _passwordResetTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #ff6b6b; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/reset-password?token=${data.resetToken}" class="button">Reset Password</a>
            </div>
            
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            
            <p>Best regards,<br>The AI Global Tutor Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AI Global Tutor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Test results template
   */
  _testResultsTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #5ee7df 0%, #b490ca 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .score { font-size: 48px; font-weight: bold; text-align: center; margin: 20px 0; color: #5ee7df; }
          .stats { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Test Results: ${data.examType}</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Here are your latest test results:</p>
            
            <div class="score">${data.score}%</div>
            
            <div class="stats">
              <p><strong>Test Details:</strong></p>
              <ul>
                <li>Total Questions: ${data.totalQuestions}</li>
                <li>Correct Answers: ${data.correctAnswers}</li>
                <li>Time Spent: ${data.timeSpent}</li>
                <li>Strong Areas: ${data.strongAreas?.join(', ') || 'None'}</li>
                <li>Areas to Improve: ${data.weakAreas?.join(', ') || 'None'}</li>
              </ul>
            </div>

            <p>Keep up the great work! Your personalized study plan has been updated based on these results.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/results/${data.testId}" class="button" style="background: #5ee7df; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px;">View Detailed Results</a>
            </div>
            
            <p>Best regards,<br>The AI Global Tutor Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AI Global Tutor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Study reminder template
   */
  _studyReminderTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .reminder { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #a8edea; color: #333; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Time to Study! 📚</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Don't forget your study session today! Consistency is key to success in ${data.examType}.</p>
            
            <div class="reminder">
              <p><strong>Today's Focus:</strong></p>
              <ul>
                ${data.tasks?.map(task => `<li>${task}</li>`).join('') || '<li>Review your study plan</li>'}
              </ul>
              <p><strong>Recommended Duration:</strong> ${data.duration || '2 hours'}</p>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.APP_URL}/study" class="button">Start Studying</a>
            </div>

            <p>"The expert in anything was once a beginner." - Helen Hayes</p>
            
            <p>You've got this!<br>The AI Global Tutor Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 AI Global Tutor. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Default template fallback
   */
  _defaultTemplate(data) {
    return `
      <!DOCTYPE html>
      <html>
      <body>
        <h2>${data.subject || 'Notification from AI Global Tutor'}</h2>
        <p>${data.message || 'This is a notification from AI Global Tutor.'}</p>
        <p>Best regards,<br>The AI Global Tutor Team</p>
      </body>
      </html>
    `;
  }

  /**
   * Convert HTML to plain text
   */
  _htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate verification code
   */
  generateVerificationCode() {
    return generateRandomString(6, 'numeric');
  }

  /**
   * Generate reset token
   */
  generateResetToken() {
    return generateRandomString(32, 'alphanumeric');
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    return this.sendEmail(
      user.email,
      'Welcome to AI Global Tutor! 🎓',
      'welcome',
      {
        name: user.name,
        examType: user.examType
      }
    );
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user, verificationCode) {
    return this.sendEmail(
      user.email,
      'Verify Your Email - AI Global Tutor',
      'verification',
      {
        name: user.name,
        verificationCode
      }
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    return this.sendEmail(
      user.email,
      'Reset Your Password - AI Global Tutor',
      'passwordReset',
      {
        name: user.name,
        resetToken
      }
    );
  }

  /**
   * Send test results email
   */
  async sendTestResultsEmail(user, testResults) {
    return this.sendEmail(
      user.email,
      `Your ${testResults.examType} Test Results - ${testResults.score}%`,
      'testResults',
      {
        name: user.name,
        ...testResults
      }
    );
  }

  /**
   * Send study reminder email
   */
  async sendStudyReminder(user, studyPlan) {
    return this.sendEmail(
      user.email,
      'Study Reminder - AI Global Tutor',
      'studyReminder',
      {
        name: user.name,
        examType: user.examType,
        tasks: studyPlan.todayTasks,
        duration: studyPlan.recommendedDuration
      }
    );
  }

  /**
   * Verify email configuration
   */
  async verifyConfiguration() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      logger.info('Email configuration verified successfully');
      return true;
    } catch (error) {
      logger.error('Email configuration verification failed', { error: error.message });
      return false;
    }
  }
}

// Create singleton instance
const email = new Email();

module.exports = email;