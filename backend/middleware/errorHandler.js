// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error("ERROR CAPTURADO:", err);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Error interno del servidor",
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack
    });
};

module.exports = errorHandler;
