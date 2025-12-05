/**************************************************************
 * PRODUCTO.JS — NGROK READY + OPTIMIZADO + TEMA CLARO/OSCURO
 **************************************************************/

document.addEventListener("DOMContentLoaded", async () => {

    inicializarTema();  // <<< ACTIVAR TEMA AL CARGAR

    actualizarContadorCarrito();

    const id = obtenerIdProducto();
    if (!id) {
        console.error("❌ No se encontró el ID del producto en la URL.");
        return;
    }

    await cargarProducto(id);
});

/**************************************************************
 * TEMA — Claro / Oscuro
 **************************************************************/
function inicializarTema() {
    const body = document.body;
    const toggle = document.querySelector(".theme-toggle");

    // Recuperar tema guardado
    const savedTheme = localStorage.getItem("theme") || "light";

    // Aplicar tema guardado
    body.classList.toggle("light-mode", savedTheme === "light");

    // Actualizar íconos
    actualizarIconosTema(savedTheme === "light");

    // Evento del botón
    toggle?.addEventListener("click", () => {
        const isLight = body.classList.toggle("light-mode");
        localStorage.setItem("theme", isLight ? "light" : "dark");
        actualizarIconosTema(isLight);
    });
}

function actualizarIconosTema(isLight) {
    const sun = document.querySelector(".sun-icon");
    const moon = document.querySelector(".moon-icon");

    if (!sun || !moon) return;

    if (isLight) {
        sun.classList.remove("hidden");
        moon.classList.add("hidden");
    } else {
        sun.classList.add("hidden");
        moon.classList.remove("hidden");
    }
}

/**************************************************************
 * Obtener ID del producto desde la URL
 **************************************************************/
function obtenerIdProducto() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

/**************************************************************
 * Cargar datos del producto (usa apiGet)
 **************************************************************/
async function cargarProducto(id) {
    try {
        const data = await apiGet(`/catalogo-public/${id}`);

        if (!data.success || !data.data) {
            document.getElementById("producto-container").style.display = "none";
            document.getElementById("producto-no-encontrado").style.display = "block";
            return;
        }

        const p = data.data;

        /* Breadcrumb */
        document.getElementById("breadcrumb-categoria").textContent = p.nombre_categoria;
        document.getElementById("breadcrumb-categoria").href = `catalogo.html?cat=${p.id_categoria}`;
        document.getElementById("breadcrumb-nombre").textContent = p.nombre_venta;

        /* Datos principales */
        document.getElementById("product-image").src = p.imagen_url || "assets/placeholder.png";
        document.getElementById("product-title").textContent = p.nombre_venta;
        document.getElementById("product-description").textContent = p.descripcion || "Sin descripción disponible.";

        document.getElementById("product-categoria").textContent = p.nombre_categoria;
        document.getElementById("product-sku").textContent = p.id_producto || "N/D";

        /* Precios */
        const precioBase = Number(p.precio_venta).toFixed(2);
        const precioOferta = p.precio_oferta ? Number(p.precio_oferta).toFixed(2) : null;

        const priceEl = document.getElementById("product-price");
        const oldPriceEl = document.getElementById("product-old-price");
        const discountEl = document.getElementById("product-discount");

        if (p.oferta_activa && precioOferta) {
            priceEl.textContent = `S/ ${precioOferta}`;
            oldPriceEl.textContent = `S/ ${precioBase}`;
            oldPriceEl.style.display = "inline-block";

            discountEl.textContent = `-${p.descuento_porcentaje}%`;
            discountEl.style.display = "inline-block";
        } else {
            priceEl.textContent = `S/ ${precioBase}`;
            oldPriceEl.style.display = "none";
            discountEl.style.display = "none";
        }

        /* Stock */
        const stockText = document.getElementById("stock-text");
        if (p.stock_disponible > 0) {
            stockText.textContent = `En stock (${p.stock_disponible})`;
            stockText.style.color = "#2ecc71";
        } else {
            stockText.textContent = "Agotado";
            stockText.style.color = "#e74c3c";
        }

        /* Botones */
        configurarBotones(p);

        /* Productos relacionados */
        cargarRelacionados(p.id_categoria, p.id);

    } catch (error) {
        console.error("❌ Error cargando el producto:", error);
        document.getElementById("producto-container").style.display = "none";
        document.getElementById("producto-no-encontrado").style.display = "block";
    }
}

/**************************************************************
 * Botones (carrito + favoritos)
 **************************************************************/
function configurarBotones(producto) {
    document.getElementById("add-to-cart-form").onsubmit = (e) => {
        e.preventDefault();
        const qty = Number(document.getElementById("product-quantity").value);
        if (qty > 0) agregarAlCarrito(producto, qty);
    };

    document.getElementById("btn-fav").onclick = () => {
        agregarFavorito(producto.id);
    };
}

/**************************************************************
 * Carrito (localStorage)
 **************************************************************/
function agregarAlCarrito(producto, cantidad = 1) {
    let cart = JSON.parse(localStorage.getItem("carrito_tienda")) || [];

    const existe = cart.find(i => i.id === producto.id);

    if (existe) existe.cantidad += cantidad;
    else cart.push({
        id: producto.id,
        nombre: producto.nombre_venta,
        imagen: producto.imagen_url,
        precio: producto.oferta_activa ? producto.precio_oferta : producto.precio_venta,
        cantidad
    });

    localStorage.setItem("carrito_tienda", JSON.stringify(cart));
    actualizarContadorCarrito();
    mostrarNotificacion("Producto agregado al carrito 🛒");
}

function actualizarContadorCarrito() {
    const cart = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    const total = cart.reduce((sum, item) => sum + item.cantidad, 0);

    const badge = document.getElementById("cart-count");
    if (badge) badge.textContent = total;
}

/**************************************************************
 * Favoritos (localStorage)
 **************************************************************/
function agregarFavorito(id) {
    let fav = JSON.parse(localStorage.getItem("favoritos")) || [];

    if (!fav.includes(id)) {
        fav.push(id);
        localStorage.setItem("favoritos", JSON.stringify(fav));
        mostrarNotificacion("Producto añadido a favoritos ❤️");
    } else {
        mostrarNotificacion("Este producto ya está en tus favoritos");
    }
}

/**************************************************************
 * Productos relacionados (usa apiGet)
 **************************************************************/
async function cargarRelacionados(idCategoria, idActual) {
    const grid = document.getElementById("relacionados-grid");

    try {
        const data = await apiGet("/catalogo-public");

        if (!data.success) return;

        const relacionados = data.data
            .filter(p => p.id_categoria === idCategoria && p.id !== idActual)
            .slice(0, 4);

        grid.innerHTML = "";

        if (!relacionados.length) {
            grid.innerHTML = "<p>No hay productos relacionados.</p>";
            return;
        }

        relacionados.forEach(p => {
            const precio = Number(p.precio_venta).toFixed(2);
            const oferta = p.precio_oferta ? Number(p.precio_oferta).toFixed(2) : null;

            grid.innerHTML += `
                <div class="producto-card" onclick="location.href='producto.html?id=${p.id}'">
                    <div class="producto-card__img">
                        <img src="${p.imagen_url || 'assets/placeholder.png'}">
                        ${p.oferta_activa ? `<span class="producto-card__badge">-${p.descuento_porcentaje}%</span>` : ""}
                    </div>
                    <h3 class="producto-card__title">${p.nombre_venta}</h3>
                    <div class="producto-card__price">
                        ${
                            oferta
                            ? `<span class="price-offer">S/ ${oferta}</span>
                               <span class="price-old">S/ ${precio}</span>`
                            : `<span class="price-normal">S/ ${precio}</span>`
                        }
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("❌ Error cargando relacionados:", error);
        grid.innerHTML = "<p>No se pudieron cargar los productos relacionados.</p>";
    }
}

/**************************************************************
 * Notificación
 **************************************************************/
function mostrarNotificacion(msg) {
    const old = document.querySelector(".notificacion");
    if (old) old.remove();

    const n = document.createElement("div");
    n.className = "notificacion";
    n.textContent = msg;

    document.body.appendChild(n);

    setTimeout(() => n.classList.add("show"), 10);
    setTimeout(() => n.classList.remove("show"), 2500);
    setTimeout(() => n.remove(), 3100);
}
