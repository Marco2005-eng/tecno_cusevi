/**************************************************************
 * CATALOGO.JS — Admin Panel (NGROK READY + adminApi.js)
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    /**************************************************************
     * ⛔ VALIDAR SESIÓN ADMIN
     **************************************************************/
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");

    if (!token || user?.rol !== "admin") {
        alert("Acceso no autorizado");
        return (window.location.href = "../auth/login.html");
    }

    /**************************************************************
     * ELEMENTOS DEL DOM
     **************************************************************/
    const tableBody = document.querySelector("#catalog-table tbody");
    const searchInput = document.getElementById("search-input");
    const addBtn = document.getElementById("add-catalog-item-btn");

    const modal = document.getElementById("catalog-modal");
    const modalTitle = document.getElementById("catalog-modal-title");
    const closeBtns = document.querySelectorAll(".close-btn, .close-modal-btn");

    const form = document.getElementById("catalog-form");

    const catalogId = document.getElementById("catalog-id");
    const purchaseSelect = document.getElementById("catalog-purchase-id");
    const salesName = document.getElementById("catalog-sales-name");
    const stockDisplay = document.getElementById("catalog-stock-display");
    const categorySelect = document.getElementById("catalog-category");
    const salesPrice = document.getElementById("catalog-sales-price");
    const imageUrl = document.getElementById("catalog-image-url");
    const descriptionField = document.getElementById("catalog-sales-description");

    const featuredCheckbox = document.querySelector("#catalog-featured");
    const activeCheckbox = document.querySelector("#catalog-active");

    const previewBox = document.getElementById("image-preview");


    /**************************************************************
     * VISTA PREVIA DE IMAGEN
     **************************************************************/
    function actualizarVistaPrevia(url) {
        if (!url.trim()) {
            previewBox.innerHTML = `<span>Sin vista previa</span>`;
            return;
        }

        const img = new Image();
        img.src = url;

        img.onload = () => {
            previewBox.innerHTML = "";
            previewBox.appendChild(img);
        };

        img.onerror = () => {
            previewBox.innerHTML = `<span>URL inválida o no accesible</span>`;
        };
    }

    imageUrl.addEventListener("input", () =>
        actualizarVistaPrevia(imageUrl.value)
    );


    /**************************************************************
     * CARGAR CATÁLOGO — adminApiGet()
     **************************************************************/
    async function cargarCatalogo() {
        const data = await adminApiGet("/catalogo");

        if (!data.success) {
            console.error("❌ Error cargando catálogo");
            return;
        }

        renderTabla(data.data);
    }

    function renderTabla(items) {
        tableBody.innerHTML = "";

        items.forEach(item => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${item.id}</td>
                <td>${item.nombre_venta}</td>
                <td>${item.nombre_producto || "-"}</td>
                <td>${item.nombre_categoria || "-"}</td>

                <td>
                    ${
                        item.precio_oferta
                            ? `<span class='old-price'>S/ ${item.precio_venta}</span>
                               <span class='offer-price'>S/ ${item.precio_oferta}</span>`
                            : `S/ ${item.precio_venta}`
                    }
                </td>

                <td>${item.stock_real}</td>

                <td>${item.destacado ? "Sí" : "No"}</td>
                <td>${item.activo ? "Activo" : "Inactivo"}</td>

                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary"
                        onclick="editarCatalogo(${item.id})">
                        <i class="fas fa-edit"></i>
                    </button>

                    <button class="admin-btn admin-btn-small admin-btn-danger"
                        onclick="eliminarCatalogo(${item.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });
    }


    /**************************************************************
     * BUSCADOR
     **************************************************************/
    searchInput.addEventListener("input", () => {
        const txt = searchInput.value.toLowerCase();
        const rows = tableBody.querySelectorAll("tr");

        rows.forEach(r => {
            r.style.display = r.textContent.toLowerCase().includes(txt) ? "" : "none";
        });
    });


    /**************************************************************
     * MODAL — ABRIR / CERRAR
     **************************************************************/
    addBtn.onclick = () => abrirModal("Añadir Producto al Catálogo");

    closeBtns.forEach(btn => (btn.onclick = cerrarModal));

    function abrirModal(titulo) {
        modalTitle.innerHTML = `<i class="fas fa-store"></i> ${titulo}`;
        form.reset();
        catalogId.value = "";
        previewBox.innerHTML = `<span>Sin vista previa</span>`;
        modal.style.display = "flex";

        cargarProductosBase();
        cargarCategorias();

        featuredCheckbox.checked = false;
        activeCheckbox.checked = true;
    }

    function cerrarModal() {
        modal.style.display = "none";
    }

    window.onclick = e => {
        if (e.target === modal) cerrarModal();
    };


    /**************************************************************
     * CARGAR PRODUCTOS BASE
     **************************************************************/
    async function cargarProductosBase() {
        const data = await adminApiGet("/catalogo/for-form");

        purchaseSelect.innerHTML =
            `<option value="" disabled selected>Selecciona un producto...</option>`;

        if (data.success) {
            data.data.forEach(p => {
                purchaseSelect.innerHTML += `
                <option value="${p.id}"
                    data-stock="${p.cantidad_disponible}"
                    data-name="${p.nombre}"
                    data-price="${p.precio_compra}">
                    ${p.nombre} (Stock: ${p.cantidad_disponible})
                </option>`;
            });
        }
    }

    purchaseSelect.addEventListener("change", () => {
        const opt = purchaseSelect.selectedOptions[0];
        if (!opt) return;

        salesName.value = opt.dataset.name;
        stockDisplay.value = opt.dataset.stock;
        salesPrice.value = opt.dataset.price;
    });


    /**************************************************************
     * CARGAR CATEGORÍAS
     **************************************************************/
    async function cargarCategorias() {
        const data = await adminApiGet("/categorias");

        categorySelect.innerHTML =
            `<option value="" disabled selected>Selecciona una categoría...</option>`;

        if (data.success) {
            data.data.forEach(cat => {
                categorySelect.innerHTML += `
                    <option value="${cat.id}">${cat.nombre}</option>
                `;
            });
        }
    }


    /**************************************************************
     * GUARDAR — Crear o Editar
     **************************************************************/
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {
            id_producto: purchaseSelect.value,
            id_categoria: categorySelect.value,
            nombre_venta: salesName.value,
            descripcion: descriptionField.value,
            precio_venta: Number(salesPrice.value),
            imagen_url: imageUrl.value,
            destacado: featuredCheckbox.checked ? 1 : 0,
            activo: activeCheckbox.checked ? 1 : 0
        };

        const id = catalogId.value;

        const data = id
            ? await adminApiPut(`/catalogo/${id}`, payload)
            : await adminApiPost("/catalogo", payload);

        if (!data.success) return alert(data.message);

        alert("Guardado correctamente");
        cerrarModal();
        cargarCatalogo();
    });


    /**************************************************************
     * EDITAR
     **************************************************************/
    window.editarCatalogo = async function (id) {

        abrirModal("Editar Producto");

        const data = await adminApiGet(`/catalogo/${id}`);
        if (!data.success) return alert("Ítem no encontrado");

        const item = data.data;

        catalogId.value = item.id;

        purchaseSelect.innerHTML = `
            <option value="${item.id_producto}" selected>${item.nombre_producto}</option>
        `;

        stockDisplay.value = item.stock_real;
        salesName.value = item.nombre_venta;
        categorySelect.value = item.id_categoria;
        salesPrice.value = item.precio_venta;
        imageUrl.value = item.imagen_url;
        descriptionField.value = item.descripcion;

        featuredCheckbox.checked = item.destacado == 1;
        activeCheckbox.checked = item.activo == 1;

        actualizarVistaPrevia(item.imagen_url);
    };


    /**************************************************************
     * ELIMINAR
     **************************************************************/
    window.eliminarCatalogo = async function (id) {
        if (!confirm("¿Eliminar este producto del catálogo?")) return;

        const data = await adminApiDelete(`/catalogo/${id}`);

        if (!data.success) return alert(data.message);

        alert("Producto eliminado");
        cargarCatalogo();
    };


    /**************************************************************
     * INIT
     **************************************************************/
    cargarCatalogo();
});
