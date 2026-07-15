# AniVibe // Premium Anime Discovery Portal

AniVibe is a state-of-the-art, single-page web application that integrates the official public **AniList GraphQL API**. Built with a deep focus on minimalist charcoal-dark design aesthetics, it offers anime enthusiasts a gorgeous visual directory to search, filter, and inspect anime titles in real-time.

---

## 🌟 Key Features

1. **GraphQL Integration**: Custom-built POST interface connecting directly to `https://graphql.anilist.co`.
2. **Minimalist Dark Theme**: A clean charcoal dark theme built with simple borders, flat panels, clear metrics, and high-performance layout transitions.
3. **OAuth2 Implicit Grant Authentication**: Supports connecting directly to the user's AniList profile client-side without any backend database or server wrappers.
4. **Interactive Library mutations (Authenticated)**:
   * **List status selector**: Move anime to Watching, Planning, Completed, or Dropped.
   * **Episode progress increments**: Add/subtract progress counters matching total episodes.
   * **Favorites toggle**: Single-click heart buttons to favorite shows on AniList.
5. **Interactive Filters**: Instant searching debounced dynamically alongside client-side filters for both genres (Action, Comedy, Fantasy, Romance, etc.) and media format (TV, Movie, OVA, Special).
6. **Graceful Error boundaries**: Handles API unreachable states, offline conditions, and empty search results with user-friendly retry states.

---

## 🚀 How to Launch the Project

The project is built entirely using vanilla front-end tech (**HTML5, CSS3, and ES6+ JavaScript**), meaning it does not require any compile, build, or compile-step installations.

### Method 1: Instant Launch (Double-Click)
1. Open the project directory.
2. Double-click the [`index.html`](./index.html) file to launch it directly in your web browser. 
*(Note: AniList API has CORS configuration enabled for all origins, enabling standard file protocol fetches directly!)*

### Method 2: Local Web Server (Recommended)
To run the project on a local server, launch one of the following commands in the directory:

* Using **Node/NPX**:
  ```bash
  node app.js
  ```
  Then open `http://localhost:8080` in your browser.

---

## 🔑 OAuth2 Config Details

* **Client ID**: `45986` (Defaults to your registered client ID).
* **Redirect URI**: Automatically maps to `window.location.origin + window.location.pathname` so authorization works instantly on both local environment (`localhost`) and staging deploys.

---

## 📁 Project Structure

* [`index.html`](./index.html) - Structural framework, modal overlays, search boxes, filters, auth panels, and layout hooks.
* [`styles.css`](./styles.css) - CSS properties system, dark mode colors, media query breakpoints, layouts, skeletons, auth buttons, and library updates panel styling rules.
* [`app.js`](./app.js) - App controller executing the GraphQL query fetches, OAuth token implicit parsing, viewer profile loaders, and list mutations.

---

## 💬 Code Quality & Documentation

All core files feature comprehensive comments explaining the layout systems, styling choices, implicit authentication hash retrievers, query variables mapping, and GraphQL mutation updates.