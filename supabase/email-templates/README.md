# Email Templates for Supabase Auth

This directory contains branded HTML email templates for Supabase authentication emails.

## Generated Templates

1. **confirm-signup.html** - Email confirmation for new signups
2. **invite-user.html** - Invitation email for new users
3. **magic-link.html** - Passwordless sign-in link
4. **change-email.html** - Email change confirmation
5. **reset-password.html** - Password reset link

## Setup Instructions

### 1. Logo Location

The logo is already in `/public/ritual-logo-full.png` and will be accessible at:
- `https://tryritual.co/ritual-logo-full.png` (or your domain)

If you need to use a different URL (e.g., CDN), you can:
- Set the `EMAIL_LOGO_URL` environment variable when running the script
- Or update `LOGO_URL` directly in `scripts/generate-email-templates.js`

### 2. Update Configuration

Edit `scripts/generate-email-templates.js` and update:
- `LOGO_URL` - Your publicly accessible logo URL
- `APP_DOMAIN` - Your actual domain (e.g., `tryritual.co`)

### 3. Generate Templates

```bash
node scripts/generate-email-templates.js
```

This will create all HTML templates in `supabase/email-templates/`.

### 4. Load Templates into Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** > **Email Templates**
3. For each template type:
   - Select the template (e.g., "Confirm sign up")
   - Click **Edit template**
   - Copy the HTML content from the corresponding `.html` file
   - Paste into the template editor
   - Save

## Template Variables

Supabase automatically replaces these variables:
- `{{ .ConfirmationURL }}` - The confirmation/reset link URL
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Confirmation token (if needed)
- `{{ .TokenHash }}` - Hashed token (if needed)
- `{{ .SiteURL }}` - Your site URL

## Brand Colors

The templates use the following brand colors:
- **Teal (Primary):** `hsl(174, 58%, 39%)`
- **Purple (Secondary):** `hsl(270, 55%, 55%)`
- **Gold (Accent):** `hsl(40, 85%, 55%)`

## Testing

After loading templates into Supabase:

1. Use Supabase Dashboard > Authentication > Email Templates > **Send test email**
2. Or trigger the actual email flow (sign up, reset password, etc.)
3. Check that:
   - Logo displays correctly
   - Colors match your brand
   - Links work properly
   - Mobile rendering looks good

## Customization

To customize the templates:

1. Edit `scripts/generate-email-templates.js`
2. Modify the content, colors, or styling
3. Re-run the script to regenerate templates
4. Reload into Supabase

## Notes

- **Logo Requirements:** The logo must be hosted publicly. Base64 embedding is not used to ensure better email client compatibility.
- **Email Client Compatibility:** Templates are tested for major email clients (Gmail, Outlook, Apple Mail)
- **Mobile Responsive:** Templates use responsive design patterns
- **Voice:** Templates use an excited, friendly tone that gets users excited to use the tool
