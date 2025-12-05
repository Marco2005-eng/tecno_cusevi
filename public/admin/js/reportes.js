    document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    if (!token) return (window.location.href = "../auth/login.html");

    // --- Elementos del DOM existentes ---
    const periodSelect = document.getElementById("report-period");
    const startDate = document.getElementById("start-date");
    const endDate = document.getElementById("end-date");
    const customStart = document.getElementById("custom-date-start");
    const customEnd = document.getElementById("custom-date-end");
    const categorySelect = document.getElementById("report-category");
    const totalSalesEl = document.getElementById("stat-total-sales");
    const totalOrdersEl = document.getElementById("stat-total-orders");
    const avgOrderEl = document.getElementById("stat-average-order");
    const totalClientsEl = document.getElementById("stat-total-clients");
    const topProductsList = document.getElementById("top-products-list");
    const tableBody = document.querySelector("#sales-report-table tbody");
    let chartVentasTiempo = null;
    let chartCategorias = null;

    // --- Variables de paginación ---
    let allSalesData = [];
    let currentPage = 1;
    let itemsPerPage = 10;

    const paginationControls = document.getElementById('pagination-controls');
    const startItemSpan = document.getElementById('start-item');
    const endItemSpan = document.getElementById('end-item');
    const totalItemsSpan = document.getElementById('total-items');
    const itemsPerPageSelect = document.getElementById('items-per-page');


    /* ============================================================
       CARGAR CATEGORÍAS
    ============================================================ */
    async function cargarCategorias() {
        const data = await adminApiGet("/categorias");
        if (!data.success) return;

        data.data.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat.id}">${cat.nombre}</option>`;
        });
    }
    cargarCategorias();


    /* ============================================================
       MOSTRAR FECHAS PERSONALIZADAS
    ============================================================ */
    periodSelect.addEventListener("change", () => {
        const isCustom = periodSelect.value === "custom";
        customStart.style.display = isCustom ? "block" : "none";
        customEnd.style.display = isCustom ? "block" : "none";
    });


    /* ============================================================
       ITEMS POR PÁGINA
    ============================================================ */
    itemsPerPageSelect.addEventListener("change", () => {
        itemsPerPage = parseInt(itemsPerPageSelect.value);
        currentPage = 1;
        renderTabla();
        renderPaginationControls();
    });


    /* ============================================================
       GENERAR REPORTE PRINCIPAL
    ============================================================ */
    document.getElementById("report-filters-form").addEventListener("submit", async (e) => {
        e.preventDefault();

        let desde, hasta;

        if (periodSelect.value === "custom") {
            if (!startDate.value || !endDate.value)
                return alert("Selecciona un rango de fechas.");

            desde = startDate.value;
            hasta = endDate.value;

        } else {
            const dias = Number(periodSelect.value);
            const hoy = new Date();
            const inicio = new Date();
            inicio.setDate(hoy.getDate() - dias);

            desde = inicio.toISOString().split("T")[0];
            hasta = hoy.toISOString().split("T")[0];
        }

        const categoria = categorySelect.value;

        // ================== RESUMEN MÉTRICAS ==================
        const resumenData = await adminApiGet(
            `/reportes-analitica/metricas?start=${desde}&end=${hasta}&categoria=${categoria}`
        );
        renderMetrics(resumenData.data);

        // ================== VENTAS EN EL TIEMPO ==================
        const fechasData = await adminApiGet(
            `/reportes-analitica/ventas-tiempo?start=${desde}&end=${hasta}&categoria=${categoria}`
        );
        renderVentasTiempo(fechasData.data);

        // ================== TOP PRODUCTOS ==================
        const topData = await adminApiGet(
            `/reportes-analitica/top-productos?start=${desde}&end=${hasta}&categoria=${categoria}`
        );
        renderTopProductos(topData.data);

        // ================== VENTAS POR CATEGORÍA ==================
        const catData = await adminApiGet(
            `/reportes-analitica/ventas-categorias?start=${desde}&end=${hasta}`
        );
        renderCategoriasChart(catData.data);

        // ================== TABLA DETALLE (PAGINADA) ==================
        const detalleData = await adminApiGet(
            `/reportes-analitica/detalle?start=${desde}&end=${hasta}&categoria=${categoria}`
        );

        allSalesData = detalleData.data;
        currentPage = 1;

        renderTabla();
        renderPaginationControls();
    });


    /* ============================================================
       RENDER MÉTRICAS
    ============================================================ */
    function renderMetrics(m) {
        totalSalesEl.textContent = `S/ ${Number(m.totalVentas || 0).toFixed(2)}`;
        totalOrdersEl.textContent = m.totalPedidos || 0;
        avgOrderEl.textContent = `S/ ${Number(m.ticketPromedio || 0).toFixed(2)}`;
        totalClientsEl.textContent = m.clientesUnicos || 0;
    }


    /* ============================================================
       TABLA + PAGINACIÓN
    ============================================================ */
    function renderTabla() {
        tableBody.innerHTML = "";

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageData = allSalesData.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tableBody.innerHTML = `
                <tr><td colspan="5" style="text-align:center;">No hay datos para mostrar.</td></tr>
            `;
            return;
        }

        pageData.forEach(v => {
            tableBody.innerHTML += `
                <tr>
                    <td>${v.id_venta}</td>
                    <td>${new Date(v.fecha).toLocaleString("es-PE")}</td>
                    <td>${v.cliente}</td>
                    <td>S/ ${Number(v.total).toFixed(2)}</td>
                    <td>${v.estado}</td>
                </tr>
            `;
        });
    }


    function renderPaginationControls() {
        const totalPages = Math.ceil(allSalesData.length / itemsPerPage);
        paginationControls.innerHTML = "";

        // Prev
        const prev = document.createElement("button");
        prev.innerHTML = `<i class="fas fa-chevron-left"></i>`;
        prev.disabled = currentPage === 1;
        prev.onclick = () => {
            currentPage--;
            renderTabla();
            renderPaginationControls();
        };
        paginationControls.appendChild(prev);

        // Números
        const max = 5;
        let start = Math.max(1, currentPage - Math.floor(max / 2));
        let end = Math.min(totalPages, start + max - 1);

        for (let i = start; i <= end; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            if (i === currentPage) btn.classList.add("active");
            btn.onclick = () => {
                currentPage = i;
                renderTabla();
                renderPaginationControls();
            };
            paginationControls.appendChild(btn);
        }

        // Next
        const next = document.createElement("button");
        next.innerHTML = `<i class="fas fa-chevron-right"></i>`;
        next.disabled = currentPage === totalPages;
        next.onclick = () => {
            currentPage++;
            renderTabla();
            renderPaginationControls();
        };
        paginationControls.appendChild(next);

        startItemSpan.textContent =
            allSalesData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
        endItemSpan.textContent = Math.min(currentPage * itemsPerPage, allSalesData.length);
        totalItemsSpan.textContent = allSalesData.length;
    }


    /* ============================================================
       TOP PRODUCTOS
    ============================================================ */
    function renderTopProductos(lista) {
        topProductsList.innerHTML = "";
        lista.forEach(p => {
            topProductsList.innerHTML += `
                <li class="report-list-item">
                    <span>${p.producto}</span>
                    <strong>${p.cantidad} uds.</strong>
                </li>`;
        });
    }


    /* ============================================================
       GRAFICO VENTAS TIEMPO
    ============================================================ */
    function renderVentasTiempo(data) {
        const labels = data.map(d => d.fecha);
        const values = data.map(d => d.total);

        if (chartVentasTiempo) chartVentasTiempo.destroy();

        chartVentasTiempo = new Chart(
            document.getElementById("chart-ventas-tiempo"),
            {
                type: "line",
                data: {
                    labels,
                    datasets: [{
                        label: "Ventas (S/)",
                        data: values,
                        borderColor: "#2563eb",
                        fill: false,
                        tension: 0.3
                    }]
                }
            }
        );
    }


    /* ============================================================
       GRÁFICO CATEGORÍAS
    ============================================================ */
    function renderCategoriasChart(data) {
        if (chartCategorias) chartCategorias.destroy();

        chartCategorias = new Chart(
            document.getElementById("chart-categorias"),
            {
                type: "pie",
                data: {
                    labels: data.map(d => d.categoria),
                    datasets: [{
                        data: data.map(d => d.total),
                        backgroundColor: [
                            "#2563eb", "#dc2626", "#16a34a", "#eab308", "#9333ea"
                        ]
                    }]
                }
            }
        );
    }


    /* ============================================================
       EXPORTAR A EXCEL (NO CAMBIADO)
    ============================================================ */
    document.getElementById("btn-export-excel").addEventListener("click", () => {
        if (allSalesData.length === 0)
            return alert("No hay datos para exportar.");

        const ws_data = allSalesData.map(v => ({
            "ID Venta": v.id_venta,
            "Fecha": new Date(v.fecha).toLocaleString("es-PE"),
            "Cliente": v.cliente,
            "Total": Number(v.total).toFixed(2),
            "Estado": v.estado
        }));

        const ws = XLSX.utils.json_to_sheet(ws_data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");
        XLSX.writeFile(wb, "reporte_ventas.xlsx");
    });


    /* ============================================================
       EXPORTAR A PDF (NO CAMBIADO)
    ============================================================ */
    // ← Aquí tu código PDF permanece intacto
 /* ============================================================
       EXPORTAR A PDF (MEJORADO)
    ============================================================ */
    document.getElementById("btn-export-pdf").addEventListener("click", () => {
        if (allSalesData.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "pt", "a4"); // 'p' para portrait, 'pt' para puntos, 'a4' para tamaño

        // --- 1. OBTENER DATOS Y CONFIGURACIÓN INICIAL ---
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const margin = 40;
        let yPosition = margin; // Posición Y actual para escribir

        // Función para añadir una nueva página si es necesario
        const checkPageBreak = (requiredHeight) => {
            if (yPosition + requiredHeight > pageHeight - margin) {
                doc.addPage();
                yPosition = margin; // Resetear Y en la nueva página
            }
        };

        // --- 2. ENCABEZADO Y PIE DE PÁGINA (Se dibujará en cada página) ---
        const headerFooter = (data) => {
            // Encabezado
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("Tecno CuseVi - Reporte de Ventas", margin, 10);
            
            // Línea separadora
            doc.setLineWidth(0.5);
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, 15, pageWidth - margin, 15);

            // Pie de página
            const str = `Página ${data.pageNumber} de ${data.pageCount}`;
            doc.setFontSize(10);
            doc.text(str, pageWidth - margin - doc.getTextWidth(str), pageHeight - 10);
        };

        // --- 3. CONTENIDO DEL PDF ---

        // Título Principal
        doc.setFontSize(22);
        doc.setTextColor(33, 37, 41);
        doc.setFont(undefined, 'bold');
        doc.text("Reporte General de Ventas", margin, yPosition);
        yPosition += 20;

        // Información del Reporte (Filtros)
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100);
        const periodoTexto = periodSelect.options[periodSelect.selectedIndex].text;
        const categoriaTexto = categorySelect.options[categorySelect.selectedIndex].text;
        doc.text(`Período: ${periodoTexto}`, margin, yPosition);
        yPosition += 15;
        doc.text(`Categoría: ${categoriaTexto}`, margin, yPosition);
        yPosition += 20;
        
        // Línea separadora
        doc.setLineWidth(0.5);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;

        // Resumen de Métricas
        checkPageBreak(60); // Revisar si hay espacio para el resumen
        doc.setFontSize(14);
        doc.setTextColor(33, 37, 41);
        doc.setFont(undefined, 'bold');
        doc.text("Resumen del Período", margin, yPosition);
        yPosition += 20;

        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(50);
        
        const totalSalesText = totalSalesEl.textContent;
        const totalOrdersText = totalOrdersEl.textContent;
        const avgOrderText = avgOrderEl.textContent;
        const totalClientsText = totalClientsEl.textContent;

        doc.text(`Ventas Totales: ${totalSalesText}`, margin, yPosition);
        yPosition += 15;
        doc.text(`Número de Pedidos: ${totalOrdersText}`, margin, yPosition);
        yPosition += 15;
        doc.text(`Ticket Promedio: ${avgOrderText}`, margin, yPosition);
        yPosition += 15;
        doc.text(`Clientes Únicos: ${totalClientsText}`, margin, yPosition);
        yPosition += 25;

        // --- 4. TABLA DETALLADA ---
        checkPageBreak(20); // Revisar si hay espacio para el título de la tabla
        
        doc.setFontSize(14);
        doc.setTextColor(33, 37, 41);
        doc.setFont(undefined, 'bold');
        doc.text("Detalle de Ventas", margin, yPosition);
        yPosition += 20;

        const columns = [
            { header: 'ID Venta', dataKey: 'id_venta', width: 50 },
            { header: 'Fecha y Hora', dataKey: 'fecha', width: 80 },
            { header: 'Cliente', dataKey: 'cliente', width: 100 },
            { header: 'Total', dataKey: 'total', width: 60 },
            { header: 'Estado', dataKey: 'estado', width: 60 }
        ];

        const tableData = allSalesData.map(v => ({
            ...v,
            fecha: new Date(v.fecha).toLocaleString("es-PE", { 
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            }),
            total: `S/ ${Number(v.total).toFixed(2)}`
        }));

        // Opciones para la tabla
        const tableOptions = {
            columns: columns,
            body: tableData,
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 245, 250] },
            margin: { left: margin, right: margin },
            didDrawPage: headerFooter // Llama a la función de encabezado/pie en cada página
        };

        doc.autoTable(tableOptions);

     
        const fileName = `reporte_ventas_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    });

});
