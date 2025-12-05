/**************************************************************
 * CHECKOUT.JS — NGROK READY + COMPATIBLE CON TODA LA TIENDA
 **************************************************************/

import { apiGet, apiPost } from "./api.js";

let carrito = [];

document.addEventListener("DOMContentLoaded", async () => {
    inicializarTema();
    actualizarCarritoHeader();

    cargarCarrito();
    await cargarResumen();
    calcularTotales();

    document.getElementById("btn-procesar").addEventListener("click", procesarPedido);
});

/**************************************************************
 * TEMA
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
 * CARRITO HEADER
 **************************************************************/
function actualizarCarritoHeader() {
    const carrito = JSON.parse(localStorage.getItem("carrito_tienda") || "[]");
    const total = carrito.reduce((a, p) => a + p.cantidad, 0);
    document.getElementById("cart-count").textContent = total || "";
}

/**************************************************************
 * CARGAR CARRITO
 **************************************************************/
function cargarCarrito() {
    carrito = JSON.parse(localStorage.getItem("carrito_tienda") || "[]");

    if (carrito.length === 0) {
        mostrarNotificacion("Tu carrito está vacío", "warning");
        setTimeout(() => (location.href = "carrito.html"), 1500);
    }
}

/**************************************************************
 * RENDERIZAR RESUMEN DE COMPRA — usa apiGet()
 **************************************************************/
async function cargarResumen() {
    const cont = document.getElementById("resumen-items");
    cont.innerHTML = "";

    for (let item of carrito) {
        const res = await apiGet(`/catalogo-public/${item.id}`);
        if (!res.success) continue;

        const p = res.data;
        const price = p.precio_oferta ?? p.precio_venta;
        const subtotal = price * item.cantidad;

        cont.innerHTML += `
            <div class="checkout-item">
                <img src="${p.imagen_url || 'assets/no-image.png'}" class="checkout-img">
                <div>
                    <h4>${p.nombre_venta}</h4>
                    <p>${item.cantidad} x S/ ${price}</p>
                    <p class="checkout-subtotal">Subtotal: S/ ${subtotal.toFixed(2)}</p>
                </div>
            </div>
        `;
    }
}

/**************************************************************
 * CALCULAR TOTALES
 **************************************************************/
async function calcularTotales() {
    let total = 0;

    for (let item of carrito) {
        const res = await apiGet(`/catalogo-public/${item.id}`);
        if (!res.success) continue;

        const p = res.data;
        const price = p.precio_oferta ?? p.precio_venta;
        total += price * item.cantidad;
    }

    document.getElementById("checkout-subtotal").textContent = `S/ ${total.toFixed(2)}`;
    document.getElementById("checkout-total").textContent = `S/ ${total.toFixed(2)}`;

    return total;
}

/**************************************************************
 * PROCESAR PEDIDO (CREA CLIENTE + PEDIDO)
 **************************************************************/
async function procesarPedido() {
    const nombre = document.getElementById("cli-nombre").value.trim();
    const email = document.getElementById("cli-email").value.trim();
    const telefono = document.getElementById("cli-telefono").value.trim();
    const direccion = document.getElementById("cli-direccion").value.trim();
    const metodo_pago = document.getElementById("checkout-metodo").value;

    if (!nombre || !email || !telefono || !direccion) {
        mostrarNotificacion("Completa todos los datos", "warning");
        return;
    }

    let id_cliente = null;

    // Buscar cliente existente
    const cliente = await apiGet(`/clientes/email/${email}`);

    if (cliente.success && cliente.data) {
        id_cliente = cliente.data.id;
    } else {
        // Crear cliente
        const nuevo = await apiPost("/clientes", {
            nombre, email, telefono, direccion
        });

        if (!nuevo.success) {
            mostrarNotificacion("Error creando cliente", "error");
            return;
        }

        id_cliente = nuevo.data.id;
    }

    // Crear pedido
    const pedido = await apiPost("/pedidos", {
        id_cliente,
        metodo_pago,
        direccion,
        items: carrito
    });

    if (!pedido.success) {
        mostrarNotificacion("Error creando pedido", "error");
        return;
    }

    // Limpiar carrito
    localStorage.removeItem("carrito_tienda");

    mostrarNotificacion("Pedido registrado correctamente", "success");

    setTimeout(() => {
        location.href = "pedidos.html";
    }, 1500);
}

/**************************************************************
 * NOTIFICACIÓN
 **************************************************************/
function mostrarNotificacion(msg, tipo = "info") {
    const n = document.createElement("div");
    n.className = `notificacion notificacion--${tipo}`;
    n.textContent = msg;

    document.body.appendChild(n);

    setTimeout(() => n.classList.add("show"), 20);
    setTimeout(() => n.classList.remove("show"), 2800);
    setTimeout(() => n.remove(), 3300);
}
