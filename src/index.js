require("dotenv").config();
const express = require("express");
const cors = require("cors");

const dbConnection = require("./dbConn/mongoose/");
const corsOptions = require("./config/cors/cors.js");
const { AppErrorHandler,
        LostErrorHandler,
} = require("./config/exceptionHandlers/handler.js");
const CustomError = require("./config/errors/CustomErrors.js");
const routes = require("./routes");

const app = express();
app.use(cors(corsOptions));
const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
    res.send("Hello from API!!");
});

// Test Crash Route
app.get("/boom", (req, res, next) => {
    try {
        throw new CustomError("Oops! matters are chaotic", 400);
    } catch (error) {
        next(error);
    }
});

app.use("/api", routes);

app.all("*", function(req, res, next) {
    next();
});
app.use(LostErrorHandler);
app.use(AppErrorHandler);

app.on("ready", () => {
    app.listen(PORT, () => {
        console.log(`App running on port ${PORT}`);
    });
});

dbConnection.then(() => {
    console.log(`---- Database is connected------`);
    app.emit("ready");
});

