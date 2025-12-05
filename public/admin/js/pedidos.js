document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "../auth/login.html";

    const tableBody = document.querySelector("#orders-table tbody");
    const paginationContainer = document.getElementById("pagination");

    const searchInput = document.getElementById("search-input");
    const filterStart = document.getElementById("filter-start");
    const filterEnd = document.getElementById("filter-end");
    const filterBtn = document.getElementById("filter-btn");

    const modalDetalle = document.getElementById("detalle-modal");
    const detalleBody = document.getElementById("detalle-body");

    const modalVenta = document.getElementById("confirm-sale-modal");
    const formVenta = document.getElementById("confirm-sale-form");
    const modalPedidoId = document.getElementById("modal-pedido-id");

    /* NUEVOS MODALES */
    const modalSeguimiento = document.getElementById("seguimiento-modal");
    const segForm = document.getElementById("seguimiento-form");
    const segPedidoId = document.getElementById("seguimiento-pedido-id");
    const segEstado = document.getElementById("seguimiento-estado");
    const segMensaje = document.getElementById("seguimiento-mensaje");
    const segNota = document.getElementById("seguimiento-nota");

    const modalHistorial = document.getElementById("historial-modal");
    const historialBody = document.getElementById("historial-body");

    let pedidos = [];
    let pedidosFiltrados = [];
    let pedidoSeleccionado = null;

    let currentPage = 1;
    const rowsPerPage = 8;

    // =====================================
    // CARGAR PEDIDOS
    // =====================================
    async function cargarPedidos() {
        const data = await adminApiGet("/pedidos");

        if (!data.success) {
            alert("Error obteniendo los pedidos.");
            return;
        }

        pedidos = data.data || [];
        pedidosFiltrados = [...pedidos];

        aplicarFiltros();
    }

    // =====================================
    // FILTROS
    // =====================================
    function aplicarFiltros() {
        const texto = searchInput.value.toLowerCase();
        const inicio = filterStart.value ? new Date(filterStart.value) : null;
        const fin = filterEnd.value ? new Date(filterEnd.value + "T23:59:59") : null;

        pedidosFiltrados = pedidos.filter(p => {
            const coincideTexto =
                (p.cliente_nombre && p.cliente_nombre.toLowerCase().includes(texto)) ||
                (p.metodo_pago && p.metodo_pago.toLowerCase().includes(texto)) ||
                (p.estado && p.estado.toLowerCase().includes(texto));

            const fechaPedido = new Date(p.fecha_pedido);

            const coincideFecha =
                (!inicio || fechaPedido >= inicio) &&
                (!fin || fechaPedido <= fin);

            return coincideTexto && coincideFecha;
        });

        currentPage = 1;
        renderPedidos();
        renderPaginacion();
    }

    searchInput.addEventListener("input", aplicarFiltros);
    filterBtn.addEventListener("click", aplicarFiltros);

    // =====================================
    // RENDER TABLA
    // =====================================
    function renderPedidos() {
        tableBody.innerHTML = "";

        if (pedidosFiltrados.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:2rem;">
                        No hay pedidos que coincidan con los filtros.
                    </td>
                </tr>`;
            return;
        }

        const inicio = (currentPage - 1) * rowsPerPage;
        const fin = inicio + rowsPerPage;
        const pagina = pedidosFiltrados.slice(inicio, fin);

        pagina.forEach(p => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${p.id}</td>
                <td>${p.cliente_nombre || 'N/A'}</td>
                <td>S/ ${Number(p.total).toFixed(2)}</td>
                <td>${p.metodo_pago ?? "–"}</td>
                <td>${estadoBadge(p.estado)}</td>
                <td>${new Date(p.fecha_pedido).toLocaleString("es-PE")}</td>
                <td>${accionesPedido(p)}</td>
            `;

            tableBody.appendChild(tr);
        });
    }

    // =====================================
    // RENDER PAGINACIÓN
    // =====================================
    function renderPaginacion() {
        paginationContainer.innerHTML = "";

        const totalPages = Math.ceil(pedidosFiltrados.length / rowsPerPage);
        if (totalPages <= 1) return;

        const prev = document.createElement("button");
        prev.textContent = "« Anterior";
        prev.disabled = currentPage === 1;
        prev.onclick = () => {
            currentPage--;
            renderPedidos();
            renderPaginacion();
        };
        paginationContainer.appendChild(prev);

        for (let i = 1; i <= totalPages; i++) {
            let mostrar = true;

            if (totalPages > 7) {
                if (i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
                    mostrar = false;
                }
            }

            if (mostrar) {
                const btn = document.createElement("button");
                btn.textContent = i;
                btn.classList.toggle("active", currentPage === i);
                btn.onclick = () => {
                    currentPage = i;
                    renderPedidos();
                    renderPaginacion();
                };
                paginationContainer.appendChild(btn);
            } else if (i === 3 || i === totalPages - 2) {
                const dots = document.createElement("span");
                dots.textContent = "...";
                dots.style.padding = "0 0.5rem";
                paginationContainer.appendChild(dots);
            }
        }

        const next = document.createElement("button");
        next.textContent = "Siguiente »";
        next.disabled = currentPage === totalPages;
        next.onclick = () => {
            currentPage++;
            renderPedidos();
            renderPaginacion();
        };
        paginationContainer.appendChild(next);
    }

    // =====================================
    // BADGES
    // =====================================
    function estadoBadge(estado) {
        const map = {
            pendiente: `<span class="badge badge-yellow">Pendiente</span>`,
            procesando: `<span class="badge badge-blue">Procesando</span>`,
            confirmado: `<span class="badge badge-green">Confirmado</span>`,
            cancelado: `<span class="badge badge-red">Cancelado</span>`
        };
        return map[estado] || estado;
    }

    // =====================================
    // ACCIONES
    // =====================================
    function accionesPedido(p) {
        let html = `
            <button class="admin-btn admin-btn-small admin-btn-info"
                onclick="verDetallePedido(${p.id})">
                <i class="fas fa-eye"></i>
            </button>

            <button class="admin-btn admin-btn-small admin-btn-warning"
                onclick="abrirSeguimiento(${p.id})">
                <i class="fas fa-location-dot"></i>
            </button>

            <button class="admin-btn admin-btn-small admin-btn-dark"
                onclick="abrirHistorial(${p.id})">
                <i class="fas fa-clock"></i>
            </button>
        `;

        if (p.estado === "procesando") {
            html += `
                <button class="admin-btn admin-btn-small admin-btn-success"
                    onclick="abrirConfirmarVenta(${p.id})">
                    <i class="fas fa-check"></i>
                </button>
            `;
        }

        if (p.estado !== "cancelado" && p.estado !== "confirmado") {
            html += `
                <button class="admin-btn admin-btn-small admin-btn-danger"
                    onclick="cancelarPedido(${p.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
        }

        return html;
    }

    // =====================================
    // DETALLE DEL PEDIDO (FUNCIONA BIEN)
    // =====================================
    window.verDetallePedido = async function (id) {
        const data = await adminApiGet(`/pedidos/${id}`);

        if (!data.success) return alert("Error al obtener el detalle.");

        const { pedido, detalles } = data;

        let html = `
            <h3>Información del Pedido</h3>
            <p><strong>ID:</strong> ${pedido.id}</p>
            <p><strong>Cliente:</strong> ${pedido.cliente_nombre}</p>
            <p><strong>Total:</strong> S/ ${pedido.total}</p>
            <p><strong>Estado:</strong> ${estadoBadge(pedido.estado)}</p>
            <hr>

            <h3>Productos</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
        `;

        detalles.forEach(d => {
            html += `
                <tr>
                    <td>${d.producto}</td>
                    <td>${d.cantidad}</td>
                    <td>S/ ${Number(d.precio_unitario).toFixed(2)}</td>
                    <td>S/ ${Number(d.subtotal).toFixed(2)}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <hr>

            <h3>Comprobante</h3>
        `;

        let url = pedido.comprobante_url;

        if (url && url !== "null" && url !== null) {
            const finalUrl = url.startsWith("http")
                ? url
                : `${window.location.origin}${url}`;

            html += `
                <a href="${finalUrl}" target="_blank">
                    <img src="${finalUrl}"
                        style="max-width:200px; border:1px solid #ddd; cursor:pointer;">
                </a>
            `;
        } else {
            html += `<p>No hay comprobante adjunto.</p>`;
        }

        detalleBody.innerHTML = html;
        modalDetalle.style.display = "flex";
    };

    window.cerrarDetalle = () => modalDetalle.style.display = "none";

    // =====================================
    // CONFIRMAR VENTA (FUNCIONA BIEN)
    // =====================================
    window.abrirConfirmarVenta = function (id) {
        pedidoSeleccionado = pedidos.find(p => p.id === id);
        modalPedidoId.textContent = `#${pedidoSeleccionado.id}`;
        modalVenta.style.display = "flex";
    };

    window.cancelarPedido = async function (id) {
        if (!confirm("¿Cancelar pedido?")) return;

        const data = await adminApiPut(`/pedidos/${id}/cancelar`);

        if (!data.success) return alert(data.message);

        alert("Pedido cancelado.");
        cargarPedidos();
    };

    formVenta.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {
            metodo_pago: document.getElementById("metodo-pago").value,
            notas: document.getElementById("notas-internas").value.trim()
        };

        const data = await adminApiPut(`/pedidos/${pedidoSeleccionado.id}/confirmar`, payload);

        if (!data.success) return alert(data.message);

        alert("Venta confirmada.");
        modalVenta.style.display = "none";
        formVenta.reset();
        cargarPedidos();
    });

    // =====================================
    // NUEVO: SEGUIMIENTO
    // =====================================
    window.abrirSeguimiento = function (id) {
        segPedidoId.textContent = id;
        segEstado.value = "preparando";
        segMensaje.value = "";
        segNota.value = "";
        modalSeguimiento.style.display = "flex";
    };

    segForm.addEventListener("submit", async e => {
        e.preventDefault();

        const id = segPedidoId.textContent;

        const payload = {
            estado: segEstado.value,
            mensaje: segMensaje.value.trim(),
            nota_admin: segNota.value.trim()
        };

        const data = await adminApiPost(`/pedidos/${id}/seguimiento`, payload);

        if (!data.success) return alert("Error guardando seguimiento");

        alert("Seguimiento guardado.");
        modalSeguimiento.style.display = "none";
        cargarPedidos();
    });

    // =====================================
    // NUEVO: HISTORIAL
    // =====================================
    window.abrirHistorial = async function (id) {
        modalHistorial.style.display = "flex";
        historialBody.innerHTML = "Cargando...";

        const data = await adminApiGet(`/pedidos/${id}/historial`);

        if (!data.success)
            return historialBody.innerHTML = "Error cargando historial";

        if (data.data.length === 0)
            return historialBody.innerHTML = "<p>No hay historial.</p>";

        historialBody.innerHTML = data.data.map(h => `
            <div class="historial-item">
                <p><strong>Estado:</strong> ${estadoBadge(h.estado)}</p>
                <p><strong>Mensaje:</strong> ${h.mensaje || "-"}</p>
                <p><strong>Nota admin:</strong> ${h.nota_admin || "-"}</p>
                <small>${new Date(h.fecha).toLocaleString("es-PE")}</small>
            </div>
            <hr>
        `).join("");
    };

    // =====================================
    // CIERRE DE MODALES (VERSIÓN QUE FUNCIONA)
    // =====================================
    document.querySelectorAll(".close-btn").forEach(btn => {
        btn.onclick = () => {
            modalDetalle.style.display = "none";
            modalVenta.style.display = "none";
            modalSeguimiento.style.display = "none";
            modalHistorial.style.display = "none";
        };
    });

    window.onclick = e => {
        if (e.target === modalDetalle) modalDetalle.style.display = "none";
        if (e.target === modalVenta) modalVenta.style.display = "none";
        if (e.target === modalSeguimiento) modalSeguimiento.style.display = "none";
        if (e.target === modalHistorial) modalHistorial.style.display = "none";
    };

    // =====================================
    // INICIO
    // =====================================
    cargarPedidos();
});
