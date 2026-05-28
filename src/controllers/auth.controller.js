const { google } = require("googleapis");
const oauth2Client = require("../services/google");
const supabase = require("../services/supabase");
const { signToken } = require("../middleware/auth.middleware");

const connectGoogle = (req, res) => {

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly"
    ]
  });

  res.redirect(url);

};

const googleCallback = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send('No authorization code received');
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('✅ Got tokens:', tokens);

    // Fetch user email
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const email = profile.data.emailAddress;

    console.log('✅ Got email:', email);

    if (!email) {
      return res.status(400).send('Could not retrieve email from Google');
    }

    // Upsert tokens into Supabase
    const { data, error } = await supabase
      .from('gmail_tokens')
      .upsert(
        {
          user_id: email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date,
        },
        { onConflict: 'user_id' }
      );

    console.log('✅ Supabase upsert data:', data);
    console.log('🔍 Supabase upsert error:', error);

    if (error) {
      console.error('❌ Failed to save tokens to Supabase:', error);
      return res.status(500).send(`Database error: ${error.message}`);
    }

    // Sign JWT with email as userId
    const sessionToken = signToken(email);

    console.log('✅ Session token signed for:', email);

    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Send token to frontend via postMessage, close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage(
                { status: 'connected', token: '${sessionToken}' },
                '${FRONTEND}'
              );
              window.close();
            } else {
              // Fallback: popup was blocked or opener unavailable, redirect instead
              window.location.href = '${FRONTEND}/auth/callback?token=${sessionToken}';
            }
          </script>
          <p>Connecting to Donna...</p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error('❌ googleCallback error:', err);
    res.status(500).send(`Google auth failed: ${err.message}`);
  }
};

const logoutGoogle = async (req, res) => {

  try {

    // Retrieve tokens specifically for the authenticated user
    const { data } = await supabase
      .from("gmail_tokens")
      .select("*")
      .eq("user_id", req.userId)
      .single();

    if (data) {

      // revoke Google access
      if (data.access_token) {

        await oauth2Client.revokeToken(
          data.access_token
        );

      }

    }

    // remove tokens for this user from DB
    await supabase
      .from("gmail_tokens")
      .delete()
      .eq("user_id", req.userId);

    // Clear the secure cookie from the browser
    res.clearCookie("donna_session", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
    });

    res.json({
      success: true,
      message: "Donna disconnected Gmail and logged out"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      error: "Logout failed"
    });

  }

};

const getMe = async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.userId,
        email: req.userId
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Failed to get user session"
    });
  }
};

module.exports = {
  connectGoogle,
  googleCallback,
  logoutGoogle,
  getMe
};