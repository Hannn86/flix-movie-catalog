var DB = 'http://localhost:8080/api';

// Auth
function authRegister(u, p) { return fetch(DB + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) }).then(function(r) { return r.json(); }); }
function authLogin(u, p) { return fetch(DB + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) }).then(function(r) { return r.json(); }); }
function authLogout() { return fetch(DB + '/auth/logout', { method: 'POST' }).then(function(r) { return r.json(); }); }
function authMe() { return fetch(DB + '/auth/me').then(function(r) { return r.json(); }).catch(function() { return { logged_in: false }; }); }

// Watchlist
function dbGetWatchlist() { return fetch(DB + '/watchlist').then(function(r) { return r.json(); }).catch(function() { return []; }); }
function dbAddWatchlist(id, title, poster) { return fetch(DB + '/watchlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: id, title: title, poster: poster }) }).then(function(r) { return r.json(); }); }
function dbRemoveWatchlist(id) { return fetch(DB + '/watchlist/' + id, { method: 'DELETE' }).then(function(r) { return r.json(); }); }
function dbUpdateWatchlist(id, data) { return fetch(DB + '/watchlist/' + id, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(function(r) { return r.json(); }); }
function dbCheckWatchlist(id) { return fetch(DB + '/watchlist/check/' + id).then(function(r) { return r.json(); }).catch(function() { return { in_watchlist: false }; }); }

// Favorites
function dbGetFavorites() { return fetch(DB + '/favorites').then(function(r) { return r.json(); }).catch(function() { return []; }); }
function dbAddFavorite(id, title, poster) { return fetch(DB + '/favorites', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: id, title: title, poster: poster }) }).then(function(r) { return r.json(); }); }
function dbRemoveFavorite(id) { return fetch(DB + '/favorites/' + id, { method: 'DELETE' }).then(function(r) { return r.json(); }); }
function dbCheckFavorite(id) { return fetch(DB + '/favorites/check/' + id).then(function(r) { return r.json(); }).catch(function() { return { is_favorite: false }; }); }

// Reviews
function dbGetReviews(tmdbId) { return fetch(DB + '/reviews/' + tmdbId).then(function(r) { return r.json(); }).catch(function() { return []; }); }
function dbAddReview(tmdbId, rating, comment) { return fetch(DB + '/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: tmdbId, rating: rating, comment: comment }) }).then(function(r) { return r.json(); }); }
function dbDeleteReview(reviewId) { return fetch(DB + '/reviews/' + reviewId, { method: 'DELETE' }).then(function(r) { return r.json(); }); }

// History & Stats & Profile
function dbAddHistory(id, title, poster) { return fetch(DB + '/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tmdb_id: id, title: title, poster: poster }) }).then(function(r) { return r.json(); }); }
function dbGetHistory() { return fetch(DB + '/history').then(function(r) { return r.json(); }).catch(function() { return []; }); }
function dbGetStats() { return fetch(DB + '/stats').then(function(r) { return r.json(); }).catch(function() { return { watchlist_count: 0, favorites_count: 0 }; }); }
function dbGetProfile() { return fetch(DB + '/profile').then(function(r) { return r.json(); }).catch(function() { return null; }); }