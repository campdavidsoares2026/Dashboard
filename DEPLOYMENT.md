# CPEE Dashboard — Deployment Guide

Production deployment instructions for CPEE Dashboard backend and frontend.

---

## Prerequisites

- **Python**: 3.9 or higher
- **Node.js**: 18.17.0 or higher (Next.js 14 requires 18.17+)
- **SQLite3**: 3.8 or higher (included on most systems)
- **Git**: For cloning and version control
- **Docker** (optional): For containerized deployment
- **pip** and **npm**: Package managers for dependencies

Verify installations:
```bash
python --version    # Python 3.9+
node --version      # v18.17.0 or higher
sqlite3 --version   # 3.8+
```

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd cpee-dashboard
```

### 2. Backend Configuration

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Required variables:
# DATABASE_URL=sqlite:///./cpee_dashboard.db
# META_ADMIN_TOKEN=your_meta_api_token_here
```

### 3. Install Backend Dependencies

```bash
# Ensure venv is activated
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

### 4. Frontend Configuration

```bash
# Navigate to frontend directory
cd ../frontend

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
# Required variables:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 5. Install Frontend Dependencies

```bash
npm install
```

---

## Windows Deployment Note

### Development (Windows)

Use WSL2 (Windows Subsystem for Linux 2) with Docker Desktop for local development:

1. Install [WSL2](https://docs.microsoft.com/en-us/windows/wsl/install) and [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Clone repository in WSL2 terminal
3. Follow Linux/macOS deployment instructions within WSL2
4. Access dashboard via `http://localhost:3000`

### Production (Windows)

**Recommendation**: Deploy to Ubuntu/Linux servers (cloud hosting, VPS, etc.)

Reasons:
- FastAPI + Gunicorn better optimized for Unix-based systems
- Windows production deployment adds operational complexity
- Linux offers better process management and systemd integration

For Windows-only scenarios, consider:
- Docker containers (Windows Server)
- IIS with Python FastAPI adapter (advanced setup)
- Managed hosting services (Azure App Service, Heroku)

---

## Local Development

### Start Backend

```bash
cd backend

# Activate virtual environment (if not already activated)
source venv/bin/activate

# Run development server with auto-reload
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

### Start Frontend

In a new terminal:

```bash
cd frontend

# Run Next.js development server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

---

## Production Deployment

### Backend Production Setup

#### Using Gunicorn

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Install Gunicorn
pip install gunicorn

# Run with Gunicorn (4 worker processes)
gunicorn -w 4 -b 0.0.0.0:8000 app.main:app

# With more workers and configuration:
gunicorn \
  -w 8 \
  -b 0.0.0.0:8000 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  app.main:app
```

#### Using Uvicorn (Alternative)

```bash
# Production mode with single worker
python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --loop uvloop
```

### Frontend Production Setup

#### Build and Start

```bash
cd frontend

# Build for production
npm run build

# Start production server
npm start
# Or use PM2/systemd for process management
```

#### Using PM2 for Process Management

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem file (ecosystem.config.js) - see example below
# Configure and start
pm2 start ecosystem.config.js --env production

# Monitor processes
pm2 logs
pm2 status
```

**ecosystem.config.js** template:
```javascript
module.exports = {
  apps: [{
    name: 'cpee-dashboard-backend',
    script: './backend/app/main.py',
    interpreter: 'python3',
    env: {
      PYTHONUNBUFFERED: '1'
    }
  }, {
    name: 'cpee-dashboard-frontend',
    script: 'npm start',
    cwd: './frontend',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

#### Using Systemd (Linux)

Create `/etc/systemd/system/cpee-dashboard.service`:

```ini
[Unit]
Description=CPEE Dashboard
After=network.target

[Service]
Type=notify
User=www-data
WorkingDirectory=/opt/cpee-dashboard/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable cpee-dashboard
sudo systemctl start cpee-dashboard
```

### Reverse Proxy Configuration

#### Nginx

```nginx
upstream backend {
    server localhost:8000;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # API proxy
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://backend;
        access_log off;
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### SSL/TLS (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d yourdomain.com

# Auto-renew
sudo systemctl enable certbot.timer
```

**Certificate Paths**: Certificates are stored at `/etc/letsencrypt/live/yourdomain.com/`
- `privkey.pem` — Private key
- `fullchain.pem` — Full certificate chain

**Post-renewal Nginx Reload**: Create `/etc/letsencrypt/renewal-hooks/post/nginx.sh`:
```bash
#!/bin/bash
systemctl reload nginx
```

Make executable:
```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/post/nginx.sh
```

### Docker Production

```bash
# Build images
docker-compose build

# Run containers
docker-compose up -d

# Monitor logs
docker-compose logs -f

# Stop containers
docker-compose down
```

---

## Database Backup

### SQLite Backup Command

```bash
# Create backup
sqlite3 cpee_dashboard.db ".backup cpee_dashboard_backup.db"

# Or using command line
cp cpee_dashboard.db cpee_dashboard_backup_$(date +%Y%m%d_%H%M%S).db

# Verify backup integrity
sqlite3 cpee_dashboard_backup.db "PRAGMA integrity_check;"
```

### Automated Daily Backups

```bash
# Create backup script (backup.sh)
#!/bin/bash
BACKUP_DIR="/backups/cpee-dashboard"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
sqlite3 /opt/cpee-dashboard/cpee_dashboard.db \
  ".backup $BACKUP_DIR/cpee_dashboard_$TIMESTAMP.db"

# Add to crontab (2 AM UTC daily - adjust hour for your timezone)
0 2 * * * /opt/cpee-dashboard/backup.sh
```

### Restore from Backup

```bash
# Stop application
sudo systemctl stop cpee-dashboard

# Restore database
cp cpee_dashboard_backup.db cpee_dashboard.db

# Restart application
sudo systemctl start cpee-dashboard

# Verify
curl http://localhost:8000/health
```

---

## Monitoring

### Health Check

```bash
# Simple health endpoint check
curl http://localhost:8000/health

# Extended check with verbose output
curl -v http://localhost:8000/health

# Continuous monitoring
watch -n 30 'curl -s http://localhost:8000/health'
```

### Log Aggregation

Backend logs available via:
```bash
# View logs in real-time
docker-compose logs -f backend

# Or with systemd
journalctl -u cpee-dashboard -f
```

Frontend logs:
```bash
# PM2 logs
pm2 logs cpee-dashboard

# Or check system logs
tail -f /var/log/syslog | grep "CPEE Dashboard"
```

### Recommended Monitoring Stack

- **Prometheus** — Metrics collection
- **Grafana** — Visualization dashboard
- **ELK Stack** (Elasticsearch, Logstash, Kibana) — Log aggregation
- **Sentry** — Error tracking

**Sentry Integration Example (Backend)**:

Add to `backend/app/main.py`:
```python
import sentry_sdk

sentry_sdk.init(
    dsn="your-sentry-dsn",
    traces_sample_rate=0.1
)
```

Get your DSN from [Sentry](https://sentry.io) and add to `.env`:
```
SENTRY_DSN=your-sentry-dsn
```

---

## Performance Tuning

### Backend Optimization

```python
# app/main.py
from fastapi.middleware import Middleware
from fastapi.middleware.gzip import GZIPMiddleware

# Enable compression
app.add_middleware(GZIPMiddleware, minimum_size=1000)

# Database connection pooling
from sqlalchemy.pool import QueuePool
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40
)
```

### Frontend Optimization

```bash
# Enable image optimization
npm install next-image-export-optimizer

# Analyze bundle size
npm run build:analyze

# Enable static generation
npm run build  # Generates .next/static
```

### Caching Strategy

```nginx
# Nginx caching for static assets
location ~* \.(?:jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

---

## Security Checklist

- [ ] Set log level to WARNING in production (add `LOG_LEVEL=warning` to .env)
- [ ] Use strong database password (SQLite: secure file permissions)
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly (allow only trusted origins)
- [ ] Set secure HTTP headers (CSP, X-Frame-Options, etc.)
- [ ] Implement rate limiting
- [ ] Validate and sanitize all inputs
- [ ] Use environment variables for secrets (not in .env file in git)
- [ ] Enable audit logging
- [ ] Regular security updates (`pip install --upgrade`)
- [ ] Database backups stored securely off-site
- [ ] Monitor error logs for suspicious activity

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

### Database Locked Error

```bash
# Ensure proper SQLite connection handling
# Check for open connections
sqlite3 cpee_dashboard.db
sqlite> .tables

# If locked, restart application and clear temporary files
rm -rf /tmp/sqlite_*
```

### Frontend Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### API Connection Issues

```bash
# Check backend is running
curl -v http://localhost:8000/health

# Verify CORS configuration
curl -i -X OPTIONS http://localhost:8000/api/overview
```

---

## Rollback Procedure

```bash
# If deployment fails, rollback to previous version
git log --oneline        # Find previous commit
git revert <commit-hash> # Create revert commit
git push                 # Deploy revert

# Or checkout previous tag
git checkout v1.0.0
npm install && npm run build
npm start
```

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database initialized and backed up
- [ ] Dependencies installed (`pip`, `npm`)
- [ ] Tests passing locally
- [ ] Build succeeds (`npm run build`)
- [ ] Port 8000 (backend) available
- [ ] Port 3000 (frontend) available (if not behind proxy)
- [ ] Reverse proxy configured (nginx/Apache)
- [ ] SSL/TLS certificates installed
- [ ] Process manager configured (systemd/PM2)
- [ ] Monitoring/alerting enabled
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Load testing completed
- [ ] Security checklist completed

---

## Support & Contact

For deployment issues:
1. Check logs: `docker-compose logs` or `journalctl`
2. Verify configuration: `.env` files
3. Test connectivity: `curl http://localhost:8000/health`
4. Review this guide and README.md
5. Open GitHub issue with error details
