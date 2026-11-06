/* ============================================================
   КАБИНЕТ 72/1306 — интерактив
   ============================================================ */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const smooth = reduceMotion ? 'auto' : 'smooth';

  /* ---------- год ---------- */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- шапка, прогресс, наверх ---------- */
  const header = $('#header');
  const progress = $('#progress-bar');
  const toTop = $('#to-top');
  let ticking = false;

  function onScroll() {
    const y = window.scrollY || document.documentElement.scrollTop;
    if (header) header.classList.toggle('is-scrolled', y > 12);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
    }
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: smooth });
    });
  }

  /* ---------- мобильное меню ---------- */
  const burger = $('#burger');
  const mobileMenu = $('#mobile-menu');

  function setMenu(open, restoreFocus = false) {
    if (!burger || !mobileMenu) return;
    burger.classList.toggle('is-active', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      const first = $('a[href]', mobileMenu);
      if (first) first.focus({ preventScroll: true });
    } else if (restoreFocus) {
      burger.focus({ preventScroll: true });
    }
  }

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('is-open')));
    $$('a', mobileMenu).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) setMenu(false, true);
    });
    mobileMenu.addEventListener('keydown', e => {
      if (e.key !== 'Tab' || !mobileMenu.classList.contains('is-open')) return;
      const focusables = $$('a[href], button', mobileMenu).filter(el => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------- активный пункт меню ---------- */
  const navLinks = $$('.main-nav a');
  const sectionIds = navLinks
    .map(a => (a.getAttribute('href') || '').replace('#', ''))
    .filter(id => id && document.getElementById(id));
  if (navLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        navLinks.forEach(a => a.classList.remove('is-active'));
        if (entry.target.id === 'top') return;
        const link = byId.get(entry.target.id);
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) navObserver.observe(el);
    });
    const top = document.getElementById('top');
    if (top) navObserver.observe(top);
  }

  /* ---------- появление блоков ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(el => revealObserver.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- счётчики ---------- */
  const counters = $$('[data-count]');
  if (counters.length) {
    const runCounter = el => {
      const target = parseFloat(el.dataset.count) || 0;
      const suffix = el.dataset.suffix || '';
      if (reduceMotion) {
        el.textContent = String(target) + suffix;
        return;
      }
      const duration = 1500;
      const start = performance.now();
      function frame(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString('ru-RU') + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    };

    if ('IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      counters.forEach(el => counterObserver.observe(el));
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ---------- искры в hero ---------- */
  const canvas = $('#sparks');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let width = 0, height = 0, raf = null, particles = [];

    const makeParticle = () => {
      const spreadX = Math.max(width * 0.42, 200);
      const x = width - spreadX * Math.random();
      const y = height * (0.52 + Math.random() * 0.46);
      return {
        x, y,
        vx: (Math.random() - 0.5) * 0.22,
        vy: -(0.22 + Math.random() * 0.72),
        r: 0.6 + Math.random() * 1.6,
        life: 0,
        max: 200 + Math.random() * 300,
        seed: Math.random() * Math.PI * 2,
        alpha: 0.18 + Math.random() * 0.55
      };
    };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: width < 720 ? 24 : 44 }, makeParticle);
    }

    function frame() {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        p.life += 1;
        p.x += p.vx + Math.sin((p.life + p.seed) * 0.02) * 0.18;
        p.y += p.vy;
        const t = p.life / p.max;
        if (t >= 1 || p.y < -20) {
          const fresh = makeParticle();
          Object.assign(p, fresh);
          continue;
        }
        const fade = Math.max(0, 1 - t) * p.alpha;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,${Math.round(118 + 80 * (1 - t))},${Math.round(28 + 90 * (1 - t))},${fade})`;
        ctx.arc(p.x, p.y, p.r * (1 - t * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (!raf) frame();
    }
    function stop() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        start();
      }, 200);
    });

    resize();

    const hero = $('.hero');
    if (hero && 'IntersectionObserver' in window) {
      const heroObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => entry.isIntersecting ? start() : stop());
      }, { threshold: 0 });
      heroObserver.observe(hero);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });
  }

  /* ---------- фильтр галереи ---------- */
  const filterButtons = $$('.filter');
  const tiles = $$('.tile');

  if (tiles.length) {
    const counts = { all: tiles.length };
    tiles.forEach(t => {
      counts[t.dataset.cat] = (counts[t.dataset.cat] || 0) + 1;
    });
    filterButtons.forEach(btn => {
      const label = $('span', btn);
      if (label && counts[btn.dataset.filter] != null) label.textContent = counts[btn.dataset.filter];
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.toggle('is-active', b === btn));
        const filter = btn.dataset.filter;
        tiles.forEach(tile => {
          tile.classList.toggle('is-hidden', filter !== 'all' && tile.dataset.cat !== filter);
        });
      });
    });
  }

  /* ---------- лайтбокс ---------- */
  const lightbox = $('#lightbox');
  const lbFigure = $('#lb-figure');
  const lbTitle = $('#lb-title');
  const lbCat = $('#lb-cat');
  const lbDesc = $('#lb-desc');
  const lbSpecs = $('#lb-specs');
  const lbPrev = $('[data-lb-prev]');
  const lbNext = $('[data-lb-next]');
  let visibleTiles = [];
  let currentIndex = 0;
  let lastFocus = null;

  function specRow(label, value) {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    wrap.append(dt, dd);
    return wrap;
  }

  function renderLightbox(tile) {
    if (!tile) return;
    lbFigure.innerHTML = '';
    const art = $('.tile-art svg', tile);
    if (art) lbFigure.appendChild(art.cloneNode(true));

    const cat = $('.tile-cat', tile);
    lbCat.textContent = cat ? cat.textContent : '';
    lbTitle.textContent = tile.dataset.title || '';
    lbDesc.textContent = tile.dataset.desc || '';

    lbSpecs.innerHTML = '';
    if (tile.dataset.when) lbSpecs.appendChild(specRow('Когда', tile.dataset.when));
    if (tile.dataset.what) lbSpecs.appendChild(specRow('Что входит', tile.dataset.what));
    if (tile.dataset.format) lbSpecs.appendChild(specRow('Формат', tile.dataset.format));

    if (lbPrev && lbNext) {
      const many = visibleTiles.length > 1;
      lbPrev.hidden = !many;
      lbNext.hidden = !many;
    }
  }

  function openLightbox(tile) {
    if (!lightbox) return;
    visibleTiles = tiles.filter(t => !t.classList.contains('is-hidden'));
    currentIndex = Math.max(0, visibleTiles.indexOf(tile));
    renderLightbox(visibleTiles[currentIndex]);
    lastFocus = document.activeElement;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    const closeBtn = $('.lb-close', lightbox);
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeLightbox(restoreFocus = true) {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = '';
    if (restoreFocus && lastFocus && typeof lastFocus.focus === 'function') {
      lastFocus.focus({ preventScroll: true });
    }
  }

  function shiftLightbox(dir) {
    if (visibleTiles.length < 2) return;
    currentIndex = (currentIndex + dir + visibleTiles.length) % visibleTiles.length;
    renderLightbox(visibleTiles[currentIndex]);
  }

  tiles.forEach(tile => {
    tile.addEventListener('click', () => openLightbox(tile));
  });

  if (lightbox) {
    $$('[data-close-lightbox]', lightbox).forEach(el => {
      el.addEventListener('click', () => closeLightbox());
    });
    if (lbPrev) lbPrev.addEventListener('click', () => shiftLightbox(-1));
    if (lbNext) lbNext.addEventListener('click', () => shiftLightbox(1));

    const orderLink = $('[data-lb-order]', lightbox);
    if (orderLink) {
      orderLink.addEventListener('click', () => closeLightbox(false));
    }

    document.addEventListener('keydown', e => {
      if (lightbox.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        shiftLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        shiftLightbox(1);
      } else if (e.key === 'Tab') {
        const focusables = $$('button, a[href]', lightbox).filter(el => !el.hidden);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------- FAQ ---------- */
  const faqItems = $$('.faq-item');
  faqItems.forEach(item => {
    const button = $('.faq-q', item);
    if (!button) return;
    button.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      faqItems.forEach(other => {
        other.classList.remove('is-open');
        const b = $('.faq-q', other);
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('is-open');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- предзаполнение заявки ---------- */
  const form = $('#order-form');
  const serviceSelect = $('#service');
  if (form && serviceSelect) {
    $$('[data-service]').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.service;
        for (const option of serviceSelect.options) {
          if (option.value === value || option.textContent.trim() === value) {
            serviceSelect.value = option.value;
            break;
          }
        }
        const target = form.closest('.form-wrap') || form;
        target.scrollIntoView({ behavior: smooth, block: 'center' });
        setTimeout(() => {
          serviceSelect.focus({ preventScroll: true });
        }, reduceMotion ? 0 : 500);
      });
    });
  }

  /* ---------- форма ---------- */
  if (form) {
    const nameInput = $('#name', form);
    const phoneInput = $('#phone', form);
    const consentInput = $('#consent', form);
    const submit = $('.form-submit', form);
    const success = $('#form-success');
    const again = $('#form-again');

    function setError(name, message) {
      const input = $(`[name="${name}"]`, form);
      const error = $(`[data-error-for="${name}"]`, form);
      if (error) error.textContent = message || '';
      if (!input) return;
      if (name === 'consent') {
        const row = input.closest('.check-row');
        if (row) row.classList.toggle('invalid', Boolean(message));
      } else {
        const field = input.closest('.field');
        if (field) field.classList.toggle('invalid', Boolean(message));
      }
    }

    ['name', 'phone', 'consent'].forEach(name => {
      const input = $(`[name="${name}"]`, form);
      if (!input) return;
      const eventName = name === 'consent' ? 'change' : 'input';
      input.addEventListener(eventName, () => setError(name, ''));
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const errors = {};

      if (!nameInput || nameInput.value.trim().length < 2) {
        errors.name = 'Напишите, как к вам обращаться';
      }

      const digits = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
      if (digits.length < 10) {
        errors.phone = 'Нужен номер из 10–11 цифр';
      }

      if (!consentInput || !consentInput.checked) {
        errors.consent = 'Без согласия отправить нельзя';
      }

      ['name', 'phone', 'consent'].forEach(name => setError(name, errors[name] || ''));

      if (Object.keys(errors).length) {
        const firstInvalid = $('.field.invalid input, .check-row.invalid input', form);
        if (firstInvalid) firstInvalid.focus({ preventScroll: false });
        return;
      }

      if (!submit) return;
      const original = submit.innerHTML;
      submit.disabled = true;
      submit.textContent = 'Отправляем…';

      setTimeout(() => {
        submit.disabled = false;
        submit.innerHTML = original;
        form.reset();
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.scrollIntoView({ behavior: smooth, block: 'center' });
          const heading = $('h3', success);
          if (heading) {
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
          }
        }
      }, reduceMotion ? 0 : 650);
    });

    if (again) {
      again.addEventListener('click', () => {
        if (success) success.hidden = true;
        form.hidden = false;
        const title = $('.form-head h3', form);
        if (title) title.scrollIntoView({ behavior: smooth, block: 'center' });
        if (nameInput) setTimeout(() => nameInput.focus({ preventScroll: true }), reduceMotion ? 0 : 450);
      });
    }
  }

  /* ---------- политика ---------- */
  const privacy = $('#privacy-dialog');
  if (privacy && typeof privacy.showModal === 'function') {
    $$('[data-open-privacy]').forEach(btn => {
      btn.addEventListener('click', () => privacy.showModal());
    });
    $$('[data-close-privacy]').forEach(btn => {
      btn.addEventListener('click', () => privacy.close());
    });
    privacy.addEventListener('click', e => {
      if (e.target === privacy) privacy.close();
    });
  }
})();
