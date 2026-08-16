const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser"); // npm install cookie-parser
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://donna-frontend-eight.vercel.app"
    ],
    credentials: true
  })
);

// Allow popup flow — without this, window.opener is null in the callback page
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
});

app.use(express.json());
app.use(cookieParser()); // required to read req.cookies

app.get("/", (req, res) => res.send("Donna backend running"));
app.get("/", (req, res) => {
  console.log("Ping received at:", new Date().toISOString());
  res.send("Donna backend running");
});


const PORT = process.env.PORT || 3000;

const analyzeRoute = require("./routes/analyze.route");
const authRoute = require("./routes/auth.route");
const gmailRoute = require("./routes/gmail.route");

app.use("/analyze", analyzeRoute);
app.use("/auth", authRoute);
app.use("/gmail", gmailRoute);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));