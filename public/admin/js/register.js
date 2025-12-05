/**************************************************************
 * REGISTER ADMIN — usando adminApiPost() (NGROK READY)
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("register-form");

    let errorBox = document.getElementById("register-error");
    let successBox = document.getElementById("register-success");

    // Crear cajas si no existen
    if (!errorBox) {
        errorBox = document.createElement("div");
        errorBox.id = "register-error";
        errorBox.className = "error-message";
        form.prepend(errorBox);
    }

    if (!successBox) {
        successBox = document.createElement("div");
        successBox.id = "register-success";
        successBox.className = "success-message";
        form.prepend(successBox);
    }

    errorBox.style.display = "none";
    successBox.style.display = "none";

    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombreUsuario = document.getElementById("username").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();

        if (!nombreUsuario || !email || !password) {
            mostrarError("Todos los campos son obligatorios.");
            return;
        }

        try {
            // 🔥 Ahora usando adminApiPost()
            const data = await adminApiPost("/auth/register", {
                nombre_usuario: nombreUsuario,
                nombre: nombreUsuario,
                email,
                password,
                rol: "cliente" // por defecto
            });

            if (!data.success) {
                mostrarError(data.message || "No se pudo registrar la cuenta.");
                return;
            }

            mostrarSuccess("Cuenta creada exitosamente. Redirigiendo...");

            // Redirige a login
            setTimeout(() => window.location.href = "login.html", 1500);

        } catch (error) {
            console.error("❌ Error registrando usuario:", error);
            mostrarError("Ocurrió un error al conectar con el servidor.");
        }
    });

    function mostrarError(msg) {
        errorBox.innerText = msg;
        errorBox.style.display = "block";
        successBox.style.display = "none";
    }

    function mostrarSuccess(msg) {
        successBox.innerText = msg;
        successBox.style.display = "block";
        errorBox.style.display = "none";
    }
});
