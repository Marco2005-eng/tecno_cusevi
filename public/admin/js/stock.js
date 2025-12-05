document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");

    if (!token) {
        return (window.location.href = "../auth/login.html");
    }

    // ===========================
    // ELEMENTOS DEL DOM
    // ===========================
    const tbody = document.querySelector("#stock-table tbody");
    const searchInput = document.getElementById("search-input");

    const statTotalProducts = document.querySelector("#stat-total-products .stat-number");
    const statLowStock = document.querySelector("#stat-low-stock .stat-number");
    const statCommitted = document.querySelector("#stat-committed-stock .stat-number");

    let productos = [];

    // ===========================
    // CARGAR STOCK DESDE API
    // ===========================
    async function cargarStock() {
        try {
            const data = await adminApiGet("/stock");

            if (!data.success) {
                alert("No se pudo obtener el stock");
                return;
            }

            productos = data.data || [];
            actualizarStats();
            renderTabla();

        } catch (error) {
            console.error("Error cargando stock:", error);
            alert("Error al cargar stock");
        }
    }

    // ===========================
    // ESTADÍSTICAS
    // ===========================
    function actualizarStats() {
        const totalProductos = productos.length;
        const bajoStock = productos.filter(p => p.bajo_stock).length;

        const comprometidoTotal = productos.reduce((acc, p) => {
            const comprometido = Math.max(0, (Number(p.cantidad_comprada) - Number(p.cantidad_disponible)));
            return acc + comprometido;
        }, 0);

        statTotalProducts.textContent = totalProductos;
        statLowStock.textContent = bajoStock;
        statCommitted.textContent = comprometidoTotal;
    }

    // ===========================
    // RENDERIZAR TABLA
    // ===========================
    function renderTabla(filtro = "") {
        tbody.innerHTML = "";

        const filtroLower = filtro.toLowerCase();

        const lista = productos.filter(p =>
            p.nombre.toLowerCase().includes(filtroLower) ||
            p.marca.toLowerCase().includes(filtroLower)
        );

        if (lista.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center;">No hay productos que coincidan</td>
                </tr>
            `;
            return;
        }

        lista.forEach(p => {
            const tr = document.createElement("tr");

            const comprometido = Math.max(0, Number(p.cantidad_comprada) - Number(p.cantidad_disponible));
            const total = Number(p.cantidad_disponible) + comprometido;

            let estadoHtml = "";
            if (p.cantidad_disponible <= 0) {
                estadoHtml = `<span class="badge badge-red">Sin stock</span>`;
            } else if (p.bajo_stock) {
                estadoHtml = `<span class="badge badge-yellow">Bajo</span>`;
            } else {
                estadoHtml = `<span class="badge badge-green">OK</span>`;
            }

            tr.innerHTML = `
                <td>${p.id}</td>
                <td>${p.nombre}</td>
                <td>${p.marca}</td>
                <td>${p.cantidad_disponible}</td>
                <td>${comprometido}</td>
                <td>${total}</td>
                <td>${estadoHtml}</td>
                <td>
                    <button class="admin-btn admin-btn-small admin-btn-info btn-kardex"
                            data-id-producto="${p.id}">
                        <i class="fas fa-file-alt"></i> Kardex
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    // ===========================
    // BUSCADOR
    // ===========================
    searchInput.addEventListener("input", e => {
        renderTabla(e.target.value);
    });

    // ===========================
    // CLICK EN VER KARDEX
    // ===========================
    tbody.addEventListener("click", e => {
        const btn = e.target.closest(".btn-kardex");
        if (!btn) return;

        const idProducto = btn.dataset.idProducto;

        if (!idProducto) {
            alert("Error: Producto sin ID asociado.");
            return;
        }

        window.location.href = `cardex.html?id_producto=${idProducto}`;
    });

    // ===========================
    // INICIAR
    // ===========================
    cargarStock();
});
