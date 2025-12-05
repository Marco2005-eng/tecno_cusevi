/**************************************************************
 * COMPRAS.JS — Admin Panel (NGROK READY + adminApi.js)
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    /**************************************************************
     * 🔐 VALIDACIÓN DE SESIÓN ADMIN
     **************************************************************/
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || user?.rol !== "admin") {
        alert("Acceso no autorizado.");
        return (window.location.href = "../auth/login.html");
    }

    /**************************************************************
     * ELEMENTOS DEL DOM
     **************************************************************/
    const tableBody = document.querySelector("#purchases-table tbody");
    const searchInput = document.getElementById("search-input");

    const modal = document.getElementById("purchase-modal");
    const modalTitle = document.getElementById("purchase-modal-title");
    const closeBtns = document.querySelectorAll(".close-btn, .close-modal-btn");

    const form = document.getElementById("purchase-form");

    const idField = document.getElementById("purchase-id");
    const supplierField = document.getElementById("purchase-supplier");
    const dateField = document.getElementById("purchase-date");
    const invoiceField = document.getElementById("purchase-invoice");
    const statusField = document.getElementById("purchase-status");
    const notesField = document.getElementById("purchase-notes");

    document.getElementById("add-purchase-btn").onclick = () =>
        abrirModal("Registrar Compra");


    /**************************************************************
     * 🔥 FORMATEAR FECHA (YYYY-MM-DD)
     **************************************************************/
    function formatearFecha(fechaUTC) {
        if (!fechaUTC) return "";
        const f = new Date(fechaUTC);
        return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(
            f.getDate()
        ).padStart(2, "0")}`;
    }

    /**************************************************************
     * 🔥 CARGAR PROVEEDORES — adminApiGet()
     **************************************************************/
    async function cargarProveedores() {
        const data = await adminApiGet("/proveedores");

        supplierField.innerHTML = `<option value="" disabled selected>Seleccionar proveedor...</option>`;

        if (data.success) {
            data.data.forEach(p => {
                supplierField.innerHTML += `
                    <option value="${p.id}">${p.nombre_empresa}</option>
                `;
            });
        }
    }

    /**************************************************************
     * 🔥 CARGAR COMPRAS — adminApiGet()
     **************************************************************/
    async function cargarCompras() {
        const data = await adminApiGet("/compras");

        tableBody.innerHTML = "";

        if (!data.success) {
            tableBody.innerHTML = `<tr><td colspan="6">No se pudieron cargar compras.</td></tr>`;
            return;
        }

        data.data.forEach(c => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${c.id}</td>
                <td>${c.proveedor_nombre}</td>
                <td>${formatearFecha(c.fecha_compra)}</td>
                <td>${c.num_factura || "-"}</td>
                <td>${c.estado}</td>
                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary"
                        onclick="editarCompra(${c.id})">
                        <i class="fas fa-edit"></i>
                    </button>

                    <button class="admin-btn admin-btn-small admin-btn-danger"
                        onclick="eliminarCompra(${c.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });
    }

    /**************************************************************
     * 🔍 BUSCADOR
     **************************************************************/
    searchInput.addEventListener("input", () => {
        const txt = searchInput.value.toLowerCase();
        const filas = tableBody.querySelectorAll("tr");

        filas.forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(txt) ? "" : "none";
        });
    });

    /**************************************************************
     * 🪟 MODAL — ABRIR / CERRAR
     **************************************************************/
    function abrirModal(titulo) {
        modalTitle.innerHTML = `<i class="fas fa-truck-loading"></i> ${titulo}`;
        form.reset();
        idField.value = "";
        modal.style.display = "flex";
    }

    function cerrarModal() {
        modal.style.display = "none";
    }

    closeBtns.forEach(btn => (btn.onclick = cerrarModal));

    window.onclick = e => {
        if (e.target === modal) cerrarModal();
    };

    /**************************************************************
     * 💾 GUARDAR COMPRA — adminApiPost / adminApiPut
     **************************************************************/
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {
            id_proveedor: supplierField.value,
            fecha_compra: dateField.value,
            num_factura: invoiceField.value,
            estado: statusField.value,
            notas: notesField.value
        };

        const id = idField.value;

        const data = id
            ? await adminApiPut(`/compras/${id}`, payload)
            : await adminApiPost(`/compras`, payload);

        if (!data.success) {
            alert(data.message || "No se pudo guardar la compra");
            return;
        }

        alert("Compra guardada correctamente");
        cerrarModal();
        cargarCompras();
    });

    /**************************************************************
     * ✏️ EDITAR COMPRA — adminApiGet()
     **************************************************************/
    window.editarCompra = async function (id) {
        abrirModal("Editar Compra");

        const data = await adminApiGet(`/compras/${id}`);

        if (!data.success) {
            alert("Compra no encontrada");
            return;
        }

        const c = data.data;

        idField.value = c.id;
        supplierField.value = c.id_proveedor;
        dateField.value = formatearFecha(c.fecha_compra);
        invoiceField.value = c.num_factura || "";
        statusField.value = c.estado;
        notesField.value = c.notas || "";
    };

    /**************************************************************
     * 🗑 ELIMINAR COMPRA — adminApiDelete()
     **************************************************************/
    window.eliminarCompra = async function (id) {
        if (!confirm("¿Eliminar esta compra?")) return;

        const data = await adminApiDelete(`/compras/${id}`);

        if (!data.success) {
            alert(data.message || "No se pudo eliminar la compra");
            return;
        }

        alert("Compra eliminada");
        cargarCompras();
    };

    /**************************************************************
     * 🚀 INICIALIZACIÓN
     **************************************************************/
    cargarProveedores();
    cargarCompras();
});
