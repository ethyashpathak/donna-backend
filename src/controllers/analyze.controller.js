const genAI = require("../services/gemini");
const supabase = require("../services/supabase");

const analyzeMessages = async (req, res) => {

  try {

    const { messages } = req.body;
   for (const msg of messages) {

  await supabase
    .from("messages")
    .insert([
      {
        source: "user",
        user_id: req.userId,
        content: msg
      }
    ]);

}
    // await supabase
    // .from("insights")
    // .insert([
    //     {

    //     }
    // ])


    const combinedText = messages.join("\n");

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite"
    });

    const result = await model.generateContent(`

You are Donna, an AI workplace intelligence system.

Analyze workplace communications.

Return ONLY valid JSON.

Keep responses concise and executive-friendly.

Format:

{
  "summary": "max 2 sentences",

  "risks": [
    {
      "title": "",
      "severity": "HIGH/MEDIUM/LOW",
      "reason": ""
    }
  ],

  "action_items": [
    ""
  ],

  "connections": [
    ""
  ]
}

Messages:
${combinedText}

    `);

    let response = result.response.text();

    response = response
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(response);
           await supabase
         .from("insights")
         .insert([
           {
             user_id: req.userId,
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
      error: "Analysis failed"
    });

  }

};

module.exports = {
  analyzeMessages
};