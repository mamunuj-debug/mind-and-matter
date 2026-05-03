# WhatsApp mail notification setup

This setup polls your mailbox over IMAP and sends a short WhatsApp notification for every new email.

## What it does
- connects to your mailbox using IMAP
- remembers the last processed email UID
- sends a WhatsApp summary containing sender, subject, date, and a short body preview
- can use either Meta WhatsApp Cloud API or Twilio WhatsApp API

## Before you use it
1. Your corporate mailbox must allow IMAP access.
2. Your company policy must allow forwarding mail metadata to WhatsApp.
3. You need one approved WhatsApp provider:
   - Meta WhatsApp Cloud API, or
   - Twilio WhatsApp API

If your company blocks IMAP or requires Microsoft 365 OAuth-only access, you will need an admin-approved Microsoft Graph based implementation instead of password-based IMAP.

## Files
- `mail_tracking.py` - main notifier script
- `mail_tracking.env.example` - sample environment variables

## Setup
1. Copy `mail_tracking.env.example` to a private file such as `.mail_tracking.env`
2. Fill in your real mailbox and WhatsApp credentials
3. Load the environment file before running the script

Example:
```bash
set -a
source .mail_tracking.env
set +a
python3 mail_tracking.py
```

## Important configuration
- `EMAIL_STARTUP_MODE=latest`
  - skips old mails already present when the script starts for the first time
- `EMAIL_STARTUP_MODE=all`
  - sends notifications for all existing mails too
- `POLL_SECONDS`
  - mailbox polling interval in seconds
- `SUMMARY_BODY_CHARS`
  - size of the message preview

## Notes
- The script stores progress in `.mail_tracking_state.json`
- Delete that state file if you want to rebuild the baseline
- For Twilio, both `WA_FROM_NUMBER` and `WA_TO_NUMBER` must include the `whatsapp:` prefix
- For Meta Cloud API, `WA_TO_NUMBER` should be the full number with country code and without `+`

## Recommended next step
If you want this to run continuously on Linux, run it with a service manager such as `systemd`, `supervisord`, or a long-running terminal session.
