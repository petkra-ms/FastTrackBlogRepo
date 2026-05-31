/**
 * cart.js
 * Shopping cart logic backed by localStorage.
 */

const CART_KEY = 'wsDemo_cart';

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function addToCart(product, qty) {
    qty = parseInt(qty, 10) || 1;
    const cart = getCart();
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, qty });
    }
    saveCart(cart);
    updateCartBadge();
    renderCart();
}

function removeFromCart(productId) {
    const cart = getCart().filter(i => i.id !== productId);
    saveCart(cart);
    updateCartBadge();
    renderCart();
}

function updateQty(productId, qty) {
    qty = parseInt(qty, 10);
    if (isNaN(qty) || qty < 1) {
        removeFromCart(productId);
        return;
    }
    const cart = getCart();
    const item = cart.find(i => i.id === productId);
    if (item) {
        item.qty = qty;
        saveCart(cart);
        updateCartBadge();
        renderCart();
    }
}

function clearCart() {
    localStorage.removeItem(CART_KEY);
    updateCartBadge();
    renderCart();
}

function getCartTotal() {
    return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

function getCartCount() {
    return getCart().reduce((sum, i) => sum + i.qty, 0);
}

/** Update the cart item-count badge in the header. */
function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = getCartCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

/** Re-render the cart sidebar. */
function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl   = document.getElementById('cart-total');
    if (!container) return;

    const cart = getCart();

    if (cart.length === 0) {
        container.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
        if (totalEl) totalEl.textContent = '£0.00';
        return;
    }

    container.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-controls">
                <input
                    type="number"
                    min="1"
                    value="${item.qty}"
                    class="cart-qty-input"
                    aria-label="Quantity for ${item.name}"
                    onchange="updateQty('${item.id}', this.value)"
                />
                <span class="cart-item-price">£${(item.price * item.qty).toFixed(2)}</span>
                <button class="btn-remove" onclick="removeFromCart('${item.id}')" aria-label="Remove ${item.name}">✕</button>
            </div>
        </div>
    `).join('');

    if (totalEl) totalEl.textContent = `£${getCartTotal().toFixed(2)}`;
}
