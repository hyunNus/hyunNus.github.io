/* ── TIL Page JS ── */
'use strict';

let currentFilter = 'all';
let currentSearch = '';
let currentSort = 'date-desc';

document.addEventListener('DOMContentLoaded', () => {
  // 날짜 기본값
  const dateInput = document.getElementById('new-til-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  // 카테고리 통계 업데이트
  updateCategoryStats();

  // TIL 렌더링
  renderTILs();

  // 필터 버튼 이벤트
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTILs();
    });
  });

  // 카테고리 통계 카드 클릭
  document.querySelectorAll('[data-filter-trigger]').forEach(card => {
    card.addEventListener('click', () => {
      const filter = card.dataset.filterTrigger;
      document.querySelectorAll('[data-filter]').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === filter);
      });
      currentFilter = filter;
      renderTILs();
    });
  });

  // 검색
  const searchInput = document.getElementById('til-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase();
      renderTILs();
    });
  }

  // 정렬
  const sortSelect = document.getElementById('til-sort');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderTILs();
    });
  }

  // 카테고리 선택 버튼
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('new-til-category').value = btn.dataset.cat;
    });
  });

  // 난이도 별점
  initDifficultyStars();
});

function updateCategoryStats() {
  const tils = SREData.getTILs();
  const total = tils.length;

  const counts = { dev: 0, paper: 0, stack: 0 };
  let totalXP = 0;
  tils.forEach(t => {
    counts[t.category] = (counts[t.category] || 0) + 1;
    totalXP += t.xp || 0;
  });

  // 카운트 업데이트
  ['dev', 'paper', 'stack'].forEach(cat => {
    const el = document.getElementById(`count-${cat}`);
    const bar = document.getElementById(`bar-${cat}`);
    if (el) animateCount(el, counts[cat]);
    if (bar && total > 0) bar.style.width = ((counts[cat] / total) * 100) + '%';
  });

  const xpEl = document.getElementById('count-total-xp');
  if (xpEl) animateCount(xpEl, totalXP);

  const label = document.getElementById('til-count-label');
  if (label) label.textContent = `${total} ENTRIES`;
}

function getFilteredTILs() {
  let tils = SREData.getTILs();

  // 카테고리 필터
  if (currentFilter !== 'all') {
    tils = tils.filter(t => t.category === currentFilter);
  }

  // 검색 필터
  if (currentSearch) {
    tils = tils.filter(t =>
      t.title.toLowerCase().includes(currentSearch) ||
      t.content.toLowerCase().includes(currentSearch) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(currentSearch))
    );
  }

  // 정렬
  tils.sort((a, b) => {
    switch (currentSort) {
      case 'date-asc':  return new Date(a.date) - new Date(b.date);
      case 'date-desc': return new Date(b.date) - new Date(a.date);
      case 'xp-desc':   return (b.xp || 0) - (a.xp || 0);
      case 'difficulty': return (b.difficulty || 0) - (a.difficulty || 0);
      default: return new Date(b.date) - new Date(a.date);
    }
  });

  return tils;
}

function renderTILs() {
  const grid = document.getElementById('til-grid');
  const empty = document.getElementById('til-empty');
  if (!grid) return;

  const tils = getFilteredTILs();

  if (tils.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = tils.map(til => renderTILCard(til)).join('');

  // 카드 클릭 이벤트
  grid.querySelectorAll('.til-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.id);
      openTILDetail(id);
    });
  });
}

function renderTILCard(til) {
  const cat = CATEGORY_COLORS[til.category] || CATEGORY_COLORS.dev;
  const tags = (til.tags || []).slice(0, 3).map(t =>
    `<span class="til-card-tag">${t}</span>`
  ).join('');
  const stars = Array.from({length: 5}, (_, i) =>
    `<span class="star ${i < (til.difficulty||0) ? 'filled' : ''}">★</span>`
  ).join('');

  return `
    <div class="til-card category-${til.category} reveal" data-id="${til.id}">
      <div class="til-card-top">
        <span class="pixel-tag ${cat.cls}">${cat.label}</span>
        <span class="til-card-date">${formatDate(til.date)}</span>
      </div>
      <div class="til-card-title">${til.title}</div>
      <div class="til-card-content">${til.content}</div>
      <div class="til-card-bottom">
        <div class="til-card-tags">${tags}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="til-difficulty star-rating">${stars}</div>
          <span class="til-card-xp">+${til.xp}XP</span>
        </div>
      </div>
    </div>
  `;
}

function openTILDetail(id) {
  const tils = SREData.getTILs();
  const til = tils.find(t => t.id === id);
  if (!til) return;

  const cat = CATEGORY_COLORS[til.category] || CATEGORY_COLORS.dev;
  const stars = renderStars(til.difficulty || 0);
  const tags = (til.tags || []).map(t =>
    `<span class="pixel-tag ${cat.cls}">${t}</span>`
  ).join('');

  const content = document.getElementById('til-detail-content');
  content.innerHTML = `
    <div class="til-detail-header">
      <div class="til-detail-meta">
        <span class="pixel-tag ${cat.cls}">${cat.label}</span>
        <span class="font-pixel text-muted" style="font-size:7px;">${formatDate(til.date)}</span>
        <span class="font-pixel text-gold" style="font-size:8px;">+${til.xp} XP</span>
      </div>
      <div class="til-detail-title">${til.title}</div>
      <div class="star-rating">${stars}</div>
    </div>

    <div class="til-detail-content">${til.content}</div>

    <div class="til-detail-tags">${tags}</div>

    <div style="margin-top:var(--gap-lg);display:flex;gap:var(--gap-sm);">
      <button class="btn-pixel btn-cyan" onclick="deleteTIL(${til.id})">DELETE</button>
      <button class="btn-pixel" onclick="closeModal('modal-til-detail')">CLOSE</button>
    </div>
  `;

  openModal('modal-til-detail');
}

function openNewTILModal() {
  // 폼 초기화
  document.getElementById('new-til-title').value = '';
  document.getElementById('new-til-content').value = '';
  document.getElementById('new-til-tags').value = '';
  document.getElementById('new-til-category').value = 'dev';
  document.getElementById('new-til-difficulty').value = '3';
  document.getElementById('new-til-date').value = new Date().toISOString().split('T')[0];

  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('.cat-btn[data-cat="dev"]').classList.add('active');

  initDifficultyStars(3);

  openModal('modal-new-til');
}

function saveTIL() {
  const title = document.getElementById('new-til-title').value.trim();
  const content = document.getElementById('new-til-content').value.trim();
  const category = document.getElementById('new-til-category').value;
  const tagsRaw = document.getElementById('new-til-tags').value;
  const difficulty = parseInt(document.getElementById('new-til-difficulty').value) || 3;
  const date = document.getElementById('new-til-date').value;

  if (!title) { showToast('제목을 입력하세요!', 'error'); return; }
  if (!content) { showToast('내용을 입력하세요!', 'error'); return; }

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const xpMap = { 1: 10, 2: 15, 3: 20, 4: 30, 5: 40 };
  const xp = xpMap[difficulty] || 20;

  const tils = SREData.getTILs();
  const newTIL = {
    id: Date.now(),
    title, category, tags, date, content, difficulty, xp
  };

  tils.unshift(newTIL);
  SREData.saveTILs(tils);

  XPSystem.addXP(xp, `TIL 작성: ${title.slice(0, 20)}`);

  closeModal('modal-new-til');
  updateCategoryStats();
  renderTILs();

  showToast(`TIL 저장 완료! +${xp}XP`, 'xp');
}

function deleteTIL(id) {
  if (!confirm('이 TIL을 삭제하시겠습니까?')) return;
  let tils = SREData.getTILs();
  tils = tils.filter(t => t.id !== id);
  SREData.saveTILs(tils);
  closeModal('modal-til-detail');
  updateCategoryStats();
  renderTILs();
  showToast('TIL 삭제됨', 'info');
}

function initDifficultyStars(defaultVal = 3) {
  const stars = document.querySelectorAll('.diff-star');
  const input = document.getElementById('new-til-difficulty');

  function updateStars(val) {
    stars.forEach(s => {
      s.classList.toggle('active', parseInt(s.dataset.val) <= val);
    });
    if (input) input.value = val;
  }

  updateStars(defaultVal);

  stars.forEach(star => {
    star.addEventListener('click', () => updateStars(parseInt(star.dataset.val)));
    star.addEventListener('mouseenter', () => {
      stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.val) <= parseInt(star.dataset.val)));
    });
  });

  const container = document.getElementById('difficulty-select');
  if (container) {
    container.addEventListener('mouseleave', () => {
      updateStars(parseInt(input?.value || 3));
    });
  }
}
