// ============================================================
//  OFERTAS.JS – COMPATIBLE CON NGROK + apiGet()
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
    inicializarTema();
    cargarLogo();
    actualizarCarritoHeader();

    await cargarCategorias();
    await cargarOfertas();

    configurarEventosFiltros();
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

        if (data.success && data.data.store_logo) {
            const logo = document.getElementById("site-logo");
            if (logo) logo.src = data.data.store_logo;
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
//  UTILIDADES
// ============================================================

function showLoading(el) {
    el.innerHTML = `<p style="grid-column:1/-1;text-align:center;">Cargando ofertas...</p>`;
}

function showError(el, msg = "No se pudieron cargar las ofertas.") {
    el.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:red">${msg}</p>`;
}

// ============================================================
//  CARGAR OFERTAS (usa apiGet)
// ============================================================

let ofertasOriginal = [];

async function cargarOfertas() {
    const grid = document.getElementById("ofertas-grid");
    showLoading(grid);

    try {
        const data = await apiGet("/ofertas/activas");

        if (!data.success) return showError(grid, "Error al cargar ofertas.");

        ofertasOriginal = data.data;

        renderizarOfertas(ofertasOriginal);

    } catch (err) {
        console.error("❌ Error cargando ofertas:", err);
        showError(grid);
    }
}

// ============================================================
//  RENDERIZAR OFERTAS
// ============================================================

function renderizarOfertas(lista) {
    const grid = document.getElementById("ofertas-grid");
    const noResults = document.getElementById("no-ofertas");

    if (!lista.length) {
        grid.innerHTML = "";
        noResults.style.display = "flex";
        return;
    }

    noResults.style.display = "none";

    grid.innerHTML = lista.map(p => {
        const normal = Number(p.precio_original);
        const oferta = Number(p.precio_oferta);
        const desc = p.descuento_porcentaje;

        return `
        <div class="producto-card producto-card--oferta"
             data-discount="-${desc}% DTO"
             onclick="abrirProducto(${p.id_catalogo})">

            <div class="producto-card__img">
                <img src="${p.imagen_url}" alt="${p.producto_nombre}">
            </div>

            <div class="producto-card__content">
                <h3>${p.producto_nombre}</h3>
                <p class="producto-card__description">${p.descripcion_corta || ""}</p>

                <div class="producto-card__precio">
                    <span class="producto-card__precio-original">S/ ${normal.toFixed(2)}</span>
                    <span class="producto-card__precio-actual">S/ ${oferta.toFixed(2)}</span>
                </div>

                <button class="btn btn--small btn--primary"
                    onclick="event.stopPropagation();
                             agregarAlCarrito(
                                 ${p.id_catalogo},
                                 '${p.producto_nombre.replace(/'/g, "\\'")}',
                                 ${oferta},
                                 '${p.imagen_url}'
                             )">
                    Añadir al carrito
                </button>
            </div>
        </div>`;
    }).join("");
}

// ============================================================
//  FILTROS
// ============================================================

function configurarEventosFiltros() {
    document.getElementById("filtro-categoria-ofertas").onchange = aplicarFiltros;
    document.getElementById("filtro-descuento").onchange = aplicarFiltros;
    document.getElementById("ordenar-ofertas").onchange = aplicarFiltros;
    document.getElementById("search-bar").oninput = aplicarFiltros;
}

// ============================================================
//  CATEGORÍAS PARA FILTRO (usa apiGet)
// ============================================================

async function cargarCategorias() {
    const select = document.getElementById("filtro-categoria-ofertas");

    try {
        const data = await apiGet("/categorias");

        select.innerHTML = `
            <option value="">Todas</option>
            ${data.data.map(c => `<option value="${c.id}">${c.nombre}</option>`).join("")}
        `;

    } catch (err) {
        console.error(err);
        select.innerHTML = `<option>Error al cargar categorías</option>`;
    }
}

// ============================================================
//  APLICAR FILTROS
// ============================================================

// ============================================================
//  APLICAR FILTROS (CORREGIDO)
// ============================================================

function aplicarFiltros() {
    let lista = [...ofertasOriginal];

    const txt = document.getElementById("search-bar").value.toLowerCase();
    const cat = document.getElementById("filtro-categoria-ofertas").value;
    const descMin = Number(document.getElementById("filtro-descuento").value) || 0;
    const ordenar = document.getElementById("ordenar-ofertas").value;

    // FILTRO DE TEXTO
    if (txt)
        lista = lista.filter(p =>
            p.producto_nombre.toLowerCase().includes(txt)
        );

    // FILTRO POR CATEGORÍA (CORREGIDO)
    if (cat)
        lista = lista.filter(p =>
            p.id_categoria && Number(p.id_categoria) === Number(cat)
        );

    // FILTRO POR DESCUENTO MÍNIMO
    lista = lista.filter(p => p.descuento_porcentaje >= descMin);

    // ORDENAMIENTO
    switch (ordenar) {
        case "precio-asc":
            lista.sort((a, b) => a.precio_oferta - b.precio_oferta);
            break;

        case "precio-desc":
            lista.sort((a, b) => b.precio_oferta - a.precio_oferta);
            break;

        case "descuento":
            lista.sort((a, b) => b.descuento_porcentaje - a.descuento_porcentaje);
            break;

        case "nuevos":
            lista.sort((a, b) => b.id_catalogo - a.id_catalogo);
            break;
    }

    renderizarOfertas(lista);
}


// ============================================================
//  ACCIONES
// ============================================================

function agregarAlCarrito(id, nombre, precio, imagen) {
    const KEY = "carrito_tienda";
    let cart = JSON.parse(localStorage.getItem(KEY)) || [];

    const item = cart.find(p => p.id === id);

    if (item) item.cantidad++;
    else cart.push({ id, nombre, precio, imagen, cantidad: 1 });

    localStorage.setItem(KEY, JSON.stringify(cart));
    actualizarCarritoHeader();
}

function abrirProducto(id) {
    location.href = `producto.html?id=${id}`;
}
