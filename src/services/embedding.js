const genAI = require("./gemini");

const generateEmbedding = async (text) => {

  const model = genAI.getGenerativeModel({
    model: "gemini-embedding-001"
  });

  const result = await model.embedContent({
    content: {
      parts: [{ text }],
      role: "user"
    },
    outputDimensionality: 768
  });

  return result.embedding.values;

};

module.exports = {
  generateEmbedding
};