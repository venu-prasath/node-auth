const jwt = require("jsonwebtoken");

const AuthorizationError = require("../config/errors/AuthorizationError.js");

const ACCESS_TOKEN = {
    secret: process.env.AUTH_ACCESS_TOKEN_SECRET,
};

module.exports.requireAuthentication = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");
        if(!authHeader?.startswith("Bearer ")) {
            throw new AuthorizationError(
                "Authorization Error",
                undefined,
                "You are unauthenticated!",
                {
                    error: "invalid_access_token",
                    error_description: "unknown authentication scheme",
                }
            );
        }

        const accessTokenParts = authHeader.split(" ");
        const aTkn = accessTokenParts[1];

        const decoded = jwt.verify(aTkn, ACCESS_TOKEN.secret);

        req.userId = decoded._id;
        req.token = aTkn;
        next();
    } catch (error) {
        console.log(error);

        const expParams = {
            error: "expired_access_token",
            error_description: "access token is expired",
        };
        if(error.name === "TokenExpiredError") {
            return next(
                new AuthorizationError(
                    "Authorization Error",
                    undefined,
                    "Token lifetime exceeded!",
                    expParams
                )
            );
        }
        next(error);
    }
}