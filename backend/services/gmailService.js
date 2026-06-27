const { google } = require('googleapis');
const User = require('../models/User');

const sendGmailDigest = async (userId, htmlBody) => {
  try {
    let user = await User.findOne({ googleId: userId });
    if (!user) {
      user = await User.findById(userId).catch(() => null);
    }
    
    if (!user || !user.googleTokens) {
      console.log(`⚠️ User ${userId} missing googleTokens, skipping email.`);
      return false;
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials(user.googleTokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Raw email construction requires base64url encoding
    const subject = "LasMinAI: Your Upcoming Productive Session Digest";
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    const messageParts = [
      `To: ${user.email}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      htmlBody,
    ];
    
    const message = messageParts.join('\n');
    
    // The body needs to be base64url encoded
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me', // Sends from the authenticated user's account
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`✅ Digest Email successfully sent to ${user.email} natively from their account.`);
    return true;
  } catch (error) {
    console.error(`❌ Gmail API Error for User ${userId}:`, error.message || error);
    return false;
  }
};

module.exports = { sendGmailDigest };
