/* =========================================================
   Commander Exam (Comprehensive Topic 2 Review)
   Mix of 12 questions:
     - 4 questions from Lesson 2-4 (Plotting & Quadrants)
     - 4 questions from Lesson 2-5 (Distances & Find Station)
     - 4 questions from Lesson 2-6 (Polygons, Perimeter & Area)
   Provides student score report with printable certificate.
   ========================================================= */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const U = CC.U;

  const E = {};

  E.generateQuestions = function () {
    const list = [
      // 2-4 questions
      { topic: 'Lesson 2-4: Plotting & Quadrants', q: CC.missions.generate('L1') },
      { topic: 'Lesson 2-4: Plotting & Quadrants', q: CC.missions.generate('L2') },
      { topic: 'Lesson 2-4: Plotting & Quadrants', q: CC.missions.generate('L2') },
      { topic: 'Lesson 2-4: Plotting & Quadrants', q: CC.missions.generate('L3') },

      // 2-5 questions
      { topic: 'Lesson 2-5: Distance on Coordinate Grid', q: CC.warp.generate('W1') },
      { topic: 'Lesson 2-5: Distance on Coordinate Grid', q: CC.warp.generate('W2') },
      { topic: 'Lesson 2-5: Distance on Coordinate Grid', q: CC.warp.generate('W3') },
      { topic: 'Lesson 2-5: Distance on Coordinate Grid', q: CC.warp.generate('W4') },

      // 2-6 questions
      { topic: 'Lesson 2-6: Polygons, Perimeter & Area', q: CC.shields.generate('S1') },
      { topic: 'Lesson 2-6: Polygons, Perimeter & Area', q: CC.shields.generate('S2') },
      { topic: 'Lesson 2-6: Polygons, Perimeter & Area', q: CC.shields.generate('S3') },
      { topic: 'Lesson 2-6: Polygons, Perimeter & Area', q: CC.shields.generate('S4') }
    ];

    // Shuffle the questions for variety
    return U.shuffle(list);
  };

  E.showReport = function ({ score, totalQuestions, correctCount, topicBreakdown, onDone }) {
    const card = document.getElementById('resultsCard');
    const pct = Math.round((correctCount / totalQuestions) * 100);

    let rank = 'Cadet';
    let emoji = '🎖️';
    if (pct >= 90) { rank = 'Fleet Admiral'; emoji = '🌟'; }
    else if (pct >= 80) { rank = 'Commander'; emoji = '🚀'; }
    else if (pct >= 70) { rank = 'Lieutenant'; emoji = '🛸'; }
    else if (pct >= 60) { rank = 'Officer'; emoji = '🛰️'; }

    const studentName = (localStorage.getItem('cc-student-name') || '').trim();

    card.innerHTML = `
      <div class="big-emoji">${emoji}</div>
      <h2>Commander Exam Results</h2>
      <p>Official Topic 2 Certification: <b>${rank}</b></p>

      <div style="margin: 14px 0;">
        <label for="studentNameInput" style="display:block; font-weight:800; color:var(--muted); margin-bottom:4px;">Student Name:</label>
        <input type="text" id="studentNameInput" class="name-input" placeholder="Type your name here" value="${studentName}">
      </div>

      <div class="stats">
        <div class="stat"><b>${correctCount}/${totalQuestions}</b>Correct (${pct}%)</div>
        <div class="stat"><b>${score}</b>Total Points</div>
        <div class="stat"><span class="rank">${rank}</span>Final Rank</div>
      </div>

      <table class="report-table">
        <thead>
          <tr>
            <th>Topic</th>
            <th style="text-align:right">Score</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(topicBreakdown).map(([t, s]) => `
            <tr>
              <td>${t}</td>
              <td class="num">${s.correct} / ${s.total} (${Math.round((s.correct / s.total) * 100)}%)</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="btn-row no-print">
        <button id="printReportBtn" class="btn-primary" type="button">🖨️ Print / Save PDF</button>
        <button id="examDoneBtn" type="button">Back to Missions 🚀</button>
      </div>
    `;

    const nameInput = document.getElementById('studentNameInput');
    nameInput.addEventListener('input', (e) => {
      localStorage.setItem('cc-student-name', e.target.value);
    });

    document.getElementById('printReportBtn').onclick = () => window.print();
    document.getElementById('examDoneBtn').onclick = onDone;
  };

  CC.exam = E;
})();
