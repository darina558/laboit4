/* Flower keen — Лабораторна робота №4
   Меню, модальні вікна, акаунт (localStorage), кошик, карусель, анімації */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '$' + n.toFixed(2);

  /* ---------- Сховище (localStorage) ---------- */
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватний режим */ } }
  };
  const K = { users: 'fk_users', session: 'fk_session', orders: 'fk_orders', cart: 'fk_cart' };

  // Демо-хеш пароля. Справжні паролі завжди хешує та зберігає сервер!
  const hash = s => {
    let h = 5381;
    for (const ch of s) h = ((h << 5) + h + ch.charCodeAt(0)) | 0;
    return String(h >>> 0);
  };

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ---------- Модальні вікна ---------- */
  function openModal(m) {
    m.classList.add('is-open');
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const f = $('input:not([type=hidden])', m);
    if (f && !m.classList.contains('drawer')) setTimeout(() => f.focus(), 350);
  }
  function closeModal(m) {
    m.classList.remove('is-open');
    m.setAttribute('aria-hidden', 'true');
    if (!$('.modal.is-open')) document.body.classList.remove('modal-open');
  }
  document.addEventListener('click', e => {
    if (e.target.closest('[data-close]') || e.target.classList.contains('modal')) closeModal(e.target.closest('.modal'));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.modal.is-open').forEach(closeModal);
  });

  /* ---------- Адаптивне меню ---------- */
  const burger = $('#burger'), navWrap = $('#navWrap');
  const mobileMenu = () => matchMedia('(max-width: 1200px)').matches;
  function setMenu(open) {
    navWrap.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open);
  }
  burger.addEventListener('click', () => setMenu(!navWrap.classList.contains('open')));
  $('.dropdown > a').addEventListener('click', e => {
    if (!mobileMenu()) return;
    e.preventDefault();
    e.currentTarget.parentElement.classList.toggle('open');
  });
  $$('nav a').forEach(a => a.addEventListener('click', () => {
    if (!a.parentElement.classList.contains('dropdown')) setMenu(false);
  }));
  addEventListener('resize', () => { if (!mobileMenu()) setMenu(false); });

  /* ---------- Кнопка «вгору» ---------- */
  const toTop = $('#back-to-top');
  const onScroll = () => toTop.classList.toggle('show', scrollY > 400);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Акаунт ---------- */
  const users = () => store.get(K.users, []);
  const currentUser = () => users().find(u => u.email === store.get(K.session, null)) || null;
  let afterLogin = null; // що зробити після входу (напр. оформити замовлення)

  const authModal = $('#authModal');
  function notice(text, type = 'info') {
    const n = $('#authNotice');
    n.textContent = text;
    n.className = 'alert show ' + type;
  }
  function clearNotice() { $('#authNotice').className = 'alert'; }
  function showTab(name) {
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    $$('.auth-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
    clearNotice();
  }
  $$('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

  function renderAccount() {
    const u = currentUser();
    $('#signinLabel').textContent = u ? u.name.split(' ')[0] : 'Sign In';
    $('#guestView').hidden = !!u;
    $('#profileView').hidden = !u;
    $('#authTitle').textContent = u ? 'My Account' : 'Customer Account';
    if (!u) return;
    $('#pName').textContent = u.name;
    $('#pEmail').textContent = u.email;
    const orders = store.get(K.orders, {})[u.email] || [];
    $('#ordersList').innerHTML = orders.length
      ? orders.slice().reverse().map(o => `
          <div class="order-row">
            <strong>Order #${o.id}</strong> — ${money(o.total)}
            <p>${esc(o.date)} · ${o.items.map(i => esc(i.name) + ' × ' + i.qty).join(', ')}</p>
            <p>📍 ${esc(o.address)}</p>
          </div>`).join('')
      : '<p>You have no orders yet. Pick a bouquet from our catalog! 🌸</p>';
  }

  $('#signinBtn').addEventListener('click', () => { renderAccount(); openModal(authModal); });

  // Реєстрація
  const regPass = $('#reg-pass'), regRepeat = $('#reg-pass-repeat');
  const checkMatch = () => regRepeat.setCustomValidity(regRepeat.value === regPass.value ? '' : 'Passwords do not match');
  regPass.addEventListener('input', checkMatch);
  regRepeat.addEventListener('input', checkMatch);

  $('#registerForm').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#reg-name').value.trim();
    const email = $('#reg-email').value.trim().toLowerCase();
    if (users().some(u => u.email === email)) {
      notice('An account with this email already exists. Please sign in.', 'error');
      return;
    }
    const list = users();
    list.push({ name, email, pass: hash(regPass.value), created: new Date().toISOString() });
    store.set(K.users, list);
    store.set(K.session, email);
    e.target.reset();
    renderAccount();
    toast(`Welcome, ${name.split(' ')[0]}! Your account has been created 🌸`);
    if (afterLogin) { const fn = afterLogin; afterLogin = null; closeModal(authModal); fn(); }
  });

  // Вхід
  $('#loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#login-email').value.trim().toLowerCase();
    const u = users().find(x => x.email === email);
    if (!u) { notice('No account found with this email. Create one first.', 'error'); return; }
    if (u.pass !== hash($('#login-pass').value)) { notice('Wrong password. Please try again.', 'error'); return; }
    store.set(K.session, email);
    e.target.reset();
    renderAccount();
    closeModal(authModal);
    toast(`Welcome back, ${u.name.split(' ')[0]}! 🌷`);
    if (afterLogin) { const fn = afterLogin; afterLogin = null; fn(); }
  });

  $('#logoutBtn').addEventListener('click', () => {
    store.set(K.session, null);
    renderAccount();
    showTab('login');
    closeModal(authModal);
    toast('You have been signed out.');
  });

  /* ---------- Кошик ---------- */
  let cart = store.get(K.cart, []);
  const cartModal = $('#cartModal');
  const saveCart = () => store.set(K.cart, cart);

  function renderCart() {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
    const badge = $('#cartCount');
    badge.textContent = count;
    badge.hidden = count === 0;
    $('#cartItems').innerHTML = cart.length ? cart.map(i => `
      <div class="cart-item" data-id="${esc(i.id)}">
        <img src="${esc(i.img)}" alt="${esc(i.name)}">
        <div>
          <h4>${esc(i.name)}</h4>
          <p class="unit">${money(i.price)} each</p>
          <div class="qty">
            <button type="button" data-act="dec" aria-label="Decrease">−</button>
            <span>${i.qty}</span>
            <button type="button" data-act="inc" aria-label="Increase">+</button>
          </div>
        </div>
        <div>
          <strong>${money(i.price * i.qty)}</strong><br>
          <button type="button" class="cart-remove" data-act="del" aria-label="Remove">🗑</button>
        </div>
      </div>`).join('') : '<p class="cart-empty">Your cart is empty 🌸<br>Add a bouquet from the catalog.</p>';
    $('#checkoutForm').hidden = cart.length === 0;
    $('#cartTotal').textContent = money(total);
  }

  function addToCart(item) {
    const found = cart.find(i => i.id === item.id);
    if (found) found.qty++; else cart.push({ ...item, qty: 1 });
    saveCart(); renderCart();
    const b = $('#cartCount');
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  }

  $('#cartItems').addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('.cart-item').dataset.id;
    const item = cart.find(i => i.id === id);
    if (btn.dataset.act === 'inc') item.qty++;
    if (btn.dataset.act === 'dec') item.qty--;
    if (btn.dataset.act === 'del' || item.qty <= 0) cart = cart.filter(i => i.id !== id);
    saveCart(); renderCart();
  });
  $('#clearCart').addEventListener('click', () => { cart = []; saveCart(); renderCart(); });
  $('#cartBtn').addEventListener('click', () => openModal(cartModal));

  // Кнопки «Order now» у картках → «Add to cart»
  $$('.card').forEach(card => {
    const link = $('.order-link', card);
    link.setAttribute('role', 'button');
    link.href = '#';
    link.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to cart';
    link.addEventListener('click', e => {
      e.preventDefault();
      const name = $('h4', card).textContent.trim();
      addToCart({
        id: name.toLowerCase().replace(/\W+/g, '-'),
        name,
        price: parseFloat($('.price', card).textContent.replace(/[^0-9.]/g, '')),
        img: $('img', card).getAttribute('src')
      });
      link.classList.add('added');
      link.innerHTML = '<i class="fa-solid fa-check"></i> Added';
      toast(`${name} added to cart`);
      setTimeout(() => {
        link.classList.remove('added');
        link.innerHTML = '<i class="fa-solid fa-cart-plus"></i> Add to cart';
      }, 1500);
    });
  });

  // Оформлення замовлення (потрібен вхід)
  function placeOrder() {
    const u = currentUser();
    if (!u || !cart.length) return;
    const order = {
      id: Date.now().toString().slice(-6),
      date: new Date().toLocaleString('uk-UA'),
      items: cart.map(i => ({ name: i.name, qty: i.qty })),
      total: cart.reduce((s, i) => s + i.qty * i.price, 0),
      address: $('#cart-address').value.trim()
    };
    const all = store.get(K.orders, {});
    (all[u.email] = all[u.email] || []).push(order);
    store.set(K.orders, all);
    cart = []; saveCart(); renderCart(); renderAccount();
    $('#checkoutForm').reset();
    closeModal(cartModal);
    toast(`Thank you! Order #${order.id} placed 🎉`);
  }
  $('#checkoutForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!currentUser()) {
      closeModal(cartModal);
      afterLogin = () => { openModal(cartModal); toast('Signed in — now confirm your order'); };
      renderAccount(); showTab('login');
      notice('Please sign in or create an account to place your order.', 'info');
      openModal(authModal);
      return;
    }
    placeOrder();
  });

  /* ---------- Пошук по каталогу ---------- */
  const searchForm = $('.search-box form'), searchInput = $('input[type=search]', searchForm);
  function filterCards() {
    const q = searchInput.value.trim().toLowerCase();
    let shown = 0;
    $$('.card').forEach(c => {
      const ok = !q || c.textContent.toLowerCase().includes(q);
      c.hidden = !ok;
      if (ok) shown++;
    });
    $$('.category').forEach(cat => { cat.hidden = !$$('.card', cat).some(c => !c.hidden); });
    $('#noResults').hidden = shown > 0;
  }
  searchInput.addEventListener('input', filterCards);
  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    filterCards();
    setMenu(false);
    $('#catalog').scrollIntoView({ behavior: 'smooth' });
  });

  /* ---------- Форми анкети та зворотного зв'язку ---------- */
  $$('#surveyForm, #contactForm').forEach(f => f.addEventListener('submit', e => {
    e.preventDefault();
    const key = 'fk_' + f.id;
    const list = store.get(key, []);
    list.push({ ...Object.fromEntries(new FormData(f)), date: new Date().toISOString() });
    store.set(key, list);
    f.reset();
    toast(f.id === 'surveyForm' ? 'Thank you! Our florist will contact you 🌷' : 'Message sent! We will reply soon ✉️');
  }));

  /* ---------- Карусель відгуків ---------- */
  (() => {
    const track = $('.carousel-track'), slides = $$('.review'), dotsBox = $('.carousel-dots');
    let i = 0, timer, startX = 0;
    slides.forEach((_, n) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Review ' + (n + 1));
      d.addEventListener('click', () => { go(n); restart(); });
      dotsBox.appendChild(d);
    });
    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      $$('button', dotsBox).forEach((d, k) => d.classList.toggle('active', k === i));
    }
    const restart = () => { clearInterval(timer); timer = setInterval(() => go(i + 1), 6000); };
    $('.carousel-btn.prev').addEventListener('click', () => { go(i - 1); restart(); });
    $('.carousel-btn.next').addEventListener('click', () => { go(i + 1); restart(); });
    const box = $('.carousel');
    box.addEventListener('mouseenter', () => clearInterval(timer));
    box.addEventListener('mouseleave', restart);
    box.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) { go(i + (dx < 0 ? 1 : -1)); restart(); }
    });
    go(0); restart();
  })();

  /* ---------- Поява елементів при прокрутці ---------- */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, delay = (+el.dataset.d || 0);
      io.unobserve(el);
      el.style.transitionDelay = delay + 'ms';
      el.classList.add('in');
      // після анімації прибираємо клас, щоб не заважав hover-ефектам
      setTimeout(() => { el.classList.remove('reveal', 'in'); el.style.transitionDelay = ''; }, 900 + delay);
    }), { threshold: 0.12 });
    $$('.card, .news-item, .form-container, main h2, .section-subtitle, .category-title, .carousel').forEach(el => {
      const sibs = el.parentElement ? [...el.parentElement.children] : [];
      el.dataset.d = (sibs.indexOf(el) % 5) * 80;
      el.classList.add('reveal');
      io.observe(el);
    });
  }

  renderAccount();
  renderCart();
})();
