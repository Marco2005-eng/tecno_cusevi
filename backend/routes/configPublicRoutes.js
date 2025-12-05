// routes/configPublicRoutes.js
const express = require("express");
const router = express.Router();
const { getPublicConfig } = require("../controllers/configPublicController");

router.get("/", getPublicConfig);

module.exports = router;
