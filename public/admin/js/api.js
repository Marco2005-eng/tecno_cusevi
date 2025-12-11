/**************************************************************
 * API.JS — PANEL ADMIN (Render FIXED VERSION)
 **************************************************************/

// ============================================================
//  API BASE FIJA A RENDER (SIEMPRE USA EL SERVIDOR ONLINE)
// ============================================================

const ADMIN_API_BASE = "https://tecno-cusevi.onrender.com/api";

console.log("%cADMIN API BASE → ", "color:#00aaff; font-weight:bold;", ADMIN_API_BASE);

/**************************************************************
 * REQUEST GENERAL — TOKEN + ERRORES + AUTO-LOGOUT
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

            alert("Sesión expirada. Por favor inicia sesión nuevamente.");
            window.location.href = "../auth/login.html";
            return { success: false };
        }

        return await res.json();

    } catch (error) {
        console.error("❌ ERROR API:", error);
        return { success: false, message: "Error al conectar con el servidor." };
    }
}

/**************************************************************
 * MÉTODOS BÁSICOS (GET / POST / PUT / PATCH / DELETE)
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
 * FORM DATA (UPLOADS)
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
