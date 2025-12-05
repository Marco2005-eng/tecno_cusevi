// Detectar si estamos en ngrok o servidor remoto
const isRemote = window.location.origin.includes("ngrok")
              || window.location.origin.startsWith("https");

// API base
const API = isRemote
    ? window.location.origin + "/api"
    : "http://localhost:3000/api";

// Función GET universal
async function apiGet(url) {
    try {
        const res = await fetch(API + url);
        return await res.json();
    } catch (err) {
        console.error("❌ Error GET:", err);
        return { success: false };
    }
}

// Función POST universal
async function apiPost(url, data) {
    try {
        const res = await fetch(API + url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        return await res.json();
    } catch (err) {
        console.error("❌ Error POST:", err);
        return { success: false };
    }
}
// PUT con FormData (para comprobantes de pago)
async function apiPutForm(url, formData) {
    try {
        const res = await fetch(API + url, {
            method: "PUT",
            body: formData
        });
        return await res.json();
    } catch (err) {
        console.error("❌ Error PUT FormData:", err);
        return { success: false };
    }
}
