"""
Styled HTML email templates for Symphonia.

Each template function returns a complete HTML email string styled to match
the Symphonia brand (blue #2563eb accent, clean modern layout).
"""

from __future__ import annotations
from html import escape

# ── Brand constants ──────────────────────────────────────────────
BRAND_BLUE = "#2563eb"
BRAND_BLUE_DARK = "#1d4ed8"
BRAND_BG = "#f8fafc"
BRAND_CARD = "#ffffff"
BRAND_BORDER = "#e2e8f0"
BRAND_TEXT = "#1e293b"
BRAND_MUTED = "#64748b"
BRAND_SUCCESS = "#16a34a"


def _base_layout(title: str, body_html: str, footer_extra: str = "") -> str:
    """Wrap body HTML in the branded email shell."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>{escape(title)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:{BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:{BRAND_TEXT};-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{BRAND_BG};">
<tr><td align="center" style="padding:40px 16px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
    <!-- Logo bar -->
    <tr><td style="padding:0 0 24px 0;text-align:center;">
      <span style="font-size:22px;font-weight:700;color:{BRAND_BLUE};letter-spacing:-0.03em;">♪ Symphonia</span>
    </td></tr>
    <!-- Card -->
    <tr><td style="background-color:{BRAND_CARD};border:1px solid {BRAND_BORDER};border-radius:12px;padding:32px 32px 28px 32px;">
      {body_html}
    </td></tr>
    <!-- Footer -->
    <tr><td style="padding:24px 0 0 0;text-align:center;font-size:12px;color:{BRAND_MUTED};line-height:1.6;">
      {footer_extra}
      <p style="margin:8px 0 0 0;">Symphonia &mdash; Collaborative Consensus Platform<br/>
      Powered by <a href="https://axiotic.ai" style="color:{BRAND_BLUE};text-decoration:none;">Axiotic AI</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>"""


def _button(text: str, url: str) -> str:
    """Render a branded CTA button (Outlook-safe with VML fallback)."""
    return f"""\
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto 0 auto;">
<tr><td align="center" style="background-color:{BRAND_BLUE};border-radius:8px;">
  <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{escape(url)}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="18%" fillcolor="{BRAND_BLUE}"><center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:600;">{escape(text)}</center></v:roundrect><![endif]-->
  <!--[if !mso]><!-->
  <a href="{escape(url)}" target="_blank"
     style="display:inline-block;padding:12px 28px;background-color:{BRAND_BLUE};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;line-height:1.2;">
    {escape(text)}
  </a>
  <!--<![endif]-->
</td></tr>
</table>"""


# ── Template: Expert Invitation ──────────────────────────────────
def invitation(
    *,
    consultation_title: str,
    admin_name: str,
    invitation_url: str,
    message: str = "",
) -> tuple[str, str]:
    """Return (subject, html) for an expert invitation email."""
    subject = f"You're invited to join: {consultation_title}"

    msg_block = ""
    if message:
        msg_block = f"""\
<div style="margin:20px 0;padding:16px;background-color:#f1f5f9;border-radius:8px;border-left:3px solid {BRAND_BLUE};font-size:14px;color:{BRAND_TEXT};line-height:1.6;">
  {escape(message)}
</div>"""

    body = f"""\
<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:{BRAND_TEXT};line-height:1.3;">You've been invited to a consultation</h1>
<p style="margin:0 0 20px 0;font-size:14px;color:{BRAND_MUTED};line-height:1.5;">
  <strong>{escape(admin_name)}</strong> has invited you to share your expertise.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="border:1px solid {BRAND_BORDER};border-radius:8px;overflow:hidden;margin-bottom:4px;">
  <tr>
    <td style="padding:16px 20px;background-color:#f8fafc;">
      <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:{BRAND_MUTED};">Consultation</p>
      <p style="margin:0;font-size:16px;font-weight:600;color:{BRAND_TEXT};">{escape(consultation_title)}</p>
    </td>
  </tr>
</table>
{msg_block}
{_button("Join Consultation", invitation_url)}
<p style="margin:20px 0 0 0;font-size:12px;color:{BRAND_MUTED};text-align:center;line-height:1.5;">
  If the button doesn't work, copy this link:<br/>
  <a href="{escape(invitation_url)}" style="color:{BRAND_BLUE};word-break:break-all;">{escape(invitation_url)}</a>
</p>"""

    return subject, _base_layout(subject, body)


# ── Template: New Round Notification ─────────────────────────────
def new_round(
    *,
    consultation_title: str,
    round_number: int,
    questions: list[str] | None = None,
    round_url: str,
) -> tuple[str, str]:
    """Return (subject, html) for a new-round notification."""
    subject = f"Round {round_number} is open — {consultation_title}"

    q_block = ""
    if questions:
        q_items = "".join(
            f'<li style="margin:4px 0;font-size:14px;color:{BRAND_TEXT};line-height:1.5;">{escape(q)}</li>'
            for q in questions[:5]  # cap at 5 to keep email short
        )
        more = ""
        if len(questions) > 5:
            more = f'<li style="margin:4px 0;font-size:14px;color:{BRAND_MUTED};line-height:1.5;">...and {len(questions) - 5} more</li>'
        q_block = f"""\
<div style="margin:20px 0;">
  <p style="margin:0 0 8px 0;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:{BRAND_MUTED};">Questions this round</p>
  <ol style="margin:0;padding-left:20px;">{q_items}{more}</ol>
</div>"""

    body = f"""\
<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:{BRAND_TEXT};line-height:1.3;">A new round needs your input</h1>
<p style="margin:0 0 4px 0;font-size:14px;color:{BRAND_MUTED};line-height:1.5;">
  <strong>Round {round_number}</strong> of <em>{escape(consultation_title)}</em> is now open for responses.
</p>
{q_block}
{_button("Respond Now", round_url)}
<p style="margin:20px 0 0 0;font-size:12px;color:{BRAND_MUTED};text-align:center;line-height:1.5;">
  <a href="{escape(round_url)}" style="color:{BRAND_BLUE};word-break:break-all;">{escape(round_url)}</a>
</p>"""

    return subject, _base_layout(subject, body)


# ── Template: Synthesis Ready ────────────────────────────────────
def synthesis_ready(
    *,
    consultation_title: str,
    round_number: int,
    summary_url: str,
    consensus_score: float | None = None,
) -> tuple[str, str]:
    """Return (subject, html) for a synthesis-ready notification."""
    subject = f"Synthesis ready — Round {round_number} of {consultation_title}"

    score_block = ""
    if consensus_score is not None:
        pct = int(round(consensus_score * 100))
        color = BRAND_SUCCESS if pct >= 70 else "#f59e0b" if pct >= 40 else "#dc2626"
        score_block = f"""\
<div style="margin:20px 0;text-align:center;">
  <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:{BRAND_MUTED};">Consensus Score</p>
  <p style="margin:0;font-size:36px;font-weight:700;color:{color};line-height:1;">{pct}%</p>
</div>"""

    body = f"""\
<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:{BRAND_TEXT};line-height:1.3;">The synthesis is ready</h1>
<p style="margin:0 0 4px 0;font-size:14px;color:{BRAND_MUTED};line-height:1.5;">
  The AI synthesis for <strong>Round {round_number}</strong> of <em>{escape(consultation_title)}</em> has been generated.
</p>
{score_block}
{_button("View Synthesis", summary_url)}
<p style="margin:20px 0 0 0;font-size:12px;color:{BRAND_MUTED};text-align:center;line-height:1.5;">
  <a href="{escape(summary_url)}" style="color:{BRAND_BLUE};word-break:break-all;">{escape(summary_url)}</a>
</p>"""

    return subject, _base_layout(subject, body)


# ── Template: Round Reminder ─────────────────────────────────────
def round_reminder(
    *,
    consultation_title: str,
    round_number: int,
    deadline: str | None = None,
    round_url: str,
) -> tuple[str, str]:
    """Return (subject, html) for a gentle reminder to respond."""
    subject = f"Reminder: Round {round_number} awaits your response — {consultation_title}"

    deadline_block = ""
    if deadline:
        deadline_block = f"""\
<p style="margin:16px 0 0 0;font-size:14px;color:#f59e0b;font-weight:600;text-align:center;">
  ⏰ Deadline: {escape(deadline)}
</p>"""

    body = f"""\
<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:{BRAND_TEXT};line-height:1.3;">Your input is still needed</h1>
<p style="margin:0 0 4px 0;font-size:14px;color:{BRAND_MUTED};line-height:1.5;">
  <strong>Round {round_number}</strong> of <em>{escape(consultation_title)}</em> is waiting for your response.
  Your expertise matters — every perspective strengthens the consensus.
</p>
{deadline_block}
{_button("Respond Now", round_url)}
<p style="margin:20px 0 0 0;font-size:12px;color:{BRAND_MUTED};text-align:center;line-height:1.5;">
  <a href="{escape(round_url)}" style="color:{BRAND_BLUE};word-break:break-all;">{escape(round_url)}</a>
</p>"""

    return subject, _base_layout(subject, body)


# ── Template: Welcome / Registration ─────────────────────────────
def welcome(
    *,
    user_email: str,
    login_url: str,
) -> tuple[str, str]:
    """Return (subject, html) for a welcome email after registration."""
    subject = "Welcome to Symphonia"

    body = f"""\
<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:{BRAND_TEXT};line-height:1.3;">Welcome to Symphonia</h1>
<p style="margin:0 0 20px 0;font-size:14px;color:{BRAND_MUTED};line-height:1.5;">
  Your account <strong>{escape(user_email)}</strong> is ready. Symphonia helps you run structured multi-round consultations
  that harness expert knowledge and build genuine consensus.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
       style="border:1px solid {BRAND_BORDER};border-radius:8px;overflow:hidden;margin-bottom:4px;">
  <tr>
    <td style="padding:16px 20px;background-color:#f8fafc;">
      <p style="margin:0 0 10px 0;font-size:14px;font-weight:600;color:{BRAND_TEXT};">What you can do:</p>
      <ul style="margin:0;padding-left:18px;font-size:14px;color:{BRAND_TEXT};line-height:1.8;">
        <li>Create consultations with structured questions</li>
        <li>Invite domain experts to contribute</li>
        <li>Run multiple Delphi rounds to build consensus</li>
        <li>Get AI-powered synthesis of expert responses</li>
      </ul>
    </td>
  </tr>
</table>
{_button("Get Started", login_url)}"""

    return subject, _base_layout(subject, body)


# ── Template preview helper ──────────────────────────────────────

# ── Template: Password Reset ─────────────────────────────────────
def password_reset(
    *,
    reset_url: str,
    expiry_hours: int = 1,
) -> tuple[str, str]:
    """Return (subject, html) for a password reset email."""
    subject = "Reset your Symphonia password"
    from html import escape as _escape
    body = (
        f'''<h1 style="margin:0 0 8px 0;font-size:20px;font-weight:700;color:{BRAND_TEXT};line-height:1.3;">Reset your password</h1>'''
        f'''<p style="margin:0 0 20px 0;font-size:14px;color:{BRAND_MUTED};line-height:1.5;">'''
        "We received a request to reset the password for your Symphonia account. "
        "Click the button below to choose a new password.</p>"
        + _button("Reset Password", reset_url)
        + f'''<p style="margin:20px 0 0 0;font-size:13px;color:{BRAND_MUTED};text-align:center;line-height:1.5;">'''
        f"This link will expire in <strong>{expiry_hours} hour{'s' if expiry_hours != 1 else ''}</strong>. "
        "If you didn't request a password reset, you can safely ignore this email.</p>"
        + f'''<p style="margin:12px 0 0 0;font-size:12px;color:{BRAND_MUTED};text-align:center;line-height:1.5;">'''
        f'''If the button doesn't work, copy this link:<br/><a href="{_escape(reset_url)}" style="color:{BRAND_BLUE};word-break:break-all;">{_escape(reset_url)}</a></p>'''
    )
    return subject, _base_layout(subject, body)

TEMPLATES = {
    "invitation": invitation,
    "new_round": new_round,
    "synthesis_ready": synthesis_ready,
    "round_reminder": round_reminder,
    "welcome": welcome,
    "password_reset": password_reset,
}
