const express = require("express");

const router = express.Router();

const {
  getEmails,
  analyzeEmails
} = require("../controllers/gmail.controller");

const { requireAuth } = require("../middleware/auth.middleware");

router.get("/messages", requireAuth, getEmails);
router.post("/analyze", requireAuth, analyzeEmails);

module.exports = router;