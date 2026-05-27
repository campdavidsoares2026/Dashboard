import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv
from database import registrar_alerta

load_dotenv()

SMTP_HOST  = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT  = int(os.getenv("SMTP_PORT", 587))
SMTP_USER  = os.getenv("SMTP_USER", "")
SMTP_PASS  = os.getenv("SMTP_PASS", "")
ALERT_TO   = os.getenv("ALERT_TO", "")

TWILIO_SID   = os.getenv("TWILIO_SID", "")
TWILIO_TOKEN = os.getenv("TWILIO_TOKEN", "")
TWILIO_FROM  = os.getenv("TWILIO_FROM", "")
TWILIO_TO    = os.getenv("TWILIO_TO", "")

EMOJI = {"quente": "🔥", "morno": "🟡", "frio": "🔵"}
ICONE = {"quente": "🔥", "morno": "⚠️", "frio": "📉"}


def _corpo_email(r: dict) -> str:
    de   = r["temperatura_anterior"]
    para = r["temperatura"]
    return f"""
    <html><body style="font-family:sans-serif;color:#333">
    <h2 style="color:#1a1a1a">Alerta de temperatura eleitoral</h2>
    <p><strong>{r['cidade']} / {r['uf']}</strong> mudou de
       <span style="color:#888">{de}</span> para
       <span style="color:{'#D85A30' if para=='quente' else '#BA7517' if para=='morno' else '#378ADD'}">
         <strong>{para} {EMOJI[para]}</strong>
       </span></p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:6px;border-bottom:1px solid #eee">EEM</td>
          <td style="padding:6px;border-bottom:1px solid #eee"><strong>{r['eem']:.3f}</strong></td></tr>
      <tr><td style="padding:6px;border-bottom:1px solid #eee">CPEE ponderado</td>
          <td style="padding:6px;border-bottom:1px solid #eee">R$ {r['cpee_ponderado']:.2f}</td></tr>
      <tr><td style="padding:6px;border-bottom:1px solid #eee">Gasto</td>
          <td style="padding:6px;border-bottom:1px solid #eee">R$ {r['gasto']:,.2f}</td></tr>
      <tr><td style="padding:6px">Eleitores</td>
          <td style="padding:6px">{r['eleitores']:,}</td></tr>
    </table>
    <p style="margin-top:20px;color:#888;font-size:12px">Gerado automaticamente pelo CPEE Dashboard</p>
    </body></html>
    """


def _corpo_whatsapp(r: dict) -> str:
    icone = ICONE[r["temperatura"]]
    return (
        f"{icone} *Alerta CPEE — {r['cidade']}/{r['uf']}*\n\n"
        f"Temperatura: {r['temperatura_anterior']} → *{r['temperatura']}*\n"
        f"EEM: {r['eem']:.3f}\n"
        f"CPEE ponderado: R$ {r['cpee_ponderado']:.2f}\n"
        f"Gasto: R$ {r['gasto']:,.2f}\n"
        f"Eleitores: {r['eleitores']:,}"
    )


def enviar_email(resultado: dict) -> bool:
    if not all([SMTP_USER, SMTP_PASS, ALERT_TO]):
        print("[Alerta] E-mail não configurado no .env — pulando.")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = (
            f"[CPEE] {resultado['cidade']}/{resultado['uf']} ficou "
            f"{resultado['temperatura']} {EMOJI[resultado['temperatura']]}"
        )
        msg["From"] = SMTP_USER
        msg["To"]   = ALERT_TO
        msg.attach(MIMEText(_corpo_email(resultado), "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, ALERT_TO, msg.as_string())

        registrar_alerta(
            resultado["cidade"], resultado["uf"],
            resultado["temperatura_anterior"], resultado["temperatura"], "email"
        )
        print(f"[Alerta] E-mail enviado para {ALERT_TO}")
        return True
    except Exception as e:
        print(f"[Alerta] Erro ao enviar e-mail: {e}")
        return False


def enviar_whatsapp(resultado: dict) -> bool:
    if not all([TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, TWILIO_TO]):
        print("[Alerta] WhatsApp (Twilio) não configurado no .env — pulando.")
        return False
    try:
        from twilio.rest import Client
        client = Client(TWILIO_SID, TWILIO_TOKEN)
        client.messages.create(
            body=_corpo_whatsapp(resultado),
            from_=TWILIO_FROM,
            to=TWILIO_TO,
        )
        registrar_alerta(
            resultado["cidade"], resultado["uf"],
            resultado["temperatura_anterior"], resultado["temperatura"], "whatsapp"
        )
        print(f"[Alerta] WhatsApp enviado para {TWILIO_TO}")
        return True
    except Exception as e:
        print(f"[Alerta] Erro ao enviar WhatsApp: {e}")
        return False


def verificar_e_alertar(resultados: list[dict]):
    """
    Recebe a lista de resultados do engine e dispara alertas
    apenas para cidades que mudaram de temperatura.
    """
    mudancas = [
        r for r in resultados
        if r["temperatura"] != r["temperatura_anterior"]
    ]
    if not mudancas:
        print("[Alerta] Nenhuma mudança de temperatura detectada.")
        return

    print(f"[Alerta] {len(mudancas)} mudança(s) detectada(s) — disparando alertas...")
    for r in mudancas:
        enviar_email(r)
        enviar_whatsapp(r)
