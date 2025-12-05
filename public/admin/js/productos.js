document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "../auth/login.html";

    // BASE API (viene de admin/api.js)
    const API = window.adminApiBaseUrl;

    // ==========================================
    // ELEMENTOS HTML
    // ==========================================
    const productsTableBody = document.querySelector("#products-table tbody");
    const searchInput = document.getElementById("search-input");
    const addProductBtn = document.getElementById("add-product-btn");

    // Modal
    const productModal = document.getElementById("product-modal");
    const modalTitle = document.getElementById("product-modal-title");
    const closeModalBtns = document.querySelectorAll(".close-btn, .close-modal-btn");

    // Formulario
    const productForm = document.getElementById("product-form");
    const productIdField = document.getElementById("product-id");
    const productSKU = document.getElementById("product-sku");
    const productName = document.getElementById("product-name");
    const productSupplier = document.getElementById("product-supplier");
    const productBrand = document.getElementById("product-brand");
    const productQuantity = document.getElementById("product-quantity");
    const productPrice = document.getElementById("product-price");
    const productDate = document.getElementById("product-date");
    const productActive = document.getElementById("product-active");
    const productNotes = document.getElementById("product-notes");

    // Paginación
    const paginationControls = document.getElementById('pagination-controls');
    const startItemSpan = document.getElementById('start-item');
    const endItemSpan = document.getElementById('end-item');
    const totalItemsSpan = document.getElementById('total-items');
    const itemsPerPageSelect = document.getElementById('items-per-page');

    let allProducts = [];
    let filteredProducts = [];
    let currentPage = 1;
    let itemsPerPage = 10;

    // ==========================================
    // UTILIDADES DE FECHA
    // ==========================================
    function convertirAInputDateTime(fechaStr) {
        if (!fechaStr) return "";
        const fecha = new Date(fechaStr);
        fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
        return fecha.toISOString().slice(0, 16);
    }

    function formatoFechaTabla(f) {
        return f ? f.split("T")[0] : "";
    }

    // ==========================================
    // VALIDACIÓN
    // ==========================================
    function validarProducto(p) {
        if (!p.nombre.trim()) return "El nombre del producto es obligatorio.";
        if (!p.id_proveedor) return "Debes seleccionar un proveedor.";
        if (!p.id_marca) return "Debes seleccionar una marca.";

        if (isNaN(p.cantidad_comprada) || parseInt(p.cantidad_comprada) <= 0)
            return "La cantidad debe ser mayor a 0.";

        if (isNaN(p.precio_compra) || parseFloat(p.precio_compra) <= 0)
            return "El precio debe ser mayor a 0.";

        if (!p.fecha_compra) return "La fecha de compra es obligatoria.";

        return null;
    }

    // ==========================================
    // CARGAR PRODUCTOS DESDE API
    // ==========================================
    async function cargarProductos() {
        const data = await adminApiGet("/productos");
        if (!data.success) return alert("Error cargando productos.");

        allProducts = data.data;
        aplicarFiltrosYRenderizar();
    }

    // ==========================================
    // FILTROS + RENDER
    // ==========================================
    function aplicarFiltrosYRenderizar() {
        const filtro = searchInput.value.toLowerCase();

        filteredProducts = allProducts.filter(p =>
            p.nombre.toLowerCase().includes(filtro) ||
            (p.sku && p.sku.toLowerCase().includes(filtro)) ||
            p.proveedor_nombre.toLowerCase().includes(filtro) ||
            p.marca_nombre.toLowerCase().includes(filtro)
        );

        currentPage = 1;
        renderTabla();
        renderPaginationControls();
    }

    function renderTabla() {
        productsTableBody.innerHTML = "";

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const lista = filteredProducts.slice(startIndex, endIndex);

        if (lista.length === 0) {
            productsTableBody.innerHTML = `
                <tr><td colspan="11" style="text-align:center;">No se encontraron productos.</td></tr>
            `;
            return;
        }

        lista.forEach(p => {
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${p.id}</td>
                <td>${p.sku || ""}</td>
                <td>${p.nombre}</td>
                <td>${p.proveedor_nombre}</td>
                <td>${p.marca_nombre}</td>
                <td>${p.cantidad_comprada}</td>
                <td>${p.cantidad_disponible}</td>
                <td>S/ ${Number(p.precio_compra).toFixed(2)}</td>
                <td>${formatoFechaTabla(p.fecha_compra)}</td>
                <td>${p.activo ? "Activo" : "Inactivo"}</td>
                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary"
                        onclick="editarProducto(${p.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-btn admin-btn-small admin-btn-danger"
                        onclick="eliminarProducto(${p.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            productsTableBody.appendChild(row);
        });
    }

    function renderPaginationControls() {
        const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
        paginationControls.innerHTML = "";

        // Prev
        const prev = document.createElement("button");
        prev.innerHTML = "<i class='fas fa-chevron-left'></i>";
        prev.disabled = currentPage === 1;
        prev.onclick = () => {
            currentPage--;
            renderTabla();
            renderPaginationControls();
        };
        paginationControls.appendChild(prev);

        // Números
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.classList.toggle("active", i === currentPage);
            btn.onclick = () => {
                currentPage = i;
                renderTabla();
                renderPaginationControls();
            };
            paginationControls.appendChild(btn);
        }

        // Next
        const next = document.createElement("button");
        next.innerHTML = "<i class='fas fa-chevron-right'></i>";
        next.disabled = currentPage === totalPages;
        next.onclick = () => {
            currentPage++;
            renderTabla();
            renderPaginationControls();
        };
        paginationControls.appendChild(next);

        // Información
        const startItem = filteredProducts.length ? (currentPage - 1) * itemsPerPage + 1 : 0;
        const endItem = Math.min(currentPage * itemsPerPage, filteredProducts.length);

        startItemSpan.textContent = startItem;
        endItemSpan.textContent = endItem;
        totalItemsSpan.textContent = filteredProducts.length;
    }

    // ==========================================
    // MODAL
    // ==========================================
    addProductBtn.onclick = () => abrirModal("Nuevo Producto");
    closeModalBtns.forEach(btn => btn.onclick = cerrarModal);

    function abrirModal(titulo) {
        modalTitle.innerHTML = `<i class="fas fa-box"></i> ${titulo}`;
        productForm.reset();
        productIdField.value = "";
        productModal.style.display = "flex";
    }

    function cerrarModal() {
        productModal.style.display = "none";
    }

    // ==========================================
    // CARGAR PROVEEDORES Y MARCAS
    // ==========================================
    async function cargarProveedores() {
        const data = await adminApiGet("/proveedores");
        productSupplier.innerHTML = `<option value="">Seleccionar…</option>`;
        data.data.forEach(s => {
            productSupplier.innerHTML += `<option value="${s.id}">${s.nombre_empresa}</option>`;
        });
    }

    async function cargarMarcas() {
        const data = await adminApiGet("/marcas");
        productBrand.innerHTML = `<option value="">Seleccionar…</option>`;
        data.data.forEach(m => {
            productBrand.innerHTML += `<option value="${m.id}">${m.nombre}</option>`;
        });
    }

    // ==========================================
    // GUARDAR PRODUCTO
    // ==========================================
    productForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            id_compra: 1,
            id_proveedor: productSupplier.value,
            id_marca: productBrand.value,
            nombre: productName.value.trim(),
            sku: productSKU.value.trim(),
            cantidad_comprada: productQuantity.value.trim(),
            cantidad_disponible: productQuantity.value.trim(),
            precio_compra: productPrice.value,
            fecha_compra: productDate.value,
            notas: productNotes.value,
            activo: productActive.value
        };

        const error = validarProducto(payload);
        if (error) return alert(error);

        const id = productIdField.value;

        const data = id
            ? await adminApiPut(`/productos/${id}`, payload)
            : await adminApiPost(`/productos`, payload);

        if (!data.success) return alert(data.message || "Error al guardar.");

        alert("Producto guardado con éxito.");
        cerrarModal();
        cargarProductos();
    });

    // ==========================================
    // EDITAR PRODUCTO
    // ==========================================
    window.editarProducto = async function (id) {
        abrirModal("Editar Producto");

        const data = await adminApiGet(`/productos/${id}`);
        if (!data.success) return alert("Producto no encontrado.");

        const p = data.data;

        productIdField.value = p.id;
        productSKU.value = p.sku || "";
        productName.value = p.nombre;
        productSupplier.value = p.id_proveedor;
        productBrand.value = p.id_marca;
        productQuantity.value = p.cantidad_comprada;
        productPrice.value = p.precio_compra;
        productDate.value = convertirAInputDateTime(p.fecha_compra);
        productActive.value = p.activo;
        productNotes.value = p.notas || "";
    };

    // ==========================================
    // ELIMINAR PRODUCTO
    // ==========================================
    window.eliminarProducto = async function (id) {
        if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

        const data = await adminApiDelete(`/productos/${id}`);
        if (!data.success) return alert(data.message);

        alert("Producto eliminado.");
        cargarProductos();
    };

    // Inicializar
    cargarProveedores();
    cargarMarcas();
    cargarProductos();
});
