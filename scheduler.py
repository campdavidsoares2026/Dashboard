import os
import time
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

load_dotenv()
INTERVALO_HORAS = int(os.getenv("COLETA_INTERVALO_HORAS", 6))


def pipeline_completo():
    """Coleta → Engine → Alertas. Roda a cada X horas."""
    from datetime import datetime
    print(f"\n{'='*50}")
    print(f"[Pipeline] Iniciando em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")

    # 1. Coleta de dados (Meta Ads ou simulação)
    from data_collector import coletar_e_salvar, coletar_simulado
    modo = os.getenv("MODO_COLETA", "real")
    if modo == "simulado":
        coletar_simulado()
    else:
        coletar_e_salvar("last_7d")

    # 2. Cálculo do CPEE / EEM
    from cpee_engine import rodar_engine
    resultados = rodar_engine()

    # 3. Alertas de mudança de temperatura
    from alertas import verificar_e_alertar
    verificar_e_alertar(resultados)

    print(f"[Pipeline] Concluído — próxima execução em {INTERVALO_HORAS}h")
    print(f"{'='*50}\n")


def iniciar_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=pipeline_completo,
        trigger=IntervalTrigger(hours=INTERVALO_HORAS),
        id="pipeline_cpee",
        name="Coleta e cálculo CPEE",
        replace_existing=True,
    )
    scheduler.start()
    print(f"[Scheduler] Rodando a cada {INTERVALO_HORAS}h. Próxima coleta automática agendada.")
    return scheduler


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "agora":
        # Roda imediatamente sem agendar
        pipeline_completo()
    else:
        # Roda uma vez agora e depois agenda
        pipeline_completo()
        scheduler = iniciar_scheduler()
        print("[Scheduler] Pressione Ctrl+C para encerrar.")
        try:
            while True:
                time.sleep(60)
        except (KeyboardInterrupt, SystemExit):
            scheduler.shutdown()
            print("[Scheduler] Encerrado.")
