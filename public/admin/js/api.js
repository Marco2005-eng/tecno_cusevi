/**************************************************************
 * API.JS — PANEL ADMIN (FUNCIONA EN LOCAL, FILE://, NGROK Y RENDER)
 **************************************************************/

/* ============================================================
   DETECTAR API BASE DE FORMA INTELIGENTE
============================================================ */

function detectarApiBase() {
    const origen = window.location.origin;

    // 1️⃣ Si estamos en Render → usar Render
    if (origen.includes("render.com")) {
        return origen + "/api";
    }

    // 2️⃣ Si estamos en ngrok → usar ngrok
    if (origen.includes("ngrok")) {
        return origen + "/api";
    }

    // 3️⃣ Si estamos en localhost → usar backend local
    if (origen.includes("localhost") || origen.includes("127.0.0.1")) {
        return "http://localhost:3000/api";
    }

    // 4️⃣ Si estamos en file:// → usar API de Render (IMPORTANTE)
    if (origen.startsWith("file://")) {
        return "https://tecno-cusevi.onrender.com/api";
    }

    // 5️⃣ Fallback general (por si lo subes a otro hosting)
    return origen + "/api";
}

const ADMIN_API_BASE = detectarApiBase();

/**************************************************************
 * REQUEST GENERAL
 **************************************************************/
async function adminApiRequest(endpoint, options = {}) {
    const url = `${ADMIN_API_BASE}${endpoint}`;

    options.headers = options.headers || {};
    options.headers["Authorization"] =
        `Bearer ${localStorage.getItem("token") || ""}`;

    try {
        const res = await fetch(url, options);

        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            alert("Sesión expirada. Inicia nuevamente.");
            window.location.href = "../auth/login.html";
            return { success: false };
        }

        return await res.json();

    } catch (err) {
        console.error("❌ ERROR API:", err);
        return { success: false, message: "No se pudo conectar con el servidor" };
    }
}

/**************************************************************
 * MÉTODOS BÁSICOS
 **************************************************************/
function adminApiGet(e) { return adminApiRequest(e, { method: "GET" }); }
function adminApiPost(e, b) { return adminApiRequest(e, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); }
function adminApiPut(e, b) { return adminApiRequest(e, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); }
function adminApiPatch(e, b) { return adminApiRequest(e, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }); }
function adminApiDelete(e) { return adminApiRequest(e, { method: "DELETE" }); }

/**************************************************************
 * FORM DATA — subida de imágenes
 **************************************************************/
function adminApiUpload(e, f) { return adminApiRequest(e, { method: "POST", body: f }); }
function adminApiPutUpload(e, f) { return adminApiRequest(e, { method: "PUT", body: f }); }

/**************************************************************
 * DEBUG
 **************************************************************/
console.log("%cADMIN API BASE → ", "color:#00aaff;font-weight:bold;", ADMIN_API_BASE);
