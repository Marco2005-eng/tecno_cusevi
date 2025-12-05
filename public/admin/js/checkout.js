document.addEventListener('DOMContentLoaded', () => {

    // --- DATOS DE PRUEBA ---
    // En una app real, esto vendría del carrito del usuario (localStorage, BD, etc.)
    const cartItems = [
        { id_catalogo: 1, nombre: 'Laptop Gamer Pro', cantidad: 1, precio: 3500.00 },
        { id_catalogo: 5, nombre: 'Mouse Óptico RGB', cantidad: 2, precio: 75.50 }
    ];

    // En una app real, esto vendría de la sesión del usuario logueado
    const loggedInUserId = 1; 

    // --- ELEMENTOS DEL DOM ---
    const cartSummaryUl = document.getElementById('cart-summary');
    const cartTotalSpan = document.getElementById('cart-total');
    const payButton = document.getElementById('pay-button');
    const checkoutForm = document.getElementById('checkout-form');
    const direccionTextarea = document.getElementById('direccion');

    // --- FUNCIONES ---

    // 1. Renderizar el resumen del carrito en la página
    const renderCartSummary = () => {
        let total = 0;
        cartSummaryUl.innerHTML = ''; // Limpiar resumen anterior

        cartItems.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${item.nombre} (x${item.cantidad})</span>
                <span>S/ ${(item.precio * item.cantidad).toFixed(2)}</span>
            `;
            cartSummaryUl.appendChild(li);
            total += item.precio * item.cantidad;
        });

        cartTotalSpan.textContent = `S/ ${total.toFixed(2)}`;
    };

    // 2. Manejar el proceso de pago
    const handlePayment = async () => {
        const direccion = direccionTextarea.value.trim();
        if (!direccion) {
            alert('Por favor, ingresa una dirección de envío.');
            return;
        }

        // Mostrar estado de carga
        payButton.disabled = true;
        payButton.innerHTML = 'Procesando...';

        try {
            // --- PASO 1: Crear el pedido en nuestro backend ---
            const orderData = {
                id_cliente: loggedInUserId,
                items: cartItems.map(item => ({
                    id_catalogo: item.id_catalogo,
                    cantidad: item.cantidad
                })),
                direccion_envio: direccion
            };

            const orderResponse = await fetch('/api/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const orderResult = await orderResponse.json();

            if (!orderResult.success) {
                throw new Error(orderResult.message || 'No se pudo crear el pedido.');
            }

            const newPedidoId = orderResult.pedidoId;
            console.log(`✅ Pedido ${newPedidoId} creado con éxito.`);

            // --- PASO 2: Crear la preferencia de pago en Mercado Pago ---
            const mpResponse = await fetch('/api/mercadopago/create-preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: newPedidoId })
            });

            const mpResult = await mpResponse.json();

            if (!mpResult.success) {
                throw new Error(mpResult.message || 'No se pudo iniciar el pago con Mercado Pago.');
            }

            // --- PASO 3: Redirigir al usuario a la página de pago de Mercado Pago ---
            console.log('🚀 Redirigiendo a Mercado Pago...');
            window.location.href = mpResult.initPoint;

        } catch (error) {
            console.error('❌ Error en el proceso de pago:', error);
            alert(`Ocurrió un error: ${error.message}`);
            // Restaurar el botón en caso de error
            payButton.disabled = false;
            payButton.innerHTML = `
                <img src="https://imgmp.mlstatic.com/org-img/MP3/API/logos/mp-mono-btn-large.png" alt="Pagar con Mercado Pago" style="width: auto; height: auto; vertical-align: middle;">
                Pagar con Mercado Pago
            `;
        }
    };

    // --- EVENT LISTENERS ---
    payButton.addEventListener('click', handlePayment);

    // --- INICIALIZACIÓN ---
    renderCartSummary();
});