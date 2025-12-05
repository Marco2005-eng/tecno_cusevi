document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    if (!token) return (window.location.href = "../auth/login.html");

    // ==============================
    // ELEMENTOS DEL DOM
    // ==============================
    const brandsTableBody = document.querySelector("#brands-table tbody");
    const searchInput = document.getElementById("search-input");
    const addBrandBtn = document.getElementById("add-brand-btn");

    const modal = document.getElementById("brand-modal");
    const modalTitle = document.getElementById("brand-modal-title");
    const closeModalBtns = document.querySelectorAll(".close-btn, .close-modal-btn");

    const brandForm = document.getElementById("brand-form");
    const brandId = document.getElementById("brand-id");
    const brandName = document.getElementById("brand-name");
    const brandLogo = document.getElementById("brand-logo-url");

    let marcas = [];

    // ==============================
    // 🔥 CARGAR MARCAS (adminApiGet)
    // ==============================
    async function cargarMarcas() {
        const data = await adminApiGet("/marcas");

        if (!data.success) {
            alert("Error cargando marcas");
            return;
        }

        marcas = data.data || [];
        renderMarcas(marcas);
    }

    function renderMarcas(lista) {
        brandsTableBody.innerHTML = "";

        if (!lista.length) {
            brandsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; padding:1rem;">
                        No hay marcas registradas.
                    </td>
                </tr>
            `;
            return;
        }

        lista.forEach(m => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${m.id}</td>
                <td>${m.nombre}</td>
                <td>
                    ${
                        m.logo_url
                            ? `<img src="${m.logo_url}" alt="logo" style="height:40px; border-radius:6px;">`
                            : "<span style='color:#888;'>Sin logo</span>"
                    }
                </td>
                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary" onclick="editarMarca(${m.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-btn admin-btn-small admin-btn-danger" onclick="eliminarMarca(${m.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            brandsTableBody.appendChild(tr);
        });
    }

    // ==============================
    // 🔍 BUSQUEDA
    // ==============================
    searchInput.addEventListener("input", () => {
        const q = searchInput.value.toLowerCase();
        const filtradas = marcas.filter(m => m.nombre.toLowerCase().includes(q));
        renderMarcas(filtradas);
    });

    // ==============================
    // 🪟 ABRIR / CERRAR MODAL
    // ==============================
    addBrandBtn.addEventListener("click", () => {
        brandForm.reset();
        brandId.value = "";
        abrirModal("Añadir Nueva Marca");
    });

    closeModalBtns.forEach(btn => btn.addEventListener("click", cerrarModal));

    function abrirModal(titulo) {
        modalTitle.innerHTML = `<i class="fas fa-tag"></i> ${titulo}`;
        modal.style.display = "flex";
    }

    function cerrarModal() {
        modal.style.display = "none";
    }

    window.onclick = e => {
        if (e.target === modal) cerrarModal();
    };

    // ==============================
    // 💾 GUARDAR MARCA (POST / PUT)
    // ==============================
    brandForm.addEventListener("submit", async e => {
        e.preventDefault();

        const payload = {
            nombre: brandName.value.trim(),
            logo_url: brandLogo.value.trim()
        };

        if (!payload.nombre) {
            alert("El nombre de la marca es obligatorio");
            return;
        }

        const id = brandId.value;
        let data;

        if (id) {
            // EDITAR
            data = await adminApiPut(`/marcas/${id}`, payload);
        } else {
            // CREAR
            data = await adminApiPost("/marcas", payload);
        }

        if (!data.success) {
            alert(data.message || "Error al guardar marca");
            return;
        }

        alert("Marca guardada correctamente ✔");
        cerrarModal();
        cargarMarcas();
    });

    // ==============================
    // ✏ EDITAR MARCA
    // ==============================
    window.editarMarca = function (id) {
        const m = marcas.find(x => x.id == id);
        if (!m) return alert("Marca no encontrada");

        brandId.value = m.id;
        brandName.value = m.nombre;
        brandLogo.value = m.logo_url || "";

        abrirModal("Editar Marca");
    };

    // ==============================
    // 🗑 ELIMINAR MARCA
    // ==============================
    window.eliminarMarca = async function (id) {
        if (!confirm("¿Deseas eliminar esta marca?")) return;

        const data = await adminApiDelete(`/marcas/${id}`);

        if (data.success) {
            alert("Marca eliminada correctamente ✔");
            cargarMarcas();
        } else {
            alert(data.message || "No se pudo eliminar la marca");
        }
    };

    // ==============================
    // 🚀 INICIALIZACIÓN
    // ==============================
    cargarMarcas();

});
