/**************************************************************
 * PRODUCTO INDIVIDUAL — NGROK READY + OPTIMIZADO
 **************************************************************/

import { apiGet } from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("producto-contenedor");
    const relacionadosGrid = document.getElementById("relacionados-grid");

    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));

    if (!id) {
        contenedor.innerHTML = `<p>Producto no encontrado.</p>`;
        return;
    }

    // Cargar el producto
    const productoRes = await apiGet(`/catalogo-public/${id}`);

    if (!productoRes.success || !productoRes.data) {
        contenedor.innerHTML = `<p>Error cargando producto.</p>`;
        return;
    }

    const producto = productoRes.data;
    renderProducto(producto);

    // Cargar productos relacionados
    const catalogoRes = await apiGet("/catalogo-public");
    if (catalogoRes.success) {
        renderRelacionados(catalogoRes.data, producto);
    }
});

/**************************************************************
 * RENDER DEL PRODUCTO
 **************************************************************/
function renderProducto(p) {
    const contenedor = document.getElementById("producto-contenedor");

    const precioBase = Number(p.precio_venta).toFixed(2);
    const precioOferta = p.oferta_activa ? Number(p.precio_oferta).toFixed(2) : null;

    contenedor.innerHTML = `
        <div class="producto-grid">

            <div class="producto-img">
                <img src="${p.imagen_url || 'assets/no-image.png'}">
            </div>

            <div class="producto-info">
                <h1>${p.nombre_venta}</h1>

                <p class="sub-cat">${p.nombre_marca} • ${p.nombre_categoria}</p>

                <div class="precio-box">
                    ${
                        p.oferta_activa
                        ? `
                            <span class="precio-oferta">S/ ${precioOferta}</span>
                            <span class="precio-tachado">S/ ${precioBase}</span>
                            <span class="badge-oferta">-${p.descuento_porcentaje}%</span>
                          `
                        : `<span class="precio-normal">S/ ${precioBase}</span>`
                    }
                </div>

                <p class="stock ${p.stock_disponible > 0 ? "" : "sin-stock"}">
                    Stock disponible: ${p.stock_disponible}
                </p>

                <p class="descripcion">${p.descripcion || "Sin descripción disponible."}</p>

                <div class="producto-btns">
                    <button class="btn btn-primary" onclick="agregarAlCarrito(${p.id}, '${p.nombre_venta}', ${precioOferta ?? precioBase}, '${p.imagen_url}')">
                        Añadir al carrito
                    </button>

                    <button class="btn btn-secondary" onclick="toggleFavorito(${p.id})">
                        ❤️ Favorito
                    </button>
                </div>
            </div>

        </div>
    `;
}

/**************************************************************
 * PRODUCTOS RELACIONADOS
 **************************************************************/
function renderRelacionados(catalogo, p) {
    const relacionadosGrid = document.getElementById("relacionados-grid");

    const relacionados = catalogo
        .filter(x => x.id !== p.id && x.id_categoria === p.id_categoria)
        .slice(0, 4);

    relacionadosGrid.innerHTML = "";

    relacionados.forEach(item => {
        const precio = Number(item.precio_oferta ?? item.precio_venta).toFixed(2);

        relacionadosGrid.innerHTML += `
            <div class="catalog-card">
                <div class="card-img" onclick="location.href='producto-individual.html?id=${item.id}'">
                    <img src="${item.imagen_url}">
                </div>

                <h3>${item.nombre_venta}</h3>
                <p class="categoria">${item.nombre_categoria}</p>

                <p class="precio">S/ ${precio}</p>

                <div class="card-actions">
                    <button class="btn-add-cart"
                        onclick="agregarAlCarrito(${item.id}, '${item.nombre_venta}', ${precio}, '${item.imagen_url}')">
                        Agregar
                    </button>
                </div>
            </div>
        `;
    });
}

/**************************************************************
 * CARRITO (LOCALSTORAGE)
 **************************************************************/
window.agregarAlCarrito = function (id, nombre, precio, imagen) {
    const CART_KEY = "carrito_tienda";
    let carrito = JSON.parse(localStorage.getItem(CART_KEY)) || [];

    const item = carrito.find(p => p.id === id);

    if (item) item.cantidad++;
    else carrito.push({ id, nombre, precio, imagen, cantidad: 1 });

    localStorage.setItem(CART_KEY, JSON.stringify(carrito));

    mostrarToast("Producto agregado al carrito");
};

/**************************************************************
 * FAVORITOS (LOCALSTORAGE)
 **************************************************************/
window.toggleFavorito = function (id) {
    let fav = JSON.parse(localStorage.getItem("favoritos") || "[]");

    if (fav.includes(id)) {
        fav = fav.filter(x => x !== id);
        mostrarToast("Quitado de favoritos");
    } else {
        fav.push(id);
        mostrarToast("Añadido a favoritos ❤️");
    }

    localStorage.setItem("favoritos", JSON.stringify(fav));
};

/**************************************************************
 * NOTIFICACIONES TOAST
 **************************************************************/
function mostrarToast(msg) {
    const n = document.createElement("div");
    n.className = "toast";
    n.textContent = msg;
    document.body.appendChild(n);

    setTimeout(() => n.classList.add("show"), 20);
    setTimeout(() => n.classList.remove("show"), 2500);
    setTimeout(() => n.remove(), 3000);
}
