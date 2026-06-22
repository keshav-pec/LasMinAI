const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 1. Redirect to Google Consent
router.get('/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.profile', // NEW: Fetch Avatar/Name
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
  });
  res.redirect(url);
});

// 2. The Callback (Redirects back to React)
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    global.googleTokens = tokens; 

    // Fetch the user's Google Profile
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const userInfo = await oauth2.userinfo.get();
    
    // Store user data in memory for the hackathon
    global.user = userInfo.data; 

    // Redirect back to your Vite frontend terminal
    res.redirect('http://localhost:5174/');
  } catch (error) {
    console.error('OAuth Error:', error);
    res.redirect('http://localhost:5174/auth?error=failed');
  }
});

// 3. NEW: Endpoint for React to verify who is logged in
router.get('/me', (req, res) => {
  if (global.googleTokens && global.user) {
    res.status(200).json({ authenticated: true, user: global.user });
  } else {
    res.status(200).json({ authenticated: false, user: null });
  }
});

module.exports = { router, oauth2Client };