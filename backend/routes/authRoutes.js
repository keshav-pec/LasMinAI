const express = require('express');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const User = require('../models/User');

// Helper to get tokens for calendar service
const getUserTokens = async (userId) => {
  const user = await User.findOne({ googleId: userId });
  return user ? user.googleTokens : null;
};

// 1. Redirect to Google Consent
router.get('/google', (req, res) => {
  const scopes = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ];
  
  const state = crypto.randomBytes(32).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000 // 10 minutes
  });

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state,
  });
  res.redirect(url);
});

// 2. The Callback (Redirects back to React)
router.get('/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const storedState = req.cookies.oauth_state;

  if (!state || state !== storedState) {
    console.error('OAuth Error: Invalid or missing state parameter');
    return res.redirect('http://localhost:5174/auth?error=csrf');
  }
  
  res.clearCookie('oauth_state');

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch the user's Google Profile
    const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
    const userInfo = await oauth2.userinfo.get();
    
    const user = userInfo.data;

    // Save tokens in MongoDB
    let dbUser = await User.findOne({ googleId: user.id });
    if (dbUser) {
      dbUser.googleTokens = tokens;
      dbUser.name = user.name;
      dbUser.picture = user.picture;
      await dbUser.save();
    } else {
      dbUser = await User.create({
        googleId: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        googleTokens: tokens
      });
    }

    // Generate JWT
    if (!process.env.JWT_SECRET) {
      console.error('FATAL ERROR: JWT_SECRET is not defined.');
      process.exit(1);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, picture: user.picture },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Redirect back to your Vite frontend terminal
    res.redirect('http://localhost:5174/');
  } catch (error) {
    console.error('OAuth Error:', error);
    res.redirect('http://localhost:5174/auth?error=failed');
  }
});

// 3. Endpoint for React to verify who is logged in
const { requireAuth } = require('../utils/authMiddleware');
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ authenticated: true, user: req.user });
});

// 4. Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token');
  res.status(200).json({ success: true });
});

module.exports = { router, oauth2Client, getUserTokens };