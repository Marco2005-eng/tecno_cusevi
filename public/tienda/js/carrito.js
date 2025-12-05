/**************************************************************
 * CARRITO.JS — NGROK / RAILWAY READY + VALIDACIÓN DE STOCK
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {
    inicializarTema();
    actualizarCarritoHeader();
    cargarCarrito();

    document.getElementById("vaciar-btn").addEventListener("click", vaciarCarrito);
    document.getElementById("checkout-btn").addEventListener("click", procesarPedido);
});

/**************************************************************
 * TEMA
 **************************************************************/
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

/**************************************************************
 * CONTADOR DEL CARRITO
 **************************************************************/
function actualizarCarritoHeader() {
    const carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    const badge = document.getElementById("cart-count");
    if (badge) {
        badge.textContent = carrito.reduce((a, p) => a + p.cantidad, 0);
    }
}

/**************************************************************
 * UTILIDADES
 **************************************************************/
function showLoading(el) {
    el.innerHTML = `<p style="text-align:center;color:var(--text-muted)">Cargando carrito...</p>`;
}

function showError(el, msg = "No se pudieron cargar los productos.") {
    el.innerHTML = `<p style="text-align:center;color:var(--accent)">${msg}</p>`;
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

    setTimeout(() => div.classList.add("show"), 50);
    div.querySelector(".notification-close").onclick = cerrar;

    function cerrar() {
        div.classList.remove("show");
        setTimeout(() => div.remove(), 300);
    }

    setTimeout(cerrar, 3000);
}

/**************************************************************
 * CARGAR CARRITO
 **************************************************************/
async function cargarCarrito() {
    const items = document.getElementById("carrito-items");
    const empty = document.getElementById("carrito-vacio");

    showLoading(items);

    const carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];

    if (!carrito.length) {
        items.style.display = "none";
        empty.style.display = "flex";
        calcularTotales();
        return;
    }

    try {
        const data = await apiGet("/catalogo-public");

        if (!data.success) throw new Error();

        const productos = data.data;

        const html = carrito.map(item => {
            const p = productos.find(prod => prod.id === item.id);
            if (!p) return null;

            const precio = p.oferta_activa ? p.precio_oferta : p.precio_venta;

            return generarItemCarritoHTML(p, item, precio);
        }).filter(Boolean);

        if (!html.length) {
            items.style.display = "none";
            empty.style.display = "flex";
            calcularTotales();
            return;
        }

        items.style.display = "flex";
        empty.style.display = "none";
        items.innerHTML = html.join("");

        asignarEventosItems();
        calcularTotales();

    } catch (e) {
        console.error("❌ Error cargando carrito:", e);
        showError(items, "Error de conexión con el servidor.");
    }
}

/**************************************************************
 * ITEM HTML
 **************************************************************/
function generarItemCarritoHTML(p, item, precio) {
    return `
        <div class="carrito-item" data-id="${p.id}">
            <img src="${p.imagen_url}" alt="${p.nombre_venta}">
            
            <div class="carrito-item-details">
                <h4>${p.nombre_venta}</h4>
                <p>Stock: ${p.stock_disponible ?? "N/A"}</p>
            </div>

            <div class="carrito-item-price">
                S/ ${Number(precio).toFixed(2)}
            </div>

            <div class="carrito-item-cantidad">
                <button class="cantidad-btn minus">-</button>
                <input type="number" value="${item.cantidad}" readonly>
                <button class="cantidad-btn plus">+</button>
            </div>

            <button class="carrito-item-remove" title="Eliminar">
                ✖
            </button>
        </div>
    `;
}

/**************************************************************
 * EVENTOS
 **************************************************************/
function asignarEventosItems() {
    const items = document.getElementById("carrito-items");

    items.onclick = e => {
        const item = e.target.closest(".carrito-item");
        if (!item) return;

        const id = item.dataset.id;

        if (e.target.classList.contains("plus")) cambiarCantidad(id, 1);
        if (e.target.classList.contains("minus")) cambiarCantidad(id, -1);
        if (e.target.classList.contains("carrito-item-remove")) eliminarItem(id);
    };
}

/**************************************************************
 * VALIDAR Y CAMBIAR CANTIDAD (DINÁMICO)
 **************************************************************/
async function cambiarCantidad(id, delta) {
    let cart = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    const item = cart.find(p => p.id == id);

    if (!item) return;

    try {
        const data = await apiGet(`/catalogo-public/${id}`);

        if (!data.success) {
            mostrarNotificacion("Error consultando stock", "error");
            return;
        }

        const stock = data.data.stock_disponible;

        if (delta > 0 && item.cantidad + delta > stock) {
            mostrarNotificacion(`Solo hay ${stock} unidades disponibles`, "warning");
            return;
        }

        item.cantidad += delta;

        if (item.cantidad <= 0) return eliminarItem(id);

        localStorage.setItem("carrito_tienda", JSON.stringify(cart));
        cargarCarrito();
        actualizarCarritoHeader();

    } catch (e) {
        console.error("Error validando stock:", e);
        mostrarNotificacion("No se pudo validar stock", "error");
    }
}

/**************************************************************
 * ELIMINAR / VACIAR
 **************************************************************/
function eliminarItem(id) {
    let cart = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    cart = cart.filter(p => p.id != id);

    localStorage.setItem("carrito_tienda", JSON.stringify(cart));
    mostrarNotificacion("Producto eliminado", "success");
    cargarCarrito();
    actualizarCarritoHeader();
}

function vaciarCarrito() {
    if (!confirm("¿Vaciar todo el carrito?")) return;

    localStorage.removeItem("carrito_tienda");
    mostrarNotificacion("Carrito vaciado", "success");
    cargarCarrito();
    actualizarCarritoHeader();
}

/**************************************************************
 * TOTALES
 **************************************************************/
function calcularTotales() {
    const items = document.querySelectorAll(".carrito-item");

    let subtotal = 0;

    items.forEach(item => {
        const precio = parseFloat(item.querySelector(".carrito-item-price").textContent.replace("S/ ", ""));
        const cantidad = Number(item.querySelector("input").value);
        subtotal += precio * cantidad;
    });

    document.getElementById("resumen-subtotal").textContent = `S/ ${subtotal.toFixed(2)}`;
    document.getElementById("resumen-total").textContent = `S/ ${subtotal.toFixed(2)}`;
}

/**************************************************************
 * VALIDAR STOCK ANTES DE PEDIDO
 **************************************************************/
async function validarStockAntesDePedir() {
    const carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];

    for (const item of carrito) {
        const data = await apiGet(`/catalogo-public/${item.id}`);

        if (!data.success) continue;

        const stock = data.data.stock_disponible;

        if (item.cantidad > stock) {
            mostrarNotificacion(
                `Stock insuficiente para "${data.data.nombre_venta}". Disponible: ${stock}`,
                "warning"
            );
            return false;
        }
    }

    return true;
}

/**************************************************************
 * PROCESAR PEDIDO
 **************************************************************/
async function procesarPedido() {
    const carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];

    if (!carrito.length) {
        mostrarNotificacion("El carrito está vacío", "warning");
        return;
    }

    // 🔥 Validar stock real antes de enviar pedido
    const ok = await validarStockAntesDePedir();
    if (!ok) return;

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user.id_cliente) {
        mostrarNotificacion("Inicia sesión para continuar", "warning");
        return setTimeout(() => window.location.href = "perfil.html", 1500);
    }

    const total = parseFloat(document.getElementById("resumen-total").textContent.replace("S/ ", ""));

    const payload = {
        id_cliente: user.id_cliente,
        metodo_pago: "simulado",
        total,
        productos: carrito.map(c => ({
            id_producto: c.id,
            cantidad: c.cantidad
        }))
    };

    try {
        const data = await apiPost("/pedidos/simular", payload);

        if (!data.success) throw new Error(data.message);

        localStorage.removeItem("carrito_tienda");
        mostrarNotificacion("Pedido creado con éxito", "success");

        setTimeout(() => {
            window.location.href = `pago.html?pedido=${data.data.id_pedido}`;
        }, 1500);

    } catch (e) {
        console.error(e);
        mostrarNotificacion("Error al procesar pedido", "error");
    }
}
