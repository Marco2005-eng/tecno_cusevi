/**************************************************************
 * CLIENTES.JS — Admin Panel (NGROK READY + adminApi.js)
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    /**************************************************************
     * 🔐 VALIDAR SESIÓN ADMIN
     **************************************************************/
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || user?.rol !== "admin") {
        alert("Acceso no autorizado");
        return (window.location.href = "../auth/login.html");
    }

    /**************************************************************
     * ELEMENTOS DEL DOM
     **************************************************************/
    const tableBody = document.querySelector("#clients-table tbody");
    const searchInput = document.getElementById("search-input");
    const paginacionEl = document.getElementById("paginacion-clientes");

    const modal = document.getElementById("client-modal");
    const modalTitle = document.getElementById("client-modal-title");
    const closeBtns = document.querySelectorAll(".close-btn, .close-modal-btn");

    const form = document.getElementById("client-form");
    const clientId = document.getElementById("client-id");
    const clientName = document.getElementById("client-name");
    const clientEmail = document.getElementById("client-email");
    const clientPhone = document.getElementById("client-phone");
    const clientAddress = document.getElementById("client-address");

    const statTotal = document.querySelector("#stat-total-clients .stat-number");

    document.getElementById("add-client-btn").onclick = () => abrirModal("Nuevo Cliente");

    let listaClientes = [];

    /**************************************************************
     * PAGINACIÓN
     **************************************************************/
    let paginaActual = 1;
    const porPagina = 8;
    let listaFiltrada = [];

    function getPagina(lista) {
        const inicio = (paginaActual - 1) * porPagina;
        return lista.slice(inicio, inicio + porPagina);
    }

    function renderPaginacion(totalItems) {
        paginacionEl.innerHTML = "";

        const totalPaginas = Math.ceil(totalItems / porPagina);
        if (totalPaginas <= 1) return;

        for (let i = 1; i <= totalPaginas; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = "page-btn " + (i === paginaActual ? "page-active" : "");

            btn.onclick = () => {
                paginaActual = i;
                renderTabla(listaFiltrada);
            };

            paginacionEl.appendChild(btn);
        }
    }

    /**************************************************************
     * 🔥 1. CARGAR CLIENTES — adminApiGet()
     **************************************************************/
    async function cargarClientes() {
        const data = await adminApiGet("/clientes");

        if (!data.success) {
            alert(data.message || "No se pudieron cargar los clientes");
            return;
        }

        listaClientes = data.data;
        statTotal.textContent = listaClientes.length;

        aplicarFiltro();
    }

    /**************************************************************
     * 🔥 2. RENDER TABLA (CON PAGINACIÓN)
     **************************************************************/
    function renderTabla(lista) {
        tableBody.innerHTML = "";

        if (!lista.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center;padding:1rem;">
                        No hay clientes registrados.
                    </td>
                </tr>`;
            paginacionEl.innerHTML = "";
            return;
        }

        const pagina = getPagina(lista);

        pagina.forEach(c => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${c.id}</td>
                <td>${c.nombre}</td>
                <td>${c.email}</td>
                <td>${c.telefono || "-"}</td>
                <td>${c.direccion || "-"}</td>
                <td>${new Date(c.fecha_registro).toLocaleDateString("es-PE")}</td>

                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary"
                        onclick="editarCliente(${c.id})">
                        <i class="fas fa-edit"></i>
                    </button>

                    <button class="admin-btn admin-btn-small admin-btn-danger"
                        onclick="eliminarCliente(${c.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });

        renderPaginacion(lista.length);
    }

    /**************************************************************
     * 🔥 3. BUSCADOR + PAGINACIÓN
     **************************************************************/
    searchInput.addEventListener("input", aplicarFiltro);

    function aplicarFiltro() {
        const q = searchInput.value.toLowerCase();

        listaFiltrada = listaClientes.filter(c =>
            c.nombre.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            (c.telefono && c.telefono.toLowerCase().includes(q))
        );

        paginaActual = 1;
        renderTabla(listaFiltrada);
    }

    /**************************************************************
     * 🔥 4. MODAL
     **************************************************************/
    function abrirModal(titulo) {
        modalTitle.innerHTML = `<i class="fas fa-user"></i> ${titulo}`;
        form.reset();
        clientId.value = "";
        modal.style.display = "flex";
    }

    function cerrarModal() {
        modal.style.display = "none";
    }

    closeBtns.forEach(btn => (btn.onclick = cerrarModal));
    window.onclick = e => { if (e.target === modal) cerrarModal(); };

    /**************************************************************
     * 🔥 5. GUARDAR CLIENTE — adminApiPost / adminApiPut
     **************************************************************/
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {
            nombre: clientName.value.trim(),
            email: clientEmail.value.trim(),
            telefono: clientPhone.value.trim(),
            direccion: clientAddress.value.trim()
        };

        if (!payload.nombre || !payload.email) {
            alert("Nombre y correo son obligatorios");
            return;
        }

        const id = clientId.value;

        const data = id
            ? await adminApiPut(`/clientes/${id}`, payload)
            : await adminApiPost(`/clientes`, payload);

        if (!data.success) {
            alert(data.message || "Error guardando cliente");
            return;
        }

        alert(id ? "Cliente actualizado" : "Cliente registrado");
        cerrarModal();
        cargarClientes();
    });

    /**************************************************************
     * 🔥 6. EDITAR CLIENTE — adminApiGet
     **************************************************************/
    window.editarCliente = async function (id) {
        abrirModal("Editar Cliente");

        const data = await adminApiGet(`/clientes/${id}`);
        if (!data.success) {
            alert("Cliente no encontrado");
            return;
        }

        const c = data.data;

        clientId.value = c.id;
        clientName.value = c.nombre;
        clientEmail.value = c.email;
        clientPhone.value = c.telefono || "";
        clientAddress.value = c.direccion || "";
    };

    /**************************************************************
     * 🔥 7. ELIMINAR CLIENTE — adminApiDelete
     **************************************************************/
    window.eliminarCliente = async function (id) {
        if (!confirm("¿Eliminar este cliente?")) return;

        const data = await adminApiDelete(`/clientes/${id}`);

        if (!data.success) {
            alert(data.message || "Error al eliminar cliente");
            return;
        }

        alert("Cliente eliminado");
        cargarClientes();
    };

    /**************************************************************
     * 🚀 8. INICIALIZACIÓN
     **************************************************************/
    cargarClientes();
});
