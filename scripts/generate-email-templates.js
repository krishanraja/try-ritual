#!/usr/bin/env node

/**
 * Generate branded email templates for Supabase Auth
 * 
 * This script generates beautiful, branded HTML email templates for:
 * - Confirm sign up
 * - Invite user
 * - Magic link
 * - Change email address
 * - Reset password
 * 
 * Usage:
 *   node scripts/generate-email-templates.js
 * 
 * Output:
 *   Creates email templates in supabase/email-templates/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Brand colors (from CSS)
const colors = {
  teal: 'hsl(174, 58%, 39%)',
  tealLight: 'hsl(174, 50%, 92%)',
  purple: 'hsl(270, 55%, 55%)',
  purpleLight: 'hsl(270, 40%, 92%)',
  gold: 'hsl(40, 85%, 55%)',
  goldLight: 'hsl(40, 60%, 92%)',
  background: 'hsl(220, 20%, 97%)',
  foreground: 'hsl(220, 30%, 15%)',
  muted: 'hsl(220, 15%, 45%)',
  border: 'hsl(220, 20%, 90%)',
  white: '#ffffff',
};

// Logo URL - The logo is in /public/ritual-logo-full.png
// Since it's in the public folder, it's accessible at the root of your domain
// You can also set EMAIL_LOGO_URL environment variable to override
const LOGO_URL = process.env.EMAIL_LOGO_URL || 'https://tryritual.co/ritual-logo-full.png';

// App name and domain
const APP_NAME = 'Ritual';
const APP_DOMAIN = process.env.APP_DOMAIN || 'tryritual.co';

/**
 * Base email template wrapper
 */
function createEmailTemplate(content, subject, previewText) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.background}; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${colors.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: ${colors.white}; border-radius: 16px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);">
          <!-- Logo Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <img src="${LOGO_URL}" alt="${APP_NAME}" width="180" height="auto" style="display: block; max-width: 180px; height: auto;" />
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: left;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: ${colors.tealLight}; border-radius: 0 0 16px 16px; border-top: 1px solid ${colors.border};">
              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: ${colors.muted}; text-align: center;">
                This email was sent by ${APP_NAME}. If you didn't request this, you can safely ignore it.<br>
                <a href="https://${APP_DOMAIN}" style="color: ${colors.teal}; text-decoration: none;">Visit ${APP_NAME}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Create button style
 */
function createButton(text, url, primary = true) {
  const bgColor = primary ? colors.teal : colors.white;
  const textColor = primary ? colors.white : colors.teal;
  const border = primary ? 'none' : `2px solid ${colors.teal}`;
  
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${url}" style="display: inline-block; padding: 16px 32px; background-color: ${bgColor}; color: ${textColor}; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; border: ${border}; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Confirm Sign Up Email
 */
function generateConfirmSignUp() {
  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; line-height: 1.2; color: ${colors.foreground}; text-align: left;">
      Welcome to ${APP_NAME}! 🎉
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${colors.foreground}; text-align: left;">
      We're so excited to have you! You're just one click away from starting your journey to deeper connection with your partner.
    </p>
    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      Click the button below to confirm your email address and activate your account:
    </p>
    {{ .ConfirmationURL }}
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{ .ConfirmationURL }}" style="color: ${colors.teal}; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
    </p>
  `;
  
  // Replace button placeholder with actual button
  const buttonHtml = createButton('Confirm Your Email', '{{ .ConfirmationURL }}');
  const finalContent = content.replace('{{ .ConfirmationURL }}', buttonHtml);
  
  return createEmailTemplate(
    finalContent,
    'Confirm your email address',
    'Welcome to Ritual! Confirm your email to get started.'
  );
}

/**
 * Invite User Email
 */
function generateInviteUser() {
  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; line-height: 1.2; color: ${colors.foreground}; text-align: left;">
      You've been invited! 💕
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${colors.foreground}; text-align: left;">
      Your partner wants to start building meaningful weekly rituals together with you on ${APP_NAME}!
    </p>
    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      ${APP_NAME} helps couples stay connected through personalized weekly rituals. Join your partner and start your journey together:
    </p>
    {{ .ConfirmationURL }}
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{ .ConfirmationURL }}" style="color: ${colors.teal}; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      This invitation will expire in 7 days. We can't wait to see what rituals you create together!
    </p>
  `;
  
  const buttonHtml = createButton('Accept Invitation & Sign Up', '{{ .ConfirmationURL }}');
  const finalContent = content.replace('{{ .ConfirmationURL }}', buttonHtml);
  
  return createEmailTemplate(
    finalContent,
    'You\'ve been invited to join Ritual',
    'Your partner wants to start building rituals together!'
  );
}

/**
 * Magic Link Email
 */
function generateMagicLink() {
  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; line-height: 1.2; color: ${colors.foreground}; text-align: left;">
      Your magic link is here! ✨
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${colors.foreground}; text-align: left;">
      Click the button below to sign in to ${APP_NAME}. No password needed—just one click and you're in!
    </p>
    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      This link will automatically sign you in:
    </p>
    {{ .ConfirmationURL }}
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{ .ConfirmationURL }}" style="color: ${colors.teal}; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      <strong>Security note:</strong> This link will expire in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.
    </p>
  `;
  
  const buttonHtml = createButton('Sign In to Ritual', '{{ .ConfirmationURL }}');
  const finalContent = content.replace('{{ .ConfirmationURL }}', buttonHtml);
  
  return createEmailTemplate(
    finalContent,
    'Sign in to Ritual',
    'Your one-click sign-in link is ready!'
  );
}

/**
 * Change Email Address Email
 */
function generateChangeEmail() {
  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; line-height: 1.2; color: ${colors.foreground}; text-align: left;">
      Confirm your new email 📧
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${colors.foreground}; text-align: left;">
      You've requested to change your email address on ${APP_NAME}. We just need to verify that this new email belongs to you.
    </p>
    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      Click the button below to confirm your new email address:
    </p>
    {{ .ConfirmationURL }}
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{ .ConfirmationURL }}" style="color: ${colors.teal}; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      This link will expire in 24 hours. If you didn't request this change, please contact us immediately.
    </p>
  `;
  
  const buttonHtml = createButton('Confirm New Email', '{{ .ConfirmationURL }}');
  const finalContent = content.replace('{{ .ConfirmationURL }}', buttonHtml);
  
  return createEmailTemplate(
    finalContent,
    'Confirm your new email address',
    'Verify your new email address to complete the change.'
  );
}

/**
 * Reset Password Email
 */
function generateResetPassword() {
  const content = `
    <h1 style="margin: 0 0 16px 0; font-size: 28px; font-weight: 700; line-height: 1.2; color: ${colors.foreground}; text-align: left;">
      Reset your password 🔒
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: ${colors.foreground}; text-align: left;">
      We received a request to reset your password for your ${APP_NAME} account. No worries—we've got you covered!
    </p>
    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      Click the button below to create a new password:
    </p>
    {{ .ConfirmationURL }}
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="{{ .ConfirmationURL }}" style="color: ${colors.teal}; word-break: break-all;">{{ .ConfirmationURL }}</a>
    </p>
    <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: ${colors.muted}; text-align: left;">
      <strong>Security note:</strong> This link will expire in 1 hour and can only be used once. If you didn't request a password reset, you can safely ignore this email—your account remains secure.
    </p>
  `;
  
  const buttonHtml = createButton('Reset Password', '{{ .ConfirmationURL }}');
  const finalContent = content.replace('{{ .ConfirmationURL }}', buttonHtml);
  
  return createEmailTemplate(
    finalContent,
    'Reset your password',
    'Click here to reset your password and get back to building rituals.'
  );
}

/**
 * Main function
 */
function main() {
  const outputDir = path.join(__dirname, '..', 'supabase', 'email-templates');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate all templates
  const templates = [
    { name: 'confirm-signup', content: generateConfirmSignUp() },
    { name: 'invite-user', content: generateInviteUser() },
    { name: 'magic-link', content: generateMagicLink() },
    { name: 'change-email', content: generateChangeEmail() },
    { name: 'reset-password', content: generateResetPassword() },
  ];
  
  console.log('🎨 Generating branded email templates...\n');
  
  templates.forEach(({ name, content }) => {
    const filePath = path.join(outputDir, `${name}.html`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Generated: ${name}.html`);
  });
  
  console.log(`\n✨ All templates generated in: ${outputDir}`);
  console.log('\n📋 Next steps:');
  console.log('1. Update LOGO_URL in this script to point to your hosted logo');
  console.log('2. Update APP_DOMAIN to your actual domain');
  console.log('3. Upload the logo to a public location (CDN, Vercel public folder, or Supabase Storage)');
  console.log('4. Copy the HTML content from each template file');
  console.log('5. Paste into Supabase Dashboard > Authentication > Email Templates');
  console.log('\n💡 Tip: Test each template by sending a test email from Supabase Dashboard');
}

// Run the script
main();

export { generateConfirmSignUp, generateInviteUser, generateMagicLink, generateChangeEmail, generateResetPassword };
