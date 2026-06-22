const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();

const router = express.Router();

// Initialize the Google OAuth2 Client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Route 1: Redirect user to Google's Consent Screen
router.get('/google', (req, res) => {
  const scopes = ['https://www.googleapis.com/auth/calendar.events'];
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Critical: Gets a refresh token so the user stays logged in
    scope: scopes,
  });
  res.redirect(url);
});

// Route 2: The Callback (Where Google sends the user after they say "Yes")
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // For this rapid 5-day hackathon sprint, we will store the tokens globally in memory.
    // (Post-hackathon, these should be saved to the User's MongoDB document).
    global.googleTokens = tokens; 

    res.status(200).send(`
      <h2>LasMinAI Authentication Successful!</h2>
      <p>Your calendar is connected. You can close this tab and return to Hoppscotch.</p>
    `);
  } catch (error) {
    console.error('OAuth Error:', error);
    res.status(500).send('Authentication failed.');
  }
});

module.exports = { router, oauth2Client };