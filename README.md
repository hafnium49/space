# Claude Agent SDK demo: build a game with 18 lines of Python

A minimal demonstration of the [Claude Agent SDK for Python](https://github.com/anthropics/claude-agent-sdk-python):
an 18-line script (`main.py`) hands a one-sentence prompt to an autonomous
Claude agent with file-write and shell-execute tools, and the agent
produces a working Space Invaders game (≈540 lines of HTML + JS + CSS)
without any further input.

**▶ See the agent's output running live: https://hafnium49.github.io/space/**

## What this demo shows

- The whole agent invocation fits in [`main.py`](main.py) — see below.
- The SDK handles the autonomous loop: tool calls, tool results, message
  streaming, and termination when the agent decides it's done.
- The agent works in the **current working directory** with the tools it's
  given — there's no separate "agent runtime" to deploy. It's just Python.
- Authentication uses a Claude Pro/Max subscription token
  (`CLAUDE_CODE_OAUTH_TOKEN`) or an `ANTHROPIC_API_KEY`, loaded from `.env`.

## The whole agent (`main.py`)

```python
from dotenv import load_dotenv
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

load_dotenv(override=True)

PROMPT = """
Make a vanilla HTML + JS + CSS website for a game of Space Invaders. Write the code to files in the current directory, including index.html
"""

TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "AskUserQuestion"]

async def main():
    options = ClaudeAgentOptions(allowed_tools=TOOLS, model="claude-opus-4-7")
    async for message in query(prompt=PROMPT, options=options):
        print(message)

asyncio.run(main())
```

That's the entire program. Everything else in the repo is what the agent
produced.

## Run it yourself

### Prerequisites

- Python ≥ 3.12 (see [`.python-version`](.python-version))
- [`uv`](https://github.com/astral-sh/uv) for dependency / venv management
- A Claude Pro/Max subscription token **or** an Anthropic API key

### Steps

```bash
# 1. Clone
git clone https://github.com/hafnium49/space.git
cd space

# 2. Set up auth in .env (one of):
#    CLAUDE_CODE_OAUTH_TOKEN=...   (Claude Pro/Max subscription)
#    ANTHROPIC_API_KEY=sk-ant-...  (pay-per-token API)
echo "CLAUDE_CODE_OAUTH_TOKEN=$(claude setup-token)" >> .env

# 3. Run the agent — it will overwrite index.html / game.js / style.css
uv run python main.py
```

A run takes ~2 minutes and uses ~7 agent turns. Each `print(message)`
streams a structured message (system init, assistant tool calls, tool
results, final result). The agent finishes when it has written the game and
verified the files exist.

## What the agent produced

The three files at the repo root are the agent's output:

- [`index.html`](index.html) — DOM scaffold, HUD, canvas, overlay
- [`game.js`](game.js) — game loop, input, rendering, AI, collisions
- [`style.css`](style.css) — retro arcade styling

You can play it locally with `python -m http.server` (or just open
`index.html` directly — no module loading or fetch involved).

### Game controls

| Action | Keys |
| --- | --- |
| Move left | `←` or `A` |
| Move right | `→` or `D` |
| Fire | `Space` or `↑` |

## Things worth noticing about the SDK

- **No prompt engineering.** The prompt is one sentence. The model picks
  the architecture (canvas + game loop), the visual style, the
  bullet/enemy systems, and the file layout itself.
- **`allowed_tools` is the security boundary.** The agent can only use the
  tools listed in `TOOLS`. Adding/removing tools is how you grant or
  restrict capabilities (e.g. drop `Bash` to prevent shell execution).
- **`async for` is the agent loop.** Each yielded message is one event in
  the agent's reasoning — tool call, tool result, assistant turn, or final
  result. You can intercept, log, or short-circuit at any point.
- **Stdout is structured.** `print(message)` emits SDK message objects, not
  free text. For a UI you'd consume the same stream and render it.

## Further reading

- [Claude Agent SDK for Python](https://github.com/anthropics/claude-agent-sdk-python)
- [Claude Agent SDK docs](https://docs.claude.com/en/api/agent-sdk/overview)
- [Claude Code OAuth tokens](https://docs.claude.com/en/docs/claude-code/security)
