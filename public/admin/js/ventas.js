document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "../auth/login.html";

    // YA NO SE USA localhost
    // const API_URL = "http://localhost:3000/api";

    // =========================
    // ELEMENTOS DOM
    // =========================
    const salesTableBody = document.querySelector("#sales-table tbody");
    const saleDetailBody = document.querySelector("#sale-detail-table tbody");
    const detalleInfo = document.getElementById("detalle-venta-info");

    const searchInput = document.getElementById("search-input");

    const fechaDesde = document.getElementById("fecha-desde");
    const fechaHasta = document.getElementById("fecha-hasta");
    const btnFiltrar = document.getElementById("btn-filtrar");

    const btnReporte = document.getElementById("btn-reporte");
    const btnExportPDF = document.getElementById("btn-export-pdf");
    const btnExportExcel = document.getElementById("btn-export-excel");

    // DATA
    let ventas = [];
    let ventasFiltradas = [];

    // PAGINACIÓN
    const rowsPerPage = 8;
    let currentPage = 1;


    /* ============================================================
       🔵 CARGAR CLIENTES
    ============================================================ */
    async function cargarClientes() {
        try {
            const data = await adminApiGet("/clientes");
            console.log("Clientes cargados:", data.data);
        } catch (error) {
            console.error("Error cargando clientes:", error);
        }
    }


    /* ============================================================
       🔵 CARGAR VENTAS
    ============================================================ */
    async function cargarVentas() {
        try {
            const data = await adminApiGet("/ventas");
            ventas = data.data || [];

            aplicarFiltroPorFechaHoy();

        } catch (error) {
            console.error("Error cargando ventas:", error);
        }
    }


    /* ============================================================
       🔵 FILTRO DEL DÍA ACTUAL
    ============================================================ */
    function aplicarFiltroPorFechaHoy() {
        const hoy = new Date().toISOString().split("T")[0];

        fechaDesde.value = hoy;
        fechaHasta.value = hoy;

        aplicarFiltros();
    }


    /* ============================================================
       🔵 FILTROS COMPLETOS
    ============================================================ */
    function aplicarFiltros() {
        const desde = fechaDesde.value ? new Date(fechaDesde.value) : null;
        const hasta = fechaHasta.value ? new Date(fechaHasta.value + "T23:59:59") : null;
        const texto = searchInput.value.toLowerCase();

        ventasFiltradas = ventas.filter(v => {
            const fechaVenta = new Date(v.fecha_venta);

            const fechaOK =
                (!desde || fechaVenta >= desde) &&
                (!hasta || fechaVenta <= hasta);

            const textoOK =
                v.cliente_nombre.toLowerCase().includes(texto) ||
                v.metodo_pago.toLowerCase().includes(texto) ||
                v.estado.toLowerCase().includes(texto);

            return fechaOK && textoOK;
        });

        currentPage = 1;
        renderVentas();
        renderPaginacion();
        actualizarStats();
    }


    /* ============================================================
       🔵 ESTADISTICAS
    ============================================================ */
    function actualizarStats() {
        const total = ventasFiltradas.length;
        const totalMonto = ventasFiltradas.reduce((s, v) => s + Number(v.total), 0).toFixed(2);

        document.getElementById("stat-total-ventas").textContent = total;
        document.getElementById("stat-monto-ventas").textContent = "S/ " + totalMonto;
    }


    /* ============================================================
       🔵 TABLA CON PAGINACIÓN
    ============================================================ */
    function renderVentas() {
        salesTableBody.innerHTML = "";

        if (ventasFiltradas.length === 0) {
            salesTableBody.innerHTML =
                `<tr><td colspan="7">No hay ventas registradas en este rango</td></tr>`;
            return;
        }

        const inicio = (currentPage - 1) * rowsPerPage;
        const fin = inicio + rowsPerPage;

        const pagina = ventasFiltradas.slice(inicio, fin);

        pagina.forEach(v => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${v.id}</td>
                <td>${v.cliente_nombre}</td>
                <td>S/ ${Number(v.total).toFixed(2)}</td>
                <td>${v.metodo_pago}</td>
                <td>${estadoBadge(v.estado)}</td>
                <td>${new Date(v.fecha_venta).toLocaleString("es-PE")}</td>
                <td>
                    <button class="admin-btn admin-btn-small admin-btn-info"
                        onclick="verDetalle(${v.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;

            salesTableBody.appendChild(tr);
        });
    }


    /* ============================================================
       🔵 PAGINACIÓN
    ============================================================ */
    function renderPaginacion() {
        const totalPages = Math.ceil(ventasFiltradas.length / rowsPerPage);
        const container = document.querySelector(".pagination");

        container.innerHTML = "";

        if (totalPages <= 1) return;

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.classList.add("page-btn");
            if (i === currentPage) btn.classList.add("active");

            btn.textContent = i;
            btn.onclick = () => {
                currentPage = i;
                renderVentas();
                renderPaginacion();
            };

            container.appendChild(btn);
        }
    }


    function estadoBadge(estado) {
        const badges = {
            Pagado: `<span class="badge badge-green">Pagado</span>`,
            Pendiente: `<span class="badge badge-yellow">Pendiente</span>`,
            Cancelado: `<span class="badge badge-red">Cancelado</span>`
        };
        return badges[estado] || estado;
    }


    /* ============================================================
       🔵 VER DETALLE — adminApiGet
    ============================================================ */
    window.verDetalle = async function (id) {
        try {
            const data = await adminApiGet(`/ventas-detalle/venta/${id}`);

            detalleInfo.textContent = `Mostrando productos de la venta #${id}`;
            saleDetailBody.innerHTML = "";

            if (data.data.length === 0) {
                saleDetailBody.innerHTML = `<tr><td colspan="4">No hay productos</td></tr>`;
                return;
            }

            data.data.forEach(d => {
                saleDetailBody.innerHTML += `
                    <tr>
                        <td>${d.nombre_producto}</td>
                        <td>${d.cantidad}</td>
                        <td>S/ ${Number(d.precio_unitario).toFixed(2)}</td>
                        <td>S/ ${Number(d.subtotal).toFixed(2)}</td>
                    </tr>`;
            });

        } catch (error) {
            console.error("Error detalle:", error);
        }
    };


    /* ============================================================
       🔵 EXPORTAR PDF
    ============================================================ */
    async function exportarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("portrait", "mm", "a4");

        const primary = "#2563eb";
        const textGray = "#555";
        const lightBlue = "#e8f0fe";

        doc.setFillColor(primary);
        doc.rect(0, 0, 210, 25, "F");

        doc.setTextColor("#ffffff");
        doc.setFontSize(18);
        doc.text("Reporte de Ventas", 14, 17);

        doc.setTextColor(textGray);
        doc.setFontSize(11);

        const totalVentas = ventasFiltradas.length;
        const totalMonto = ventasFiltradas.reduce((s, v) => s + Number(v.total), 0).toFixed(2);

        doc.text(`Desde: ${fechaDesde.value}`, 14, 35);
        doc.text(`Hasta: ${fechaHasta.value}`, 14, 41);

        doc.setFillColor(lightBlue);
        doc.rect(14, 50, 182, 18, "F");

        doc.setTextColor(primary);
        doc.setFontSize(12);
        doc.text(`Total de ventas: ${totalVentas}`, 20, 60);
        doc.text(`Monto total: S/ ${totalMonto}`, 120, 60);

        const tableData = ventasFiltradas.map(v => [
            v.id,
            v.cliente_nombre,
            "S/ " + Number(v.total).toFixed(2),
            v.metodo_pago,
            v.estado,
            new Date(v.fecha_venta).toLocaleString("es-PE")
        ]);

        doc.autoTable({
            startY: 75,
            head: [["ID", "Cliente", "Total", "Método", "Estado", "Fecha"]],
            body: tableData
        });

        doc.save(`Reporte_Ventas_${fechaDesde.value}_a_${fechaHasta.value}.pdf`);
    }


    function exportarExcel() {
        const data = ventasFiltradas.map(v => ({
            ID: v.id,
            Cliente: v.cliente_nombre,
            Total: Number(v.total),
            Metodo: v.metodo_pago,
            Estado: v.estado,
            Fecha: new Date(v.fecha_venta).toLocaleString("es-PE")
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, "Reporte");

        XLSX.writeFile(
            wb,
            `Reporte_Ventas_${fechaDesde.value}_a_${fechaHasta.value}.xlsx`
        );
    }


    searchInput.addEventListener("input", aplicarFiltros);
    btnFiltrar.addEventListener("click", aplicarFiltros);

    btnReporte.addEventListener("click", () => {
        aplicarFiltros();
        alert("Reporte generado con éxito 🎉");
    });

    btnExportPDF.addEventListener("click", exportarPDF);
    btnExportExcel.addEventListener("click", exportarExcel);


    cargarClientes();
    cargarVentas();

});
