document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    if (!token) return (window.location.href = "../auth/login.html");

    // Ya NO usamos localhost
    // const API = "http://localhost:3000/api";

    const tableBody = document.querySelector("#users-table tbody");
    const searchInput = document.getElementById("search-input");
    const addUserBtn = document.getElementById("add-user-btn");

    // PAGINACIÓN
    const rowsPerPage = 5;
    let currentPage = 1;

    let usuariosFull = [];
    let usuariosGlobal = [];

    // MODAL
    const userModal = document.getElementById("user-modal");
    const modalTitle = document.getElementById("user-modal-title");
    const closeModalBtns = document.querySelectorAll(".close-btn, .close-modal-btn");

    const userForm = document.getElementById("user-form");
    const userId = document.getElementById("user-id");
    const userName = document.getElementById("user-name");
    const userEmail = document.getElementById("user-email");
    const userRole = document.getElementById("user-role");
    const userPassword = document.getElementById("user-password");

    // STATS
    const statTotalUsers = document.querySelector("#stat-total-users .stat-number");
    const statAdmins = document.querySelector("#stat-admins .stat-number");
    const statClients = document.querySelector("#stat-clients .stat-number");


    /* ============================================================
       🔥 CARGAR USUARIOS — usando adminApiGet
    ============================================================ */
    async function cargarUsuarios() {
        try {
            const data = await adminApiGet("/usuarios");

            if (!data.success) return;

            usuariosFull = data.data;
            usuariosGlobal = [...usuariosFull];

            calcularEstadisticas();
            currentPage = 1;
            renderTabla();
            renderPaginacion();

        } catch (err) {
            console.error("Error cargando usuarios:", err);
        }
    }


    /* ============================================================
       🔢 ESTADÍSTICAS
    ============================================================ */
    function calcularEstadisticas() {
        statTotalUsers.textContent = usuariosFull.length;
        statAdmins.textContent = usuariosFull.filter(u => u.rol === "admin").length;
        statClients.textContent = usuariosFull.filter(u => u.rol === "cliente").length;
    }


    /* ============================================================
       📋 RENDER TABLA
    ============================================================ */
    function renderTabla() {
        tableBody.innerHTML = "";

        const inicio = (currentPage - 1) * rowsPerPage;
        const fin = inicio + rowsPerPage;

        const usuariosMostrados = usuariosGlobal.slice(inicio, fin);

        usuariosMostrados.forEach(u => {
            const activo = u.activo == 1;
            const estadoClase = activo ? "estado-activo" : "estado-inactivo";
            const estadoTexto = activo ? "Activo" : "Inactivo";

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${u.id}</td>
                <td>${u.nombre}</td>
                <td>${u.email}</td>
                <td>${u.rol}</td>

                <td>
                    <span class="estado-badge ${estadoClase}">${estadoTexto}</span>
                </td>

                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary" onclick="editarUsuario(${u.id})">
                        <i class="fas fa-edit"></i>
                    </button>

                    <button class="admin-btn admin-btn-small admin-btn-warning" onclick="toggleEstado(${u.id}, ${u.activo})">
                        <i class="fas ${activo ? "fa-user-slash" : "fa-user-check"}"></i>
                    </button>

                    <button class="admin-btn admin-btn-small admin-btn-danger" onclick="eliminarUsuario(${u.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }


    /* ============================================================
       🔢 PAGINACIÓN
    ============================================================ */
    function renderPaginacion() {
        const totalPages = Math.ceil(usuariosGlobal.length / rowsPerPage) || 1;

        let pagHtml = `<div class="pagination">`;

        for (let i = 1; i <= totalPages; i++) {
            pagHtml += `
                <button class="page-btn ${i === currentPage ? "active" : ""}" onclick="cambiarPagina(${i})">
                    ${i}
                </button>`;
        }

        pagHtml += `</div>`;

        const existing = document.querySelector(".pagination");
        if (!existing) {
            const container = document.querySelector(".table-container");
            container.insertAdjacentHTML("afterend", pagHtml);
        } else {
            existing.outerHTML = pagHtml;
        }
    }

    window.cambiarPagina = (num) => {
        currentPage = num;
        renderTabla();
        renderPaginacion();
    };


    /* ============================================================
       🔍 BUSCADOR
    ============================================================ */
    searchInput.addEventListener("input", () => {
        const filtro = searchInput.value.toLowerCase();

        if (!filtro.trim()) {
            usuariosGlobal = [...usuariosFull];
        } else {
            usuariosGlobal = usuariosFull.filter(u =>
                (u.nombre || "").toLowerCase().includes(filtro) ||
                (u.email || "").toLowerCase().includes(filtro) ||
                (u.rol || "").toLowerCase().includes(filtro)
            );
        }

        currentPage = 1;
        renderTabla();
        renderPaginacion();
    });


    /* ============================================================
       🪟 MODAL
    ============================================================ */
    addUserBtn.addEventListener("click", () => abrirModal("Nuevo Usuario"));
    closeModalBtns.forEach(btn => btn.addEventListener("click", cerrarModal));

    function abrirModal(titulo) {
        modalTitle.innerHTML = `<i class="fas fa-user"></i> ${titulo}`;
        userForm.reset();
        userId.value = "";
        userPassword.placeholder = "";
        userModal.style.display = "flex";
    }

    function cerrarModal() {
        userModal.style.display = "none";
    }

    window.onclick = (event) => {
        if (event.target === userModal) cerrarModal();
    };


    /* ============================================================
       💾 GUARDAR USUARIO — adminApiPost/adminApiPut
    ============================================================ */
    userForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!userName.value.trim()) return alert("El nombre es obligatorio.");
        if (!userEmail.value.trim()) return alert("El correo es obligatorio.");

        const id = userId.value;
        const esNuevo = !id;

        if (esNuevo && !userPassword.value.trim())
            return alert("La contraseña es obligatoria para nuevos usuarios.");

        const payload = {
            nombre: userName.value.trim(),
            email: userEmail.value.trim(),
            rol: userRole.value,
            nombre_usuario: userEmail.value.split("@")[0],
            password: userPassword.value.trim()
        };

        let data = esNuevo
            ? await adminApiPost("/usuarios", payload)
            : await adminApiPut(`/usuarios/${id}`, payload);

        if (!data.success) return alert(data.message || "Error al guardar usuario");

        alert("Usuario guardado correctamente");
        cerrarModal();
        cargarUsuarios();
    });


    /* ============================================================
       ✏️ EDITAR USUARIO — adminApiGet
    ============================================================ */
    window.editarUsuario = async function (id) {
        abrirModal("Editar Usuario");

        const data = await adminApiGet(`/usuarios/${id}`);
        if (!data.success) return alert("No se encontró el usuario");

        const u = data.data;

        userId.value = u.id;
        userName.value = u.nombre;
        userEmail.value = u.email;
        userRole.value = u.rol;

        userPassword.value = "";
        userPassword.placeholder = "Dejar en blanco para no cambiar";
    };


    /* ============================================================
       🔁 ACTIVAR / INACTIVAR USUARIO — adminApiPatch
    ============================================================ */
    window.toggleEstado = async function (id, estadoActual) {
        const nuevoEstado = estadoActual == 1 ? 0 : 1;

        if (!confirm(`¿Deseas ${nuevoEstado ? "activar" : "inactivar"} este usuario?`)) return;

        const data = await adminApiPatch(`/usuarios/${id}/estado`, {
            estado: nuevoEstado
        });

        if (!data.success) return alert(data.message);

        alert("Estado actualizado");
        cargarUsuarios();
    };


    /* ============================================================
       🗑 ELIMINAR USUARIO — adminApiDelete
    ============================================================ */
    window.eliminarUsuario = async function (id) {
        if (!confirm("⚠ ¿Seguro que deseas eliminar este usuario?")) return;

        const data = await adminApiDelete(`/usuarios/${id}`);

        if (!data.success) return alert(data.message || "Error al eliminar");

        alert("Usuario eliminado");
        cargarUsuarios();
    };


    // ============================================================
    // 🔰 INICIALIZAR
    // ============================================================
    cargarUsuarios();

});
