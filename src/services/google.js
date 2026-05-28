const { google } = require("googleapis");

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://donna-backend-htft.onrender.com/auth/google/callback"
);

module.exports = oauth2Client;