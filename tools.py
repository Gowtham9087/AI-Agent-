from ddgs import DDGS

def search_web(query: str) -> str:
    """Searches the live web quickly using DuckDuckGo."""
    try:
        results = DDGS().text(query, max_results=3)
        if not results:
            return "No web results found."
        formatted = []
        for r in results:
            snippet = r.get('body', '')[:300]
            formatted.append(f"Title: {r.get('title', '')}\nSnippet: {snippet}")
        return "\n\n".join(formatted)
    except Exception as e:
        return f"Error searching the web: {e}"

TOOL_FUNCTIONS = {
    "search_web": search_web,
}

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the live web if the user asks to search online or requests real-time live events or current news.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to look up on the web",
                    }
                },
                "required": ["query"],
            },
        },
    },
]