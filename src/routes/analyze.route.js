const express = require("express");

const router = express.Router();

const {
  analyzeMessages
} = require("../controllers/analyze.controller");

router.post("/", analyzeMessages);

module.exports = router;