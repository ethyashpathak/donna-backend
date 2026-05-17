const oauth2Client = require("../services/google");
const supabase = require("../services/supabase");

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

    res.send(`
      <html>
        <body>
          <script>
            window.opener &&
            window.opener.postMessage(
              { status:'connected' },
              '*'
            );

            window.close();
          </script>

          <p>Connected!</p>

        </body>
      </html>
    `);

  } catch(err) {

    console.log(err);

    res.status(500).send("Google auth failed");

  }

};

const logoutGoogle = async (req,res) => {

  try {

    const { data } = await supabase
      .from("gmail_tokens")
      .select("*")
      .limit(1);

    if(data?.length){

      const token=data[0];

      // revoke Google access

      if(token.access_token){

        await oauth2Client.revokeToken(
          token.access_token
        );

      }

    }

    // remove tokens from DB

    await supabase
      .from("gmail_tokens")
      .delete()
      .neq("id","00000000-0000-0000-0000-000000000000");

    res.json({
      success:true,
      message:"Donna disconnected Gmail"
    });

  } catch(err){

    console.log(err);

    res.status(500).json({
      error:"Logout failed"
    });

  }

};

module.exports = {
  connectGoogle,
  googleCallback,
  logoutGoogle
};