/* ── Life OS JS ── */
'use strict';

let bookStatusFilter = 'all';
let bookCatFilter = 'all';

const BOOK_EMOJIS = {
  tech: '🤖', dev: '💻', growth: '🌱', general: '📖'
};

const GENRE_COLORS = {
  tech:    { color: '#00d4ff', label: 'TECH' },
  dev:     { color: '#39ff14', label: 'DEV' },
  growth:  { color: '#ff8c42', label: 'GROWTH' },
  general: { color: '#b44fff', label: 'GENERAL' }
};

document.addEventListener('DOMContentLoaded', () => {
  updateReadingStats();
  renderCurrentlyReading();
  renderBookGrid();
  renderAnalytics();

  // 상태 필터
  document.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bookStatusFilter = btn.dataset.status;
      renderBookGrid();
    });
  });

  // 장르 필터
  document.querySelectorAll('[data-cat-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cat-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      bookCatFilter = btn.dataset.catFilter;
      renderBookGrid();
    });
  });

  // 별점 초기화
  initBookRatingStars();
});

function updateReadingStats() {
  const books = SREData.getBooks();
  const completed = books.filter(b => b.status === 'completed');
  const reading = books.filter(b => b.status === 'reading');
  const totalPages = completed.reduce((s, b) => s + (b.pages || 0), 0);
  const totalXP = completed.reduce((s, b) => s + (b.xp || 0), 0);

  const els = {
    'stat-completed': completed.length,
    'stat-reading':   reading.length,
    'stat-pages':     totalPages,
    'stat-book-xp':   totalXP
  };

  Object.entries(els).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) setTimeout(() => animateCount(el, val), 300);
  });
}

function renderCurrentlyReading() {
  const container = document.getElementById('currently-reading');
  if (!container) return;

  const reading = SREData.getBooks().filter(b => b.status === 'reading');

  if (reading.length === 0) {
    container.innerHTML = `
      <div class="pixel-card" style="grid-column:1/-1;text-align:center;padding:var(--gap-xl);">
        <p class="font-pixel text-muted" style="font-size:9px;">현재 읽고 있는 책이 없습니다</p>
        <button class="btn-pixel btn-pink" style="margin-top:16px;" onclick="openNewBookModal()">+ ADD BOOK</button>
      </div>
    `;
    return;
  }

  container.innerHTML = reading.map(book => {
    const pct = book.pages > 0 ? Math.round((book.currentPage / book.pages) * 100) : 0;
    const emoji = BOOK_EMOJIS[book.category] || '📖';
    const genreColor = GENRE_COLORS[book.category]?.color || '#00d4ff';

    return `
      <div class="reading-now-card" onclick="openBookDetail(${book.id})">
        <div class="book-cover-pixel" style="background:${genreColor}22;border-color:${genreColor};">
          ${emoji}
        </div>
        <div class="reading-now-info">
          <div>
            <span class="pixel-tag" style="font-size:7px;color:${genreColor};border-color:${genreColor};">${GENRE_COLORS[book.category]?.label || 'BOOK'}</span>
          </div>
          <div class="reading-now-title">${book.title}</div>
          <div class="reading-now-author">${book.author}</div>
          <div class="reading-progress-info">
            <span class="font-pixel text-muted" style="font-size:7px;">${book.currentPage} / ${book.pages} P</span>
            <span class="font-pixel" style="font-size:8px;color:${genreColor};">${pct}%</span>
          </div>
          <div class="pixel-progress" style="margin-top:4px;">
            <div class="pixel-progress-fill cyan" style="width:${pct}%;background:repeating-linear-gradient(90deg,${genreColor} 0,${genreColor} 8px,transparent 8px,transparent 10px);"></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function getFilteredBooks() {
  let books = SREData.getBooks();

  if (bookStatusFilter !== 'all') {
    books = books.filter(b => b.status === bookStatusFilter);
  }
  if (bookCatFilter !== 'all') {
    books = books.filter(b => b.category === bookCatFilter);
  }

  return books;
}

function renderBookGrid() {
  const grid = document.getElementById('book-grid');
  if (!grid) return;

  const books = getFilteredBooks();

  if (books.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:var(--gap-xl);">
        <p class="font-pixel text-muted" style="font-size:9px;">NO BOOKS FOUND</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = books.map(book => renderBookCard(book)).join('');

  grid.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', () => openBookDetail(parseInt(card.dataset.id)));
  });
}

function renderBookCard(book) {
  const emoji = BOOK_EMOJIS[book.category] || '📖';
  const genreColor = GENRE_COLORS[book.category]?.color || '#ff6b9d';
  const pct = book.pages > 0 ? Math.round((book.currentPage / book.pages) * 100) : 0;
  const stars = book.rating > 0 ? renderStars(book.rating) : '';

  const statusLabels = { completed: '완독', reading: '읽는 중', wishlist: '위시리스트' };
  const statusLabel = statusLabels[book.status] || book.status;

  return `
    <div class="book-card status-${book.status} reveal" data-id="${book.id}">
      <div class="book-card-cover" style="background:${genreColor}15;border-color:${genreColor}44;">
        ${emoji}
      </div>
      <div class="book-card-title">${book.title}</div>
      <div class="book-card-author">${book.author}</div>
      ${book.status === 'reading' ? `
        <div class="pixel-progress" style="height:8px;">
          <div class="pixel-progress-fill cyan" style="width:${pct}%;background:repeating-linear-gradient(90deg,${genreColor} 0,${genreColor} 6px,transparent 6px,transparent 8px);"></div>
        </div>
        <span class="font-pixel text-muted" style="font-size:7px;">${pct}% READ</span>
      ` : ''}
      ${book.rating > 0 ? `<div class="star-rating" style="font-size:12px;">${stars}</div>` : ''}
      <div class="book-card-status">
        <span class="status-badge status-${book.status}">${statusLabel}</span>
        <span class="pixel-tag" style="font-size:7px;color:${genreColor};border-color:${genreColor};">${GENRE_COLORS[book.category]?.label || 'BOOK'}</span>
      </div>
    </div>
  `;
}

function openBookDetail(id) {
  const books = SREData.getBooks();
  const book = books.find(b => b.id === id);
  if (!book) return;

  const emoji = BOOK_EMOJIS[book.category] || '📖';
  const genreColor = GENRE_COLORS[book.category]?.color || '#ff6b9d';
  const pct = book.pages > 0 ? Math.round((book.currentPage / book.pages) * 100) : 0;
  const stars = book.rating > 0 ? renderStars(book.rating) : '<span class="text-muted font-pixel" style="font-size:8px;">미평가</span>';
  const tags = (book.tags || []).map(t =>
    `<span class="pixel-tag" style="color:${genreColor};border-color:${genreColor};font-size:7px;">${t}</span>`
  ).join('');

  const statusLabels = { completed: '완독', reading: '읽는 중', wishlist: '위시리스트' };

  const content = document.getElementById('book-detail-content');
  content.innerHTML = `
    <div class="book-detail-header">
      <div class="book-detail-cover" style="background:${genreColor}15;border-color:${genreColor};">
        ${emoji}
      </div>
      <div class="book-detail-info">
        <div class="book-detail-title">${book.title}</div>
        <div class="book-detail-meta">
          <span class="font-vt" style="font-size:18px;color:var(--text-muted);">${book.author}</span>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="status-badge status-${book.status}">${statusLabels[book.status]}</span>
            <span class="pixel-tag" style="color:${genreColor};border-color:${genreColor};font-size:7px;">${GENRE_COLORS[book.category]?.label || 'BOOK'}</span>
          </div>
          <div class="star-rating">${stars}</div>
        </div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--gap-sm);margin-bottom:var(--gap-md);">
      <div class="stat-box" style="padding:8px;">
        <span class="stat-number" style="font-size:18px;color:${genreColor};">${book.pages}</span>
        <span class="stat-label">총 페이지</span>
      </div>
      <div class="stat-box" style="padding:8px;">
        <span class="stat-number" style="font-size:18px;color:var(--accent-gold);">${pct}%</span>
        <span class="stat-label">진행률</span>
      </div>
      <div class="stat-box" style="padding:8px;">
        <span class="stat-number" style="font-size:18px;color:var(--accent-pink);">${book.xp || 0}</span>
        <span class="stat-label">XP</span>
      </div>
    </div>

    ${book.status === 'reading' ? `
      <div style="margin-bottom:var(--gap-md);">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span class="font-pixel text-muted" style="font-size:7px;">READING PROGRESS</span>
          <span class="font-pixel" style="font-size:7px;color:${genreColor};">${book.currentPage} / ${book.pages}</span>
        </div>
        <div class="pixel-progress">
          <div class="pixel-progress-fill cyan" style="width:${pct}%;background:repeating-linear-gradient(90deg,${genreColor} 0,${genreColor} 8px,transparent 8px,transparent 10px);"></div>
        </div>
      </div>
    ` : ''}

    <div style="display:flex;gap:var(--gap-md);margin-bottom:var(--gap-md);font-family:var(--font-pixel);font-size:8px;color:var(--text-muted);">
      ${book.startDate ? `<span>START: ${formatDate(book.startDate)}</span>` : ''}
      ${book.endDate ? `<span>END: ${formatDate(book.endDate)}</span>` : ''}
    </div>

    ${book.review ? `
      <div class="book-detail-review">${book.review}</div>
    ` : ''}

    ${tags ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:var(--gap-md);">${tags}</div>` : ''}

    <div style="display:flex;gap:var(--gap-sm);margin-top:var(--gap-lg);">
      <button class="btn-pixel btn-pink" onclick="deleteBook(${book.id})">DELETE</button>
      <button class="btn-pixel" onclick="closeModal('modal-book-detail')">CLOSE</button>
    </div>
  `;

  openModal('modal-book-detail');
}

function openNewBookModal() {
  document.getElementById('new-book-title').value = '';
  document.getElementById('new-book-author').value = '';
  document.getElementById('new-book-pages').value = '';
  document.getElementById('new-book-current').value = '0';
  document.getElementById('new-book-tags').value = '';
  document.getElementById('new-book-review').value = '';
  document.getElementById('new-book-rating').value = '0';
  document.getElementById('new-book-start').value = '';
  document.getElementById('new-book-end').value = '';

  initBookRatingStars(0);
  openModal('modal-new-book');
}

function saveBook() {
  const title = document.getElementById('new-book-title').value.trim();
  const author = document.getElementById('new-book-author').value.trim();
  const category = document.getElementById('new-book-category').value;
  const status = document.getElementById('new-book-status').value;
  const pages = parseInt(document.getElementById('new-book-pages').value) || 0;
  const currentPage = parseInt(document.getElementById('new-book-current').value) || 0;
  const rating = parseInt(document.getElementById('new-book-rating').value) || 0;
  const tagsRaw = document.getElementById('new-book-tags').value;
  const review = document.getElementById('new-book-review').value.trim();
  const startDate = document.getElementById('new-book-start').value || null;
  const endDate = document.getElementById('new-book-end').value || null;

  if (!title) { showToast('제목을 입력하세요!', 'error'); return; }

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const xpMap = { completed: 50, reading: 0, wishlist: 0 };
  const xp = xpMap[status] || 0;

  const books = SREData.getBooks();
  const newBook = {
    id: Date.now(),
    title, author, category, status, pages, currentPage,
    rating, tags, review, startDate, endDate, xp
  };

  books.unshift(newBook);
  SREData.saveBooks(books);

  if (status === 'completed' && xp > 0) {
    XPSystem.addXP(xp, `독서 완료: ${title.slice(0, 20)}`);
  }

  closeModal('modal-new-book');
  updateReadingStats();
  renderCurrentlyReading();
  renderBookGrid();
  renderAnalytics();

  showToast(`책 추가 완료!${xp > 0 ? ` +${xp}XP` : ''}`, xp > 0 ? 'xp' : 'success');
}

function deleteBook(id) {
  if (!confirm('이 책을 삭제하시겠습니까?')) return;
  let books = SREData.getBooks();
  books = books.filter(b => b.id !== id);
  SREData.saveBooks(books);
  closeModal('modal-book-detail');
  updateReadingStats();
  renderCurrentlyReading();
  renderBookGrid();
  renderAnalytics();
  showToast('책 삭제됨', 'info');
}

function renderAnalytics() {
  renderMonthlyChart();
  renderGenreChart();
  renderReadingGoal();
}

function renderMonthlyChart() {
  const container = document.getElementById('monthly-chart');
  if (!container) return;

  const books = SREData.getBooks().filter(b => b.status === 'completed' && b.endDate);
  const months = {};
  const monthLabels = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < 12; i++) months[i] = 0;

  books.forEach(b => {
    const d = new Date(b.endDate);
    if (d.getFullYear() === currentYear) {
      months[d.getMonth()]++;
    }
  });

  const maxVal = Math.max(...Object.values(months), 1);

  container.innerHTML = Object.entries(months).map(([m, count]) => {
    const pct = (count / maxVal) * 100;
    return `
      <div class="month-bar-wrap">
        <div class="month-bar" style="height:${pct}%;background:${count > 0 ? 'var(--accent-pink)' : 'var(--bg-panel)'};"
             data-tooltip="${monthLabels[m]}: ${count}권"></div>
        <span class="month-label">${monthLabels[m]}</span>
      </div>
    `;
  }).join('');
}

function renderGenreChart() {
  const container = document.getElementById('genre-chart');
  if (!container) return;

  const books = SREData.getBooks().filter(b => b.status === 'completed');
  const counts = {};
  books.forEach(b => { counts[b.category] = (counts[b.category] || 0) + 1; });
  const total = books.length || 1;

  container.innerHTML = Object.entries(GENRE_COLORS).map(([cat, info]) => {
    const count = counts[cat] || 0;
    const pct = Math.round((count / total) * 100);
    return `
      <div class="genre-row">
        <span class="genre-label" style="color:${info.color};">${info.label}</span>
        <div class="genre-bar-wrap">
          <div class="genre-bar" style="width:${pct}%;background:${info.color};"></div>
        </div>
        <span class="genre-count" style="color:${info.color};">${count}</span>
      </div>
    `;
  }).join('');
}

function renderReadingGoal() {
  const books = SREData.getBooks().filter(b => b.status === 'completed');
  const goal = 20;
  const current = books.length;
  const pct = Math.min(Math.round((current / goal) * 100), 100);
  const remaining = Math.max(goal - current, 0);

  const currentEl = document.getElementById('goal-current');
  const barEl = document.getElementById('goal-bar');
  const pctEl = document.getElementById('goal-pct');
  const remEl = document.getElementById('goal-remaining');

  if (currentEl) setTimeout(() => animateCount(currentEl, current), 300);
  if (barEl) setTimeout(() => barEl.style.width = pct + '%', 300);
  if (pctEl) pctEl.textContent = `${pct}% COMPLETE`;
  if (remEl) remEl.textContent = `${remaining} REMAINING`;
}

function initBookRatingStars(defaultVal = 0) {
  const stars = document.querySelectorAll('#book-rating-select .diff-star');
  const input = document.getElementById('new-book-rating');

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

  const container = document.getElementById('book-rating-select');
  if (container) {
    container.addEventListener('mouseleave', () => {
      updateStars(parseInt(input?.value || 0));
    });
  }
}
