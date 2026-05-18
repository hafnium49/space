# Space Invaders

A vanilla HTML + JS + CSS Space Invaders clone. No build step, no
dependencies — three files (`index.html`, `game.js`, `style.css`) served as
static assets.

**▶ Play it: https://hafnium49.github.io/space/**

## Controls

| Action | Keys |
| --- | --- |
| Move left | `←` or `A` |
| Move right | `→` or `D` |
| Fire | `Space` or `↑` |

## Run locally

```bash
python -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser — there's no module loading
or fetch, so `file://` works too.

## How this was built

The game itself was generated end-to-end by running [`main.py`](main.py),
which calls the [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk-python)
with the prompt embedded in that file. The agent has `Read`, `Write`,
`Edit`, `Bash`, `Glob`, `Grep`, and `AskUserQuestion` tools, and writes the
three game files into the working directory autonomously.

To regenerate (requires `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` in
`.env`):

```bash
uv run python main.py
```

## Deployment

Served by GitHub Pages from the `main` branch root path. Pushes to `main`
auto-redeploy.
