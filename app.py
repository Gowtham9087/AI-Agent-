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
    user_msg_id = add_chat_message(session_id, "user", message)

    # Load complete message history for this session
    history = get_chat_messages(session_id)

    # Execute agent turn
    reply = run_agent_turn(history)

    # Record assistant reply in DB
    asst_msg_id = add_chat_message(session_id, "assistant", reply)

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

    if not new_message:
        return jsonify({"error": "Empty message"}), 400

    if not session_id or not get_session(session_id):
        session_id = create_session(title="New chat")

    if message_id:
        update_chat_message(message_id, new_message)
        delete_messages_after(session_id, message_id)
    else:
        message_id = add_chat_message(session_id, "user", new_message)

    # Re-run agent from this point
    history = get_chat_messages(session_id)
    reply = run_agent_turn(history)
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
    app.run(debug=False, port=5000)
