// =========================
//  API BASE UNIVERSAL
// =========================

// Siempre usar el dominio actual, local o producción
const API = window.location.origin + "/api";

// =========================
//  GET
// =========================
async function apiGet(url) {
    try {
        const res = await fetch(API + url);

        if (!res.ok) {
            console.error(" Error GET", res.status, res.statusText);
            return { success: false };
        }

        return await res.json();
    } catch (err) {
        console.error("Error GET:", err);
        return { success: false };
    }
}

// =========================
//  POST
// =========================
async function apiPost(url, data) {
    try {
        const res = await fetch(API + url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            console.error(" Error POST", res.status, res.statusText);
            return { success: false };
        }

        return await res.json();
    } catch (err) {
        console.error("Error POST:", err);
        return { success: false };
    }
}

// =========================
//  PUT FormData (comprobantes)
// =========================
async function apiPutForm(url, formData) {
    try {
        const res = await fetch(API + url, {
            method: "PUT",
            body: formData
        });

        if (!res.ok) {
            console.error(" Error PUT FORM", res.status, res.statusText);
            return { success: false };
        }

        return await res.json();
    } catch (err) {
        console.error(" Error PUT FormData:", err);
        return { success: false };
    }
}
