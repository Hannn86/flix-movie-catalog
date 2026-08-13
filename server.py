import sqlite3, os, hashlib
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = 'flix-secret-key-2025-x'
CORS(app, supports_credentials=True)

DB_PATH = os.path.join(os.path.dirname(__file__), 'flix.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS watchlist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, tmdb_id INTEGER UNIQUE NOT NULL,
        title TEXT NOT NULL, poster TEXT, rating REAL DEFAULT 0,
        notes TEXT DEFAULT '', added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, tmdb_id INTEGER UNIQUE NOT NULL,
        title TEXT NOT NULL, poster TEXT, added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, tmdb_id INTEGER NOT NULL,
        username TEXT NOT NULL, rating INTEGER NOT NULL,
        comment TEXT DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER, tmdb_id INTEGER UNIQUE NOT NULL,
        title TEXT NOT NULL, poster TEXT, viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    conn.commit()
    return conn


def get_user():
    uid = session.get('user_id')
    if not uid: return None, None
    return uid, session.get('username')


# ========== STATIC FILES ==========
@app.route('/')
def index(): return send_from_directory('.', 'index.html')
@app.route('/css/<path:path>')
def css_files(path): return send_from_directory('css', path)
@app.route('/js/<path:path>')
def js_files(path): return send_from_directory('js', path)


# ========== AUTH ==========
@app.route('/api/auth/register', methods=['POST'])
def register():
    d = request.json
    u, p = d.get('username','').strip(), d.get('password','')
    if len(u) < 3: return jsonify({'error':'Username minimal 3 karakter'}), 400
    if len(p) < 4: return jsonify({'error':'Password minimal 4 karakter'}), 400
    conn = get_db()
    try:
        conn.execute('INSERT INTO users (username, password_hash) VALUES (?,?)',
                     (u, generate_password_hash(p)))
        conn.commit()
        user = conn.execute('SELECT * FROM users WHERE username=?',(u,)).fetchone()
        session['user_id'] = user['id']
        session['username'] = user['username']
        conn.close()
        return jsonify({'status':'ok','username':user['username']})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error':'Username sudah dipakai'}), 409

@app.route('/api/auth/login', methods=['POST'])
def login():
    d = request.json
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE username=?',(d.get('username',''),)).fetchone()
    conn.close()
    if not user or not check_password_hash(user['password_hash'], d.get('password','')):
        return jsonify({'error':'Username atau password salah'}), 401
    session['user_id'] = user['id']
    session['username'] = user['username']
    return jsonify({'status':'ok','username':user['username']})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status':'ok'})

@app.route('/api/auth/me', methods=['GET'])
def me():
    uid, uname = get_user()
    if not uid: return jsonify({'logged_in': False})
    return jsonify({'logged_in': True, 'user_id': uid, 'username': uname})


# ========== WATCHLIST ==========
@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    uid, _ = get_user()
    conn = get_db()
    if uid:
        rows = conn.execute('SELECT * FROM watchlist WHERE user_id=? ORDER BY added_at DESC',(uid,)).fetchall()
    else:
        rows = conn.execute('SELECT * FROM watchlist WHERE user_id IS NULL ORDER BY added_at DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/watchlist', methods=['POST'])
def add_watchlist():
    uid, _ = get_user()
    d = request.json
    conn = get_db()
    try:
        conn.execute('INSERT INTO watchlist (user_id, tmdb_id, title, poster) VALUES (?,?,?,?)',
                     (uid, d['tmdb_id'], d['title'], d.get('poster','')))
        conn.commit(); conn.close()
        return jsonify({'status':'ok'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'status':'dup'}), 409

@app.route('/api/watchlist/<int:tmdb_id>', methods=['DELETE'])
def remove_watchlist(tmdb_id):
    uid, _ = get_user()
    conn = get_db()
    if uid:
        conn.execute('DELETE FROM watchlist WHERE tmdb_id=? AND user_id=?',(tmdb_id,uid))
    else:
        conn.execute('DELETE FROM watchlist WHERE tmdb_id=? AND user_id IS NULL',(tmdb_id,))
    conn.commit(); conn.close()
    return jsonify({'status':'ok'})

@app.route('/api/watchlist/<int:tmdb_id>', methods=['PATCH'])
def update_watchlist(tmdb_id):
    uid, _ = get_user()
    d = request.json
    conn = get_db()
    if 'rating' in d:
        conn.execute('UPDATE watchlist SET rating=? WHERE tmdb_id=? AND (user_id=? OR user_id IS NULL)',
                     (d['rating'], tmdb_id, uid))
    if 'notes' in d:
        conn.execute('UPDATE watchlist SET notes=? WHERE tmdb_id=? AND (user_id=? OR user_id IS NULL)',
                     (d['notes'], tmdb_id, uid))
    conn.commit(); conn.close()
    return jsonify({'status':'ok'})

@app.route('/api/watchlist/check/<int:tmdb_id>', methods=['GET'])
def check_watchlist(tmdb_id):
    uid, _ = get_user()
    conn = get_db()
    if uid:
        row = conn.execute('SELECT id FROM watchlist WHERE tmdb_id=? AND user_id=?',(tmdb_id,uid)).fetchone()
    else:
        row = conn.execute('SELECT id FROM watchlist WHERE tmdb_id=? AND user_id IS NULL',(tmdb_id,)).fetchone()
    conn.close()
    return jsonify({'in_watchlist': row is not None})


# ========== FAVORITES ==========
@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    uid, _ = get_user()
    conn = get_db()
    rows = conn.execute('SELECT * FROM favorites WHERE user_id=? ORDER BY added_at DESC',(uid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    uid, _ = get_user()
    if not uid: return jsonify({'error':'Login dulu'}), 401
    d = request.json
    conn = get_db()
    try:
        conn.execute('INSERT INTO favorites (user_id, tmdb_id, title, poster) VALUES (?,?,?,?)',
                     (uid, d['tmdb_id'], d['title'], d.get('poster','')))
        conn.commit(); conn.close()
        return jsonify({'status':'ok'})
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'status':'dup'}), 409

@app.route('/api/favorites/<int:tmdb_id>', methods=['DELETE'])
def remove_favorite(tmdb_id):
    uid, _ = get_user()
    conn = get_db()
    conn.execute('DELETE FROM favorites WHERE tmdb_id=? AND user_id=?',(tmdb_id,uid))
    conn.commit(); conn.close()
    return jsonify({'status':'ok'})

@app.route('/api/favorites/check/<int:tmdb_id>', methods=['GET'])
def check_favorite(tmdb_id):
    uid, _ = get_user()
    conn = get_db()
    row = conn.execute('SELECT id FROM favorites WHERE tmdb_id=? AND user_id=?',(tmdb_id,uid)).fetchone()
    conn.close()
    return jsonify({'is_favorite': row is not None})


# ========== REVIEWS ==========
@app.route('/api/reviews/<int:tmdb_id>', methods=['GET'])
def get_reviews(tmdb_id):
    conn = get_db()
    rows = conn.execute('SELECT * FROM reviews WHERE tmdb_id=? ORDER BY created_at DESC',(tmdb_id,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.route('/api/reviews', methods=['POST'])
def add_review():
    uid, uname = get_user()
    if not uid: return jsonify({'error':'Login dulu'}), 401
    d = request.json
    conn = get_db()
    conn.execute('INSERT INTO reviews (user_id, tmdb_id, username, rating, comment) VALUES (?,?,?,?,?)',
                 (uid, d['tmdb_id'], uname, d['rating'], d.get('comment','')))
    conn.commit(); conn.close()
    return jsonify({'status':'ok'})

@app.route('/api/reviews/<int:review_id>', methods=['DELETE'])
def delete_review(review_id):
    uid, _ = get_user()
    conn = get_db()
    conn.execute('DELETE FROM reviews WHERE id=? AND user_id=?',(review_id,uid))
    conn.commit(); conn.close()
    return jsonify({'status':'ok'})


# ========== HISTORY ==========
@app.route('/api/history', methods=['POST'])
def add_history():
    uid, _ = get_user()
    if not uid: return jsonify({'status':'ok'})
    d = request.json
    conn = get_db()
    try:
        conn.execute('INSERT INTO history (user_id, tmdb_id, title, poster) VALUES (?,?,?,?)',
                     (uid, d['tmdb_id'], d['title'], d.get('poster','')))
        conn.commit()
    except sqlite3.IntegrityError:
        # PERBAIKAN: Update timestamp jika film sudah ada di history
        conn.execute('UPDATE history SET viewed_at = CURRENT_TIMESTAMP WHERE user_id = ? AND tmdb_id = ?',
                     (uid, d['tmdb_id']))
        conn.commit()
    conn.close()
    return jsonify({'status':'ok'})

@app.route('/api/history', methods=['GET'])
def get_history():
    uid, _ = get_user()
    if not uid: return jsonify([])
    conn = get_db()
    rows = conn.execute('SELECT * FROM history WHERE user_id=? ORDER BY viewed_at DESC LIMIT 50',(uid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ========== PROFILE / STATS ==========
@app.route('/api/profile', methods=['GET'])
def get_profile():
    uid, uname = get_user()
    if not uid: return jsonify({'error':'Login dulu'}), 401
    conn = get_db()
    wl = conn.execute('SELECT COUNT(*) as c FROM watchlist WHERE user_id=?',(uid,)).fetchone()['c']
    fv = conn.execute('SELECT COUNT(*) as c FROM favorites WHERE user_id=?',(uid,)).fetchone()['c']
    rv = conn.execute('SELECT COUNT(*) as c FROM reviews WHERE user_id=?',(uid,)).fetchone()['c']
    hi = conn.execute('SELECT COUNT(*) as c FROM history WHERE user_id=?',(uid,)).fetchone()['c']
    joined = conn.execute('SELECT joined_at FROM users WHERE id=?',(uid,)).fetchone()['joined_at']
    recent = conn.execute('SELECT * FROM reviews WHERE user_id=? ORDER BY created_at DESC LIMIT 5',(uid,)).fetchall()
    conn.close()
    return jsonify({
        'username': uname, 'joined_at': joined,
        'stats': {'watchlist': wl, 'favorites': fv, 'reviews': rv, 'history': hi},
        'recent_reviews': [dict(r) for r in recent]
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    uid, _ = get_user()
    conn = get_db()
    wl = conn.execute('SELECT COUNT(*) as c FROM watchlist WHERE user_id=? OR user_id IS NULL',(uid,)).fetchone()['c']
    fv = 0
    if uid: fv = conn.execute('SELECT COUNT(*) as c FROM favorites WHERE user_id=?',(uid,)).fetchone()['c']
    conn.close()
    return jsonify({'watchlist_count': wl, 'favorites_count': fv})


if __name__ == '__main__':
    print('\n  FLIX siap di: http://localhost:8080\n')
    app.run(host='0.0.0.0', port=8080, debug=True)