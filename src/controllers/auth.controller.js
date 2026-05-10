const oauth2Client = require("../services/google");

const supabase = require("../services/supabase");
//test
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

    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    await supabase
      .from("gmail_tokens")
      .insert([
        {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          scope: tokens.scope,
          token_type: tokens.token_type,
          expiry_date: tokens.expiry_date
        }
      ]);

    res.send("Donna successfully connected to Gmail.");

  } catch(err) {

    console.log(err);

    res.status(500).send("Google auth failed");

  }

};

module.exports = {
  connectGoogle,
  googleCallback
};