/**************************************************************
 * CATEGORÍAS.JS — Admin Panel (NGROK READY + adminApi.js)
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    /**************************************************************
     * ⛔ VALIDAR AUTENTICACIÓN ADMIN
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
    const tableBody = document.querySelector("#categories-table tbody");
    const searchInput = document.getElementById("search-input");
    const addCategoryBtn = document.getElementById("add-category-btn");

    const modal = document.getElementById("category-modal");
    const modalTitle = document.getElementById("category-modal-title");
    const closeBtns = document.querySelectorAll(".close-btn, .close-modal-btn");

    const form = document.getElementById("category-form");
    const categoryId = document.getElementById("category-id");
    const categoryName = document.getElementById("category-name");
    const categoryDescription = document.getElementById("category-description");

    let categorias = [];

    /**************************************************************
     * 🔥 CARGAR CATEGORÍAS — adminApiGet()
     **************************************************************/
    async function cargarCategorias() {
        const data = await adminApiGet("/categorias");

        if (!data.success) {
            alert(data.message || "Error al cargar categorías");
            return;
        }

        categorias = data.data || [];
        renderTabla(categorias);
    }

    function renderTabla(lista) {
        tableBody.innerHTML = "";

        if (!lista.length) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; padding:1rem;">
                        No hay categorías registradas.
                    </td>
                </tr>
            `;
            return;
        }

        lista.forEach(cat => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${cat.id}</td>
                <td>${cat.nombre}</td>
                <td>${cat.descripcion || ""}</td>
                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary"
                        onclick="editarCategoria(${cat.id})">
                        <i class="fas fa-edit"></i>
                    </button>

                    <button class="admin-btn admin-btn-small admin-btn-danger"
                        onclick="eliminarCategoria(${cat.id})">
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
        const q = searchInput.value.toLowerCase();

        const filtradas = categorias.filter(c =>
            c.nombre.toLowerCase().includes(q) ||
            (c.descripcion && c.descripcion.toLowerCase().includes(q))
        );

        renderTabla(filtradas);
    });

    /**************************************************************
     * 🪟 MODAL ABRIR/CERRAR
     **************************************************************/
    addCategoryBtn.onclick = () => {
        abrirModal("Añadir Nueva Categoría");
        form.reset();
        categoryId.value = "";
    };

    closeBtns.forEach(btn => (btn.onclick = cerrarModal));

    function abrirModal(titulo) {
        modalTitle.innerHTML = `<i class="fas fa-list"></i> ${titulo}`;
        modal.style.display = "flex";
    }

    function cerrarModal() {
        modal.style.display = "none";
    }

    window.onclick = e => {
        if (e.target === modal) cerrarModal();
    };

    /**************************************************************
     * 💾 GUARDAR CATEGORÍA (Crear o Editar)
     **************************************************************/
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {
            nombre: categoryName.value.trim(),
            descripcion: categoryDescription.value.trim()
        };

        if (!payload.nombre) {
            alert("El nombre de la categoría es obligatorio");
            return;
        }

        const id = categoryId.value;

        const data = id
            ? await adminApiPut(`/categorias/${id}`, payload)
            : await adminApiPost("/categorias", payload);

        if (!data.success) {
            alert(data.message || "Error al guardar categoría");
            return;
        }

        alert("Categoría guardada correctamente");
        cerrarModal();
        cargarCategorias();
    });

    /**************************************************************
     * ✏ EDITAR CATEGORÍA
     **************************************************************/
    window.editarCategoria = async function (id) {
        const cat = categorias.find(c => c.id === id);
        if (!cat) {
            alert("Categoría no encontrada");
            return;
        }

        abrirModal("Editar Categoría");

        categoryId.value = cat.id;
        categoryName.value = cat.nombre;
        categoryDescription.value = cat.descripcion || "";
    };

    /**************************************************************
     * 🗑 ELIMINAR CATEGORÍA
     **************************************************************/
    window.eliminarCategoria = async function (id) {
        if (!confirm("¿Seguro que deseas eliminar esta categoría?")) return;

        const data = await adminApiDelete(`/categorias/${id}`);

        if (!data.success) {
            alert(data.message || "No se pudo eliminar la categoría");
            return;
        }

        alert("Categoría eliminada correctamente");
        cargarCategorias();
    };

    /**************************************************************
     * 🚀 INICIO
     **************************************************************/
    cargarCategorias();
});
