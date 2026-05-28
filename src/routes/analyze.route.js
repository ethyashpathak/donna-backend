const express = require("express");

const router = express.Router();

const {
  analyzeMessages
} = require("../controllers/analyze.controller");

const { requireAuth } = require("../middleware/auth.middleware");

router.post("/", requireAuth, analyzeMessages);

module.exports = router;