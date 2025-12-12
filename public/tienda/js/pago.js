/**************************************************************
 * PAGO.JS — COMPLETO, CORREGIDO Y CON WHATSAPP
 **************************************************************/

document.addEventListener("DOMContentLoaded", async () => {
    inicializarTema();

    const pedidoID = new URLSearchParams(window.location.search).get("pedido");

    if (!pedidoID) {
        mostrarNotificacion("Pedido no válido. Serás redirigido.", "error");
        setTimeout(() => (window.location.href = "index.html"), 2500);
        return;
    }

    await cargarPedido(pedidoID);
    asignarEventosPago(pedidoID);
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
 * OBTENER DATOS DEL PERFIL
 **************************************************************/
function obtenerDatosPerfil() {
    const u = JSON.parse(localStorage.getItem("user") || "{}");

    return {
        nombre: u.nombre || "",
        email: u.email || "",
        telefono: u.telefono || "",
        direccion: u.direccion || ""
    };
}

/**************************************************************
 * OBTENER PRODUCTOS DEL PEDIDO (desde el DOM)
 **************************************************************/
function obtenerProductosDelPedido() {
    const items = document.querySelectorAll(".pago-producto-item");
    let productos = [];

    items.forEach(item => {
        const nombre = item.querySelector("h4")?.textContent || "";
        const cantidad = Number(item.querySelector("p:nth-child(2)")?.textContent.replace(/\D/g, "")) || 1;
        const subtotal = Number(item.querySelector("p:nth-child(3)")?.textContent.replace("Subtotal: S/ ", "")) || 0;

        productos.push({ nombre, cantidad, subtotal });
    });

    return productos;
}

/**************************************************************
 * GENERAR MENSAJE WHATSAPP
 **************************************************************/
function generarMensajeWhatsApp(tipo, total) {
    const perfil = obtenerDatosPerfil();
    const productos = obtenerProductosDelPedido();

    let lista = productos
        .map(p => `• ${p.nombre} x${p.cantidad} — S/ ${p.subtotal.toFixed(2)}`)
        .join("\n");

    let msg = `Hola, quiero confirmar mi pedido.\n\n`;

    msg += `🧍 Cliente: ${perfil.nombre}\n`;
    msg += `📱 Teléfono: ${perfil.telefono}\n`;
    msg += `✉️ Correo: ${perfil.email}\n`;

    if (tipo === "entrega")
        msg += `📍 Dirección: ${perfil.direccion}\n`;

    msg += `\n🛒 Productos:\n${lista}\n`;
    msg += `\n💵 Total: S/ ${total}\n`;

    msg += tipo === "entrega"
        ? `\n🚚 Método: Contra Entrega`
        : `\n🏬 Método: Recojo en Tienda`;

    return msg;
}

/**************************************************************
 * ABRIR WhatsApp
 **************************************************************/
function enviarWhatsApp(msg) {
    const admin = "51944670870";
    const url = `https://wa.me/${admin}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
}

/**************************************************************
 *  CARGA DE PEDIDO — usa apiGet()
 **************************************************************/
async function cargarPedido(id) {
    try {
        const data = await apiGet(`/pedidos/${id}`);

        if (!data.success) throw new Error(data.message);

        const pedido = data.pedido;
        const detalles = data.detalles;

        document.getElementById("pago-id-pedido").textContent = id;
        document.getElementById("pago-total").textContent = Number(pedido.total).toFixed(2);
        document.getElementById("qr-monto").textContent = Number(pedido.total).toFixed(2);
        document.getElementById("pago-estado").textContent = pedido.estado;

        const cont = document.getElementById("pago-productos-list");

        cont.innerHTML = detalles?.length
            ? detalles
                .map(prod => `
                <div class="pago-producto-item">
                    <img src="${prod.imagen_url || 'assets/placeholder.png'}" alt="${prod.producto}">
                    <div class="pago-producto-detalles">
                        <h4>${prod.producto}</h4>
                        <p>Cantidad: ${prod.cantidad}</p>
                        <p>Subtotal: S/ ${Number(prod.subtotal).toFixed(2)}</p>
                    </div>
                </div>
            `)
                .join("")
            : "<p>No hay productos para mostrar en este pedido.</p>";

    } catch (error) {
        console.error(error);
        mostrarNotificacion("Error cargando el pedido.", "error");
    }
}

/**************************************************************
 * EVENTOS DE UI
 **************************************************************/
function asignarEventosPago(pedidoID) {
    document.querySelectorAll(".metodo-btn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".metodo-btn")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");
            mostrarDetallesMetodo(btn.dataset.metodo);
        };
    });

    document.getElementById("btn-confirmar-pago").onclick = () =>
        confirmarPedido(pedidoID);
}

/**************************************************************
 * MOSTRAR DETALLES DE MÉTODO DE PAGO
 **************************************************************/
function mostrarDetallesMetodo(metodo) {
    const secciones = [
        "pago-qr-box",
        "pago-efectivo",
        "pago-recojo",
        "comprobante-box",
        "numero-yape",
        "numero-plin"
    ];

    secciones.forEach(id => (document.getElementById(id).style.display = "none"));

    if (metodo === "yape") {
        mostrar("pago-qr-box");
        mostrar("comprobante-box");
        mostrar("numero-yape");
        document.getElementById("qr-imagen").src = "assets/qr-yape.png";

    } else if (metodo === "plin") {
        mostrar("pago-qr-box");
        mostrar("comprobante-box");
        mostrar("numero-plin");
        document.getElementById("qr-imagen").src = "assets/qr-plin.png";

    } else if (metodo === "efectivo") {
        mostrar("pago-efectivo"); // CONTRA ENTREGA

    } else if (metodo === "recojo") {
        mostrar("pago-recojo");
    }
}

function mostrar(id) {
    document.getElementById(id).style.display = "block";
}

/**************************************************************
 * CONFIRMAR PAGO — usa apiPutForm() (Cloudinary compatible)
 **************************************************************/
async function confirmarPedido(pedidoID) {
    const metodo = document.querySelector(".metodo-btn.active")?.dataset.metodo;
    const fileInput = document.getElementById("file-comprobante");
    const btn = document.getElementById("btn-confirmar-pago");

    if (!metodo)
        return mostrarNotificacion("Selecciona un método de pago.", "warning");

    if ((metodo === "yape" || metodo === "plin") && !fileInput.files.length)
        return mostrarNotificacion("Adjunta un comprobante.", "warning");

    const formData = new FormData();
    formData.append("metodo_pago", metodo);
    formData.append("notas", `Pago con ${metodo}`);

    if (fileInput.files[0])
        formData.append("comprobante", fileInput.files[0]);

    try {
        btn.disabled = true;
        btn.textContent = "Procesando…";

        const data = await apiPutForm(`/pedidos/${pedidoID}/cliente-confirmar`, formData);

        if (!data.success) throw new Error(data.message);

        mostrarNotificacion("Pago enviado correctamente.", "success");

        // ⚡ WhatsApp automático SOLO para efectivo (contra entrega) o recojo
        const total = document.getElementById("pago-total").textContent;

        if (metodo === "efectivo") {
            const msg = generarMensajeWhatsApp("entrega", total);
            enviarWhatsApp(msg);
        }

        if (metodo === "recojo") {
            const msg = generarMensajeWhatsApp("recojo", total);
            enviarWhatsApp(msg);
        }

        setTimeout(() => window.location.href = "pedidos.html", 2500);

    } catch (error) {
        console.error(error);
        mostrarNotificacion("No se pudo confirmar el pedido.", "error");

    } finally {
        btn.disabled = false;
        btn.textContent = "Confirmar Pedido";
    }
}

/**************************************************************
 * NOTIFICACIONES
 **************************************************************/
function mostrarNotificacion(msg, tipo = "info") {
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
