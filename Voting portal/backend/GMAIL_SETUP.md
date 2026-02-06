# Gmail OTP Integration Setup Guide

## Overview
Your voting portal now supports **One-Time Password (OTP) authentication** sent via Gmail. This adds an extra layer of security to the login process.

## How It Works
1. User enters roll number and password
2. Backend validates credentials
3. **OTP is generated** (6-digit code)
4. **Email with OTP is sent** to the user's registered email via Gmail
5. **User enters OTP** to complete login
6. **JWT token** is issued upon successful OTP verification

## Setup Instructions

### Step 1: Enable Gmail 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Scroll to "Your Google Account" section
3. Click on "2-Step Verification" and enable it if not already enabled
4. Note: You must have 2FA enabled to generate app passwords

### Step 2: Generate Gmail App Password
1. Visit [App Passwords](https://myaccount.google.com/apppasswords)
2. Select:
   - **App**: `Mail`
   - **Device**: `Windows Computer` (or your device type)
3. Click "Generate"
4. Google will display a **16-character password**
5. Copy this password (remove any spaces)

### Step 3: Create `.env` File
Copy the `.env.example` file to create a `.env` file:

```bash
cp .env.example .env
```

Then edit `.env` and fill in:
```
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx  # Your 16-character app password
```

### Step 4: Test the Integration
Start the server:
```bash
npm start
```

Call the login endpoint:
```bash
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"roll": "student1", "password": "password123"}'
```

You should receive:
- An email at the registered email address with the OTP
- A response: `{"message": "OTP_SENT", "roll": "student1"}`

## Fallback Behavior

**If Gmail credentials are not configured**, the system will:
1. Log the OTP to the console (development mode)
2. Display a warning message
3. Continue working normally

This allows testing without Gmail setup.

## Files Modified
- `package.json` - Added nodemailer dependency
- `server.js` - Integrated email service in login endpoint
- `emailService.js` - New file handling OTP email delivery

## Security Notes
- ✅ OTP is valid for **5 minutes** only
- ✅ Gmail App Passwords are safer than regular passwords
- ✅ OTP is generated freshly each login
- ✅ Never share your App Password
- ✅ Keep `.env` file in `.gitignore` to prevent credential leakage

## Troubleshooting

### "Less secure app access" error
Recent Gmail accounts require **App Passwords** (already configured above). Regular passwords won't work.

### Still getting console logs instead of emails
Check that:
1. `.env` file exists in `backend/` directory
2. `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set
3. Restart the server after creating `.env`
4. Check for typos in email/password

### Email not arriving
- Check **Spam/Junk folder**
- Verify the recipient email in `users.json` is correct
- Check server logs for error messages
- Ensure Gmail account has 2FA enabled

## API Endpoints

### POST /login
```json
{
  "roll": "student1",
  "password": "password123"
}
```
Response: `{"message": "OTP_SENT", "roll": "student1"}`

### POST /verify-otp
```json
{
  "roll": "student1",
  "otp": "123456"
}
```
Response: `{"token": "jwt_token_here", "role": "student"}`

---

For more help, check the server logs for detailed error messages.
