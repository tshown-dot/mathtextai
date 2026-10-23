/* =========================================================
   Missions (Lesson 2-4: Plotting Points, Quadrants, Axes)
   Levels:
     L1: Launch Pad (-5 to 5, whole numbers, no timer)
     L2: Asteroid Belt (-10 to 10, points on axes)
     L3: Alien Invasion (-10 to 10, timed threats)
     L4: Boss Battle (-10 to 10, Mothership with HP)
   ========================================================= */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const U = CC.U;
  const H = CC.hints;

  const M = {};

  // Generators for Question Types in 2-4

  // 1. Target Lock: Given (x, y), student clicks the coordinate on grid
  function makeTargetLock(range, allowZero = false) {
    const x = allowZero ? U.randInt(-range, range) : U.nonZeroInt(-range, range);
    const y = allowZero ? U.randInt(-range, range) : U.nonZeroInt(-range, range);
    return {
      type: 'target_lock',
      title: '🎯 TARGET LOCK',
      target: [x, y],
      prompt: `Alien spacecraft detected at <span class="coord">${U.fmtPt(x, y)}</span>!<br>Click the grid to lock on and fire!`,
      gridConfig: { min: -range, max: range, step: 1 },
      init(game, grid) {
        grid.enableClick((cx, cy) => {
          game.handleAnswer({
            isCorrect: U.eq(cx, x) && U.eq(cy, y),
            userCoord: [cx, cy],
            render(feedbackEl, isCorrect) {
              if (isCorrect) {
                grid.laser(x, y).then(() => {
                  grid.explode(x, y);
                  grid.point(x, y, { emoji: '💥', label: U.fmtPt(x, y) });
                });
                feedbackEl.className = 'feedback good';
                feedbackEl.innerHTML = `<div class="fb-head">🎯 Direct Hit!</div><div class="hint">Target destroyed at ${U.fmtPt(x, y)}.</div>`;
              } else {
                grid.point(cx, cy, { emoji: '❌', label: `Clicked ${U.fmtPt(cx, cy)}` });
                grid.point(x, y, { emoji: '🛸', label: `Target ${U.fmtPt(x, y)}` });
                feedbackEl.className = 'feedback bad';
                feedbackEl.innerHTML = `<div class="fb-head">❌ Missed Target!</div><div class="hint">${H.plot(x, y, cx, cy)}</div>`;
              }
            }
          });
        });
      }
    };
  }

  // 2. Radar Readout: An alien/asteroid is at (x, y), student types coordinates
  function makeRadarReadout(range, allowZero = true) {
    let x, y;
    if (allowZero && Math.random() < 0.35) {
      if (Math.random() < 0.5) { x = 0; y = U.nonZeroInt(-range, range); }
      else { x = U.nonZeroInt(-range, range); y = 0; }
    } else {
      x = U.nonZeroInt(-range, range);
      y = U.nonZeroInt(-range, range);
    }
    const emoji = U.choice(['🛸', '👾', '☄️', '🛰️']);

    return {
      type: 'radar_readout',
      title: '📡 RADAR READOUT',
      target: [x, y],
      prompt: `An unidentified object is drifting on radar!<br>Identify its exact coordinates <b>(x, y)</b> to target our beam.`,
      gridConfig: { min: -range, max: range, step: 1 },
      init(game, grid) {
        grid.point(x, y, { emoji, size: 28 });
        const ptInput = U.pointInput({
          button: 'Lock On 🎯',
          onSubmit(ax, ay) {
            game.handleAnswer({
              isCorrect: U.eq(ax, x) && U.eq(ay, y),
              userCoord: [ax, ay],
              render(feedbackEl, isCorrect) {
                if (isCorrect) {
                  grid.laser(x, y).then(() => {
                    grid.explode(x, y);
                    grid.point(x, y, { emoji: '💥', label: U.fmtPt(x, y) });
                  });
                  feedbackEl.className = 'feedback good';
                  feedbackEl.innerHTML = `<div class="fb-head">🎯 Accurate Readout!</div><div class="hint">Object vaporized at ${U.fmtPt(x, y)}.</div>`;
                } else {
                  grid.point(ax, ay, { emoji: '❌', label: `Entered ${U.fmtPt(ax, ay)}` });
                  grid.point(x, y, { label: `Actual ${U.fmtPt(x, y)}`, labelPos: [14, 14] });
                  feedbackEl.className = 'feedback bad';
                  feedbackEl.innerHTML = `<div class="fb-head">❌ Coordinates Off!</div><div class="hint">${H.read(x, y, ax, ay)}</div>`;
                }
              }
            });
          }
        });
        document.getElementById('qAnswer').append(ptInput.el);
        ptInput.focus();
      }
    };
  }

  // 3. Sector Scan: Given coordinates or grid point, identify Quadrant or Axis
  function makeSectorScan(range, allowZero = true) {
    let x, y;
    if (allowZero && Math.random() < 0.3) {
      if (Math.random() < 0.5) { x = 0; y = U.nonZeroInt(-range, range); }
      else { x = U.nonZeroInt(-range, range); y = 0; }
    } else {
      x = U.nonZeroInt(-range, range);
      y = U.nonZeroInt(-range, range);
    }
    const actualQuad = CC.quadrantOf(x, y);

    const quadDisplay = {
      'I': 'Quadrant I (+, +)',
      'II': 'Quadrant II (−, +)',
      'III': 'Quadrant III (−, −)',
      'IV': 'Quadrant IV (+, −)',
      'x-axis': 'x-axis (y = 0)',
      'y-axis': 'y-axis (x = 0)'
    };

    const options = [
      { value: 'I', html: '<b>Quadrant I</b>' },
      { value: 'II', html: '<b>Quadrant II</b>' },
      { value: 'III', html: '<b>Quadrant III</b>' },
      { value: 'IV', html: '<b>Quadrant IV</b>' },
      { value: 'x-axis', html: '<b>x-axis</b>' },
      { value: 'y-axis', html: '<b>y-axis</b>' }
    ];

    return {
      type: 'sector_scan',
      title: '🛰️ SECTOR SCAN',
      target: [x, y],
      prompt: `Scanners picked up a signature at <span class="coord">${U.fmtPt(x, y)}</span>.<br>Which sector (quadrant or axis) is this in?`,
      gridConfig: { min: -range, max: range, step: 1 },
      init(game, grid) {
        grid.point(x, y, { emoji: '🛸', label: U.fmtPt(x, y), size: 24 });
        const ch = U.choices(options, (val) => {
          ch.disable();
          const isCorrect = val === actualQuad;
          ch.mark(actualQuad, 'correct');
          if (!isCorrect) ch.mark(val, 'wrong');

          game.handleAnswer({
            isCorrect,
            render(feedbackEl) {
              if (isCorrect) {
                feedbackEl.className = 'feedback good';
                feedbackEl.innerHTML = `<div class="fb-head">✅ Sector Confirmed!</div><div class="hint">${H.quadrantWhy(x, y)}</div>`;
              } else {
                feedbackEl.className = 'feedback bad';
                feedbackEl.innerHTML = `<div class="fb-head">❌ Navigation Error!</div><div class="hint">${H.quadrant(x, y, val)}</div>`;
              }
            }
          });
        }, 2);
        document.getElementById('qAnswer').append(ch.el);
      }
    };
  }

  // Level Generator
  M.generate = function (levelId) {
    if (levelId === 'L1') {
      // Launch Pad: -5 to 5, no zeros on axes yet, mix of lock and readout
      const kind = Math.random() < 0.6 ? 'lock' : 'readout';
      return kind === 'lock' ? makeTargetLock(5, false) : makeRadarReadout(5, false);
    }
    if (levelId === 'L2') {
      // Asteroid Belt: -10 to 10, includes axes, all 3 types
      const r = Math.random();
      if (r < 0.4) return makeTargetLock(10, true);
      if (r < 0.75) return makeRadarReadout(10, true);
      return makeSectorScan(10, true);
    }
    if (levelId === 'L3') {
      // Alien Invasion: timed, full grid
      const r = Math.random();
      if (r < 0.45) return makeTargetLock(10, true);
      if (r < 0.8) return makeRadarReadout(10, true);
      return makeSectorScan(10, true);
    }
    if (levelId === 'L4') {
      // Boss Battle: high stakes, all types
      const r = Math.random();
      if (r < 0.4) return makeTargetLock(10, true);
      if (r < 0.75) return makeRadarReadout(10, true);
      return makeSectorScan(10, true);
    }
    return makeTargetLock(5, false);
  };

  CC.missions = M;
})();
