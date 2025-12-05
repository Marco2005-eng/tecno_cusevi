const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.rol) decoded.rol = "cliente"; // fallback
        req.usuario = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Token inválido"
        });
    }
};
