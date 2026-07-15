# AniVibe // Premium Anime Discovery Portal

AniVibe is a modern, single-page web application that integrates the official public **AniList GraphQL API**. Built with a minimalist charcoal-dark design, it lets anyone search, browse, and manage a personal anime watchlist — **no account or login required**.

---

## 🌟 Key Features

1. **GraphQL API Integration**: Connects directly to `https://graphql.anilist.co` using `POST` requests with GraphQL queries — no REST, no wrappers.
2. **Minimalist Dark Theme**: Clean charcoal dark UI with smooth transitions, skeleton loading states, and responsive layout.
3. **No Login Required**: All user features work out of the box without any account or authentication.
4. **Personal Watchlist (localStorage)**:
   - Click the ❤️ heart on any anime detail modal to add it to your watchlist.
   - Your watchlist is saved locally in your browser (`localStorage`) and persists across page refreshes.
5. **Personal Star Ratings (localStorage)**:
   - Rate any anime from 1–5 stars directly in the detail modal.
   - Ratings are saved locally alongside your watchlist.
6. **Watchlist Modal**:
   - Click the 🔖 bookmark icon in the top-right header to view your saved anime.
   - Shows cover image, title, and your personal star rating for each entry.
   - Remove items directly from the watchlist view.
   - Click any item to jump to its full detail modal.
   - Badge counter on the icon shows how many anime are saved.
7. **Anime Detail Modal**: View full details — banner image, cover, description, genres, studio, episode count, average score, popularity, and YouTube trailer embed.
8. **Real-Time Search**: Debounced search input for instant anime discovery.
9. **Client-Side Filters**: Filter results by genre (Action, Comedy, Fantasy, Romance, etc.) and format (TV, Movie, OVA, ONA, Special, Music).
10. **Pagination**: Navigate through AniList's full anime catalog page by page.
11. **Graceful Error Handling**: Friendly states for API errors, empty search results, and offline conditions with a retry button.

---

## 🚀 How to Launch

Built entirely with vanilla **HTML5, CSS3, and ES6+ JavaScript** — no build step or dependencies needed.

### Method 1: Local Server (Recommended)

```bash
node app.js
```

Then open `http://localhost:8080` in your browser.

### Method 2: Direct File Open

Double-click [`index.html`](./index.html) to open it in your browser directly.  
*(AniList's API supports cross-origin requests, so this works without a server.)*

### Method 3: GitHub Pages (Live)

The project is deployed at:  
👉 **https://jeszendot.github.io/api-ge/**

---

## 📡 API Details

All API calls go to a **single endpoint** using the `POST` method with a GraphQL body.

| Endpoint | Method | Auth Required |
|----------|--------|---------------|
| `https://graphql.anilist.co` | `POST` | No (for queries) |

### GraphQL Operations Used

#### 1. Search & Discover Anime (GET equivalent — no auth)
```graphql
query ($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
      id
      title { english romaji native }
      coverImage { extraLarge large color }
      bannerImage
      description(asHtml: false)
      format status episodes duration season seasonYear
      genres averageScore popularity
      studios(isMain: true) { nodes { name } }
      trailer { id site }
    }
  }
}
```

#### 2. Get Viewer Profile (GET — requires auth token)
```graphql
query {
  Viewer {
    id
    name
    avatar { large }
  }
}
```

#### 3. Check Watchlist Entry for Anime (GET — requires auth token)
```graphql
query ($mediaId: Int) {
  Media(id: $mediaId) {
    mediaListEntry {
      id
      status
      score(format: POINT_100)
    }
  }
}
```

#### 4. Save / Update Watchlist Entry (POST/mutation — requires auth token)
```graphql
mutation ($mediaId: Int, $status: MediaListStatus, $scoreRaw: Int) {
  SaveMediaListEntry(mediaId: $mediaId, status: $status, scoreRaw: $scoreRaw) {
    id
    status
    score(format: POINT_100)
  }
}
```

#### 5. Delete Watchlist Entry (DELETE equivalent/mutation — requires auth token)
```graphql
mutation ($id: Int) {
  DeleteMediaListEntry(id: $id) {
    deleted
  }
}
```

> **Note**: In the current guest-mode build, operations 2–5 are stored **locally in `localStorage`** instead of calling the AniList API, so no authentication is required. The mutations above represent the full AniList API capability that the app architecture supports.

---

## 📁 Project Structure

| File | Purpose |
|------|---------|
| [`index.html`](./index.html) | Main page structure — header, search, filters, grid, modals |
| [`styles.css`](./styles.css) | Full CSS design system — dark theme, layout, animations, modal, watchlist styles |
| [`app.js`](./app.js) | Unified controller — Node.js local server (top) + browser client logic (bottom). Handles GraphQL fetch, state management, UI rendering, localStorage watchlist/ratings, and modal logic |

---

## 💬 Code Quality & Documentation

All core files include inline comments explaining the layout system, GraphQL query structure, localStorage data format, state management patterns, and UI rendering logic.
