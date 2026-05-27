import pytest
import datetime
from sqlalchemy import inspect
from sqlalchemy.exc import IntegrityError
from app.models.database import engine, Base, get_db_context
from app.models.models import (
    PeriodoEnum, TipoRecomendacaoEnum, StatusRecomendacaoEnum,
    Municipio, Campanha, Metrica, Sentimento, Previsao, Recomendacao
)


def test_all_tables_created():
    """Verify all required tables exist in database"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    required_tables = [
        'municipios', 'campanhas', 'metricas',
        'sentimentos', 'previsoes', 'recomendacoes',
        'demografia_cluster', 'horarios_performance'
    ]

    for table in required_tables:
        assert table in tables, f"Table {table} not found"


def test_enum_constraints():
    """Verify Enum fields accept only allowed values"""
    # Verify Periodo enum values exist
    assert PeriodoEnum.SETE_DIAS.value == "7dias"
    assert PeriodoEnum.TRINTA_DIAS.value == "30dias"

    # Verify TipoRecomendacao enum values exist
    assert TipoRecomendacaoEnum.AUMENTAR_VERBA.value == "aumentar_verba"
    assert TipoRecomendacaoEnum.REVISAR_CRIATIVO.value == "revisar_criativo"
    assert TipoRecomendacaoEnum.TESTAR_NOVO_CRIATIVO.value == "testar_novo_criativo"

    # Verify StatusRecomendacao enum values exist
    assert StatusRecomendacaoEnum.PENDENTE.value == "pendente"
    assert StatusRecomendacaoEnum.EXECUTADA.value == "executada"
    assert StatusRecomendacaoEnum.IGNORADA.value == "ignorada"


def test_foreign_key_constraints():
    """Verify ForeignKey constraints are properly defined"""
    inspector = inspect(engine)

    # Check Sentimento has FK to municipios
    sentimento_fks = inspector.get_foreign_keys('sentimentos')
    assert any(fk['constrained_columns'] == ['cluster_id'] for fk in sentimento_fks), \
        "Sentimento should have FK constraint on cluster_id"

    # Check Previsao has FK to municipios
    previsao_fks = inspector.get_foreign_keys('previsoes')
    assert any(fk['constrained_columns'] == ['cluster_id'] for fk in previsao_fks), \
        "Previsao should have FK constraint on cluster_id"

    # Check Recomendacao has FK to municipios
    recomendacao_fks = inspector.get_foreign_keys('recomendacoes')
    assert any(fk['constrained_columns'] == ['cluster_id'] for fk in recomendacao_fks), \
        "Recomendacao should have FK constraint on cluster_id"


def test_base_tables_have_required_columns():
    """Verify base tables have all required columns"""
    inspector = inspect(engine)

    # Check Municipio columns
    municipio_cols = {col['name'] for col in inspector.get_columns('municipios')}
    assert municipio_cols >= {'id', 'nome', 'uf', 'eleitores', 'regiao', 'created_at'}

    # Check Campanha columns
    campanha_cols = {col['name'] for col in inspector.get_columns('campanhas')}
    assert campanha_cols >= {'id', 'municipio_id', 'nome', 'data_inicio', 'data_fim', 'orcamento', 'created_at'}

    # Check Metrica columns
    metrica_cols = {col['name'] for col in inspector.get_columns('metricas')}
    assert metrica_cols >= {'id', 'campanha_id', 'data', 'impressoes', 'engajamento', 'gasto', 'created_at'}


def test_foreign_key_constraints_enforced():
    """Verify that ForeignKey constraints are enforced when inserting invalid data"""
    with get_db_context() as session:
        # Try to insert a Recomendacao with invalid cluster_id (doesn't exist in municipios)
        # This should fail because the FK constraint is now enforced
        invalid_recomendacao = Recomendacao(
            cluster_id=99999,  # Invalid: doesn't exist in municipios
            data_criacao=datetime.date.today(),
            tipo=TipoRecomendacaoEnum.AUMENTAR_VERBA,
            descricao="Test FK constraint",
            status=StatusRecomendacaoEnum.PENDENTE
        )
        session.add(invalid_recomendacao)

        # Should raise IntegrityError due to FK constraint
        with pytest.raises(IntegrityError):
            session.commit()


def test_recomendacao_status_not_null():
    """Verify that Recomendacao.status cannot be NULL"""
    inspector = inspect(engine)
    recomendacao_cols = {col['name']: col for col in inspector.get_columns('recomendacoes')}

    # Verify status column exists and is not nullable
    assert 'status' in recomendacao_cols
    assert recomendacao_cols['status']['nullable'] is False, \
        "status column should not be nullable"
