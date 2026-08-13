// ===== TEMA TERANG / GELAP =====
function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme');
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('flix_theme', next);
}

var currentUser = null;

async function boot() {
    try {
        var gd = await tmdbFetch('/genre/movie/list'); S.genres = gd.genres || []; renderGenres();
        var td = await tmdbFetch('/trending/movie/week'); S.hero = (td.results || []).slice(0, 5);
        renderHero(); startHero(); renderTabs(); await loadMovies();
        await checkAuth(); updateWlCount();
    } catch (e) { toast('Gagal: ' + e.message, 'err'); }
}

// ========== UTILITAS ESCAPE HTML ==========
function escAttr(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ========== AUTH ==========
async function checkAuth() {
    var res = await authMe();
    if (res.logged_in) { currentUser = res.username; }
    updateAuthUI();
}

function updateAuthUI() {
    var el = document.getElementById('authArea');
    if (currentUser) {
        el.innerHTML = '<div style="display:flex;align-items:center;gap:10px">' +
            '<button onclick="openWlModal()" class="wl-btn"><i class="fas fa-bookmark"></i><span>Watchlist</span><span id="wlCount" class="wl-badge">0</span></button>' +
            '<button onclick="openFavModal()" class="wl-btn"><i class="fas fa-heart"></i><span>Favorit</span><span id="favCount" class="wl-badge">0</span></button>' +
            '<button onclick="openProfile()" class="wl-btn"><i class="fas fa-user"></i><span>' + escAttr(currentUser) + '</span></button>' +
            '<button onclick="doLogout()" class="wl-btn" style="border-color:var(--red);color:var(--red)"><i class="fas fa-sign-out-alt"></i></button>' +
            '</div>';
        updateWlCount(); updateFavCount();
    } else {
        el.innerHTML = '<div style="display:flex;align-items:center;gap:10px">' +
            '<button onclick="openAuthModal()" class="btn-accent" style="padding:9px 20px;font-size:13px;border-radius:10px"><i class="fas fa-user-plus"></i> Daftar / Masuk</button>' +
            '</div>';
    }
}

function openAuthModal() { document.getElementById('authModal').classList.add('open'); document.body.style.overflow = 'hidden'; showAuthForm('login'); }
function closeAuthModal() { document.getElementById('authModal').classList.remove('open'); document.body.style.overflow = ''; }

function showAuthForm(type) {
    var box = document.getElementById('authBox');
    if (type === 'login') {
        box.innerHTML = '<div style="padding:32px"><h2 style="font-size:22px;font-weight:800;margin-bottom:6px">Masuk ke FLIX</h2><p style="color:var(--muted);font-size:13px;margin-bottom:24px">Masukkan akun kamu</p>' +
            '<div style="margin-bottom:16px"><label style="font-size:12px;color:var(--fg2);display:block;margin-bottom:6px">Username</label><input id="loginUser" class="auth-input" placeholder="Username"></div>' +
            '<div style="margin-bottom:24px"><label style="font-size:12px;color:var(--fg2);display:block;margin-bottom:6px">Password</label><input id="loginPass" type="password" class="auth-input" placeholder="Password"></div>' +
            '<div id="loginErr" style="color:var(--red);font-size:12px;margin-bottom:12px;display:none"></div>' +
            '<button onclick="doLogin()" class="btn-accent" style="width:100%;justify-content:center;margin-bottom:14px">Masuk</button>' +
            '<p style="text-align:center;font-size:13px;color:var(--muted)">Belum punya akun? <a href="#" onclick="showAuthForm(\'register\');return false" style="color:var(--accent);text-decoration:none;font-weight:600">Daftar</a></p></div>';
    } else {
        box.innerHTML = '<div style="padding:32px"><h2 style="font-size:22px;font-weight:800;margin-bottom:6px">Buat Akun FLIX</h2><p style="color:var(--muted);font-size:13px;margin-bottom:24px">Gratis, langsung pakai</p>' +
            '<div style="margin-bottom:16px"><label style="font-size:12px;color:var(--fg2);display:block;margin-bottom:6px">Username</label><input id="regUser" class="auth-input" placeholder="Minimal 3 karakter"></div>' +
            '<div style="margin-bottom:24px"><label style="font-size:12px;color:var(--fg2);display:block;margin-bottom:6px">Password</label><input id="regPass" type="password" class="auth-input" placeholder="Minimal 4 karakter"></div>' +
            '<div id="regErr" style="color:var(--red);font-size:12px;margin-bottom:12px;display:none"></div>' +
            '<button onclick="doRegister()" class="btn-accent" style="width:100%;justify-content:center;margin-bottom:14px">Daftar</button>' +
            '<p style="text-align:center;font-size:13px;color:var(--muted)">Sudah punya akun? <a href="#" onclick="showAuthForm(\'login\');return false" style="color:var(--accent);text-decoration:none;font-weight:600">Masuk</a></p></div>';
    }
}

async function doLogin() {
    var u = document.getElementById('loginUser').value.trim();
    var p = document.getElementById('loginPass').value;
    var err = document.getElementById('loginErr');
    if (!u || !p) { err.textContent = 'Isi semua field'; err.style.display = 'block'; return; }
    var res = await authLogin(u, p);
    if (res.status === 'ok') { currentUser = res.username; updateAuthUI(); closeAuthModal(); toast('Selamat datang, ' + currentUser, 'ok'); }
    else { err.textContent = res.error || 'Gagal masuk'; err.style.display = 'block'; }
}

async function doRegister() {
    var u = document.getElementById('regUser').value.trim();
    var p = document.getElementById('regPass').value;
    var err = document.getElementById('regErr');
    if (!u || !p) { err.textContent = 'Isi semua field'; err.style.display = 'block'; return; }
    var res = await authRegister(u, p);
    if (res.status === 'ok') { currentUser = res.username; updateAuthUI(); closeAuthModal(); toast('Akun dibuat! Selamat datang, ' + currentUser, 'ok'); }
    else { err.textContent = res.error || 'Gagal daftar'; err.style.display = 'block'; }
}

async function doLogout() {
    await authLogout(); currentUser = null; updateAuthUI(); toast('Berhasil keluar', 'ok');
}

// ========== PROFILE ==========
async function openProfile() {
    var modal = document.getElementById('profileModal'); var box = document.getElementById('profileBox');
    box.innerHTML = '<div style="padding:40px;text-align:center"><i class="fas fa-spinner fa-spin" style="font-size:22px;color:var(--accent)"></i></div>';
    modal.classList.add('open'); document.body.style.overflow = 'hidden';
    var data = await dbGetProfile();
    if (!data) { box.innerHTML = '<div style="padding:40px;text-align:center;color:var(--red)">Gagal memuat profil</div>'; return; }
    var st = data.stats;
    var revHtml = data.recent_reviews.length ? data.recent_reviews.map(function(r) {
        return '<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border)">' +
            '<div style="flex:1"><p style="font-size:13px;font-weight:600">' + escAttr(r.username) + ' mereview <span style="color:var(--accent)">' + r.tmdb_id + '</span></p>' +
            '<div style="display:flex;align-items:center;gap:4px;margin-top:4px"><i class="fas fa-star" style="color:var(--yellow);font-size:11px"></i><span style="font-size:13px;font-weight:700;color:var(--yellow)">' + r.rating + '/10</span></div>' +
            (r.comment ? '<p style="font-size:12px;color:var(--fg2);margin-top:4px">' + escAttr(r.comment) + '</p>' : '') +
            '</div></div>';
    }).join('') : '<p style="color:var(--muted);font-size:13px">Belum ada review</p>';

    box.innerHTML = '<div style="padding:28px">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">' +
        '<div><h2 style="font-size:22px;font-weight:800"><i class="fas fa-user-circle" style="color:var(--accent);margin-right:8px"></i>' + escAttr(data.username) + '</h2>' +
        '<p style="color:var(--muted);font-size:12px;margin-top:4px">Bergabung: ' + (data.joined_at || '—') + '</p></div>' +
        '<button onclick="closeProfile()" class="m-close" style="position:static"><i class="fas fa-times"></i></button></div>' +
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px">' +
        '<div style="background:var(--accent-dim);border:1px solid var(--accent-dim);border-radius:14px;padding:18px;text-align:center"><p style="font-size:28px;font-weight:800;color:var(--accent)">' + st.watchlist + '</p><p style="font-size:11px;color:var(--muted);margin-top:4px">Watchlist</p></div>' +
        '<div style="background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.12);border-radius:14px;padding:18px;text-align:center"><p style="font-size:28px;font-weight:800;color:var(--red)">' + st.favorites + '</p><p style="font-size:11px;color:var(--muted);margin-top:4px">Favorit</p></div>' +
        '<div style="background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.12);border-radius:14px;padding:18px;text-align:center"><p style="font-size:28px;font-weight:800;color:var(--yellow)">' + st.reviews + '</p><p style="font-size:11px;color:var(--muted);margin-top:4px">Review</p></div>' +
        '<div style="background:rgba(52,211,153,.06);border:1px solid rgba(52,211,153,.12);border-radius:14px;padding:18px;text-align:center"><p style="font-size:28px;font-weight:800;color:var(--green)">' + st.history + '</p><p style="font-size:11px;color:var(--muted);margin-top:4px">Ditonton</p></div></div>' +
        '<h3 style="font-size:16px;font-weight:700;margin-bottom:14px"><i class="fas fa-pen" style="color:var(--accent);margin-right:6px;font-size:13px"></i>Review Terakhir</h3>' +
        revHtml + '</div>';
}
function closeProfile() { document.getElementById('profileModal').classList.remove('open'); document.body.style.overflow = ''; }

// ========== HERO ==========
function renderHero() {
    if (!S.hero.length) return;
    var m = S.hero[S.hi];
    document.getElementById('heroBg').style.backgroundImage = 'url(' + getBackdrop(m.backdrop_path) + ')';
    var gn = (m.genre_ids || []).map(function(id) { var g = S.genres.find(function(g) { return g.id === id; }); return g ? g.name : ''; }).filter(Boolean).slice(0, 3);
    var vc = voteColor(m.vote_average);
    var sep = gn.map(function(n) { return '<span style="color:var(--muted);font-size:12.5px">' + escAttr(n) + '</span>'; }).join('<span style="color:var(--border)">·</span>');
    document.getElementById('heroBody').innerHTML = '<div class="a-up"><div style="display:flex;align-items:center;gap:9px;margin-bottom:14px"><span style="background:var(--accent);color:#08080c;font-size:10.5px;font-weight:700;padding:4px 11px;border-radius:6px;text-transform:uppercase;letter-spacing:.6px"><i class="fas fa-bolt" style="margin-right:3px"></i>Trending</span><span style="color:var(--muted);font-size:12.5px">' + getYear(m.release_date) + '</span></div><h1 style="font-size:clamp(28px,5vw,46px);font-weight:800;line-height:1.08;letter-spacing:-.8px;margin-bottom:12px">' + escAttr(m.title) + '</h1><div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap"><span style="display:flex;align-items:center;gap:5px;font-size:14px;font-weight:700;color:' + vc + '"><i class="fas fa-star" style="font-size:13px"></i>' + m.vote_average.toFixed(1) + '<span style="color:var(--muted);font-weight:400;font-size:12px">/ 10</span></span>' + sep + '</div><p style="color:var(--fg2);font-size:14.5px;line-height:1.7;margin-bottom:26px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">' + (m.overview || 'Sinopsis belum tersedia.') + '</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button onclick="openM(' + m.id + ')" class="btn-accent"><i class="fas fa-circle-info"></i> Detail Film</button><button onclick="nextHero()" class="btn-ghost"><i class="fas fa-arrow-right" style="margin-right:4px"></i>Selanjutnya</button></div></div>';
    document.getElementById('heroDots').innerHTML = S.hero.map(function(_, i) { return '<button class="hero-dot ' + (i === S.hi ? 'on' : '') + '" onclick="goHero(' + i + ')"></button>'; }).join('');
}
function startHero() { clearInterval(S.ht); S.ht = setInterval(nextHero, CONFIG.heroInterval); }
function nextHero() { S.hi = (S.hi + 1) % S.hero.length; renderHero(); startHero(); }
function goHero(i) { S.hi = i; renderHero(); startHero(); }

// ========== GENRE & TABS ==========
function renderGenres() { var h = '<button class="pill ' + (S.genre === null ? 'on' : '') + '" onclick="pickG(null)">Semua</button>'; h += S.genres.map(function(g) { return '<button class="pill ' + (S.genre === g.id ? 'on' : '') + '" onclick="pickG(' + g.id + ')">' + escAttr(g.name) + '</button>'; }).join(''); document.getElementById('genreBar').innerHTML = h; }
function pickG(id) { S.genre = id; S.page = 1; S.q = ''; S.isQ = false; document.getElementById('sInput').value = ''; document.getElementById('sClear').style.display = 'none'; renderGenres(); loadMovies(); }
function renderTabs() { document.getElementById('tabBar').innerHTML = TABS.map(function(t) { return '<button class="tab ' + (S.tab === t.id ? 'on' : '') + '" onclick="pickT(\'' + t.id + '\')"><i class="fas ' + t.icon + '" style="margin-right:5px;font-size:11px"></i>' + t.label + '</button>'; }).join(''); }
function pickT(id) { S.tab = id; S.page = 1; S.q = ''; S.isQ = false; document.getElementById('sInput').value = ''; document.getElementById('sClear').style.display = 'none'; renderTabs(); loadMovies(); }

// ========== LOAD & SEARCH ==========
async function loadMovies() { if (S.busy) return; S.busy = true; S.isQ = false; showSkel(true); document.getElementById('emptyState').style.display = 'none'; try { var p = { page: S.page }; if (S.genre) p.with_genres = S.genre; var d = await tmdbFetch('/movie/' + S.tab, p); S.movies = d.results || []; S.pages = Math.min(d.total_pages || 1, CONFIG.maxPages); renderTabs(); renderGrid(S.movies); renderPages(S.page, S.pages); } catch (e) { toast('Gagal: ' + e.message, 'err'); renderGrid([]); } finally { S.busy = false; showSkel(false); } }
var onSearch = debounce(async function(q) { S.q = q.trim(); var cb = document.getElementById('sClear'); if (!S.q) { cb.style.display = 'none'; S.isQ = false; loadMovies(); return; } cb.style.display = 'block'; S.qPage = 1; S.isQ = true; if (S.busy) return; S.busy = true; showSkel(true); document.getElementById('emptyState').style.display = 'none'; try { var d = await tmdbFetch('/search/movie', { query: S.q, page: S.qPage }); S.qRes = d.results || []; S.qPages = Math.min(d.total_pages || 1, CONFIG.maxPages); renderGrid(S.qRes); renderPages(S.qPage, S.qPages, true); } catch (e) { toast('Gagal: ' + e.message, 'err'); renderGrid([]); } finally { S.busy = false; showSkel(false); } }, CONFIG.searchDelay);
function clearS() { document.getElementById('sInput').value = ''; document.getElementById('sClear').style.display = 'none'; S.q = ''; S.isQ = false; loadMovies(); }
function goHome() { S.q = ''; S.genre = null; S.tab = 'popular'; S.page = 1; S.isQ = false; document.getElementById('sInput').value = ''; document.getElementById('sClear').style.display = 'none'; renderGenres(); renderTabs(); loadMovies(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

// ========== GRID ==========
function renderGrid(movies) { var g = document.getElementById('grid'); if (!movies.length) { g.innerHTML = ''; document.getElementById('emptyState').style.display = 'block'; document.getElementById('pageWrap').innerHTML = ''; return; } document.getElementById('emptyState').style.display = 'none'; g.innerHTML = movies.map(function(m, i) { return '<div class="fcard a-up" style="animation-delay:' + Math.min(i * .035, .5) + 's" onclick="openM(' + m.id + ')"><div class="poster"><img src="' + getPoster(m.poster_path) + '" alt="' + escAttr(m.title) + '" loading="lazy" onerror="this.src=\'https://placehold.co/500x750/13131b/5c5a56?text=No+Poster\'"><div class="rbadge rbadge-' + voteClass(m.vote_average) + '"><i class="fas fa-star" style="font-size:9px"></i>' + m.vote_average.toFixed(1) + '</div><div class="ov"><span style="color:var(--accent);font-size:12px;font-weight:600"><i class="fas fa-arrow-up-right-from-square" style="margin-right:4px"></i>Lihat Detail</span></div></div><div class="info"><div class="ttl">' + escAttr(m.title) + '</div><div class="yr"><i class="far fa-calendar" style="margin-right:4px"></i>' + getYear(m.release_date) + '</div><div class="syn">' + (m.overview ? '<b>Sinopsis:</b> ' + escAttr(m.overview) : 'Sinopsis belum tersedia.') + '</div></div></div>'; }).join(''); }
function showSkel(on) { var sk = document.getElementById('skelGrid'), gr = document.getElementById('grid'); if (on) { gr.style.display = 'none'; sk.style.display = 'grid'; sk.innerHTML = Array.from({ length: 12 }, function() { return '<div><div class="skel" style="aspect-ratio:2/3;border-radius:16px 16px 0 0"></div><div style="padding:16px 13px 15px"><div class="skel" style="height:13px;width:78%;margin-bottom:7px"></div><div class="skel" style="height:10px;width:32%;margin-bottom:10px"></div><div class="skel" style="height:10px;width:100%;margin-bottom:5px"></div><div class="skel" style="height:10px;width:88%"></div></div></div>'; }).join(''); } else { sk.style.display = 'none'; gr.style.display = 'grid'; } }

// ========== PAGINATION ==========
function renderPages(c, t, q) { var w = document.getElementById('pageWrap'); if (t <= 1) { w.innerHTML = ''; return; } var ps = []; if (t <= 7) ps = Array.from({ length: t }, function(_, i) { return i + 1; }); else { ps = [1]; var s = Math.max(2, c - 2), e = Math.min(t - 1, c + 2); if (c <= 3) { s = 2; e = 5; } if (c >= t - 2) { s = t - 4; e = t - 1; } if (s > 2) ps.push('...'); for (var i = s; i <= e; i++) ps.push(i); if (e < t - 1) ps.push('...'); ps.push(t); } w.innerHTML = '<button class="pg" onclick="goP(' + (c - 1) + ',' + q + ')" ' + (c <= 1 ? 'disabled' : '') + '><i class="fas fa-chevron-left" style="font-size:10px"></i></button>' + ps.map(function(p) { return p === '...' ? '<span style="color:var(--muted);padding:0 2px">...</span>' : '<button class="pg ' + (p === c ? 'on' : '') + '" onclick="goP(' + p + ',' + q + ')">' + p + '</button>'; }).join('') + '<button class="pg" onclick="goP(' + (c + 1) + ',' + q + ')" ' + (c >= t ? 'disabled' : '') + '><i class="fas fa-chevron-right" style="font-size:10px"></i></button>'; }
function goP(p, q) { if (p < 1) return; window.scrollTo({ top: 340, behavior: 'smooth' }); if (q) { S.qPage = p; onSearch(S.q); } else { S.page = p; loadMovies(); } }

// ========== DETAIL MODAL ==========
async function openM(id) {
    var modal = document.getElementById('modal'), box = document.getElementById('mBox');
    box.innerHTML = '<div style="padding:56px 24px;text-align:center"><i class="fas fa-spinner fa-spin" style="font-size:26px;color:var(--accent)"></i><p style="margin-top:12px;color:var(--muted);font-size:13.5px">Memuat...</p></div>';
    modal.classList.add('open'); document.body.style.overflow = 'hidden';
    try {
        // Fetch semua data paralel
        var baseVid = CONFIG.tmdbApi + '/movie/' + id + '/videos?api_key=' + CONFIG.tmdbKey;
        var baseProv = CONFIG.tmdbApi + '/movie/' + id + '/watch/providers?api_key=' + CONFIG.tmdbKey;
        var baseExt = CONFIG.tmdbApi + '/movie/' + id + '/external_ids?api_key=' + CONFIG.tmdbKey;
        var baseImg = CONFIG.tmdbApi + '/movie/' + id + '/images?api_key=' + CONFIG.tmdbKey;

        var results = await Promise.all([
            tmdbFetch('/movie/' + id),
            tmdbFetch('/movie/' + id + '/credits'),
            tmdbFetch('/movie/' + id + '/similar'),
            dbGetReviews(id),
            fetch(baseVid).then(function(r) { return r.json(); }).catch(function() { return { results: [] }; }),
            fetch(baseProv).then(function(r) { return r.json(); }).catch(function() { return {}; }),
            fetch(baseExt).then(function(r) { return r.json(); }).catch(function() { return {}; }),
            fetch(baseImg).then(function(r) { return r.json(); }).catch(function() { return {}; })
        ]);

        var det = results[0], cred = results[1], sim = results[2],
            reviews = results[3], videos = results[4],
            provData = results[5], extData = results[6], imgData = results[7];

        // Fallback sinopsis ke bahasa Inggris kalau Indonesian kosong
        if (!det.overview) {
            try {
                var detEn = await fetch(CONFIG.tmdbApi + '/movie/' + id + '?api_key=' + CONFIG.tmdbKey + '&language=en-US').then(function(r) { return r.json(); });
                if (detEn.overview) det.overview = detEn.overview;
            } catch(e) {}
        }

        // Cari trailer — prioritas YouTube Trailer, lalu YouTube apa aja, lalu situs lain
        var trailerKey = null;
        if (videos && videos.results && videos.results.length) {
            var trailer = videos.results.find(function(v) { return v.type === 'Trailer' && v.site === 'YouTube'; })
                || videos.results.find(function(v) { return (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube'; })
                || videos.results.find(function(v) { return v.site === 'YouTube'; })
                || videos.results.find(function(v) { return v.type === 'Trailer' || v.type === 'Teaser'; })
                || videos.results[0];
            if (trailer) trailerKey = trailer.key;
        }

        var cast = (cred.cast || []).slice(0, 8),
            dir = (cred.crew || []).find(function(c) { return c.job === 'Director'; }),
            writer = (cred.crew || []).find(function(c) { return c.job === 'Writer'; })
                 || (cred.crew || []).find(function(c) { return c.job === 'Screenplay'; });
        var simM = (sim.results || []).slice(0, 4), v = det.vote_average,
            vc = voteColor(v), pct = Math.round(v * 10);
        var genH = (det.genres || []).map(function(g) {
            return '<span style="padding:5px 14px;border-radius:100px;background:var(--accent-dim);color:var(--accent);font-size:11.5px;font-weight:600">' + escAttr(g.name) + '</span>';
        }).join('');
        var castH = cast.map(function(c) {
            var src = c.profile_path ? CONFIG.tmdbImg + 'w185' + c.profile_path : 'https://placehold.co/52x52/13131b/5c5a56?text=?';
            return '<div style="text-align:center"><img src="' + src + '" class="cast-img" style="margin:0 auto 5px;display:block" onerror="this.src=\'https://placehold.co/52x52/13131b/5c5a56?text=?\'"><p style="font-size:11px;font-weight:600;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + escAttr(c.name) + '</p><p style="font-size:9.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escAttr(c.character || '') + '</p></div>';
        }).join('');
        var simH = simM.map(function(m) {
            return '<div style="cursor:pointer;border-radius:12px;overflow:hidden;transition:transform .22s" onmouseover="this.style.transform=\'scale(1.04)\'" onmouseout="this.style.transform=\'\'" onclick="openM(' + m.id + ')"><img src="' + getPoster(m.poster_path, 'w342') + '" loading="lazy" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:12px" onerror="this.src=\'https://placehold.co/300x450/13131b/5c5a56?text=?\'"><p style="font-size:12px;font-weight:600;margin-top:6px;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + escAttr(m.title) + '</p><span style="font-size:11px;color:' + voteColor(m.vote_average) + ';font-weight:700"><i class="fas fa-star" style="font-size:8px"></i> ' + m.vote_average.toFixed(1) + '</span></div>';
        }).join('');

        var revH = reviews.length ? reviews.map(function(r) {
            var isOwn = currentUser && r.username === currentUser;
            var stars = '';
            for (var i = 1; i <= 10; i++) stars += '<i class="' + (i <= r.rating ? 'fas' : 'far') + ' fa-star" style="font-size:10px;color:' + (i <= r.rating ? 'var(--yellow)' : 'var(--border)') + '"></i>';
            return '<div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)">' +
                '<div style="width:36px;height:36px;border-radius:50%;background:var(--accent-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0"><span style="font-size:14px;font-weight:700;color:var(--accent)">' + r.username.charAt(0).toUpperCase() + '</span></div>' +
                '<div style="flex:1"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px"><span style="font-size:13px;font-weight:600">' + escAttr(r.username) + '</span>' +
                (isOwn ? '<button onclick="deleteRev(' + r.id + ',' + id + ')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:11px"><i class="fas fa-trash"></i></button>' : '') +
                '</div><div style="display:flex;gap:2px;margin-bottom:4px">' + stars + '</div>' +
                (r.comment ? '<p style="font-size:12.5px;color:var(--fg2);line-height:1.6">' + escAttr(r.comment) + '</p>' : '') +
                '<p style="font-size:10px;color:var(--muted);margin-top:4px">' + r.created_at + '</p></div></div>';
        }).join('') : '<p style="color:var(--muted);font-size:13px;text-align:center;padding:16px 0">Belum ada review</p>';

                var emojiHtml = '<button class="emoji-btn" id="emojiBtn" onclick="toggleEmoji(event)" title="Pilih emoticon">😀</button>';

        var revForm = currentUser
            ? '<div style="margin-top:20px;padding:18px;background:var(--accent-dim);border:1px solid var(--border);border-radius:14px">'
            + '<h4 style="font-size:14px;font-weight:700;margin-bottom:12px"><i class="fas fa-pen" style="color:var(--accent);margin-right:6px;font-size:12px"></i>Tulis Review</h4>'
            + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">'
            + '<span style="font-size:12px;color:var(--muted)">Rating:</span>'
            + '<div id="revStars" style="display:flex;gap:3px">'
            + Array.from({ length: 10 }, function(_, i) {
                return '<i class="far fa-star" style="font-size:16px;color:var(--border);cursor:pointer" data-v="' + (i + 1) + '" onclick="setRevStar(' + (i + 1) + ')" onmouseover="hoverRevStar(' + (i + 1) + ')" onmouseout="resetRevStar()"></i>';
            }).join('')
            + '</div>'
            + '<span id="revVal" style="font-size:13px;font-weight:700;color:var(--yellow)">0/10</span></div>'
            + '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:12px">'
            + '<textarea id="revComment" placeholder="Tulis pendapatmu tentang film ini..." style="width:100%;padding:12px;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--fg);font-size:13px;font-family:\'Space Grotesk\',sans-serif;resize:vertical;min-height:70px;outline:none" onfocus="this.style.borderColor=\'var(--accent)\'" onblur="this.style.borderColor=\'var(--border)\'"></textarea>'
            + emojiHtml
            + '</div>'
            + '<button onclick="submitReview(' + id + ')" class="btn-accent" style="padding:10px 20px;font-size:13px">Kirim Review</button></div>'
            : '<p style="text-align:center;color:var(--muted);font-size:13px;margin-top:16px"><a href="#" onclick="closeM();openAuthModal();return false" style="color:var(--accent);text-decoration:none">Masuk</a> untuk menulis review</p>';

        var trailerBtn = trailerKey
            ? '<button onclick="document.getElementById(\'trailerSec\').scrollIntoView({behavior:\'smooth\',block:\'center\'})" class="btn-ghost" style="border-color:var(--green);color:var(--green)"><i class="fas fa-play" style="margin-right:4px;font-size:11px"></i> Trailer</button>'
            : '';
        var trailerSection = trailerKey
            ? '<div id="trailerSec" style="margin-bottom:24px"><h3 style="font-size:17px;font-weight:700;margin-bottom:13px"><i class="fas fa-clapperboard" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Trailer</h3><div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:14px;border:1px solid var(--border);background:var(--bg)"><iframe src="https://www.youtube.com/embed/' + trailerKey + '?rel=0" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allow="autoplay;encrypted-media" allowfullscreen></iframe></div></div>'
            : '';

        // Watch Providers
        var provSection = '';
        if (provData && provData.results) {
            var region = provData.results['ID'] || provData.results['US'] || Object.values(provData.results)[0];
            if (region) {
                var provLink = region.link || '';
                var providers = (region.flatrate || []).concat(region.rent || []).concat(region.buy || []);
                if (providers.length) {
                    var provHtml = providers.map(function(p) {
                        var logo = p.logo_path ? CONFIG.tmdbImg + 'w92' + p.logo_path : '';
                        var label = p.provider_name || '';
                        var typeLabel = (region.flatrate || []).indexOf(p) !== -1 ? 'Streaming' : (region.rent || []).indexOf(p) !== -1 ? 'Sewa' : 'Beli';
                        var inner = (logo
                            ? '<img src="' + logo + '" style="width:44px;height:44px;border-radius:8px;object-fit:cover;margin:0 auto 6px;display:block" onerror="this.style.display=\'none\'">'
                            : '<div style="width:44px;height:44px;border-radius:8px;background:var(--accent-dim);margin:0 auto 6px;display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:14px;font-weight:700">' + escAttr(label.charAt(0)) + '</div>')
                            + '<p style="font-size:10.5px;font-weight:600;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + escAttr(label) + '</p>'
                            + '<p style="font-size:9px;color:var(--muted);margin-top:2px">' + typeLabel + '</p>';
                        if (provLink) {
                            return '<a href="' + escAttr(provLink) + '" target="_blank" rel="noopener" style="text-align:center;min-width:64px;text-decoration:none;color:var(--fg);transition:transform .2s" onmouseover="this.style.transform=\'translateY(-3px)\'" onmouseout="this.style.transform=\'\'">' + inner + '</a>';
                        }
                        return '<div style="text-align:center;min-width:64px">' + inner + '</div>';
                    }).join('');
                    provSection = '<div style="margin-bottom:24px"><h3 style="font-size:17px;font-weight:700;margin-bottom:13px"><i class="fas fa-tv" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Nonton Di Mana</h3><div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:6px;-ms-overflow-style:none;scrollbar-width:none">' + provHtml + '</div></div>';
                }
            }
        }

        // External IDs (IMDB, dll)
        var extSection = '';
        if (extData) {
            var links = [];
            if (extData.imdb_id) links.push('<a href="https://www.imdb.com/title/' + escAttr(extData.imdb_id) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:var(--accent-dim);border:1px solid var(--border);color:var(--fg2);text-decoration:none;font-size:13px;font-weight:500;transition:all .2s" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.color=\'var(--accent)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--fg2)\'"><i class="fas fa-star" style="color:#f5c518;font-size:15px"></i>IMDB</a>');
            if (extData.facebook_id) links.push('<a href="https://facebook.com/' + escAttr(extData.facebook_id) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:var(--accent-dim);border:1px solid var(--border);color:var(--fg2);text-decoration:none;font-size:13px;font-weight:500;transition:all .2s" onmouseover="this.style.borderColor=\'#1877f2\';this.style.color=\'#1877f2\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--fg2)\'"><i class="fab fa-facebook-f" style="color:#1877f2;font-size:15px"></i>Facebook</a>');
            if (extData.instagram_id) links.push('<a href="https://instagram.com/' + escAttr(extData.instagram_id) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:10px;background:var(--accent-dim);border:1px solid var(--border);color:var(--fg2);text-decoration:none;font-size:13px;font-weight:500;transition:all .2s" onmouseover="this.style.borderColor=\'#e4405f\';this.style.color=\'#e4405f\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.color=\'var(--fg2)\'"><i class="fab fa-instagram" style="color:#e4405f;font-size:15px"></i>Instagram</a>');
            if (links.length) {
                extSection = '<div style="margin-bottom:24px"><h3 style="font-size:17px;font-weight:700;margin-bottom:13px"><i class="fas fa-link" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Link Eksternal</h3><div style="display:flex;gap:10px;flex-wrap:wrap">' + links.join('') + '</div></div>';
            }
        }

        // ===== PERBAIKAN: Gunakan data attributes alih-alih inline string yang rapuh =====
        var posterUrl = getPoster(det.poster_path, 'w185');
        var posterLg = getPoster(det.poster_path, 'w780');
        var safeTitle = escAttr(det.title || '');

        // Bangun HTML per bagian secara terpisah, lalu gabungkan
        var htmlBackdrop = '<div style="position:relative;height:340px;overflow:hidden">'
            + '<img src="' + getBackdrop(det.backdrop_path, 'w1280') + '" style="width:100%;height:100%;object-fit:cover;filter:brightness(.35)" onerror="this.style.display=\'none\'">'
            + '<div style="position:absolute;inset:0;background:linear-gradient(to top,var(--bg2) 0%,rgba(14,14,20,.5) 45%,rgba(14,14,20,.15) 100%)"></div>'
            + '<button class="m-close" onclick="closeM()"><i class="fas fa-times"></i></button>'
            + '<div style="position:absolute;bottom:0;left:0;right:0;padding:22px 26px;display:flex;gap:20px;align-items:flex-end">'
            + '<img src="' + getPoster(det.poster_path, 'w342') + '" style="width:115px;height:172px;object-fit:cover;border-radius:14px;border:2px solid var(--border);flex-shrink:0;box-shadow:0 10px 35px rgba(0,0,0,.5);cursor:zoom-in" onclick="event.stopPropagation();openLightbox(\'' + posterLg.replace(/'/g, "\\'") + '\')" onerror="this.style.display=\'none\'">'
            + '<div style="flex:1;min-width:0">'
            + '<h2 id="detTitle" style="font-size:clamp(20px,4vw,30px);font-weight:800;line-height:1.12;margin-bottom:5px;letter-spacing:-.4px">' + safeTitle + '</h2>'
            + (det.tagline ? '<p id="detTagline" style="font-style:italic;color:var(--accent);font-size:12.5px;margin-bottom:9px;opacity:.85">"' + escAttr(det.tagline) + '"</p>' : '')
            + '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--fg2)">'
            + '<span style="color:' + vc + ';font-weight:700;font-size:15px"><i class="fas fa-star" style="font-size:13px"></i> ' + v.toFixed(1) + '</span>'
            + '<span style="color:var(--muted)">(' + formatNum(det.vote_count) + ' ulasan)</span>'
            + '<span><i class="far fa-calendar" style="margin-right:3px;color:var(--muted)"></i>' + (det.release_date || '—') + '</span>'
            + '<span><i class="far fa-clock" style="margin-right:3px;color:var(--muted)"></i>' + (det.runtime ? det.runtime + ' min' : '—') + '</span>'
            + '</div></div></div></div>';

        var htmlGenres = '<div id="detGenres" style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px">' + genH + '</div>';

        // PERBAIKAN: Gunakan data attributes untuk menghindari injection
        var htmlButtons = '<div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap">'
            + '<button id="wlBtn" data-id="' + id + '" data-title="' + safeTitle + '" data-poster="' + posterUrl.replace(/"/g, '&quot;') + '" onclick="toggleWl(this)" class="btn-ghost" style="border-color:var(--accent);color:var(--accent)"><i class="fas fa-bookmark" id="wlBtnIcon"></i><span id="wlBtnText">Watchlist</span></button>'
            + '<button id="favBtn" data-id="' + id + '" data-title="' + safeTitle + '" data-poster="' + posterUrl.replace(/"/g, '&quot;') + '" onclick="toggleFav(this)" class="btn-ghost"><i class="far fa-heart" id="favBtnIcon"></i><span id="favBtnText">Favorit</span></button>'
            + trailerBtn
            + '</div>';

        var htmlRating = '<div style="margin-bottom:22px;padding:16px 18px;background:var(--accent-dim);border:1px solid var(--border);border-radius:14px">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
            + '<span style="font-size:12.5px;font-weight:600;color:var(--fg2)"><i class="fas fa-chart-simple" style="margin-right:5px;color:var(--muted)"></i>Rating TMDB</span>'
            + '<span style="font-size:24px;font-weight:800;color:' + vc + '">' + v.toFixed(1) + '<span style="font-size:12px;color:var(--muted);font-weight:400;margin-left:3px">/ 10</span></span>'
            + '</div>'
            + '<div class="rbar-bg"><div class="rbar-fill" style="--w:' + pct + '%;background:' + vc + '"></div></div>'
            + '</div>';

        var htmlSynopsis = '<div style="margin-bottom:24px">'
            + '<h3 style="font-size:17px;font-weight:700;margin-bottom:10px"><i class="fas fa-align-left" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Sinopsis</h3>'
            + '<p id="detOverview" style="color:var(--fg2);font-size:14px;line-height:1.8">' + (det.overview ? escAttr(det.overview) : 'Sinopsis belum tersedia.') + '</p>'
            + '</div>';

        var htmlInfo = '<div id="detLangs" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;padding:16px;background:var(--accent-dim);border:1px solid var(--border);border-radius:14px">'
            + (dir ? '<div><p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Sutradara</p><p style="font-size:13.5px;font-weight:600">' + escAttr(dir.name) + '</p></div>' : '')
            + (writer ? '<div><p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Penulis</p><p style="font-size:13.5px;font-weight:600">' + escAttr(writer.name) + '</p></div>' : '')
            + '<div><p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Bahasa</p><p class="det-spoken" style="font-size:13.5px;font-weight:600">' + ((det.spoken_languages || []).map(function(l) { return l.name; }).join(', ') || '—') + '</p></div>'
            + '<div><p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Anggaran</p><p style="font-size:13.5px;font-weight:600">' + (det.budget ? '$' + formatNum(det.budget) : '—') + '</p></div>'
            + '<div><p style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Pendapatan</p><p style="font-size:13.5px;font-weight:600">' + (det.revenue ? '$' + formatNum(det.revenue) : '—') + '</p></div>'
            + '</div>';

        // PERBAIKAN KRITIS: Hapus unary + yang menyebabkan NaN
        var htmlCompanies = '';
        if (det.production_companies && det.production_companies.length) {
            htmlCompanies = '<div style="margin-bottom:24px;padding:16px;background:var(--accent-dim);border:1px solid var(--border);border-radius:14px">'
                + '<h3 style="font-size:17px;font-weight:700;margin-bottom:13px"><i class="fas fa-building" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Studio Produksi</h3>'
                + '<div style="display:flex;gap:14px;overflow-x:auto;padding-bottom:6px;-ms-overflow-style:none;scrollbar-width:none">'
                + det.production_companies.slice(0, 10).map(function(c) {
                    var logoSrc = c.logo_path ? CONFIG.tmdbImg + 'w185' + c.logo_path : '';
                    if (logoSrc && logoSrc.endsWith('.svg')) logoSrc = CONFIG.tmdbImg + 'original' + c.logo_path;
                    var wrapStyle = 'width:80px;height:50px;background:var(--accent-dim);border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;overflow:hidden;border:1px solid var(--border);transition:background .6s,border-color .6s,box-shadow .6s';
                    var imgStyle = 'max-width:90%;max-height:90%;object-fit:contain;display:block';
                    var placeholder = '<div style="' + wrapStyle + '"><span style="font-size:16px;font-weight:800;color:var(--accent)">' + escAttr(c.name.charAt(0)) + '</span></div>';
                    var logo = logoSrc
                        ? '<div style="' + wrapStyle + '"><img src="' + logoSrc + '" style="' + imgStyle + '" onload="colorizeLogo(this)" onerror="this.parentElement.replaceWith(this.parentElement.cloneNode(true))"></div>'
                        : placeholder;
                    return '<div style="text-align:center;flex-shrink:0;min-width:90px">' + logo + '<p style="font-size:10px;font-weight:600;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + escAttr(c.name) + '</p></div>';
                }).join('')
                + '</div></div>';
        }

        // Galeri gambar
        var htmlGallery = '';
        if (imgData && imgData.backdrops && imgData.backdrops.length) {
            var bds = imgData.backdrops.slice(0, 10);
            htmlGallery += '<div style="margin-bottom:24px">'
                + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px">'
                + '<h3 style="font-size:17px;font-weight:700"><i class="fas fa-panorama" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Gambar Latar</h3>'
                + '<span style="font-size:12px;color:var(--muted);font-weight:600;background:var(--accent-dim);padding:3px 10px;border-radius:6px">' + (imgData.total_backdrops || bds.length) + ' gambar</span></div>'
                + '<div class="gallery-scroll">'
                + bds.map(function(b) {
                    return '<div class="gallery-item" style="width:240px;height:135px" onclick="openLightbox(\'' + (CONFIG.tmdbImg + 'w1280' + b.file_path).replace(/'/g, "\\'") + '\')"><img src="' + CONFIG.tmdbImg + 'w300' + b.file_path + '" alt="Backdrop" loading="lazy"></div>';
                }).join('')
                + '</div></div>';
        }
        if (imgData && imgData.posters && imgData.posters.length) {
            var pts = imgData.posters.slice(0, 10);
            htmlGallery += '<div style="margin-bottom:24px">'
                + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:13px">'
                + '<h3 style="font-size:17px;font-weight:700"><i class="fas fa-image" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Poster</h3>'
                + '<span style="font-size:12px;color:var(--muted);font-weight:600;background:var(--accent-dim);padding:3px 10px;border-radius:6px">' + (imgData.total_posters || pts.length) + ' poster</span></div>'
                + '<div class="gallery-scroll">'
                + pts.map(function(p) {
                    return '<div class="gallery-item" style="width:110px;height:165px;border-radius:10px" onclick="openLightbox(\'' + (CONFIG.tmdbImg + 'w780' + p.file_path).replace(/'/g, "\\'") + '\')"><img src="' + CONFIG.tmdbImg + 'w300' + p.file_path + '" alt="Poster" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>';
                }).join('')
                + '</div></div>';
        }

        var htmlCast = cast.length
            ? '<div style="margin-bottom:24px"><h3 style="font-size:17px;font-weight:700;margin-bottom:13px"><i class="fas fa-users" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Pemeran</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:12px">' + castH + '</div></div>'
            : '';

        var htmlReviews = '<div style="margin-bottom:24px"><h3 style="font-size:17px;font-weight:700;margin-bottom:14px"><i class="fas fa-comments" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Review Pengguna (' + reviews.length + ')</h3>' + revH + revForm + '</div>';

        var htmlSimilar = simM.length
            ? '<div><h3 style="font-size:17px;font-weight:700;margin-bottom:13px"><i class="fas fa-clone" style="margin-right:6px;color:var(--accent);font-size:13px"></i>Film Serupa</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(105px,1fr));gap:12px">' + simH + '</div></div>'
            : '';

        // Gabungkan semua bagian — PERBAIKAN: Tidak ada unary + lagi
        box.innerHTML = htmlBackdrop
            + '<div style="padding:22px 26px 30px">'
            + htmlGenres
            + htmlButtons
            + htmlRating
            + htmlSynopsis
            + htmlInfo
            + htmlCompanies
            + htmlGallery
            + htmlCast
            + provSection
            + extSection
            + trailerSection
            + htmlReviews
            + htmlSimilar
            + '</div>';

        // Cek status watchlist & favorit
        dbCheckWatchlist(det.id).then(function(r) {
            if (r.in_watchlist) {
                var t = document.getElementById('wlBtnText');
                var ic = document.getElementById('wlBtnIcon');
                if (t) t.textContent = 'Hapus dari Watchlist';
                if (ic) ic.className = 'fas fa-bookmark';
            }
        });
        dbCheckFavorite(det.id).then(function(r) {
            if (r.is_favorite) {
                var t = document.getElementById('favBtnText');
                var ic = document.getElementById('favBtnIcon');
                if (t) t.textContent = 'Hapus Favorit';
                if (ic) { ic.className = 'fas fa-heart'; ic.style.color = 'var(--red)'; }
            }
        });
        if (currentUser) dbAddHistory(det.id, det.title, getPoster(det.poster_path, 'w185'));
    } catch (e) {
        box.innerHTML = '<div style="padding:56px 24px;text-align:center"><i class="fas fa-circle-exclamation" style="font-size:34px;color:var(--red)"></i><p style="margin-top:12px;color:var(--fg2);font-size:13.5px">Gagal: ' + escAttr(e.message) + '</p><button class="pg" style="margin-top:18px" onclick="closeM()">Tutup</button></div>';
    }
}

// PERBAIKAN: Hapus changeLang yang buggy (variabel det tidak ada di scope)
// Jika dibutuhkan, implementasikan ulang dengan melewatkan data yang diperlukan sebagai parameter

function openLightbox(src) {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightbox').classList.add('open');
    document.body.style.overflow = 'hidden';
}
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    if (!document.getElementById('modal').classList.contains('open')) {
        document.body.style.overflow = '';
    }
}

function closeM() { document.getElementById('modal').classList.remove('open'); document.body.style.overflow = ''; }

// ========== REVIEW STARS ==========
var selectedRevStar = 0;
function setRevStar(v) { selectedRevStar = v; updateRevStars(v); }
function hoverRevStar(v) { updateRevStars(v); }
function resetRevStar() { updateRevStars(selectedRevStar); }
function updateRevStars(v) {
    var valEl = document.getElementById('revVal');
    if (valEl) valEl.textContent = v + '/10';
    var stars = document.querySelectorAll('#revStars i');
    stars.forEach(function(s, i) {
        s.className = (i < v ? 'fas' : 'far') + ' fa-star';
        s.style.color = i < v ? 'var(--yellow)' : 'var(--border)';
    });
}
async function submitReview(tmdbId) {
    if (!selectedRevStar) { toast('Pilih rating dulu', 'err'); return; }
    var comment = document.getElementById('revComment').value.trim();
    var res = await dbAddReview(tmdbId, selectedRevStar, comment);
    if (res.status === 'ok') { toast('Review dikirim!', 'ok'); selectedRevStar = 0; openM(tmdbId); }
    else if (res.error) toast(res.error, 'err');
}
async function deleteRev(revId, tmdbId) { await dbDeleteReview(revId); toast('Review dihapus', 'ok'); openM(tmdbId); }

// ========== WATCHLIST ==========
function updateWlCount() {
    dbGetStats().then(function(s) {
        var el = document.getElementById('wlCount');
        if (el) el.textContent = s.watchlist_count;
    });
}

// PERBAIKAN: Baca data dari data attributes alih-alih parameter string
function toggleWl(btnEl) {
    var id = parseInt(btnEl.getAttribute('data-id'));
    var title = btnEl.getAttribute('data-title');
    var poster = btnEl.getAttribute('data-poster');
    dbCheckWatchlist(id).then(function(r) {
        if (r.in_watchlist) {
            dbRemoveWatchlist(id).then(function() {
                updateWlCount();
                var t = document.getElementById('wlBtnText');
                var ic = document.getElementById('wlBtnIcon');
                if (t) t.textContent = 'Watchlist';
                if (ic) { ic.className = 'fas fa-bookmark'; ic.style.color = ''; }
                toast('Dihapus dari watchlist', 'ok');
            });
        } else {
            dbAddWatchlist(id, title, poster).then(function(res) {
                updateWlCount();
                var t = document.getElementById('wlBtnText');
                var ic = document.getElementById('wlBtnIcon');
                if (t) t.textContent = 'Hapus dari Watchlist';
                if (ic) { ic.className = 'fas fa-bookmark'; ic.style.color = ''; }
                if (res.status === 'ok') toast('Ditambahkan ke watchlist', 'ok');
                if (res.status === 'dup') toast('Sudah ada', 'err');
            });
        }
    });
}

function openWlModal() {
    var modal = document.getElementById('wlModal'), content = document.getElementById('wlContent');
    content.innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:22px;color:var(--accent)"></i></div>';
    modal.classList.add('open'); document.body.style.overflow = 'hidden';
    dbGetWatchlist().then(function(list) {
        if (!list.length) {
            content.innerHTML = '<div style="text-align:center;padding:40px 0"><i class="fas fa-bookmark" style="font-size:36px;color:var(--border);margin-bottom:14px;display:block"></i><p style="color:var(--muted);font-size:14px">Watchlist kosong</p></div>';
            return;
        }
        content.innerHTML = list.map(function(item) {
            var stars = '';
            for (var i = 1; i <= 5; i++) {
                var f = i <= Math.round(item.rating / 2);
                stars += '<i class="' + (f ? 'fas' : 'far') + ' fa-star" style="color:' + (f ? 'var(--yellow)' : 'var(--border)') + ';font-size:12px;cursor:pointer" onclick="rateWl(' + item.tmdb_id + ',' + (i * 2) + ')"></i>';
            }
            return '<div style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);align-items:flex-start">'
                + '<img src="' + (item.poster || 'https://placehold.co/60x90/13131b/5c5a56?text=?') + '" style="width:50px;height:75px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.src=\'https://placehold.co/60x90/13131b/5c5a56?text=?\'">'
                + '<div style="flex:1;min-width:0">'
                + '<p style="font-weight:600;font-size:14px;margin-bottom:4px">' + escAttr(item.title) + '</p>'
                + '<div style="display:flex;align-items:center;gap:3px;margin-bottom:4px">' + stars + '<span style="font-size:11px;color:var(--muted);margin-left:6px">' + (item.rating || 0).toFixed(1) + '/10</span></div>'
                + '<input value="' + escAttr(item.notes || '') + '" placeholder="Tambah catatan..." onchange="saveNotes(' + item.tmdb_id + ',this.value)" style="width:100%;padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--fg);font-size:11px;font-family:\'Space Grotesk\',sans-serif;outline:none;margin-top:4px" onfocus="this.style.borderColor=\'var(--accent)\'" onblur="this.style.borderColor=\'var(--border)\'">'
                + '</div>'
                + '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">'
                + '<button onclick="openM(' + item.tmdb_id + ')" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--fg2);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center"><i class="fas fa-info"></i></button>'
                + '<button onclick="removeWl(' + item.tmdb_id + ')" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--red);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center"><i class="fas fa-trash"></i></button>'
                + '</div></div>';
        }).join('');
    });
}
function closeWlModal() { document.getElementById('wlModal').classList.remove('open'); document.body.style.overflow = ''; }
function removeWl(id) { dbRemoveWatchlist(id).then(function() { updateWlCount(); openWlModal(); toast('Dihapus', 'ok'); }); }
function rateWl(id, rating) { dbUpdateWatchlist(id, { rating: rating }).then(function() { openWlModal(); }); }
function saveNotes(id, notes) { dbUpdateWatchlist(id, { notes: notes }); }

// ========== FAVORITES ==========
function updateFavCount() {
    dbGetStats().then(function(s) {
        var el = document.getElementById('favCount');
        if (el) el.textContent = s.favorites_count;
    });
}

function toggleFav(btnEl) {
    if (!currentUser) { toast('Login dulu untuk favorit', 'err'); openAuthModal(); return; }
    var id = parseInt(btnEl.getAttribute('data-id'));
    var title = btnEl.getAttribute('data-title');
    var poster = btnEl.getAttribute('data-poster');
    dbCheckFavorite(id).then(function(r) {
        if (r.is_favorite) {
            dbRemoveFavorite(id).then(function() {
                updateFavCount();
                var t = document.getElementById('favBtnText');
                var ic = document.getElementById('favBtnIcon');
                if (t) t.textContent = 'Favorit';
                if (ic) { ic.className = 'far fa-heart'; ic.style.color = ''; }
                toast('Dihapus dari favorit', 'ok');
            });
        } else {
            dbAddFavorite(id, title, poster).then(function(res) {
                updateFavCount();
                var t = document.getElementById('favBtnText');
                var ic = document.getElementById('favBtnIcon');
                if (t) t.textContent = 'Hapus Favorit';
                if (ic) { ic.className = 'fas fa-heart'; ic.style.color = 'var(--red)'; }
                if (res.status === 'ok') toast('Ditambahkan ke favorit', 'ok');
            });
        }
    });
}

function openFavModal() {
    var modal = document.getElementById('favModal'), content = document.getElementById('favContent');
    content.innerHTML = '<div style="text-align:center;padding:30px"><i class="fas fa-spinner fa-spin" style="font-size:22px;color:var(--accent)"></i></div>';
    modal.classList.add('open'); document.body.style.overflow = 'hidden';
    dbGetFavorites().then(function(list) {
        if (!list.length) {
            content.innerHTML = '<div style="text-align:center;padding:40px 0"><i class="fas fa-heart" style="font-size:36px;color:var(--border);margin-bottom:14px;display:block"></i><p style="color:var(--muted);font-size:14px">Belum ada favorit</p></div>';
            return;
        }
        content.innerHTML = list.map(function(item) {
            return '<div style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--border);align-items:center">'
                + '<img src="' + (item.poster || 'https://placehold.co/60x90/13131b/5c5a56?text=?') + '" style="width:50px;height:75px;object-fit:cover;border-radius:8px;flex-shrink:0" onerror="this.src=\'https://placehold.co/60x90/13131b/5c5a56?text=?\'">'
                + '<div style="flex:1;min-width:0"><p style="font-weight:600;font-size:14px">' + escAttr(item.title) + '</p><p style="font-size:11px;color:var(--muted);margin-top:2px">Ditambahkan: ' + (item.added_at || '—') + '</p></div>'
                + '<div style="display:flex;gap:6px;flex-shrink:0">'
                + '<button onclick="openM(' + item.tmdb_id + ')" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--fg2);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center"><i class="fas fa-info"></i></button>'
                + '<button onclick="removeFav(' + item.tmdb_id + ')" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--red);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center"><i class="fas fa-trash"></i></button>'
                + '</div></div>';
        }).join('');
    });
}
function closeFavModal() { document.getElementById('favModal').classList.remove('open'); document.body.style.overflow = ''; }
function removeFav(id) { dbRemoveFavorite(id).then(function() { updateFavCount(); openFavModal(); toast('Dihapus dari favorit', 'ok'); }); }

// ========== KEYBOARD & SCROLL ==========
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'd') { e.preventDefault(); toggleTheme(); }
    if (e.key === 'Escape') { closeM(); closeWlModal(); closeFavModal(); closeAuthModal(); closeProfile(); closeLightbox(); }
    if (e.key === 'Escape') {
        closeM(); closeWlModal(); closeFavModal(); closeAuthModal(); closeProfile(); closeLightbox();
        var eb = document.getElementById('emojiBox');
        if (eb) eb.classList.remove('open');
    }
    if (e.key === 'Escape') {
    closeM(); closeWlModal(); closeFavModal(); closeAuthModal(); closeProfile(); closeLightbox(); closeEmoji();
}
});
window.addEventListener('scroll', function() {
    document.getElementById('hdr').style.boxShadow = window.scrollY > 30 ? '0 4px 30px rgba(0,0,0,.25)' : 'none';
}, { passive: true });

boot();