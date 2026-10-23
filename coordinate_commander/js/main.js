/* =========================================================
   Coordinate Commander — Main App Entry & Stage Management
   ========================================================= */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const U = CC.U;

  // Screen Switching
  CC.setScreen = function (screenId) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.remove('active'));
    const target = document.getElementById(screenId);
    if (target) target.classList.add('active');
    window.scrollTo(0, 0);
  };

  // Stage Catalog
  const STAGES = [
    // ---------------- Lesson 2-4: Plotting Points ----------------
    {
      id: 'L1',
      category: 'mission',
      icon: '🚀',
      tag: 'LEVEL 1',
      name: 'Launch Pad',
      desc: 'Plot points in all 4 quadrants (−5 to 5). Whole numbers.',
      unlocksAt: null, // Always unlocked
      badge: 'Lesson 2-4'
    },
    {
      id: 'L2',
      category: 'mission',
      icon: '☄️',
      tag: 'LEVEL 2',
      name: 'Asteroid Belt',
      desc: 'Full grid (−10 to 10) including points directly on axes.',
      unlocksAt: 'L1',
      badge: 'Lesson 2-4'
    },
    {
      id: 'L3',
      category: 'mission',
      icon: '👾',
      tag: 'LEVEL 3',
      name: 'Alien Invasion',
      desc: 'Rapid threats approaching! Timed plotting defenses.',
      unlocksAt: 'L2',
      badge: 'Lesson 2-4'
    },
    {
      id: 'L4',
      category: 'mission',
      icon: '🛸',
      tag: 'LEVEL 4',
      name: 'Boss Battle',
      desc: 'Mothership assault! Defeat the flagship with target locks.',
      unlocksAt: 'L3',
      badge: 'Boss'
    },

    // ---------------- Lesson 2-5: Distance ----------------
    {
      id: 'W1',
      category: 'warp',
      icon: '📏',
      tag: 'WARP 1',
      name: 'Short Hops',
      desc: 'Distance between points in the same quadrant (subtract |values|).',
      unlocksAt: 'L2', // Unlocks after L2!
      badge: 'Lesson 2-5'
    },
    {
      id: 'W2',
      category: 'warp',
      icon: '🧭',
      tag: 'WARP 2',
      name: 'Cross the Axis',
      desc: 'Distance across axes into different quadrants (add |values|).',
      unlocksAt: 'W1',
      badge: 'Lesson 2-5'
    },
    {
      id: 'W3',
      category: 'warp',
      icon: '🛸',
      tag: 'WARP 3',
      name: 'Mixed Missions',
      desc: 'Horizontal, vertical jumps & "Find the Station" coordinates.',
      unlocksAt: 'W2',
      badge: 'Lesson 2-5'
    },
    {
      id: 'W4',
      category: 'warp',
      icon: '✨',
      tag: 'WARP 4',
      name: 'Rational Warp',
      desc: 'Distances with halves (0.5, 1.5, 2.5) across the grid.',
      unlocksAt: 'W3',
      badge: 'Lesson 2-5'
    },

    // ---------------- Lesson 2-6: Polygons ----------------
    {
      id: 'S1',
      category: 'shield',
      icon: '🛡️',
      tag: 'SHIELD 1',
      name: 'Basic Shields',
      desc: 'Plot 4 vertices of rectangles & squares. Find Perimeter.',
      unlocksAt: 'W2', // Unlocks after W2!
      badge: 'Lesson 2-6'
    },
    {
      id: 'S2',
      category: 'shield',
      icon: '🧩',
      tag: 'SHIELD 2',
      name: 'Repair Mode',
      desc: 'Find the missing 4th vertex & calculate Area coverage.',
      unlocksAt: 'S1',
      badge: 'Lesson 2-6'
    },
    {
      id: 'S3',
      category: 'shield',
      icon: '⚡',
      tag: 'SHIELD 3',
      name: 'Odd Shapes & Halves',
      desc: 'Perimeter and area on grid with half-unit coordinates.',
      unlocksAt: 'S2',
      badge: 'Lesson 2-6'
    },
    {
      id: 'S4',
      category: 'shield',
      icon: '🌐',
      tag: 'SHIELD 4',
      name: 'Mega Shield',
      desc: 'L-shaped composite figures. Split shapes to find area.',
      unlocksAt: 'S3',
      badge: 'Lesson 2-6'
    },

    // ---------------- Topic 2 Review: Exam ----------------
    {
      id: 'EXAM',
      category: 'exam',
      icon: '🎖️',
      tag: 'COMMANDER EXAM',
      name: 'Topic 2 Review',
      desc: 'Comprehensive mission testing Plotting, Distance & Polygons.',
      unlocksAt: 'S4',
      badge: 'Topic 2 Final'
    }
  ];

  // Progress Manager & Commander Code Encoder/Decoder
  class ProgressManager {
    constructor() {
      this.completed = new Set();
      this.load();
    }

    load() {
      try {
        const raw = localStorage.getItem('cc-progress');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) this.completed = new Set(list);
        }
      } catch (e) { /* ignore */ }
    }

    save() {
      try {
        localStorage.setItem('cc-progress', JSON.stringify([...this.completed]));
      } catch (e) { /* ignore */ }
    }

    isCompleted(id) {
      return this.completed.has(id);
    }

    isUnlocked(stage) {
      if (!stage.unlocksAt) return true;
      return this.completed.has(stage.unlocksAt);
    }

    markCompleted(id) {
      this.completed.add(id);
      this.save();
    }

    // Short Commander Code: CC-XXXX
    // Encodes a bitmask of completed stages + simple checksum
    getCode() {
      let mask = 0;
      STAGES.forEach((s, idx) => {
        if (this.completed.has(s.id)) mask |= (1 << idx);
      });
      const hex = mask.toString(16).toUpperCase().padStart(4, '0');
      // Simple checksum nibble
      let sum = 0;
      for (let i = 0; i < hex.length; i++) sum += parseInt(hex[i], 16);
      const chk = (sum % 16).toString(16).toUpperCase();
      return `CC-${hex}${chk}`;
    }

    loadCode(codeStr) {
      const clean = (codeStr || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const m = clean.match(/^CC([0-9A-F]{4})([0-9A-F])$/);
      if (!m) return false;

      const hex = m[1];
      const chk = m[2];
      let sum = 0;
      for (let i = 0; i < hex.length; i++) sum += parseInt(hex[i], 16);
      if ((sum % 16).toString(16).toUpperCase() !== chk) return false;

      const mask = parseInt(hex, 16);
      STAGES.forEach((s, idx) => {
        if ((mask & (1 << idx)) !== 0) this.completed.add(s.id);
      });
      this.save();
      return true;
    }
  }

  // Initialize App
  window.addEventListener('DOMContentLoaded', () => {
    const progress = new ProgressManager();
    const game = new CC.GameEngine();

    CC.isPracticeMode = false;

    // Sound toggle
    const soundBtn = document.getElementById('soundBtn');
    function updateSoundBtn() {
      soundBtn.textContent = CC.sound.enabled ? '🔊 Sound on' : '🔇 Sound off';
    }
    updateSoundBtn();
    soundBtn.onclick = () => {
      CC.sound.toggle();
      updateSoundBtn();
    };

    // Practice Mode toggle
    const practiceToggle = document.getElementById('practiceToggle');
    practiceToggle.onchange = (e) => {
      CC.isPracticeMode = e.target.checked;
    };

    // Code Elements
    const myCodeEl = document.getElementById('myCode');
    const codeInput = document.getElementById('codeInput');
    const codeBtn = document.getElementById('codeBtn');
    const codeMsg = document.getElementById('codeMsg');

    function updateCodeDisplay() {
      myCodeEl.textContent = progress.getCode();
    }
    updateCodeDisplay();

    codeBtn.onclick = () => {
      const ok = progress.loadCode(codeInput.value);
      if (ok) {
        codeMsg.className = 'code-msg good';
        codeMsg.textContent = '✅ Progress Loaded!';
        updateCodeDisplay();
        renderMap();
      } else {
        codeMsg.className = 'code-msg bad';
        codeMsg.textContent = '❌ Invalid Code';
      }
      setTimeout(() => { codeMsg.textContent = ''; }, 3500);
    };

    // Stage Map Renderer
    const stageMapEl = document.getElementById('stageMap');

    function renderMap() {
      stageMapEl.innerHTML = '';

      const groups = [
        {
          key: 'mission',
          title: '🚀 Planetary Defense',
          sub: 'Lesson 2-4: Plotting Points, Quadrants & Axes',
          stages: STAGES.filter(s => s.category === 'mission')
        },
        {
          key: 'warp',
          title: '🛸 Warp Drive Missions',
          sub: 'Lesson 2-5: Finding Distance on the Coordinate Plane',
          stages: STAGES.filter(s => s.category === 'warp')
        },
        {
          key: 'shield',
          title: '🛡️ Force Field Builder',
          sub: 'Lesson 2-6: Polygons, Perimeter & Area',
          stages: STAGES.filter(s => s.category === 'shield')
        },
        {
          key: 'exam',
          title: '🎖️ Topic 2 Review',
          sub: 'Commander Exam: Final Comprehensive Review',
          stages: STAGES.filter(s => s.category === 'exam')
        }
      ];

      groups.forEach((g) => {
        const groupEl = U.el('div', { class: `group group-${g.key}` });
        groupEl.innerHTML = `<h2>${g.title} <small>${g.sub}</small></h2>`;

        const cardsEl = U.el('div', { class: 'cards' });

        g.stages.forEach((stage) => {
          const unlocked = progress.isUnlocked(stage);
          const done = progress.isCompleted(stage.id);

          const statusClass = done ? 'done' : unlocked ? 'ready' : 'locked';
          const statusText = done ? '✅ Completed' : unlocked ? '⚡ Ready to Play' : '🔒 Locked';

          const card = U.el('button', {
            type: 'button',
            class: `card-stage ${statusClass}`,
            disabled: !unlocked,
            onclick: () => {
              if (!unlocked) return;
              CC.setScreen('game');
              game.startLevel(stage, ({ passed }) => {
                if (passed) {
                  progress.markCompleted(stage.id);
                  updateCodeDisplay();
                  renderMap();
                }
              });
            }
          });

          card.innerHTML = `
            <div class="top">
              <span class="ic">${stage.icon}</span>
              <span class="tag">${stage.tag}</span>
            </div>
            <div class="nm">${stage.name}</div>
            <div class="ds">${stage.desc}</div>
            <div class="badges">
              <span class="badge">${stage.badge}</span>
            </div>
            <div class="st">${statusText}</div>
          `;

          cardsEl.append(card);
        });

        groupEl.append(cardsEl);
        stageMapEl.append(groupEl);
      });
    }

    renderMap();

    // Quit button in Game HUD
    document.getElementById('quitBtn').onclick = () => {
      if (confirm('Return to Mission Map? Current level progress will be lost.')) {
        game.quit();
      }
    };
  });
})();
