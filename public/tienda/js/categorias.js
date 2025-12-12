// ============================================================
//  CATEGORÍAS + PRODUCTOS POR CATEGORÍA
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
    inicializarTema();
    cargarLogo();
    actualizarCarritoHeader();
    await cargarCategoriasConProductos();
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
        const data = await apiGet("/config");
        const logo = document.getElementById("site-logo");
        if (data.success && data.data.store_logo && logo) {
            logo.src = data.data.store_logo;
        }
    } catch { }
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
//  CATEGORÍAS + SUS PRODUCTOS
// ============================================================

async function cargarCategoriasConProductos() {
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

        grid.style.display = "grid";

        grid.innerHTML = ""; // vaciar

        for (const cat of data.data) {
            
           
            const productos = await apiGet(`/productos?categoria=${cat.id}`);

            const productosHTML = productos.success && productos.data.length
                ? productos.data.slice(0, 3).map(p => `
                    <div class="cat-prod-item">
                        <img src="${p.imagen_url}" alt="${p.nombre}">
                        <span>${p.nombre}</span>
                    </div>
                `).join("")
                : `<p class="cat-no-prods">Sin productos disponibles</p>`;


            grid.innerHTML += `
                <div class="categoria-bloque">
                    
                    <a href="catalogo.html?categoria=${cat.id}" class="categoria-card-large">
                        <div class="categoria-card-large__icon">
                            ${iconoCategoriaSVG(cat.nombre)}
                        </div>

                        <div class="categoria-card-large__content">
                            <h3>${cat.nombre}</h3>
                            <p>${cat.descripcion || ""}</p>
                            <p class="cat-count">${cat.total_productos || 0} productos</p>
                        </div>
                    </a>

                    <div class="categoria-productos-preview">
                        ${productosHTML}
                    </div>

                </div>
            `;
        }

    } catch (error) {
        console.error("Error cargando categorías:", error);
        placeholder.style.display = "none";
        vacio.style.display = "flex";
    }
}


function iconoCategoriaSVG(nombre) {
    nombre = nombre.toLowerCase();

    if (nombre.includes("celu"))
        return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="2" width="10" height="20" rx="2"/></svg>`;

    if (nombre.includes("lap") || nombre.includes("note"))
        return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="12"/></svg>`;

    if (nombre.includes("pc") || nombre.includes("compu"))
        return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="14"/></svg>`;

    return `<svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
}
