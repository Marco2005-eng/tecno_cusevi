document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem("token");
    if (!token) return window.location.href = "../auth/login.html";

    // ELEMENTOS DEL DOM
    const tableBody = document.querySelector("#offers-table tbody");
    const searchInput = document.getElementById("search-input");

    const modal = document.getElementById("offer-modal");
    const modalTitle = document.getElementById("offer-modal-title");
    const closeBtns = document.querySelectorAll(".close-btn, .close-modal-btn");

    const form = document.getElementById("offer-form");
    const offerId = document.getElementById("offer-id");
    const catalogSelect = document.getElementById("offer-catalog-id");
    const shortDesc = document.getElementById("offer-short-desc");
    const discount = document.getElementById("offer-discount");
    const startDate = document.getElementById("offer-start-date");
    const endDate = document.getElementById("offer-end-date");
    const activeCheck = document.getElementById("offer-active");

    document.getElementById("add-offer-btn").onclick = () => abrirModal("Crear Oferta");

    // =====================================================
    // 1. CARGAR PRODUCTOS DEL CATALOGO
    // =====================================================
    async function cargarProductosCatalogo(seleccionarId = null) {
        const data = await adminApiGet("/catalogo");

        if (!data.success) {
            return alert("No se pudo cargar el catálogo.");
        }

        catalogSelect.innerHTML = `
            <option value="" disabled selected>Seleccionar producto…</option>
        `;

        data.data.forEach(p => {
            catalogSelect.innerHTML += `
                <option value="${p.id}" data-precio="${p.precio_venta}">
                    ${p.nombre_venta} — S/ ${Number(p.precio_venta).toFixed(2)}
                </option>
            `;
        });

        if (seleccionarId) catalogSelect.value = seleccionarId;
    }

    // =====================================================
    // 2. CARGAR OFERTAS
    // =====================================================
    async function cargarOfertas() {
        const data = await adminApiGet("/ofertas");

        if (!data.success) {
            console.error("Error cargando ofertas", data);
            return alert("No se pudieron cargar las ofertas.");
        }

        renderTabla(data.data);
    }

    // =====================================================
    // 3. RENDER TABLA
    // =====================================================
    function renderTabla(ofertas) {
        tableBody.innerHTML = "";

        ofertas.forEach(o => {
            const precioBase = Number(o.precio_original);
            const precioFinal = precioBase - (precioBase * (o.descuento_porcentaje / 100));

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${o.id}</td>
                <td>${o.producto_nombre}</td>
                <td>${o.nombre}</td>
                <td>S/ ${precioBase.toFixed(2)}</td>
                <td>${o.descuento_porcentaje}%</td>
                <td><b>S/ ${precioFinal.toFixed(2)}</b></td>
                <td>${formatoFecha(o.fecha_inicio)}<br><small>→ ${formatoFecha(o.fecha_fin)}</small></td>
                <td>${o.activa ? "Activa" : "Inactiva"}</td>
                <td>
                    <button class="admin-btn admin-btn-small admin-btn-primary"
                        onclick="editarOferta(${o.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="admin-btn admin-btn-small admin-btn-danger"
                        onclick="eliminarOferta(${o.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tableBody.appendChild(tr);
        });
    }

    function formatoFecha(fechaISO) {
        if (!fechaISO) return "-";
        const fecha = new Date(fechaISO);
        return fecha.toLocaleString("es-PE");
    }

    function convertirFechaInput(fechaISO) {
        const d = new Date(fechaISO);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    }

    // =====================================================
    // 4. ABRIR MODAL
    // =====================================================
    function abrirModal(titulo, esEdicion = false) {
        modalTitle.innerHTML = `<i class="fas fa-percentage"></i> ${titulo}`;
        modal.style.display = "flex";

        if (!esEdicion) {
            form.reset();
            offerId.value = "";
            activeCheck.checked = true;
            cargarProductosCatalogo();
        }
    }

    function cerrarModal() {
        modal.style.display = "none";
    }

    closeBtns.forEach(btn => btn.onclick = cerrarModal);
    window.onclick = e => { if (e.target === modal) cerrarModal(); };

    // =====================================================
    // 5. VALIDAR OFERTA DUPLICADA
    // =====================================================
    async function validarOfertaDuplicada(idCatalogo, idActual = null) {
        const data = await adminApiGet("/ofertas");

        if (!data.success) return false;

        return data.data.some(o =>
            o.id_catalogo == idCatalogo &&
            o.activa == 1 &&
            o.id != idActual
        );
    }

    // =====================================================
    // 6. GUARDAR / EDITAR OFERTA
    // =====================================================
    form.addEventListener("submit", async e => {
        e.preventDefault();

        const id = offerId.value;
        const idCatalogo = catalogSelect.value;

        const existe = await validarOfertaDuplicada(idCatalogo, id);

        if (existe) {
            return alert("Este producto ya tiene una oferta activa.");
        }

        const payload = {
            id_catalogo: idCatalogo,
            nombre: shortDesc.value,
            descuento_porcentaje: discount.value,
            fecha_inicio: startDate.value,
            fecha_fin: endDate.value,
            activa: activeCheck.checked ? 1 : 0
        };

        let data;

        if (id) {
            data = await adminApiPut(`/ofertas/${id}`, payload);
        } else {
            data = await adminApiPost("/ofertas", payload);
        }

        if (!data.success) {
            return alert(data.message || "Error guardando oferta.");
        }

        alert("Oferta guardada correctamente");
        cerrarModal();
        cargarOfertas();
    });

    // =====================================================
    // 7. EDITAR OFERTA (CORREGIDO)
    // =====================================================
    window.editarOferta = async function (id) {

        abrirModal("Editar Oferta", true);

        const data = await adminApiGet(`/ofertas/${id}`);

        if (!data.success || !data.data) {
            cerrarModal();
            return alert("No se pudo cargar esta oferta.");
        }

        const o = data.data;

        offerId.value = o.id;

        await cargarProductosCatalogo(o.id_catalogo);

        shortDesc.value = o.nombre;
        discount.value = o.descuento_porcentaje;
        startDate.value = convertirFechaInput(o.fecha_inicio);
        endDate.value = convertirFechaInput(o.fecha_fin);
        activeCheck.checked = o.activa == 1;
    };

    // =====================================================
    // 8. ELIMINAR OFERTA
    // =====================================================
    window.eliminarOferta = async function (id) {
        if (!confirm("¿Eliminar esta oferta?")) return;

        const data = await adminApiDelete(`/ofertas/${id}`);

        if (!data.success) return alert(data.message);

        alert("Oferta eliminada correctamente");
        cargarOfertas();
    };

    // =====================================================
    // 9. BUSCADOR
    // =====================================================
    searchInput.addEventListener("input", () => {
        const filtro = searchInput.value.toLowerCase();
        const filas = tableBody.querySelectorAll("tr");

        filas.forEach(f => {
            const visible = f.textContent.toLowerCase().includes(filtro);
            f.style.display = visible ? "" : "none";
        });
    });

    // =====================================================
    // 10. INICIO
    // =====================================================
    cargarOfertas();
});
