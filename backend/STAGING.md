# Staging setup

The staging portal uses Supabase Auth and the PostgreSQL database. There is no demo login or local data fallback.

1. Configure `DATABASE_URL`, `SUPABASE_JWT_SECRET`, and `CORS_ORIGINS` from the staging environment.
2. Apply the schema:

```powershell
python -m alembic upgrade head
```

3. Seed Bardinh's client, brand settings, six agent configs, workflow cycle, content pillars, content items, asset request, and task logs:

```powershell
python -m scripts.seed_bardinh
```

The seed uses fixed UUIDs and is safe to run repeatedly. It does not delete or reset existing records.

4. Set the Supabase Auth user's `app_metadata.client_id` to:

```text
11111111-1111-1111-1111-111111111111
```

The API reads `sub` as `user_id` and `app_metadata.client_id` as `client_id` from the verified JWT.
