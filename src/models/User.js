const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const CustomError = require("../config/errors/CustomErrors");

const ACCESS_TOKEN = {
    secret: process.env.AUTH_ACCESS_TOKEN_SECRET,
    expiry: process.env.AUTH_ACCESS_TOKEN_EXPIRY,
};
const REFRESH_TOKEN = {
    secret: process.env.AUTH_REFRESH_TOKEN_SECRET,
    expiry: process.env.AUTH_REFRESH_TOKEN_EXPIRY,
};
const RESET_PASSWORD_TOKEN = {
    expiry: process.env.RESET_PASSWORD_TOKEN_EXPIRY_MINS,
};

//1. Create User Scheme
const User = mongoose.Schema;
const UserSchema = new User({
    firstName: { type: String, required: [true, "First Name is required"] },
    lastName: { type: String, required: [true, "Last Name is required"] },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    tokens: [
        {
            token: { required: true, type: String }
        }
    ],
    resetpasswordtoken: String,
    resetpasswordtokenexpiry: Date,
});

//2. set schema option
UserSchema.set("toJSON", {
    virtuals: true,
    transform: (doc, ret, options) => {
        delete ret.password;
        delete ret.tokens;
        return ret;
    }
});

//3. Attach Middleware
UserSchema.pre("save", async (next) => {
    try {
        if(this.isModified("password")) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }
        next();
    } catch (error) {
        next(error);
    }
});

//4. Attach Custom Static methods
UserSchema.statics.findByCredentials = async (email, password) => {
    const user = await UserModel.findOne({email});
    if(!user) {
        throw new CustomError(
            "Wrong credential",
            400,
            "Email or password is wrong!"
        );
    }
    const passwdMatch = await bcrypt.compare(password, user.password);
    if(!passwdMath) {
        throw new CustomError(
            "Wrong credentials!!",
            400,
            "Email or password is wrong!"
        );
    }
    return user;
};

//5. Custom Instance Methods
UserSchema.methods.generateAccessToken = function() {
    const user = this;

    const accessToken = jwt.sign(
        {
            _id: user._id.toString(),
            fullName: `${user.firstName} ${user.lastName}`,
            email: user.email,
        },
        ACCESS_TOKEN.secret,
        {
            expiresIn: ACCESS_TOKEN.expiry,
        }
    );
    return accessToken;
};

UserSchema.methods.generateRefreshToken = async function() {
    const user = this;

    const refreshToken = jwt.sign(
        {
            _id: user._id.toString(),
        },
        REFRESH_TOKEN.secret,
        {
            expiresIn: REFRESH_TOKEN.expiry,
        }
    );

    const rTknHash = crypto
        .createHmac("sha256", REFRESH_TOKEN.secret)
        .update(refreshToken)
        .digest("hex");

    user.tokens.push({ token: rTknHash });
    await user.save();

    return refreshToken;
}


module.exports = UserModel;