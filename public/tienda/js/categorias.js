// ============================================================
//  CATEGORÍAS.JS – COMPATIBLE CON NGROK + apiGet()
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
    inicializarTema();
    cargarLogo();
    actualizarCarritoHeader();
    await cargarCategorias();
});

// ============================================================
//  TEMA
// ============================================================

function inicializarTema() {
    const body = document.body;
    const toggle = document.querySelector(".theme-toggle");

    const saved = localStorage.getItem("theme") || "light";
    body.classList.toggle("light-mode", saved === "light");

    if (toggle) {
        toggle.onclick = () => {
            const isLight = body.classList.toggle("light-mode");
            localStorage.setItem("theme", isLight ? "light" : "dark");
        };
    }
}

// ============================================================
//  LOGO DINÁMICO (usa apiGet)
// ============================================================

async function cargarLogo() {
    try {
        const data = await apiGet("/config");

        const logo = document.getElementById("site-logo");
        if (data.success && data.data.store_logo && logo) {
            logo.src = data.data.store_logo;
        }
    } catch {
        console.warn("⚠ No se pudo cargar el logo.");
    }
}

// ============================================================
//  CARRITO
// ============================================================

function actualizarCarritoHeader() {
    const cart = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    const badge = document.getElementById("cart-count");
    badge.textContent = cart.reduce((t, p) => t + p.cantidad, 0);
}

// ============================================================
//  CARGAR CATEGORÍAS (NGROK-READY)
// ============================================================

async function cargarCategorias() {
    const placeholder = document.getElementById("categorias-placeholder");
    const grid = document.getElementById("categorias-grid");
    const vacio = document.getElementById("categorias-vacio");

    try {
        const data = await apiGet("/categorias");

        placeholder.style.display = "none";

        if (!data.success || !data.data.length) {
            vacio.style.display = "flex";
            return;
        }

        grid.innerHTML = data.data.map(cat => `
            <a href="catalogo.html?cat=${cat.id}" class="categoria-card-large">
                <div class="categoria-card-large__icon">
                    ${iconoCategoriaSVG(cat.nombre)}
                </div>
                <div class="categoria-card-large__content">
                    <h3 class="categoria-card-large__title">${cat.nombre}</h3>
                    <p class="categoria-card-large__description">
                        ${cat.descripcion || "Explora esta categoría"}
                    </p>
                </div>
            </a>
        `).join("");

        grid.style.display = "grid";

    } catch (error) {
        console.error("❌ Error cargando categorías:", error);

        placeholder.style.display = "none";
        vacio.querySelector("h3").textContent = "Error al cargar las categorías";
        vacio.querySelector("p").textContent = "Por favor, intenta recargar la página.";
        vacio.style.display = "flex";
    }
}

// ============================================================
//  ICONOS SVG
// ============================================================

function iconoCategoriaSVG(nombre) {
    nombre = nombre.toLowerCase();

    if (nombre.includes("celu"))
        return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><circle cx="12" cy="18" r="1"/></svg>`;

    if (nombre.includes("lap") || nombre.includes("note"))
        return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M1 18h22"/></svg>`;

    if (nombre.includes("pc") || nombre.includes("compu"))
        return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/></svg>`;

    if (nombre.includes("audio"))
        return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/><path d="M8 15v5M16 15v5"/></svg>`;

    if (nombre.includes("accesorio"))
        return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>`;

    return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
}
