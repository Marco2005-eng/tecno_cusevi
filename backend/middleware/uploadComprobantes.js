const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/comprobantes/");
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const name = Date.now() + "-" + Math.round(Math.random() * 1E9) + ext;
        cb(null, name);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter(req, file, cb) {
        const allowed = /jpg|jpeg|png|webp/;
        const ext = path.extname(file.originalname).toLowerCase();
        const mime = file.mimetype;

        if (allowed.test(ext) && allowed.test(mime)) {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten imágenes"));
        }
    }
});

module.exports = upload;
