import ollama
import datetime
import re
import os
import json
from database import init_db
from tools import TOOL_FUNCTIONS, TOOL_SCHEMAS

MODEL = "llama3.2"
VISION_MODELS = ["moondream", "moondream:latest", "llama3.2-vision", "llama3.2-vision:latest", "llava", "llava:latest"]

def get_available_vision_model() -> str:
    """Detects if any vision-capable model is currently available in Ollama."""
    try:
        models = [m.model for m in ollama.list().models]
        for vm in VISION_MODELS:
            for m in models:
                if m == vm or m.startswith(vm.split(':')[0]):
                    return m
    except Exception:
        pass
    return None

def analyze_image_with_vision(image_rel_path: str, prompt: str) -> str:
    """Executes multimodal image reasoning using Ollama vision model."""
    vm = get_available_vision_model()
    if not vm:
        return "I received your image, but no vision model is currently detected in Ollama. Run `ollama run moondream` in your terminal to enable image questions!"

    clean_path = image_rel_path.lstrip("/\\")
    full_path = os.path.abspath(clean_path)

    try:
        user_prompt = prompt.strip() if prompt.strip() else "Analyze this image and describe everything you see in detail."
        response = ollama.chat(
            model=vm,
            messages=[{
                "role": "user",
                "content": user_prompt,
                "images": [full_path]
            }],
            options={"temperature": 0.2}
        )
        return response.message.content
    except Exception as e:
        return f"⚠️ Vision model error: {str(e)}"

def calculate_flames(name1: str, name2: str) -> str:
    """Calculates the popular FLAMES relationship game with full step-by-step transparency."""
    n1_clean = " ".join(name1.strip().split()).title()
    n2_clean = " ".join(name2.strip().split()).title()
    l1 = [c for c in name1.lower() if c.isalpha()]
    l2 = [c for c in name2.lower() if c.isalpha()]
    
    common = []
    for c in list(l1):
        if c in l2:
            common.append(c)
            l1.remove(c)
            l2.remove(c)
    
    total_count = len(l1) + len(l2)
    flames = ["F", "L", "A", "M", "E", "S"]
    meanings = {
        "F": ("Friends", "🤝"),
        "L": ("Love", "❤️"),
        "A": ("Affection", "🥰"),
        "M": ("Marriage", "💍"),
        "E": ("Enemy", "⚔️"),
        "S": ("Siblings", "👨‍👩‍👧")
    }
    
    if total_count == 0:
        return f"""### 🔥 FLAMES Game: **{n1_clean}** & **{n2_clean}**

- **Name 1:** {n1_clean} ({len([c for c in name1 if c.isalpha()])} letters)
- **Name 2:** {n2_clean} ({len([c for c in name2 if c.isalpha()])} letters)
- **Common letters crossed out:** `{' '.join(sorted(common)) if common else 'None'}`
- **Remaining letter count:** **0**

---
### 🤝 Final Result: **FRIENDS (F)**!
*Note: Both names share identical letters, leaving 0 remaining letters.*
"""

    ptr = 0
    remaining = list(flames)
    rounds_log = []
    round_num = 1
    while len(remaining) > 1:
        ptr = (ptr + total_count - 1) % len(remaining)
        eliminated = remaining.pop(ptr)
        rounds_log.append(f"- **Round {round_num}:** Counted {total_count} letters -> Eliminated **{eliminated}** ({meanings[eliminated][0]}) -> Remaining: `{' '.join(remaining)}`")
        round_num += 1
    
    result_char = remaining[0]
    result_text, emoji = meanings[result_char]
    rounds_text = "\n".join(rounds_log)
    
    return f"""### 🔥 FLAMES Game: **{n1_clean}** & **{n2_clean}**

- **Name 1:** {n1_clean} ({len([c for c in name1 if c.isalpha()])} letters)
- **Name 2:** {n2_clean} ({len([c for c in name2 if c.isalpha()])} letters)
- **Common letters crossed out:** `{' '.join(sorted(common)) if common else 'None'}`
- **Remaining letters:** `{n1_clean}`: `{''.join(l1) or 'None'}` | `{n2_clean}`: `{''.join(l2) or 'None'}`
- **Remaining letter count:** **{total_count}**

---
### 🔄 Step-by-Step Elimination:
{rounds_text}

---
### {emoji} Final Result: **{result_text.upper()} ({result_char})**!

> **💡 Why Enemy or Friends?** In FLAMES arithmetic, counts **2, 4, 7, 9** mathematically eliminate down to **Enemy (E)**, and counts **3, 5** eliminate down to **Friends (F)**. Since most names yield remaining counts between 2 and 9, ~75% of casual name pairs naturally land on Enemy or Friends!
"""

def get_system_prompt() -> str:
    current_date = datetime.date.today().strftime("%Y-%m-%d")
    return f"""You are FRIDAY, an advanced, highly capable, and friendly AI assistant, modeled like ChatGPT.
Today's date is {current_date}.

Your Persona & Guidelines:
1. Universal Knowledge: You are skilled across all fields including software engineering, algorithms, mathematics, science, writing, analysis, casual chat, and creative problem solving.
2. Tone & Style: Direct, intelligent, helpful, and polite. Format output with clean Markdown (headings, lists, bold text, and syntax-highlighted code blocks).
3. Web Search: Only search the web if the user explicitly asks to search online or inquires about real-time events from {current_date[:4]}. Otherwise, answer directly and instantly using your extensive pre-trained knowledge.
"""

# Performance & Speed-optimized inference settings
OLLAMA_OPTIONS = {
    "num_predict": 400,   # Ample length for thorough answers
    "temperature": 0.7,   # Balanced creative and factual temperature
    "top_p": 0.9,
    "num_ctx": 4096,      # Context size for documents and multimodal queries
}

def select_tools_for_query(query: str) -> list:
    """Only provide web search tool when user explicitly requests live online lookup."""
    q = query.lower()
    selected = []

    if any(k in q for k in ["search the web", "search online", "google", "search for", "web search", "latest news", "today's news", "2025", "2026", "2027"]):
        selected.append(TOOL_SCHEMAS[0])  # search_web

    return selected

def run_agent_turn(conversation_history: list, attachments: list = None) -> str:
    """Runs a multi-turn ReAct agent loop like ChatGPT with multimodal attachments & context memory."""
    system_msg = {"role": "system", "content": get_system_prompt()}
    
    # Speed Optimization: Feed the most recent 8 messages to maintain high performance
    recent_history = conversation_history[-8:] if len(conversation_history) > 8 else conversation_history

    # If attachments not passed directly, check latest user history
    if attachments is None:
        for m in reversed(recent_history):
            if m.get("role") == "user" and m.get("attachments"):
                raw_att = m.get("attachments")
                if isinstance(raw_att, str) and raw_att.strip():
                    try:
                        attachments = json.loads(raw_att)
                    except Exception:
                        attachments = []
                elif isinstance(raw_att, list):
                    attachments = raw_att
                break

    # Find the latest user message
    latest_user_text = ""
    for m in reversed(recent_history):
        if m.get("role") == "user":
            latest_user_text = m.get("content", "")
            break

    # Multimodal image handling via local Vision Model (Moondream/Llava)
    if attachments:
        images = [a for a in attachments if a.get("type") == "image"]
        docs = [a for a in attachments if a.get("type") in ("document", "pdf", "file") or a.get("text_content")]
        videos = [a for a in attachments if a.get("type") == "video"]

        if images:
            img_target = images[0].get("url", "")
            return analyze_image_with_vision(img_target, latest_user_text)

        if docs:
            doc_context_parts = []
            for d in docs:
                txt = (d.get("text_content") or "").strip()
                fname = d.get("filename", "document")
                url = d.get("url", "")
                
                # If text_content was not sent or empty, attempt reading directly from disk
                if not txt and url:
                    clean_path = url.lstrip("/\\")
                    full_path = os.path.abspath(clean_path)
                    if os.path.exists(full_path):
                        ext = os.path.splitext(full_path)[1].lower()
                        if ext == ".pdf":
                            try:
                                from pypdf import PdfReader
                                reader = PdfReader(full_path)
                                pages_text = []
                                total_chars = 0
                                for idx, page in enumerate(reader.pages):
                                    pt = page.extract_text() or ""
                                    if pt.strip():
                                        pages_text.append(f"--- Page {idx + 1} ---\n{pt.strip()}")
                                    total_chars += len(pt)
                                    if total_chars >= 40000:
                                        pages_text.append("... [Content truncated for length] ...")
                                        break
                                txt = "\n\n".join(pages_text).strip()
                            except Exception as pe:
                                print(f"Error reading PDF from disk: {pe}")
                        elif ext in (".txt", ".py", ".js", ".ts", ".html", ".css", ".json", ".csv", ".md", ".xml", ".yaml", ".yml", ".sql", ".sh"):
                            try:
                                with open(full_path, "r", encoding="utf-8", errors="ignore") as tf:
                                    txt = tf.read(30000).strip()
                            except Exception:
                                pass
                
                if txt:
                    doc_context_parts.append(f"[Attached Document: {fname}]:\n```\n{txt}\n```")
                else:
                    doc_context_parts.append(f"[Attached Document: {fname}] (Note: The file was attached, but no text could be extracted. It may contain scanned images or be password-protected.)")

            if doc_context_parts:
                doc_context = "\n\n".join(doc_context_parts)
                if latest_user_text:
                    latest_user_text = f"{latest_user_text}\n\nHere is the content of the attached document(s):\n\n{doc_context}"
                else:
                    latest_user_text = f"Please analyze and explain the following attached document:\n\n{doc_context}"

        if videos:
            vid_info = ", ".join([v.get("filename", "video") for v in videos])
            latest_user_text = f"{latest_user_text}\n\n[User attached video file(s): {vid_info}]"

    msgs = [system_msg] + [
        {"role": m["role"], "content": m["content"]}
        for m in recent_history
    ]
    # Ensure latest user message has any appended document context
    for item in reversed(msgs):
        if item.get("role") == "user":
            item["content"] = latest_user_text
            break

    # Instant handler for FLAMES relationship game calculation
    flames_patterns = [
        r'flames(?:\s*(?::|for|between|of)?)\s*([a-zA-Z\s\.]+?)\s*(?:and|&|\+|,)\s*([a-zA-Z\s\.]+)',
        r'([a-zA-Z\s\.]+?)\s*(?:and|&|\+|,)\s*([a-zA-Z\s\.]+?)\s*(?:in\s+)?flames'
    ]
    for fp in flames_patterns:
        fm = re.search(fp, latest_user_text, re.IGNORECASE)
        if fm:
            n1 = fm.group(1).strip()
            n2 = fm.group(2).strip(' ?.,!')
            stop_words = {"the", "this", "that", "what", "is", "a", "an", "who", "which"}
            if n1.lower() not in stop_words and n2.lower() not in stop_words and len(n1) > 0 and len(n2) > 0:
                return calculate_flames(n1, n2)
        

    active_tools = select_tools_for_query(latest_user_text)

    for _ in range(3):
        chat_kwargs = {
            "model": MODEL,
            "messages": msgs,
            "options": OLLAMA_OPTIONS
        }
        if active_tools:
            chat_kwargs["tools"] = active_tools

        response = ollama.chat(**chat_kwargs)
        msg = response.message
        msgs.append(msg)

        if not msg.tool_calls:
            return msg.content or ""

        for call in msg.tool_calls:
            name = call.function.name
            args = call.function.arguments
            print(f"  [tool call] {name}({args})")
            try:
                result = TOOL_FUNCTIONS[name](**args)
            except Exception as e:
                result = f"Error: {e}"
            msgs.append({"role": "tool", "tool_name": name, "content": str(result)})

    return "I apologize, but I encountered an issue completing that request. Please try again."

if __name__ == "__main__":
    init_db()
    print("FRIDAY AI Assistant ready. Type 'exit' to quit.\n")
    history = []
    while True:
        user_input = input("You: ")
        if user_input.lower() in ("exit", "quit"):
            break
        history.append({"role": "user", "content": user_input})
        reply = run_agent_turn(history)
        history.append({"role": "assistant", "content": reply})
        print(f"\nAI: {reply}\n")