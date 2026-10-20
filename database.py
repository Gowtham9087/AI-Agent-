import sqlite3
import uuid

DB = "shop.db"

def get_conn():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    c = conn.cursor()
    
    # Chat sessions and messages
    c.execute("""CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        title TEXT DEFAULT 'New chat',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )""")
    c.execute("""CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        role TEXT,
        content TEXT,
        attachments TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions (session_id) ON DELETE CASCADE
    )""")
    try:
        c.execute("ALTER TABLE messages ADD COLUMN attachments TEXT DEFAULT ''")
    except Exception:
        pass
    conn.commit()
    conn.close()

# Session & Message helpers
def create_session(session_id: str = None, title: str = "New chat") -> str:
    if not session_id:
        session_id = str(uuid.uuid4())
    conn = get_conn()
    conn.execute(
        "INSERT INTO sessions (session_id, title, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        (session_id, title)
    )
    conn.commit()
    conn.close()
    return session_id

def get_sessions() -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT session_id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_session(session_id: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT session_id, title, created_at, updated_at FROM sessions WHERE session_id = ?",
        (session_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None

def update_session_title(session_id: str, title: str):
    conn = get_conn()
    conn.execute(
        "UPDATE sessions SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?",
        (title, session_id)
    )
    conn.commit()
    conn.close()

def delete_session(session_id: str):
    conn = get_conn()
    conn.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()

def add_chat_message(session_id: str, role: str, content: str, attachments: str = "") -> int:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO messages (session_id, role, content, attachments) VALUES (?, ?, ?, ?)",
        (session_id, role, content, attachments or "")
    )
    msg_id = cur.lastrowid
    conn.execute(
        "UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = ?",
        (session_id,)
    )
    conn.commit()
    conn.close()
    return msg_id

def update_chat_message(message_id: int, content: str, attachments: str = None):
    conn = get_conn()
    if attachments is not None:
        conn.execute(
            "UPDATE messages SET content = ?, attachments = ? WHERE id = ?",
            (content, attachments, message_id)
        )
    else:
        conn.execute(
            "UPDATE messages SET content = ? WHERE id = ?",
            (content, message_id)
        )
    conn.commit()
    conn.close()

def delete_messages_after(session_id: str, message_id: int):
    conn = get_conn()
    conn.execute(
        "DELETE FROM messages WHERE session_id = ? AND id > ?",
        (session_id, message_id)
    )
    conn.commit()
    conn.close()

def get_chat_messages(session_id: str) -> list:
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, role, content, attachments, created_at FROM messages WHERE session_id = ? ORDER BY id ASC",
        (session_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]