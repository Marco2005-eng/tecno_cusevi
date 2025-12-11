/**************************************************************
 * API.JS — PANEL ADMIN (UNIVERSAL PARA LOCAL, NGROK Y RENDER)
 **************************************************************/

/* ============================================================
   API BASE UNIVERSAL
============================================================ */

// Siempre usar el dominio actual
const ADMIN_API_BASE = window.location.origin + "/api";

/**************************************************************
 * REQUEST GENERAL — TOKEN + ERRORES + AUTO-LOGOUT
 **************************************************************/
async function adminApiRequest(endpoint, options = {}) {
    const url = `${ADMIN_API_BASE}${endpoint}`;

    // Token automático
    options.headers = options.headers || {};
    options.headers["Authorization"] =
        `Bearer ${localStorage.getItem("token") || ""}`;

    try {
        const res = await fetch(url, options);

        // Token inválido o expirado
        if (res.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            alert("Sesión expirada. Por favor inicia sesión nuevamente.");
            window.location.href = "../auth/login.html";
            return { success: false };
        }

        // Si no es JSON válido
        if (!res.ok) {
            console.error("❌ Error API:", res.status, res.statusText);
            return { success: false };
        }

        return await res.json();

    } catch (error) {
        console.error("❌ ERROR API:", error);
        return {
            success: false,
            message: "Error al conectar con el servidor."
        };
    }
}

/**************************************************************
 * MÉTODOS BÁSICOS (GET / POST / PUT / DELETE)
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
 * DEBUG (Para ver que Render lo detectó)
 **************************************************************/
console.log(
    "%cADMIN API BASE → ",
    "color:#00aaff; font-weight:bold;",
    ADMIN_API_BASE
);
