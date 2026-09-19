import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import (
    FRONTEND_URL,
    SMTP_FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_USERNAME,
)

logger = logging.getLogger(__name__)


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """
    Send password reset email to the user with a secure reset link.
    Returns True if sent successfully, False otherwise.
    Never throws an unhandled exception to prevent breaking caller or leaking account state.
    """
    reset_url = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    subject = "BloodBridge Password Reset"

    text_body = (
        f"Hello,\n\n"
        f"A password reset was requested for your BloodBridge account.\n\n"
        f"To reset your password, please click the link below (valid for 15 minutes):\n"
        f"{reset_url}\n\n"
        f"If you did not request a password reset, you can safely ignore this email. "
        f"Your account remains secure.\n\n"
        f"Regards,\n"
        f"The BloodBridge Team"
    )

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>BloodBridge Password Reset</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }}
    .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }}
    .header {{ background: linear-gradient(135deg, #c01832, #991b1b); padding: 28px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }}
    .content {{ padding: 32px 28px; line-height: 1.6; font-size: 14px; }}
    .button-container {{ text-align: center; margin: 28px 0; }}
    .btn {{ background-color: #c01832; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; display: inline-block; }}
    .link-alt {{ font-size: 12px; color: #64748b; word-break: break-all; margin-top: 16px; }}
    .footer {{ padding: 20px 28px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>BloodBridge</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>A password reset was requested for your BloodBridge account. Please click the button below to choose a new password.</p>
      <div class="button-container">
        <a href="{reset_url}" class="btn" target="_blank">Reset Password</a>
      </div>
      <p>This password reset link will expire in <strong>15 minutes</strong> and can only be used once.</p>
      <p class="link-alt">If the button does not work, copy and paste this URL into your browser:<br><a href="{reset_url}">{reset_url}</a></p>
      <p>If you did not request this reset, no action is needed. Your account is completely safe.</p>
    </div>
    <div class="footer">
      &copy; BloodBridge • Emergency Blood Coordination Network
    </div>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM_EMAIL or "noreply@bloodbridge.org"
    msg["To"] = to_email

    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    if not SMTP_HOST or not SMTP_USERNAME:
        logger.warning(
            "SMTP is not fully configured (host=%s, user=%s). Password reset email for %s skipped. Token URL: %s",
            SMTP_HOST,
            SMTP_USERNAME,
            to_email,
            reset_url,
        )
        return False

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            if SMTP_USERNAME and SMTP_PASSWORD:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Password reset email sent successfully to %s", to_email)
        return True
    except Exception as exc:
        logger.error(
            "Failed to send password reset email to %s via %s:%s: %s",
            to_email,
            SMTP_HOST,
            SMTP_PORT,
            str(exc),
        )
        return False
