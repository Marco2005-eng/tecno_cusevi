/**************************************************************
 * API.JS — PANEL ADMIN (NGROK + PRODUCCIÓN + TOKEN READY)
 **************************************************************/

/* ============================================================
   DETECTAR URL BASE AUTOMÁTICAMENTE
============================================================ */

function detectarApiBase() {
    const stored = localStorage.getItem("ADMIN_API_BASE_URL");
    if (stored) return stored;

    const host = location.hostname;

    // LOCALHOST
    if (host === "localhost" || host === "127.0.0.1") {
        return "http://localhost:3000/api";
    }

    // NGROK (subdominios aleatorios + extensión .ngrok-free.app)
    if (host.includes("ngrok")) {
        return `${location.origin}/api`;
    }

    // PRODUCCIÓN (Render / VPS / Railway / Hostinger / CPanel)
    return `${location.origin}/api`;
}

const ADMIN_API_BASE = detectarApiBase();

/* ============================================================
   HELPER GENERAL — TOKEN + ERRORES + AUTO-LOGOUT
============================================================ */

async function adminApiRequest(endpoint, options = {}) {
    const url = `${ADMIN_API_BASE}${endpoint}`;

    // Agregar token automáticamente
    options.headers = options.headers || {};
    options.headers["Authorization"] =
        `Bearer ${localStorage.getItem("token") || ""}`;

    try {
        const res = await fetch(url, options);

        // Si el token expiró
        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            alert("Sesión expirada. Por favor inicia sesión nuevamente.");
            window.location.href = "../auth/login.html";
            return;
        }

        const data = await res.json();
        return data;

    } catch (error) {
        console.error("❌ ERROR API:", error);
        return {
            success: false,
            message: "Error al conectar con el servidor."
        };
    }
}

/**************************************************************
 * MÉTODOS GET / POST / PUT / DELETE — ESTÁNDAR PARA TODO EL PANEL
 **************************************************************/

function adminApiGet(endpoint) {
    return adminApiRequest(endpoint, { method: "GET" });
}

function adminApiPost(endpoint, body) {
    return adminApiRequest(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

function adminApiPut(endpoint, body) {
    return adminApiRequest(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

function adminApiDelete(endpoint) {
    return adminApiRequest(endpoint, {
        method: "DELETE"
    });
}

/**************************************************************
 * FORM DATA — SUBIR IMÁGENES O ARCHIVOS
 **************************************************************/

function adminApiUpload(endpoint, formData) {
    return adminApiRequest(endpoint, {
        method: "POST",
        body: formData
    });
}

function adminApiPutUpload(endpoint, formData) {
    return adminApiRequest(endpoint, {
        method: "PUT",
        body: formData
    });
}

/**************************************************************
 * DEBUG
 **************************************************************/
console.log(
    "%cADMIN API BASE → ",
    "color:#00aaff;font-weight:bold;",
    ADMIN_API_BASE
);
function adminApiGet(endpoint) {
    return adminApiRequest(endpoint, { method: "GET" });
}

function adminApiPost(endpoint, body) {
    return adminApiRequest(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

function adminApiPut(endpoint, body) {
    return adminApiRequest(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

/* 🔥 AQUÍ ESTÁ LA NUEVA FUNCIÓN */
function adminApiPatch(endpoint, body) {
    return adminApiRequest(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

function adminApiDelete(endpoint) {
    return adminApiRequest(endpoint, { method: "DELETE" });
}
