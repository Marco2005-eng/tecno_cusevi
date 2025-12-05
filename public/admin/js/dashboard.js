/**************************************************************
 * DASHBOARD ADMIN — NGROK READY + adminApi.js integrado
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    /**************************************************************
     * 🔐 VALIDACIÓN DE SESIÓN ADMIN
     **************************************************************/
    const token = localStorage.getItem("token");
    const usuario = JSON.parse(localStorage.getItem("user") || "{}");

    if (!token || usuario.rol !== "admin") {
        alert("Acceso no autorizado");
        return (window.location.href = "../auth/login.html");
    }

    document.getElementById("admin-username").textContent =
        usuario.nombre || "Administrador";

    /**************************************************************
     * 📌 MENÚ LATERAL (ACORDEÓN)
     **************************************************************/
    document.querySelectorAll(".sidebar-title").forEach(title => {
        title.addEventListener("click", () => {
            title.classList.toggle("active");
            const items = title.nextElementSibling;
            if (items?.classList.contains("nav-items")) {
                items.classList.toggle("expanded");
            }
        });
    });

    /**************************************************************
     * 🌐 HELPER DE MONEDA
     **************************************************************/
    const money = n => "S/ " + Number(n).toFixed(2);

    /**************************************************************
     * 📊 1. ESTADÍSTICAS PRINCIPALES (adminApiGet)
     **************************************************************/
    async function cargarEstadisticas() {
        try {
            const ventasHoy     = await adminApiGet("/reportes/ventas-hoy");
            const pedidosHoy    = await adminApiGet("/reportes/pedidos-hoy");
            const stockBajo     = await adminApiGet("/reportes/stock-bajo");
            const nuevosClientes = await adminApiGet("/reportes/nuevos-clientes");

            document.getElementById("stat-sales-today").textContent =
                money(ventasHoy.data?.total || 0);

            document.getElementById("stat-orders-today").textContent =
                pedidosHoy.data?.total || 0;

            document.getElementById("stat-low-stock").textContent =
                stockBajo.data?.total || 0;

            document.getElementById("stat-new-users").textContent =
                nuevosClientes.data?.total || 0;

            animarTarjetas();

        } catch (error) {
            console.error("❌ Error cargando estadísticas:", error);
        }
    }

    function animarTarjetas() {
        document.querySelectorAll(".stat-card").forEach((card, i) => {
            card.style.opacity = "0";
            card.style.transform = "translateY(10px)";

            setTimeout(() => {
                card.style.transition = "all .4s ease";
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            }, 150 * i);
        });
    }

    /**************************************************************
     * 🛒 2. PEDIDOS DEL DÍA (máx 5)
     **************************************************************/
    async function cargarPedidosRecientes() {
        try {
            const res = await adminApiGet("/pedidos");
            if (!res.success) return;

            const tbody = document.getElementById("recent-orders-tbody");
            tbody.innerHTML = "";

            const hoy = new Date().toISOString().slice(0, 10);

            const pedidosHoy = res.data
                .filter(p => p.fecha_pedido?.slice(0, 10) === hoy)
                .slice(0, 5);

            if (!pedidosHoy.length) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center">No hay pedidos hoy</td>
                    </tr>`;
                return;
            }

            pedidosHoy.forEach(p => {
                tbody.innerHTML += `
                    <tr>
                        <td>${p.id}</td>
                        <td>${p.cliente_nombre}</td>
                        <td>${money(p.total)}</td>
                        <td>${p.estado}</td>
                        <td>
                            <a href="pedidos.html" class="admin-btn admin-btn-small admin-btn-primary">
                                Ver
                            </a>
                        </td>
                    </tr>
                `;
            });

        } catch (error) {
            console.error("Error cargando pedidos recientes:", error);
        }
    }

    /**************************************************************
     * 🚨 3. ALERTAS DEL DÍA (máx 10)
     **************************************************************/
    async function cargarAlertas() {
        try {
            const res = await adminApiGet("/alertas?limit=20");
            if (!res.success) return;

            const hoy = new Date().toISOString().slice(0, 10);
            const alertasHoy = res.data
                .filter(a => a.fecha?.slice(0, 10) === hoy)
                .slice(0, 10);

            const list = document.getElementById("stock-alerts-list");
            list.innerHTML = "";

            if (!alertasHoy.length) {
                list.innerHTML = `
                    <li class="alert-item">
                        <strong>No hay alertas hoy</strong>
                    </li>`;
                return;
            }

            alertasHoy.forEach(a => {
                list.innerHTML += `
                    <li class="alert-item">
                        <strong>${a.titulo}</strong><br>
                        <small>${a.descripcion}</small>
                    </li>
                `;
            });

        } catch (error) {
            console.error("Error cargando alertas:", error);
        }
    }

    /**************************************************************
     * 🚪 LOGOUT
     **************************************************************/
    document.getElementById("logout-btn").addEventListener("click", () => {
        const btn = document.getElementById("logout-btn");

        btn.style.transform = "scale(0.8)";
        btn.style.opacity = "0.5";

        setTimeout(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "../auth/login.html";
        }, 300);
    });

    /**************************************************************
     * ⏳ LOADER
     **************************************************************/
    const loader = document.getElementById("loading-overlay");

    function ocultarLoader() {
        loader.style.opacity = "0";
        setTimeout(() => loader.remove(), 300);
    }

    /**************************************************************
     * 🚀 INICIALIZACIÓN DEL DASHBOARD
     **************************************************************/
    Promise.all([
        cargarEstadisticas(),
        cargarPedidosRecientes(),
        cargarAlertas()
    ]).then(() => ocultarLoader());
});
