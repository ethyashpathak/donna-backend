const { google } = require("googleapis");
const genAI = require("../services/gemini");
const supabase = require("../services/supabase");

const oauth2Client = require("../services/google");

const getEmails = async (req, res) => {

  try {

    const { data, error } = await supabase
  .from("gmail_tokens")
  .select("*")
  .limit(1);

if (error || !data.length) {
  return res.status(401).json({
    error: "No Gmail tokens found"
  });
}

const token = data[0];

oauth2Client.setCredentials({
  access_token: token.access_token,
  refresh_token: token.refresh_token,
  scope: token.scope,
  token_type: token.token_type,
  expiry_date: token.expiry_date
});

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client
    });

    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10
    });

    const messages = response.data.messages || [];

    const emails = [];

    for(const msg of messages) {

      const email = await gmail.users.messages.get({
        userId: "me",
        id: msg.id
      });

      const headers = email.data.payload.headers;

      const subject = headers.find(
        h => h.name === "Subject"
      )?.value;

      const from = headers.find(
        h => h.name === "From"
      )?.value;

      emails.push({
        subject,
        from,
        snippet: email.data.snippet
      });

    }

    res.json(emails);

  } catch(err) {

    console.log(err);

    res.status(500).json({
      error: "Failed to fetch emails"
    });

  }

};
const analyzeEmails = async (req, res) => {

  try {

    const { data, error } = await supabase
      .from("gmail_tokens")
      .select("*")
      .limit(1);

    if (error || !data.length) {
      return res.status(401).json({
        error: "No Gmail tokens found"
      });
    }

    const token = data[0];

    oauth2Client.setCredentials({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      scope: token.scope,
      token_type: token.token_type,
      expiry_date: token.expiry_date
    });

    const gmail = google.gmail({
      version: "v1",
      auth: oauth2Client
    });

    const response = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10
    });

    const messages = response.data.messages || [];

    const emails = [];

    for (const msg of messages) {

      const email = await gmail.users.messages.get({
        userId: "me",
        id: msg.id
      });

      const headers = email.data.payload.headers;

      const subject = headers.find(
        h => h.name === "Subject"
      )?.value;

      const from = headers.find(
        h => h.name === "From"
      )?.value;

      emails.push({
        subject,
        from,
        snippet: email.data.snippet
      });

    }

    // STORE EMAILS IN DB

    const rows = emails.map(email => ({
      source: "gmail",
      content: `
Subject: ${email.subject}
From: ${email.from}
Content: ${email.snippet}
`
    }));

    await supabase
      .from("messages")
      .insert(rows);

    const emailText = emails.map(email => `
Subject: ${email.subject}
From: ${email.from}
Content: ${email.snippet}
`).join("\n");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const result = await model.generateContent(`

You are Donna, an elite AI chief-of-staff for engineering organizations.

Your role is to proactively detect:
- operational risks
- blockers
- escalation patterns
- deadline conflicts
- business impact
- hidden dependencies

Think like an executive operations analyst, NOT a chatbot.

Prioritize:
- deployment risks
- investor/customer impact
- engineering bottlenecks
- urgent coordination gaps

Return ONLY valid JSON.

Format:

{
  "summary": "",
  "criticality": "HIGH/MEDIUM/LOW",

  "risks": [
    {
      "title": "",
      "severity": "",
      "impact": "",
      "reason": ""
    }
  ],

  "action_items": [],

  "connections": [],

  "executive_brief": ""
}

Emails:
${emailText}

    `);

    let aiResponse = result.response.text();

    aiResponse = aiResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(aiResponse);

    // STORE INSIGHTS IN DB

    await supabase
      .from("insights")
      .insert([
        {
          summary: parsed.summary,
          risks: parsed.risks,
          action_items: parsed.action_items,
          connections: parsed.connections
        }
      ]);

    res.json(parsed);

  } catch(err) {

    console.log(err);

    res.status(500).json({
      error: "Failed to analyze emails"
    });

  }

};

module.exports = {
  getEmails,
  analyzeEmails
};