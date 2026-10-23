/* The shared, clickable SVG coordinate grid used by every mission. */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const NS = 'http://www.w3.org/2000/svg';
  const SIZE = 600; // viewBox size
  const PAD = 38; // space around the grid for labels

  function svgEl(tag, attrs = {}, text) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (text != null) e.textContent = text;
    return e;
  }

  class Grid {
    constructor(svg) {
      this.svg = svg;
      this.gen = 0;
      svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
      this.clickHandler = null;
      svg.addEventListener('pointermove', (e) => this._move(e));
      svg.addEventListener('pointerleave', () => this._hideCursor());
      svg.addEventListener('click', (e) => this._click(e));
      this.setup();
    }

    /** Reset the grid. step = 1 (whole numbers) or 0.5 (halves). */
    setup({ min = -10, max = 10, step = 1 } = {}) {
      this.gen++;
      this.min = min;
      this.max = max;
      this.step = step;
      this.unit = (SIZE - 2 * PAD) / (max - min);
      this.svg.innerHTML = '';
      this.layers = {};
      ['base', 'shapes', 'guides', 'markers', 'fx', 'cursor'].forEach((n) => {
        const g = svgEl('g', { class: 'layer-' + n });
        this.svg.append(g);
        this.layers[n] = g;
      });
      this._drawBase();
      this.disableClick();
    }

    X(x) { return PAD + (x - this.min) * this.unit; }
    Y(y) { return PAD + (this.max - y) * this.unit; }

    /** Run fn later, but only if the grid hasn't been reset in the meantime. */
    later(fn, ms) {
      const gen = this.gen;
      setTimeout(() => { if (this.gen === gen) fn(); }, ms);
    }

    _drawBase() {
      const b = this.layers.base;
      const { min, max } = this;
      const defs = svgEl('defs');
      const mk = svgEl('marker', { id: 'cc-arrow', viewBox: '0 0 10 10', refX: 5, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' });
      mk.append(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrow-head' }));
      defs.append(mk);
      b.append(defs);
      b.append(svgEl('rect', { x: 2, y: 2, width: SIZE - 4, height: SIZE - 4, rx: 16, class: 'grid-bg' }));

      if (this.step < 1) {
        for (let v = min + 0.5; v < max; v += 1) {
          b.append(svgEl('line', { x1: this.X(v), y1: this.Y(min), x2: this.X(v), y2: this.Y(max), class: 'grid-half' }));
          b.append(svgEl('line', { x1: this.X(min), y1: this.Y(v), x2: this.X(max), y2: this.Y(v), class: 'grid-half' }));
        }
      }
      for (let v = min; v <= max; v++) {
        if (v === 0) continue;
        b.append(svgEl('line', { x1: this.X(v), y1: this.Y(min), x2: this.X(v), y2: this.Y(max), class: 'grid-line' }));
        b.append(svgEl('line', { x1: this.X(min), y1: this.Y(v), x2: this.X(max), y2: this.Y(v), class: 'grid-line' }));
      }
      // axes with arrows
      b.append(svgEl('line', { x1: this.X(min) - 16, y1: this.Y(0), x2: this.X(max) + 16, y2: this.Y(0), class: 'axis', 'marker-start': 'url(#cc-arrow)', 'marker-end': 'url(#cc-arrow)' }));
      b.append(svgEl('line', { x1: this.X(0), y1: this.Y(min) + 16, x2: this.X(0), y2: this.Y(max) - 16, class: 'axis', 'marker-start': 'url(#cc-arrow)', 'marker-end': 'url(#cc-arrow)' }));
      b.append(svgEl('text', { x: this.X(max) + 14, y: this.Y(0) - 12, class: 'axis-name', 'text-anchor': 'middle' }, 'x'));
      b.append(svgEl('text', { x: this.X(0) + 14, y: this.Y(max) - 8, class: 'axis-name' }, 'y'));

      // number labels
      for (let v = min; v <= max; v++) {
        const label = v < 0 ? '−' + Math.abs(v) : String(v);
        if (v === 0) {
          b.append(svgEl('text', { x: this.X(0) - 6, y: this.Y(0) + 15, class: 'tick', 'text-anchor': 'end' }, '0'));
          continue;
        }
        b.append(svgEl('text', { x: this.X(v), y: this.Y(0) + 15, class: 'tick', 'text-anchor': 'middle' }, label));
        b.append(svgEl('text', { x: this.X(0) - 6, y: this.Y(v) + 4, class: 'tick', 'text-anchor': 'end' }, label));
      }
    }

    // ---------- clicking ----------
    _snap(e) {
      const m = this.svg.getScreenCTM();
      if (!m) return null;
      const p = this.svg.createSVGPoint();
      p.x = e.clientX;
      p.y = e.clientY;
      const q = p.matrixTransform(m.inverse());
      const s = this.step;
      let x = Math.round((this.min + (q.x - PAD) / this.unit) / s) * s;
      let y = Math.round((this.max - (q.y - PAD) / this.unit) / s) * s;
      if (x < this.min || x > this.max || y < this.min || y > this.max) return null;
      x = +x.toFixed(2);
      y = +y.toFixed(2);
      return { x: x || 0, y: y || 0 }; // avoid -0
    }
    _move(e) {
      if (!this.clickHandler) return;
      const s = this._snap(e);
      const c = this.layers.cursor;
      c.innerHTML = '';
      if (!s) return;
      c.append(svgEl('circle', { cx: this.X(s.x), cy: this.Y(s.y), r: 10, class: 'cursor-ring' }));
      c.append(svgEl('circle', { cx: this.X(s.x), cy: this.Y(s.y), r: 2.5, class: 'cursor-dot' }));
    }
    _hideCursor() { if (this.layers) this.layers.cursor.innerHTML = ''; }
    _click(e) {
      if (!this.clickHandler) return;
      const s = this._snap(e);
      if (!s) return;
      const h = this.clickHandler;
      if (!this.multiClick) this.disableClick();
      h(s.x, s.y);
    }
    /** fn(x, y) is called with the snapped grid point. multi=true keeps listening after a click. */
    enableClick(fn, { multi = false } = {}) {
      this.clickHandler = fn;
      this.multiClick = multi;
      this.svg.classList.add('clickable');
    }
    disableClick() {
      this.clickHandler = null;
      this.svg.classList.remove('clickable');
      this._hideCursor();
    }

    // ---------- drawing ----------
    /** A marker at (x, y): an emoji, a dot, or just a label (labelOnly). */
    point(x, y, { emoji, label, labelPos = [14, -14], size = 26, small = false, labelOnly = false, layer = 'markers' } = {}) {
      const outer = svgEl('g', { transform: `translate(${this.X(x)},${this.Y(y)})` });
      const inner = svgEl('g', { class: 'pop' });
      if (emoji) {
        inner.append(svgEl('text', { class: 'emoji', 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, emoji));
      } else if (!labelOnly) {
        inner.append(svgEl('circle', { r: small ? 4.5 : 6.5, class: 'dot' }));
      }
      if (label) {
        const [dx, dy] = labelPos;
        inner.append(svgEl('text', { x: dx, y: dy, class: 'pt-label', 'text-anchor': dx < 0 ? 'end' : 'start' }, label));
      }
      outer.append(inner);
      this.layers[layer].append(outer);
      return outer;
    }

    line(p1, p2, cls = 'edge', layer = 'shapes') {
      const l = svgEl('line', { x1: this.X(p1[0]), y1: this.Y(p1[1]), x2: this.X(p2[0]), y2: this.Y(p2[1]), class: cls });
      this.layers[layer].append(l);
      return l;
    }

    polygon(pts, cls = 'shield', layer = 'shapes') {
      const p = svgEl('polygon', { points: pts.map(([x, y]) => `${this.X(x)},${this.Y(y)}`).join(' '), class: cls });
      this.layers[layer].append(p);
      return p;
    }

    /** Text at grid point (x, y), nudged by [dx, dy] pixels. */
    text(x, y, str, cls = 'grid-note', [dx, dy] = [0, 4], anchor = 'middle', layer = 'guides') {
      const t = svgEl('text', { x: this.X(x) + dx, y: this.Y(y) + dy, class: 'grid-note ' + cls, 'text-anchor': anchor }, str);
      this.layers[layer].append(t);
      return t;
    }

    /** Rectangle cell with bottom-left corner (x, y), size w × h (grid units). */
    cell(x, y, w, h, cls = 'cell') {
      const r = svgEl('rect', { x: this.X(x), y: this.Y(y + h), width: w * this.unit, height: h * this.unit, class: cls });
      this.layers.shapes.append(r);
      return r;
    }

    /** Highlighted segment with a length label. offset > 0 = above (horizontal) or right (vertical). */
    measure(p1, p2, label, { cls = 'side', offset = 16, layer = 'guides' } = {}) {
      this.line(p1, p2, cls, layer);
      const horiz = Math.abs(p1[1] - p2[1]) < 1e-9;
      const mx = (this.X(p1[0]) + this.X(p2[0])) / 2;
      const my = (this.Y(p1[1]) + this.Y(p2[1])) / 2;
      const t = svgEl('text', {
        x: horiz ? mx : mx + offset,
        y: horiz ? my - offset + 5 : my + 5,
        class: `measure-label ${cls}-label`,
        'text-anchor': horiz ? 'middle' : offset > 0 ? 'start' : 'end',
      }, label);
      this.layers[layer].append(t);
      return t;
    }

    // ---------- effects ----------
    laser(x, y) {
      return new Promise((res) => {
        CC.sound.play('laser');
        const l = svgEl('line', { x1: SIZE / 2, y1: SIZE + 20, x2: this.X(x), y2: this.Y(y), class: 'laser' });
        this.layers.fx.append(l);
        setTimeout(() => { l.remove(); res(); }, 280);
      });
    }

    explode(x, y) {
      CC.sound.play('boom');
      const g = svgEl('g', { transform: `translate(${this.X(x)},${this.Y(y)})` });
      const inner = svgEl('g', { class: 'boom' });
      inner.append(svgEl('circle', { r: 22, class: 'boom-ring' }));
      inner.append(svgEl('text', { class: 'emoji', 'font-size': 34, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, '💥'));
      g.append(inner);
      this.layers.fx.append(g);
      setTimeout(() => g.remove(), 900);
    }

    /** Fly an emoji from one grid point to another. */
    travel(from, to, { emoji = '🚀', dur = 1000 } = {}) {
      return new Promise((res) => {
        const g = svgEl('g');
        g.append(svgEl('text', { class: 'emoji', 'font-size': 26, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, emoji));
        this.layers.fx.append(g);
        const x0 = this.X(from[0]), y0 = this.Y(from[1]), x1 = this.X(to[0]), y1 = this.Y(to[1]);
        const start = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - start) / dur);
          const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          g.setAttribute('transform', `translate(${x0 + (x1 - x0) * e},${y0 + (y1 - y0) * e})`);
          if (k < 1) requestAnimationFrame(step);
          else { g.remove(); res(); }
        };
        requestAnimationFrame(step);
      });
    }
  }

  CC.Grid = Grid;
})();
