const authValidators = require("./auth-validator");
const userValidators = require("./user-validators");

module.exports = {
    ...authValidators,
    ...userValidators,
};