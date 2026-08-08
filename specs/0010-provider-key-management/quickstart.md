# Quickstart: Spec 0010 Local Verification

## Prerequisites

- Backend, Portal, Internal App, Redis, Celery worker, and Celery Beat are running.
- Supabase Auth contains an Agency Admin whose JWT has `app_metadata.role = agency_admin`.
- Portal test user has `app_metadata.client_id` set to the target client UUID.
- Backend has a generated `CREWLAB_CREDENTIAL_ENCRYPTION_KEY`.
- Migration 0010 has been reviewed and explicitly approved before it is applied.

## Admin flow

1. Sign in to Internal App at `http://localhost:3001/login`.
2. Open onboarding, create/select a client, and keep it inactive.
3. Select one provider, enter its real API key, save, and run **Kiểm tra kết nối**.
4. Enable the provider only after it shows **Hợp lệ**.
5. Optionally repeat for a second provider; verify a third is blocked.
6. Activate the client.
7. Refresh the page and confirm only a masked key hint is visible.

## Portal flow

1. Sign in at `http://localhost:3000/login` with the client test user.
2. Open **Cài đặt -> Model & Ngân sách**.
3. Confirm there is no provider or API-key control.
4. Confirm model options come only from the provider(s) enabled by the admin.
5. Change a model/tier for one MVP agent and save.

## Real-agent check

1. Create a brief or start the next available workflow action.
2. Observe Celery worker output for task success without any plaintext key.
3. Check Portal task logs: `model_used` should equal the chosen model.
4. Replace the key in Internal App, test it, and run a new task; the new call must use the replacement.
5. Disable an in-use provider without confirmation and verify the backend lists affected agents and makes no change.
6. Confirm disable, then verify affected agents cannot start new LLM work until assigned an eligible replacement.

## Safety checks

- Search application logs for common key prefixes and verify none appear.
- Inspect Internal App network responses: only `key_hint`/masked display may appear.
- Sign in as a Portal user and call an Internal endpoint; expect 403.
- Use two clients and verify model/key changes to one do not alter the other.

