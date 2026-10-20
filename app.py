import os
import uuid
import json
import re
from flask import Flask, request, jsonify, send_from_directory
from database import (
    init_db,
    create_session,
    get_sessions,
    get_session,
    update_session_title,
    delete_session,
    add_chat_message,
    update_chat_message,
    delete_messages_after,
    get_chat_messages,
)
from agent import run_agent_turn

app = Flask(__name__)

UPLOAD_FOLDER = os.path.join("static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"}
VIDEO_EXTS = {".mp4", ".webm", ".ogg", ".mov", ".mkv"}
TEXT_EXTS = {".txt", ".py", ".js", ".ts", ".html", ".css", ".json", ".csv", ".md", ".xml", ".yaml", ".yml", ".sql", ".sh", ".env", ".log", ".java", ".c", ".cpp", ".cs"}

def extract_text_from_file(file_path: str, ext: str) -> str:
    """Extracts text content from documents, source code, and PDF files."""
    if ext == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            pages_text = []
            total_chars = 0
            for idx, page in enumerate(reader.pages):
                txt = page.extract_text() or ""
                if txt.strip():
                    pages_text.append(f"--- Page {idx + 1} ---\n{txt.strip()}")
                total_chars += len(txt)
                if total_chars >= 40000:
                    pages_text.append("... [Content truncated for length] ...")
                    break
            return "\n\n".join(pages_text).strip()
        except Exception as e:
            print(f"Error reading PDF {file_path}: {e}")
            return ""
    elif ext in TEXT_EXTS:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as tf:
                return tf.read(30000).strip()
        except Exception as e:
            print(f"Error reading text file {file_path}: {e}")
            return ""
    return ""

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/static/<path:path>")
def static_files(path):
    return send_from_directory("static", path)

@app.route("/api/upload", methods=["POST"])
def upload_file():
    """Accepts uploaded images, videos, or documents, saves them to static/uploads, and returns metadata."""
    if "files" not in request.files and "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    uploaded_files = request.files.getlist("files") or [request.files.get("file")]
    results = []

    for f in uploaded_files:
        if not f or f.filename == "":
            continue
        orig_name = os.path.basename(f.filename)
        ext = os.path.splitext(orig_name)[1].lower()
        clean_base = re.sub(r'[^a-zA-Z0-9_\-\.]', '_', orig_name)
        unique_name = f"{uuid.uuid4().hex[:10]}_{clean_base}"
        save_path = os.path.join(UPLOAD_FOLDER, unique_name)
        f.save(save_path)

        if ext in IMAGE_EXTS:
            cat = "image"
        elif ext in VIDEO_EXTS:
            cat = "video"
        elif ext in TEXT_EXTS:
            cat = "document"
        elif ext == ".pdf":
            cat = "pdf"
        else:
            cat = "file"

        text_content = extract_text_from_file(save_path, ext)
        file_size = os.path.getsize(save_path)
        results.append({
            "url": f"/static/uploads/{unique_name}",
            "filename": orig_name,
            "type": cat,
            "size": file_size,
            "text_content": text_content
        })

    return jsonify({"files": results})

@app.route("/api/sessions", methods=["GET"])
def list_sessions():
    sessions = get_sessions()
    return jsonify(sessions)

@app.route("/api/sessions", methods=["POST"])
def new_session():
    data = request.get_json(silent=True) or {}
    title = data.get("title", "New chat")
    session_id = create_session(title=title)
    return jsonify({"session_id": session_id, "title": title})

@app.route("/api/sessions/<session_id>/messages", methods=["GET"])
def session_messages(session_id):
    messages = get_chat_messages(session_id)
    return jsonify(messages)

@app.route("/api/sessions/<session_id>", methods=["DELETE"])
def remove_session(session_id):
    delete_session(session_id)
    return jsonify({"status": "ok"})

@app.route("/api/sessions/<session_id>", methods=["PATCH"])
def rename_session(session_id):
    data = request.json or {}
    new_title = data.get("title", "Chat")
    update_session_title(session_id, new_title)
    return jsonify({"status": "ok"})

@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json or {}
    session_id = data.get("session_id")
    message = data.get("message", "").strip()
    attachments = data.get("attachments") or []

    if not message and not attachments:
        return jsonify({"error": "Empty message"}), 400

    # Ensure valid session
    if not session_id or not get_session(session_id):
        session_id = create_session(title="New chat")

    attachments_json = json.dumps(attachments) if attachments else ""

    # Record user message in DB with attachments
    user_msg_id = add_chat_message(session_id, "user", message, attachments=attachments_json)

    # Load complete message history for this session
    history = get_chat_messages(session_id)

    # Execute agent turn with attachments
    reply = run_agent_turn(history, attachments=attachments)

    # Record assistant reply in DB
    asst_msg_id = add_chat_message(session_id, "assistant", reply)

    # Auto-generate a smart title if it's the initial "New chat"
    current_session = get_session(session_id)
    title = current_session["title"] if current_session else "Chat"
    if current_session and current_session["title"] == "New chat":
        short_title = message.replace("\n", " ").strip() if message else (attachments[0].get("filename") if attachments else "Chat")
        if len(short_title) > 34:
            short_title = short_title[:31] + "..."
        update_session_title(session_id, short_title)
        title = short_title

    return jsonify({
        "response": reply,
        "session_id": session_id,
        "title": title,
        "user_message_id": user_msg_id,
        "assistant_message_id": asst_msg_id
    })

@app.route("/api/chat/edit", methods=["POST"])
def chat_edit():
    """Handles ChatGPT-style prompt edit: updates the prompt, clears subsequent replies, and regenerates."""
    data = request.json or {}
    session_id = data.get("session_id")
    message_id = data.get("message_id")
    new_message = data.get("message", "").strip()
    attachments = data.get("attachments") or []

    if not new_message and not attachments:
        return jsonify({"error": "Empty message"}), 400

    if not session_id or not get_session(session_id):
        session_id = create_session(title="New chat")

    attachments_json = json.dumps(attachments) if attachments else ""

    if message_id:
        update_chat_message(message_id, new_message, attachments=attachments_json if attachments else None)
        delete_messages_after(session_id, message_id)
    else:
        message_id = add_chat_message(session_id, "user", new_message, attachments=attachments_json)

    # Re-run agent from this point
    history = get_chat_messages(session_id)
    reply = run_agent_turn(history, attachments=attachments)
    asst_id = add_chat_message(session_id, "assistant", reply)

    return jsonify({
        "response": reply,
        "session_id": session_id,
        "user_message_id": message_id,
        "assistant_message_id": asst_id
    })

@app.route("/api/messages/<int:message_id>", methods=["PATCH"])
def patch_message(message_id):
    """Updates a message in-place without regenerating."""
    data = request.json or {}
    new_content = data.get("content", "").strip()
    if not new_content:
        return jsonify({"error": "Content cannot be empty"}), 400
    update_chat_message(message_id, new_content)
    return jsonify({"status": "ok", "message_id": message_id, "content": new_content})

# Legacy endpoints for backward compatibility
@app.route("/chat", methods=["POST"])
def legacy_chat():
    data = request.json or {}
    msg = data.get("message", "")
    sid = create_session(title="Chat")
    add_chat_message(sid, "user", msg)
    reply = run_agent_turn([{"role": "user", "content": msg}])
    add_chat_message(sid, "assistant", reply)
    return jsonify({"response": reply})

@app.route("/reset", methods=["POST"])
def legacy_reset():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    init_db()
    print("Friday AI Assistant running on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
