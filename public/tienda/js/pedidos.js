/**************************************************************
 * PEDIDOS.JS — NGROK READY + SEGUIMIENTO + COMPROBANTE
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {
    inicializarTema();
    actualizarCarritoHeader();

    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!user || !user.id_cliente) {
        mostrarNotificacion("Debes iniciar sesión para ver tus pedidos.", "warning");
        setTimeout(() => (window.location.href = "perfil.html"), 2000);
        return;
    }

    cargarPedidos(user.id_cliente);
    configurarModal();
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
 * CARRITO (header)
 **************************************************************/
function actualizarCarritoHeader() {
    const carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
    const count = carrito.reduce((sum, p) => sum + p.cantidad, 0);
    const cartEl = document.getElementById("cart-count");

    if (cartEl) cartEl.textContent = count > 0 ? count : "";
}

/**************************************************************
 * UTILIDADES
 **************************************************************/
function showLoading(el) {
    el.innerHTML = `<p style="text-align:center;color:var(--text-muted);">
        Cargando tus pedidos...
    </p>`;
}

function showError(el, msg = "No se pudieron cargar tus pedidos.") {
    el.innerHTML = `<p style="text-align:center;color:var(--accent);">${msg}</p>`;
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
 * NORMALIZAR URL (para NGROK)
 **************************************************************/
function fixURL(url) {
    if (!url) return "assets/no-image.png";

    url = url.trim();

    // 1. Si ya es URL absoluta (internet)
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url.replace("http://", "https://");
    }

    // 2. Si viene mal escrita (caso: "https//image...")
    if (url.startsWith("https//") || url.startsWith("http//")) {
        return "https://" + url.replace("https//", "").replace("http//", "");
    }

    // 3. Si contiene parámetros (imágenes externas)
    if (url.includes("?") && url.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
        return "https://" + url;
    }

    // 4. Si parece nombre de archivo PERO NO existe en tu servidor (externo)
    if (!url.includes("/") && url.match(/\.(jpg|jpeg|png|webp|gif)/i)) {

        // Detectar si es nombre típico de imagen externa
        if (/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp|gif)$/i.test(url)) {
            return "https://encrypted-tbn0.gstatic.com/images?q=tbn:" + url;
        }

        // O cualquier otro caso similar
        return "https://" + url;
    }

    // 5. Si es ruta interna (BD guarda /uploads/...)
    if (url.startsWith("/uploads/")) {
        return `${window.location.origin}${url}`;
    }

    // 6. Última opción (fallback)
    return "assets/no-image.png";
}


/**************************************************************
 * CARGAR PEDIDOS — usa apiGet()
 **************************************************************/
async function cargarPedidos(id_cliente) {
    const contenedor = document.getElementById("lista-pedidos");
    const vacio = document.getElementById("pedidos-vacio");

    showLoading(contenedor);

    try {
        const data = await apiGet(`/pedidos/cliente/${id_cliente}`);

        if (!data.success || !data.data.length) {
            contenedor.style.display = "none";
            vacio.style.display = "flex";
            return;
        }

        contenedor.style.display = "flex";
        vacio.style.display = "none";

        contenedor.innerHTML = data.data
            .map(p => generarTarjetaPedidoHTML(p))
            .join("");

        asignarEventosBotones();

    } catch (err) {
        console.error(err);
        showError(contenedor, "Error al conectar con el servidor.");
    }
}

/**************************************************************
 * TARJETA DE PEDIDO
 **************************************************************/
function generarTarjetaPedidoHTML(p) {
    const fecha = new Date(p.fecha_pedido).toLocaleString("es-PE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    const pendiente = p.estado.toLowerCase() === "pendiente";

    return `
        <div class="pedido-card">
            <div class="pedido-card__info">
                <h3>Pedido #${p.id}</h3>
                <p>Realizado el ${fecha}</p>
                <p>Método de pago: ${p.metodo_pago || "No especificado"}</p>
            </div>

            <div class="pedido-card__resumen">
                <p class="pedido-card__total">S/ ${Number(p.total).toFixed(2)}</p>
                <span class="pedido-card__estado ${p.estado}">${p.estado}</span>

                <div class="pedido-card__acciones">
                    <button class="btn btn--small btn--secondary btn-ver-detalle"
                        data-id="${p.id}">
                        Ver Detalle
                    </button>

                    ${pendiente ? `
                        <a href="pago.html?pedido=${p.id}"
                           class="btn btn--small btn--primary">
                           Pagar
                        </a>` : ""}
                </div>
            </div>
        </div>
    `;
}

/**************************************************************
 * EVENTOS — Ver detalle
 **************************************************************/
function asignarEventosBotones() {
    document.querySelectorAll(".btn-ver-detalle").forEach(btn => {
        btn.onclick = () => abrirModalDetalle(btn.dataset.id);
    });
}

/**************************************************************
 * MODAL
 **************************************************************/
function configurarModal() {
    const modal = document.getElementById("pedido-modal");
    const close = document.getElementById("pedido-modal-close");

    close.onclick = cerrarModalDetalle;

    modal.onclick = e => {
        if (e.target === modal) cerrarModalDetalle();
    };
}

function cerrarModalDetalle() {
    document.getElementById("pedido-modal").classList.remove("show");
}

/**************************************************************
 * ABRIR MODAL (detalle + historial)
 **************************************************************/
async function abrirModalDetalle(id) {
    const modal = document.getElementById("pedido-modal");
    const body = document.getElementById("pedido-detalle-body");

    body.innerHTML = "<p style='text-align:center;'>Cargando detalles...</p>";
    modal.classList.add("show");

    try {
        const detalle = await apiGet(`/pedidos/${id}`);
        const historial = await apiGet(`/pedidos/${id}/historial`);

        if (!detalle.success) throw new Error(detalle.message);

        renderizarModalDetalle(detalle.pedido, detalle.detalles, historial.data || []);

    } catch (err) {
        console.error(err);
        mostrarNotificacion("Error al cargar el detalle del pedido.", "error");
        cerrarModalDetalle();
    }
}

/**************************************************************
 * RENDER DETALLE + TIMELINE + COMPROBANTE
 **************************************************************/
function renderizarModalDetalle(p, detalles, historial) {
    const body = document.getElementById("pedido-detalle-body");
    const fecha = new Date(p.fecha_pedido).toLocaleString("es-PE");
    const pendiente = p.estado.toLowerCase() === "pendiente";

    body.innerHTML = `
        <div class="pedido-detalle-header">
            <div>
                <h3>Pedido #${p.id}</h3>
                <p>Realizado el ${fecha}</p>
            </div>
            <div>
                <p><strong>Estado:</strong>
                    <span class="pedido-card__estado ${p.estado}">
                        ${p.estado}
                    </span>
                </p>
                <p><strong>Método de pago:</strong> ${p.metodo_pago || "No especificado"}</p>
            </div>
        </div>

        <h4>Productos del Pedido</h4>

        <div class="pedido-detalle-items">
            ${detalles.map(d => `
                <div class="pedido-detalle-item">
                    <img src="${fixURL(d.imagen_url)}">
                    <div class="pedido-detalle-item-info">
                        <h4>${d.producto}</h4>
                        <p>Cantidad: ${d.cantidad}</p>
                    </div>
                    <div class="pedido-detalle-item-precio">
                        S/ ${Number(d.subtotal).toFixed(2)}
                    </div>
                </div>
            `).join("")}
        </div>

        <h4>Comprobante de Pago</h4>
        ${p.comprobante_url 
            ? `<img src="${fixURL(p.comprobante_url)}" class="comprobante-img">`
            : `<p>No se ha subido comprobante aún.</p>`
        }

        <h4>Seguimiento del Pedido</h4>
        <div class="pedido-timeline">
            ${
                historial.length === 0
                ? `<p>Aún no hay seguimiento registrado.</p>`
                : historial.map(h => `
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div class="timeline-content">
                            <h4>${formatearEstado(h.estado)}</h4>
                            ${h.mensaje ? `<p>${h.mensaje}</p>` : ""}
                            <span class="timeline-date">
                                ${new Date(h.fecha).toLocaleString("es-PE")}
                            </span>
                        </div>
                    </div>
                `).join("")
            }
        </div>

        <div class="pedido-detalle-resumen">
            <div class="pedido-detalle-resumen-item">
                <span>Subtotal:</span>
                <span>S/ ${Number(p.total).toFixed(2)}</span>
            </div>
            <div class="pedido-detalle-resumen-item">
                <span>Envío:</span><span>S/ 0.00</span>
            </div>
            <div class="pedido-detalle-resumen-total">
                <span>Total:</span>
                <span>S/ ${Number(p.total).toFixed(2)}</span>
            </div>
        </div>

        ${pendiente ? `
        <div class="pedido-detalle-acciones">
            <a href="pago.html?pedido=${p.id}" class="btn btn--primary">
                Subir Comprobante de Pago
            </a>
        </div>
        ` : ""}
    `;
}

/**************************************************************
 * FORMATEAR ESTADO PARA MOSTRAR BONITO
 **************************************************************/
function formatearEstado(estado) {
    const map = {
        pendiente: "Pedido recibido",
        procesando: "Procesando pago",
        confirmado: "Pago aprobado",
        preparando: "Preparando pedido",
        en_camino: "En camino",
        entregado: "Entregado",
        cancelado: "Cancelado"
    };
    return map[estado] || estado;
}
