# CPEE Dashboard — Redesign Complete

Production-ready dashboard for campaign analytics with real-time insights, sentiment analysis, and AI-powered predictions.

---

## Quick Start

### Local Development

```bash
# Clone and setup backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install

# Start backend (from backend directory)
python -m uvicorn app.main:app --reload --port 8000

# Start frontend (from frontend directory)
npm run dev
# Access at http://localhost:3000
```

### Docker

```bash
# Start both backend and frontend
docker-compose up

# Access dashboard at http://localhost:3000
```

---

## Features

- **Overview Tab** — KPI cards (CPEE, budget, leads), intelligent alerts, AI recommendations, 7-day CPEE trend, budget breakdown, top 5 clusters
- **Comparações Tab** — Side-by-side cluster comparison, demographic breakdown (age, gender, interests), hourly performance heatmap, sentiment analysis
- **Insights Tab** — Campaigns grouped by account, AI-powered predictions (7-30 days), recommendation history with execution status, trending indicators
- **Real-time Updates** — Live sentiment analysis on social comments, budget pacing alerts, anomaly detection
- **Sentiment Analysis** — Portuguese NLP-powered sentiment classification (positive/negative/neutral) with example comments
- **AI Predictions** — Linear regression trend forecasting, 7-30 day period predictions, confidence scores and business drivers
- **Smart Recommendations** — 4-rule recommendation engine (budget scaling, creative refresh, audience adjustment, pausing underperformers)

---

## Architecture

```
Meta Ads API
    |
    v
FastAPI Backend (11 endpoints, services, SQLite)
    |
    +-- /api/overview
    +-- /api/clusters/comparacao
    +-- /api/clusters/{id}/demografia
    +-- /api/clusters/{id}/horarios
    +-- /api/clusters/{id}/sentimento
    +-- /api/campanhas-por-conta
    +-- /api/clusters/{id}/trending
    +-- /api/recomendacoes-historico
    +-- /api/previsoes
    |
    v
Next.js Frontend (3-tab design)
    |
    +-- Overview Tab (React, Chart.js)
    +-- Comparações Tab (Table, Heatmap)
    +-- Insights Tab (Predictions, History)
    |
    v
SQLite Database
```

**Backend Stack**: FastAPI, SQLAlchemy ORM, Python 3.9+
**Frontend Stack**: Next.js 14, React 19, TypeScript, Tailwind CSS
**AI/ML**: scikit-learn (prediction), transformers (sentiment)

---

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete endpoint specifications, request/response examples, and integration notes.

---

## Testing

### Backend Tests
```bash
cd backend
pytest -v                    # Run all tests
pytest tests/test_api.py -v # Run API tests
pytest tests/test_predictions.py -v # Run prediction tests
```

### Frontend Tests
```bash
cd frontend
npm test                     # Run all tests
npm run test:e2e           # Run E2E tests
```

**Note**: E2E tests require both backend and frontend running in parallel. Start both services before running tests.

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions, environment configuration, database backup procedures, and monitoring setup.

---

## Project Structure

```
cpee-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/              # API route handlers
│   │   ├── models/           # SQLAlchemy models & schemas
│   │   ├── services/         # Business logic (prediction, sentiment, recommendations)
│   │   └── main.py           # FastAPI app entry point
│   ├── tests/                # Comprehensive test suite
│   ├── requirements.txt
│   └── conftest.py
├── frontend/
│   ├── app/
│   │   ├── dashboard/        # Dashboard pages (overview, comparacoes, insights)
│   │   ├── components/       # Reusable UI components
│   │   ├── services/         # API client
│   │   └── layout.tsx        # Main layout
│   ├── public/               # Static assets
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── README.md
├── API_DOCUMENTATION.md
├── DEPLOYMENT.md
└── cpee_dashboard.db         # SQLite database
```

---

## Obtaining API Credentials

### META_ADMIN_TOKEN

The `META_ADMIN_TOKEN` is required to authenticate with Meta's Ads API. To obtain it:

1. Go to [Meta Business Platform](https://business.facebook.com)
2. Navigate to **Apps** → **Your App** → **Settings**
3. Under **Add credentials**, select **System User** or **App Token**
4. Generate a new access token with `ads_management` and `ads_read` permissions
5. Copy the token and add it to your `.env` file

For detailed instructions, see [Meta API Documentation](https://developers.facebook.com/docs/marketing-api/get-started).

## Environment Variables

Create `.env` file in backend and frontend directories:

**Backend (.env)**
```
DATABASE_URL=sqlite:///./cpee_dashboard.db
META_ADMIN_TOKEN=your_token_here
```

**Important**: `.env` files should NOT be committed to git (listed in `.gitignore`). Each developer and production deployment must have their own credentials.

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## Development Workflow

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and test locally
3. Run test suite: `pytest && npm test`
4. Commit with clear message: `git commit -m "feat: add feature"`
5. Push to remote: `git push origin feature/my-feature`
6. Open pull request for review

---

## Contributing

Please follow the project's code style and test requirements. All PRs must pass the test suite before merging.

---

## License

Proprietary — Podemos Campaign Analytics
