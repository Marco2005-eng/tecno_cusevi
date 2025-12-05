/**************************************************************
 * KARDEX.JS — Admin Panel (NGROK READY + adminApi.js)
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // 🔐 VALIDAR SESIÓN ADMIN
    // ============================================================
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token");

    if (!token || !user?.rol || user.rol !== "admin") {
        alert("Acceso no autorizado.");
        return (window.location.href = "../auth/login.html");
    }

    // ============================================================
    // OBTENER ID DEL PRODUCTO DESDE LA URL
    // ============================================================
    const params = new URLSearchParams(window.location.search);
    const idProducto = params.get("id_producto");

    if (!idProducto) {
        alert("No se seleccionó un producto.");
        return (window.location.href = "stock.html");
    }

    // Elements
    const tablaBody = document.querySelector("#kardex-table tbody");
    const tituloProducto = document.getElementById("nombre-producto");

    // ============================================================
    // CARGAR KARDEX USANDO adminApiGet()
    // ============================================================
    async function cargarKardex() {
        try {
            const data = await adminApiGet(`/cardex/${idProducto}`);

            if (!data.success) {
                alert("No se pudo obtener información del Kardex.");
                return;
            }

            tituloProducto.textContent = data.producto?.nombre || "Producto sin nombre";
            renderKardex(data.data);

        } catch (error) {
            console.error("❌ Error cargando Kardex:", error);
            alert("Error al conectar con el servidor.");
        }
    }

    // ============================================================
    // RENDERIZAR TABLA KARDEX
    // ============================================================
    function renderKardex(movimientos = []) {
        tablaBody.innerHTML = "";

        if (!movimientos.length) {
            tablaBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center;">Sin movimientos registrados</td>
                </tr>
            `;
            return;
        }

        movimientos.forEach(mov => {
            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${new Date(mov.fecha_movimiento).toLocaleString()}</td>
                <td>${mov.tipo_movimiento}</td>
                <td>${mov.cantidad}</td>
                <td>${mov.stock_resultante}</td>
                <td>${mov.usuario || "Sistema"}</td>
                <td>${mov.detalle || ""}</td>
            `;

            tablaBody.appendChild(tr);
        });
    }

    // ============================================================
    // INICIAR
    // ============================================================
    cargarKardex();
});
