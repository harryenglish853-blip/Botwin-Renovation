/* =====================================================================
   BOTWIN RENOVATIONS — interactions
   Vanilla JS, no dependencies. Everything degrades gracefully:
   without JS the site is fully readable and the form posts normally.
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const desktop = window.matchMedia('(min-width: 1024px)');

  /* ------------------------------------------------ scroll scheduler */
  const onScrollFns = [];
  let ticking = false;
  const runScroll = () => {
    ticking = false;
    for (const fn of onScrollFns) fn();
  };
  const requestScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(runScroll);
    }
  };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', requestScroll, { passive: true });

  /* ------------------------------------------------------------ header */
  function initHeader() {
    const header = $('[data-header]');
    if (!header) return;
    const hasHero = document.body.classList.contains('has-hero');
    let lastY = window.scrollY;
    onScrollFns.push(() => {
      const y = window.scrollY;
      header.classList.toggle('is-solid', !hasHero || y > 40);
      const menuOpen = document.body.classList.contains('menu-open');
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (!menuOpen && goingDown && y > 700) header.classList.add('is-hidden');
      else if (goingUp || y < 200) header.classList.remove('is-hidden');
      lastY = y;
    });
    // show header whenever something inside it takes focus
    header.addEventListener('focusin', () => header.classList.remove('is-hidden'));
  }

  /* -------------------------------------------------------- mobile menu */
  function initMenu() {
    const toggle = $('[data-menu-toggle]');
    const menu = $('[data-menu]');
    if (!toggle || !menu) return;
    const label = $('[data-menu-label]', toggle);
    let open = false;
    let closeTimer;

    const focusables = () => $$('a, button', menu).concat([toggle]);

    const setOpen = (next, { returnFocus = true } = {}) => {
      if (next === open) return;
      open = next;
      clearTimeout(closeTimer);
      toggle.setAttribute('aria-expanded', String(open));
      label.textContent = open ? 'Close menu' : 'Open menu';
      document.body.classList.toggle('menu-open', open);
      if (open) {
        menu.hidden = false;
        $('[data-header]').classList.remove('is-hidden');
        requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
        setTimeout(() => $('a', menu)?.focus({ preventScroll: true }), 120);
      } else {
        menu.classList.remove('is-open');
        closeTimer = setTimeout(() => { menu.hidden = true; }, reduceMotion.matches ? 0 : 700);
        if (returnFocus) toggle.focus({ preventScroll: true });
      }
    };

    toggle.addEventListener('click', () => setOpen(!open));
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false, { returnFocus: false });
    });
    document.addEventListener('keydown', (e) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'Tab') {
        const items = focusables();
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia('(min-width: 1100px)').addEventListener('change', (e) => {
      if (e.matches) setOpen(false, { returnFocus: false });
    });
  }

  /* ------------------------------------------------------------ reveal */
  function initReveal() {
    const targets = $$('[data-reveal], [data-mask], .beam, .site-footer__statement');
    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    targets.forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------- word-by-word lighting */
  function initSplit() {
    const el = $('[data-split]');
    if (!el || reduceMotion.matches) return;
    const words = [];
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else {
              const s = document.createElement('span');
              s.className = 'w';
              s.textContent = part;
              words.push(s);
              frag.appendChild(s);
            }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      }
    };
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    walk(el);
    onScrollFns.push(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
    });
  }

  /* -------------------------------------------------------------- hero */
  function initHero() {
    const hero = $('[data-hero]');
    if (!hero) return;
    const layers = $$('[data-hero-layer]', hero);
    const stages = $$('[data-hero-stage]', hero);
    const bar = $('[data-hero-progress]', hero);
    const media = $('.hero__media', hero);

    const setStage = (i) => stages.forEach((s, k) => s.classList.toggle('is-active', k === i));

    if (reduceMotion.matches) {
      hero.removeAttribute('data-pinned');
      setStage(2);
      return;
    }
    hero.setAttribute('data-pinned', '');
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const seg = (p, a, b) => ease(clamp((p - a) / (b - a)));

    const update = () => {
      const r = hero.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (r.bottom < 0 || total <= 0) return;
      const p = clamp(-r.top / total);
      const p1 = seg(p, 0.1, 0.42) * 100;
      const p2 = seg(p, 0.55, 0.87) * 100;
      media.style.setProperty('--p1', p1.toFixed(2) + '%');
      media.style.setProperty('--p2', p2.toFixed(2) + '%');
      const edge = p2 > 0 && p2 < 100 ? p2 : p1 > 0 && p1 < 100 ? p1 : 0;
      media.style.setProperty('--edge', edge.toFixed(2) + '%');
      media.style.setProperty('--edge-o', edge ? '1' : '0');
      layers.forEach((l) => l.style.setProperty('--zoom', (1.08 - p * 0.08).toFixed(4)));
      bar.style.setProperty('--progress', p.toFixed(4));
      setStage(p2 > 50 ? 2 : p1 > 50 ? 1 : 0);
    };
    onScrollFns.push(update);
    update();

    // stage labels act as shortcuts
    stages.forEach((s, i) => {
      s.style.cursor = 'pointer';
      s.addEventListener('click', () => {
        const r = hero.getBoundingClientRect();
        const total = r.height - window.innerHeight;
        const target = window.scrollY + r.top + total * [0.02, 0.48, 0.95][i];
        window.scrollTo({ top: target, behavior: 'smooth' });
      });
    });
  }

  /* ---------------------------------------------------------- parallax */
  function initParallax() {
    if (reduceMotion.matches) return;
    const els = $$('[data-parallax]');
    if (!els.length) return;
    onScrollFns.push(() => {
      for (const el of els) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) continue;
        el.style.transform = `translate3d(0, ${(-r.top * 0.18).toFixed(1)}px, 0)`;
      }
    });
  }

  /* ---------------------------------------------- before/after sliders */
  function initBeforeAfter() {
    $$('[data-ba]').forEach((ba) => {
      const frame = $('[data-ba-frame]', ba);
      const handle = $('[data-ba-handle]', ba);
      let pos = 50;
      let dragging = false;
      let start = null;
      let touched = false; // stops the intro hint once the visitor interacts

      const set = (v, announce = true) => {
        pos = clamp(v, 0, 100);
        ba.style.setProperty('--pos', pos + '%');
        if (announce) {
          handle.setAttribute('aria-valuenow', String(Math.round(pos)));
          handle.setAttribute('aria-valuetext', `${Math.round(pos)}% before`);
        }
      };
      const fromEvent = (e) => {
        const r = frame.getBoundingClientRect();
        return ((e.clientX - r.left) / r.width) * 100;
      };

      frame.addEventListener('pointerdown', (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        touched = true;
        start = { x: e.clientX, y: e.clientY, id: e.pointerId, type: e.pointerType };
        if (e.pointerType === 'mouse' || e.target.closest('[data-ba-handle]')) {
          dragging = true;
          ba.classList.add('is-dragging');
          frame.setPointerCapture(e.pointerId);
          set(fromEvent(e));
          e.preventDefault();
        }
      });
      frame.addEventListener('pointermove', (e) => {
        if (!start || e.pointerId !== start.id) return;
        if (!dragging) {
          const dx = Math.abs(e.clientX - start.x), dy = Math.abs(e.clientY - start.y);
          if (dx > 6 && dx > dy) {
            dragging = true;
            ba.classList.add('is-dragging');
            try { frame.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
          } else if (dy > 8) {
            start = null; // vertical scroll wins
            return;
          } else return;
        }
        set(fromEvent(e));
      });
      const end = (e) => {
        if (start && !dragging && e.type === 'pointerup' && start.type !== 'mouse') {
          // a tap (no drag) moves the divider to the tap point
          set(fromEvent(e));
        }
        dragging = false;
        start = null;
        ba.classList.remove('is-dragging');
      };
      frame.addEventListener('pointerup', end);
      frame.addEventListener('pointercancel', end);

      handle.addEventListener('keydown', (e) => {
        touched = true;
        const step = e.shiftKey ? 10 : 2;
        const map = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, PageDown: -10, PageUp: 10 };
        if (e.key in map) { set(pos + map[e.key]); e.preventDefault(); }
        if (e.key === 'Home') { set(0); e.preventDefault(); }
        if (e.key === 'End') { set(100); e.preventDefault(); }
      });

      // one-time hint so visitors see it's interactive
      if (!reduceMotion.matches && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          const keys = [[0, 50], [500, 32], [1100, 64], [1700, 50]];
          const t0 = performance.now();
          const tick = (t) => {
            if (touched) return;
            const el = t - t0;
            let i = 0;
            while (i < keys.length - 1 && el > keys[i + 1][0]) i++;
            if (i >= keys.length - 1) { set(50, false); return; }
            const [ta, va] = keys[i], [tb, vb] = keys[i + 1];
            const k = (el - ta) / (tb - ta);
            const e2 = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            set(va + (vb - va) * e2, false);
            requestAnimationFrame(tick);
          };
          setTimeout(() => requestAnimationFrame(tick), 250);
        }, { threshold: 0.5 });
        io.observe(frame);
      }
    });
  }

  /* -------------------------------------------------------------- tabs */
  function initTabs() {
    $$('[data-tabs]').forEach((root) => {
      const tabs = $$('[role="tab"]', root);
      const select = (tab, focus = false) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          $('#' + t.getAttribute('aria-controls')).hidden = !on;
        });
        if (focus) tab.focus();
        tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      };
      tabs.forEach((t, i) => {
        t.addEventListener('click', () => select(t));
        t.addEventListener('keydown', (e) => {
          let n = null;
          if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
          if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
          if (e.key === 'Home') n = tabs[0];
          if (e.key === 'End') n = tabs[tabs.length - 1];
          if (n) { e.preventDefault(); select(n, true); }
        });
      });
    });
  }

  /* ---------------------------------------------------- project filter */
  function initFilters() {
    const group = $('[data-filters]');
    if (!group) return;
    const buttons = $$('[data-filter]', group);
    const items = $$('[data-projects] [data-category]');
    const status = $('[data-filter-status]');
    buttons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const f = btn.dataset.filter;
        buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
        let shown = 0;
        items.forEach((item) => {
          const match = f === 'all' || item.dataset.category === f;
          item.classList.toggle('is-filtered-out', !match);
          if (match) {
            shown++;
            item.classList.add('is-in');
            $$('[data-mask]', item).forEach((m) => m.classList.add('is-in'));
          }
        });
        if (status) status.textContent = `Showing ${shown} project${shown === 1 ? '' : 's'}`;
      })
    );
  }

  /* ---------------------------------------------------------- process */
  function initProcess() {
    $$('[data-process]').forEach((section) => {
      const track = $('.timeline__track', section);
      const fill = $('[data-process-fill]', section);
      const steps = $$('[data-step]', section);
      if (reduceMotion.matches) {
        steps.forEach((s) => s.classList.add('is-active'));
        return;
      }
      const update = () => {
        const tr = track.getBoundingClientRect();
        const vh = window.innerHeight;
        let p;
        if (desktop.matches) {
          const sr = section.getBoundingClientRect();
          p = clamp((vh * 0.8 - sr.top) / (sr.height * 0.75));
          steps.forEach((s, i) => s.classList.toggle('is-active', p >= (i + 0.25) / steps.length));
        } else {
          p = clamp((vh * 0.62 - tr.top) / tr.height);
          const line = tr.top + p * tr.height;
          steps.forEach((s) => s.classList.toggle('is-active', s.getBoundingClientRect().top + 12 <= line));
        }
        fill.style.setProperty('--fill', p.toFixed(4));
      };
      onScrollFns.push(update);
      update();
    });
  }

  /* ------------------------------------------------------ magnetic CTA */
  function initMagnetic() {
    if (reduceMotion.matches || !finePointer.matches) return;
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(x * 0.18).toFixed(1)}px, ${(y * 0.28).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ------------------------------------------- current nav on the home */
  function initNavSpy() {
    if (!document.body.classList.contains('has-hero') || !('IntersectionObserver' in window)) return;
    const links = $$('[data-nav]');
    const map = new Map();
    links.forEach((a) => {
      const id = a.getAttribute('href').split('#')[1];
      const sec = id && document.getElementById(id);
      if (sec) map.set(sec, a);
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.removeAttribute('aria-current'));
            map.get(e.target)?.setAttribute('aria-current', 'true');
          }
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    map.forEach((_, sec) => io.observe(sec));
  }

  /* -------------------------------------------------------------- form */
  const MAX_FILES = 3;
  const MAX_BYTES = 8 * 1024 * 1024;
  const fmtBytes = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

  function initForm() {
    const form = $('[data-form]');
    if (!form) return;
    const success = $('[data-form-success]');
    const errorBox = $('[data-form-error]');
    const submitBtn = $('[data-submit]', form);
    const upload = $('[data-upload]', form);
    const uploadList = $('[data-upload-list]', form);
    const uploadText = $('[data-upload-text]', form);
    const provider = form.dataset.provider;
    const endpoint = form.dataset.endpoint || '/';

    const fieldOf = (input) => input.closest('.field');
    const setError = (input, msg) => {
      const f = fieldOf(input);
      const err = f && $('[data-error]', f);
      if (!f || !err) return;
      f.classList.toggle('is-invalid', !!msg);
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      err.textContent = msg || '';
    };

    const rules = {
      name: (v) => (v.trim().length < 2 ? 'Please enter your name.' : ''),
      phone: (v) => (v.replace(/\D/g, '').length < 10 ? 'Please enter a phone number we can reach you on (10 digits).' : ''),
      email: (v) => (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? 'Please enter a valid email address.' : ''),
      service: (v) => (!v ? 'Please choose a project type.' : ''),
      message: (v) => (v.trim().length < 10 ? 'Please tell us a little about your project (at least 10 characters).' : ''),
    };
    const validateFiles = () => {
      if (!upload) return '';
      const files = Array.from(upload.files || []);
      if (files.length > MAX_FILES) return `Please choose up to ${MAX_FILES} photos.`;
      if (files.some((f) => !f.type.startsWith('image/'))) return 'Photos must be image files (JPG, PNG, HEIC…).';
      const total = files.reduce((a, f) => a + f.size, 0);
      if (total > MAX_BYTES) return `Photos are ${fmtBytes(total)} in total — please keep them under 8 MB.`;
      return '';
    };
    const validateField = (input) => {
      const rule = rules[input.name];
      if (!rule) return true;
      const msg = rule(input.value);
      setError(input, msg);
      return !msg;
    };

    Object.keys(rules).forEach((name) => {
      const input = form.elements[name];
      if (!input) return;
      input.addEventListener('blur', () => { if (input.value) validateField(input); });
      input.addEventListener('input', () => { if (fieldOf(input).classList.contains('is-invalid')) validateField(input); });
      input.addEventListener('change', () => { if (fieldOf(input).classList.contains('is-invalid')) validateField(input); });
    });

    // photo picker UI
    if (upload) {
      const label = upload.closest('.upload');
      const render = () => {
        const files = Array.from(upload.files || []);
        uploadList.innerHTML = '';
        files.forEach((f) => {
          const li = document.createElement('li');
          const a = document.createElement('span');
          const b = document.createElement('span');
          a.textContent = f.name;
          b.textContent = fmtBytes(f.size);
          li.append(a, b);
          uploadList.appendChild(li);
        });
        uploadText.textContent = files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} selected — tap to change` : 'Tap to add photos';
        setError(upload, validateFiles());
      };
      upload.addEventListener('change', render);
      ['dragenter', 'dragover'].forEach((t) => label.addEventListener(t, () => label.classList.add('is-drag')));
      ['dragleave', 'drop'].forEach((t) => label.addEventListener(t, () => label.classList.remove('is-drag')));
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;

      // honeypot: silently succeed for bots
      if (form.elements.company_website && form.elements.company_website.value) return;

      let firstInvalid = null;
      Object.keys(rules).forEach((name) => {
        const input = form.elements[name];
        if (input && !validateField(input) && !firstInvalid) firstInvalid = input;
      });
      const fileErr = validateFiles();
      if (upload) setError(upload, fileErr);
      if (fileErr && !firstInvalid) firstInvalid = upload;
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      const now = new Date();
      $('[data-timestamp]', form).value = now.toISOString();
      $('[data-page-url]', form).value = window.location.href;

      const data = new FormData(form);
      data.delete('photos');
      ['photo_1', 'photo_2', 'photo_3'].forEach((k) => data.delete(k));
      const files = upload ? Array.from(upload.files || []) : [];
      if (provider === 'netlify') files.forEach((f, i) => data.append(`photo_${i + 1}`, f, f.name));
      else files.forEach((f) => data.append('photos', f, f.name));

      form.classList.add('is-loading');
      form.setAttribute('aria-busy', 'true');
      submitBtn.setAttribute('aria-disabled', 'true');
      const labelEl = $('.form__submit-label', submitBtn);
      const originalLabel = labelEl.textContent;
      labelEl.textContent = 'Sending your request…';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        // success state
        const first = String(data.get('name') || '').trim().split(/\s+/)[0];
        $('[data-success-name]', success).textContent = first ? `, ${first}` : '';
        $('[data-success-time]', success).textContent =
          'Submitted ' + now.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
        form.hidden = true;
        success.hidden = false;
        success.focus({ preventScroll: true });
        success.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
        form.reset();
      } catch (err) {
        errorBox.hidden = false;
        errorBox.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
      } finally {
        clearTimeout(timeout);
        form.classList.remove('is-loading');
        form.removeAttribute('aria-busy');
        submitBtn.removeAttribute('aria-disabled');
        labelEl.textContent = originalLabel;
      }
    });
  }

  /* -------------------------------------------------------------- boot */
  const boot = () => {
    initHeader();
    initMenu();
    initReveal();
    initSplit();
    initHero();
    initParallax();
    initBeforeAfter();
    initTabs();
    initFilters();
    initProcess();
    initMagnetic();
    initNavSpy();
    initForm();
    runScroll();
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
