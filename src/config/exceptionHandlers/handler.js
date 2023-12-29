//404 Error Handler
function LostErrorHandler(req, res, next) {
    res.status(404);
    res.json({
        error: "Resource not found",
    });
}

// General Exception Handler
function AppErrorHandler(err, req, res, next) {
    res.status(err.status || 500);

    if(err.authorizationError === true) {
        res.set(err.authHeaders);
    }

    const error = err?.cause || err?.message;
    const providedFeedback = err?.feedback;

    res.json({
        error,
        ...(providedFeedback && { feedback: providedFeedback }),
    });
}

module.exports = { LostErrorHandler, AppErrorHandler };