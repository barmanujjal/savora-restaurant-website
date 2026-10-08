/* SAVORA interactions — no framework required. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = amount => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(amount);

  // Footer year and minimum booking date.
  $("#year").textContent = new Date().getFullYear();
  const bookingDate = $("#bookingDate");
  const localToday = new Date();
  bookingDate.min = `${localToday.getFullYear()}-${String(localToday.getMonth()+1).padStart(2,"0")}-${String(localToday.getDate()).padStart(2,"0")}`;

  // Mobile navigation.
  const menuToggle = $("#menuToggle");
  const mainNav = $("#mainNav");
  menuToggle.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  });
  $$("#mainNav a").forEach(link => link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  }));

  // Menu category filters.
  $$(".filter").forEach(button => button.addEventListener("click", () => {
    $$(".filter").forEach(item => item.classList.toggle("active", item === button));
    const category = button.dataset.filter;
    $$(".dish-card").forEach(card => {
      card.classList.toggle("is-hidden", category !== "all" && card.dataset.category !== category);
    });
  }));

  // Cart state lives in memory for this demo; no account or payment is connected.
  const cart = new Map();
  const cartDrawer = $("#cartDrawer");
  const cartOverlay = $("#cartOverlay");
  const toast = $("#toast");
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }
  function openCart() {
    cartOverlay.hidden = false;
    requestAnimationFrame(() => cartOverlay.classList.add("visible"));
    cartDrawer.classList.add("open");
    cartDrawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");
    $("#closeCart").focus();
  }
  function closeCart() {
    cartDrawer.classList.remove("open");
    cartDrawer.setAttribute("aria-hidden", "true");
    cartOverlay.hidden = true;
    document.body.classList.remove("cart-open");
    $("#openCart").focus();
  }
  $("#openCart").addEventListener("click", openCart);
  $("#closeCart").addEventListener("click", closeCart);
  cartOverlay.addEventListener("click", closeCart);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && cartDrawer.classList.contains("open")) closeCart();
  });

  function updateCart() {
    const count = [...cart.values()].reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = [...cart.values()].reduce((sum, item) => sum + item.price * item.quantity, 0);
    $("#cartCount").textContent = count;
    $("#drawerCount").textContent = `(${count})`;
    $("#cartSubtotal").textContent = money(subtotal);
    const cartItems = $("#cartItems");
    if (!cart.size) {
      cartItems.innerHTML = '<div class="empty-cart"><span>✳</span><h3>Your table is waiting.</h3><p>Add something delicious to get started.</p></div>';
      return;
    }
    cartItems.innerHTML = [...cart.values()].map(item => `
      <article class="cart-item" data-cart-id="${item.id}">
        <div><h4>${escapeHTML(item.name)}</h4><p>${money(item.price)} each</p>
          <div class="quantity-control">
            <button type="button" data-action="decrease" aria-label="Decrease ${escapeHTML(item.name)} quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-action="increase" aria-label="Increase ${escapeHTML(item.name)} quantity">+</button>
            <button type="button" class="remove-item" data-action="remove" aria-label="Remove ${escapeHTML(item.name)}">Remove</button>
          </div>
        </div><strong class="cart-item-price">${money(item.price * item.quantity)}</strong>
      </article>`).join("");
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }
  function addDish(card) {
    const id = card.dataset.id;
    if (cart.has(id)) cart.get(id).quantity += 1;
    else cart.set(id, {
      id, name: card.dataset.name, price: Number(card.dataset.price), quantity: 1
    });
    updateCart();
    showToast(`${card.dataset.name} added to your basket`);
  }
  $$(".add-dish").forEach(button => button.addEventListener("click", () => addDish(button.closest(".dish-card"))));
  $("#cartItems").addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const itemElement = actionButton.closest("[data-cart-id]");
    const item = cart.get(itemElement.dataset.cartId);
    if (!item) return;
    if (actionButton.dataset.action === "increase") item.quantity += 1;
    if (actionButton.dataset.action === "decrease") item.quantity -= 1;
    if (actionButton.dataset.action === "remove" || item.quantity <= 0) cart.delete(item.id);
    updateCart();
  });
  $("#checkoutButton").addEventListener("click", () => {
    const feedback = $("#cartFeedback");
    if (!cart.size) {
      feedback.textContent = "Your basket is empty. Add a dish before continuing.";
      return;
    }
    feedback.textContent = "Demo only: connect a secure backend and payment/order provider before accepting real orders.";
  });

  // Reservation demo: validates input, then displays a local confirmation.
  $("#reservationForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get("name")).trim();
    const date = String(data.get("date"));
    const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    });
    $("#reservationMessage").textContent =
      `Thanks, ${name}! Your demo request for ${data.get("guests")} guest(s) on ${formattedDate} at ${data.get("time")} is ready. This has not been sent to the restaurant.`;
    form.reset();
    bookingDate.min = `${localToday.getFullYear()}-${String(localToday.getMonth()+1).padStart(2,"0")}-${String(localToday.getDate()).padStart(2,"0")}`;
  });

  // Review slider.
  const reviewTrack = $("#reviewTrack");
  let reviewIndex = 0;
  function moveReviews(direction) {
    const cards = $$(".review-card", reviewTrack);
    const visible = window.matchMedia("(max-width: 760px)").matches ? 1 : (window.matchMedia("(max-width: 1000px)").matches ? 2 : 3);
    const maxIndex = Math.max(0, cards.length - visible);
    reviewIndex = Math.max(0, Math.min(maxIndex, reviewIndex + direction));
    const cardWidth = cards[0]?.getBoundingClientRect().width || 0;
    const gap = parseFloat(getComputedStyle(reviewTrack).columnGap) || 0;
    reviewTrack.style.transform = `translateX(-${reviewIndex * (cardWidth + gap)}px)`;
  }
  $("#prevReview").addEventListener("click", () => moveReviews(-1));
  $("#nextReview").addEventListener("click", () => moveReviews(1));
  window.addEventListener("resize", () => { reviewIndex = 0; moveReviews(0); });

  // Subtle reveal-on-scroll motion, with reduced-motion support.
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    $$(".intro-main, .stats-row, .section-heading, .dish-card, .quote-content, .review-card, .reservation-copy, .reservation-form").forEach(el => {
      el.classList.add("reveal");
      revealObserver.observe(el);
    });
  }
  updateCart();
})();
