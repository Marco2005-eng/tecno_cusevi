document.addEventListener("DOMContentLoaded", () => {

    const API_URL = "http://localhost:3000/api/alertas";
    const token = localStorage.getItem("token");

    if (!token) {
        return (window.location.href = "../auth/login.html");
    }

    const alertsList = document.getElementById("alerts-list");
    const filterSelect = document.getElementById("alert-filter");
    const markAllBtn = document.getElementById("mark-all-read-btn");
    const alertCounter = document.getElementById("alert-counter");
    const paginationControls = document.getElementById("pagination-controls");

    // Estado interno
    let alertas = [];
    let paginaActual = 1;
    const porPagina = 8;
    let filtroActivo = "all";

    // ============================
    // ICONO POR TIPO
    // ============================
    function getIcono(tipo) {
        switch (tipo) {
            case "stock": return { icon: "fa-box", color: "alert-warning" };
            case "pedido": return { icon: "fa-shopping-cart", color: "alert-info" };
            case "usuario": return { icon: "fa-user", color: "alert-success" };
            case "sistema": return { icon: "fa-cogs", color: "alert-error" };
            default: return { icon: "fa-info-circle", color: "alert-info" };
        }
    }

    // ============================
    // CARGAR ALERTAS DESDE API
    // ============================
    async function cargarAlertas() {
        try {
            const res = await fetch(API_URL, {
                headers: { Authorization: "Bearer " + token }
            });

            const data = await res.json();
            if (!data.success) {
                return alert("Error al cargar alertas");
            }

            alertas = data.data || [];
            actualizarContador();
            renderAlertas();

        } catch (error) {
            console.error("Error al cargar alertas:", error);
        }
    }

    // ============================
    // CONTADOR DE NO LEÍDAS
    // ============================
    function actualizarContador() {
        const noLeidas = alertas.filter(a => !a.leida).length;

        if (noLeidas > 0) {
            alertCounter.style.display = "inline-block";
            alertCounter.textContent = noLeidas;
        } else {
            alertCounter.style.display = "none";
        }
    }

    // ============================
    // MARCAR UNA ALERTA COMO LEÍDA
    // ============================
    async function marcarLeida(id) {
        try {
            await fetch(`${API_URL}/${id}/leer`, {
                method: "PUT",
                headers: { Authorization: "Bearer " + token }
            });

            alertas = alertas.map(a =>
                a.id === id ? { ...a, leida: 1 } : a
            );

            actualizarContador();
            renderAlertas();

        } catch (error) {
            console.error("Error marcando alerta como leída:", error);
        }
    }

    // ============================
    // MARCAR TODAS COMO LEÍDAS
    // ============================
    async function marcarTodas() {
        try {
            await fetch(`${API_URL}/marcar-todas`, {
                method: "PUT",
                headers: { Authorization: "Bearer " + token }
            });

            alertas = alertas.map(a => ({ ...a, leida: 1 }));
            actualizarContador();
            renderAlertas();

        } catch (error) {
            console.error("Error marcando todas:", error);
        }
    }

    // ============================
    // FILTRAR ALERTAS
    // ============================
    function filtrarAlertas() {
        if (filtroActivo === "all") return alertas;
        return alertas.filter(a => a.tipo === filtroActivo);
    }

    // ============================
    // PAGINACIÓN
    // ============================
    function getAlertasPaginadas(lista) {
        const inicio = (paginaActual - 1) * porPagina;
        return lista.slice(inicio, inicio + porPagina);
    }

    function renderPaginacion(total) {
        paginationControls.innerHTML = "";

        const totalPaginas = Math.ceil(total / porPagina);
        if (totalPaginas <= 1) return;

        for (let i = 1; i <= totalPaginas; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = "page-btn " + (i === paginaActual ? "page-active" : "");

            btn.addEventListener("click", () => {
                paginaActual = i;
                renderAlertas();
            });

            paginationControls.appendChild(btn);
        }
    }

    // ============================
    // RENDERIZAR ALERTAS
    // ============================
    function renderAlertas() {
        alertsList.innerHTML = "";

        const filtradas = filtrarAlertas();
        const paginadas = getAlertasPaginadas(filtradas);

        if (paginadas.length === 0) {
            alertsList.innerHTML = `
                <div style="text-align:center; padding:20px; color:#777">
                    No hay alertas disponibles
                </div>`;
            return;
        }

        paginadas.forEach(a => {
            const icono = getIcono(a.tipo);

            const card = document.createElement("div");
            card.className = "alert-card " + (a.leida ? "" : "no-leida");

            card.innerHTML = `
                <div class="alert-icon-modern ${icono.color}">
                    <i class="fas ${icono.icon}"></i>
                </div>

                <div class="alert-content">
                    <div class="alert-title">${a.titulo}</div>
                    <div class="alert-message">${a.mensaje}</div>
                    <div class="alert-time">${new Date(a.fecha_creacion).toLocaleString()}</div>
                </div>

                <div class="alert-actions">
                    <button class="alert-action-btn btn-leer" data-id="${a.id}">
                        <i class="fas fa-check"></i>
                    </button>

                    ${a.id_referencia ?
                        `<a href="${resolverRuta(a)}" class="alert-action-btn">
                            <i class="fas fa-eye"></i>
                        </a>` : ""
                    }
                </div>
            `;

            alertsList.appendChild(card);
        });

        renderPaginacion(filtradas.length);
    }

    // ============================
    // Resolver ruta según tipo
    // ============================
    function resolverRuta(alerta) {
        switch (alerta.tipo) {
            case "stock": return "stock.html?id=" + alerta.id_referencia;
            case "pedido": return "pedidos.html?id=" + alerta.id_referencia;
            case "usuario": return "usuarios.html?id=" + alerta.id_referencia;
            case "sistema": return "configuracion.html";
            default: return "#";
        }
    }

    // ============================
    // EVENTOS
    // ============================
    alertsList.addEventListener("click", e => {
        const btn = e.target.closest(".btn-leer");
        if (!btn) return;

        marcarLeida(Number(btn.dataset.id));
    });

    filterSelect.addEventListener("change", e => {
        filtroActivo = e.target.value;
        paginaActual = 1;
        renderAlertas();
    });

    markAllBtn.addEventListener("click", marcarTodas);

    // ============================
    // CARGA INICIAL
    // ============================
    cargarAlertas();
});
