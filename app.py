from flask import Flask, request, jsonify, send_from_directory
from database import (
    init_db,
    create_session,
    get_sessions,
    get_session,
    update_session_title,
    delete_session,
    add_chat_message,
    get_chat_messages,
)
from agent import run_agent_turn

app = Flask(__name__)

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/static/<path:path>")
def static_files(path):
    return send_from_directory("static", path)

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

    if not message:
        return jsonify({"error": "Empty message"}), 400

    # Ensure valid session
    if not session_id or not get_session(session_id):
        session_id = create_session(title="New chat")

    # Record user message in DB
    add_chat_message(session_id, "user", message)

    # Load complete message history for this session
    history = get_chat_messages(session_id)

    # Execute agent turn
    reply = run_agent_turn(history)

    # Record assistant reply in DB
    add_chat_message(session_id, "assistant", reply)

    # Auto-generate a smart title if it's the initial "New chat"
    current_session = get_session(session_id)
    title = current_session["title"] if current_session else "Chat"
    if current_session and current_session["title"] == "New chat":
        short_title = message.replace("\n", " ").strip()
        if len(short_title) > 34:
            short_title = short_title[:31] + "..."
        update_session_title(session_id, short_title)
        title = short_title

    return jsonify({
        "response": reply,
        "session_id": session_id,
        "title": title
    })

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
    app.run(debug=False, port=5000)
