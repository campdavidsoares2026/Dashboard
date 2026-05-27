# CPEE Dashboard API Documentation

**Base URL**: `http://localhost:8000/api`

**Total Endpoints**: 11

All endpoints return JSON responses. In production deployments, JWT authentication is planned for v2.0.

---

## Overview Endpoints

### GET /overview

Get dashboard overview with KPI cards, alerts, recommendations, and trends.

**Response:**
```json
{
  "kpis": [
    {
      "label": "CPEE Consolidado",
      "value": 45.32,
      "unit": "R$",
      "trend": -5.2,
      "trend_direction": "down",
      "metadata": "HOT 🔥"
    }
  ],
  "alerts": [],
  "recommendations": [
    {
      "id": "uuid",
      "cluster": "Reforma Cozinha",
      "type": "warning",
      "title": "Scale Budget",
      "reason": "CPEE trending down",
      "actions": ["Increase daily budget 15%"],
      "sentiment": "78%"
    }
  ],
  "cpee_trend": [],
  "budget_breakdown": [],
  "top_clusters": []
}
```

---

## Comparações (Comparisons) Endpoints

### GET /clusters/comparacao

Compare multiple clusters side-by-side.

**Query Parameters:**
- `clusters` (required): Comma-separated cluster IDs (e.g., `clusters=sp,rj`)

**Response:**
```json
{
  "clusters": [
    {
      "id": "sp",
      "name": "São Paulo",
      "cpee": 45.5,
      "eem": 1.8,
      "gasto": 5000,
      "leads": 25
    }
  ],
  "graficos": {
    "cpee_comparison": [...],
    "budget_allocation": [...],
    "performance_metrics": [...]
  }
}
```

### GET /clusters/{cluster_id}/demografia

Get demographic breakdown for a cluster.

**Path Parameters:**
- `cluster_id` (required): Cluster ID

**Response:**
```json
{
  "faixa_etaria": {
    "18-24": 15.5,
    "25-34": 28.3,
    "35-44": 32.1,
    "45-54": 18.2,
    "55+": 5.9
  },
  "genero": {
    "masculino": 62.5,
    "feminino": 37.5
  },
  "interesses": [
    "Home Renovation",
    "DIY Projects",
    "Interior Design",
    "Real Estate"
  ]
}
```

### GET /clusters/{cluster_id}/horarios

Get hourly performance heatmap for a cluster.

**Path Parameters:**
- `cluster_id` (required): Cluster ID

**Response:**
```json
{
  "heatmap": [
    {
      "hora": "08h-09h",
      "seg": 120,
      "ter": 145,
      "qua": 130,
      "qui": 155,
      "sex": 180,
      "sab": 95,
      "dom": 60
    }
  ],
  "melhor_hora": "20h-22h",
  "pior_hora": "02h-04h"
}
```

### GET /clusters/{cluster_id}/sentimento

Get sentiment analysis for a cluster.

**Path Parameters:**
- `cluster_id` (required): Cluster ID

**Response:**
```json
{
  "positivo": 78.5,
  "negativo": 15.2,
  "neutro": 6.3,
  "exemplos_positivos": [
    {
      "texto": "Excelente trabalho na renovação! Recomendo!",
      "score": 0.98
    }
  ],
  "exemplos_negativos": [
    {
      "texto": "Discordo completamente",
      "score": 0.87
    }
  ]
}
```

---

## Insights Endpoints

### GET /campanhas-por-conta

Get campaigns grouped by account with key metrics.

**Response:**
```json
{
  "campanhas": [
    {
      "account_id": "act_123456789",
      "account_name": "Account 1",
      "total_gasto": 15000,
      "total_leads": 75,
      "cpee_medio": 45.5,
      "sentimento_medio": 72,
      "clusters": [
        {
          "name": "Reforma Cozinha",
          "gasto": 5000,
          "leads": 25,
          "cpee": 45.5
        }
      ]
    }
  ]
}
```

### GET /clusters/{cluster_id}/trending

Get trending prediction and drivers for a cluster.

**Path Parameters:**
- `cluster_id` (required): Cluster ID

**Response:**
```json
{
  "tendencia": 8.5,
  "confianca": 0.92,
  "drivers": [
    {
      "nome": "Budget Increase",
      "impacto": 3.2
    },
    {
      "nome": "Seasonal Trend",
      "impacto": 2.1
    }
  ],
  "sugestao": "CPEE trending up due to seasonal factors and increased budget allocation"
}
```

### GET /recomendacoes-historico

Get recommendation history with execution status.

**Response:**
```json
{
  "historico": [
    {
      "id": "uuid",
      "cluster": "Reforma Cozinha",
      "recomendacao": "Scale Budget",
      "data_criacao": "2026-05-12T10:30:00",
      "status": "executed",
      "resultado": "+12% leads after 3 days"
    }
  ]
}
```

### GET /previsoes

Get AI-powered predictions for specified period.

**Query Parameters:**
- `periodo` (optional): Prediction period - `7d`, `14d`, or `30d` (default: `7d`)

**Response:**
```json
{
  "previsoes": [
    {
      "cluster": "Reforma Cozinha",
      "periodo": "7d",
      "cpee_previsto": 48.2,
      "confianca": 0.89,
      "drivers": [
        "Seasonal increase",
        "Budget allocated"
      ]
    }
  ]
}
```

---

## Export Endpoints

### GET /exportar

Export dashboard data in PDF or CSV format.

**Query Parameters:**
- `formato` (required): `pdf` or `csv`

**Response:**
- PDF: Binary file (application/pdf)
- CSV: Text file (text/csv)

```bash
# Example usage
curl http://localhost:8000/api/exportar?formato=pdf > report.pdf
```

---

## Health Check

### GET /health

Check API health status.

**Response:**
```json
{
  "status": "ok"
}
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK` — Request successful
- `400 Bad Request` — Invalid parameters
- `401 Unauthorized` — Missing/invalid authentication (production)
- `404 Not Found` — Resource not found
- `500 Internal Server Error` — Server error

Error responses include detail:
```json
{
  "detail": "Error message describing what went wrong"
}
```

Example 400 error response:
```json
{
  "detail": [
    {
      "loc": ["query", "clusters"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## Authentication (Production)

**Planned for v2.0**: JWT authentication will be implemented in the next major release. Currently, all endpoints are publicly accessible on development servers.

In production deployment (v2.0+), include JWT token in Authorization header:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8000/api/overview
```

---

## Rate Limiting

No rate limiting in development. Production deployment should implement rate limiting via reverse proxy (nginx, CloudFlare, etc.).

---

## Code Examples

Complete code examples and client libraries are available in the repository:

- **Python**: See `backend/tests/test_api.py`
- **JavaScript/TypeScript**: See `frontend/app/services/api.ts`
- **cURL**: Use examples above

---

---

## Planned Enhancements

### WebSocket (Real-time)

Real-time sentiment updates available via WebSocket (planned for future release):

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/sentimento/cluster_id');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New sentiment data:', data);
};
```

Currently not implemented. See GitHub issues for planned WebSocket support.

### Pagination

Endpoints returning lists will support pagination in a future update:

```bash
GET /api/recomendacoes-historico?page=1&limit=20
```

Currently returns all results. Pagination will be implemented based on data volume requirements.

---

## Versioning

Current API version: `1.0.0`

Versioning strategy: URL-based (`/api/v1/...`) for breaking changes.

---

## Support

For issues or questions:
1. Check repository README and docs
2. Review test suite for usage examples
3. Open GitHub issue with details
4. Contact development team
