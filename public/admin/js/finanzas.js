// ==========================================================
//   FINANZAS.JS – VERSIÓN PROFESIONAL TECNO CUSEVI + PAGINACIÓN COMPLETA
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    if (!token) return (window.location.href = "../auth/login.html");

    // DOM
    const resumenEl = document.getElementById("resumen-general");
    const tablaMov = document.getElementById("tabla-movimientos");
    const paginacionEl = document.getElementById("paginacion-mov");

    const filtroPeriodo = document.getElementById("filtro-periodo");
    const fechaDesde = document.getElementById("fecha-desde");
    const fechaHasta = document.getElementById("fecha-hasta");

    const btnFiltrar = document.getElementById("btn-filtrar");
    const btnPdf = document.getElementById("btn-export-pdf");
    const btnExcel = document.getElementById("btn-export-excel");

    const modal = document.getElementById("modal-manual");
    const btnManual = document.getElementById("btn-manual");
    const closeManual = document.getElementById("close-manual");
    const formManual = document.getElementById("form-manual");

    let graficoPrincipal = null;
    let graficoBalance = null;

    // ===============================
    // API GET / POST
    // ===============================
    const apiGet = (url) => adminApiGet(`/finanzas/${url}`);
    const apiPost = (url, body) => adminApiPost(`/finanzas/${url}`, body);

    // ===============================
    // PAGINACIÓN
    // ===============================
    let movimientosData = [];
    let paginaActual = 1;
    const porPagina = 10;

    function renderPaginacion() {
        const total = movimientosData.length;
        const totalPaginas = Math.ceil(total / porPagina);

        if (totalPaginas <= 1) {
            paginacionEl.innerHTML = "";
            return;
        }

        let html = `<div class="pagination">`;

        html += `
            <button class="page-btn" ${paginaActual === 1 ? "disabled" : ""} data-page="${paginaActual - 1}">
                « Anterior
            </button>
        `;

        for (let i = 1; i <= totalPaginas; i++) {
            html += `
                <button class="page-btn ${i === paginaActual ? "page-active" : ""}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        html += `
            <button class="page-btn" ${paginaActual === totalPaginas ? "disabled" : ""} data-page="${paginaActual + 1}">
                Siguiente »
            </button>
        `;

        html += "</div>";

        paginacionEl.innerHTML = html;

        document.querySelectorAll(".page-btn").forEach(btn => {
            btn.onclick = () => {
                const p = Number(btn.dataset.page);
                paginaActual = p;
                renderTablaPaginada();
            };
        });
    }

    function renderTablaPaginada() {
        tablaMov.innerHTML = "";

        const inicio = (paginaActual - 1) * porPagina;
        const datos = movimientosData.slice(inicio, inicio + porPagina);

        datos.forEach(m => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${new Date(m.fecha_movimiento).toLocaleString("es-PE")}</td>
                <td>${m.tipo.toUpperCase()}</td>
                <td style="color:${m.tipo === "ingreso" ? "green" : "red"}">S/ ${Number(m.monto).toFixed(2)}</td>
                <td>${m.origen}</td>
                <td>${m.descripcion || "-"}</td>
            `;
            tablaMov.appendChild(tr);
        });

        renderPaginacion();
    }

    // ===============================
    // MODAL
    // ===============================
    btnManual.onclick = () => modal.style.display = "flex";
    closeManual.onclick = () => modal.style.display = "none";
    window.onclick = e => { if (e.target === modal) modal.style.display = "none"; };

    // ===============================
    // REGISTRAR MOVIMIENTO
    // ===============================
    formManual.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {
            tipo: document.getElementById("tipo").value,
            monto: document.getElementById("monto").value,
            descripcion: document.getElementById("descripcion").value
        };

        const res = await apiPost("manual", payload);

        if (!res.success) return alert("Error al guardar: " + res.message);

        alert("Movimiento registrado ✔");
        modal.style.display = "none";
        formManual.reset();
        aplicarFiltro();
    });

    // ===============================
    // RANGO DE FECHAS
    // ===============================
    function obtenerRango() {
        const hoy = new Date();
        let desde, hasta;

        switch (filtroPeriodo.value) {
            case "hoy": desde = hasta = hoy.toISOString().slice(0, 10); break;

            case "semana":
                let w = new Date(hoy);
                w.setDate(hoy.getDate() - 7);
                desde = w.toISOString().slice(0, 10);
                hasta = hoy.toISOString().slice(0, 10);
                break;

            case "mes":
                const y = hoy.getFullYear();
                const m = String(hoy.getMonth() + 1).padStart(2, "0");
                desde = `${y}-${m}-01`;
                hasta = `${y}-${m}-31`;
                break;

            case "anio":
                desde = `${hoy.getFullYear()}-01-01`;
                hasta = hoy.toISOString().slice(0, 10);
                break;

            case "rango":
                if (!fechaDesde.value || !fechaHasta.value) return null;
                desde = fechaDesde.value;
                hasta = fechaHasta.value;
        }

        return { desde, hasta };
    }

    // ===============================
    // RESUMEN GENERAL
    // ===============================
    async function cargarResumen(desde, hasta) {
        const j = await apiGet(`resumen?desde=${desde}&hasta=${hasta}`);

        if (!j.success) {
            resumenEl.innerHTML = "<p>Error al cargar resumen</p>";
            return;
        }

        const { ingresos, egresos, balance } = j.data;

        resumenEl.innerHTML = `
            <div class="fin-card">
                <h3>Ingresos</h3>
                <div class="value positive">S/ ${ingresos.toFixed(2)}</div>
            </div>
            <div class="fin-card">
                <h3>Egresos</h3>
                <div class="value negative">S/ ${egresos.toFixed(2)}</div>
            </div>
            <div class="fin-card">
                <h3>Balance</h3>
                <div class="value" style="color:${balance >= 0 ? "green" : "red"}">S/ ${balance.toFixed(2)}</div>
            </div>
        `;
    }

    // ===============================
    // CARGAR MOVIMIENTOS (PAGINADOS)
    // ===============================
    async function cargarMovimientos(desde, hasta) {
        const j = await apiGet(`movimientos?desde=${desde}&hasta=${hasta}`);

        if (!j.success || j.data.length === 0) {
            tablaMov.innerHTML = `<tr><td colspan="5" style="text-align:center;">Sin movimientos</td></tr>`;
            movimientosData = [];
            paginacionEl.innerHTML = "";
            return;
        }

        movimientosData = j.data;
        paginaActual = 1;

        renderTablaPaginada();
    }

    // ===============================
    // 📊 GRÁFICO PRINCIPAL (igual que tenías)
    // ===============================
    async function cargarGraficoPrincipal() {
        const j = await apiGet("grafico-mensual");
        if (!j.success) return;

        const ctx = document.getElementById("grafico-mensual").getContext("2d");
        if (graficoPrincipal) graficoPrincipal.destroy();

        graficoPrincipal = new Chart(ctx, {
            type: "bar",
            data: {
                labels: j.data.labels,
                datasets: [
                    { label: "Ingresos", data: j.data.ingresos, backgroundColor: "rgba(45,206,137,0.8)" },
                    { label: "Egresos", data: j.data.egresos, backgroundColor: "rgba(245,54,92,0.8)" }
                ]
            }
        });
    }

    // ===============================
    // 📊 GRÁFICO BALANCE
    // ===============================
    async function cargarGraficoBalance(desde, hasta) {
        const j = await apiGet(`resumen?desde=${desde}&hasta=${hasta}`);
        if (!j.success) return;

        const ctx = document.getElementById("grafico-anual").getContext("2d");
        if (graficoBalance) graficoBalance.destroy();

        graficoBalance = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["Ingresos", "Egresos"],
                datasets: [{
                    data: [j.data.ingresos, j.data.egresos],
                    backgroundColor: ["green", "red"]
                }]
            }
        });
    }
    // ===============================
    // PDF COMPLETO — EXACTO COMO TU VERSIÓN ORIGINAL
    // ===============================
    btnPdf.onclick = async () => {

        const rango = obtenerRango();
        if (!rango) return alert("Selecciona un rango válido.");

        const { desde, hasta } = rango;

        const mov = await apiGet(`movimientos?desde=${desde}&hasta=${hasta}`);
        const res = await apiGet(`resumen?desde=${desde}&hasta=${hasta}`);

        if (!mov.success || !res.success) return alert("Error al generar PDF");

        const resumen = res.data;
        const movimientos = mov.data;

        // --- TABLA HTML PDF ---
        let tablaHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
            <tr style="background:#f1f3f5; font-weight:bold;">
                <th style="padding:6px; border:1px solid #ccc;">Fecha</th>
                <th style="padding:6px; border:1px solid #ccc;">Tipo</th>
                <th style="padding:6px; border:1px solid #ccc;">Monto</th>
                <th style="padding:6px; border:1px solid #ccc;">Origen</th>
                <th style="padding:6px; border:1px solid #ccc;">Descripción</th>
            </tr>
        </thead>
        <tbody>
    `;

        movimientos.forEach(m => {
            tablaHTML += `
            <tr>
                <td style="padding:6px; border:1px solid #ccc;">${new Date(m.fecha_movimiento).toLocaleString("es-PE")}</td>
                <td style="padding:6px; border:1px solid #ccc;">${m.tipo.toUpperCase()}</td>
                <td style="padding:6px; border:1px solid #ccc;">S/ ${Number(m.monto).toFixed(2)}</td>
                <td style="padding:6px; border:1px solid #ccc;">${m.origen}</td>
                <td style="padding:6px; border:1px solid #ccc;">${m.descripcion || "-"}</td>
            </tr>
        `;
        });

        tablaHTML += "</tbody></table>";

        const contenido = `
    <div style="font-family: Arial; padding:0 35px 35px 35px;">

        <div style="text-align:center; margin-top:0;">
            <h1 style="margin:0; padding-top:0; font-size:30px; letter-spacing:1px;">TECNO CUSEVI</h1>
            <h2 style="margin:0; font-size:18px; color:#444;">REPORTE FINANCIERO OFICIAL</h2>
            <p style="margin:5px 0; font-size:12px; color:#777;">Generado automáticamente por el sistema</p>
            <hr style="border:0; border-top:2px solid #444; margin:10px 0;">
        </div>

        <div style="font-size:14px; margin-bottom:20px;">
            <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString("es-PE")}</p>
            <p><strong>Periodo:</strong> ${desde} → ${hasta}</p>
        </div>

        <h3 style="font-size:18px; margin:10px 0;">Resumen Financiero</h3>

        <table style="width:100%; font-size:14px; margin-bottom:20px;">
            <tr><td><strong>Ingresos:</strong></td><td style="color:#1a7f37; font-weight:bold;">S/ ${Number(resumen.ingresos).toFixed(2)}</td></tr>
            <tr><td><strong>Egresos:</strong></td><td style="color:#c92a2a; font-weight:bold;">S/ ${Number(resumen.egresos).toFixed(2)}</td></tr>
            <tr><td><strong>Balance:</strong></td><td style="color:${resumen.balance >= 0 ? '#1a7f37' : '#c92a2a'}; font-weight:bold;">S/ ${Number(resumen.balance).toFixed(2)}</td></tr>
        </table>

        <h3 style="font-size:18px;">Movimientos Registrados</h3>

        ${tablaHTML}

        <div style="margin-top:35px; text-align:center; font-size:12px; color:#777;">
            <hr style="border:0; border-top:1px solid #aaa;">
            <p>Tecno CuseVi – Sistema de Gestión Empresarial</p>
            <p>Documento generado automáticamente</p>
        </div>

    </div>
    `;

        const wrapper = document.createElement("div");
        wrapper.innerHTML = contenido;

        html2pdf()
            .from(wrapper)
            .set({
                margin: 0,
                filename: `Reporte_Finanzas_${desde}_${hasta}.pdf`,
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: "in", format: "a4", orientation: "portrait" }
            })
            .save();
    };

    // ===============================
    // EXCEL — sin cambios
    // ===============================
    btnExcel.onclick = () => {

      
        const tabla = document.querySelector("#tabla-movimientos");

      
        const wb = XLSX.utils.table_to_book(tabla, { sheet: "Movimientos" });

       
        XLSX.writeFile(
            wb,
            `Movimientos_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
    };


    // ===============================
    // APLICAR FILTRO GENERAL
    // ===============================
    async function aplicarFiltro() {
        const r = obtenerRango();
        if (!r) return;

        const { desde, hasta } = r;

        cargarResumen(desde, hasta);
        cargarMovimientos(desde, hasta);
        cargarGraficoPrincipal();
        cargarGraficoBalance(desde, hasta);
    }

    btnFiltrar.onclick = aplicarFiltro;

    filtroPeriodo.value = "mes";
    aplicarFiltro();

});
