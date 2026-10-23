/* =========================================================
   Warp Drive (Lesson 2-5: Distances on Coordinate Grid)
   Stages:
     W1: Short Hops (Same quadrant, whole numbers)
     W2: Cross the Axis (Different quadrants, whole numbers)
     W3: Mixed Missions (Same/different + Find the Station)
     W4: Rational Warp (Halves only: 0.5, 1.5, etc.)
   ========================================================= */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const U = CC.U;
  const H = CC.hints;

  const W = {};

  // Helper to generate horizontal or vertical pair of points
  function makePair(range, { sameQuad = true, halves = false } = {}) {
    const isHoriz = Math.random() < 0.5;
    const step = halves ? 0.5 : 1;

    function randCoord(minVal, maxVal) {
      if (halves) {
        // pick integer or half
        const mult = U.randInt(minVal * 2, maxVal * 2);
        return mult / 2;
      }
      return U.nonZeroInt(minVal, maxVal);
    }

    let a1, a2, shared;
    shared = randCoord(-range, range);

    if (sameQuad) {
      const sign = Math.random() < 0.5 ? 1 : -1;
      let v1 = Math.abs(randCoord(1, range - 2));
      let v2 = Math.abs(randCoord(1, range - 2));
      while (Math.abs(v1 - v2) < (halves ? 1 : 2)) {
        v2 = Math.abs(randCoord(1, range));
      }
      a1 = sign * v1;
      a2 = sign * v2;
    } else {
      // Different quadrants: opposite signs across the axis
      let v1 = Math.abs(randCoord(1, range - 1));
      let v2 = Math.abs(randCoord(1, range - 1));
      a1 = -v1;
      a2 = v2;
      if (Math.random() < 0.5) { [a1, a2] = [a2, a1]; }
    }

    const ptA = isHoriz ? [a1, shared] : [shared, a1];
    const ptB = isHoriz ? [a2, shared] : [shared, a2];
    return { ptA, ptB, isHoriz, dist: Math.abs(a1 - a2) };
  }

  // Question Type 1: Calculate Distance (with optional Strategy check)
  function makeDistanceMission(range, { sameQuad = true, halves = false, askStrategy = false } = {}) {
    const { ptA, ptB, isHoriz, dist } = makePair(range, { sameQuad, halves });
    const step = halves ? 0.5 : 1;

    return {
      type: 'warp_jump',
      title: '📏 WARP JUMP',
      target: dist,
      ptA,
      ptB,
      prompt: `Calculate the warp distance between Station Alpha <span class="coord">${U.fmtPt(ptA[0], ptA[1])}</span> and Station Beta <span class="coord">${U.fmtPt(ptB[0], ptB[1])}</span>.`,
      gridConfig: { min: -range, max: range, step },
      init(game, grid) {
        grid.point(ptA[0], ptA[1], { emoji: '🔵', label: `Alpha ${U.fmtPt(ptA[0], ptA[1])}` });
        grid.point(ptB[0], ptB[1], { emoji: '🟣', label: `Beta ${U.fmtPt(ptB[0], ptB[1])}` });
        grid.line(ptA, ptB, 'warp-path');

        const answerContainer = document.getElementById('qAnswer');

        if (askStrategy) {
          // Ask strategy first: Same quadrant (subtract) or Different quadrants (add)
          const stratDiv = U.el('div', {}, [
            U.el('div', { class: 'step-label', text: 'Step 1: Choose your strategy based on the coordinates:' })
          ]);

          const opts = [
            { value: 'same', html: '<b>Same Quadrant</b> → Subtract |values|' },
            { value: 'diff', html: '<b>Different Quadrants</b> → Add |values|' }
          ];

          const expectedStrat = sameQuad ? 'same' : 'diff';
          const ch = U.choices(opts, (val) => {
            ch.disable();
            const correctStrat = val === expectedStrat;
            ch.mark(expectedStrat, 'correct');
            if (!correctStrat) ch.mark(val, 'wrong');

            if (correctStrat) {
              CC.sound.play('correct');
              stratDiv.append(U.el('div', { class: 'step-ok', text: '✅ Strategy Confirmed! Now calculate the distance:' }));
            } else {
              CC.sound.play('wrong');
              stratDiv.append(U.el('div', { class: 'input-error', html: H.strategy(ptA, ptB) }));
            }

            // Now show distance input
            const numInput = U.numberInput({
              label: 'Distance = ',
              suffix: 'units',
              button: 'Engage Warp 🚀',
              onSubmit(enteredVal) {
                const isCorrect = U.eq(enteredVal, dist);
                game.handleAnswer({
                  isCorrect,
                  render(feedbackEl) {
                    if (isCorrect) {
                      grid.measure(ptA, ptB, `${U.fmt(dist)} units`, { cls: 'side' });
                      grid.travel(ptA, ptB, { emoji: '🚀', dur: 800 }).then(() => {
                        CC.sound.play('warp');
                      });
                      feedbackEl.className = 'feedback good';
                      feedbackEl.innerHTML = `<div class="fb-head">🚀 Warp Jump Successful!</div><div class="hint">${H.distanceExplain(ptA, ptB)}</div>`;
                    } else {
                      grid.measure(ptA, ptB, `${U.fmt(dist)} units`, { cls: 'side' });
                      feedbackEl.className = 'feedback bad';
                      feedbackEl.innerHTML = `<div class="fb-head">❌ Warp Trajectory Failed!</div><div class="hint">${H.distance(ptA, ptB, enteredVal)}</div>`;
                    }
                  }
                });
              }
            });
            answerContainer.append(numInput.el);
            numInput.focus();
          }, 1);

          stratDiv.append(ch.el);
          answerContainer.append(stratDiv);
        } else {
          // Direct input
          const numInput = U.numberInput({
            label: 'Distance = ',
            suffix: 'units',
            button: 'Engage Warp 🚀',
            onSubmit(enteredVal) {
              const isCorrect = U.eq(enteredVal, dist);
              game.handleAnswer({
                isCorrect,
                render(feedbackEl) {
                  if (isCorrect) {
                    grid.measure(ptA, ptB, `${U.fmt(dist)} units`, { cls: 'side' });
                    grid.travel(ptA, ptB, { emoji: '🚀', dur: 800 }).then(() => {
                      CC.sound.play('warp');
                    });
                    feedbackEl.className = 'feedback good';
                    feedbackEl.innerHTML = `<div class="fb-head">🚀 Warp Jump Successful!</div><div class="hint">${H.distanceExplain(ptA, ptB)}</div>`;
                  } else {
                    grid.measure(ptA, ptB, `${U.fmt(dist)} units`, { cls: 'side' });
                    feedbackEl.className = 'feedback bad';
                    feedbackEl.innerHTML = `<div class="fb-head">❌ Warp Trajectory Failed!</div><div class="hint">${H.distance(ptA, ptB, enteredVal)}</div>`;
                  }
                }
              });
            }
          });
          answerContainer.append(numInput.el);
          numInput.focus();
        }
      }
    };
  }

  // Question Type 2: Find the Station
  // "Station B is 6 units left/right/up/down from Station A. Click where it is!"
  function makeFindStation(range, halves = false) {
    const dir = U.choice(['left', 'right', 'up', 'down']);
    const step = halves ? 0.5 : 1;
    let dist = halves ? U.randInt(3, 8) * 0.5 : U.randInt(3, 7);

    let ax = halves ? U.randInt(-range * 2 + 6, range * 2 - 6) / 2 : U.randInt(-range + 3, range - 3);
    let ay = halves ? U.randInt(-range * 2 + 6, range * 2 - 6) / 2 : U.randInt(-range + 3, range - 3);

    let bx = ax;
    let by = ay;

    if (dir === 'left') { bx = ax - dist; if (bx < -range) { bx = ax + dist; } }
    else if (dir === 'right') { bx = ax + dist; if (bx > range) { bx = ax - dist; } }
    else if (dir === 'up') { by = ay + dist; if (by > range) { by = ay - dist; } }
    else if (dir === 'down') { by = ay - dist; if (by < -range) { by = ay + dist; } }

    const actualDist = Math.abs(bx !== ax ? bx - ax : by - ay);
    const actualDir = bx < ax ? 'left' : bx > ax ? 'right' : by > ay ? 'up' : 'down';

    const ptA = [ax, ay];
    const ptB = [bx, by];

    return {
      type: 'find_station',
      title: '🎯 FIND THE STATION',
      target: ptB,
      prompt: `Station Alpha is at <span class="coord">${U.fmtPt(ax, ay)}</span>.<br>Station Beta is <b>${U.fmt(actualDist)} units ${actualDir}</b> of Alpha.<br>Click on the grid to deploy Station Beta!`,
      gridConfig: { min: -range, max: range, step },
      init(game, grid) {
        grid.point(ax, ay, { emoji: '🔵', label: `Alpha ${U.fmtPt(ax, ay)}` });
        grid.enableClick((cx, cy) => {
          const isCorrect = U.eq(cx, bx) && U.eq(cy, by);
          game.handleAnswer({
            isCorrect,
            userCoord: [cx, cy],
            render(feedbackEl) {
              if (isCorrect) {
                grid.point(bx, by, { emoji: '🟣', label: `Beta ${U.fmtPt(bx, by)}` });
                grid.line(ptA, ptB, 'edge');
                feedbackEl.className = 'feedback good';
                feedbackEl.innerHTML = `<div class="fb-head">🎯 Station Deployed!</div><div class="hint">${H.findCalc(ptA, actualDir, actualDist, ptB)}</div>`;
              } else {
                grid.point(cx, cy, { emoji: '❌', label: `Clicked ${U.fmtPt(cx, cy)}` });
                grid.point(bx, by, { emoji: '🟣', label: `Target Beta ${U.fmtPt(bx, by)}` });
                grid.line(ptA, ptB, 'edge-dash');
                feedbackEl.className = 'feedback bad';
                feedbackEl.innerHTML = `<div class="fb-head">❌ Incorrect Coordinates!</div><div class="hint">${H.find(ptA, actualDir, actualDist, ptB, [cx, cy])}</div>`;
              }
            }
          });
        });
      }
    };
  }

  W.generate = function (levelId) {
    if (levelId === 'W1') {
      // Short Hops: Same quadrant, whole numbers, always ask strategy
      return makeDistanceMission(7, { sameQuad: true, halves: false, askStrategy: true });
    }
    if (levelId === 'W2') {
      // Cross the Axis: Different quadrants, whole numbers, always ask strategy
      return makeDistanceMission(8, { sameQuad: false, halves: false, askStrategy: true });
    }
    if (levelId === 'W3') {
      // Mixed Missions: Same & different, strategy asked ~30% of the time, + find the station
      if (Math.random() < 0.4) {
        return makeFindStation(8, false);
      }
      const same = Math.random() < 0.5;
      const askStrat = Math.random() < 0.3;
      return makeDistanceMission(10, { sameQuad: same, halves: false, askStrategy: askStrat });
    }
    if (levelId === 'W4') {
      // Rational Warp: Halves only, no strategy question
      if (Math.random() < 0.35) {
        return makeFindStation(7, true);
      }
      const same = Math.random() < 0.5;
      return makeDistanceMission(7, { sameQuad: same, halves: true, askStrategy: false });
    }
    return makeDistanceMission(7, { sameQuad: true });
  };

  CC.warp = W;
})();
