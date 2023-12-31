const { validationResult } = require("express-validator");

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const User = require("../../models/User");
const { sendEmail } = require("../../services/email/sendEmail");
const CustomError = require("../../config/errors/CustomErrors");
const AuthorizationError = require("../../config/errors/AuthorizationError");

const REFRESH_TOKEN = {
    secret: process.env.AUTH_REFRESH_TOKEN_SECRET,
    cookie: {
        name: "refreshTkn",
        options: {
            httpOnly: false,
            sameSite: "None",
            secure: true,
            maxAge: 24 * 60 * 60 * 1000,
        },
    },
};

const ACCESS_TOKEN = {
    secret: process.env.AUTH_ACCESS_TOKEN_SECRET,
};

const RESET_PASSWORD_TOKEN = {
    secret: process.env.RESET_PASSWORD_TOKEN_EXPIRY,
};

//Login
module.exports.login = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty) {
            throw new CustomError(
                errors.array(),
                422,
                errors.array()[0]?.msg
            );
        }
        const { email, password } = req.body;

        const user = await User.findByCredentials(email, password);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        );

        res.json({
            success: true,
            user,
            accessToken,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

//signup
module.exports.signup = async (req, res, next) => {
    try {
        console.log(req.body);
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            throw new CustomError(
                errors.array(),
                422,
                errors.array()[0]?.msg
            );
        }

        const { firstName, lastName, email, password } = req.body;

        const newUser = new User({ firstName, lastName, email, password });
        await newUser.save();
        const accessToken = await newUser.generateAccessToken();
        const refreshToken = await newUser.generateRefreshToken();

        res.cookie(
            REFRESH_TOKEN.cookie.name,
            refreshToken,
            REFRESH_TOKEN.cookie.options
        );

        res.status(201).json({
            success: true,
            user: newUser,
            accessToken,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

//logout
module.exports.logout = async (req, res, next) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);

        const cookies = req.cookies;
        const refreshToken = cookies[REFRESH_TOKEN.cookie.name];
        const rTknHash = crypto 
            .createHmac("sha256", REFRESH_TOKEN.secret)
            .update(refreshToken)
            .digest("hex");
        user.tokens = user.tokens.filter( (tokenObj) => tokenObj.token !== rTknHash);
        await user.save();

        const expireCookieOptions = Object.assign(
            {},
            REFRESH_TOKEN.cookie.options,
            {
                expires: new Date(1)
            }
        );

        res.cookie(REFRESH_TOKEN.cookie.name, "", expireCookieOptions);
        res.status(205).json({
            success: true,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

module.exports.logoutAllDevices = async (req, res, next) => {
    try {
        const userId = req.userId;
        const user = await User.findById(userId);

        user.tokens = undefined;
        await user.save();

        const expireCookieOptions = Object.assign(
            {},
            REFRESH_TOKEN.cookie.options,
            {
                expires: new Date(1),
            }
        );

        res.cookie(REFRESH_TOKEN.cookie.name, "", expireCookieOptions);
        res.status(205).json({
            success: true
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
}

//regenerate new access token
module.exports.refreshAccessToken = async (req, res, next) => {
    try {
        const cookies = req.cookies;
        const authHeader = req.header("Authorization");

        if(!cookies[REFRESH_TOKEN.cookie.name]) {
            throw new AuthorizationError(
                "Authentication error!",
                "You are unauthenticated",
                {
                    realm: "reauth",
                    error: "no_rft",
                    error_description: "Refresh Token is missing!",
                }
            );
        }

        if(!authHeader?.startsWith("Bearer ")) {
            throw new AuthorizationError(
                "Authentication Error",
                "You are unauthenticated!",
                {
                    realm: "reauth",
                    error: "invalid_acess_token",
                    error_description: "access token error",
                }
            );
        }

        const accessTokenParts = authHeader.split(" ");
        const staleAccessTkn = accessTokenParts[1];

        const decodedExpiredAccessTkn = jwt.verify(
            staleAccessTkn,
            ACCESS_TOKEN.secret,
            {
                ignoreExpiration: true,
            }
        );

        const rfTkn = cookies[REFRESH_TOKEN.cookie.name];
        const decodedRefreshTkn = jwt.verify(rfTkn, REFRESH_TOKEN.secret);

        const userWithRefreshTkn = await User.findOne({
            _id: decodedRefreshTkn._id,
            "tokens.token": staleAccessTkn,
        });
        if(!userWithRefreshTkn) {
            throw new AuthorizationError(
                "Authentication Error",
                "You are unauthenticated!",
                {
                    realm: "reauth",
                }
            );
        }
        console.log("Removing Stale access token from DB in refresh Handler...");
        userWithRefreshTkn.tokens = userWithRefreshTkn.tokens.filter( (tokenObj) => tokenObj.token !== staleAccessTkn);
        await userWithRefreshTkn.save();

        const accessToken = await userWithRefreshTkn.generateAccessToken();

        res.status(201);
        res.set({"Cache-Control": "no-share", Pragma: "no-cache" });
        res.json({
            success: true,
            accessToken,
        });
    } catch (error) {
        console.log(error);
        if(error?.name === "JsonTokenError") {
            return next(
                new AuthorizationError(error, 
                    "You are unauthenticated",
                    {
                        realm: "reauth",
                        error_description: "token error",
                    })
            );
        }
        next(error);
    }
};

//forgot password
module.exports.forgotPassword = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            throw new CustomError(errors.array(), 422);
        }

        const email = req.body.email;
        const user = await User.findOne( { email });
        if(!user) throw new CustomError("Email not sent", 404);

        let resetToken = await user.generateResetToken();
        resetToken = encodeURIComponent(resetToken);

        const resetPath = req.header("X-reset-base");
        const origin = req.header("Origin");

        const resetUrl = resetPath ? `${resetPath}/${resetToken}`: 
            `${origin}/resetpass/${resetToken}`;
        console.log("Password reset URL: %s", resetUrl);

        const message = `
            <h1>You have requested to change your password</h1>
            <p>You are receiving this because someone(hopefully you) has requested to change your password.<br/>
            Please click on the following link, or paste in your browswer to complete the password reset.
            </p>
            <p>
            <em>
            If you did not request this, you can safely ignore this email and your password will remain unchanged.
            </em>
            </p>
            <strong>DO NOT share this link with anyone else!</strong><br/>
            <small>
            <em>
            This password reset link will <string>expire after ${RESET_PASSWORD_TOKEN.expiry || 5} minutes.</strong>
            </em>
            <small/>
            </p>  
        `;
        try {
            await sendEmail({
                to: user.email,
                html: message,
                subject: "Reset password", 
            });
            res.status(200).json({
                success: true,
                message: "Reset Email sent!"
            })
        } catch (error) {
            user.resetpasswordtoken = undefined;
            user.resetpasswordtokenexpiry = undefined;
            await user.save();

            console.log(error);
            throw new CustomError("Email not sent", 500);
        }
    } catch (error) {
        console.log(error);
        next(error);
    }
}

//reset password
module.exports.resetPassword = async (req, res, next) => {
    try {
        console.log("req.params: ", req.params);
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            throw new CustomError(errors.array(), 422);
        }
        const resetToken = new String(req.params.resetToken);
        const [tokenValue, tokenSecret] = decodeURIComponent(resetToken).split("+");
        console.log({tokenValue, tokenSecret });

        const resetTokenHash = crypto
            .createHmac("sha256", tokenSecret)
            .update(tokenValue)
            .digest("hex");

        const user = await User.find({
            resetpasswordtoken: resetTokenHash,
            resetpasswordtokenexpiry: { $gt: Date.now() },
        });
        if(!user) throw new CustomError("The reset link is invalid", 400);
        console.log(user);

        user.password = req.body.password;
        user.resetpasswordtoken = undefined;
        user.resetpasswordtokenexpiry = undefined;

        await user.save();
        const message = `<h3>This is a confirmation that you have changed Password for your account.</h3>`;
        sendEmail({
            to: user.email,
            html: message,
            subject: "Password changed",
        });
        res.json({
            message: "Password reset successful",
            success: true,
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
};