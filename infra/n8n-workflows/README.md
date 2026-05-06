# n8n Workflow Definitions

Directorul conține definițiile JSON ale workflow-urilor n8n folosite de platformă.
Se montează read-only în containerul n8n via docker-compose.

## Workflow-uri definite

| ID | Nume | Trigger | Endpoint apelat |
|----|------|---------|-----------------|
| FLUX-023 | KB Propagation Nightly | Cron 02:00 | POST /api/v1/kb/propagate |
| FLUX-024 | Task Cascade Runner | Cron 15min | POST /api/v1/agents/cascade-tasks |
| FLUX-040 | Daily Backup | Cron 03:00 | POST /api/v1/admin/backup |
| FLUX-041 | Healthcheck Bridge | Cron 5min | GET /api/v1/health/heartbeat |
| FLUX-043 | n8n Execution Monitor | Cron 10min | GET /api/v1/monitors/n8n-executions |
| FLUX-044 | Service Recovery | On webhook | POST /api/v1/disfunctions/remediate |
| FLUX-045 | Role Activity Monitor | Cron 1h | GET /api/v1/agents/metrics |
| FLUX-046 | Daily Summary Notify | Cron 18:00 | POST /api/v1/disfunctions/daily-summary |
| FLUX-047 | Signal Reactive Scan | Cron 30min | POST /api/v1/signals/reactive-scan |
| FLUX-057 | Task Executor | Cron 30min | POST /api/v1/agents/cycle |

## Import

```bash
# Import automat la start container (configurat în docker-compose)
# Sau manual:
docker exec jobgrade_n8n n8n import:workflow --input=/home/node/.n8n/workflows-import/
```

## Generare

Workflow-urile sunt simple HTTP triggers → fiecare face un singur POST/GET cu header `x-internal-key`.
