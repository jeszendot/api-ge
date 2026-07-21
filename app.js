// AniVibe Unified Controller
if (typeof window === 'undefined') {
  // Node.js Backend Server (Port 8080)
  const http = require('http');
  const https = require('https');
  const fs = require('fs');
  const path = require('path');

  const PORT = 8080;

  const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  http.createServer((req, res) => {
    // CORS headers for API requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Proxy AniList token exchange (POST /api/token)
    if (req.method === 'POST' && req.url === '/api/token') {
      const targetUrl = 'https://anilist.co/api/v2/oauth/token';
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });

      req.on('end', () => {
        const apiReq = https.request(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }, apiRes => {
          res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
          apiRes.pipe(res);
        });

        apiReq.on('error', err => {
          console.error('Proxy request error:', err);
          res.writeHead(500);
          res.end(JSON.stringify({ error: err.message }));
        });

        apiReq.write(body);
        apiReq.end();
      });
      return;
    }

    // Serve static files
    if (req.method === 'GET') {
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';
      const filePath = path.join(__dirname, urlPath);
      const extname = String(path.extname(filePath)).toLowerCase();
      const contentType = MIME_TYPES[extname] || 'application/octet-stream';

      fs.readFile(filePath, (error, content) => {
        if (error) {
          if (error.code === 'ENOENT') {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 Not Found</h1>', 'utf-8');
          } else {
            res.writeHead(500);
            res.end(`Server Error: ${error.code}`);
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    }
  }).listen(PORT, () => {
    console.log(`\n🚀 AniVibe Unified Server running at http://localhost:${PORT}\n`);
  });

} else {

  // Browser Client Application
  const ANILIST_API_URL = 'https://graphql.anilist.co';
  const ITEMS_PER_PAGE = 15;

  // Global State
  const state = {
    searchQuery: '',
    currentPage: 1,
    selectedGenre: '',
    selectedFormat: '',
    animeList: [],
    pageInfo: {},
    loading: false,
    error: null,
    activeAnimeLibraryEntry: null
  };

  // Guest Watchlist Helpers (localStorage-based, no login required)
 function getRecentViewed(){

try{

return JSON.parse(localStorage.getItem("recent_viewed")||"[]");

}catch{

return[];

}

}

function saveRecentViewed(id){

let list=getRecentViewed();

list=list.filter(x=>x!==id);

list.unshift(id);

list=list.slice(0,10);

localStorage.setItem(
"recent_viewed",
JSON.stringify(list)
);

}
  function getGuestWatchlist() {
    try { return JSON.parse(localStorage.getItem('guest_watchlist') || '[]'); }
    catch { return []; }
  }
  function saveGuestWatchlist(list) {
    localStorage.setItem('guest_watchlist', JSON.stringify(list));
  }
  function getGuestEntry(mediaId) {
    return getGuestWatchlist().find(e => e.mediaId === mediaId) || null;
  }

  // GraphQL query to search anime list
  const GRAPHQL_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
      }
      media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
        id
        title {
          english
          romaji
          native
        }
        coverImage {
          extraLarge
          large
          color
        }
        bannerImage
        description(asHtml: false)
        format
        status
        episodes
        duration
        season
        seasonYear
        genres
        averageScore
        popularity
        studios(isMain: true) {
          nodes {
            name
          }
        }
        trailer {
          id
          site
        }
      }
    }
  }
  `;

  // Convert hex color to RGB format
  function hexToRgb(hex) {
    if (!hex) return '59, 130, 246';
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return isNaN(r) || isNaN(g) || isNaN(b) ? '59, 130, 246' : `${r}, ${g}, ${b}`;
  }


  // Query AniList directory search
  async function fetchAnime() {
    state.loading = true;
    state.error = null;
    renderState();

    const variables = {
      page: state.currentPage,
      perPage: ITEMS_PER_PAGE
    };

    if (state.searchQuery.trim() !== '') {
      variables.search = state.searchQuery.trim();
    }

    try {
      const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          query: GRAPHQL_QUERY,
          variables: variables
        })
      });

      const result = await response.json();

      if (response.ok && result.data && result.data.Page) {
        state.animeList = result.data.Page.media || [];
        state.pageInfo = result.data.Page.pageInfo || {};
      } else {
        throw new Error(result.errors ? result.errors[0].message : 'Failed to fetch data');
      }
    } catch (err) {
      console.error('API Error:', err);
      state.error = err.message || 'Something went wrong.';
    } finally {
      state.loading = false;
      renderState();
    }
  }

  // Render search results, pagination, filters, and loading grids
  function renderState() {
    const gridContainer = document.getElementById('anime-grid');
    const errorContainer = document.getElementById('error-container');
    const emptyContainer = document.getElementById('empty-container');
    const paginationContainer = document.getElementById('pagination-container');
    const resultsCount = document.getElementById('results-count');

    errorContainer.style.display = 'none';
    emptyContainer.style.display = 'none';
    gridContainer.style.display = 'grid';

    if (state.loading) {
      gridContainer.innerHTML = Array(ITEMS_PER_PAGE).fill(0).map(() => getSkeletonHtml()).join('');
      paginationContainer.innerHTML = '';
      resultsCount.innerHTML = 'Searching the anime universe...';
      return;
    }

    if (state.error) {
      gridContainer.style.display = 'none';
      errorContainer.style.display = 'block';
      document.getElementById('error-message').textContent = state.error;
      resultsCount.innerHTML = 'Error encountered';
      paginationContainer.innerHTML = '';
      return;
    }

    let items = [...state.animeList];
    
    if (state.selectedGenre) {
      items = items.filter(anime => anime.genres && anime.genres.includes(state.selectedGenre));
    }
    
    if (state.selectedFormat) {
      items = items.filter(anime => anime.format === state.selectedFormat);
    }

    if (items.length === 0) {
      gridContainer.style.display = 'none';
      emptyContainer.style.display = 'block';
      resultsCount.innerHTML = 'No items found';
      paginationContainer.innerHTML = '';
      return;
    }

    resultsCount.innerHTML = `Showing <span>${items.length}</span> anime on page <span>${state.currentPage}</span>`;
    gridContainer.innerHTML = items.map(anime => getAnimeCardHtml(anime)).join('');
    
    document.querySelectorAll('.anime-card').forEach(card => {
      card.addEventListener('click', () => {
        const animeId = parseInt(card.getAttribute('data-id'));
        const anime = state.animeList.find(a => a.id === animeId);
        if (anime) openModal(anime);
      });
    });

    renderRecentViewed();
    renderPagination();
  }

  // Get anime card markup
  function getAnimeCardHtml(anime) {
    const title = anime.title.english || anime.title.romaji || anime.title.native;
    const rating = anime.averageScore ? `${anime.averageScore}%` : 'N/A';
    const format = anime.format ? anime.format.replace('_', ' ') : 'UNKNOWN';
    const studio = anime.studios && anime.studios.nodes && anime.studios.nodes.length > 0 
      ? anime.studios.nodes[0].name 
      : 'Unknown Studio';
    const episodesStr = anime.episodes ? `${anime.episodes} Ep` : 'Ongoing';
    const themeColor = anime.coverImage.color || '#3b82f6';
    const themeColorRgb = hexToRgb(themeColor);

    return `
      <div class="anime-card" data-id="${anime.id}" style="--card-theme-color: ${themeColor}; --card-theme-color-rgb: ${themeColorRgb};">
        <div class="anime-card-cover">
          <span class="card-badge-rating">
            <i class="fa-solid fa-star"></i> ${rating}
          </span>
          <span class="card-badge-format">${format}</span>
          <img src="${anime.coverImage.extraLarge || anime.coverImage.large}" alt="${title}" loading="lazy">
        </div>
        <div class="anime-card-content">
          <h3 class="anime-card-title">${title}</h3>
          <div class="anime-card-meta">
            <span class="anime-card-studio">${studio}</span>
            <span>${episodesStr}</span>
          </div>
        </div>
      </div>
    `;
  }

  // Get loader shimmer card markup
  function getSkeletonHtml() {
    return `
      <div class="anime-card skeleton-card">
        <div class="skeleton-shimmer skeleton-image"></div>
        <div class="anime-card-content">
          <div class="skeleton-shimmer skeleton-text-title"></div>
          <div class="skeleton-shimmer skeleton-text-subtitle"></div>
        </div>
      </div>
    `;
  }

  // Render pagination buttons
  function renderPagination() {
    const pag = state.pageInfo;
    const container = document.getElementById('pagination-container');
    if (!pag || pag.lastPage <= 1) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    html += `
      <button class="pag-btn" ${state.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${state.currentPage - 1})">
        <i class="fa-solid fa-chevron-left"></i>
      </button>
    `;

    html += `
      <button class="pag-btn ${state.currentPage === 1 ? 'active' : ''}" onclick="changePage(1)">1</button>
    `;

    if (state.currentPage > 3) {
      html += `<span class="pag-ellipsis">...</span>`;
    }

    const startPage = Math.max(2, state.currentPage - 1);
    const endPage = Math.min(pag.lastPage - 1, state.currentPage + 1);

    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="pag-btn ${state.currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>
      `;
    }

    if (state.currentPage < pag.lastPage - 2) {
      html += `<span class="pag-ellipsis">...</span>`;
    }

    if (pag.lastPage > 1) {
      html += `
        <button class="pag-btn ${state.currentPage === pag.lastPage ? 'active' : ''}" onclick="changePage(${pag.lastPage})">${pag.lastPage}</button>
      `;
    }

    html += `
      <button class="pag-btn" ${!pag.hasNextPage ? 'disabled' : ''} onclick="changePage(${state.currentPage + 1})">
        <i class="fa-solid fa-chevron-right"></i>
      </button>
    `;

    container.innerHTML = html;
  }

  // Navigate pagination pages
  window.changePage = function(pageNumber) {
    if (pageNumber < 1 || (state.pageInfo && pageNumber > state.pageInfo.lastPage)) return;
    state.currentPage = pageNumber;
    fetchAnime();
    document.getElementById('filter-panel').scrollIntoView({ behavior: 'smooth' });
  };

  // Open modal details page

  async function openModal(anime) {
    saveRecentViewed(anime.id);
    const modal = document.getElementById('details-modal');
    const themeColor = anime.coverImage.color || '#3b82f6';
    const themeColorRgb = hexToRgb(themeColor);

    modal.style.setProperty('--modal-theme-color', themeColor);
    modal.style.setProperty('--modal-theme-color-rgb', themeColorRgb);

    const bannerImg = document.getElementById('modal-banner-img');
    if (anime.bannerImage) {
      bannerImg.style.display = 'block';
      bannerImg.src = anime.bannerImage;
    } else {
      bannerImg.style.display = 'none';
      document.querySelector('.modal-banner').style.background = `linear-gradient(135deg, rgba(${themeColorRgb}, 0.2), rgba(18,18,20,1))`;
    }

    document.getElementById('modal-cover-img').src = anime.coverImage.extraLarge || anime.coverImage.large;
    document.getElementById('modal-title-main').textContent = anime.title.english || anime.title.romaji;
    document.getElementById('modal-title-alt').textContent = anime.title.native || anime.title.romaji || '';

    document.getElementById('modal-stat-score').textContent = anime.averageScore ? `${anime.averageScore}%` : 'N/A';
    document.getElementById('modal-stat-pop').textContent = anime.popularity.toLocaleString();
    
    document.getElementById('modal-info-format').textContent = anime.format ? anime.format.replace('_', ' ') : 'N/A';
    document.getElementById('modal-info-episodes').textContent = anime.episodes || 'Ongoing';
    document.getElementById('modal-info-duration').textContent = anime.duration ? `${anime.duration} mins` : 'N/A';
    document.getElementById('modal-info-status').textContent = anime.status ? anime.status.replace('_', ' ') : 'N/A';
    
    const studio = anime.studios && anime.studios.nodes && anime.studios.nodes.length > 0 ? anime.studios.nodes[0].name : 'N/A';
    document.getElementById('modal-info-studio').textContent = studio;
    
    const seasonYear = anime.season && anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : anime.seasonYear || 'N/A';
    document.getElementById('modal-info-release').textContent = seasonYear;

    const genreContainer = document.getElementById('modal-genres');
    genreContainer.innerHTML = anime.genres && anime.genres.length > 0 
      ? anime.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')
      : '<span class="text-muted">No genres listed</span>';

    let cleanDesc = anime.description || 'No description available.';
    cleanDesc = cleanDesc.replace(/<br\s*\/?>/gi, '\n');
    document.getElementById('modal-description').textContent = cleanDesc;

    const trailerSection = document.getElementById('modal-trailer-section');
    const trailerIframe = document.getElementById('modal-trailer-iframe');
    if (anime.trailer && anime.trailer.id && anime.trailer.site === 'youtube') {
      trailerSection.style.display = 'block';
      trailerIframe.src = `https://www.youtube.com/embed/${anime.trailer.id}?enablejsapi=1&origin=${window.location.origin}`;
    } else {
      trailerSection.style.display = 'none';
      trailerIframe.src = '';
    }

    renderModalLibrarySection(anime);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Close modal details page
  function closeModal() {
    const modal = document.getElementById('details-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('modal-trailer-iframe').src = '';
  }

  // Render watchlist heart status and rating stars
  async function renderModalLibrarySection(anime) {
    const favBtn = document.getElementById('favorite-toggle-btn');
    const ratingContainer = document.getElementById('modal-rating-container');
    const starsContainer = document.getElementById('rating-stars');

    if (!favBtn) return;

    // Reset heart/stars to default
    favBtn.classList.remove('active');
    favBtn.innerHTML = `<i class="fa-regular fa-heart"></i>`;
    favBtn.title = "Add to Watchlist";
    if (ratingContainer) ratingContainer.style.display = 'flex';
    updateStarsUI(0);

    state.activeAnimeLibraryEntry = { id: null, status: 'REMOVE', score: 0 };

    if (!anime) return;

    // Load from localStorage
    const savedEntry = getGuestEntry(anime.id);
    if (savedEntry) {
      state.activeAnimeLibraryEntry = { id: anime.id, status: 'CURRENT', score: savedEntry.score || 0 };
      updateHeartUI(true);
      updateStarsUI(savedEntry.score || 0);
    }

    // Bind heart button
    const cleanFavBtn = favBtn.cloneNode(true);
    favBtn.replaceWith(cleanFavBtn);
    cleanFavBtn.addEventListener('click', () => toggleWatchlist(anime.id));

    // Bind Stars Hover and Click handlers
    if (starsContainer) {
      const cleanStarsContainer = starsContainer.cloneNode(true);
      starsContainer.replaceWith(cleanStarsContainer);
      const newStars = cleanStarsContainer.querySelectorAll('i');
      newStars.forEach(star => {
        star.addEventListener('mouseenter', (e) => {
          const val = parseInt(e.target.getAttribute('data-value'));
          newStars.forEach((s, idx) => {
            s.className = idx + 1 <= val ? 'fa-solid fa-star hover' : 'fa-regular fa-star';
          });
        });
        star.addEventListener('mouseleave', () => {
          updateStarsUI(state.activeAnimeLibraryEntry ? state.activeAnimeLibraryEntry.score : 0);
        });
        star.addEventListener('click', (e) => {
          const val = parseInt(e.target.getAttribute('data-value'));
          saveRating(anime.id, val * 20);
        });
      });
    }
  }

  // Update watchlist heart icon state
  function updateHeartUI(isInList) {
    const favBtn = document.getElementById('favorite-toggle-btn');
    if (!favBtn) return;
    
    if (isInList) {
      favBtn.classList.add('active');
      favBtn.innerHTML = `<i class="fa-solid fa-heart"></i>`;
      favBtn.title = "Remove from Watchlist";
    } else {
      favBtn.classList.remove('active');
      favBtn.innerHTML = `<i class="fa-regular fa-heart"></i>`;
      favBtn.title = "Add to Watchlist";
    }
  }

  // Update rating stars icons state
  function updateStarsUI(score) {
    const starsContainer = document.getElementById('rating-stars');
    if (!starsContainer) return;
    
    const stars = starsContainer.querySelectorAll('i');
    const ratingValue = score ? Math.round(score / 20) : 0;
    
    stars.forEach((star, idx) => {
      const val = idx + 1;
      if (val <= ratingValue) {
        star.className = 'fa-solid fa-star active';
      } else {
        star.className = 'fa-regular fa-star';
      }
    });
  }

  // Add/remove anime from watchlist (localStorage)
  async function toggleWatchlist(mediaId) {
    const list = getGuestWatchlist();
    const inList = state.activeAnimeLibraryEntry && state.activeAnimeLibraryEntry.id;

    if (inList) {
      saveGuestWatchlist(list.filter(e => e.mediaId !== mediaId));
      state.activeAnimeLibraryEntry = { id: null, status: 'REMOVE', score: 0 };
      updateHeartUI(false);
      updateStarsUI(0);
    } else {
      list.push({ mediaId, status: 'CURRENT', score: 0 });
      saveGuestWatchlist(list);
      state.activeAnimeLibraryEntry = { id: mediaId, status: 'CURRENT', score: 0 };
      updateHeartUI(true);
    }
    updateWatchlistBadge();
  }

  // Save score rating (localStorage)
  function saveRating(mediaId, scoreValue) {
    const list = getGuestWatchlist();
    const existing = list.find(e => e.mediaId === mediaId);
    if (existing) {
      existing.score = scoreValue;
    } else {
      list.push({ mediaId, status: 'CURRENT', score: scoreValue });
    }
    saveGuestWatchlist(list);
    state.activeAnimeLibraryEntry = { id: mediaId, status: 'CURRENT', score: scoreValue };
    updateHeartUI(true);
    updateStarsUI(scoreValue);
    updateWatchlistBadge();
  }

  // Debounce search function
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Update header watchlist badge count
  function updateWatchlistBadge() {
    const list = getGuestWatchlist();
    const badge = document.getElementById('watchlist-badge');
    if (!badge) return;
    if (list.length > 0) {
      badge.textContent = list.length;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Render watchlist modal body
  function renderWatchlistModal() {
    const list = getGuestWatchlist();
    const body = document.getElementById('watchlist-modal-body');
    const countEl = document.getElementById('watchlist-modal-count');
    if (!body) return;

    if (countEl) countEl.textContent = `${list.length} anime`;

    if (list.length === 0) {
      body.innerHTML = `
        <div class="watchlist-empty-state">
          <i class="fa-regular fa-bookmark"></i>
          <p>Your watchlist is empty.<br>Click the ❤️ heart on any anime to add it.</p>
        </div>
      `;
      return;
    }

    body.innerHTML = list.map(entry => {
      const anime = state.animeList.find(a => a.id === entry.mediaId);
      const title = anime
        ? (anime.title.english || anime.title.romaji || anime.title.native)
        : `Anime #${entry.mediaId}`;
      const cover = anime ? (anime.coverImage.large || anime.coverImage.extraLarge) : '';
      const starCount = entry.score ? Math.round(entry.score / 20) : 0;
      const starsHtml = starCount > 0
        ? Array.from({ length: 5 }, (_, i) =>
            `<i class="fa-${i < starCount ? 'solid' : 'regular'} fa-star"></i>`
          ).join('')
        : `<span class="no-rating">Not rated</span>`;

      return `
        <div class="watchlist-item" data-media-id="${entry.mediaId}">
          ${cover ? `<img class="watchlist-item-cover" src="${cover}" alt="${title}" loading="lazy">` : ''}
          <div class="watchlist-item-info">
            <div class="watchlist-item-title">${title}</div>
            <div class="watchlist-item-rating">${starsHtml}</div>
          </div>
          <button class="watchlist-remove-btn" data-remove-id="${entry.mediaId}" title="Remove from watchlist">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }).join('');

    // Bind remove buttons
    body.querySelectorAll('.watchlist-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mediaId = parseInt(btn.getAttribute('data-remove-id'));
        const updated = getGuestWatchlist().filter(e => e.mediaId !== mediaId);
        saveGuestWatchlist(updated);
        updateWatchlistBadge();
        renderWatchlistModal();
        // If this is the currently open anime, update its heart
        if (state.activeAnimeLibraryEntry && state.activeAnimeLibraryEntry.id === mediaId) {
          state.activeAnimeLibraryEntry = { id: null, status: 'REMOVE', score: 0 };
          updateHeartUI(false);
          updateStarsUI(0);
        }
      });
    });

    // Bind click to open anime modal
    body.querySelectorAll('.watchlist-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.watchlist-remove-btn')) return;
        const mediaId = parseInt(item.getAttribute('data-media-id'));
        const anime = state.animeList.find(a => a.id === mediaId);
        if (anime) {
          closeWatchlistModal();
          openModal(anime);
        }
      });
    });
  }

  // Open watchlist modal
  function openWatchlistModal() {
    renderWatchlistModal();
    const modal = document.getElementById('watchlist-modal');
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  // Close watchlist modal
  function closeWatchlistModal() {
    const modal = document.getElementById('watchlist-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  // DOM Content Loaded initializations
  document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('search-input');
    const searchForm = document.getElementById('search-form');
    const genreFilter = document.getElementById('genre-filter');
    const formatFilter = document.getElementById('format-filter');
    const closeModalBtn = document.getElementById('modal-close-btn');
    const modalBackdrop = document.getElementById('details-modal');
    const retryBtn = document.getElementById('retry-btn');
    const randomBtn = document.getElementById('random-anime-btn');
    const watchlistHeaderBtn = document.getElementById('watchlist-header-btn');
    const watchlistCloseBtn = document.getElementById('watchlist-modal-close-btn');
    const watchlistModalBackdrop = document.getElementById('watchlist-modal');

    updateWatchlistBadge();

    const handleSearch = debounce(() => {
      state.searchQuery = searchInput.value;
      state.currentPage = 1;
      fetchAnime();
    }, 400);

    searchInput.addEventListener('input', handleSearch);

    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      state.searchQuery = searchInput.value;
      state.currentPage = 1;
      fetchAnime();
    });

    genreFilter.addEventListener('change', (e) => {
      state.selectedGenre = e.target.value;
      renderState();
    });

    formatFilter.addEventListener('change', (e) => {
      state.selectedFormat = e.target.value;
      renderState();
    });

    closeModalBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Watchlist modal events
    watchlistHeaderBtn.addEventListener('click', openWatchlistModal);
    watchlistCloseBtn.addEventListener('click', closeWatchlistModal);
    watchlistModalBackdrop.addEventListener('click', (e) => {
      if (e.target === watchlistModalBackdrop) closeWatchlistModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (modalBackdrop.classList.contains('active')) closeModal();
        if (watchlistModalBackdrop.classList.contains('active')) closeWatchlistModal();
      }
    });

    retryBtn.addEventListener('click', () => {
      fetchAnime();
    });
    randomBtn.addEventListener('click', () => {

    if(state.animeList.length===0) return;

    const random =
        state.animeList[
            Math.floor(Math.random()*state.animeList.length)
        ];

    openModal(random);

});

    fetchAnime();
  });
  function renderRecentViewed(){

const bar=document.getElementById("recent-viewed-bar");

if(!bar)return;

const ids=getRecentViewed();

if(ids.length===0){

bar.innerHTML="";

return;

}

bar.innerHTML="<strong>Recently Viewed:</strong> ";

ids.forEach(id=>{

const anime=state.animeList.find(a=>a.id===id);

if(anime){

const span=document.createElement("span");

span.className="recent-chip";

span.innerText=anime.title.english||anime.title.romaji;

span.onclick=()=>openModal(anime);

bar.appendChild(span);

}

});

}

}
