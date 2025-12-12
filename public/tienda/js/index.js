// ============================================================
//  INDEX.JS – VERSIÓN FINAL + WHATSAPP FLOATING BUTTON
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {
    inicializarTema();
    cargarLogo();
    actualizarCarritoHeader();

    // Cargar todos los productos globales
    await cargarTodosLosProductos();

    // Renderizar secciones
    await cargarCategorias();
    cargarOfertas();
    cargarDestacados();

    // Activar buscador
    asignarEventosBuscador();

    // Activar botón WhatsApp
    inicializarBotonWhatsapp();
});

// ============================================================
//  VARIABLE GLOBAL
// ============================================================

let todosLosProductos = [];

// ============================================================
//  CARGAR TODOS LOS PRODUCTOS (usa apiGet del api.js)
// ============================================================

async function cargarTodosLosProductos() {
    try {
        const data = await apiGet("/catalogo-public");
        if (data.success) {
            todosLosProductos = data.data;
        } else {
            console.error("⚠ API no devolvió productos.");
        }
    } catch (err) {
        console.error("❌ Error:", err);
    }
}

// ============================================================
//  TEMA CLARO / OSCURO
// ============================================================

function inicializarTema() {
    const body = document.body;
    const toggle = document.querySelector(".theme-toggle");

    const guardado = localStorage.getItem("theme") || "light";
    body.classList.toggle("light-mode", guardado === "light");

    if (toggle) {
        toggle.onclick = () => {
            const esLight = body.classList.toggle("light-mode");
            localStorage.setItem("theme", esLight ? "light" : "dark");
        };
    }
}

// ============================================================
//  LOGO DINÁMICO
// ============================================================

async function cargarLogo() {
    try {
        const data = await apiGet("/config");
        if (data.success && data.data.logo) {
            const logo = document.getElementById("site-logo");
            if (logo) logo.src = data.data.logo;
        }
    } catch {
        console.warn("⚠ No se pudo cargar el logo.");
    }
}

// ============================================================
//  CARRITO
// ============================================================

function actualizarCarritoHeader() {
    let cart = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    const badge = document.getElementById("cart-count");
    badge.textContent = cart.reduce((t, p) => t + p.cantidad, 0);
}

// ============================================================
//  CATEGORÍAS
// ============================================================

async function cargarCategorias() {
    const box = document.getElementById("categorias-container");
    showLoading(box);

    try {
        const data = await apiGet("/categorias");

        if (!data.success) return showError(box, "Error cargando categorías.");

        box.innerHTML = data.data.map(
            cat => `
            <a href="catalogo.html?cat=${cat.id}" class="categoria-card">
                <div class="categoria-card__icon">${iconoCategoriaSVG(cat.nombre)}</div>
                <h3>${cat.nombre}</h3>
            </a>`
        ).join("");

    } catch {
        showError(box, "No se pudieron cargar las categorías.");
    }
}

function iconoCategoriaSVG(nombre) {
    const map = {
        laptops: "💻",
        smartphones: "📱",
        componentes: "🧩",
        periféricos: "🎧"
    };
    return map[nombre.toLowerCase()] || "📦";
}

// ============================================================
//  OFERTAS
// ============================================================

function cargarOfertas() {
    const box = document.getElementById("ofertas-container");
    showLoading(box);

    const ofertas = todosLosProductos.filter(p => p.oferta_activa);
    if (!ofertas.length) return showError(box, "No hay ofertas disponibles.");

    renderProductos(box, ofertas);
}

// ============================================================
//  DESTACADOS
// ============================================================

function cargarDestacados() {
    const box = document.getElementById("destacados-container");
    showLoading(box);

    const destacados = todosLosProductos.filter(p => p.destacado);
    if (!destacados.length) return showError(box, "No hay productos destacados.");

    renderProductos(box, destacados);
}

// ============================================================
//  RENDERIZAR PRODUCTOS
// ============================================================

function renderProductos(container, productos) {
    container.innerHTML = productos.map(prod => {
        const normal = Number(prod.precio_venta);
        const oferta = prod.oferta_activa ? Number(prod.precio_oferta) : null;

        return `
        <div class="producto-card ${oferta ? "producto-card--oferta" : ""}"
             onclick="abrirProducto(${prod.id})">

            <div class="producto-card__img">
                <img src="${prod.imagen_url}" alt="${prod.nombre_venta}">
            </div>

            <div class="producto-card__content">
                <h3>${prod.nombre_venta}</h3>
                <div class="producto-card__precio">
                    ${oferta 
                        ? `<span class="producto-card__precio-original">S/ ${normal.toFixed(2)}</span>
                           <span class="producto-card__precio-actual">S/ ${oferta.toFixed(2)}</span>`
                        : `<span class="producto-card__precio-actual">S/ ${normal.toFixed(2)}</span>`
                    }
                </div>

                <button class="btn btn--primary"
                    onclick="event.stopPropagation();
                    agregarAlCarritoIndex(
                        ${prod.id},
                        '${prod.nombre_venta.replace(/'/g, "\\'")}',
                        ${oferta || normal},
                        '${prod.imagen_url}'
                    )">
                    Añadir al carrito
                </button>
            </div>
        </div>`;
    }).join("");
}

// ============================================================
//  BUSCADOR
// ============================================================

function asignarEventosBuscador() {
    const input = document.getElementById("search-bar");
    const btn = document.querySelector(".search-bar__button");

    const buscar = () => {
        const term = input.value.trim().toLowerCase();
        const section = document.getElementById("search-results-section");
        const title = document.getElementById("search-term-display");
        const box = document.getElementById("search-results-container");

        if (!term) {
            section.style.display = "none";
            return;
        }

        const results = todosLosProductos.filter(p =>
            p.nombre_venta.toLowerCase().includes(term)
        );

        section.style.display = "block";
        title.textContent = input.value;

        results.length
            ? renderProductos(box, results)
            : box.innerHTML = "<p>No se encontraron resultados.</p>";
    };

    btn.onclick = buscar;
    input.onkeyup = e => e.key === "Enter" && buscar();
}

// ============================================================
//  WHATSAPP FLOATING BUTTON
// ============================================================

function inicializarBotonWhatsapp() {
    const toggleBtn = document.getElementById("whatsapp-toggle");
    const menu = document.getElementById("whatsapp-menu");

    if (!toggleBtn || !menu) return;

        
    toggleBtn.onclick = () => {
        menu.classList.toggle("visible");
    };


    document.addEventListener("click", e => {
        if (!menu.contains(e.target) && e.target !== toggleBtn) {
            menu.classList.remove("visible");
        }
    });


    document.querySelectorAll(".whatsapp-option").forEach(btn => {
        btn.onclick = () => {
            const texto = btn.dataset.msg;
            abrirWhatsapp(texto);
        };
    });
}

function abrirWhatsapp(mensaje) {
    const numero = "51944670870"; 
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
}

// ============================================================
//  UTILIDADES
// ============================================================

function showLoading(el) {
    el.innerHTML = "<p>Cargando...</p>";
}

function showError(el, msg) {
    el.innerHTML = `<p style="color:red">${msg}</p>`;
}

function abrirProducto(id) {
    location.href = `producto.html?id=${id}`;
}

function agregarAlCarritoIndex(id, nombre, precio, imagen) {
    const KEY = "carrito_tienda";

    let cart = JSON.parse(localStorage.getItem(KEY)) || [];
    const p = cart.find(i => i.id === id);

    if (p) p.cantidad++;
    else cart.push({ id, nombre, precio, imagen, cantidad: 1 });

    localStorage.setItem(KEY, JSON.stringify(cart));
    actualizarCarritoHeader();
}
