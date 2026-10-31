(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------------------------------------------------------------- mobile menu
  const toggle = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.hidden = !open;
      toggle.querySelector('.sr-only').textContent = open ? 'סגירת תפריט' : 'פתיחת תפריט';
      document.body.style.overflow = open ? 'hidden' : '';
    };
    toggle.addEventListener('click', () => setOpen(menu.hidden));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
    window.matchMedia('(min-width: 1181px)').addEventListener('change', (e) => e.matches && setOpen(false));
  }

  // ---------------------------------------------------------------- catalog filters
  const filters = $('[data-filters]');
  if (filters) {
    const wide = window.matchMedia('(min-width: 961px)');
    if (wide.matches) filters.open = true;
    const form = $('[data-filter-form]', filters);
    const make = $('#f-make', form);
    const model = $('#f-model', form);
    // Selects apply immediately; a new manufacturer resets the model.
    $$('select', form).forEach((sel) =>
      sel.addEventListener('change', () => {
        if (sel === make && model) model.value = '';
        form.requestSubmit();
      })
    );
    $$('input[type="checkbox"]', form).forEach((cb) => cb.addEventListener('change', () => form.requestSubmit()));
  }
  $$('[data-autosubmit]').forEach((sel) => sel.addEventListener('change', () => sel.form.requestSubmit()));

  // ---------------------------------------------------------------- lead forms
  const PHONE_MSG = 'מספר הטלפון צריך לכלול 9–10 ספרות, למשל 050-1234567.';
  const NAME_MSG = 'כתבו את השם שלכם.';

  function setError(input, msg) {
    const err = input && document.getElementById(input.getAttribute('aria-describedby'));
    if (!input) return;
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    if (err) err.textContent = msg || '';
  }

  function validate(form) {
    const name = form.elements.name;
    const phone = form.elements.phone;
    const errors = {};
    if (name.value.trim().length < 2) errors.name = NAME_MSG;
    const digits = phone.value.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 13) errors.phone = PHONE_MSG;
    setError(name, errors.name);
    setError(phone, errors.phone);
    return errors;
  }

  $$('[data-lead-form]').forEach((form) => {
    // Validate a field once the person leaves it, then live while they fix it.
    ['name', 'phone'].forEach((n) => {
      const input = form.elements[n];
      input.addEventListener('blur', () => {
        if (input.value) validate(form);
      });
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid')) validate(form);
      });
    });

    // Trade form: show machine details only for selling / trade-in.
    const machine = $('[data-machine-fields]', form);
    if (machine) {
      const sync = () => {
        const v = (form.querySelector('[data-type-radio]:checked') || {}).value;
        machine.hidden = !(v === 'sell' || v === 'trade');
      };
      $$('[data-type-radio]', form).forEach((r) => r.addEventListener('change', sync));
      sync();
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = $('[data-status]', form);
      const btn = $('[data-submit]', form);
      const label = $('[data-label]', btn);
      status.className = 'lead-form__status';
      status.textContent = '';
      const errors = validate(form);
      if (Object.keys(errors).length) {
        form.elements[Object.keys(errors)[0]].focus();
        return;
      }
      const original = label.textContent;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      label.textContent = 'שולחים…';
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(form))),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          if (data.fields) {
            Object.entries(data.fields).forEach(([k, msg]) => setError(form.elements[k], msg));
            const first = Object.keys(data.fields)[0];
            if (first && form.elements[first]) form.elements[first].focus();
          }
          throw new Error(data.error || 'השליחה נכשלה.');
        }
        form.classList.add('is-sent');
        status.classList.add('is-ok');
        status.textContent = 'הפרטים נשלחו. לירן יחזור אליכם בהקדם.';
        status.setAttribute('tabindex', '-1');
        status.focus();
      } catch (err) {
        status.classList.add('is-error');
        status.textContent = `${err.message} אפשר גם להתקשר: 052-6003333`;
      } finally {
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
        label.textContent = original;
      }
    });
  });

  // ---------------------------------------------------------------- gallery + lightbox
  const gallery = $('[data-gallery]');
  if (gallery) {
    const imgs = $$('.gallery__img', gallery);
    const thumbs = $$('[data-gallery-thumb]', gallery);
    const counter = $('[data-gallery-current]', gallery);
    const lightbox = $('[data-lightbox]');
    const lbImg = $('[data-lightbox-img]');
    let current = 0;

    const show = (i) => {
      if (!imgs.length) return;
      current = (i + imgs.length) % imgs.length;
      imgs.forEach((img, n) => img.classList.toggle('is-active', n === current));
      thumbs.forEach((t, n) => {
        t.classList.toggle('is-active', n === current);
        if (n === current) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
      if (counter) counter.textContent = String(current + 1);
      if (lightbox && lightbox.open) {
        lbImg.src = imgs[current].currentSrc || imgs[current].src;
        lbImg.alt = imgs[current].alt;
      }
    };

    thumbs.forEach((t) => t.addEventListener('click', () => show(Number(t.dataset.galleryThumb))));
    // In RTL, "previous" sits on the right and moves backwards.
    const prev = $('[data-gallery-prev]', gallery);
    const next = $('[data-gallery-next]', gallery);
    if (prev) prev.addEventListener('click', () => show(current - 1));
    if (next) next.addEventListener('click', () => show(current + 1));

    // Swipe on touch devices.
    const main = $('.gallery__main', gallery);
    let x0 = null;
    main.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
    main.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(current + (dx > 0 ? 1 : -1));
      x0 = null;
    });

    const open = $('[data-gallery-open]', gallery);
    if (open && lightbox && lightbox.showModal) {
      open.addEventListener('click', () => {
        lbImg.src = imgs[current].src;
        lbImg.alt = imgs[current].alt;
        lightbox.showModal();
      });
      $('[data-lightbox-close]', lightbox).addEventListener('click', () => lightbox.close());
      const lp = $('[data-lightbox-prev]', lightbox);
      const ln = $('[data-lightbox-next]', lightbox);
      if (lp) lp.addEventListener('click', () => show(current - 1));
      if (ln) ln.addEventListener('click', () => show(current + 1));
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) lightbox.close();
      });
      lightbox.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') show(current - 1);
        if (e.key === 'ArrowLeft') show(current + 1);
      });
    }
  }
})();
