/* Sound effects made with the Web Audio API (no sound files needed). OFF by default. */
(function () {
  'use strict';
  const CC = (window.CC = window.CC || {});
  let ctx = null;
  let enabled = false;
  try { enabled = localStorage.getItem('cc-sound') === 'on'; } catch (e) { /* storage blocked */ }

  function ac() {
    if (!ctx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      ctx = new A();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
    const a = ac();
    if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noise(dur, vol = 0.2) {
    const a = ac();
    if (!a) return;
    const len = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const s = a.createBufferSource();
    s.buffer = buf;
    const g = a.createGain();
    g.gain.value = vol;
    s.connect(g).connect(a.destination);
    s.start();
  }

  const fx = {
    laser: () => tone(1400, 0.22, 'square', 0.05, 220),
    boom: () => noise(0.45, 0.3),
    correct: () => { tone(660, 0.12, 'triangle', 0.15); tone(990, 0.2, 'triangle', 0.15, null, 0.1); },
    wrong: () => tone(170, 0.35, 'sawtooth', 0.07, 90),
    warp: () => tone(180, 0.9, 'sine', 0.12, 1500),
    click: () => tone(520, 0.06, 'square', 0.04),
    levelUp: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.15, null, i * 0.12)),
    fail: () => [400, 300, 200].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.06, null, i * 0.2)),
  };

  CC.sound = {
    get enabled() { return enabled; },
    toggle() {
      enabled = !enabled;
      try { localStorage.setItem('cc-sound', enabled ? 'on' : 'off'); } catch (e) { /* ignore */ }
      if (enabled) { ac(); fx.click(); }
      return enabled;
    },
    play(name) {
      if (!enabled || !fx[name]) return;
      try { fx[name](); } catch (e) { /* ignore audio errors */ }
    },
  };
})();
