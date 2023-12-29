const CustomError = require("./CustomErrors");

class AuthorizationError extends CustomError {

    constructor(message, statusCode, feedback, authParams) {
        super(message, statusCode || 401, feedback);
        this.authorizationError = true;
        this.authParams = authParams || {};
        this.authHeaders = {
            "WWW-Authenticate": `Bearer ${this.#stringifyAuthParams()}`,
        };
    }

    #stringifyAuthParams() {
        let str = "";
        let {realm, ...others } = this.authParams;
        realm = realm ? realm : "apps";
        str = `realm=${realm}`;

        const otherParams = Object.keys(others);
        if(otherParams.length < 1) return str;

        otherParams.forEach((authParam, index, array) => {
            if(authParam.toLowerCase() === "realm") {
                delete others[authParam];
            }

            let comma = ",";

            if(array.length -1 === index) comma = "";

            str = str + `${authParam}=${this.authParams[authParam]}${comma}`;
        });

        return str;
    }
}

module.exports = AuthorizationError;