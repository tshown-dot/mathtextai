/* =========================================================
   Game Engine & Flow Orchestrator
   ========================================================= */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  const U = CC.U;

  class GameEngine {
    constructor() {
      this.gridEl = document.getElementById('grid');
      this.grid = new CC.Grid(this.gridEl);

      this.hud = {
        title: document.getElementById('hudTitle'),
        progress: document.getElementById('hudProgress'),
        score: document.getElementById('hudScore'),
        streak: document.getElementById('hudStreak'),
        shields: document.getElementById('hudShields')
      };

      this.threat = {
        wrap: document.getElementById('threat'),
        ship: document.getElementById('threatShip'),
        time: document.getElementById('threatTime')
      };

      this.boss = {
        wrap: document.getElementById('boss'),
        hp: document.getElementById('bossHp'),
        fill: document.getElementById('bossFill')
      };

      this.panel = {
        title: document.getElementById('qTitle'),
        prompt: document.getElementById('qPrompt'),
        answer: document.getElementById('qAnswer'),
        feedback: document.getElementById('qFeedback')
      };

      this.timerInterval = null;
      this.isAnswering = false;
    }

    startLevel(stageDef, onComplete) {
      this.stageDef = stageDef;
      this.onComplete = onComplete;
      this.isExam = stageDef.id === 'EXAM';
      this.isBoss = stageDef.id === 'L4';
      this.hasTimer = (stageDef.id === 'L3' || stageDef.id === 'L4') && !CC.isPracticeMode;

      this.totalQuestions = this.isExam ? 12 : 10;
      this.qIndex = 0;
      this.score = 0;
      this.streak = 0;
      this.correctCount = 0;
      this.shields = CC.isPracticeMode ? 999 : 3;
      this.bossHp = 10;
      this.topicBreakdown = {};

      if (this.isExam) {
        this.examQuestions = CC.exam.generateQuestions();
      }

      this.updateHud();
      this.setupBoss();
      this.nextQuestion();
    }

    setupBoss() {
      if (this.isBoss) {
        this.boss.wrap.classList.remove('hidden');
        this.updateBoss();
      } else {
        this.boss.wrap.classList.add('hidden');
      }
    }

    updateBoss() {
      if (!this.isBoss) return;
      this.boss.hp.textContent = `(${this.bossHp}/10 HP)`;
      const pct = Math.max(0, (this.bossHp / 10) * 100);
      this.boss.fill.style.width = pct + '%';
    }

    updateHud() {
      this.hud.title.textContent = this.stageDef.name;
      this.hud.progress.textContent = `Q ${this.qIndex + 1}/${this.totalQuestions}`;
      this.hud.score.textContent = `⭐ ${this.score}`;

      if (this.streak >= 3) {
        this.hud.streak.className = 'pill hot';
        this.hud.streak.textContent = `🔥 Streak ×${this.streak} (2× PTS)`;
      } else if (this.streak > 0) {
        this.hud.streak.className = 'pill';
        this.hud.streak.textContent = `Streak: ${this.streak}`;
      } else {
        this.hud.streak.className = 'pill';
        this.hud.streak.textContent = `Streak: 0`;
      }

      if (CC.isPracticeMode) {
        this.hud.shields.innerHTML = '🧘 Practice';
      } else {
        let icons = '';
        for (let i = 0; i < 3; i++) {
          icons += i < this.shields ? '🛡️ ' : '<span class="lost">🛡️</span> ';
        }
        this.hud.shields.innerHTML = icons.trim();
      }
    }

    nextQuestion() {
      if (this.qIndex >= this.totalQuestions || (!CC.isPracticeMode && this.shields <= 0) || (this.isBoss && this.bossHp <= 0)) {
        this.finishLevel();
        return;
      }

      this.isAnswering = false;
      this.panel.answer.innerHTML = '';
      this.panel.feedback.className = 'feedback hidden';
      this.panel.feedback.innerHTML = '';

      let qObj, topic;
      if (this.isExam) {
        const item = this.examQuestions[this.qIndex];
        qObj = item.q;
        topic = item.topic;
        if (!this.topicBreakdown[topic]) this.topicBreakdown[topic] = { correct: 0, total: 0 };
        this.topicBreakdown[topic].total++;
        this.currentTopic = topic;
      } else if (this.stageDef.category === 'warp') {
        qObj = CC.warp.generate(this.stageDef.id);
      } else if (this.stageDef.category === 'shield') {
        qObj = CC.shields.generate(this.stageDef.id);
      } else {
        qObj = CC.missions.generate(this.stageDef.id);
      }

      this.currentQuestion = qObj;

      this.panel.title.textContent = qObj.title;
      this.panel.prompt.innerHTML = qObj.prompt;

      this.grid.setup(qObj.gridConfig || { min: -10, max: 10, step: 1 });
      this.updateHud();

      qObj.init(this, this.grid);

      this.startTimer();
    }

    startTimer() {
      this.stopTimer();
      if (!this.hasTimer) {
        this.threat.wrap.classList.add('hidden');
        return;
      }

      this.threat.wrap.classList.remove('hidden');
      const timeLimit = this.isBoss ? 22 : 18;
      let timeLeft = timeLimit;

      this.threat.time.textContent = `${timeLeft}s`;
      this.threat.ship.style.left = '0%';
      this.threat.wrap.classList.remove('danger');

      this.timerInterval = setInterval(() => {
        timeLeft--;
        this.threat.time.textContent = `${timeLeft}s`;
        const pct = ((timeLimit - timeLeft) / timeLimit) * 88;
        this.threat.ship.style.left = `${pct}%`;

        if (timeLeft <= 5) {
          this.threat.wrap.classList.add('danger');
        }

        if (timeLeft <= 0) {
          this.stopTimer();
          this.handleTimeout();
        }
      }, 1000);
    }

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    }

    handleTimeout() {
      if (this.isAnswering) return;
      this.isAnswering = true;
      this.grid.disableClick();
      CC.sound.play('wrong');

      if (!CC.isPracticeMode) {
        this.shields--;
        this.streak = 0;
        this.hud.shields.classList.add('hit');
        setTimeout(() => this.hud.shields.classList.remove('hit'), 500);
      }

      this.updateHud();

      this.panel.feedback.className = 'feedback bad';
      this.panel.feedback.innerHTML = `
        <div class="fb-head">⏰ Time Expired! Station Hit!</div>
        <div class="hint">The incoming craft breached our defenses before coordinates could be secured.</div>
        <div class="next-row">
          <button id="nextQBtn" class="btn-primary" type="button">Next Mission ➔</button>
        </div>
      `;
      document.getElementById('nextQBtn').onclick = () => {
        this.qIndex++;
        this.nextQuestion();
      };
    }

    handleAnswer({ isCorrect, render }) {
      if (this.isAnswering) return;
      this.isAnswering = true;
      this.stopTimer();
      this.grid.disableClick();

      let ptsAwarded = 0;

      if (isCorrect) {
        this.correctCount++;
        this.streak++;
        const multiplier = this.streak >= 3 ? 2 : 1;
        ptsAwarded = 100 * multiplier;
        this.score += ptsAwarded;
        CC.sound.play('correct');

        if (this.isBoss) {
          this.bossHp--;
          this.boss.wrap.classList.add('hit');
          setTimeout(() => this.boss.wrap.classList.remove('hit'), 450);
          this.updateBoss();
        }

        if (this.isExam && this.currentTopic) {
          this.topicBreakdown[this.currentTopic].correct++;
        }
      } else {
        this.streak = 0;
        CC.sound.play('wrong');
        if (!CC.isPracticeMode) {
          this.shields--;
          this.hud.shields.classList.add('hit');
          setTimeout(() => this.hud.shields.classList.remove('hit'), 500);
        }
      }

      this.updateHud();

      render(this.panel.feedback, isCorrect);

      if (isCorrect && ptsAwarded > 0) {
        const span = U.el('span', { class: 'pts', text: `+${ptsAwarded} pts!` });
        const head = this.panel.feedback.querySelector('.fb-head');
        if (head) head.append(span);
      }

      const nextDiv = U.el('div', { class: 'next-row' });
      const nextBtn = U.el('button', {
        id: 'nextQBtn',
        class: 'btn-primary',
        type: 'button',
        text: this.qIndex + 1 >= this.totalQuestions || (!CC.isPracticeMode && this.shields <= 0) || (this.isBoss && this.bossHp <= 0)
          ? 'View Mission Results ➔'
          : 'Continue ➔'
      });

      nextBtn.onclick = () => {
        this.qIndex++;
        this.nextQuestion();
      };

      nextDiv.append(nextBtn);
      this.panel.feedback.append(nextDiv);
      nextBtn.focus();
    }

    finishLevel() {
      this.stopTimer();
      CC.setScreen('results');

      if (this.isExam) {
        CC.exam.showReport({
          score: this.score,
          totalQuestions: this.totalQuestions,
          correctCount: this.correctCount,
          topicBreakdown: this.topicBreakdown,
          onDone: () => {
            this.onComplete({ passed: this.correctCount >= 8, score: this.score });
            CC.setScreen('menu');
          }
        });
        return;
      }

      const card = document.getElementById('resultsCard');
      const passed = this.correctCount >= 8 && (CC.isPracticeMode || this.shields > 0);

      if (passed) {
        CC.sound.play('levelUp');
      } else {
        CC.sound.play('fail');
      }

      card.innerHTML = `
        <div class="big-emoji">${passed ? '🎉' : '💥'}</div>
        <h2>${passed ? 'Mission Complete!' : 'Mission Failed!'}</h2>
        <p>${passed
          ? `Outstanding tactical navigation, Commander! You scored <b>${this.correctCount}/${this.totalQuestions}</b> correct.`
          : `Station defenses depleted or accuracy below 8/10 (${this.correctCount}/${this.totalQuestions}). Regroup and try again!`
        }</p>

        <div class="stats">
          <div class="stat"><b>${this.correctCount}/${this.totalQuestions}</b>Accuracy</div>
          <div class="stat"><b>${this.score}</b>Score</div>
          <div class="stat"><b>${passed ? 'SUCCESS' : 'RETRY'}</b>Status</div>
        </div>

        <div class="btn-row">
          ${passed
            ? `<button id="resContinueBtn" class="btn-primary" type="button">Mission Map ➔</button>`
            : `<button id="resRetryBtn" class="btn-primary" type="button">Try Again 🔁</button>
               <button id="resMapBtn" type="button">Back to Map</button>`
          }
        </div>
      `;

      if (passed) {
        document.getElementById('resContinueBtn').onclick = () => {
          this.onComplete({ passed: true, score: this.score });
          CC.setScreen('menu');
        };
      } else {
        document.getElementById('resRetryBtn').onclick = () => {
          CC.setScreen('game');
          this.startLevel(this.stageDef, this.onComplete);
        };
        document.getElementById('resMapBtn').onclick = () => {
          CC.setScreen('menu');
        };
      }
    }

    quit() {
      this.stopTimer();
      CC.setScreen('menu');
    }
  }

  CC.GameEngine = GameEngine;
})();
