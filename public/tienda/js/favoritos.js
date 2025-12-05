/**************************************************************
 * FAVORITOS.JS — NGROK READY + OPTIMIZADO
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {
    inicializarTema();
    actualizarCarritoHeader();
    cargarFavoritos();
});

/**************************************************************
 *  TEMA
 **************************************************************/
function inicializarTema() {
    const body = document.body;
    const toggle = document.querySelector(".theme-toggle");
    const saved = localStorage.getItem("theme") || "light";

    body.classList.toggle("light-mode", saved === "light");

    toggle?.addEventListener("click", () => {
        const isLight = body.classList.toggle("light-mode");
        localStorage.setItem("theme", isLight ? "light" : "dark");
    });
}

/**************************************************************
 *  CARRITO (contador)
 **************************************************************/
function actualizarCarritoHeader() {
    const carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    const total = carrito.reduce((a, p) => a + p.cantidad, 0);
    document.getElementById("cart-count").textContent = total > 0 ? total : "";
}

/**************************************************************
 * UTILIDADES (Loading, Error, Notificación)
 **************************************************************/
function showLoading(container) {
    container.innerHTML = `
        <p style="text-align:center;color:var(--text-muted);grid-column:1 / -1;">
            Cargando favoritos...
        </p>`;
}

function showError(container, msg = "No se pudieron cargar tus favoritos.") {
    container.innerHTML = `
        <p style="text-align:center;color:var(--accent);grid-column:1 / -1;">
            ${msg}
        </p>`;
}

function mostrarNotificacion(msg, tipo = "success") {
    const div = document.createElement("div");
    div.className = `notification ${tipo}`;
    div.innerHTML = `
        <span class="notification-icon">${tipo === "success" ? "✓" : "⚠"}</span>
        <span>${msg}</span>
        <button class="notification-close">&times;</button>
    `;
    document.body.appendChild(div);

    setTimeout(() => div.classList.add("show"), 20);

    const cerrar = () => {
        div.classList.remove("show");
        setTimeout(() => div.remove(), 250);
    };

    div.querySelector(".notification-close").onclick = cerrar;
    setTimeout(cerrar, 3000);
}

/**************************************************************
 *  CARGAR FAVORITOS — usa apiGet()
 **************************************************************/
async function cargarFavoritos() {
    const grid = document.getElementById("favoritos-grid");
    const vacio = document.getElementById("favoritos-vacios");

    showLoading(grid);

    const favoritosIds = JSON.parse(localStorage.getItem("favoritos") || "[]");

    if (!favoritosIds.length) {
        grid.style.display = "none";
        vacio.style.display = "flex";
        return;
    }

    try {
        // Promise.all para cargar en paralelo
        const peticiones = favoritosIds.map(id => apiGet(`/catalogo-public/${id}`));
        const resultados = await Promise.all(peticiones);

        const productos = resultados
            .filter(r => r.success && r.data)
            .map(r => r.data);

        if (!productos.length) {
            grid.style.display = "none";
            vacio.style.display = "flex";
            return;
        }

        grid.style.display = "grid";
        vacio.style.display = "none";

        grid.innerHTML = productos.map(generarTarjetaFavoritoHTML).join("");
        asignarEventosTarjetas();

    } catch (e) {
        console.error(e);
        showError(grid, "Error al conectar con el servidor.");
    }
}

/**************************************************************
 * TARJETA DE FAVORITO
 **************************************************************/
function generarTarjetaFavoritoHTML(producto) {
    const normal = Number(producto.precio_venta);
    const oferta = producto.oferta_activa ? Number(producto.precio_oferta) : null;
    const descuento = producto.oferta_activa ? producto.descuento_porcentaje : 0;

    return `
        <div class="producto-card ${producto.oferta_activa ? "producto-card--oferta" : ""}"
             data-id="${producto.id}"
             data-discount="-${descuento}% DTO">
            
            <button class="producto-card__remove-fav" title="Eliminar de favoritos">
                🗑
            </button>

            <div class="producto-card__img" onclick="abrirProducto(${producto.id})">
                <img src="${producto.imagen_url || 'assets/no-image.png'}" alt="${producto.nombre_venta}">
            </div>

            <div class="producto-card__content">
                <h3 class="producto-card__title">${producto.nombre_venta}</h3>
                <p class="producto-card__description">${producto.descripcion_corta || ""}</p>

                <div class="producto-card__precio">
                    ${
                        oferta
                        ? `
                        <span class="producto-card__precio-original">S/ ${normal.toFixed(2)}</span>
                        <span class="producto-card__precio-actual">S/ ${oferta.toFixed(2)}</span>`
                        : `
                        <span class="producto-card__precio-actual">S/ ${normal.toFixed(2)}</span>`
                    }
                </div>

                <button class="btn btn--small btn--primary btn-add-to-cart">
                    Añadir al carrito
                </button>
            </div>
        </div>
    `;
}

/**************************************************************
 * EVENTOS (eliminar y añadir al carrito)
 **************************************************************/
function asignarEventosTarjetas() {
    const grid = document.getElementById("favoritos-grid");

    grid.onclick = e => {
        const card = e.target.closest(".producto-card");
        if (!card) return;

        const id = card.dataset.id;

        if (e.target.closest(".producto-card__remove-fav")) {
            eliminarFavorito(id);
            return;
        }

        if (e.target.closest(".btn-add-to-cart")) {
            const nombre = card.querySelector(".producto-card__title").textContent;
            const precio = parseFloat(
                card.querySelector(".producto-card__precio-actual")
                .textContent.replace("S/ ", "")
            );
            const imagen = card.querySelector("img").src;

            agregarAlCarrito(id, nombre, precio, imagen);
            return;
        }
    };
}

/**************************************************************
 * ACCIONES
 **************************************************************/
function eliminarFavorito(id) {
    let favoritos = JSON.parse(localStorage.getItem("favoritos") || "[]");
    favoritos = favoritos.filter(f => f != id);
    localStorage.setItem("favoritos", JSON.stringify(favoritos));

    mostrarNotificacion("Producto eliminado de favoritos", "success");
    cargarFavoritos();
}

function agregarAlCarrito(id, nombre, precio, imagen) {
    let carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    const existe = carrito.find(p => p.id == id);

    if (existe) {
        existe.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, imagen, cantidad: 1 });
    }

    localStorage.setItem("carrito_tienda", JSON.stringify(carrito));
    actualizarCarritoHeader();
    mostrarNotificacion("Producto agregado al carrito", "success");
}

function abrirProducto(id) {
    window.location.href = `producto.html?id=${id}`;
}
