const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

// Storage especial para Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "comprobantes_pagos", // Carpeta organizada en Cloudinary
        allowed_formats: ["jpg", "jpeg", "png"],
        transformation: [{ width: 1200, crop: "limit" }] // evita imágenes gigantes
    }
});

// Multer listo para usar en rutas
const upload = multer({ storage });

module.exports = upload;
