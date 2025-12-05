document.addEventListener("DOMContentLoaded", () => {

    // Verificar Token
    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "../auth/login.html";

    cargarProveedores();
    configurarModal();
});

/* ============================================================
   🔥 CARGAR PROVEEDORES DESDE API
============================================================ */
async function cargarProveedores() {
    try {
        const data = await adminApiGet("/proveedores");
        const tbody = document.querySelector("#suppliers-table tbody");
        tbody.innerHTML = "";

        if (!data.success || data.data.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="6" style="text-align:center;">No hay proveedores registrados</td></tr>
            `;
            return;
        }

        data.data.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.nombre_empresa}</td>
                    <td>${p.contacto_nombre || "—"}</td>
                    <td>${p.telefono || "—"}</td>
                    <td>${p.ruc || "—"}</td>
                    <td>
                        <button class="admin-btn-small edit-btn" data-id="${p.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="admin-btn-small delete-btn" data-id="${p.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        asignarEventosTabla();

    } catch (error) {
        console.error("Error cargando proveedores:", error);
    }
}

/* ============================================================
   🔥 EVENTOS BOTONES TABLA
============================================================ */
function asignarEventosTabla() {
    document.querySelectorAll(".edit-btn").forEach(btn => {
        btn.addEventListener("click", () => cargarProveedorEnModal(btn.dataset.id));
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", () => eliminarProveedor(btn.dataset.id));
    });
}

/* ============================================================
   🔥 CONFIGURAR MODAL
============================================================ */
function configurarModal() {
    const modal = document.getElementById("supplier-modal");
    const closeBtns = document.querySelectorAll(".close-btn, .close-modal-btn");
    const addBtn = document.getElementById("add-supplier-btn");

    addBtn.addEventListener("click", () => {
        limpiarFormulario();
        document.getElementById("supplier-modal-title").innerHTML =
            '<i class="fas fa-handshake"></i> Añadir Proveedor';
        modal.style.display = "block";
    });

    closeBtns.forEach(btn =>
        btn.addEventListener("click", () => (modal.style.display = "none"))
    );

    document.getElementById("supplier-form")
        .addEventListener("submit", validarYGuardarProveedor);
}

/* ============================================================
   🔥 VALIDACIÓN DE CAMPOS
============================================================ */
function validarProveedor(payload) {

    if (!payload.nombre_empresa.trim())
        return "El nombre de la empresa es obligatorio.";

    if (payload.nombre_empresa.length > 150)
        return "El nombre de la empresa no puede exceder 150 caracteres.";

    if (payload.contacto_nombre &&
        !/^[a-zA-ZÁÉÍÓÚÑáéíóúñ\s]+$/.test(payload.contacto_nombre))
        return "El nombre de contacto solo puede contener letras.";

    if (payload.ruc) {
        if (!/^\d{11}$/.test(payload.ruc))
            return "El RUC debe tener exactamente 11 números.";
    }

    if (payload.telefono) {
        if (!/^[0-9+\-\s]+$/.test(payload.telefono))
            return "El teléfono solo puede contener números, +, - y espacios.";
    }

    if (payload.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(payload.email))
            return "El email no tiene un formato válido.";
    }

    return null;
}

/* ============================================================
   🔥 GUARDAR PROVEEDOR (ADD / EDIT)
============================================================ */
async function validarYGuardarProveedor(e) {
    e.preventDefault();

    const id = document.getElementById("supplier-id").value;

    const payload = {
        nombre_empresa: document.getElementById("supplier-nombre-empresa").value.trim(),
        contacto_nombre: document.getElementById("supplier-contacto").value.trim(),
        telefono: document.getElementById("supplier-telefono").value.trim(),
        email: document.getElementById("supplier-email").value.trim(),
        ruc: document.getElementById("supplier-ruc").value.trim(),
        direccion: document.getElementById("supplier-direccion").value.trim(),
    };

    const error = validarProveedor(payload);
    if (error) return alert(error);

    const data = id
        ? await adminApiPut(`/proveedores/${id}`, payload)
        : await adminApiPost(`/proveedores`, payload);

    if (!data.success) {
        alert(data.message || "Hubo un error al guardar.");
        return;
    }

    document.getElementById("supplier-modal").style.display = "none";
    cargarProveedores();
}

/* ============================================================
   🔥 CARGAR PROVEEDOR EN MODAL PARA EDITAR
============================================================ */
async function cargarProveedorEnModal(id) {
    try {
        const data = await adminApiGet(`/proveedores/${id}`);
        if (!data.success) return alert("No se pudo cargar el proveedor.");

        const p = data.data;

        document.getElementById("supplier-id").value = p.id;
        document.getElementById("supplier-nombre-empresa").value = p.nombre_empresa;
        document.getElementById("supplier-contacto").value = p.contacto_nombre || "";
        document.getElementById("supplier-telefono").value = p.telefono || "";
        document.getElementById("supplier-email").value = p.email || "";
        document.getElementById("supplier-ruc").value = p.ruc || "";
        document.getElementById("supplier-direccion").value = p.direccion || "";

        document.getElementById("supplier-modal-title").innerHTML =
            '<i class="fas fa-handshake"></i> Editar Proveedor';

        document.getElementById("supplier-modal").style.display = "block";

    } catch (error) {
        console.error("Error al cargar proveedor:", error);
    }
}

/* ============================================================
   🔥 ELIMINAR PROVEEDOR
============================================================ */
async function eliminarProveedor(id) {
    if (!confirm("¿Eliminar este proveedor?")) return;

    const data = await adminApiDelete(`/proveedores/${id}`);

    if (!data.success) {
        alert(data.message || "Error eliminando proveedor.");
        return;
    }

    cargarProveedores();
}

/* ============================================================
   🔥 LIMPIAR MODAL
============================================================ */
function limpiarFormulario() {
    document.getElementById("supplier-id").value = "";
    document.getElementById("supplier-nombre-empresa").value = "";
    document.getElementById("supplier-contacto").value = "";
    document.getElementById("supplier-telefono").value = "";
    document.getElementById("supplier-email").value = "";
    document.getElementById("supplier-ruc").value = "";
    document.getElementById("supplier-direccion").value = "";
}
