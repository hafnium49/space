from dotenv import load_dotenv
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

load_dotenv(override=True)

PROMPT = """
Make a vanilla HTML + JS + CSS website for a game of Space Invaders. Write the code to files in the current directory, including index.html
"""

TOOLS = ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "AskUserQuestion"]

async def main():
    options = ClaudeAgentOptions(allowed_tools=TOOLS, model="claude-opus-4-6")
    async for message in query(prompt=PROMPT, options=options):
        print(message)

asyncio.run(main())