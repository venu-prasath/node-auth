const express = require("express");

const validators = require("../validators");
const userControllers = require("../controllers/user");
const { requireAuthentication } = require("../middlewares/authCheck");

const router = express.Router();

router.post(
    "/login", 
    validators.loginValidator, 
    userControllers.login);

router.post(
    "/signup", 
    validators.signupValidator, 
    userControllers.signup);

router.post(
    "/logout", 
    requireAuthentication, 
    userControllers.logout);

router.post(
    "/master-logout", 
    requireAuthentication, 
    userControllers.logoutAllDevices);

router.post(
    "/reauth", 
    userControllers.refreshAccessToken);

router.post(
    "/forgotpass", 
    validators.forgotPasswordValidator, 
    userControllers.forgotPassword);

router.patch(
    "/resetpass/:resetToken", 
    validators.resetPasswordValidator, 
    userControllers.resetPassword);

router.get(
    "/me", 
    requireAuthentication, 
    userControllers.fetechAuthUserProfile);

router.get(
    "/:id", 
    requireAuthentication, 
    validators.fetchUserProfileValidator, 
    userControllers.fetchUserProfile);

module.exports = router;