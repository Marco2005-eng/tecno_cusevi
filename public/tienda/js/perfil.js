/**************************************************************
 * PERFIL CLIENTE — COMPATIBLE CON API.JS (GET / POST)
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {
    inicializarTema();
    actualizarCarritoHeader();

    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || !user.email) {
        mostrarNotificacion("Debes iniciar sesión para ver tu perfil.", "warning");
        sessionStorage.setItem("redirect_after_login", window.location.href);
        setTimeout(() => window.location.href = "../auth/login.html", 1500);
        return;
    }

    cargarDatosDelCliente(user.email);
    configurarEventosFormulario();
});

/**************************************************************
 * TEMA
 **************************************************************/
function inicializarTema() {
    const body = document.body;
    const toggle = document.querySelector(".theme-toggle");
    const saved = localStorage.getItem("theme") || "light";

    if (saved === "light") body.classList.add("light-mode");
    else body.classList.remove("light-mode");

    toggle?.addEventListener("click", () => {
        const isLight = body.classList.toggle("light-mode");
        localStorage.setItem("theme", isLight ? "light" : "dark");
    });
}

/**************************************************************
 * CARRITO
 **************************************************************/
function actualizarCarritoHeader() {
    const carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    const total = carrito.reduce((a, p) => a + p.cantidad, 0);
    const badge = document.getElementById("cart-count");

    if (badge) badge.textContent = total > 0 ? total : "";
}

/**************************************************************
 * NOTIFICACIONES
 **************************************************************/
function mostrarNotificacion(msg, tipo = "success") {
    const box = document.createElement("div");
    box.className = `notification ${tipo}`;
    box.innerHTML = `
        <span class="notification-icon">${tipo === "success" ? "✓" : "⚠"}</span>
        <span>${msg}</span>
        <button class="notification-close">&times;</button>
    `;

    document.body.appendChild(box);
    setTimeout(() => box.classList.add("show"), 20);

    const cerrar = () => {
        box.classList.remove("show");
        setTimeout(() => box.remove(), 250);
    };

    box.querySelector(".notification-close").onclick = cerrar;
    setTimeout(cerrar, 3000);
}

/**************************************************************
 * CARGAR DATOS DEL CLIENTE (USANDO apiGet)
 **************************************************************/
async function cargarDatosDelCliente(email) {
    const form = document.getElementById("perfil-form");
    Array.from(form.elements).forEach(e => e.disabled = true);

    try {
        const data = await apiGet(`/clientes/email/${email}`);

        if (data.success && data.data) {
            const c = data.data;

            document.getElementById("per-nombre").value = c.nombre || "";
            document.getElementById("per-email").value = c.email || "";
            document.getElementById("per-telefono").value = c.telefono || "";
            document.getElementById("per-direccion").value = c.direccion || "";
        } else {
            document.getElementById("per-email").value = email;
            mostrarNotificacion("Completa tus datos para agilizar tus próximas compras.", "info");
        }

    } catch (err) {
        console.error(err);
        mostrarNotificacion("No se pudieron cargar tus datos.", "error");
    } finally {
        Array.from(form.elements).forEach(e => e.disabled = false);
    }
}

/**************************************************************
 * EVENTOS FORMULARIO
 **************************************************************/
function configurarEventosFormulario() {
    document.getElementById("perfil-form").addEventListener("submit", guardarPerfil);
    document.getElementById("btn-cerrar").addEventListener("click", cerrarSesion);
}

/**************************************************************
 * GUARDAR PERFIL (USA fetch porque apiPost NO maneja token)
 **************************************************************/
async function guardarPerfil(e) {
    e.preventDefault();

    const btn = e.target.querySelector('button[type="submit"]');
    const original = btn.textContent;

    btn.disabled = true;
    btn.textContent = "Guardando...";

    const payload = {
        nombre: document.getElementById("per-nombre").value.trim(),
        email: document.getElementById("per-email").value.trim(),
        telefono: document.getElementById("per-telefono").value.trim(),
        direccion: document.getElementById("per-direccion").value.trim()
    };

    if (!payload.nombre || !payload.email) {
        mostrarNotificacion("Nombre y email son obligatorios.", "warning");
        btn.disabled = false;
        btn.textContent = original;
        return;
    }

    try {
        const token = localStorage.getItem("token");

        const res = await fetch(API + "/clientes/save-profile", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        // Guardar id_cliente si el backend lo devuelve
        if (data.data?.id) {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            user.id_cliente = data.data.id;
            localStorage.setItem("user", JSON.stringify(user));
        }

        mostrarNotificacion("Perfil actualizado correctamente.", "success");

    } catch (err) {
        console.error(err);
        mostrarNotificacion("No se pudo guardar tu perfil.", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = original;
    }
}

/**************************************************************
 * CERRAR SESIÓN
 **************************************************************/
function cerrarSesion() {
    if (confirm("¿Cerrar sesión?")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        mostrarNotificacion("Sesión cerrada.", "success");

        setTimeout(() => {
            window.location.href = "../auth/login.html";
        }, 1000);
    }
}
