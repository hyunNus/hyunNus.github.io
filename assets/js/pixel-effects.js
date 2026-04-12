/* ============================================
   SRE - Pixel Effects & Animations
   추가 시각 효과 및 인터랙션
   ============================================ */

'use strict';

// ── 픽셀 레인 효과 (Matrix 스타일) ──
class PixelRain {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.chars = options.chars || '01アイウエオカキクケコABCDEF◆◇◈◉';
    this.fontSize = options.fontSize || 12;
    this.color = options.color || '#39ff14';
    this.opacity = options.opacity || 0.05;
    this.columns = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    const cols = Math.floor(this.canvas.width / this.fontSize);
    this.columns = Array.from({length: cols}, () => Math.random() * -100);
  }

  draw() {
    this.ctx.fillStyle = `rgba(26,26,46,${this.opacity})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = this.color;
    this.ctx.font = `${this.fontSize}px "Press Start 2P", monospace`;

    this.columns.forEach((y, i) => {
      const char = this.chars[Math.floor(Math.random() * this.chars.length)];
      const x = i * this.fontSize;
      this.ctx.fillText(char, x, y * this.fontSize);

      if (y * this.fontSize > this.canvas.height && Math.random() > 0.975) {
        this.columns[i] = 0;
      }
      this.columns[i] += 0.5;
    });
  }

  start() {
    this.interval = setInterval(() => this.draw(), 50);
  }

  stop() {
    clearInterval(this.interval);
  }
}

// ── 픽셀 글리치 효과 ──
function applyGlitch(element, duration = 200) {
  const original = element.textContent;
  const chars = '!@#$%^&*◆◇◈░▓▒';
  let count = 0;
  const interval = setInterval(() => {
    element.textContent = original.split('').map(c =>
      Math.random() > 0.8 ? chars[Math.floor(Math.random() * chars.length)] : c
    ).join('');
    count += 50;
    if (count >= duration) {
      element.textContent = original;
      clearInterval(interval);
    }
  }, 50);
}

// ── 타이핑 효과 ──
function typewriterEffect(element, text, speed = 50) {
  element.textContent = '';
  let i = 0;
  const cursor = document.createElement('span');
  cursor.className = 'blink';
  cursor.textContent = '█';
  element.appendChild(cursor);

  const interval = setInterval(() => {
    if (i < text.length) {
      cursor.before(text[i]);
      i++;
    } else {
      clearInterval(interval);
      setTimeout(() => cursor.remove(), 1000);
    }
  }, speed);
}

// ── 픽셀 폭발 효과 ──
function pixelExplode(x, y, color = '#ffd700', count = 12) {
  const container = document.body;
  const particles = [];

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const angle = (i / count) * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    const size = 4 + Math.random() * 4;

    p.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      pointer-events: none;
      z-index: 9999;
      image-rendering: pixelated;
    `;
    container.appendChild(p);
    particles.push({ el: p, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1 });
  }

  let frame = 0;
  function animate() {
    frame++;
    let alive = false;
    particles.forEach(p => {
      p.life -= 0.05;
      if (p.life <= 0) { p.el.remove(); return; }
      alive = true;
      const rect = p.el.getBoundingClientRect();
      p.el.style.left = (parseFloat(p.el.style.left) + p.vx) + 'px';
      p.el.style.top = (parseFloat(p.el.style.top) + p.vy) + 'px';
      p.vy += 0.2;
      p.el.style.opacity = p.life;
    });
    if (alive) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// ── 픽셀 노이즈 배경 ──
function generatePixelNoise(canvas, density = 0.02) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.createImageData(w, h);

  for (let i = 0; i < imageData.data.length; i += 4) {
    if (Math.random() < density) {
      const brightness = Math.random() * 50;
      imageData.data[i] = brightness;
      imageData.data[i+1] = brightness;
      imageData.data[i+2] = brightness * 2;
      imageData.data[i+3] = Math.random() * 100;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ── 스크롤 진행 표시바 ──
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent-gold), var(--accent-cyan));
    z-index: 200;
    transition: width 0.1s;
    width: 0%;
  `;
  document.body.appendChild(bar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = pct + '%';
  });
}

// ── 픽셀 커서 트레일 ──
function initCursorTrail() {
  const trail = [];
  const trailLength = 8;

  for (let i = 0; i < trailLength; i++) {
    const dot = document.createElement('div');
    const size = (trailLength - i) * 2;
    dot.style.cssText = `
      position: fixed;
      width: ${size}px;
      height: ${size}px;
      background: var(--accent-gold);
      pointer-events: none;
      z-index: 9998;
      opacity: ${(trailLength - i) / trailLength * 0.6};
      image-rendering: pixelated;
      transition: none;
    `;
    document.body.appendChild(dot);
    trail.push({ el: dot, x: 0, y: 0 });
  }

  let mouseX = 0, mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function updateTrail() {
    trail[0].x = mouseX;
    trail[0].y = mouseY;

    for (let i = 1; i < trail.length; i++) {
      trail[i].x += (trail[i-1].x - trail[i].x) * 0.4;
      trail[i].y += (trail[i-1].y - trail[i].y) * 0.4;
    }

    trail.forEach((t, i) => {
      const size = (trailLength - i) * 2;
      t.el.style.left = (t.x - size/2) + 'px';
      t.el.style.top = (t.y - size/2) + 'px';
    });

    requestAnimationFrame(updateTrail);
  }
  updateTrail();
}

// ── 픽셀 사운드 (Web Audio API) ──
const PixelSound = {
  ctx: null,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) {}
  },

  play(freq = 440, duration = 0.1, type = 'square') {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  },

  click() { this.play(800, 0.05, 'square'); },
  hover() { this.play(600, 0.03, 'square'); },
  success() {
    this.play(523, 0.1, 'square');
    setTimeout(() => this.play(659, 0.1, 'square'), 100);
    setTimeout(() => this.play(784, 0.15, 'square'), 200);
  },
  error() { this.play(200, 0.2, 'sawtooth'); }
};

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();

  // 헤딩 글리치 효과
  document.querySelectorAll('h1').forEach(h => {
    h.addEventListener('mouseenter', () => applyGlitch(h, 300));
  });

  // 버튼 클릭 파티클
  document.querySelectorAll('.btn-pixel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      pixelExplode(e.clientX, e.clientY, '#ffd700', 8);
    });
  });

  // 픽셀 사운드 초기화 (사용자 인터랙션 후)
  document.addEventListener('click', () => {
    if (!PixelSound.ctx) PixelSound.init();
  }, { once: true });
});
