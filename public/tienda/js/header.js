document.addEventListener("DOMContentLoaded", () => {

    // Elemento donde se muestra la cantidad del carrito
    const badge = document.getElementById("cart-count");

    function getCarrito() {
        try {
            return JSON.parse(localStorage.getItem("carrito_tienda")) || [];
        } catch {
            return [];
        }
    }

    function actualizarBadge() {
        if (!badge) return;
        const cart = getCarrito();
        const total = cart.reduce((s, p) => s + p.cantidad, 0);
        badge.textContent = total > 0 ? total : "";
    }

    actualizarBadge();
});
