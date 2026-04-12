/* ============================================
   SRE - Pixel Core JS
   공통 유틸리티 및 인터랙션
   ============================================ */

'use strict';

// ── 픽셀 파티클 시스템 ──
class PixelParticle {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.stars = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initStars();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initStars() {
    const count = Math.floor((this.canvas.width * this.canvas.height) / 8000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() < 0.7 ? 1 : 2,
        opacity: Math.random(),
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        twinkleDir: Math.random() > 0.5 ? 1 : -1,
        color: this.randomStarColor()
      });
    }
  }

  randomStarColor() {
    const colors = ['#ffd700', '#00d4ff', '#ff6b9d', '#b44fff', '#ffffff'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  spawnParticle(x, y) {
    const colors = ['#ffd700', '#00d4ff', '#ff6b9d', '#39ff14', '#b44fff'];
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 2,
        size: 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.05 + Math.random() * 0.05
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw stars
    this.stars.forEach(star => {
      star.opacity += star.twinkleSpeed * star.twinkleDir;
      if (star.opacity >= 1 || star.opacity <= 0.1) star.twinkleDir *= -1;
      this.ctx.globalAlpha = star.opacity;
      this.ctx.fillStyle = star.color;
      this.ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // Draw particles
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= p.decay;
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    this.ctx.globalAlpha = 1;
    requestAnimationFrame(() => this.animate());
  }
}

// ── 토스트 알림 ──
function showToast(message, type = 'success') {
  const existing = document.querySelector('.pixel-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'pixel-toast';
  const colors = { success: '#39ff14', error: '#ff6b9d', info: '#00d4ff', xp: '#ffd700' };
  toast.style.borderColor = colors[type] || colors.success;
  toast.style.color = colors[type] || colors.success;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  });
}

// ── XP 시스템 ──
const XPSystem = {
  key: 'sre_xp_data',

  getData() {
    const raw = localStorage.getItem(this.key);
    return raw ? JSON.parse(raw) : { xp: 0, level: 1, totalTIL: 0, totalBooks: 0, streak: 0, lastVisit: null };
  },

  save(data) {
    localStorage.setItem(this.key, JSON.stringify(data));
  },

  addXP(amount, reason) {
    const data = this.getData();
    data.xp += amount;
    const xpPerLevel = 100;
    const newLevel = Math.floor(data.xp / xpPerLevel) + 1;
    const leveledUp = newLevel > data.level;
    data.level = newLevel;
    this.save(data);

    showToast(`+${amount} XP | ${reason}`, 'xp');
    if (leveledUp) {
      setTimeout(() => showToast(`LEVEL UP! Lv.${newLevel}`, 'xp'), 1500);
    }
    this.updateUI(data);
    return data;
  },

  checkStreak() {
    const data = this.getData();
    const today = new Date().toDateString();
    if (data.lastVisit !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (data.lastVisit === yesterday) {
        data.streak += 1;
        if (data.streak % 7 === 0) this.addXP(50, `${data.streak}일 연속 방문!`);
      } else if (data.lastVisit !== today) {
        data.streak = 1;
      }
      data.lastVisit = today;
      this.save(data);
    }
    return data;
  },

  updateUI(data) {
    const xpNeeded = 100;
    const currentXP = data.xp % xpNeeded;
    const pct = (currentXP / xpNeeded) * 100;

    document.querySelectorAll('.xp-fill').forEach(el => {
      el.style.width = pct + '%';
    });
    document.querySelectorAll('.xp-current').forEach(el => {
      el.textContent = currentXP;
    });
    document.querySelectorAll('.xp-total').forEach(el => {
      el.textContent = data.xp;
    });
    document.querySelectorAll('.player-level').forEach(el => {
      el.textContent = data.level;
    });
    document.querySelectorAll('.player-streak').forEach(el => {
      el.textContent = data.streak;
    });
  },

  init() {
    const data = this.checkStreak();
    this.updateUI(data);
  }
};

// ── 로컬 스토리지 데이터 관리 ──
const SREData = {
  getTILs() {
    const raw = localStorage.getItem('sre_tils');
    return raw ? JSON.parse(raw) : getSampleTILs();
  },
  saveTILs(data) {
    localStorage.setItem('sre_tils', JSON.stringify(data));
  },
  getBooks() {
    const raw = localStorage.getItem('sre_books');
    return raw ? JSON.parse(raw) : getSampleBooks();
  },
  saveBooks(data) {
    localStorage.setItem('sre_books', JSON.stringify(data));
  }
};

// ── 샘플 TIL 데이터 ──
function getSampleTILs() {
  return [
    {
      id: 1,
      title: "Transformer Attention Mechanism 완전 분석",
      category: "paper",
      tags: ["NLP", "Attention", "Deep Learning"],
      date: "2025-04-10",
      content: "Self-Attention의 Q, K, V 행렬 연산 원리와 Multi-Head Attention의 병렬 처리 방식을 분석했다. Scaled Dot-Product Attention에서 √dk로 나누는 이유는 gradient vanishing 방지를 위함이다.",
      difficulty: 4,
      xp: 30
    },
    {
      id: 2,
      title: "Python asyncio 비동기 패턴 정리",
      category: "dev",
      tags: ["Python", "asyncio", "Backend"],
      date: "2025-04-09",
      content: "async/await 패턴, event loop 동작 원리, aiohttp를 활용한 비동기 HTTP 요청 처리. gather()와 wait()의 차이점을 실험을 통해 확인했다.",
      difficulty: 3,
      xp: 20
    },
    {
      id: 3,
      title: "PyTorch DataLoader 최적화 기법",
      category: "stack",
      tags: ["PyTorch", "ML", "Performance"],
      date: "2025-04-08",
      content: "num_workers, pin_memory, prefetch_factor 설정으로 데이터 로딩 병목을 해결했다. GPU 메모리 전송 최적화를 통해 학습 속도 40% 향상을 달성했다.",
      difficulty: 3,
      xp: 25
    },
    {
      id: 4,
      title: "RAG 시스템 구축: Vector DB 선택 기준",
      category: "dev",
      tags: ["RAG", "Vector DB", "LLM"],
      date: "2025-04-07",
      content: "Pinecone, Weaviate, Chroma, FAISS 비교 분석. 로컬 개발에는 Chroma, 프로덕션에는 Pinecone이 적합. Embedding 모델 선택이 검색 품질에 미치는 영향을 실험했다.",
      difficulty: 4,
      xp: 30
    },
    {
      id: 5,
      title: "LoRA Fine-tuning 이론과 실습",
      category: "paper",
      tags: ["LoRA", "Fine-tuning", "LLM"],
      date: "2025-04-05",
      content: "Low-Rank Adaptation의 수학적 원리: W = W0 + BA (r << min(d,k)). 파라미터 효율성을 유지하면서 도메인 특화 성능을 높이는 방법론을 정리했다.",
      difficulty: 5,
      xp: 40
    },
    {
      id: 6,
      title: "Docker Compose로 ML 환경 구성",
      category: "stack",
      tags: ["Docker", "MLOps", "DevOps"],
      date: "2025-04-03",
      content: "GPU 지원 Docker 환경 구성, CUDA 버전 호환성 관리, 볼륨 마운트를 통한 데이터 영속성 확보. nvidia-docker2 설치부터 compose 파일 작성까지 전 과정 정리.",
      difficulty: 3,
      xp: 20
    },
    {
      id: 7,
      title: "Graph Neural Network 기초 이론",
      category: "paper",
      tags: ["GNN", "Graph", "Deep Learning"],
      date: "2025-04-01",
      content: "Message Passing Neural Network의 aggregation 함수 설계 원칙. GCN, GAT, GraphSAGE 비교. 분자 구조 예측과 소셜 네트워크 분석 응용 사례 정리.",
      difficulty: 5,
      xp: 40
    },
    {
      id: 8,
      title: "FastAPI 비동기 엔드포인트 설계",
      category: "dev",
      tags: ["FastAPI", "Python", "API"],
      date: "2025-03-30",
      content: "Pydantic v2 모델 정의, 의존성 주입 패턴, 미들웨어 구성. Background Tasks를 활용한 비동기 작업 처리와 WebSocket 통신 구현.",
      difficulty: 3,
      xp: 20
    }
  ];
}

// ── 샘플 도서 데이터 ──
function getSampleBooks() {
  return [
    {
      id: 1,
      title: "딥러닝",
      author: "이안 굿펠로우 외",
      category: "tech",
      status: "completed",
      rating: 5,
      pages: 800,
      currentPage: 800,
      startDate: "2025-01-15",
      endDate: "2025-03-20",
      review: "딥러닝의 수학적 기초부터 최신 아키텍처까지 망라한 바이블. 수식이 많지만 직관적 설명이 훌륭하다.",
      tags: ["ML", "Deep Learning", "Math"],
      xp: 80
    },
    {
      id: 2,
      title: "클린 코드",
      author: "로버트 C. 마틴",
      category: "dev",
      status: "completed",
      rating: 4,
      pages: 464,
      currentPage: 464,
      startDate: "2025-02-01",
      endDate: "2025-02-28",
      review: "코드 가독성과 유지보수성에 대한 실용적 지침. 함수 길이, 네이밍 컨벤션, 주석 작성 원칙이 인상적이었다.",
      tags: ["Software Engineering", "Best Practices"],
      xp: 50
    },
    {
      id: 3,
      title: "밑바닥부터 시작하는 딥러닝 3",
      author: "사이토 고키",
      category: "tech",
      status: "reading",
      rating: 0,
      pages: 380,
      currentPage: 220,
      startDate: "2025-03-25",
      endDate: null,
      review: "",
      tags: ["PyTorch", "Deep Learning", "Framework"],
      xp: 0
    },
    {
      id: 4,
      title: "프로그래머의 뇌",
      author: "펠리너 헤르만스",
      category: "growth",
      status: "completed",
      rating: 5,
      pages: 296,
      currentPage: 296,
      startDate: "2025-03-01",
      endDate: "2025-03-22",
      review: "인지과학 관점에서 코드 학습과 이해를 분석한 책. 청킹, 작업 기억, 장기 기억 활용법이 실질적으로 도움이 됐다.",
      tags: ["Cognitive Science", "Learning", "Programming"],
      xp: 40
    },
    {
      id: 5,
      title: "LLM을 활용한 AI 애플리케이션 개발",
      author: "발렌티나 알토",
      category: "tech",
      status: "wishlist",
      rating: 0,
      pages: 350,
      currentPage: 0,
      startDate: null,
      endDate: null,
      review: "",
      tags: ["LLM", "RAG", "Application"],
      xp: 0
    },
    {
      id: 6,
      title: "사피엔스",
      author: "유발 하라리",
      category: "general",
      status: "completed",
      rating: 5,
      pages: 636,
      currentPage: 636,
      startDate: "2025-01-01",
      endDate: "2025-01-30",
      review: "인류 역사를 거시적 관점에서 바라보는 통찰. AI 시대를 이해하는 데 역사적 맥락을 제공한다.",
      tags: ["History", "Anthropology", "Philosophy"],
      xp: 60
    }
  ];
}

// ── 날짜 포맷 유틸 ──
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'TODAY';
  if (days === 1) return '1D AGO';
  if (days < 7) return `${days}D AGO`;
  if (days < 30) return `${Math.floor(days/7)}W AGO`;
  return `${Math.floor(days/30)}M AGO`;
}

// ── 별점 렌더링 ──
function renderStars(rating, max = 5) {
  return Array.from({length: max}, (_, i) =>
    `<span class="star ${i < rating ? 'filled' : ''}">★</span>`
  ).join('');
}

// ── 카테고리 색상 ──
const CATEGORY_COLORS = {
  dev:   { label: 'DEV',   cls: 'tag-dev',   color: '#00d4ff' },
  paper: { label: 'PAPER', cls: 'tag-paper', color: '#b44fff' },
  stack: { label: 'STACK', cls: 'tag-stack', color: '#ff8c42' },
  book:  { label: 'BOOK',  cls: 'tag-book',  color: '#ff6b9d' },
  tech:  { label: 'TECH',  cls: 'tag-dev',   color: '#00d4ff' },
  growth:{ label: 'GROWTH',cls: 'tag-stack', color: '#ff8c42' },
  general:{ label: 'GEN',  cls: 'tag-paper', color: '#b44fff' }
};

// ── 스크롤 탑 버튼 ──
function initScrollTop() {
  const btn = document.querySelector('.scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ── 네비게이션 모바일 메뉴 ──
function initNavMenu() {
  const btn = document.querySelector('.nav-menu-btn');
  const links = document.querySelector('.nav-links');
  if (!btn || !links) return;
  btn.addEventListener('click', () => links.classList.toggle('open'));
}

// ── 활성 네비게이션 링크 ──
function setActiveNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (path.endsWith(href) || (href === 'index.html' && (path === '/' || path.endsWith('/')))) {
      a.classList.add('active');
    }
  });
}

// ── 숫자 카운트업 애니메이션 ──
function animateCount(el, target, duration = 1500) {
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  };
  requestAnimationFrame(update);
}

// ── Intersection Observer (진입 애니메이션) ──
function initRevealAnimation() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';

        // 숫자 카운트업
        const countEl = entry.target.querySelector('[data-count]');
        if (countEl) {
          animateCount(countEl, parseInt(countEl.dataset.count));
        }
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s, transform 0.5s';
    observer.observe(el);
  });
}

// ── 모달 시스템 ──
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add('open');
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('open');
}

// ── 초기화 ──
document.addEventListener('DOMContentLoaded', () => {
  XPSystem.init();
  initScrollTop();
  initNavMenu();
  setActiveNav();
  initRevealAnimation();

  // 모달 오버레이 클릭 닫기
  document.querySelectorAll('.pixel-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // 모달 닫기 버튼
  document.querySelectorAll('.pixel-modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.pixel-modal-overlay').classList.remove('open');
    });
  });
});
