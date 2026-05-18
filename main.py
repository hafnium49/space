"""
Claude Agent SDK demo — an autonomous agent that builds a Space Invaders
game from a one-sentence prompt.

Run with:
    uv run python main.py

Everything else at the repo root (index.html, game.js, style.css) is what
the agent below produced. See the README for a full walkthrough.
"""

# python-dotenv loads .env into the process environment. We use it so the
# auth token (CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY) never lives in
# source — only in .env, which is gitignored.
from dotenv import load_dotenv

# The Claude Agent SDK is async-first: the agent streams structured events
# back to you (tool calls, tool results, assistant turns, final result) as
# it works. asyncio is how we consume that stream.
import asyncio

# query()              — runs the agent loop and yields messages
# ClaudeAgentOptions   — config: which tools, which model, env, cwd, hooks…
from claude_agent_sdk import query, ClaudeAgentOptions

# override=True makes .env values WIN over already-set shell env vars.
# Without it, a stale CLAUDE_CODE_OAUTH_TOKEN in your shell would shadow the
# .env value silently. With it, .env is authoritative.
load_dotenv(override=True)

# The prompt is intentionally one sentence. Everything else — canvas vs.
# DOM, retro CSS, enemy AI, scoring, file layout — is decided by the model.
# This is the "let the model think" approach; with a capable model you can
# lean hard on it.
PROMPT = """
Make a vanilla HTML + JS + CSS website for a game of Space Invaders. Write the code to files in the current directory, including index.html
"""

# TOOLS is the agent's capability boundary — its *security* boundary, not
# just config. The agent can ONLY use what's listed here:
#
#   Read / Write / Edit  — file I/O, scoped to the working directory
#   Bash                 — shell execution. Powerful. Drop this to sandbox.
#   Glob / Grep          — file discovery without reading everything
#   AskUserQuestion      — prompt the human mid-run (rarely fires here)
#
# Anything NOT listed (WebFetch, MCP tools, Task agent, etc.) is unavailable
# to the agent, no matter what it tries.
TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "AskUserQuestion"]


async def main():
    # claude-opus-4-7 is the latest Opus at the time of writing. Swap to
    # "claude-sonnet-4-6" for ~5x cheaper / faster runs — Sonnet handles
    # this game prompt fine, the model identity only really matters for
    # harder open-ended tasks.
    options = ClaudeAgentOptions(allowed_tools=TOOLS, model="claude-opus-4-7")

    # query() returns an async generator. Each `message` is a typed event:
    #
    #   SystemMessage     — session init (model, session_id, etc.)
    #   AssistantMessage  — model output, may contain ToolUseBlocks
    #   UserMessage       — tool RESULTS being fed back to the model
    #   ResultMessage     — final summary (cost, duration, num_turns,
    #                       subtype='success' or 'error')
    #
    # The stream ends when the SDK yields a ResultMessage and closes.
    async for message in query(prompt=PROMPT, options=options):
        # In a real application you'd switch on message type and render
        # appropriately — show tool calls in a UI, surface assistant text,
        # log cost from the final ResultMessage, persist conversation, etc.
        # Here we just dump the raw dataclass repr to stdout.
        print(message)


# asyncio.run() creates an event loop, runs main() to completion, and
# cleans up. Standard entry point for async Python.
asyncio.run(main())
