const express = require("express");

const router = express.Router();

const {
  getEmails,
  analyzeEmails
} = require("../controllers/gmail.controller");

router.get("/", getEmails);
router.get("/analyze", analyzeEmails);

module.exports = router;