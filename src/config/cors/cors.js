const allowList = ["http://localhost:3000", "http://localhost:8000/", "localhost:8000", "[::1]:8000"];
const corsOptions = {
    origin: function(origin, callback) {
        //console.log(origin);
        // if(allowList.includes(origin)) {
        //     callback(null, true);
        // } else {
        //     callback(new Error("Not allowed by CORS"));
        // }
        callback(null, true);
    },
    credentials: true, // for Access-Control-Allow-Credentials
    exposedHeaders: ["WWW-Authenticate"] // for Access-control-Expose-Headers
};

module.exports = corsOptions;