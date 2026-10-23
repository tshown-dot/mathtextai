/* Shared helpers: random numbers, number formatting/parsing, small DOM builders. */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const U = {};

  // ---------- random ----------
  U.randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  U.nonZeroInt = (a, b) => {
    let n;
    do { n = U.randInt(a, b); } while (n === 0);
    return n;
  };
  U.choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  /** pairs = [[item, weight], ...] → returns a random item */
  U.weighted = (pairs) => {
    const total = pairs.reduce((s, p) => s + p[1], 0);
    let r = Math.random() * total;
    for (const [item, w] of pairs) {
      r -= w;
      if (r < 0) return item;
    }
    return pairs[pairs.length - 1][0];
  };

  // ---------- numbers ----------
  U.eq = (a, b) => Math.abs(a - b) < 1e-9;

  /** Format a number for display, using a real minus sign: -2.5 → "−2.5" */
  U.fmt = (n) => {
    const r = Math.round(n * 100) / 100;
    if (r === 0) return '0';
    return (r < 0 ? '−' : '') + String(Math.abs(r));
  };
  U.fmtPt = (x, y) => `(${U.fmt(x)}, ${U.fmt(y)})`;

  /**
   * Parse what a student types. Accepts: 7, -7, −7, 2.5, .5, -2.5, 5/2, 2 1/2, -2 1/2, 2½, ½
   * Returns NaN if it can't be read.
   */
  U.parseNum = (raw) => {
    if (raw == null) return NaN;
    let s = String(raw).trim().replace(/[−–—]/g, '-').replace(/½/g, ' 1/2').replace(/\s+/g, ' ').trim();
    if (s === '') return NaN;
    let sign = 1;
    if (s[0] === '-') { sign = -1; s = s.slice(1).trim(); }
    else if (s[0] === '+') { s = s.slice(1).trim(); }
    let m;
    if ((m = s.match(/^(\d+) (\d+)\/(\d+)$/))) {
      const d = +m[3];
      return d ? sign * (+m[1] + +m[2] / d) : NaN;
    }
    if ((m = s.match(/^(\d+)\/(\d+)$/))) {
      const d = +m[2];
      return d ? sign * (+m[1] / d) : NaN;
    }
    if (/^(\d+\.?\d*|\.\d+)$/.test(s)) return sign * parseFloat(s);
    return NaN;
  };

  // ---------- DOM ----------
  U.el = (tag, attrs = {}, children = []) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'disabled') e.disabled = Boolean(v);
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c != null) e.append(c);
    return e;
  };

  U.shake = (node) => {
    node.classList.remove('shake');
    void node.offsetWidth; // restart animation
    node.classList.add('shake');
  };

  /** One number answer: "Label [ ] suffix [Button]" */
  U.numberInput = ({ label, suffix = '', button = 'Submit', onSubmit }) => {
    const input = U.el('input', { type: 'text', autocomplete: 'off', 'aria-label': label, placeholder: '?' });
    const err = U.el('div', { class: 'input-error' });
    const btn = U.el('button', { class: 'btn-primary', type: 'button', text: button });
    let used = false;
    const go = () => {
      if (used) return;
      const v = U.parseNum(input.value);
      if (Number.isNaN(v)) {
        err.textContent = 'Type a number, like 7 or 3.5';
        U.shake(input);
        input.focus();
        return;
      }
      used = true;
      err.textContent = '';
      onSubmit(v);
    };
    btn.addEventListener('click', go);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
    });
    const row = U.el('div', { class: 'answer-row' }, [
      U.el('span', { text: label }), input, U.el('span', { class: 'suffix', text: suffix }), btn,
    ]);
    return { el: U.el('div', {}, [row, err]), focus: () => setTimeout(() => input.focus(), 60) };
  };

  /** Ordered pair answer: "( [x] , [y] ) [Button]" */
  U.pointInput = ({ button = 'Lock on 🎯', onSubmit }) => {
    const mk = (n) => U.el('input', { type: 'text', autocomplete: 'off', 'aria-label': n + '-coordinate', placeholder: n });
    const ix = mk('x');
    const iy = mk('y');
    const err = U.el('div', { class: 'input-error' });
    const btn = U.el('button', { class: 'btn-primary', type: 'button', text: button });
    let used = false;
    const go = () => {
      if (used) return;
      const x = U.parseNum(ix.value);
      const y = U.parseNum(iy.value);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        err.textContent = 'Type both numbers, like −3 and 4';
        const bad = Number.isNaN(x) ? ix : iy;
        U.shake(bad);
        bad.focus();
        return;
      }
      used = true;
      err.textContent = '';
      onSubmit(x, y);
    };
    btn.addEventListener('click', go);
    ix.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (iy.value.trim()) go();
        else iy.focus();
      }
    });
    iy.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
    });
    const row = U.el('div', { class: 'answer-row' }, [
      U.el('span', { class: 'paren', text: '(' }), ix,
      U.el('span', { class: 'paren', text: ',' }), iy,
      U.el('span', { class: 'paren', text: ')' }), btn,
    ]);
    return { el: U.el('div', {}, [row, err]), focus: () => setTimeout(() => ix.focus(), 60) };
  };

  /** Multiple-choice buttons. opts = [{value, html}] */
  U.choices = (opts, onPick, cols = 2) => {
    let locked = false;
    const btns = {};
    const el = U.el('div', { class: 'choice-grid', style: `grid-template-columns: repeat(${cols}, 1fr)` });
    opts.forEach((o) => {
      const b = U.el('button', {
        class: 'choice',
        type: 'button',
        html: o.html,
        onclick: () => { if (!locked) onPick(o.value); },
      });
      btns[o.value] = b;
      el.append(b);
    });
    return {
      el,
      mark: (v, cls) => btns[v] && btns[v].classList.add(cls),
      disable: () => {
        locked = true;
        Object.values(btns).forEach((b) => (b.disabled = true));
      },
    };
  };

  CC.U = U;
})();
