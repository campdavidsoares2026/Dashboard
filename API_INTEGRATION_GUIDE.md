# CPEE Dashboard API Integration Guide

## ✅ Status
The CPEE Dashboard backend API is **fully operational** with CORS enabled for the Lovable dashboard at `https://pilotoauto-ad-pilot.lovable.app`.

## API Configuration
- **Base URL**: `http://localhost:8000`
- **CORS Origin Allowed**: `https://pilotoauto-ad-pilot.lovable.app`
- **Server Status**: ✅ Running (Uvicorn)
- **Authentication**: Not required for this deployment

## Available Endpoints

### 1. Overview Dashboard
**GET** `/api/overview`
- Returns: KPI cards, alerts, recommendations, budget breakdown, top clusters
- Used by: Main dashboard tab
- No parameters required

**Response Example:**
```json
{
  "kpis": [
    {
      "label": "CPEE Consolidado",
      "value": 107.8,
      "unit": "R$",
      "trend": 0.0,
      "trend_direction": "down",
      "metadata": "87 campanhas"
    }
  ],
  "alerts": [],
  "recommendations": [
    {
      "campaign": "Campaign Name",
      "action": "Increase budget",
      "rationale": "..."
    }
  ],
  "budget_breakdown": {},
  "top_clusters": []
}
```

### 2. Campaigns by Account
**GET** `/api/campanhas-por-conta`
- Returns: List of all campaigns grouped by account with metrics
- Fields: id, nome, conta, cpee, gasto, leads, impressoes, cliques, sentimento, top_demog, melhor_hora

### 3. Campaign Comparisons
**GET** `/api/clusters/comparacao?clusters=campaign1,campaign2`
- Compare multiple campaigns side-by-side
- Parameters:
  - `clusters` (required): Comma-separated campaign names

### 4. Cluster Demographics
**GET** `/api/clusters/{cluster_id}/demografia`
- Get demographic breakdown for a cluster
- Returns: Age, gender, location distribution

### 5. Cluster Sentiment Analysis
**GET** `/api/clusters/{cluster_id}/sentimento`
- Get sentiment analysis for a cluster
- Returns: positivo, negativo, neutro percentages + examples

### 6. Cluster Hours Analysis
**GET** `/api/clusters/{cluster_id}/horarios`
- Get best performing hours for a cluster
- Returns: Hour-by-hour performance data

### 7. Predictions
**GET** `/api/previsoes`
- Get 7-30 day trend predictions with confidence bounds
- Returns: Linear regression forecasts by cluster

### 8. Recommendations History
**GET** `/api/recomendacoes-historico`
- Get historical recommendations with implementation status
- Returns: Past recommendations and their outcomes

### 9. Municipal CPEE Export
**GET** `/api/municipios-cpee`
- Get CPEE breakdown by municipality
- Used for: Export/reporting features

### 10. Cluster Trending
**GET** `/api/clusters/{cluster_id}/trending`
- Get trending topics and keywords for a cluster
- Returns: Topic analysis and keyword trends

### 11. Sync Status
**GET** `/api/sync/status`
- Check synchronization status with Meta Ads API
- Returns: Last sync time, status, record count

**POST** `/api/sync/meta-ads`
- Trigger manual synchronization with Meta Ads API
- Returns: Sync result and updated record count

## Frontend Integration Instructions

### Using Fetch API in Lovable

```javascript
// Example: Fetch overview data
const fetchOverview = async () => {
  const response = await fetch('http://localhost:8000/api/overview', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();
  return data;
};

// Example: Fetch campaigns by account
const fetchCampaigns = async () => {
  const response = await fetch('http://localhost:8000/api/campanhas-por-conta', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();
  return data;
};
```

### React Hooks Integration (Recommended)

```javascript
import { useEffect, useState } from 'react';

function useCPEEOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/overview')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { data, loading, error };
}

// Usage in component
function OverviewTab() {
  const { data, loading, error } = useCPEEOverview();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data?.kpis.map(kpi => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
```

## Production Deployment Notes

### Currently Configured For
- Local development: `http://localhost:3000`, `http://localhost:5000`
- Lovable production: `https://pilotoauto-ad-pilot.lovable.app`

### For Production VPS Deployment
Update `.env` to add your production domain:
```
CORS_ORIGIN=https://your-dashboard-domain.com
```

Then restart the API server:
```bash
pkill -f uvicorn
source venv/bin/activate
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level warning
```

## Testing the API

### Using curl
```bash
curl http://localhost:8000/api/overview | jq
curl http://localhost:8000/api/campanhas-por-conta | jq
curl "http://localhost:8000/api/clusters/comparacao?clusters=campaign1" | jq
```

### Using Python
```python
import requests

# Get overview
response = requests.get('http://localhost:8000/api/overview')
overview = response.json()

# Get campaigns
response = requests.get('http://localhost:8000/api/campanhas-por-conta')
campaigns = response.json()
```

## Database
- Type: SQLite
- Path: `cpee_dashboard.db`
- Location: `/Users/alexsandro/cpee-dashboard/backend/`

## Support & Troubleshooting

### API Not Responding
1. Check if server is running: `curl http://localhost:8000/api/overview`
2. Check logs: `tail -f /tmp/api-server.log`
3. Restart server if needed: `pkill -f uvicorn && (restart command above)`

### CORS Issues
- Verify `CORS_ORIGIN` environment variable in `.env`
- Check CORS headers response: `curl -H "Origin: ..." -X OPTIONS http://localhost:8000/api/overview -v`

### Data Not Updating
- Check sync status: `curl http://localhost:8000/api/sync/status`
- Trigger manual sync: `curl -X POST http://localhost:8000/api/sync/meta-ads`
- Verify Meta Ads API credentials in `.env`

---
**Generated**: 2026-05-26
**API Version**: 1.0.0
**Dashboard**: CPEE Dashboard - Podemos
