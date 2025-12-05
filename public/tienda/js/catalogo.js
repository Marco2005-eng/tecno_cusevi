document.addEventListener("DOMContentLoaded", async () => {

    const API = "http://localhost:3000/api";

    let catalogo = [];
    let catalogoFiltrado = [];

    // Elementos
    const grid = document.getElementById("catalog-grid");

    const filtroBusqueda = document.getElementById("filtro-busqueda");
    const filtroCategoria = document.getElementById("filtro-categoria");
    const filtroMarca = document.getElementById("filtro-marca");
    const precioMin = document.getElementById("precio-min");
    const precioMax = document.getElementById("precio-max");
    const soloOfertas = document.getElementById("solo-ofertas");
    const ordenarPor = document.getElementById("ordenar-por");

    /* ============================================================
       CARGAR CATÁLOGO PÚBLICO
    ============================================================ */
    async function cargarCatalogo() {
        try {
            const res = await fetch(`${API}/catalogo-public`);
            const json = await res.json();

            if (!json.success) return;

            catalogo = json.data;
            catalogoFiltrado = [...catalogo];

            cargarFiltros();
            renderCatalogo();

        } catch (err) {
            console.error("Error cargando catálogo:", err);
        }
    }

    /* ============================================================
       CARGAR CATEGORÍAS Y MARCAS EN FILTROS
    ============================================================ */
    function cargarFiltros() {
        const categorias = new Set();
        const marcas = new Set();

        catalogo.forEach(item => {
            categorias.add(item.nombre_categoria);
            marcas.add(item.nombre_marca);
        });

        filtroCategoria.innerHTML = `<option value="">Todas</option>`;
        filtroMarca.innerHTML = `<option value="">Todas</option>`;

        categorias.forEach(c => {
            filtroCategoria.innerHTML += `<option value="${c}">${c}</option>`;
        });

        marcas.forEach(m => {
            filtroMarca.innerHTML += `<option value="${m}">${m}</option>`;
        });
    }

    /* ============================================================
       APLICAR FILTROS
    ============================================================ */
    function aplicarFiltros() {

        const texto = filtroBusqueda.value.toLowerCase();
        const categoria = filtroCategoria.value;
        const marca = filtroMarca.value;
        const min = Number(precioMin.value);
        const max = Number(precioMax.value);
        const ofertas = soloOfertas.checked;

        catalogoFiltrado = catalogo.filter(item => {

            const precio = item.precio_oferta ?? item.precio_venta;

            return (
                item.nombre_venta.toLowerCase().includes(texto) &&

                (categoria === "" || item.nombre_categoria === categoria) &&
                (marca === "" || item.nombre_marca === marca) &&

                (!min || precio >= min) &&
                (!max || precio <= max) &&

                (!ofertas || item.oferta_activa === true)
            );
        });

        ordenarResultados();
        renderCatalogo();
    }

    /* ============================================================
       ORDENAR RESULTADOS
    ============================================================ */
    function ordenarResultados() {
        if (ordenarPor.value === "precio-asc") {
            catalogoFiltrado.sort((a, b) =>
                (a.precio_oferta ?? a.precio_venta) -
                (b.precio_oferta ?? b.precio_venta)
            );
        }
        else if (ordenarPor.value === "precio-desc") {
            catalogoFiltrado.sort((a, b) =>
                (b.precio_oferta ?? b.precio_venta) -
                (a.precio_oferta ?? a.precio_venta)
            );
        }
        else if (ordenarPor.value === "nombre-asc") {
            catalogoFiltrado.sort((a, b) =>
                a.nombre_venta.localeCompare(b.nombre_venta)
            );
        }
        else if (ordenarPor.value === "nombre-desc") {
            catalogoFiltrado.sort((a, b) =>
                b.nombre_venta.localeCompare(a.nombre_venta)
            );
        }
    }

    /* ============================================================
       RENDERIZAR CATÁLOGO
    ============================================================ */
    function renderCatalogo() {

        grid.innerHTML = "";

        if (catalogoFiltrado.length === 0) {
            grid.innerHTML = `<p class="no-results">No se encontraron productos.</p>`;
            return;
        }

        catalogoFiltrado.forEach(item => {

            const precioBase = Number(item.precio_venta).toFixed(2);
            const precioOferta = item.precio_oferta
                ? Number(item.precio_oferta).toFixed(2)
                : null;

            const div = document.createElement("div");
            div.className = "catalog-card";

            div.innerHTML = `
                <div class="card-img">
                    <img src="${item.imagen_url}" alt="${item.nombre_venta}">
                    ${item.oferta_activa ? `<span class="badge-oferta">-${item.descuento_porcentaje}%</span>` : ""}
                </div>

                <h3>${item.nombre_venta}</h3>
                <p class="categoria">${item.nombre_categoria} • ${item.nombre_marca}</p>

                <div class="precio-box">
                    ${precioOferta
                        ? `<span class="precio-oferta">S/ ${precioOferta}</span>
                           <span class="precio-tachado">S/ ${precioBase}</span>`
                        : `<span class="precio-normal">S/ ${precioBase}</span>`
                    }
                </div>

                <button class="btn-add-cart" onclick="agregarAlCarrito(${item.id})">
                    Añadir al carrito
                </button>
            `;

            grid.appendChild(div);
        });
    }

    /* ============================================================
       AGREGAR AL CARRITO
    ============================================================ */
    window.agregarAlCarrito = function (id_catalogo) {

        let carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];

        const item = catalogo.find(i => i.id === id_catalogo);
        if (!item) return;

        const index = carrito.findIndex(p => p.id === id_catalogo);

        if (index >= 0) {
            carrito[index].cantidad += 1;
        } else {
            carrito.push({
                id: id_catalogo,
                nombre: item.nombre_venta,
                precio: item.precio_oferta ?? item.precio_venta,
                imagen: item.imagen_url,
                cantidad: 1
            });
        }

        localStorage.setItem("carrito_tienda", JSON.stringify(carrito));

        alert("Producto añadido al carrito");
        actualizarBadge();
    };

    function actualizarBadge() {
        const badge = document.getElementById("cart-count");
        if (!badge) return;

        const carrito = JSON.parse(localStorage.getItem("carrito_tienda")) || [];
        const total = carrito.reduce((s, p) => s + p.cantidad, 0);

        badge.textContent = total > 0 ? total : "";
    }

    /* ============================================================
       EVENTOS
    ============================================================ */
    filtroBusqueda.addEventListener("input", aplicarFiltros);
    filtroCategoria.addEventListener("change", aplicarFiltros);
    filtroMarca.addEventListener("change", aplicarFiltros);
    precioMin.addEventListener("input", aplicarFiltros);
    precioMax.addEventListener("input", aplicarFiltros);
    soloOfertas.addEventListener("change", aplicarFiltros);
    ordenarPor.addEventListener("change", aplicarFiltros);

    /* ============================================================
       INICIO
    ============================================================ */
    await cargarCatalogo();
    actualizarBadge();

});
