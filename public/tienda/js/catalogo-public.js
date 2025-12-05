// ============================================================
//  CATALOGO.JS – VERSIÓN OFICIAL COMPATIBLE CON NGROK
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
    inicializarTema();
    cargarLogo();
    actualizarCarritoHeader();

    await cargarCategorias();
    await cargarMarcas();
    await cargarProductos();

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
//  LOGO DINÁMICO (usa apiGet como index.js)
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
    el.innerHTML = `<p style="grid-column:1/-1;text-align:center;">Cargando...</p>`;
}

function showError(el, msg) {
    el.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:red">${msg}</p>`;
}

// ============================================================
//  CARGAR CATEGORÍAS Y MARCAS (NGROK-READY)
// ============================================================

async function cargarCategorias() {
    const select = document.getElementById("filtro-categoria");

    try {
        const data = await apiGet("/categorias");

        select.innerHTML = `
            <option value="">Todas</option>
            ${data.data.map(c => `<option value="${c.id}">${c.nombre}</option>`).join("")}
        `;

    } catch {
        select.innerHTML = `<option>Error al cargar categorías</option>`;
    }
}

async function cargarMarcas() {
    const select = document.getElementById("filtro-marca");

    try {
        const data = await apiGet("/marcas");

        select.innerHTML = `
            <option value="">Todas</option>
            ${data.data.map(m => `<option value="${m.id}">${m.nombre}</option>`).join("")}
        `;

    } catch {
        select.innerHTML = `<option>Error al cargar marcas</option>`;
    }
}

// ============================================================
//  CARGAR PRODUCTOS (NGROK-READY)
// ============================================================

let productosOriginal = [];

async function cargarProductos() {
    const grid = document.getElementById("productos-list");
    showLoading(grid);

    try {
        const data = await apiGet("/catalogo-public");

        if (!data.success) return showError(grid, "Error al cargar productos");

        productosOriginal = data.data;

        aplicarFiltros();

    } catch (err) {
        console.error(err);
        showError(grid, "No se pudo cargar el catálogo.");
    }
}

// ============================================================
//  RENDERIZAR PRODUCTOS
// ============================================================

function renderizarProductos(lista) {
    const grid = document.getElementById("productos-list");
    const noResults = document.getElementById("no-results");
    const count = document.getElementById("result-count");

    if (!lista.length) {
        grid.innerHTML = "";
        noResults.style.display = "flex";
        count.textContent = "0";
        return;
    }

    noResults.style.display = "none";
    count.textContent = lista.length;

    grid.innerHTML = lista.map(p => {
        const normal = Number(p.precio_venta);
        const oferta = p.oferta_activa ? Number(p.precio_oferta) : null;

        return `
        <div class="producto-card ${oferta ? "producto-card--oferta" : ""}"
             onclick="abrirProducto(${p.id})">

            <div class="producto-card__img">
                <img src="${p.imagen_url}" alt="${p.nombre_venta}">
            </div>

            <div class="producto-card__content">
                <h3>${p.nombre_venta}</h3>

                <div class="producto-card__precio">
                    ${oferta
                        ? `
                          <span class="producto-card__precio-original">S/ ${normal.toFixed(2)}</span>
                          <span class="producto-card__precio-actual">S/ ${oferta.toFixed(2)}</span>
                        `
                        : `<span class="producto-card__precio-actual">S/ ${normal.toFixed(2)}</span>`
                    }
                </div>

                <button class="btn btn--small btn--primary"
                    onclick="event.stopPropagation();
                             agregarAlCarrito(${p.id},
                             '${p.nombre_venta.replace(/'/g, "\\'")}',
                             ${oferta || normal},
                             '${p.imagen_url}')">
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
    const form = document.getElementById("filtros-form");

    form.onsubmit = e => {
        e.preventDefault();
        aplicarFiltros();
    };

    document.getElementById("btn-limpiar-filtros").onclick = () => {
        form.reset();
        aplicarFiltros();
    };

    document.getElementById("search-bar").oninput = aplicarFiltros;
}

function aplicarFiltros() {
    let lista = [...productosOriginal];

    const txt = document.getElementById("search-bar").value.toLowerCase();
    const cat = document.getElementById("filtro-categoria").value;
    const marca = document.getElementById("filtro-marca").value;
    const min = parseFloat(document.getElementById("precio-min").value) || 0;
    const max = parseFloat(document.getElementById("precio-max").value) || Infinity;
    const ordenar = document.getElementById("ordenar-por").value;

    if (txt) lista = lista.filter(p => p.nombre_venta.toLowerCase().includes(txt));
    if (cat) lista = lista.filter(p => p.id_categoria == cat);
    if (marca) lista = lista.filter(p => p.id_marca == marca);
    lista = lista.filter(p => Number(p.precio_venta) >= min && Number(p.precio_venta) <= max);

    switch (ordenar) {
        case "precio-asc": lista.sort((a, b) => a.precio_venta - b.precio_venta); break;
        case "precio-desc": lista.sort((a, b) => b.precio_venta - a.precio_venta); break;
        case "nombre-asc": lista.sort((a, b) => a.nombre_venta.localeCompare(b.nombre_venta)); break;
        case "nombre-desc": lista.sort((a, b) => b.nombre_venta.localeCompare(a.nombre_venta)); break;
    }

    renderizarProductos(lista);
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
