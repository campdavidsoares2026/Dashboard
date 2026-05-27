# VPS Deploy + Segurança — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preparar o código para produção, implantar na VPS Hostinger com Nginx + HTTPS e proteger a API com autenticação por API Key e rate limiting.

**Architecture:** Nginx como proxy reverso na porta 443 (HTTPS) encaminhando para o backend FastAPI (porta 8000 interna) e frontend Next.js (porta 3000 interna). API Key no header `Authorization: Bearer` protege o endpoint de export. Fail2ban + SSH por chave protegem o acesso ao servidor.

**Tech Stack:** FastAPI, Docker, Docker Compose, Nginx, Certbot (Let's Encrypt), UFW, Fail2ban, Ubuntu 22.04 LTS

---

## Arquivos Criados / Modificados

| Ação     | Arquivo                                    | Responsabilidade                              |
|----------|--------------------------------------------|-----------------------------------------------|
| Criar    | `backend/app/api/export.py`                | Endpoint GET /api/export/municipios-cpee      |
| Criar    | `backend/app/dependencies/auth.py`         | Dependência FastAPI de autenticação por API Key|
| Criar    | `nginx/nginx.conf`                         | Config do proxy reverso (HTTP → HTTPS)        |
| Criar    | `nginx/Dockerfile`                         | Container Nginx                               |
| Modificar| `backend/app/main.py`                      | Registrar export router, CORS de produção     |
| Modificar| `docker-compose.yml`                       | Adicionar serviço Nginx, fechar portas diretas|
| Modificar| `backend/requirements.txt`                 | Adicionar python-jose para geração de API Key |
| Modificar| `.env.example`                             | Documentar variável EXPORT_API_KEY            |

---

## FASE 1 — Código Local (rodar no seu PC, depois push para git)

---

### Task 1: Dependência de Autenticação por API Key

**Files:**
- Create: `backend/app/dependencies/__init__.py`
- Create: `backend/app/dependencies/auth.py`

- [ ] **Step 1: Criar a pasta e o arquivo de dependência**

Crie o arquivo `backend/app/dependencies/__init__.py` (vazio):
```python
```

Crie o arquivo `backend/app/dependencies/auth.py`:
```python
import os
from fastapi import Header, HTTPException


def verify_api_key(authorization: str = Header(...)) -> None:
    api_key = os.getenv("EXPORT_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="EXPORT_API_KEY not configured on server")
    expected = f"Bearer {api_key}"
    if authorization != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")
```

- [ ] **Step 2: Escrever o teste**

Crie `backend/tests/test_auth.py`:
```python
import pytest
from unittest.mock import patch
from fastapi import HTTPException
from app.dependencies.auth import verify_api_key


def test_valid_api_key():
    with patch.dict("os.environ", {"EXPORT_API_KEY": "secret123"}):
        verify_api_key("Bearer secret123")  # deve passar sem exceção


def test_invalid_api_key():
    with patch.dict("os.environ", {"EXPORT_API_KEY": "secret123"}):
        with pytest.raises(HTTPException) as exc:
            verify_api_key("Bearer wrong-key")
        assert exc.value.status_code == 401


def test_missing_env_key():
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(HTTPException) as exc:
            verify_api_key("Bearer qualquer-coisa")
        assert exc.value.status_code == 500
```

- [ ] **Step 3: Rodar o teste para confirmar que falha**

```bash
cd backend
pytest tests/test_auth.py -v
```

Esperado: `ModuleNotFoundError` ou `FAILED` (arquivo ainda não existe completo).

- [ ] **Step 4: Rodar o teste para confirmar que passa**

```bash
cd backend
pytest tests/test_auth.py -v
```

Esperado:
```
test_auth.py::test_valid_api_key PASSED
test_auth.py::test_invalid_api_key PASSED
test_auth.py::test_missing_env_key PASSED
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/dependencies/ backend/tests/test_auth.py
git commit -m "feat: add API key authentication dependency"
```

---

### Task 2: Rate Limiting simples (in-memory, sem dependência externa)

**Files:**
- Create: `backend/app/dependencies/rate_limit.py`

- [ ] **Step 1: Criar o rate limiter**

Crie `backend/app/dependencies/rate_limit.py`:
```python
import time
from collections import defaultdict
from fastapi import Request, HTTPException

# Sliding window: 60 requests per minute per IP
_requests: dict = defaultdict(list)
WINDOW_SECONDS = 60
MAX_REQUESTS = 60


def rate_limit(request: Request) -> None:
    ip = request.client.host
    now = time.time()
    window_start = now - WINDOW_SECONDS

    _requests[ip] = [t for t in _requests[ip] if t > window_start]

    if len(_requests[ip]) >= MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Limit: 60/min per IP."
        )

    _requests[ip].append(now)
```

- [ ] **Step 2: Escrever o teste**

Crie `backend/tests/test_rate_limit.py`:
```python
import time
import pytest
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.dependencies import rate_limit as rl_module
from app.dependencies.rate_limit import rate_limit


def make_request(ip: str):
    request = MagicMock()
    request.client.host = ip
    return request


def test_allows_requests_under_limit():
    rl_module._requests.clear()
    request = make_request("1.2.3.4")
    for _ in range(59):
        rate_limit(request)  # deve passar sem exceção


def test_blocks_at_limit():
    rl_module._requests.clear()
    request = make_request("9.9.9.9")
    for _ in range(60):
        rl_module._requests["9.9.9.9"].append(time.time())
    with pytest.raises(HTTPException) as exc:
        rate_limit(request)
    assert exc.value.status_code == 429


def test_different_ips_are_independent():
    rl_module._requests.clear()
    for _ in range(60):
        rl_module._requests["1.1.1.1"].append(time.time())
    request = make_request("2.2.2.2")
    rate_limit(request)  # IP diferente — deve passar
```

- [ ] **Step 3: Rodar os testes**

```bash
cd backend
pytest tests/test_rate_limit.py -v
```

Esperado: todos `PASSED`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/dependencies/rate_limit.py backend/tests/test_rate_limit.py
git commit -m "feat: add in-memory rate limiting (60 req/min per IP)"
```

---

### Task 3: Endpoint de Export `/api/export/municipios-cpee`

**Files:**
- Create: `backend/app/api/export.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Escrever o teste do endpoint**

Crie `backend/tests/test_export.py`:
```python
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from app.main import app
from app.models.database import get_db
from app.models.models import CampaignData
from datetime import datetime


def mock_campaigns():
    c1 = CampaignData()
    c1.account_id = "act_111"
    c1.campaign_id = "camp_001"
    c1.campaign_name = "SP_CAPITAL_REELS"
    c1.spend = 1000.0
    c1.clicks = 200
    c1.impressions = 10000
    c1.leads = 15
    c1.ctr = 2.0
    c1.cpc = 5.0
    c1.frequency = 2.5
    c1.cpee = 5.0
    c1.date_fetched = datetime.now()

    c2 = CampaignData()
    c2.account_id = "act_222"
    c2.campaign_id = "camp_002"
    c2.campaign_name = "INTERIOR_NORTE"
    c2.spend = 500.0
    c2.clicks = 50
    c2.impressions = 5000
    c2.leads = 8
    c2.ctr = 1.0
    c2.cpc = 10.0
    c2.frequency = 1.8
    c2.cpee = 10.0
    c2.date_fetched = datetime.now()

    return [c1, c2]


def override_db():
    class FakeDB:
        def query(self, model):
            return self
        def filter(self, *args):
            return self
        def all(self):
            return mock_campaigns()
    yield FakeDB()


app.dependency_overrides[get_db] = override_db
client = TestClient(app)
API_KEY = "test-key-123"


def test_export_requires_auth():
    response = client.get("/api/export/municipios-cpee")
    assert response.status_code == 422  # missing Authorization header


def test_export_rejects_wrong_key():
    with patch.dict(os.environ, {"EXPORT_API_KEY": API_KEY}):
        response = client.get(
            "/api/export/municipios-cpee",
            headers={"Authorization": "Bearer wrong"}
        )
    assert response.status_code == 401


def test_export_returns_data_with_valid_key():
    with patch.dict(os.environ, {"EXPORT_API_KEY": API_KEY}):
        response = client.get(
            "/api/export/municipios-cpee",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
    assert response.status_code == 200
    data = response.json()
    assert "municipios" in data
    assert "total_municipios" in data
    assert data["total_municipios"] == 2


def test_export_cpee_calculation():
    with patch.dict(os.environ, {"EXPORT_API_KEY": API_KEY}):
        response = client.get(
            "/api/export/municipios-cpee",
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
    municipios = response.json()["municipios"]
    sp = next(m for m in municipios if m["municipio"] == "act_111")
    # CPEE = spend / clicks = 1000 / 200 = 5.0
    assert sp["cpee"] == 5.0
    assert sp["engaj"] == 200
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

```bash
cd backend
pytest tests/test_export.py -v
```

Esperado: `ImportError` ou `FAILED` — endpoint não existe ainda.

- [ ] **Step 3: Criar o endpoint**

Crie `backend/app/api/export.py`:
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from collections import defaultdict
from datetime import datetime
from app.models.database import get_db
from app.models.models import CampaignData
from app.dependencies.auth import verify_api_key
from app.dependencies.rate_limit import rate_limit
from fastapi import Request
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/export", tags=["export"])


def _temperatura(cpee: float, median: float) -> str:
    if cpee < median * 0.9:
        return "quente"
    if cpee > median * 1.1:
        return "frio"
    return "morno"


@router.get("/municipios-cpee")
async def get_municipios_cpee(
    request: Request,
    periodo: str = Query("30d", pattern="^(7d|14d|30d|60d|90d)$"),
    cluster_id: int = Query(None),
    uf: str = Query(None),
    db: Session = Depends(get_db),
    _auth=Depends(verify_api_key),
    _rate=Depends(rate_limit),
):
    campaigns = db.query(CampaignData).all()

    groups: dict = defaultdict(list)
    for c in campaigns:
        groups[c.account_id].append(c)

    municipios = []
    for account_id, camp_list in groups.items():
        total_spend = sum(c.spend for c in camp_list)
        total_clicks = sum(c.clicks for c in camp_list)
        total_impressions = sum(c.impressions for c in camp_list)
        total_leads = sum(c.leads for c in camp_list)
        avg_freq = sum(c.frequency for c in camp_list) / len(camp_list)

        cpee = round(total_spend / total_clicks, 2) if total_clicks > 0 else 0.0
        ctr = round(total_clicks / total_impressions * 100, 2) if total_impressions > 0 else 0.0
        top_campaign = max(camp_list, key=lambda c: c.spend)

        municipios.append({
            "municipio": account_id,
            "uf": uf or "N/A",
            "eleitores": 0,
            "cluster_id": cluster_id or 0,
            "cluster_nome": "Padrão",
            "cluster_cpee": cpee,
            "cluster_temperatura": "morno",
            "cpee": cpee,
            "engaj": total_clicks,
            "eq": 0,
            "spend": round(total_spend, 2),
            "clicks": total_clicks,
            "impressions": total_impressions,
            "leads": total_leads,
            "ctr": ctr,
            "cpc": cpee,
            "frequency": round(avg_freq, 2),
            "top_campanha": top_campaign.campaign_name,
            "contas_ads": [account_id],
        })

    all_cpees = [m["cpee"] for m in municipios if m["cpee"] > 0]
    if all_cpees:
        median = sorted(all_cpees)[len(all_cpees) // 2]
        for m in municipios:
            m["cluster_temperatura"] = _temperatura(m["cpee"], median)
            m["cluster_cpee"] = round(median, 2)

    return {
        "periodo": periodo,
        "data_atualizacao": datetime.now().isoformat(),
        "total_municipios": len(municipios),
        "municipios": municipios,
    }
```

- [ ] **Step 4: Registrar o router no main.py**

Abra `backend/app/main.py` e adicione:
```python
from app.api import overview, comparacoes, insights, previsoes, sync, export  # adicionar export

# E no final dos include_router:
app.include_router(export.router)
```

Também atualize o CORS para aceitar a URL da VPS (substituir `SEU_IP_VPS`):
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "https://SEU_DOMINIO_OU_IP",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

- [ ] **Step 5: Rodar todos os testes**

```bash
cd backend
pytest tests/test_export.py tests/test_auth.py tests/test_rate_limit.py -v
```

Esperado: todos `PASSED`.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/export.py backend/app/main.py backend/tests/test_export.py
git commit -m "feat: add /api/export/municipios-cpee endpoint with auth and rate limiting"
```

---

### Task 4: Nginx + Docker Compose para Produção

**Files:**
- Create: `nginx/nginx.conf`
- Create: `nginx/Dockerfile`
- Modify: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Criar a pasta e o Dockerfile do Nginx**

```bash
mkdir -p nginx
```

Crie `nginx/Dockerfile`:
```dockerfile
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

- [ ] **Step 2: Criar a config do Nginx (HTTP — antes do SSL)**

Crie `nginx/nginx.conf`:
```nginx
server {
    listen 80;
    server_name _;

    # Segurança: esconde versão do nginx
    server_tokens off;

    # Headers de segurança
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

- [ ] **Step 3: Atualizar o docker-compose.yml**

Substitua o conteúdo de `docker-compose.yml`:
```yaml
version: '3.8'

services:
  backend:
    build:
      context: backend
      dockerfile: Dockerfile
    expose:
      - "8000"
    environment:
      - DATABASE_URL=sqlite:///./cpee_dashboard.db
      - MODO_COLETA=${MODO_COLETA:-simulado}
      - META_ACCESS_TOKEN=${META_ACCESS_TOKEN}
      - META_AD_ACCOUNT_IDS=${META_AD_ACCOUNT_IDS}
      - EXPORT_API_KEY=${EXPORT_API_KEY}
    volumes:
      - ./backend:/app
    networks:
      - cpee-network
    restart: unless-stopped

  frontend:
    build:
      context: frontend
      dockerfile: Dockerfile
    expose:
      - "3000"
    environment:
      - NEXT_PUBLIC_API_URL=/api
    depends_on:
      - backend
    networks:
      - cpee-network
    restart: unless-stopped

  nginx:
    build:
      context: nginx
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on:
      - backend
      - frontend
    networks:
      - cpee-network
    restart: unless-stopped

networks:
  cpee-network:
    driver: bridge
```

- [ ] **Step 4: Criar/atualizar o .env.example**

Crie `.env.example`:
```env
# Meta Ads API
META_ACCESS_TOKEN=seu_token_meta_aqui
META_AD_ACCOUNT_IDS=act_111111111,act_222222222
MODO_COLETA=real

# Segurança — chave que o parceiro vai usar para chamar a API
# Gere com: openssl rand -hex 32
EXPORT_API_KEY=gere_uma_chave_segura_aqui

# Banco de dados
DATABASE_URL=sqlite:///./cpee_dashboard.db
```

- [ ] **Step 5: Commit**

```bash
git add nginx/ docker-compose.yml .env.example
git commit -m "feat: add nginx reverse proxy and production docker-compose"
```

- [ ] **Step 6: Push para o git**

```bash
git push origin task-6-comparacoes-tab
```

---

## FASE 2 — VPS Setup (comandos no terminal da VPS via SSH)

---

### Task 5: Setup Inicial da VPS

> Execute via SSH: `ssh root@SEU_IP_DA_VPS`

- [ ] **Step 1: Atualizar pacotes do sistema**

```bash
apt update && apt upgrade -y
```

Esperado: lista de pacotes atualizados sem erros.

- [ ] **Step 2: Instalar Docker**

```bash
curl -fsSL https://get.docker.com | sh
```

Verificar:
```bash
docker --version
```
Esperado: `Docker version 24.x.x` ou superior.

- [ ] **Step 3: Instalar Docker Compose**

```bash
apt install docker-compose -y
docker-compose --version
```

Esperado: `docker-compose version 1.29.x` ou superior.

- [ ] **Step 4: Configurar o firewall (UFW)**

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
ufw status
```

Esperado:
```
Status: active
22/tcp   ALLOW IN
80/tcp   ALLOW IN
443/tcp  ALLOW IN
```

- [ ] **Step 5: Criar usuário não-root (mais seguro que usar root)**

```bash
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy
```

Defina uma senha forte quando solicitado.

---

### Task 6: Deploy do Projeto na VPS

> Execute como usuário `deploy`: `su - deploy`

- [ ] **Step 1: Clonar o repositório**

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPO.git cpee-dashboard
cd cpee-dashboard
```

- [ ] **Step 2: Criar o arquivo .env com as variáveis reais**

```bash
cp .env.example .env
nano .env
```

Preencha:
```env
META_ACCESS_TOKEN=SEU_TOKEN_REAL_DO_META
META_AD_ACCOUNT_IDS=act_4085311614896655,act_1601727050926069,act_2360668901089815
MODO_COLETA=real
EXPORT_API_KEY=$(openssl rand -hex 32)
DATABASE_URL=sqlite:///./cpee_dashboard.db
```

Anote o valor gerado para `EXPORT_API_KEY` — este é o token que você vai entregar ao parceiro.

- [ ] **Step 3: Subir os containers**

```bash
docker-compose up -d --build
```

Esperado:
```
Creating cpee-dashboard_backend_1 ... done
Creating cpee-dashboard_frontend_1 ... done
Creating cpee-dashboard_nginx_1 ... done
```

- [ ] **Step 4: Verificar se está funcionando**

```bash
curl http://localhost/api/health
```

Esperado: `{"status":"ok"}`

```bash
docker-compose ps
```

Esperado: todos os serviços com estado `Up`.

---

### Task 7: HTTPS com Let's Encrypt (SSL gratuito)

> Requer um domínio apontado para o IP da VPS. Se não tiver domínio, pule para Task 8 e use HTTP por enquanto.

- [ ] **Step 1: Instalar Certbot**

```bash
apt install certbot -y
```

- [ ] **Step 2: Parar o Nginx temporariamente para gerar o certificado**

```bash
docker-compose stop nginx
```

- [ ] **Step 3: Gerar o certificado SSL**

```bash
certbot certonly --standalone -d SEU_DOMINIO.com.br
```

Siga as instruções na tela (email, aceitar termos).

Esperado:
```
Congratulations! Your certificate and chain have been saved at:
/etc/letsencrypt/live/SEU_DOMINIO.com.br/fullchain.pem
```

- [ ] **Step 4: Atualizar o nginx.conf para HTTPS**

Edite `nginx/nginx.conf`:
```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com.br;
    server_tokens off;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name SEU_DOMINIO.com.br;
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/SEU_DOMINIO.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/SEU_DOMINIO.com.br/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Strict-Transport-Security "max-age=31536000" always;

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

- [ ] **Step 5: Rebuild e subir o Nginx com HTTPS**

```bash
docker-compose up -d --build nginx
```

- [ ] **Step 6: Verificar HTTPS**

```bash
curl https://SEU_DOMINIO.com.br/api/health
```

Esperado: `{"status":"ok"}`

- [ ] **Step 7: Configurar renovação automática do certificado**

```bash
crontab -e
```

Adicione esta linha:
```
0 3 * * * certbot renew --quiet && docker-compose -f /home/deploy/cpee-dashboard/docker-compose.yml restart nginx
```

---

### Task 8: SSH Hardening + Fail2ban

- [ ] **Step 1: Gerar par de chaves SSH no seu PC (Mac)**

Execute **no seu Mac** (não na VPS):
```bash
ssh-keygen -t ed25519 -C "cpee-vps" -f ~/.ssh/cpee_vps
```

- [ ] **Step 2: Copiar a chave pública para a VPS**

Execute **no seu Mac**:
```bash
ssh-copy-id -i ~/.ssh/cpee_vps.pub deploy@SEU_IP_DA_VPS
```

- [ ] **Step 3: Testar login por chave antes de desabilitar senha**

Abra um **novo terminal** no Mac e teste:
```bash
ssh -i ~/.ssh/cpee_vps deploy@SEU_IP_DA_VPS
```

Esperado: acesso sem pedir senha.

- [ ] **Step 4: Desabilitar login SSH por senha**

Na VPS:
```bash
nano /etc/ssh/sshd_config
```

Localize e altere (ou adicione) estas linhas:
```
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

```bash
systemctl restart sshd
```

- [ ] **Step 5: Instalar e configurar Fail2ban**

```bash
apt install fail2ban -y
```

Crie `/etc/fail2ban/jail.local`:
```ini
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port    = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s
```

```bash
systemctl enable fail2ban
systemctl start fail2ban
fail2ban-client status sshd
```

Esperado:
```
Status for the jail: sshd
|- Filter: ...
`- Actions: ...
```

---

### Task 9: Entregar Credenciais ao Parceiro

- [ ] **Step 1: Recuperar a API Key gerada**

Na VPS:
```bash
cat /home/deploy/cpee-dashboard/.env | grep EXPORT_API_KEY
```

- [ ] **Step 2: Atualizar o documento do parceiro com a URL final**

Edite `docs/INTEGRACAO_PARCEIRO.md` e substitua a seção 10:
```markdown
## 10. URL Base

```
https://SEU_DOMINIO.com.br/api/export/municipios-cpee
```

### Exemplo de chamada completa

```bash
curl -H "Authorization: Bearer SUA_API_KEY" \
  "https://SEU_DOMINIO.com.br/api/export/municipios-cpee?periodo=30d"
```
```

- [ ] **Step 3: Testar o endpoint completo do zero**

```bash
curl -H "Authorization: Bearer SUA_API_KEY" \
  "https://SEU_DOMINIO.com.br/api/export/municipios-cpee"
```

Esperado: JSON com `municipios`, `total_municipios`, `data_atualizacao`.

- [ ] **Step 4: Commit e push do doc atualizado**

```bash
git add docs/INTEGRACAO_PARCEIRO.md
git commit -m "docs: update partner integration doc with production URL"
git push
```

---

## Checklist de Segurança Final

Antes de entregar ao parceiro, verifique:

- [ ] Porta 8000 não está acessível externamente: `curl http://SEU_IP:8000` deve dar timeout
- [ ] HTTPS funcionando: `curl https://SEU_DOMINIO.com.br/api/health` retorna 200
- [ ] API Key obrigatória: `curl https://SEU_DOMINIO.com.br/api/export/municipios-cpee` retorna 422
- [ ] Rate limiting: 61 chamadas seguidas retornam 429
- [ ] Fail2ban ativo: `fail2ban-client status sshd` mostra jail ativo
- [ ] Login SSH por senha desabilitado: `ssh -o PasswordAuthentication=no root@SEU_IP` deve recusar
