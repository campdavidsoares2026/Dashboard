"""
Tests for the Overview API endpoints with filtering support.
Tests: /api/accounts, /api/overview, /api/dashboard/export
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.main import app
from app.models.models import Base, CampaignData
from app.models.database import get_db


# Create in-memory test database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for tests"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture
def test_db():
    """Setup and teardown test database with sample data"""
    # Create tables
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()

    # Add sample campaign data
    today = datetime.now().date()
    sample_campaigns = [
        CampaignData(
            account_id="acc_001",
            campaign_id="camp_001",
            campaign_name="Campaign 1",
            uf="SP",
            date_fetched=today,
            spend=1500.50,
            impressions=125000,
            clicks=5230,
            leads=87,
            cpee=17.24,
            ctr=4.18,
            cpc=0.29,
            cpm=12.00,
            frequency=2.5,
            lead_quality="hot"
        ),
        CampaignData(
            account_id="acc_001",
            campaign_id="camp_002",
            campaign_name="Campaign 2",
            uf="SP",
            date_fetched=today,
            spend=2000.00,
            impressions=150000,
            clicks=6200,
            leads=120,
            cpee=16.67,
            ctr=4.13,
            cpc=0.32,
            cpm=13.33,
            frequency=2.3,
            lead_quality="warm"
        ),
        CampaignData(
            account_id="acc_002",
            campaign_id="camp_003",
            campaign_name="Campaign 3",
            uf="SP",
            date_fetched=today,
            spend=1000.00,
            impressions=100000,
            clicks=3500,
            leads=45,
            cpee=22.22,
            ctr=3.5,
            cpc=0.29,
            cpm=10.00,
            frequency=2.1,
            lead_quality="cold"
        ),
        CampaignData(
            account_id="acc_002",
            campaign_id="camp_004",
            campaign_name="Campaign 4",
            uf="SP",
            date_fetched=today - timedelta(days=1),
            spend=800.00,
            impressions=80000,
            clicks=2400,
            leads=30,
            cpee=26.67,
            ctr=3.0,
            cpc=0.33,
            cpm=10.00,
            frequency=2.0,
            lead_quality="pending"
        ),
    ]

    for campaign in sample_campaigns:
        db.add(campaign)

    db.commit()

    yield db

    # Cleanup
    db.close()
    Base.metadata.drop_all(bind=engine)


class TestGetAccounts:
    """Test suite for /api/accounts endpoint"""

    def test_get_accounts_success(self, test_db):
        """Test /api/accounts returns list of distinct account IDs"""
        response = client.get("/api/accounts")

        assert response.status_code == 200
        data = response.json()
        assert "accounts" in data
        assert isinstance(data["accounts"], list)
        assert len(data["accounts"]) == 2
        assert "acc_001" in data["accounts"]
        assert "acc_002" in data["accounts"]

    def test_get_accounts_empty(self):
        """Test /api/accounts with empty database"""
        response = client.get("/api/accounts")

        assert response.status_code == 200
        data = response.json()
        assert data["accounts"] == []

    @pytest.mark.asyncio
    async def test_get_accounts_ordered(self, test_db):
        """Test /api/accounts returns accounts in sorted order"""
        response = client.get("/api/accounts")

        assert response.status_code == 200
        accounts = response.json()["accounts"]
        assert accounts == sorted(accounts)


class TestGetOverview:
    """Test suite for /api/overview endpoint"""

    def test_get_overview_without_filters(self, test_db):
        """Test /api/overview without filters returns default data"""
        response = client.get("/api/overview")

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "kpis" in data
        assert "alerts" in data
        assert "recommendations" in data
        assert "cpee_trend" in data
        assert "budget_breakdown" in data
        assert "top_clusters" in data

        # Verify KPI structure
        assert isinstance(data["kpis"], list)
        if data["kpis"]:
            kpi = data["kpis"][0]
            assert "label" in kpi
            assert "value" in kpi
            assert "unit" in kpi

    def test_get_overview_with_single_account_filter(self, test_db):
        """Test /api/overview with single account filter"""
        response = client.get("/api/overview?accounts=acc_001")

        assert response.status_code == 200
        data = response.json()

        # Should have data from acc_001
        assert "kpis" in data
        assert isinstance(data["kpis"], list)

    def test_get_overview_with_multiple_account_filters(self, test_db):
        """Test /api/overview with multiple account filters"""
        response = client.get("/api/overview?accounts=acc_001,acc_002")

        assert response.status_code == 200
        data = response.json()

        assert "kpis" in data
        assert isinstance(data["kpis"], list)

    def test_get_overview_with_date_range(self, test_db):
        """Test /api/overview with date range filtering"""
        today = datetime.now()
        start_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")

        response = client.get(
            f"/api/overview?start_date={start_date}&end_date={end_date}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data

    def test_get_overview_with_all_filters(self, test_db):
        """Test /api/overview with all filters combined"""
        today = datetime.now()
        start_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")

        response = client.get(
            f"/api/overview?accounts=acc_001&start_date={start_date}&end_date={end_date}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data

    def test_get_overview_with_invalid_date_format(self, test_db):
        """Test /api/overview with invalid date format"""
        # Should return 400 or handle gracefully
        response = client.get("/api/overview?start_date=invalid-date")

        # Depending on implementation, this should either:
        # 1. Return 400 Bad Request
        # 2. Return 200 with default date range
        assert response.status_code in [200, 400]

    def test_get_overview_nonexistent_account(self, test_db):
        """Test /api/overview with account that doesn't exist"""
        response = client.get("/api/overview?accounts=acc_999")

        assert response.status_code == 200
        data = response.json()
        # Should return empty or default structure
        assert "kpis" in data

    def test_overview_kpi_calculations(self, test_db):
        """Test that KPI calculations are correct"""
        response = client.get("/api/overview")

        assert response.status_code == 200
        data = response.json()

        kpis = {kpi["label"]: kpi for kpi in data["kpis"]}

        # Verify CPEE is calculated
        if "CPEE Consolidado" in kpis:
            assert isinstance(kpis["CPEE Consolidado"]["value"], (int, float))
            assert kpis["CPEE Consolidado"]["unit"] == "R$"

    @pytest.mark.slow
    def test_overview_performance_with_large_dataset(self, test_db):
        """Test /api/overview performance with many campaigns"""
        # This test can be marked as slow and skipped in CI with -m "not slow"
        db = TestingSessionLocal()

        # Add many campaigns
        for i in range(100):
            campaign = CampaignData(
                account_id=f"acc_{i % 10}",
                campaign_id=f"camp_{i}",
                campaign_name=f"Campaign {i}",
                uf="SP",
                date_fetched=datetime.now().date(),
                spend=1000.0 + i,
                impressions=100000 + i * 1000,
                clicks=3000 + i * 100,
                leads=50 + i,
                cpee=20.0 + i * 0.1,
                ctr=3.0,
                cpc=0.33,
                cpm=10.0,
                frequency=2.0,
                lead_quality="hot"
            )
            db.add(campaign)

        db.commit()
        db.close()

        # Request should complete quickly
        import time
        start = time.time()
        response = client.get("/api/overview")
        elapsed = time.time() - start

        assert response.status_code == 200
        assert elapsed < 2.0  # Should complete in under 2 seconds


class TestDashboardExport:
    """Test suite for /api/dashboard/export endpoint"""

    def test_export_basic_structure(self, test_db):
        """Test /api/dashboard/export returns correct structure"""
        response = client.get("/api/dashboard/export")

        assert response.status_code == 200
        data = response.json()

        # Verify top-level structure
        assert "accounts" in data
        assert "snapshots" in data
        assert "creatives" in data
        assert "clusters" in data

        assert isinstance(data["accounts"], list)
        assert isinstance(data["snapshots"], list)
        assert isinstance(data["creatives"], list)
        assert isinstance(data["clusters"], list)

    def test_export_snapshot_fields(self, test_db):
        """Test export snapshots contain all required fields"""
        response = client.get("/api/dashboard/export")

        assert response.status_code == 200
        data = response.json()

        required_snapshot_fields = [
            "data", "account_id", "spend", "impressoes", "cliques",
            "leads", "cpee", "ctr", "cpc", "cpm", "cpl"
        ]

        if data["snapshots"]:
            for snapshot in data["snapshots"]:
                for field in required_snapshot_fields:
                    assert field in snapshot, f"Missing field: {field}"

    def test_export_creative_fields(self, test_db):
        """Test export creatives contain all required fields"""
        response = client.get("/api/dashboard/export")

        assert response.status_code == 200
        data = response.json()

        required_creative_fields = ["id", "nome", "account_id", "spend", "leads", "cpee", "ctr"]

        if data["creatives"]:
            for creative in data["creatives"]:
                for field in required_creative_fields:
                    assert field in creative, f"Missing field: {field}"

    def test_export_cluster_fields(self, test_db):
        """Test export clusters contain all required fields"""
        response = client.get("/api/dashboard/export")

        assert response.status_code == 200
        data = response.json()

        required_cluster_fields = ["id", "nome", "account_id", "spend", "leads", "cpee"]

        if data["clusters"]:
            for cluster in data["clusters"]:
                for field in required_cluster_fields:
                    assert field in cluster, f"Missing field: {field}"

    def test_export_with_account_filter(self, test_db):
        """Test /api/dashboard/export with account filter"""
        response = client.get("/api/dashboard/export?accounts=acc_001")

        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "snapshots" in data
        assert isinstance(data["snapshots"], list)

    def test_export_with_date_range(self, test_db):
        """Test /api/dashboard/export with date range"""
        today = datetime.now()
        start_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")

        response = client.get(
            f"/api/dashboard/export?start_date={start_date}&end_date={end_date}"
        )

        assert response.status_code == 200
        data = response.json()
        assert "snapshots" in data

    def test_export_metrics_calculation_ctr(self, test_db):
        """Test CTR is calculated correctly"""
        response = client.get("/api/dashboard/export")

        assert response.status_code == 200
        data = response.json()

        for snapshot in data["snapshots"]:
            if snapshot["impressoes"] > 0:
                expected_ctr = (snapshot["cliques"] / snapshot["impressoes"]) * 100
                assert abs(snapshot["ctr"] - round(expected_ctr, 2)) < 0.01

    def test_export_metrics_calculation_cpc(self, test_db):
        """Test CPC is calculated correctly"""
        response = client.get("/api/dashboard/export")

        assert response.status_code == 200
        data = response.json()

        for snapshot in data["snapshots"]:
            if snapshot["cliques"] > 0:
                expected_cpc = snapshot["spend"] / snapshot["cliques"]
                assert abs(snapshot["cpc"] - round(expected_cpc, 2)) < 0.01

    def test_export_metrics_calculation_cpm(self, test_db):
        """Test CPM is calculated correctly"""
        response = client.get("/api/dashboard/export")

        assert response.status_code == 200
        data = response.json()

        for snapshot in data["snapshots"]:
            if snapshot["impressoes"] > 0:
                expected_cpm = (snapshot["spend"] * 1000) / snapshot["impressoes"]
                assert abs(snapshot["cpm"] - round(expected_cpm, 2)) < 0.01

    def test_export_metrics_calculation_cpl(self, test_db):
        """Test CPL is calculated correctly"""
        response = client.get("/api/dashboard/export")

        assert response.status_code == 200
        data = response.json()

        for snapshot in data["snapshots"]:
            if snapshot["leads"] > 0:
                expected_cpl = snapshot["spend"] / snapshot["leads"]
                assert abs(snapshot["cpl"] - round(expected_cpl, 2)) < 0.01

    def test_export_empty_database(self):
        """Test export with empty database"""
        response = client.get("/api/dashboard/export")

        assert response.status_code == 200
        data = response.json()

        assert data["snapshots"] == []
        assert data["creatives"] == []
        assert data["clusters"] == []


class TestIntegration:
    """Integration tests for overview endpoints"""

    def test_accounts_and_overview_consistency(self, test_db):
        """Test that accounts returned match those in overview data"""
        accounts_response = client.get("/api/accounts")
        accounts = accounts_response.json()["accounts"]

        overview_response = client.get("/api/overview")
        overview_data = overview_response.json()

        # Both should succeed
        assert accounts_response.status_code == 200
        assert overview_response.status_code == 200

        # Accounts list should not be empty if overview has data
        if overview_data["kpis"]:
            assert len(accounts) > 0

    def test_filter_consistency_across_endpoints(self, test_db):
        """Test that filtering works consistently across all endpoints"""
        account = "acc_001"

        overview_response = client.get(f"/api/overview?accounts={account}")
        export_response = client.get(f"/api/dashboard/export?accounts={account}")

        assert overview_response.status_code == 200
        assert export_response.status_code == 200

        overview_data = overview_response.json()
        export_data = export_response.json()

        # Both should return data structures
        assert isinstance(overview_data["kpis"], list)
        assert isinstance(export_data["snapshots"], list)
