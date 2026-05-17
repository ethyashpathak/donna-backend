const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://donna-frontend-eight.vercel.app/"
    ],
    credentials: true
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Donna backend running");
});

const PORT = process.env.PORT || 3000;

const analyzeRoute = require("./routes/analyze.route");
const authRoute = require("./routes/auth.route");
const gmailRoute = require("./routes/gmail.route");

app.use("/analyze", analyzeRoute);
app.use("/auth", authRoute);
app.use("/gmail", gmailRoute);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});