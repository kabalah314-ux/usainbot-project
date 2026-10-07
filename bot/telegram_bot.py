"""Free, dependency-free Telegram assistant for Usain Bot.

This bot uses Telegram's official HTTPS Bot API and Python's standard library.
It intentionally stays in prelaunch mode until the project has verified links
and an official contract address.
"""

from __future__ import annotations

import html
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


LOG = logging.getLogger("usain-bot-telegram")
API_ROOT = "https://api.telegram.org/bot{token}/{method}"


def env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def is_placeholder(value: str) -> bool:
    return not value or value.upper().startswith("TODO_")


def api_call(token: str, method: str, params: dict[str, Any] | None = None, timeout: int = 45) -> Any:
    payload = {key: str(value) for key, value in (params or {}).items()}
    request = Request(
        API_ROOT.format(token=token, method=method),
        data=urlencode(payload).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urlopen(request, timeout=timeout) as response:
        body = json.loads(response.read().decode("utf-8"))
    if not body.get("ok"):
        raise RuntimeError(body.get("description", f"Telegram API error in {method}"))
    return body.get("result")


def official_link(label: str, value: str) -> str:
    if is_placeholder(value):
        return f"{label}: pending official link"
    return f"{label}: {html.escape(value)}"


def links_message(config: dict[str, str]) -> str:
    return "\n".join(
        [
            "🔗 <b>Official links</b>",
            official_link("Web", config["web"]),
            official_link("X", config["x"]),
            official_link("Chart", config["chart"]),
            official_link("Telegram", config["telegram"]),
            "Contract: not published until the official launch",
            "\nNever trust a contract address sent by DM.",
        ]
    )


def welcome_message(config: dict[str, str]) -> str:
    return (
        "🏃💨 <b>Welcome to Usain Bot ($BOLT)</b>\n\n"
        "Usain Bot is a speed-themed meme token project and community built around robots, racing and the Solana ecosystem.\n\n"
        "<b>What you will find here:</b>\n"
        "• verified project updates\n"
        "• simple explanations about the token and its launch\n"
        "• memes, arcade challenges and community discussions\n"
        "• official links when they are confirmed\n\n"
        "<b>Current status: BUILD MODE</b>\n"
        "$BOLT is not live yet. There is no official contract address or trading link.\n\n"
        "This is a clear, verification-first space to learn about and discuss the project. It is not a promise that trading is safe or profitable.\n\n"
        "Use /help, /status, /links, /faq or /howtobuy."
    )


def status_message(config: dict[str, str]) -> str:
    if config["prelaunch"] == "true":
        return (
            "🏁 <b>Status: BUILD MODE</b>\n\n"
            "The website and arcade are available. The token, contract address and trading links are not official yet.\n\n"
            "Winners are always first — but verified information comes first."
        )
    return "🏁 <b>Status: LIVE</b>\n\nUse /links for the verified website, chart and contract information."


def faq_message() -> str:
    return (
        "❓ <b>FAQ</b>\n\n"
        "<b>Is $BOLT live?</b>\nNot yet while the project is in build mode.\n\n"
        "<b>Where is the contract address?</b>\nThere is no official CA until the launch announcement.\n\n"
        "<b>How do I buy?</b>\nOnly use the verified links published after launch. Never use an address from an unofficial message.\n\n"
        "<b>How do I get help?</b>\nAsk in the group or contact an admin. Do not share wallet secrets."
    )


def how_to_buy_message(config: dict[str, str]) -> str:
    if config["prelaunch"] == "true":
        return (
            "🛠️ <b>How to buy</b>\n\n"
            "Trading is not open yet. We will publish the verified network, contract and exchange links after the official launch announcement.\n\n"
            "For now, explore the arcade and follow only the official channels."
        )
    return (
        "🛠️ <b>How to buy</b>\n\n"
        "1. Confirm the official contract address with /links.\n"
        "2. Add the verified network details from the website.\n"
        "3. Use only the official chart or exchange link.\n"
        "4. Double-check every address before signing a transaction.\n\n"
        "This is educational information, not financial advice."
    )


def official_footer(config: dict[str, str]) -> str:
    lines = [
        "🔐 <b>OFFICIAL LINKS ONLY</b>",
        "Use only links published here, on the official X account or on the official website. Never trust a contract address sent by DM.",
    ]
    if not is_placeholder(config["web"]):
        lines.append(f"🌐 Website: {html.escape(config['web'])}")
    if not is_placeholder(config["x"]):
        lines.append(f"𝕏 Official X: {html.escape(config['x'])}")
    if not is_placeholder(config["group"]):
        lines.append(f"💬 Official Telegram group: {html.escape(config['group'])}")
    if not is_placeholder(config["telegram"]):
        lines.append(f"🤖 Official Telegram bot: {html.escape(config['telegram'])}")
    if not is_placeholder(config["creator"]):
        lines.append(f"🛠 Developed by: {html.escape(config['creator'])}")
    if is_placeholder(config["x"]) or is_placeholder(config["group"]) or is_placeholder(config["creator"]):
        lines.append("Official X, group and creator references will be added here after verification.")
    return "\n".join(lines)


def prelaunch_broadcasts(config: dict[str, str]) -> list[str]:
    web = config["web"] if not is_placeholder(config["web"]) else "the official website"
    web_link = html.escape(web)
    return [
        (
            "🏃💨 <b>BUILD MODE CHECK-IN</b>\n\n"
            "Usain Bot ($BOLT) is being built around speed, robots, races and community energy.\n\n"
            "The token is not live yet. Stay close for verified updates."
        ),
        (
            "🤖 <b>WHY USAIN BOT?</b>\n\n"
            "A meme character needs a world to live in. Ours has a track, a robot, an arcade and a community that helps shape what comes next.\n\n"
            "Winners are always first."
        ),
        (
            "🎮 <b>THE ARCADE IS OPEN</b>\n\n"
            f"Try the 100m Masher and Reaction 9.39 games: {web_link}\n\n"
            "No wallet and no purchase are needed to play. Share your best score with the group."
        ),
        (
            "⛓️ <b>TOKEN INFO — PRELAUNCH</b>\n\n"
            "Usain Bot is being prepared for Solana, target network mainnet-beta.\n\n"
            "There is no official contract address and no trading link yet. Details will be published only after verification."
        ),
        (
            "🛡️ <b>SAFETY CHECK</b>\n\n"
            "Never trust a contract address sent by DM. Never share a seed phrase, private key, password or 2FA code.\n\n"
            "Speed matters. Verification matters more."
        ),
        (
            "🔧 <b>BUILDING IN PUBLIC</b>\n\n"
            "The web, arcade, Telegram playbook and content library are being prepared step by step.\n\n"
            "What should Usain Bot race next?"
        ),
        (
            "💬 <b>COMMUNITY QUESTION</b>\n\n"
            "What brought you here?\n\n"
            "1. The robot\n2. The arcade\n3. Solana\n4. The memes\n\n"
            "Reply with a number or tell us your own reason."
        ),
        (
            "🏁 <b>HOW TO RECOGNISE THE LAUNCH</b>\n\n"
            "The official launch will be announced through the verified channels and the website.\n\n"
            "If a link is not published there, treat it as unverified."
        ),
    ]


def broadcast_state_path() -> Path:
    return Path(env("BOT_BROADCAST_STATE_FILE", "bot/.broadcast_state.json"))


def read_broadcast_state() -> dict[str, Any]:
    try:
        return json.loads(broadcast_state_path().read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return {}


def write_broadcast_state(state: dict[str, Any]) -> None:
    path = broadcast_state_path()
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(state), encoding="utf-8")
    except OSError as error:
        LOG.warning("Could not save broadcast state: %s", error)


def maybe_broadcast(token: str, config: dict[str, str]) -> None:
    if config["prelaunch"] != "true":
        return
    if env("PRELAUNCH_BROADCASTS", "true").casefold() in {"0", "false", "no"}:
        return

    chat_id_text = env("TELEGRAM_BROADCAST_CHAT_ID")
    if not chat_id_text:
        return
    try:
        chat_id = int(chat_id_text)
        interval_minutes = max(30, int(env("PRELAUNCH_BROADCAST_INTERVAL_MINUTES", "480")))
    except ValueError:
        LOG.warning("Invalid broadcast chat ID or interval; automatic messages are paused")
        return

    now = time.time()
    state = read_broadcast_state()
    last_sent = float(state.get("last_sent_at", 0))
    if not last_sent:
        if env("PRELAUNCH_BROADCAST_SEND_ON_START", "false").casefold() not in {"1", "true", "yes"}:
            write_broadcast_state({"last_sent_at": now, "index": 0})
            return
    elif now - last_sent < interval_minutes * 60:
        return

    messages = prelaunch_broadcasts(config)
    index = int(state.get("index", 0)) % len(messages)
    send_message(token, chat_id, messages[index], footer=official_footer(config))
    write_broadcast_state({"last_sent_at": now, "index": (index + 1) % len(messages)})
    LOG.info("Prelaunch broadcast %s/%s sent to configured chat", index + 1, len(messages))


def send_message(
    token: str,
    chat_id: int,
    text: str,
    reply_to: int | None = None,
    footer: str = "",
) -> None:
    if footer:
        text = f"{text.rstrip()}\n\n{footer}"
    params: dict[str, Any] = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": "true",
    }
    if reply_to is not None:
        params["reply_to_message_id"] = reply_to
    api_call(token, "sendMessage", params)


def command_name(text: str) -> str:
    first = text.split(maxsplit=1)[0].lower()
    return first.split("@", maxsplit=1)[0]


def handle_message(token: str, config: dict[str, str], message: dict[str, Any]) -> None:
    text = (message.get("text") or "").strip()
    if not text:
        return

    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    if chat_id is None:
        return

    command = command_name(text) if text.startswith("/") else ""
    replies = {
        "/start": welcome_message(config),
        "/help": (
            "🏃 <b>Commands</b>\n\n"
            "/start — welcome message\n"
            "/status — current project status\n"
            "/links — official links\n"
            "/faq — common questions\n"
            "/howtobuy — safe buying guide\n\n"
            "In groups, the bot answers commands so it does not create unnecessary noise."
        ),
        "/status": status_message(config),
        "/links": links_message(config),
        "/faq": faq_message(),
        "/howtobuy": how_to_buy_message(config),
        "/chatid": f"Current chat ID: <code>{chat_id}</code>\nUse it only in your local configuration.",
    }
    reply = replies.get(command)
    if reply is None:
        # In a group, keep the bot quiet unless a command was used.
        if chat.get("type") != "private":
            return
        lower = text.casefold()
        if any(word in lower for word in ("contract", "ca", "buy", "comprar", "launch", "lanzamiento")):
            reply = how_to_buy_message(config)
        elif any(word in lower for word in ("link", "enlace", "web", "website")):
            reply = links_message(config)
        else:
            return

    send_message(token, int(chat_id), reply, message.get("message_id"), official_footer(config))


def load_config() -> tuple[str, dict[str, str]]:
    token = env("TELEGRAM_BOT_TOKEN")
    if not token:
        raise RuntimeError("Missing TELEGRAM_BOT_TOKEN environment variable")
    prelaunch = env("PRELAUNCH", "true").casefold() not in {"0", "false", "no"}
    config: dict[str, str] = {
        "prelaunch": "true" if prelaunch else "false",
        "web": env("BOT_WEB_URL", "https://usain-bot.vercel.app"),
        "x": env("BOT_X_URL", ""),
        "chart": env("BOT_CHART_URL", ""),
        "telegram": env("BOT_TELEGRAM_URL", ""),
        "group": env("BOT_TELEGRAM_GROUP_URL", ""),
        "creator": env("BOT_CREATOR_X_URL", ""),
    }
    return token, config


def run() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    token, config = load_config()
    api_call(token, "deleteWebhook", {"drop_pending_updates": "false"})
    LOG.info("Telegram assistant started in %s mode", "prelaunch" if config["prelaunch"] == "true" else "live")

    offset = 0
    while True:
        try:
            updates = api_call(
                token,
                "getUpdates",
                {
                    "offset": offset,
                    "timeout": 30,
                    "allowed_updates": json.dumps(["message"]),
                },
                timeout=40,
            )
            maybe_broadcast(token, config)
            for update in updates or []:
                offset = max(offset, int(update.get("update_id", 0)) + 1)
                try:
                    handle_message(token, config, update.get("message") or {})
                except Exception:
                    LOG.exception("Could not process update %s", update.get("update_id"))
        except (HTTPError, URLError, TimeoutError, RuntimeError, json.JSONDecodeError) as error:
            LOG.warning("Telegram connection problem: %s", error)
            time.sleep(5)


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        LOG.info("Telegram assistant stopped")
    except RuntimeError as error:
        print(f"Configuration error: {error}", file=sys.stderr)
        raise SystemExit(2)
