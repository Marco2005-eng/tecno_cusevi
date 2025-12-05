document.addEventListener("DOMContentLoaded", () => {
    cargarConfiguraciones();
    document.getElementById("config-form").addEventListener("submit", guardarConfiguraciones);
});

/* ============================================================
   CARGAR CONFIGURACIÓN DESDE LA API
============================================================ */
async function cargarConfiguraciones() {
    try {
        const res = await fetch("http://localhost:3000/api/configuracion");
        const json = await res.json();

        if (!json.success) return;

        const config = json.data;

        document.querySelectorAll("[data-key]").forEach(el => {
            const key = el.dataset.key;

            if (el.type === "checkbox") {
                el.checked = config[key] == "1";
            } else {
                el.value = config[key] || "";
            }
        });

    } catch (err) {
        console.error("Error cargando configuración:", err);
    }
}

/* ============================================================
   GUARDAR CAMBIOS
============================================================ */
async function guardarConfiguraciones(e) {
    e.preventDefault();

    const payload = {};

    document.querySelectorAll("[data-key]").forEach(el => {
        const key = el.dataset.key;

        if (el.type === "checkbox") {
            payload[key] = el.checked ? "1" : "0";
        } else {
            payload[key] = el.value.trim();
        }
    });

    try {
        const res = await fetch("http://localhost:3000/api/configuracion", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const json = await res.json();

        if (!json.success) {
            alert("Error guardando: " + json.message);
            return;
        }

        mostrarToast("Configuración guardada correctamente");

    } catch (err) {
        console.error("Error guardando configuración:", err);
    }
}

/* ============================================================
   TOAST
============================================================ */
function mostrarToast(texto) {
    const toast = document.getElementById("toast");
    toast.textContent = texto;

    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}
