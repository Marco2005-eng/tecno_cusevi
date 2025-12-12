/**************************************************************
 * REGISTER ADMIN — auto-login + redirección al perfil
 **************************************************************/

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("register-form");

    let errorBox = document.getElementById("register-error");
    let successBox = document.getElementById("register-success");

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
            const data = await adminApiPost("/auth/register", {
                nombre_usuario: nombreUsuario,
                nombre: nombreUsuario,
                email,
                password,
                rol: "cliente"
            });

            if (!data.success) {
                mostrarError(data.message || "No se pudo registrar la cuenta.");
                return;
            }

            // Guardar sesión
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.usuario)); // ← CORRECTO

            mostrarSuccess("Cuenta creada. Redirigiendo para completar tus datos...");

            setTimeout(() => {
                window.location.href = "../tienda/perfil.html";
            }, 1500);

        } catch (error) {
            console.error("Error registrando usuario:", error);
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
