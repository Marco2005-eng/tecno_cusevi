document.addEventListener("DOMContentLoaded", () => {

    // ============================================
    // 🔥 API BASE — FUNCIONA EN LOCAL, RENDER, NGROK
    // ============================================
    const API_URL = window.location.origin + "/api/alertas";
    const token = localStorage.getItem("token");

    if (!token) {
        return (window.location.href = "../auth/login.html");
    }

    const alertsList = document.getElementById("alerts-list");
    const filterSelect = document.getElementById("alert-filter");
    const markAllBtn = document.getElementById("mark-all-read-btn");
    const alertCounter = document.getElementById("alert-counter");
    const paginationControls = document.getElementById("pagination-controls");

    let alertas = [];
    let paginaActual = 1;
    const porPagina = 8;
    let filtroActivo = "all";

    function getIcono(tipo) {
        switch (tipo) {
            case "stock": return { icon: "fa-box", color: "alert-warning" };
            case "pedido": return { icon: "fa-shopping-cart", color: "alert-info" };
            case "usuario": return { icon: "fa-user", color: "alert-success" };
            case "sistema": return { icon: "fa-cogs", color: "alert-error" };
            default: return { icon: "fa-info-circle", color: "alert-info" };
        }
    }

    async function cargarAlertas() {
        try {
            const res = await fetch(API_URL, {
                headers: { Authorization: "Bearer " + token }
            });

            const data = await res.json();
            if (!data.success) return;

            alertas = data.data || [];
            actualizarContador();
            renderAlertas();

        } catch (error) {
            console.error("Error al cargar alertas:", error);
        }
    }

    function actualizarContador() {
        const noLeidas = alertas.filter(a => !a.leida).length;
        if (noLeidas > 0) {
            alertCounter.style.display = "inline-block";
            alertCounter.textContent = noLeidas;
        } else {
            alertCounter.style.display = "none";
        }
    }

    async function marcarLeida(id) {
        try {
            await fetch(`${API_URL}/${id}/leida`, {
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

    async function marcarTodas() {
        try {
            await fetch(`${API_URL}/leida/todas`, {
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

    function filtrarAlertas() {
        if (filtroActivo === "all") return alertas;
        return alertas.filter(a => a.tipo === filtroActivo);
    }

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
                </div>
            `;

            alertsList.appendChild(card);
        });

        renderPaginacion(filtradas.length);
    }

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

    cargarAlertas();
});
