#!/usr/bin/env python3
"""Forward new corporate email summaries to WhatsApp.

This script polls an IMAP mailbox, builds a short summary for each newly
received email, and forwards that summary to WhatsApp using either the
WhatsApp Cloud API or Twilio's WhatsApp API.

Configuration is done through environment variables.
"""

from __future__ import annotations

import html
import imaplib
import json
import logging
import os
import re
import ssl
import sys
import time
import base64
from dataclasses import dataclass
from email import message_from_bytes
from email.header import decode_header, make_header
from email.message import Message
from pathlib import Path
from typing import Iterable
from urllib import error, parse, request


LOGGER = logging.getLogger("mail_tracking")
DEFAULT_STATE_FILE = ".mail_tracking_state.json"


class ConfigError(RuntimeError):
	"""Raised when required configuration is missing or invalid."""


@dataclass(frozen=True)
class MailConfig:
	host: str
	port: int
	username: str
	password: str
	folder: str
	poll_seconds: int
	use_ssl: bool
	startup_mode: str
	body_chars: int
	state_file: Path


@dataclass(frozen=True)
class MetaWhatsAppConfig:
	phone_number_id: str
	access_token: str
	to_number: str


@dataclass(frozen=True)
class TwilioWhatsAppConfig:
	account_sid: str
	auth_token: str
	from_number: str
	to_number: str


def env(name: str, default: str | None = None, required: bool = False) -> str:
	value = os.getenv(name, default)
	if required and (value is None or not value.strip()):
		raise ConfigError(f"Missing required environment variable: {name}")
	return "" if value is None else value.strip()


def env_bool(name: str, default: bool) -> bool:
	value = os.getenv(name)
	if value is None:
		return default
	return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def env_int(name: str, default: int) -> int:
	value = os.getenv(name)
	if value is None:
		return default
	try:
		return int(value.strip())
	except ValueError as exc:
		raise ConfigError(f"Environment variable {name} must be an integer") from exc


def load_mail_config() -> MailConfig:
	startup_mode = env("EMAIL_STARTUP_MODE", "latest").lower()
	if startup_mode not in {"latest", "all"}:
		raise ConfigError("EMAIL_STARTUP_MODE must be either 'latest' or 'all'")

	return MailConfig(
		host=env("EMAIL_HOST", required=True),
		port=env_int("EMAIL_PORT", 993),
		username=env("EMAIL_USERNAME", required=True),
		password=env("EMAIL_PASSWORD", required=True),
		folder=env("EMAIL_FOLDER", "INBOX"),
		poll_seconds=max(10, env_int("POLL_SECONDS", 30)),
		use_ssl=env_bool("EMAIL_USE_SSL", True),
		startup_mode=startup_mode,
		body_chars=max(40, env_int("SUMMARY_BODY_CHARS", 180)),
		state_file=Path(env("STATE_FILE", DEFAULT_STATE_FILE)).expanduser(),
	)


def load_whatsapp_config() -> tuple[str, MetaWhatsAppConfig | TwilioWhatsAppConfig]:
	provider = env("WHATSAPP_PROVIDER", "meta").lower()
	if provider == "meta":
		return (
			provider,
			MetaWhatsAppConfig(
				phone_number_id=env("WA_PHONE_NUMBER_ID", required=True),
				access_token=env("WA_ACCESS_TOKEN", required=True),
				to_number=env("WA_TO_NUMBER", required=True),
			),
		)

	if provider == "twilio":
		return (
			provider,
			TwilioWhatsAppConfig(
				account_sid=env("WA_ACCOUNT_SID", required=True),
				auth_token=env("WA_AUTH_TOKEN", required=True),
				from_number=env("WA_FROM_NUMBER", required=True),
				to_number=env("WA_TO_NUMBER", required=True),
			),
		)

	raise ConfigError("WHATSAPP_PROVIDER must be either 'meta' or 'twilio'")


def configure_logging() -> None:
	level_name = env("LOG_LEVEL", "INFO").upper()
	level = getattr(logging, level_name, logging.INFO)
	logging.basicConfig(
		level=level,
		format="%(asctime)s | %(levelname)s | %(message)s",
	)


def decode_mime_header(raw_value: str | None) -> str:
	if not raw_value:
		return "(no value)"
	try:
		return str(make_header(decode_header(raw_value)))
	except Exception:
		return raw_value


def normalize_whitespace(text: str) -> str:
	return re.sub(r"\s+", " ", text).strip()


def strip_html_tags(text: str) -> str:
	text = re.sub(r"<script.*?>.*?</script>", " ", text, flags=re.IGNORECASE | re.DOTALL)
	text = re.sub(r"<style.*?>.*?</style>", " ", text, flags=re.IGNORECASE | re.DOTALL)
	text = re.sub(r"<[^>]+>", " ", text)
	return normalize_whitespace(html.unescape(text))


def truncate(text: str, limit: int) -> str:
	if len(text) <= limit:
		return text
	return text[: max(0, limit - 3)].rstrip() + "..."


def extract_message_text(msg: Message) -> str:
	plain_parts: list[str] = []
	html_parts: list[str] = []

	for part in msg.walk():
		if part.get_content_maintype() == "multipart":
			continue

		disposition = str(part.get("Content-Disposition", ""))
		if "attachment" in disposition.lower():
			continue

		payload = part.get_payload(decode=True)
		if payload is None:
			continue

		charset = part.get_content_charset() or "utf-8"
		try:
			decoded = payload.decode(charset, errors="replace")
		except LookupError:
			decoded = payload.decode("utf-8", errors="replace")

		content_type = part.get_content_type().lower()
		if content_type == "text/plain":
			plain_parts.append(normalize_whitespace(decoded))
		elif content_type == "text/html":
			html_parts.append(strip_html_tags(decoded))

	if plain_parts:
		return normalize_whitespace(" ".join(part for part in plain_parts if part))
	if html_parts:
		return normalize_whitespace(" ".join(part for part in html_parts if part))
	return "No preview available."


def build_summary(msg: Message, body_chars: int) -> str:
	sender = decode_mime_header(msg.get("From"))
	subject = decode_mime_header(msg.get("Subject"))
	date_value = decode_mime_header(msg.get("Date"))
	preview = truncate(extract_message_text(msg), body_chars)
	return (
		"📧 New mail received\n"
		f"From: {sender}\n"
		f"Subject: {subject}\n"
		f"Date: {date_value}\n"
		f"Summary: {preview}"
	)


def load_state(path: Path) -> dict[str, int]:
	if not path.exists():
		return {}
	try:
		return json.loads(path.read_text(encoding="utf-8"))
	except (json.JSONDecodeError, OSError):
		LOGGER.warning("State file is unreadable, starting with empty state")
		return {}


def save_state(path: Path, state: dict[str, int]) -> None:
	path.parent.mkdir(parents=True, exist_ok=True)
	path.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")


def create_imap_client(config: MailConfig) -> imaplib.IMAP4 | imaplib.IMAP4_SSL:
	if config.use_ssl:
		ssl_context = ssl.create_default_context()
		client: imaplib.IMAP4 | imaplib.IMAP4_SSL = imaplib.IMAP4_SSL(
			config.host,
			config.port,
			ssl_context=ssl_context,
		)
	else:
		client = imaplib.IMAP4(config.host, config.port)
	client.login(config.username, config.password)
	status, _ = client.select(config.folder)
	if status != "OK":
		raise RuntimeError(f"Unable to select mailbox folder: {config.folder}")
	return client


def fetch_uids(client: imaplib.IMAP4 | imaplib.IMAP4_SSL) -> list[int]:
	status, data = client.uid("SEARCH", None, "ALL")
	if status != "OK":
		raise RuntimeError("Unable to search mailbox")
	raw = data[0].decode("utf-8").strip() if data and data[0] else ""
	if not raw:
		return []
	return [int(item) for item in raw.split()]


def fetch_messages(
	client: imaplib.IMAP4 | imaplib.IMAP4_SSL,
	uids: Iterable[int],
) -> list[tuple[int, Message]]:
	messages: list[tuple[int, Message]] = []
	for uid in uids:
		status, data = client.uid("FETCH", str(uid), "(RFC822)")
		if status != "OK":
			LOGGER.warning("Skipping UID %s because it could not be fetched", uid)
			continue
		raw_email = None
		for item in data:
			if isinstance(item, tuple) and len(item) >= 2:
				raw_email = item[1]
				break
		if not raw_email:
			LOGGER.warning("Skipping UID %s because message payload is empty", uid)
			continue
		messages.append((uid, message_from_bytes(raw_email)))
	return messages


def post_json(url: str, payload: dict[str, object], headers: dict[str, str]) -> str:
	raw_data = json.dumps(payload).encode("utf-8")
	req = request.Request(url, data=raw_data, method="POST")
	for key, value in headers.items():
		req.add_header(key, value)
	req.add_header("Content-Type", "application/json")

	try:
		with request.urlopen(req, timeout=30) as response:
			return response.read().decode("utf-8")
	except error.HTTPError as exc:
		details = exc.read().decode("utf-8", errors="replace")
		raise RuntimeError(f"WhatsApp API request failed: {exc.code} {details}") from exc


def post_form(
	url: str,
	payload: dict[str, str],
	username: str,
	password: str,
) -> str:
	encoded = parse.urlencode(payload).encode("utf-8")
	req = request.Request(url, data=encoded, method="POST")
	basic_auth = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
	req.add_header("Authorization", f"Basic {basic_auth}")
	req.add_header("Content-Type", "application/x-www-form-urlencoded")

	try:
		with request.urlopen(req, timeout=30) as response:
			return response.read().decode("utf-8")
	except error.HTTPError as exc:
		details = exc.read().decode("utf-8", errors="replace")
		raise RuntimeError(f"Twilio request failed: {exc.code} {details}") from exc


def send_whatsapp_message(
	provider: str,
	config: MetaWhatsAppConfig | TwilioWhatsAppConfig,
	message_text: str,
) -> None:
	if provider == "meta":
		assert isinstance(config, MetaWhatsAppConfig)
		url = f"https://graph.facebook.com/v22.0/{config.phone_number_id}/messages"
		payload = {
			"messaging_product": "whatsapp",
			"to": config.to_number,
			"type": "text",
			"text": {"preview_url": False, "body": message_text},
		}
		post_json(
			url,
			payload,
			headers={"Authorization": f"Bearer {config.access_token}"},
		)
		return

	assert isinstance(config, TwilioWhatsAppConfig)
	url = f"https://api.twilio.com/2010-04-01/Accounts/{config.account_sid}/Messages.json"
	post_form(
		url,
		payload={
			"From": config.from_number,
			"To": config.to_number,
			"Body": message_text,
		},
		username=config.account_sid,
		password=config.auth_token,
	)


def establish_baseline(
	client: imaplib.IMAP4 | imaplib.IMAP4_SSL,
	state: dict[str, int],
	mail_config: MailConfig,
) -> int:
	if "last_uid" in state:
		return int(state["last_uid"])

	uids = fetch_uids(client)
	if not uids:
		last_uid = 0
	elif mail_config.startup_mode == "latest":
		last_uid = uids[-1]
		LOGGER.info("Baseline set to current latest UID %s", last_uid)
	else:
		last_uid = 0
		LOGGER.info("Startup mode is 'all'; existing mailbox messages will be processed")

	state["last_uid"] = last_uid
	save_state(mail_config.state_file, state)
	return last_uid


def process_new_emails(
	client: imaplib.IMAP4 | imaplib.IMAP4_SSL,
	last_uid: int,
	mail_config: MailConfig,
	whatsapp_provider: str,
	whatsapp_config: MetaWhatsAppConfig | TwilioWhatsAppConfig,
) -> int:
	uids = fetch_uids(client)
	new_uids = [uid for uid in uids if uid > last_uid]
	if not new_uids:
		return last_uid

	LOGGER.info("Found %s new email(s)", len(new_uids))
	for uid, msg in fetch_messages(client, new_uids):
		summary = build_summary(msg, body_chars=mail_config.body_chars)
		send_whatsapp_message(whatsapp_provider, whatsapp_config, summary)
		last_uid = uid
		LOGGER.info("Delivered WhatsApp notification for UID %s", uid)

	return last_uid


def main() -> int:
	configure_logging()

	try:
		mail_config = load_mail_config()
		whatsapp_provider, whatsapp_config = load_whatsapp_config()
	except ConfigError as exc:
		LOGGER.error("Configuration error: %s", exc)
		return 2

	state = load_state(mail_config.state_file)

	while True:
		client = None
		try:
			client = create_imap_client(mail_config)
			last_uid = establish_baseline(client, state, mail_config)

			while True:
				last_uid = process_new_emails(
					client,
					last_uid,
					mail_config,
					whatsapp_provider,
					whatsapp_config,
				)
				state["last_uid"] = last_uid
				save_state(mail_config.state_file, state)
				time.sleep(mail_config.poll_seconds)
		except KeyboardInterrupt:
			LOGGER.info("Stopping mail tracking")
			return 0
		except imaplib.IMAP4.abort as exc:
			LOGGER.warning("IMAP connection aborted: %s", exc)
		except Exception as exc:
			LOGGER.exception("Runtime error: %s", exc)
		finally:
			if client is not None:
				try:
					client.close()
				except Exception:
					pass
				try:
					client.logout()
				except Exception:
					pass

		LOGGER.info("Retrying in 15 seconds...")
		time.sleep(15)


if __name__ == "__main__":
	sys.exit(main())
