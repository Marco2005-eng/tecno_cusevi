// ============================================================
//  CATEGORÍAS.JS – FINAL OPTIMIZADO
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
//  LOGO DINÁMICO
// ============================================================

async function cargarLogo() {
    try {
        const res = await apiGet("/config");
        const logo = document.getElementById("site-logo");

        if (res.success && res.data.store_logo && logo) {
            logo.src = res.data.store_logo;
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
//  CARGAR CATEGORÍAS (con imágenes + cantidad de productos)
// ============================================================

async function cargarCategorias() {
    const placeholder = document.getElementById("categorias-placeholder");
    const grid = document.getElementById("categorias-grid");
    const vacio = document.getElementById("categorias-vacio");

    try {
        const res = await apiGet("/categorias");

        placeholder.style.display = "none";

        if (!res.success || res.data.length === 0) {
            vacio.style.display = "flex";
            return;
        }

        grid.innerHTML = "";

        res.data.forEach(cat => {
            const imgHTML = cat.imagen_url
                ? `<div class="categoria-card-large__img" style="background-image:url('${cat.imagen_url}')"></div>`
                : `<div class="categoria-card-large__icon">${iconoCategoriaSVG(cat.nombre)}</div>`;

            const productos = cat.total_productos ?? "—";

            grid.innerHTML += `
                <a href="catalogo.html?categoria=${cat.id}" class="categoria-card-large">

                    ${imgHTML}

                    <div class="categoria-card-large__content">
                        <h3 class="categoria-card-large__title">${cat.nombre}</h3>

                        <p class="categoria-card-large__description">
                            ${cat.descripcion || "Explora esta categoría"}
                        </p>

                        <span class="categoria-card-large__count">
                            ${productos} productos
                        </span>
                    </div>
                </a>
            `;
        });

        grid.style.display = "grid";

    } catch (err) {
        console.error("❌ Error cargando categorías:", err);

        placeholder.style.display = "none";
        vacio.querySelector("h3").textContent = "Error al cargar las categorías";
        vacio.querySelector("p").textContent = "Por favor, intenta nuevamente.";
        vacio.style.display = "flex";
    }
}

// ============================================================
//  ICONOS SVG AUTOMÁTICOS
// ============================================================

function iconoCategoriaSVG(nombre) {
    const n = nombre.toLowerCase();

    if (n.includes("celu"))
        return `<svg width="40" height="40" stroke="currentColor" fill="none" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/><circle cx="12" cy="18" r="1"/></svg>`;

    if (n.includes("lap") || n.includes("note"))
        return `<svg width="40" height="40" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M1 18h22"/></svg>`;

    if (n.includes("pc") || n.includes("compu"))
        return `<svg width="40" height="40" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8"/></svg>`;

    if (n.includes("audio"))
        return `<svg width="40" height="40" stroke="currentColor" fill="none" stroke-width="2"><circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/><path d="M8 15v5M16 15v5"/></svg>`;

    if (n.includes("accesorio"))
        return `<svg width="40" height="40" stroke="currentColor" fill="none" stroke-width="2"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>`;

    return `<svg width="40" height="40" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
}
