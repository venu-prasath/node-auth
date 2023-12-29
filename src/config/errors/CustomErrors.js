class CustomError extends Error {

    constructor(message, statusCode, feedback = "") {
        super(message);
        this.name = "CustomError";
        this.status = statusCode;
        this.cause = message;
        this.feedback = String(feedback);
    }
}

module.exports = CustomError;