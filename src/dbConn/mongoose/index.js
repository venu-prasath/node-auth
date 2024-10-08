const mongoose = require("mongoose");

const connURI = process.env.MONGODB_URI;

mongoose.set("strictQuery", false);
mongoose.set("bufferCommands", false);

const db = mongoose.connect(connURI);

db.catch((err) => {
    if(err.message.code === "ETIMEOUT") {
        console.log(`---${err.message.code}----`);
        mongoose.connect(connURI);
    }
    console.log(`----${err.message}----`);
})

module.exports = db;
