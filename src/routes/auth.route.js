const express = require("express");

const router = express.Router();

const {
  connectGoogle,
  googleCallback,
  logoutGoogle,
  getMe
} = require("../controllers/auth.controller");

const { requireAuth } = require("../middleware/auth.middleware");

router.get("/google", connectGoogle);

router.get(
  "/google/callback",
  googleCallback
);

router.get(
  "/logout",
  requireAuth,
  logoutGoogle
);

router.get(
  "/me",
  requireAuth,
  getMe
);

module.exports = router;