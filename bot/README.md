# Free Telegram assistant

This is a dependency-free Telegram assistant for Usain Bot. It uses Telegram's official Bot API through Python's standard library, so there is no paid SDK, database, API subscription or required package installation.

## What it does

- `/start` — welcome message.
- `/help` — command list.
- `/status` — prelaunch or live status.
- `/links` — official links and contract status.
- `/faq` — common questions.
- `/howtobuy` — safe buying guidance.
- Responds to basic link and launch questions in private chat.
- Stays quiet in groups unless someone uses a command.
- Can publish a rotating prelaunch message to one configured group at a safe interval.

The default configuration is prelaunch. Until a verified contract and official links exist, it does not present a buying address or buy alerts.

## Cost

- Telegram Bot API: free.
- Python standard library: free.
- Dependencies: none.
- Hosting: not required for local operation.

The free local setup has one limitation: the bot only responds while the computer running it is switched on and connected to the internet. We will not add paid hosting without explicit approval.

## Conditions for reliable operation

- Keep the PowerShell window running.
- Keep the computer awake and connected to the internet.
- If the computer only goes to sleep, the process should normally continue after wake-up, but scheduled messages are not sent while it is asleep.
- If Windows restarts, the terminal closes or the process is stopped, run the command again.
- For completely automatic startup later, Windows Task Scheduler is a free option.
- Automatic broadcasts require `TELEGRAM_BROADCAST_CHAT_ID`; without it, the bot only answers commands.

## Setup

1. Open Telegram and talk to `@BotFather`.
2. Create a bot and copy its token privately.
3. In PowerShell, from the project folder, set the variables for the current session:

```powershell
$env:TELEGRAM_BOT_TOKEN = "PASTE_TOKEN_HERE"
$env:PRELAUNCH = "true"
$env:BOT_WEB_URL = "https://usain-bot.vercel.app"
$env:BOT_X_URL = ""
$env:BOT_CHART_URL = ""
$env:BOT_TELEGRAM_URL = "https://t.me/Usainhbot"
$env:BOT_TELEGRAM_GROUP_URL = ""
$env:BOT_CREATOR_X_URL = ""
$env:TELEGRAM_BROADCAST_CHAT_ID = ""
$env:PRELAUNCH_BROADCASTS = "true"
$env:PRELAUNCH_BROADCAST_INTERVAL_MINUTES = "480"
python .\bot\telegram_bot.py
```

4. Add the bot to a test group and send `/start`, `/help` or `/chatid`.
5. Put the returned chat ID in `TELEGRAM_BROADCAST_CHAT_ID` and restart the bot. The first automatic message will be sent after the configured interval. Set `PRELAUNCH_BROADCAST_SEND_ON_START=true` only when you want one immediately.

The example names are also listed in `CONFIG.example.txt`. Do not put the real token in that file, in Markdown, in Git, or in a screenshot.

## Current limits

- It is a community assistant, not yet a Buy-Bot or blockchain indexer.
- It does not request wallet secrets or private data.
- It does not automate likes, replies, DMs or raids.
- Automatic broadcasts are disabled until `TELEGRAM_BROADCAST_CHAT_ID` is configured.
- The Buy-Bot can be added later using a public, free RPC and the verified contract, with rate limits and a visible maintenance fallback.
