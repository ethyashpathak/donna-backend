const express = require("express");

const router = express.Router();

const {
  connectGoogle,
  googleCallback
} = require("../controllers/auth.controller");

router.get("/google", connectGoogle);

router.get("/google/callback", googleCallback);

module.exports = router;