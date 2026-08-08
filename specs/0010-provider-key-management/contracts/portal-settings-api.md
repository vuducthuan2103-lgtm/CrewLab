# Portal Settings API Contract

All endpoints require a Portal user bearer token with a valid `client_id` claim.

## Read model settings

`GET /api/v1/portal/settings`

Relevant response fields:

```json
{
  "success": true,
  "data": {
    "agent_configs": [
      {
        "agent_code": "D01",
        "model": "gpt-5-mini",
        "tier": "standard",
        "budget_usd_month": 10
      }
    ],
    "eligible_models": [
      {
        "id": "gpt-5-mini",
        "label": "GPT-5 mini",
        "tier": "standard",
        "capabilities": ["text", "reasoning"],
        "eligible_agents": ["A01", "B02", "B03", "D01", "E01"]
      }
    ]
  }
}
```

The response does not expose credential fields. Provider identity may be omitted from the Portal response/UI; eligibility is already server-filtered.

## Update one agent

`PATCH /api/v1/portal/settings/agent-config`

Request:

```json
{
  "agent_code": "D01",
  "model": "gpt-5-mini",
  "tier": "standard",
  "budget_usd_month": 10,
  "idempotency_key": "uuid"
}
```

The request intentionally has no `provider` field. The backend derives the provider from the approved catalog and rejects:

- unknown or retired catalog model;
- model incompatible with the agent;
- tier mismatch;
- provider not enabled+valid for the authenticated client.

On success, the new configuration applies to the next LLM task for that client only.
