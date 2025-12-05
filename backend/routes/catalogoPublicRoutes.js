const express = require("express");
const router = express.Router();
const { getCatalogoPublic, getCatalogoPublicById } = require("../controllers/catalogoPublicController");

router.get("/", getCatalogoPublic);
router.get("/:id", getCatalogoPublicById);

module.exports = router;
