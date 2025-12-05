/**************************************************************
 * LOGIN ADMIN — NGROK READY + API CENTRALIZADA
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const errorBox = document.getElementById("error-message");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!email || !password) {
            return mostrarError("Todos los campos son obligatorios.");
        }

        try {
            // 🔥 LOGIN usando API ADMIN
            const data = await adminApiPost("/auth/login", { email, password });

            console.log("🔐 RESPUESTA LOGIN ADMIN:", data);

            if (!data.success) {
                return mostrarError(data.message || "Credenciales incorrectas");
            }

            // Guardar sesión del admin
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.usuario));

            // Redirección si venía desde otra página
            const redirect = sessionStorage.getItem("redirect_after_login");
            if (redirect) {
                sessionStorage.removeItem("redirect_after_login");
                return (window.location.href = redirect);
            }

            // Redirecciones según rol
            if (data.usuario.rol === "admin") {
                window.location.href = "../admin/dashboard.html";
            } else {
                window.location.href = "../../tienda/index.html";
            }

        } catch (error) {
            console.error("❌ Error al intentar conectar:", error);
            mostrarError("No se pudo conectar con el servidor.");
        }
    });

    function mostrarError(msg) {
        errorBox.style.display = "block";
        errorBox.innerText = msg;

        // Animación sutil para experiencia UX
        errorBox.classList.add("shake");
        setTimeout(() => errorBox.classList.remove("shake"), 400);
    }
});
