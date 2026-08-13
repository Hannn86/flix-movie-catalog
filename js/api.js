async function tmdbFetch(path, params) {
    params = params || {};
    var url = new URL(CONFIG.tmdbApi + path);
    url.searchParams.set('api_key', CONFIG.tmdbKey);
    url.searchParams.set('language', CONFIG.lang);
    for (var key in params) url.searchParams.set(key, params[key]);
    var r = await fetch(url);
    if (!r.ok) { var e = await r.json().catch(function() { return {}; }); throw new Error(e.status_message || 'HTTP ' + r.status); }
    return r.json();
}

function getPoster(p, s) { s = s || 'w500'; return p ? CONFIG.tmdbImg + s + p : 'https://placehold.co/500x750/13131b/2a2a38?text=No+Poster'; }
function getBackdrop(p, s) { s = s || 'original'; return p ? CONFIG.tmdbImg + s + p : ''; }
function getYear(d) { return d ? d.split('-')[0] : '—'; }
function formatNum(n) { if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'; return '' + n; }
function voteClass(v) { return v >= 7 ? 'hi' : v >= 5 ? 'mid' : 'lo'; }
function voteColor(v) { return v >= 7 ? 'var(--green)' : v >= 5 ? 'var(--yellow)' : 'var(--red)'; }

function debounce(fn, ms) { var t; return function() { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function() { fn.apply(c, a); }, ms); }; }

function toast(msg, type) {
    type = type || '';
    var c = document.getElementById('toasts'), d = document.createElement('div');
    d.className = 'toast ' + type;
    var ic = type === 'err' ? 'fa-circle-exclamation' : type === 'ok' ? 'fa-circle-check' : 'fa-circle-info';
    var cl = type === 'err' ? 'var(--red)' : type === 'ok' ? 'var(--green)' : 'var(--accent)';
    d.innerHTML = '<i class="fas ' + ic + '" style="color:' + cl + ';flex-shrink:0"></i><span>' + msg + '</span>';
    c.appendChild(d);
    setTimeout(function() { d.style.transition = 'opacity .3s,transform .3s'; d.style.opacity = '0'; d.style.transform = 'translateY(-8px)'; setTimeout(function() { d.remove(); }, 300); }, 3200);
}

function colorizeLogo(img) {
    try {
        var c = document.createElement('canvas');
        var ctx = c.getContext('2d');
        c.width = img.naturalWidth || 50;
        c.height = img.naturalHeight || 50;
        ctx.drawImage(img, 0, 0);
        var d = ctx.getImageData(0, 0, c.width, c.height).data;
        var r = 0, g = 0, b = 0, n = 0;
        for (var i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 128) {
                if (!(d[i] > 220 && d[i + 1] > 220 && d[i + 2] > 220)) {
                    r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
                }
            }
        }
        if (n > 3) {
            var cr = Math.round(r / n), cg = Math.round(g / n), cb = Math.round(b / n);
            var brightness = (cr * 299 + cg * 587 + cb * 114) / 1000;
            if (brightness < 30) { cr = Math.min(cr + 80, 255); cg = Math.min(cg + 80, 255); cb = Math.min(cb + 80, 255); }
            if (brightness > 230) { cr = Math.round(cr * 0.5 + 128); cg = Math.round(cg * 0.5 + 128); cb = Math.round(cb * 0.5 + 128); }
            var color = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
            var wrap = img.parentElement;
            wrap.style.background = color;
            wrap.style.borderColor = 'rgba(' + cr + ',' + cg + ',' + cb + ',.25)';
            wrap.style.boxShadow = '0 0 14px rgba(' + cr + ',' + cg + ',' + cb + ',.15)';
        }
    } catch (e) {}
}

function toggleEmoji(e) {
    if (e) e.stopPropagation();
    var overlay = document.getElementById('emojiOverlay');
    if (overlay) overlay.classList.add('open');
}
function closeEmoji() {
    var overlay = document.getElementById('emojiOverlay');
    if (overlay) overlay.classList.remove('open');
}
function pickEmoji(em) {
    var ta = document.getElementById('revComment');
    if (!ta) return;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var val = ta.value;
    ta.value = val.substring(0, start) + em + val.substring(end);
    ta.focus();
    ta.selectionStart = ta.selectionEnd = start + em.length;
    closeEmoji();
}