// cart.js – quantity control, deletion, checkout + QR for PayMaya / GCash / PayPal, COD fallback

/* --------------------
   CART HELPERS
-------------------- */
function getCart() {
  return JSON.parse(localStorage.getItem("glowCart") || "[]");
}

function saveCart(cart) {
  localStorage.setItem("glowCart", JSON.stringify(cart));
}

function updateCartCount() {
  const count = getCart().reduce((sum, i) => sum + i.qty, 0);
  document.getElementById("cart-count").textContent = count;
}

/* --------------------
   CART CRUD
-------------------- */
function addToCart(name, price) {
  let cart = getCart();
  const existing = cart.find((i) => i.name === name && i.price === price);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ name, price, qty: 1 });
  }
  saveCart(cart);
  updateCartCount();
  renderCart();
}

function removeFromCart(idx) {
  const cart = getCart();
  cart.splice(idx, 1);
  saveCart(cart);
  updateCartCount();
  renderCart();
}

function changeQty(idx, delta) {
  const cart = getCart();
  if (!cart[idx]) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(cart);
  updateCartCount();
  renderCart();
}

function clearCart() {
  saveCart([]);
  updateCartCount();
}

/* --------------------
   CART RENDER
-------------------- */
function renderCart() {
  const cart = getCart();
  const itemsEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  itemsEl.innerHTML = "";
  let total = 0;

  cart.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "flex justify-between items-center border-b pb-2";
    row.innerHTML = `
      <div>
        <p class="font-medium">${item.name}</p>
        <p class="text-sm text-gray-600">₱${item.price.toFixed(2)} × ${item.qty}</p>
        <div class="flex items-center space-x-2 mt-1">
          <button class="bg-gray-200 px-2 py-1 text-xs rounded" onclick="changeQty(${idx}, -1)">−</button>
          <span class="px-2">${item.qty}</span>
          <button class="bg-gray-200 px-2 py-1 text-xs rounded" onclick="changeQty(${idx}, 1)">+</button>
        </div>
      </div>
      <div class="flex flex-col items-end">
        <span class="font-semibold">₱${(item.price * item.qty).toFixed(2)}</span>
        <button class="text-xs text-red-500 hover:underline mt-1" onclick="removeFromCart(${idx})">Remove</button>
      </div>`;
    itemsEl.appendChild(row);
    total += item.price * item.qty;
  });

  totalEl.textContent = `₱${total.toFixed(2)}`;
}

/* --------------------
   PAYMENT / CHECKOUT
-------------------- */
let paymentModal, paymentSelect, payNowBtn, qrBox;

function openPaymentModal() {
  const cartEmpty = getCart().length === 0;
  if (cartEmpty) {
    alert("Your bag is empty – add items first.");
    return;
  }
  qrBox.innerHTML = ""; // clear previous QR
  paymentModal.classList.remove("hidden");
  paymentModal.classList.add("flex");
}

function closePaymentModal() {
  paymentModal.classList.add("hidden");
  paymentModal.classList.remove("flex");
}

function handlePayment() {
  const method = paymentSelect.value;
  const total = getCart().reduce((s, i) => s + i.price * i.qty, 0);
  if (!total) return;

  if (method === "COD") {
    alert(`Order placed! Please prepare ₱${total.toFixed(2)} for Cash on Delivery.`);
    clearCart();
    renderCart();
    closePaymentModal();
    return;
  }

  // generate ref + payload
  const ref = "GH-" + Date.now().toString(36).toUpperCase();
  const payload = `GlowHaven|${method}|Ref:${ref}|Amount:${total.toFixed(2)}`;
  generateQR(payload);
}

function generateQR(text) {
  qrBox.innerHTML = ""; // reset container
  new QRCode(qrBox, {
    text,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });
}

/* --------------------
   INITIALISATION
-------------------- */
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();

  // cart modal
  const cartModal = document.getElementById("cart-modal");
  document.getElementById("open-cart").addEventListener("click", () => {
    renderCart();
    cartModal.classList.remove("hidden");
    cartModal.classList.add("flex");
  });
  document.getElementById("close-cart").addEventListener("click", () => {
    cartModal.classList.add("hidden");
    cartModal.classList.remove("flex");
  });

  // payment modal refs
  paymentModal = document.getElementById("payment-modal");
  paymentSelect = document.getElementById("payment-method");
  payNowBtn = document.getElementById("pay-now-btn");
  qrBox = document.getElementById("qr-box");

  document.getElementById("checkout-btn").addEventListener("click", openPaymentModal);
  document.getElementById("close-payment").addEventListener("click", closePaymentModal);
  payNowBtn.addEventListener("click", handlePayment);

  // add‑to‑cart buttons (+ bounce + fly animation)
  document.querySelectorAll(".add-to-cart").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.name;
      const price = parseFloat(btn.dataset.price);
      addToCart(name, price);

      // --- bounce btn
      btn.classList.add("animate-bounce");
      setTimeout(() => btn.classList.remove("animate-bounce"), 400);

      // --- cart icon pulse
      const cartIcon = document.getElementById("open-cart");
      cartIcon.classList.add("scale-110", "text-pink-600");
      setTimeout(() => cartIcon.classList.remove("scale-110", "text-pink-600"), 300);

      // --- fly to cart
      const card = btn.closest(".bg-white");
      const img = card.querySelector("img");
      const clone = img.cloneNode(true);
      const imgRect = img.getBoundingClientRect();
      const cartRect = cartIcon.getBoundingClientRect();

      Object.assign(clone.style, {
        position: "fixed",
        left: `${imgRect.left}px`,
        top: `${imgRect.top}px`,
        width: `${imgRect.width}px`,
        height: `${imgRect.height}px`,
        transition: "all 0.8s ease",
        zIndex: 9999,
      });
      document.body.appendChild(clone);
      requestAnimationFrame(() => {
        Object.assign(clone.style, {
          left: `${cartRect.left}px`,
          top: `${cartRect.top}px`,
          width: "20px",
          height: "20px",
          opacity: 0.5,
        });
      });
      setTimeout(() => clone.remove(), 800);
    });
  });
});

