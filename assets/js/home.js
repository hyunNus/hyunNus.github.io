/* ── Home Page JS ── */
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // 배경 파티클
  const canvas = document.getElementById('bg-canvas');
  if (canvas) {
    const pixelParticle = new PixelParticle(canvas);
    document.addEventListener('click', (e) => {
      pixelParticle.spawnParticle(e.clientX, e.clientY);
    });
  }

  // 통계 로드
  loadStats();

  // 최근 TIL 렌더링
  renderRecentTIL();

  // 히트맵 생성
  generateHeatmap();
});

function loadStats() {
  const tils = SREData.getTILs();
  const books = SREData.getBooks();
  const xpData = XPSystem.getData();

  const completedBooks = books.filter(b => b.status === 'completed').length;
  const totalXP = tils.reduce((s, t) => s + (t.xp || 0), 0) +
                  books.filter(b => b.status === 'completed').reduce((s, b) => s + (b.xp || 0), 0);

  // 애니메이션 카운트
  const statEls = {
    'stat-til':    tils.length,
    'stat-books':  completedBooks,
    'stat-xp':     totalXP,
    'stat-streak': xpData.streak || 1
  };

  Object.entries(statEls).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) {
      setTimeout(() => animateCount(el, val), 300);
    }
  });
}

function renderRecentTIL() {
  const container = document.getElementById('recent-til-grid');
  if (!container) return;

  const tils = SREData.getTILs().slice(0, 6);
  container.innerHTML = tils.map(til => {
    const cat = CATEGORY_COLORS[til.category] || CATEGORY_COLORS.dev;
    const tags = (til.tags || []).slice(0, 2).map(t =>
      `<span class="til-tag">${t}</span>`
    ).join('');

    return `
      <div class="til-preview-card reveal" onclick="window.location='pages/til/index.html'">
        <div class="til-card-meta">
          <span class="pixel-tag ${cat.cls}">${cat.label}</span>
          <span class="font-pixel text-muted" style="font-size:7px;">${timeAgo(til.date)}</span>
        </div>
        <div class="til-card-title">${til.title}</div>
        <div class="til-card-excerpt">${til.content}</div>
        <div class="til-card-footer">
          <div class="til-tags">${tags}</div>
          <span class="font-pixel text-gold" style="font-size:7px;">+${til.xp}XP</span>
        </div>
      </div>
    `;
  }).join('');
}

function generateHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;

  const tils = SREData.getTILs();
  const books = SREData.getBooks();

  // 날짜별 활동 맵
  const activityMap = {};
  tils.forEach(t => {
    if (t.date) activityMap[t.date] = (activityMap[t.date] || 0) + 1;
  });
  books.forEach(b => {
    if (b.endDate) activityMap[b.endDate] = (activityMap[b.endDate] || 0) + 1;
  });

  // 52주 × 7일 = 364일 생성
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 363);

  let totalActivities = 0;
  const cells = [];

  for (let i = 0; i < 364; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    const count = activityMap[key] || 0;
    totalActivities += count;

    let level = 0;
    if (count === 1) level = 1;
    else if (count === 2) level = 2;
    else if (count === 3) level = 3;
    else if (count >= 4) level = 4;

    cells.push({ key, count, level, date: d });
  }

  grid.innerHTML = cells.map(cell => `
    <div class="heatmap-cell level-${cell.level}"
         data-tooltip="${cell.key}: ${cell.count} activities"
         title="${cell.key}"></div>
  `).join('');

  const totalEl = document.getElementById('activity-total');
  if (totalEl) totalEl.textContent = `${totalActivities} ACTIVITIES`;
}
