/* =========================================================
   Shield Builder (Lesson 2-6: Polygons, Perimeter & Area)
   Stages:
     S1: Basic Shields (Plot 4 vertices + find Perimeter)
     S2: Repair Mode (Missing vertex + find Area)
     S3: Odd Shapes & Halves (Rectangles & Squares with halves, Area/Perimeter)
     S4: Mega Shield (L-shaped composite figures, split into 2 rectangles)
   ========================================================= */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const U = CC.U;
  const H = CC.hints;

  const S = {};

  // Helper to generate a rectangle or square aligned with the grid
  function makeRectShape(range, { halves = false, square = false } = {}) {
    const step = halves ? 0.5 : 1;
    function randCoord(minVal, maxVal) {
      if (halves) return U.randInt(minVal * 2, maxVal * 2) / 2;
      return U.randInt(minVal, maxVal);
    }

    const minDim = halves ? 2 : 3;
    const maxDim = halves ? 6 : 8;

    let w = halves ? U.randInt(minDim * 2, maxDim * 2) / 2 : U.randInt(minDim, maxDim);
    let h = square ? w : (halves ? U.randInt(minDim * 2, maxDim * 2) / 2 : U.randInt(minDim, maxDim));
    if (!square && U.eq(w, h)) h += (halves ? 0.5 : 1);

    // Pick top-left or bottom-left so it fits within [-range, range]
    const x1 = randCoord(-range, range - w);
    const y1 = randCoord(-range, range - h);
    const x2 = x1 + w;
    const y2 = y1 + h;

    // Ordered counterclockwise or clockwise:
    // P0: (x1, y1) bottom-left
    // P1: (x2, y1) bottom-right
    // P2: (x2, y2) top-right
    // P3: (x1, y2) top-left
    const pts = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    const sides = [w, h, w, h];
    const P = 2 * (w + h);
    const A = w * h;
    const kind = U.eq(w, h) ? 'square' : 'rectangle';

    return { pts, sides, P, A, w, h, kind, x1, y1, x2, y2 };
  }

  // Helper to generate an L-shaped polygon (6 vertices)
  function makeLShape(range, halves = false) {
    // Large rectangle of size bigW x bigH, with a cut-out in top-right corner
    const w1 = halves ? U.randInt(2, 5) * 0.5 : U.randInt(2, 4); // left column width
    const w2 = halves ? U.randInt(2, 5) * 0.5 : U.randInt(2, 4); // right protrusion width
    const bigW = w1 + w2;

    const h2 = halves ? U.randInt(2, 4) * 0.5 : U.randInt(2, 3); // base height
    const h1 = halves ? U.randInt(2, 5) * 0.5 : U.randInt(2, 4); // upper extension height
    const bigH = h1 + h2;

    const x0 = halves ? U.randInt(-range * 2, (range - bigW) * 2) / 2 : U.randInt(-range, range - bigW);
    const y0 = halves ? U.randInt(-range * 2, (range - bigH) * 2) / 2 : U.randInt(-range, range - bigH);

    // Vertices counterclockwise starting bottom-left:
    // (x0, y0) -> (x0 + bigW, y0) -> (x0 + bigW, y0 + h2) -> (x0 + w1, y0 + h2) -> (x0 + w1, y0 + bigH) -> (x0, y0 + bigH)
    const pts = [
      [x0, y0],
      [x0 + bigW, y0],
      [x0 + bigW, y0 + h2],
      [x0 + w1, y0 + h2],
      [x0 + w1, y0 + bigH],
      [x0, y0 + bigH]
    ];

    const sides = [bigW, h2, w2, h1, w1, bigH];
    const P = 2 * (bigW + bigH); // perimeter of L-shape is same as bounding box!
    // Rectangle 1: left vertical column (w1 x bigH)
    // Rectangle 2: bottom right part (w2 x h2)
    const A = (w1 * bigH) + (w2 * h2);

    return {
      pts,
      sides,
      P,
      A,
      kind: 'L-shape',
      bigW,
      bigH,
      r1: [w1, bigH],
      r2: [w2, h2],
      x0, y0, w1, w2, h1, h2
    };
  }

  // --- S1: Basic Shields: Plot 4 vertices, then find Perimeter ---
  function makePlotAndPerimeter(range, halves = false) {
    const shape = makeRectShape(range, { halves });
    const step = halves ? 0.5 : 1;

    return {
      type: 'plot_and_perimeter',
      title: '🛡️ BUILD FORCE FIELD',
      target: shape.P,
      prompt: `Establish shield perimeter by plotting all 4 vertices:<br>
        <span class="coord">${shape.pts.map(p => U.fmtPt(p[0], p[1])).join(', ')}</span>`,
      gridConfig: { min: -range, max: range, step },
      init(game, grid) {
        const remaining = [...shape.pts];
        const plotted = [];

        const answerDiv = document.getElementById('qAnswer');
        const chipsDiv = U.el('div', { class: 'vchips' });
        const chipEls = shape.pts.map((p) => {
          const c = U.el('span', { class: 'vchip', text: U.fmtPt(p[0], p[1]) });
          chipsDiv.append(c);
          return { pt: p, el: c };
        });
        answerDiv.append(chipsDiv);

        grid.enableClick((cx, cy) => {
          const matchIdx = remaining.findIndex(p => U.eq(p[0], cx) && U.eq(p[1], cy));
          if (matchIdx !== -1) {
            const pt = remaining.splice(matchIdx, 1)[0];
            plotted.push(pt);
            CC.sound.play('click');
            grid.point(pt[0], pt[1], { emoji: '💠', label: U.fmtPt(pt[0], pt[1]), small: true });

            const chip = chipEls.find(c => U.eq(c.pt[0], pt[0]) && U.eq(c.pt[1], pt[1]));
            if (chip) chip.el.classList.add('on');

            if (remaining.length === 0) {
              grid.disableClick();
              grid.polygon(shape.pts, 'shield shield-glow');
              CC.sound.play('levelUp');

              // Now prompt for Perimeter
              answerDiv.innerHTML = '';
              const perimInput = U.numberInput({
                label: 'Shield Perimeter (edge length) = ',
                suffix: 'units',
                button: 'Activate Field ⚡',
                onSubmit(val) {
                  const isCorrect = U.eq(val, shape.P);
                  game.handleAnswer({
                    isCorrect,
                    render(feedbackEl) {
                      shape.pts.forEach((p, i) => {
                        const next = shape.pts[(i + 1) % 4];
                        grid.measure(p, next, `${U.fmt(shape.sides[i])}`, { cls: 'side' });
                      });
                      if (isCorrect) {
                        feedbackEl.className = 'feedback good';
                        feedbackEl.innerHTML = `<div class="fb-head">⚡ Shield Activated!</div><div class="hint">${H.perimeter(shape, val)}</div>`;
                      } else {
                        feedbackEl.className = 'feedback bad';
                        feedbackEl.innerHTML = `<div class="fb-head">❌ Incomplete Field!</div><div class="hint">${H.perimeter(shape, val)}</div>`;
                      }
                    }
                  });
                }
              });
              answerDiv.append(perimInput.el);
              perimInput.focus();
            }
          } else {
            CC.sound.play('wrong');
            U.shake(chipsDiv);
          }
        }, { multi: true });
      }
    };
  }

  // --- S2: Repair Mode: Missing vertex + find Area ---
  function makeMissingAndArea(range, halves = false) {
    const shape = makeRectShape(range, { halves });
    const missingIdx = U.randInt(0, 3);
    const missingPt = shape.pts[missingIdx];
    const knownPts = shape.pts.filter((_, i) => i !== missingIdx);
    const step = halves ? 0.5 : 1;

    return {
      type: 'missing_and_area',
      title: '🧩 SHIELD REPAIR',
      target: shape.A,
      prompt: `A shield node is damaged! Three vertices of the ${shape.kind} are at:<br>
        <span class="coord">${knownPts.map(p => U.fmtPt(p[0], p[1])).join(', ')}</span>.<br>
        <b>Click on the grid</b> to place the missing 4th vertex!`,
      gridConfig: { min: -range, max: range, step },
      init(game, grid) {
        knownPts.forEach(p => {
          grid.point(p[0], p[1], { emoji: '💠', label: U.fmtPt(p[0], p[1]), small: true });
        });
        // Draw partial edges between known points
        for (let i = 0; i < 4; i++) {
          const p1 = shape.pts[i];
          const p2 = shape.pts[(i + 1) % 4];
          if (i !== missingIdx && ((i + 1) % 4) !== missingIdx) {
            grid.line(p1, p2, 'edge');
          } else {
            grid.line(p1, p2, 'edge-dash');
          }
        }

        const answerDiv = document.getElementById('qAnswer');

        grid.enableClick((cx, cy) => {
          const isCorrectVertex = U.eq(cx, missingPt[0]) && U.eq(cy, missingPt[1]);
          if (isCorrectVertex) {
            grid.disableClick();
            CC.sound.play('correct');
            grid.point(missingPt[0], missingPt[1], { emoji: '💠', label: `Restored ${U.fmtPt(missingPt[0], missingPt[1])}` });
            grid.polygon(shape.pts, 'shield shield-glow');

            // Now ask for Area
            answerDiv.innerHTML = '';
            const areaInput = U.numberInput({
              label: 'Shield Area (coverage) = ',
              suffix: 'sq units',
              button: 'Energize Core 🌐',
              onSubmit(val) {
                const isCorrectArea = U.eq(val, shape.A);
                game.handleAnswer({
                  isCorrect: isCorrectArea,
                  render(feedbackEl) {
                    // Visual fill of unit cells
                    grid.cell(shape.x1, shape.y1, shape.w, shape.h, 'cell');
                    if (isCorrectArea) {
                      feedbackEl.className = 'feedback good';
                      feedbackEl.innerHTML = `<div class="fb-head">🌐 Shield Core Online!</div><div class="hint">${H.area(shape, val)}</div>`;
                    } else {
                      feedbackEl.className = 'feedback bad';
                      feedbackEl.innerHTML = `<div class="fb-head">❌ Power Mismatch!</div><div class="hint">${H.area(shape, val)}</div>`;
                    }
                  }
                });
              }
            });
            answerDiv.append(areaInput.el);
            areaInput.focus();
          } else {
            grid.point(cx, cy, { emoji: '❌', label: `Clicked ${U.fmtPt(cx, cy)}` });
            grid.point(missingPt[0], missingPt[1], { emoji: '💠', label: `Correct ${U.fmtPt(missingPt[0], missingPt[1])}` });
            grid.disableClick();

            game.handleAnswer({
              isCorrect: false,
              render(feedbackEl) {
                feedbackEl.className = 'feedback bad';
                feedbackEl.innerHTML = `<div class="fb-head">❌ Faulty Alignment!</div><div class="hint">${H.missing(shape, missingIdx)}</div>`;
              }
            });
          }
        });
      }
    };
  }

  // --- S4: Mega Shield (L-Shape composite figure) ---
  function makeLShapeMission(range, halves = false) {
    const shape = makeLShape(range, halves);
    const step = halves ? 0.5 : 1;
    const askPerim = Math.random() < 0.5;

    return {
      type: 'l_shape_shield',
      title: '🛡️ MEGA SHIELD COMPLEX',
      target: askPerim ? shape.P : shape.A,
      prompt: `The space station has an L-shaped compound shield with vertices:<br>
        <span class="coord">${shape.pts.map(p => U.fmtPt(p[0], p[1])).join(', ')}</span>.<br>
        Find the total <b>${askPerim ? 'PERIMETER (distance around the outside)' : 'AREA (coverage in square units)'}</b>.`,
      gridConfig: { min: -range, max: range, step },
      init(game, grid) {
        grid.polygon(shape.pts, 'shield shield-glow');
        shape.pts.forEach((p, i) => {
          grid.point(p[0], p[1], { emoji: '💠', label: U.fmtPt(p[0], p[1]), small: true });
          const next = shape.pts[(i + 1) % 6];
          grid.measure(p, next, `${U.fmt(shape.sides[i])}`, { cls: 'side', offset: 12 });
        });

        const answerDiv = document.getElementById('qAnswer');
        const numInput = U.numberInput({
          label: `${askPerim ? 'Perimeter' : 'Area'} = `,
          suffix: askPerim ? 'units' : 'sq units',
          button: 'Calculate Energy ⚡',
          onSubmit(val) {
            const isCorrect = U.eq(val, askPerim ? shape.P : shape.A);
            game.handleAnswer({
              isCorrect,
              render(feedbackEl) {
                if (!askPerim) {
                  // Show the split rectangles
                  grid.cell(shape.x0, shape.y0, shape.w1, shape.bigH, 'cell');
                  grid.cell(shape.x0 + shape.w1, shape.y0, shape.w2, shape.h2, 'cell cell-b');
                  grid.line([shape.x0 + shape.w1, shape.y0], [shape.x0 + shape.w1, shape.y0 + shape.h2], 'split');
                }
                if (isCorrect) {
                  feedbackEl.className = 'feedback good';
                  feedbackEl.innerHTML = `<div class="fb-head">⚡ Calculation Verified!</div><div class="hint">${askPerim ? H.perimeter(shape, val) : H.area(shape, val)}</div>`;
                } else {
                  feedbackEl.className = 'feedback bad';
                  feedbackEl.innerHTML = `<div class="fb-head">❌ Power Imbalance!</div><div class="hint">${askPerim ? H.perimeter(shape, val) : H.area(shape, val)}</div>`;
                }
              }
            });
          }
        });
        answerDiv.append(numInput.el);
        numInput.focus();
      }
    };
  }

  S.generate = function (levelId) {
    if (levelId === 'S1') {
      // Basic Shields: whole numbers, plot 4 corners + perimeter
      return makePlotAndPerimeter(6, false);
    }
    if (levelId === 'S2') {
      // Repair Mode: missing vertex + area
      return makeMissingAndArea(7, false);
    }
    if (levelId === 'S3') {
      // Odd Shapes: halves enabled, mix of perimeter and area
      return Math.random() < 0.5 ? makePlotAndPerimeter(7, true) : makeMissingAndArea(7, true);
    }
    if (levelId === 'S4') {
      // Mega Shield: L-shapes + complex shapes
      return makeLShapeMission(8, Math.random() < 0.4);
    }
    return makePlotAndPerimeter(6, false);
  };

  CC.shields = S;
})();
