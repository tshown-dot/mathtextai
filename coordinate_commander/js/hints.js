/*
 * All hint and explanation messages live here, so they're easy to reword.
 * Each function returns a short HTML string shown after an answer.
 */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const U = CC.U;
  const fmt = U.fmt;
  const P = U.fmtPt;
  const eq = U.eq;
  const abs = Math.abs;

  function quadrantOf(x, y) {
    if (eq(x, 0) && eq(y, 0)) return 'origin';
    if (eq(x, 0)) return 'y-axis';
    if (eq(y, 0)) return 'x-axis';
    if (x > 0 && y > 0) return 'I';
    if (x < 0 && y > 0) return 'II';
    if (x < 0) return 'III';
    return 'IV';
  }
  CC.quadrantOf = quadrantOf;

  const moveX = (x) => (eq(x, 0) ? `<b>don't move</b> left or right (x = 0)` : `move <b>${fmt(abs(x))} ${x < 0 ? 'left' : 'right'}</b>`);
  const moveY = (y) => (eq(y, 0) ? `<b>stay on the x-axis</b> (y = 0)` : `move <b>${fmt(abs(y))} ${y < 0 ? 'down' : 'up'}</b>`);
  const sgn = (n) => (n > 0 ? '+' : '−');

  /** Info about a horizontal/vertical pair of points */
  function pair(A, B) {
    const horiz = eq(A[1], B[1]);
    const a = horiz ? A[0] : A[1];
    const b = horiz ? B[0] : B[1];
    return { horiz, a, b, d: abs(a - b), same: Math.sign(a) === Math.sign(b), onAxis: eq(a, 0) || eq(b, 0) };
  }

  const H = {
    // ---------------- Lesson 2-4: plotting ----------------
    steps(x, y) {
      return `Start at the origin (0, 0). First ${moveX(x)}. Then ${moveY(y)}.`;
    },

    plot(x, y, cx, cy) {
      if (eq(cx, y) && eq(cy, x) && !eq(x, y)) {
        return `Looks like you <b>switched x and y</b>! In <b>${P(x, y)}</b>, the <b>first</b> number is x (left/right) and the <b>second</b> is y (up/down). ${H.steps(x, y)}`;
      }
      if (eq(cx, -x) && eq(cy, y) && !eq(x, 0)) {
        return `So close! Check the <b>sign of x</b>. x = ${fmt(x)} is ${x < 0 ? 'negative, so go <b>LEFT</b>' : 'positive, so go <b>RIGHT</b>'} from the origin.`;
      }
      if (eq(cy, -y) && eq(cx, x) && !eq(y, 0)) {
        return `So close! Check the <b>sign of y</b>. y = ${fmt(y)} is ${y < 0 ? 'negative, so go <b>DOWN</b>' : 'positive, so go <b>UP</b>'}.`;
      }
      if (eq(cx, x)) return `Your left/right move was perfect! Now fix the up/down part: ${moveY(y)} from the origin.`;
      if (eq(cy, y)) return `Your up/down move was perfect! Now fix the left/right part: ${moveX(x)} from the origin.`;
      return `${H.steps(x, y)} Remember: <b>x first</b> (left/right), <b>then y</b> (up/down).`;
    },

    read(x, y, ax, ay) {
      const T = `<b>${P(x, y)}</b>`;
      if (eq(ax, y) && eq(ay, x) && !eq(x, y)) {
        return `You <b>switched x and y</b>! Always write the left/right number (x) <b>first</b>, then the up/down number (y). The point is at ${T}.`;
      }
      if (eq(ax, -x) && eq(ay, y) && !eq(x, 0)) {
        return `Your y is right! But check the <b>sign of x</b>: the point is to the <b>${x < 0 ? 'LEFT' : 'RIGHT'}</b> of the y-axis, so x is ${x < 0 ? 'negative' : 'positive'}. It's at ${T}.`;
      }
      if (eq(ay, -y) && eq(ax, x) && !eq(y, 0)) {
        return `Your x is right! But check the <b>sign of y</b>: the point is <b>${y < 0 ? 'BELOW' : 'ABOVE'}</b> the x-axis, so y is ${y < 0 ? 'negative' : 'positive'}. It's at ${T}.`;
      }
      const xs = eq(x, 0) ? 'not left or right at all' : `${fmt(abs(x))} ${x < 0 ? 'left' : 'right'}`;
      const ys = eq(y, 0) ? 'not up or down at all' : `${fmt(abs(y))} ${y < 0 ? 'down' : 'up'}`;
      return `From the origin, the point is <b>${xs}</b> and <b>${ys}</b>, so it's at ${T}.`;
    },

    quadrantWhy(x, y) {
      const q = quadrantOf(x, y);
      if (q === 'x-axis') return `y = 0, so the point sits right <b>on the x-axis</b>.`;
      if (q === 'y-axis') return `x = 0, so the point sits right <b>on the y-axis</b>.`;
      return `x is ${x > 0 ? 'positive' : 'negative'} and y is ${y > 0 ? 'positive' : 'negative'} (${sgn(x)}, ${sgn(y)}), so it's in <b>Quadrant ${q}</b>.`;
    },

    quadrant(x, y, chosen) {
      const q = quadrantOf(x, y);
      let pre = '';
      if (q === 'x-axis' || q === 'y-axis') pre = 'When a coordinate is 0, the point is on an <b>axis</b>, not inside a quadrant. ';
      else if (chosen === 'x-axis' || chosen === 'y-axis') pre = "This point isn't on an axis. Neither coordinate is 0. ";
      return `${pre}The point is at <b>${P(x, y)}</b>. ${H.quadrantWhy(x, y)}<br>🧭 Quadrants go <b>counterclockwise</b> starting at the top right: I (+, +), II (−, +), III (−, −), IV (+, −).`;
    },

    // ---------------- Lesson 2-5: distance ----------------
    distanceCalc(A, B) {
      const { a, b, same, onAxis, d } = pair(A, B);
      if (onAxis) return `|${fmt(eq(a, 0) ? b : a)}| = ${fmt(d)}`;
      if (same) return `${fmt(Math.max(abs(a), abs(b)))} − ${fmt(Math.min(abs(a), abs(b)))}`;
      return `${fmt(abs(a))} + ${fmt(abs(b))}`;
    },

    distanceExplain(A, B) {
      const { horiz, a, b, d, same, onAxis } = pair(A, B);
      const v = horiz ? 'x' : 'y';
      const shared = horiz ? 'y' : 'x';
      let s = `Both points have the same ${shared}-coordinate, so the jump is <b>${horiz ? 'horizontal' : 'vertical'}</b>. Use the ${v}-coordinates ${fmt(a)} and ${fmt(b)}. `;
      if (onAxis) {
        s += `One point is on the axis, so the distance is just |${fmt(eq(a, 0) ? b : a)}| = <b>${fmt(d)} units</b>.`;
      } else if (same) {
        const hi = Math.max(abs(a), abs(b));
        const lo = Math.min(abs(a), abs(b));
        s += `They're in the <b>same quadrant</b>, so <b>subtract</b> the absolute values: ${fmt(hi)} − ${fmt(lo)} = <b>${fmt(d)} units</b>.`;
      } else {
        s += `They're in <b>different quadrants</b> (on opposite sides of the ${horiz ? 'y' : 'x'}-axis), so <b>add</b> the absolute values: |${fmt(a)}| + |${fmt(b)}| = ${fmt(abs(a))} + ${fmt(abs(b))} = <b>${fmt(d)} units</b>.`;
      }
      return s;
    },

    distance(A, B, v) {
      const { a, b, same, onAxis } = pair(A, B);
      let pre = '';
      if (!onAxis && !same && eq(v, abs(abs(a) - abs(b)))) pre = 'You subtracted, but these points are on <b>opposite sides</b> of the axis, so you need to <b>add</b>! ';
      else if (!onAxis && same && eq(v, abs(a) + abs(b))) pre = 'You added, but these points are in the <b>same quadrant</b>, so you need to <b>subtract</b>! ';
      return pre + H.distanceExplain(A, B);
    },

    strategy(A, B) {
      const { horiz, a, b, same } = pair(A, B);
      const v = horiz ? 'x' : 'y';
      const why = same
        ? `They have the <b>same sign</b>, so both stations are in the <b>same quadrant</b>. Subtract!`
        : `One is positive and one is negative, so the stations are in <b>different quadrants</b>. Add!`;
      return `Look at the ${v}-coordinates: ${fmt(a)} and ${fmt(b)}. ${why}<br>${H.distanceExplain(A, B)}`;
    },

    findCalc(A, dir, n, B) {
      const horiz = dir === 'left' || dir === 'right';
      const op = dir === 'right' || dir === 'up' ? '+' : '−';
      const c = horiz ? 'x' : 'y';
      return `${fmt(n)} units ${dir === 'up' ? 'up' : dir === 'down' ? 'down' : dir} changes only ${c}: ${fmt(horiz ? A[0] : A[1])} ${op} ${fmt(n)} = ${fmt(horiz ? B[0] : B[1])}. Station B is at <b>${P(B[0], B[1])}</b>.`;
    },

    find(A, dir, n, B, c) {
      const horiz = dir === 'left' || dir === 'right';
      let pre = '';
      const opp = horiz ? [2 * A[0] - B[0], A[1]] : [A[0], 2 * A[1] - B[1]];
      if (horiz && !eq(c[1], A[1])) pre = `Moving left or right changes only the <b>x</b>-coordinate. y stays ${fmt(A[1])}. `;
      else if (!horiz && !eq(c[0], A[0])) pre = `Moving up or down changes only the <b>y</b>-coordinate. x stays ${fmt(A[0])}. `;
      else if (eq(c[0], opp[0]) && eq(c[1], opp[1])) pre = `Wrong direction! <b>${dir}</b> means you ${dir === 'right' || dir === 'up' ? '<b>add</b> to' : '<b>subtract</b> from'} the ${horiz ? 'x' : 'y'}-coordinate. `;
      else pre = 'Count the units carefully from Station A. ';
      return pre + H.findCalc(A, dir, n, B);
    },

    // ---------------- Lesson 2-6: polygons ----------------
    perimeter(shape, v) {
      const sum = shape.sides.map(fmt).join(' + ');
      const all = `Add all ${shape.sides.length} side lengths: ${sum} = <b>${fmt(shape.P)} units</b>.`;
      if (eq(v, shape.A)) return `That's the <b>area</b> (the squares inside)! Perimeter is the distance <b>around</b> the edge. ${all}`;
      if (shape.w != null && eq(v, shape.w + shape.h)) return `You only added <b>two</b> sides. A ${shape.kind} has <b>four</b> sides! ${all}`;
      return `Find each side length using the coordinates (just like Warp Drive!). ${all}`;
    },

    area(shape, v) {
      if (eq(v, shape.P)) {
        return `That's the <b>perimeter</b> (the distance around)! Area counts the <b>squares inside</b>. ${H.areaExplain(shape)}`;
      }
      if (shape.r1 && eq(v, shape.bigW * shape.bigH)) {
        return `That's the area of the whole big rectangle, but a corner is cut out! ${H.areaExplain(shape)}`;
      }
      return H.areaExplain(shape);
    },

    areaExplain(shape) {
      if (shape.r1) {
        const a1 = shape.r1[0] * shape.r1[1];
        const a2 = shape.r2[0] * shape.r2[1];
        return `Split the L-shape into <b>two rectangles</b>: ${fmt(shape.r1[0])} × ${fmt(shape.r1[1])} = ${fmt(a1)} (green) and ${fmt(shape.r2[0])} × ${fmt(shape.r2[1])} = ${fmt(a2)} (pink). Add them: ${fmt(a1)} + ${fmt(a2)} = <b>${fmt(shape.A)} square units</b>.`;
      }
      return `Area = length × width = ${fmt(shape.w)} × ${fmt(shape.h)} = <b>${fmt(shape.A)} square units</b>.`;
    },

    missing(shape, m) {
      const D = shape.pts[m];
      const n1 = shape.pts[(m + 1) % 4];
      const n2 = shape.pts[(m + 3) % 4];
      const sx = eq(n1[0], D[0]) ? n1 : n2; // neighbor sharing x
      const sy = eq(n1[0], D[0]) ? n2 : n1; // neighbor sharing y
      return `In a ${shape.kind}, each corner lines up with its neighbors. The missing corner is straight ${D[1] > sx[1] ? 'above' : 'below'} ${P(sx[0], sx[1])} (same <b>x = ${fmt(D[0])}</b>) and straight ${D[0] > sy[0] ? 'right' : 'left'} of ${P(sy[0], sy[1])} (same <b>y = ${fmt(D[1])}</b>). So it's at <b>${P(D[0], D[1])}</b>.`;
    },
  };

  CC.hints = H;
})();
