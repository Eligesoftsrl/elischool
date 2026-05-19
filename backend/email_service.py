"""
Brevo SMTP email service.
Sends branded Italian transactional emails via Brevo's SMTP relay.
Falls back gracefully: if EMAIL_ENABLED is false or SMTP fails, returns False
without raising so the calling flow (enrollment, invite, password reset) never breaks.
"""
import os
import logging
from email.message import EmailMessage
from email.utils import formataddr
from typing import Optional

import aiosmtplib

logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get("BREVO_SMTP_HOST", "smtp-relay.brevo.com")
SMTP_PORT = int(os.environ.get("BREVO_SMTP_PORT", "587"))
SMTP_LOGIN = os.environ.get("BREVO_SMTP_LOGIN", "")
SMTP_KEY = os.environ.get("BREVO_SMTP_KEY", "")
SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "")
SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "nido.")
EMAIL_ENABLED = os.environ.get("EMAIL_ENABLED", "false").lower() == "true"


def _wrap_html(title: str, intro: str, cta_url: Optional[str], cta_label: Optional[str], outro: str) -> str:
    """Branded Italian email HTML — soft pastel palette matching the nido. PWA."""
    cta_block = ""
    if cta_url and cta_label:
        cta_block = f"""
        <tr><td align="center" style="padding:8px 0 28px;">
          <a href="{cta_url}" style="display:inline-block;background:#FF8C6B;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:18px;font-size:15px;letter-spacing:.2px;">{cta_label}</a>
        </td></tr>
        <tr><td style="font-size:12px;color:#9c9389;padding:0 0 16px;">
          Se il pulsante non funziona, copia e incolla questo link nel tuo browser:<br/>
          <a href="{cta_url}" style="color:#FF7A54;word-break:break-all;">{cta_url}</a>
        </td></tr>
        """
    return f"""<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>{title}</title></head>
<body style="margin:0;padding:0;background:#FDFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1917;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#FDFBF7;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:28px;border:1px solid #f1ebe2;overflow:hidden;">
      <tr><td style="padding:32px 32px 8px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background:#FF8C6B;width:40px;height:40px;border-radius:14px;text-align:center;vertical-align:middle;color:#fff;font-size:20px;line-height:40px;">&#9829;</td>
          <td style="padding-left:10px;font-weight:800;font-size:18px;color:#1c1917;">nido<span style="color:#FF8C6B;">.</span></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:16px 32px 8px;font-size:24px;font-weight:800;color:#1c1917;line-height:1.25;letter-spacing:-0.01em;">{title}</td></tr>
      <tr><td style="padding:8px 32px 4px;font-size:15px;line-height:1.6;color:#44403c;">{intro}</td></tr>
      <tr><td style="padding:16px 32px 0;">{cta_block}</td></tr>
      <tr><td style="padding:0 32px 24px;font-size:14px;line-height:1.6;color:#57534e;">{outro}</td></tr>
      <tr><td style="padding:18px 32px;border-top:1px solid #f1ebe2;font-size:12px;color:#a8a29e;">
        Un abbraccio,<br/><b style="color:#57534e;">{SENDER_NAME}</b>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#a8a29e;margin:14px 0 0;">Hai ricevuto questa email perché sei collegato/a alla nostra scuola. Se non sei tu, ignora il messaggio.</p>
  </td></tr>
</table>
</body></html>"""


async def _send(to_email: str, to_name: str, subject: str, html: str, text_fallback: str) -> bool:
    if not EMAIL_ENABLED:
        logger.info(f"[EMAIL DISABLED] would send '{subject}' to {to_email}")
        return False
    if not (SMTP_LOGIN and SMTP_KEY and SENDER_EMAIL):
        logger.warning(f"[EMAIL MISCONFIG] missing SMTP credentials, cannot send to {to_email}")
        return False

    msg = EmailMessage()
    msg["From"] = formataddr((SENDER_NAME, SENDER_EMAIL))
    msg["To"] = formataddr((to_name or "", to_email))
    msg["Subject"] = subject
    msg.set_content(text_fallback)
    msg.add_alternative(html, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_LOGIN,
            password=SMTP_KEY,
            start_tls=True,
            timeout=15,
        )
        logger.info(f"[EMAIL SENT] '{subject}' → {to_email}")
        return True
    except Exception as e:
        logger.error(f"[EMAIL FAIL] to {to_email}: {type(e).__name__}: {e}")
        return False


# ----------------------------- Flow-specific helpers -----------------------------
async def send_parent_invite_email(to_email: str, parent_name: str, invite_link: str, school_name: str = "la scuola") -> bool:
    subject = f"Benvenuto/a in {school_name} · attiva il tuo account"
    intro = (
        f"Ciao <b>{parent_name or 'genitore'}</b>,<br/><br/>"
        f"il tuo account genitore presso <b>{school_name}</b> è stato creato. "
        "Da qui potrai seguire la giornata di tuo figlio: attività, foto, menu, comunicazioni e tanto altro."
    )
    outro = (
        "Il link è valido per <b>7 giorni</b>. Una volta impostata la password, potrai accedere "
        "dal tuo smartphone in qualsiasi momento."
    )
    html = _wrap_html(
        title="Attiva il tuo account",
        intro=intro,
        cta_url=invite_link,
        cta_label="Imposta la password",
        outro=outro,
    )
    text = f"Ciao {parent_name},\n\nAttiva il tuo account: {invite_link}\n\nLink valido 7 giorni."
    return await _send(to_email, parent_name, subject, html, text)


async def send_password_reset_email(to_email: str, full_name: str, reset_link: str) -> bool:
    subject = "Reimposta la tua password · nido."
    intro = (
        f"Ciao <b>{full_name or ''}</b>,<br/><br/>"
        "abbiamo ricevuto una richiesta di reset della password per il tuo account. "
        "Se sei stato/a tu, premi il pulsante qui sotto per scegliere una nuova password."
    )
    outro = (
        "Il link è valido per <b>1 ora</b>. Se non hai richiesto tu il reset, ignora questa email: "
        "la tua password resterà invariata."
    )
    html = _wrap_html(
        title="Reimposta la tua password",
        intro=intro,
        cta_url=reset_link,
        cta_label="Reimposta password",
        outro=outro,
    )
    text = f"Ciao {full_name},\n\nReimposta la password: {reset_link}\n\nLink valido 1 ora."
    return await _send(to_email, full_name, subject, html, text)


async def send_enrollment_approved_email(to_email: str, parent_name: str, student_name: str, invite_link: str, school_name: str = "la scuola") -> bool:
    subject = f"Iscrizione approvata per {student_name} 🎉"
    intro = (
        f"Ciao <b>{parent_name or 'genitore'}</b>,<br/><br/>"
        f"siamo felici di confermarti che la richiesta di iscrizione per <b>{student_name}</b> "
        f"presso <b>{school_name}</b> è stata <b>approvata</b>.<br/><br/>"
        "Per completare l'iscrizione e accedere al tuo spazio dedicato, attiva il tuo account "
        "scegliendo una password personale."
    )
    outro = (
        "Una volta attivato l'account potrai seguire ogni giornata: attività, menu, foto e comunicazioni "
        "delle maestre. Il link è valido per <b>7 giorni</b>."
    )
    html = _wrap_html(
        title="Iscrizione approvata",
        intro=intro,
        cta_url=invite_link,
        cta_label="Attiva il tuo account",
        outro=outro,
    )
    text = f"Ciao {parent_name},\n\nIscrizione approvata per {student_name}. Attiva il tuo account: {invite_link}\n\nLink valido 7 giorni."
    return await _send(to_email, parent_name, subject, html, text)


async def send_test_email(to_email: str) -> bool:
    """Used by /api/admin/email/test to verify Brevo config."""
    subject = "Test email · nido. PWA"
    intro = "Se stai leggendo questa email, la configurazione <b>Brevo SMTP</b> funziona correttamente. 🎉"
    outro = "Da ora in poi i genitori riceveranno gli inviti e i reset password direttamente nella loro casella di posta."
    html = _wrap_html(
        title="Configurazione Brevo OK",
        intro=intro,
        cta_url=None,
        cta_label=None,
        outro=outro,
    )
    text = "Configurazione Brevo OK. Le email transazionali sono operative."
    return await _send(to_email, "Admin", subject, html, text)
