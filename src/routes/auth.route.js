const express=require("express");

const router=express.Router();

const {
  connectGoogle,
  googleCallback,
  logoutGoogle
}=require("../controllers/auth.controller");

router.get("/google",connectGoogle);

router.get(
  "/google/callback",
  googleCallback
);

router.get(
  "/logout",
  logoutGoogle
);

module.exports=router;