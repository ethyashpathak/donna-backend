const express = require("express");

const router = express.Router();

const {
  getEmails,
  analyzeEmails
} = require("../controllers/gmail.controller");

router.get("/messages", getEmails);
router.post("/analyze", analyzeEmails);

module.exports = router;