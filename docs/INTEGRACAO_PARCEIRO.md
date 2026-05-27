# Documentação de Integração — CPEE por Município

> Documento técnico para o desenvolvedor do software de mapeamento.  
> Versão: 1.0 | Data: 2026-05-15

---

## 1. Visão Geral

O sistema CPEE Dashboard coleta dados das campanhas de Meta Ads (Facebook/Instagram) e os agrega por município. Este endpoint permite que seu software de mapeamento exiba, para cada município, o desempenho das campanhas digitais e a qual cluster estratégico aquele município pertence.

---

## 2. Endpoint

```
GET /api/export/municipios-cpee
```

### Parâmetros de query (opcionais)

| Parâmetro    | Tipo    | Padrão | Descrição                                         |
|--------------|---------|--------|---------------------------------------------------|
| `periodo`    | string  | `30d`  | Período dos dados: `7d`, `14d`, `30d`, `60d`, `90d` |
| `cluster_id` | integer | —      | Filtra por cluster específico                     |
| `uf`         | string  | —      | Filtra por estado (ex: `SP`, `MG`)                |

### Exemplos de chamada

```bash
# Todos os municípios, últimos 30 dias
GET /api/export/municipios-cpee

# Apenas cluster 3, últimos 7 dias
GET /api/export/municipios-cpee?cluster_id=3&periodo=7d

# Apenas São Paulo, últimos 14 dias
GET /api/export/municipios-cpee?uf=SP&periodo=14d
```

---

## 3. Estrutura do Payload (Response)

```json
{
  "periodo": "30d",
  "data_atualizacao": "2026-05-15T14:30:00",
  "total_municipios": 142,
  "municipios": [
    {
      "municipio": "São Paulo",
      "uf": "SP",
      "eleitores": 9200000,

      "cluster_id": 3,
      "cluster_nome": "Capital",
      "cluster_cpee": 4.87,
      "cluster_temperatura": "quente",

      "cpee": 5.23,
      "engaj": 6.9,
      "eq": 2039,

      "spend": 12500.00,
      "clicks": 2390,
      "impressions": 185000,
      "leads": 87,
      "ctr": 1.29,
      "cpc": 5.23,
      "frequency": 2.4,

      "top_campanha": "SP_CAPITAL_REELS_EDUCACAO",
      "contas_ads": ["act_4085311614896655", "act_1601727050926069"]
    }
  ]
}
```

---

## 4. Descrição de Cada Campo

### 4.1 Identificação do Município

| Campo       | Tipo    | Descrição                                    |
|-------------|---------|----------------------------------------------|
| `municipio` | string  | Nome do município                            |
| `uf`        | string  | Sigla do estado (2 letras)                   |
| `eleitores` | integer | Total de eleitores registrados no município  |

### 4.2 Cluster Estratégico

| Campo                | Tipo    | Descrição                                                  |
|----------------------|---------|------------------------------------------------------------|
| `cluster_id`         | integer | ID do cluster ao qual o município pertence                 |
| `cluster_nome`       | string  | Nome do cluster (ex: "Capital", "Interior Norte")          |
| `cluster_cpee`       | float   | CPEE médio agregado de todos os municípios do cluster      |
| `cluster_temperatura`| string  | Classificação do cluster: `"quente"`, `"morno"`, `"frio"` |

### 4.3 Métricas de Performance

| Campo   | Tipo  | Fórmula / Origem                          | Descrição                                           |
|---------|-------|-------------------------------------------|-----------------------------------------------------|
| `cpee`  | float | `spend / clicks`                          | **Custo Por Engajamento Eleitoral** — métrica principal. Quanto custou cada clique (engajamento) no município, somando todas as contas de anúncio |
| `engaj` | float | `clicks` do Meta Ads                      | Total de engajamentos (cliques) no município        |
| `eq`    | float | `clicks / eleitores * 1000`               | **Qualidade Eleitoral** — índice de penetração: quantos engajamentos por 1.000 eleitores |

### 4.4 Dados Brutos do Meta Ads

Estes são os campos exatos que vêm da API do Meta, agregados por município (soma de todas as contas de anúncio):

| Campo         | Tipo    | Campo na API do Meta              | Descrição                                    |
|---------------|---------|-----------------------------------|----------------------------------------------|
| `spend`       | float   | `spend`                           | Gasto total em R$                            |
| `clicks`      | integer | `clicks`                          | Total de cliques nos anúncios                |
| `impressions` | integer | `impressions`                     | Total de impressões                          |
| `leads`       | integer | `actions[action_type="lead"]`     | Leads gerados (formulário preenchido)        |
| `ctr`         | float   | `clicks / impressions * 100`      | Click-Through Rate em %                      |
| `cpc`         | float   | `spend / clicks`                  | Custo por clique (igual ao CPEE neste contexto) |
| `frequency`   | float   | `frequency`                       | Média de vezes que cada pessoa viu o anúncio |

### 4.5 Informações Auxiliares

| Campo         | Tipo            | Descrição                                               |
|---------------|-----------------|---------------------------------------------------------|
| `top_campanha`| string          | Nome da campanha com maior gasto no município           |
| `contas_ads`  | array of strings| IDs das contas de anúncio do Meta que tiveram impressão neste município |

---

## 5. Como o CPEE é Calculado

```
CPEE = gasto_total / cliques_totais
```

**Passo a passo por município:**

1. Busca todas as campanhas ativas no Meta Ads (todas as contas `act_XXXXXXX`)
2. Filtra as campanhas que têm esse município como público-alvo
3. Soma o `spend` de todas essas campanhas → `gasto_total`
4. Soma os `clicks` de todas essas campanhas → `cliques_totais`
5. Calcula: `CPEE = gasto_total / cliques_totais`

**Exemplo:**
- Conta 1 → Campanha A no município X: R$ 500 gastos, 120 cliques
- Conta 2 → Campanha B no município X: R$ 300 gastos, 80 cliques
- **CPEE do município X = (500 + 300) / (120 + 80) = R$ 4,00**

---

## 6. Campos da API do Meta Ads Utilizados

A chamada à API do Meta é feita assim:

```
GET /{account_id}/insights
  ?fields=campaign_id,campaign_name,impressions,clicks,spend,frequency,actions
  &level=campaign
  &date_start={data_inicio}
  &date_stop={data_fim}
```

**Resposta bruta do Meta (exemplo de um item):**
```json
{
  "campaign_id": "120192774832610001",
  "campaign_name": "SP_CAPITAL_REELS_EDUCACAO",
  "spend": "2500.50",
  "impressions": 45000,
  "clicks": 1200,
  "frequency": "2.5",
  "actions": [
    { "action_type": "lead", "value": "45" }
  ]
}
```

---

## 7. Classificação de Temperatura do Cluster

| Temperatura | Critério                          | Cor sugerida |
|-------------|-----------------------------------|--------------|
| `quente`    | CPEE abaixo da média geral (bom)  | 🔴 Vermelho  |
| `morno`     | CPEE próximo da média geral       | 🟡 Amarelo   |
| `frio`      | CPEE acima da média geral (ruim)  | 🔵 Azul      |

---

## 8. Autenticação

O endpoint requer um header de autorização:

```
Authorization: Bearer {API_KEY}
```

A chave de API será fornecida separadamente.

---

## 9. Frequência de Atualização

Os dados são atualizados a cada **30 minutos** via coleta automática da API do Meta Ads. O campo `data_atualizacao` no response indica o momento da última coleta.

---

## 10. Hospedagem / URL Base

O backend estará hospedado em:

```
https://[URL-A-DEFINIR]/api/export/municipios-cpee
```

> ⚠️ A URL final será informada após o deploy. Durante desenvolvimento, pode ser fornecido acesso temporário via túnel ou ambiente de staging.

---

## 11. Contato

Para dúvidas sobre os dados ou integração, entrar em contato com a equipe do CPEE Dashboard.
