/**************************************************************
 * ADMIN CORE — Control de sesión, menú lateral y logout
 * Funciona junto a adminApi.js (NGROK / PRODUCCIÓN / LOCAL)
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {

    // ============================================================
    // 🔐 VALIDACIÓN DE SESIÓN PARA TODAS LAS PÁGINAS ADMIN
    // ============================================================
    const validarSesionAdmin = () => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const token = localStorage.getItem("token");
        const loginPage = "../auth/login.html";

        // Sin token o sin user → No autenticado
        if (!token || !user || !user.rol) {
            console.warn("❌ No hay sesión activa.");
            sessionStorage.setItem("redirect_after_login", window.location.href);
            return window.location.href = loginPage;
        }

        // No es admin → lo sacamos al home de tienda
        if (user.rol.toLowerCase() !== "admin") {
            alert("No tienes permisos de administrador.");
            return window.location.href = "../../tienda/index.html";
        }

        console.log(`✔ Administrador validado: ${user.nombre || user.nombre_usuario}`);

        // Mostrar nombre en el header si existe el elemento
        const usernameElement = document.getElementById("admin-username");
        if (usernameElement) {
            usernameElement.textContent = user.nombre || user.nombre_usuario || "Administrador";
        }

        // Avatar con iniciales
        const avatar = document.getElementById("user-avatar");
        if (avatar) {
            const nombre = user.nombre || user.nombre_usuario || "Admin";
            const iniciales = nombre
                .split(" ")
                .map(p => p.charAt(0).toUpperCase())
                .join("")
                .slice(0, 2);
            avatar.textContent = iniciales;
        }
    };

    validarSesionAdmin();


    // ============================================================
    // 📂 MENÚ LATERAL DESPLEGABLE
    // ============================================================
    const sidebarTitles = document.querySelectorAll(".sidebar-title");

    sidebarTitles.forEach(title => {
        title.addEventListener("click", () => {
            title.classList.toggle("active");

            const items = title.nextElementSibling;
            if (items && items.classList.contains("nav-items")) {
                items.classList.toggle("expanded");
            }
        });
    });


    // ============================================================
    // 🚪 BOTÓN DE CERRAR SESIÓN
    // ============================================================
    const logoutBtn = document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            logoutBtn.style.transform = "scale(0.9)";
            logoutBtn.style.opacity = "0.6";
            logoutBtn.style.transition = "all 0.2s ease";

            setTimeout(() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                sessionStorage.clear();

                window.location.href = "../auth/login.html";
            }, 180);
        });
    }

});
