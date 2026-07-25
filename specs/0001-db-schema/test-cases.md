# Test Cases — Database Schema MVP (Spec 0001)

## 1. Mục đích và phạm vi

Bộ test này kiểm tra lớp PostgreSQL/Supabase cho CrewLab Phase 1 theo thứ tự ưu tiên:

1. `specs/0001-db-schema/spec.md` — nguồn chi tiết nhất của task.
2. `docs/prd/CrewLab-MVP-Scope-v3.4.md` — business rule MVP, FSM, asset expiry, memory và observability.
3. `docs/prd/PRD-CrewLab.md` — acceptance criteria C1 còn phù hợp với MVP.

Phạm vi MVP gồm: `clients`, `brand_settings`, `brand_settings_history`, `workflow_cycles`, `content_pillars`, `content_items`, `brand_assets`, `asset_requests`, `hitl_reviews`, `agent_memory`, `task_logs`, `audit_log`; migration, FK, index, timestamp, RLS và append-only log.

Không đưa ChromaDB, Hindsight, Docling/Chonkie, Meta Publisher, analytics agents, campaign branching hoặc Telegram vào test pass/fail của Phase 1. `agent_memory` được kiểm tra như bảng PostgreSQL đơn giản theo MVP.

### Quy ước

- **P0**: blocker — không được release.
- **P1**: major — phải sửa trước pilot hoặc có quyết định chấp thuận rủi ro.
- **P2**: normal — nên sửa trước hardening.
- **P3**: low — cải thiện sau.
- Trạng thái ban đầu của toàn bộ case là **Not Run**.
- Mỗi test phải chạy trên database test riêng, seed tối thiểu hai client (`client_A`, `client_B`) và hai user tương ứng.
- Với RLS, dùng JWT/test role mô phỏng đúng claim `role`, `user_metadata.role`, `client_id`; không dùng service role để kết luận isolation.

## 2. Test data chuẩn

| Mã | Dữ liệu |
|---|---|
| `C-A`, `C-B` | Hai client khác nhau; `C-A` active, `C-B` active; có tiếng Việt trong `name`, `brand_name`. |
| `U-AGENCY` | Agency Admin, không gắn client hoặc claim role agency admin. |
| `U-A`, `U-B` | Client user của `C-A`, `C-B`. |
| `CY-A` | Cycle của `C-A`, phase lần lượt `strategy`, `content_production`, `done`. |
| `P-A` | Pillar của `CY-A`, có `weight` và `updated_reason`. |
| `I-A` | Content item của `C-A`, dùng để chạy FSM, asset request, review và memory. |
| `ASSET-A` | Asset thật của `C-A`, tags JSONB, có/không gắn request. |
| `REQ-A` | Asset request của `I-A`, thử các status `pending`, `fulfilled`, `expired`, có `expires_at` quá khứ/tương lai. |
| `UUID-invalid` | Chuỗi không phải UUID; dùng cho `id`, `reviewer_id`, `user_id`, FK. |

## 3. Migration và cấu trúc schema

| ID | Pri | Loại | Điều kiện / bước chính | Kết quả mong đợi | Traceability |
|---|---:|---|---|---|---|
| DB-MIG-001 | P0 | Migration | Chạy migration trên database rỗng. | Tạo đủ 12 bảng trong phạm vi MVP, không lỗi; transaction hoàn tất nguyên tử. | Spec §Tech/Schema; PRD C1 FR |
| DB-MIG-002 | P0 | Idempotency | Chạy cùng migration lần 2 trên database đã có dữ liệu seed. | Không lỗi, không tạo bảng/index/policy/trigger trùng, dữ liệu và row count không đổi. | PRD C1 AC: migration 2 lần |
| DB-MIG-003 | P0 | Migration | Chạy migration trên database có dữ liệu hợp lệ đại diện cho mọi quan hệ. | Dữ liệu cũ không bị mất hoặc biến đổi ngoài migration đã định nghĩa. | Migration safety |
| DB-MIG-004 | P1 | Migration | Chạy upgrade rồi downgrade trên database test; seed dữ liệu sau upgrade. | Downgrade có hành vi được tài liệu hóa; không downgrade production bằng test này. Nếu chưa hỗ trợ downgrade, phải ghi rõ quyết định. | Migration safety |
| DB-MIG-005 | P0 | Schema inventory | Đọc `information_schema`, `pg_constraint`, `pg_indexes`, `pg_policies`. | Mọi bảng/column/FK/index/policy bắt buộc trong spec đều tồn tại đúng tên và kiểu. Không có bảng ngoài scope MVP do migration tự tạo. | Spec §Schema |
| DB-MIG-006 | P0 | Data type | Insert UUID hợp lệ và UUID lỗi vào tất cả PK, `reviewer_id`, `user_id`. | UUID hợp lệ được lưu đúng kiểu; UUID lỗi bị từ chối ở DB, không silently cast thành text. | Spec §Boundaries |
| DB-MIG-007 | P1 | Data type | Kiểm tra timestamp bằng session timezone khác nhau và insert giá trị có timezone. | `created_at`/`updated_at` là timezone-aware (`timestamptz` hoặc tương đương), không mất offset. | Spec §Schema; DB skill |
| DB-MIG-008 | P1 | Default/NOT NULL | Insert record với các trường bắt buộc bị bỏ qua; insert record không truyền các field có default. | Field bắt buộc bị từ chối; default `clients.is_active=true`, timezone `Asia/Ho_Chi_Minh`, `eval_retry_count=0`, asset status `approved`, request status/priority đúng MVP. | Spec §Schema |
| DB-MIG-009 | P1 | Constraint | Insert giá trị NULL vào mọi field nullable và non-nullable theo từng bảng. | Nullable được chấp nhận; non-nullable bị từ chối; không có default che khuất lỗi nghiệp vụ. | Spec §Schema |
| DB-MIG-010 | P1 | Index | Từ `pg_indexes`, kiểm tra index cho mọi PK, FK và query hot path theo `client_id`, `status`, `expires_at`, `agent_code`, `target_id`. | PK/unique/index cần thiết tồn tại; FK không bị bỏ index; query lọc tenant không phải full scan trên dataset chuẩn. | PRD C1 NFR; DB skill |
| DB-MIG-011 | P1 | JSONB | Insert object/array JSONB hợp lệ vào `platforms`, brand fields, `image_brief`, `tags`, `failed_criteria`, `details`; insert malformed JSON qua SQL. | JSON hợp lệ được lưu và đọc nguyên vẹn; malformed JSON bị từ chối. | Spec §Schema |
| DB-MIG-012 | P0 | FK | Insert child row tham chiếu parent không tồn tại. | DB từ chối bằng FK violation cho mọi quan hệ bắt buộc. | Spec §Schema; PRD C1 NFR |
| DB-MIG-013 | P1 | Tenant consistency | Tạo cycle/pillar/item thuộc các client khác nhau rồi thử nối bằng FK hợp lệ nhưng `client_id` lệch. | DB/service không cho tạo quan hệ cross-tenant; nếu DB không enforce được bằng FK hiện tại, case phải mở defect P1 và nêu cơ chế sửa. | Spec multi-tenant |
| DB-MIG-014 | P1 | Cascade policy | Xóa client có toàn bộ child data trong database test. | Hành vi cascade/restrict/set-null đúng quyết định đã ghi; không xóa nhầm dữ liệu của client khác. | Spec relationships; DB design |
| DB-MIG-015 | P2 | Transaction | Trong transaction tạo client + cycle + item rồi cố insert child lỗi. | Rollback không để lại partial rows; retry transaction tạo dữ liệu nhất quán. | DB integrity |

## 4. Client, brand settings và version history

| ID | Pri | Loại | Điều kiện / bước chính | Kết quả mong đợi | Traceability |
|---|---:|---|---|---|---|
| DB-BR-001 | P0 | CRUD/constraint | Tạo client với `name`, `brand_name`; đọc lại bằng UUID. | Row được tạo, UUID duy nhất, field Unicode tiếng Việt không lỗi/mất dấu. | Spec clients |
| DB-BR-002 | P1 | Default | Tạo client không truyền `is_active`/`timezone`; tạo client inactive. | Default đúng; inactive vẫn lưu được và không tự bị xóa. | Spec clients; MVP precheck |
| DB-BR-003 | P0 | FK | Tạo brand setting của `C-A`; thử dùng `client_id` không tồn tại. | Row hợp lệ được lưu; row mồ côi bị từ chối. | Spec brand_settings |
| DB-BR-004 | P1 | JSONB contract | Lưu `avoid_phrases`, `brand_colors`, `personality_keywords`, `sample_captions` dạng array/object; đọc lại bằng key. | Dữ liệu brand voice đọc lại đúng cấu trúc; không bị ép sang text. | Spec brand_settings; MVP B2 |
| DB-BR-005 | P0 | Versioning | Tạo setting version 1, cập nhật brand voice theo quy trình version mới, ghi history. | Snapshot cũ trong `brand_settings_history` không đổi; snapshot mới có timestamp và nội dung đúng. | Spec history; PRD C1 versioned |
| DB-BR-006 | P0 | Append-only | Thử `UPDATE` và `DELETE` row lịch sử/record brand setting cũ bằng Agency Admin và Client User. | Record cũ không bị sửa/xóa nếu append-only là yêu cầu; có lỗi rõ ràng hoặc policy/trigger từ chối. | PRD C1 FR |
| DB-BR-007 | P0 | Uniqueness | Tạo hai brand setting có `is_current=true` cho cùng một client; tạo một current cho client khác. | Cùng client chỉ có đúng 1 current; client khác được phép có current riêng. Nếu schema chưa có `is_current`, mở defect P0 vì đây là AC của PRD C1. | PRD C1 AC |
| DB-BR-008 | P1 | History integrity | Tạo history với `client_id=C-A` nhưng `brand_setting_id` trỏ setting của `C-B`. | Bị từ chối; không thể dùng FK rời rạc để tạo history cross-tenant. | Multi-tenant integrity |
| DB-BR-009 | P1 | Timestamp | Update brand setting hiện hành; insert history; đọc `created_at`, `updated_at`. | `updated_at` đổi khi update; `created_at` giữ nguyên; history có created timestamp riêng. | Spec Automation |
| DB-BR-010 | P1 | Scope guard | Kiểm tra các field `service_tier`, `users.role`, `agent_configs`, `llm_usage`, `internal_llm_usage` từ PRD tổng. | Không tự đưa vào MVP pass/fail nếu chưa được thêm vào task spec; ghi thành scope gap/decision cần xác nhận. | Spec precedence; PRD C1 conflict |

## 5. Cycle, pillar và content item FSM

### 5.1. Cycle và pillar

| ID | Pri | Loại | Điều kiện / bước chính | Kết quả mong đợi | Traceability |
|---|---:|---|---|---|---|
| DB-WF-001 | P0 | Enum/check | Insert `workflow_cycles.phase` lần lượt `strategy`, `content_production`, `done`; thử giá trị khác. | Ba giá trị hợp lệ được nhận; giá trị ngoài enum bị từ chối ở DB. | Spec cycle; MVP §2 |
| DB-WF-002 | P0 | Enum/check | Insert cycle status `active`, `completed`; thử status không hợp lệ. | Chỉ nhận giá trị đã spec. | Spec cycle |
| DB-WF-003 | P1 | Date rule | Thử `end_date < start_date`, bằng nhau, lớn hơn. | Bằng/lớn hơn xử lý đúng quyết định; ngày ngược bị từ chối nếu weekly cycle yêu cầu. Nếu chưa chốt, ghi open rule thay vì tự đoán. | Spec cycle |
| DB-WF-004 | P0 | Concurrent business rule | Hai transaction cùng tạo cycle cho một client khi cycle hiện tại chưa qua `content_production`. | Chỉ một cycle hợp lệ được tạo; transaction còn lại bị từ chối hoặc retry an toàn. | MVP A01 rule 3 |
| DB-WF-005 | P1 | FK | Tạo pillar thuộc cycle của client khác; xóa cycle có pillar. | Cross-tenant bị từ chối; hành vi xóa child đúng policy đã chốt. | Spec pillar |
| DB-WF-006 | P1 | Update timestamp | Sửa pillar `weight`/`description` và ghi `updated_reason`. | `updated_at` đổi; lý do được lưu nguyên vẹn; dữ liệu cycle/version cũ không bị overwrite sai. | Spec pillar |

### 5.2. FSM content item

| ID | Pri | Loại | Điều kiện / bước chính | Kết quả mong đợi | Traceability |
|---|---:|---|---|---|---|
| DB-FSM-001 | P0 | State domain | Insert `content_items.status` với toàn bộ state hợp lệ: `planned`, `ready_for_generation`, `caption_generating`, `visual_matching`, `waiting_asset`, `asset_blocked`, `visual_generating`, `evaluating`, `eval_failed`, `pending_content_approval`, `approved_ready_to_post`, `posted`, `rejected`, `archived`. | Tất cả state MVP được nhận; state ngoài danh sách bị từ chối. | Spec content item; MVP §3 |
| DB-FSM-002 | P0 | Valid transition | Chạy happy path từ `planned` tới `posted`, gồm nhánh asset request và E01 pass. | Mỗi transition hợp lệ thành công; không mất caption/brief/image/score khi chuyển state. | MVP §3 |
| DB-FSM-003 | P0 | Invalid transition | Thử nhảy trực tiếp `planned→posted`, `planned→approved_ready_to_post`, `waiting_asset→posted`, `eval_failed→posted`. | DB/service từ chối rõ ràng; không đổi state và không để transaction dở dang. | PRD C1 AC; MVP FSM |
| DB-FSM-004 | P0 | Retry loop | Từ `evaluating` chuyển `eval_failed`, sau đó route về `caption_generating` hoặc `visual_matching` theo failed criteria. | Chỉ route đúng nhánh; state log/audit nếu có được ghi cùng transaction. | MVP A01 retry-routing |
| DB-FSM-005 | P0 | Hard fail | E01 trả hard fail hoặc retry count chạm giới hạn. | Item chuyển `rejected`, không tự chuyển approval; lưu failed criteria/fix instruction. | MVP §5; A01 rule 4 |
| DB-FSM-006 | P0 | Asset expiry | Item `waiting_asset` có request quá hạn; chạy job expiry. | Item chuyển `asset_blocked`; request thành `expired`; có event/notification cho Agency Admin; không tự dùng AI fallback và không tự reject. | MVP §2/§3; AC-WF-21 |
| DB-FSM-007 | P1 | Asset recovery | Agency Admin resolve item `asset_blocked` và đưa lại `visual_matching`; sau đó chạy D02. | Transition được phép theo flow đã định; không mất lịch sử blocked/expired. | MVP §3 |
| DB-FSM-008 | P0 | Retry counter | E01 fail quality một lần, rồi Celery retry do timeout/network/worker crash. | `eval_retry_count` chỉ tăng ở quality fail; `wake_reason='retry'` không tăng counter. | MVP A01 rule 5 |
| DB-FSM-009 | P1 | Counter boundary | Thử `eval_retry_count=-1`, null, tăng quá giới hạn bằng SQL trực tiếp/service. | Giá trị âm/null bị từ chối; giới hạn tối đa 3 được enforce hoặc có defect P1 nếu chỉ validate ở app. | MVP retry max 3 |
| DB-FSM-010 | P1 | Score range | Lưu caption score ngoài `0..10`, visual score ngoài `0..5`, score NULL trước E01. | NULL trước Evaluator được chấp nhận; ngoài range bị từ chối nếu DB contract áp dụng; score trong range giữ đúng precision. | MVP §5 |
| DB-FSM-011 | P1 | Approval gate | Item `pending_content_approval` được approve; thử approve item chưa qua E01. | Chỉ item đã qua Evaluator mới vào `approved_ready_to_post`; portal không cần expose score trong data view/client query. | MVP Gates |
| DB-FSM-012 | P1 | Manual posting | Item `approved_ready_to_post` được mark posted; thử mark item rejected/archived. | Chỉ flow hợp lệ mới thành `posted`; `posted_at` được ghi một lần và không ghi đè tùy tiện. | MVP manual posting |
| DB-FSM-013 | P1 | State ownership/race | Hai worker đồng thời update cùng item từ cùng state sang hai state khác nhau. | Không có lost update; chỉ một transition hợp lệ commit, transition còn lại fail/retry; A01 không ghi đè state agent. | MVP A01 rule 6 |
| DB-FSM-014 | P1 | Payload consistency | Item `posted` nhưng `posted_at` NULL; item `asset_blocked` không có request expired; item `pending_content_approval` thiếu score. | DB/service từ chối trạng thái không nhất quán hoặc tạo defect rõ ràng để bổ sung check/trigger. | MVP FSM integrity |
| DB-FSM-015 | P2 | Deferred states | Thử các state chỉ có trong PRD tổng như `draft`, `generated`, `scheduled`, `published`. | Không đưa vào MVP enum/FSM nếu chưa được scope quyết định; ghi nhận là deferred, không silently trộn hai FSM. | Spec precedence; PRD C1 conflict |

## 6. Asset library và asset request

| ID | Pri | Loại | Điều kiện / bước chính | Kết quả mong đợi | Traceability |
|---|---:|---|---|---|---|
| DB-AS-001 | P0 | CRUD/constraint | Tạo asset có URL, file name, tags; thử thiếu URL. | Asset hợp lệ được lưu; URL bắt buộc bị thiếu thì insert fail. | Spec brand_assets |
| DB-AS-002 | P1 | Tag filter | Tạo nhiều asset cùng client, khác tag; query theo tag đơn giản. | Chỉ asset của client và tag phù hợp trả về; không cần semantic/vector search. | MVP C7 |
| DB-AS-003 | P1 | Asset request enum | Insert request với `pending`, `fulfilled`, `expired`, priority `low/normal/high/urgent`; thử giá trị khác. | Chỉ domain MVP được nhận. | Spec asset_requests |
| DB-AS-004 | P1 | Expiry boundary | Request có `expires_at` trong quá khứ, đúng thời điểm hiện tại, tương lai; chạy expiry job. | Rule boundary được thống nhất và chạy deterministic; request fulfilled không bị job đổi thành expired. | MVP asset expiry |
| DB-AS-005 | P0 | FK/tenant | Asset request trỏ item không tồn tại hoặc item của client khác. | Bị từ chối; không có request mồ côi/cross-tenant. | Spec relationships |
| DB-AS-006 | P1 | Asset link lifecycle | Xóa request đã có asset; thử xóa item đang có request. | `asset_request_id` của asset xử lý `SET NULL` hoặc policy đã chốt; không làm mất asset library ngoài ý muốn; request/item delete policy nhất quán. | Spec FK intent |
| DB-AS-007 | P1 | Timestamp | Update status/note/priority của request và asset. | `updated_at` đổi tự động; `created_at` không đổi. | Spec Automation |

## 7. HITL review và append-only history

| ID | Pri | Loại | Điều kiện / bước chính | Kết quả mong đợi | Traceability |
|---|---:|---|---|---|---|
| DB-HITL-001 | P0 | Enum/check | Insert gate `pillar`, `plan`, `content`; action `approved`, `rejected`, `edited`; thử giá trị ngoài domain. | Giá trị hợp lệ được nhận; ngoài domain bị từ chối. | Spec hitl_reviews |
| DB-HITL-002 | P1 | Target integrity | Review target đúng loại gate; target UUID không tồn tại; target thuộc client khác. | Target invalid/cross-tenant bị từ chối ở DB/service; không chỉ dựa vào UI. | Spec target_id; multi-tenant |
| DB-HITL-003 | P1 | Conditional fields | `rejected` không có reason, `edited` không có edited caption, `approved` có reason không cần thiết. | Các điều kiện bắt buộc/không hợp lệ được enforce theo decision taxonomy; nếu chưa chốt, ghi open business rule. | Spec review fields; MVP P01 |
| DB-HITL-004 | P0 | Append-only | UPDATE/DELETE review bằng Agency Admin, Client User và DB role thông thường. | Mọi role đều bị từ chối sửa/xóa; insert review mới vẫn được phép theo RLS. | PRD C1 FR |
| DB-HITL-005 | P1 | Audit trail | Tạo review approved/rejected/edited và kiểm tra mọi event có `created_at`, reviewer UUID, feedback/edited caption đúng. | Lịch sử không bị overwrite; payload truy vết đầy đủ. | Spec HITL |

## 8. Agent memory MVP và observability

| ID | Pri | Loại | Điều kiện / bước chính | Kết quả mong đợi | Traceability |
|---|---:|---|---|---|---|
| DB-MEM-001 | P0 | Schema | Insert memory với `client_id`, `agent_code`, `task_type`, input/output summary; thử thiếu field bắt buộc. | Record hợp lệ được lưu; thiếu field bị từ chối; không có dependency Hindsight/memory bank. | MVP §1c; Spec agent_memory |
| DB-MEM-002 | P0 | Tenant isolation | Tạo memory của `C-A` và `C-B`; query top 5 theo client/agent/task type. | Query chỉ trả đúng client + agent + task type; sort recency deterministic, tối đa 5 bản ghi. | MVP §1b/§2 C3 |
| DB-MEM-003 | P1 | Feedback upsert | Tạo memory cho content item; reject/edit cùng item; upsert human feedback. | Có một record logic mới nhất theo quy ước P01; feedback reject/edit đọc được ở lần recall sau; không duplicate ngoài quy ước. | MVP §1c; AC-MEM-03 adapted to MVP |
| DB-MEM-004 | P1 | Fallback recall | Database không có memory hoặc memory query lỗi transient. | Context packet nhận `episodic=[]`/fallback đã định; task không crash và không làm mất dữ liệu đã có. | MVP §1b |
| DB-MEM-005 | P1 | FK review | Gán `content_item_id` vào memory của item không tồn tại hoặc item khác client. | Bị từ chối nếu field này là quan hệ; nếu cố ý không enforce FK, phải ghi rõ rủi ro P1. | Spec memory comment |
| DB-MEM-006 | P1 | Retention | Query memory theo `created_at` trong 30 ngày và theo feedback không NULL. | Đúng mitigation MVP: 5 record gần nhất + feedback 30 ngày; không đọc ChromaDB/Hindsight. | MVP §1b |
| DB-OBS-001 | P0 | Observability contract | Mỗi agent/A01 tạo task log với đủ `client_id`, `agent_code`, `task_type`, model, tokens, latency, status, score, wake reason. | Một task hoàn tất tương ứng một log; field bắt buộc không NULL theo contract. | MVP §1d |
| DB-OBS-002 | P0 | Wake reason domain | Insert `scheduled`, `task_assigned`, `manual`, `retry`; thử giá trị lạ. | Bốn wake reason MVP được nhận; giá trị ngoài domain bị từ chối hoặc ghi defect P1 nếu chỉ app validate. | MVP A01 |
| DB-OBS-003 | P1 | Numeric sanity | Thử tokens/latency âm, eval score ngoài range, null score cho task chưa evaluate. | Giá trị âm/out-of-range bị từ chối; null score được chấp nhận đúng thời điểm. | Observability contract |
| DB-OBS-004 | P2 | Log immutability | UPDATE/DELETE task log sau khi task hoàn tất. | Không làm mất bằng chứng vận hành; nếu append-only chưa phải requirement, ghi quyết định retention rõ ràng. | MVP §1d |
| DB-OBS-005 | P1 | Query support | Query logs theo `client_id`, `agent_code`, `content_item_id`/correlation key. | Internal App có thể lọc đúng; nếu cần `content_item_id` nhưng table chưa có, mở gap P1 trước khi build UI. | MVP Tầng 4 |

## 9. Audit log và RLS multi-tenant

| ID | Pri | Loại | Điều kiện / bước chính | Kết quả mong đợi | Traceability |
|---|---:|---|---|---|---|
| DB-RLS-001 | P0 | RLS inventory | Kiểm tra `relrowsecurity` và policy cho mọi bảng có `client_id`. | RLS bật trên tất cả bảng tenant; có policy SELECT/INSERT/UPDATE/DELETE phù hợp, không bỏ sót bảng log/history. | Spec RLS MUST |
| DB-RLS-002 | P0 | Client read isolation | JWT `U-A` SELECT tất cả bảng. | Chỉ thấy row `client_id=C-A`; không thấy count, join, child row hoặc history của `C-B`. | Spec RLS |
| DB-RLS-003 | P0 | Client write isolation | `U-A` INSERT/UPDATE row với `client_id=C-B` hoặc đổi row từ A sang B. | Bị từ chối bởi `WITH CHECK`/policy; không có cách bypass qua child table. | Spec RLS |
| DB-RLS-004 | P0 | Client delete isolation | `U-A` thử DELETE row của `C-B` và DELETE parent `C-B`. | Bị từ chối; không cascade xóa tenant khác. | Spec RLS |
| DB-RLS-005 | P0 | Agency admin access | `U-AGENCY` SELECT/INSERT/UPDATE/DELETE dữ liệu hai client. | Full access đúng yêu cầu; vẫn không được sửa/xóa bảng append-only. | Spec RLS; PRD C1 |
| DB-RLS-006 | P1 | No JWT/anonymous | Session không có JWT hoặc thiếu `client_id`. | Không đọc/ghi dữ liệu tenant; không coi NULL claim là wildcard. | Security boundary |
| DB-RLS-007 | P0 | Audit immutability | Agency Admin và Client User thử UPDATE/DELETE `audit_log`; thử thay `client_id`. | Tất cả bị từ chối ở DB/RLS/trigger; INSERT audit đúng tenant được phép theo policy. | PRD C1 AC |
| DB-RLS-008 | P1 | Audit UUID | Insert `user_id` hợp lệ, UUID lỗi, NULL. | UUID hợp lệ được nhận; UUID lỗi/NULL bị từ chối; không map user ID bằng string. | Spec UUID |
| DB-RLS-009 | P1 | Direct DB vs ORM | Chạy cùng một isolation test bằng SQL trực tiếp và SQLAlchemy query có/không `.where(client_id=...)`. | RLS vẫn chặn khi ORM filter bị thiếu; application filtering là defense-in-depth, không phải lớp duy nhất. | Spec RLS |
| DB-RLS-010 | P1 | Policy bypass role | Chạy test với role ứng dụng, role migration và service role riêng. | Chỉ role đã được thiết kế mới bypass RLS; hành vi service role được tài liệu hóa, không dùng làm bằng chứng client isolation. | Supabase security |

## 10. Concurrency, performance và recovery

| ID | Pri | Loại | Điều kiện / bước chính | Kết quả mong đợi | Traceability |
|---|---:|---|---|---|---|
| DB-NFR-001 | P1 | Concurrent brand current | Hai transaction đồng thời set brand setting mới thành current cho cùng client. | Không thể commit hai current; một transaction thắng, transaction kia retry/fail rõ ràng. | PRD C1 AC |
| DB-NFR-002 | P1 | Concurrent FSM | Hai worker update cùng content item/state. | Không lost update/dirty state; transaction hoặc optimistic lock xử lý deterministic. | MVP A01 rule 6 |
| DB-NFR-003 | P1 | Concurrent asset expiry | Job expiry chạy đồng thời với user fulfill request. | Không chuyển request đã fulfilled thành expired; item state không bị overwrite sai. | MVP asset expiry |
| DB-NFR-004 | P1 | Concurrent memory | Hai worker ghi feedback cho cùng content item và hai worker ghi hai item khác nhau. | Không crash; quy ước last-write/upsert của MVP rõ ràng; item khác nhau không mất dữ liệu. | MVP P01 |
| DB-NFR-005 | P1 | Hot query latency | Seed dataset đại diện pilot; đo query theo `client_id`, status, expires_at, agent/task, review target với warm/cold cache. | p99 nằm trong mục tiêu PRD C1 (<50–100ms cho query thường xuyên) hoặc có số đo/defect và kế hoạch index. | PRD C1 NFR |
| DB-NFR-006 | P2 | Connection pool | Chạy số worker/connection theo giới hạn triển khai qua PgBouncer; tạo tải đồng thời. | Không vượt max 10 connections/service theo PRD; lỗi pool được xử lý retry, không làm mất transaction. | PRD C1 NFR |
| DB-NFR-007 | P1 | Backup/restore | Tạo snapshot/backup database test, xóa dữ liệu test, restore. | Restore được trong RTO mục tiêu <4h; dữ liệu đạt RPO mục tiêu <24h; không test destructive trên production. | PRD C1 NFR |
| DB-NFR-008 | P2 | Unicode/large payload | Insert caption tiếng Việt, emoji, JSONB lớn hợp lý, text sát giới hạn thực tế. | Không lỗi encoding; payload không bị truncate; nếu cần giới hạn kích thước thì lỗi rõ ràng và có tài liệu. | Product data quality |

## 11. Traceability và tiêu chí pass

### Acceptance Criteria bắt buộc

| AC | Test bao phủ | Pass khi |
|---|---|---|
| Migration chạy 2 lần không lỗi/đổi data | DB-MIG-001, 002, 003 | Cả hai lần thành công; schema/data không nhân bản hoặc biến đổi. |
| Enum/service tier sai bị từ chối | DB-BR-010 scope guard | Nếu `service_tier` được xác nhận thuộc task: phải có enum DB test riêng. Hiện chưa nằm trong spec 0001 nên giữ ở scope-gap, không tự thêm. |
| Status sai FSM bị từ chối | DB-FSM-001, 002, 003, 004 | Domain và transition đều bị chặn ở lớp được chỉ định; không chỉ UI. |
| Audit UPDATE/DELETE bị từ chối mọi role | DB-RLS-007 | Agency Admin, client user và DB role đều không sửa/xóa được. |
| Brand settings chỉ một current/client | DB-BR-007, DB-NFR-001 | Có unique partial index/constraint hoặc trigger tương đương; race test không tạo duplicate. |
| RLS tenant isolation | DB-RLS-001 đến 010 | Client A không đọc/ghi/xóa được dữ liệu B, kể cả khi application filter bị bỏ. |
| Asset expiry → asset_blocked | DB-FSM-006, DB-AS-004 | Không fallback ảnh AI, không tự reject; lưu được dấu vết expiry/escalation. |
| Retry counter không tăng do infra retry | DB-FSM-008 | Chỉ quality fail làm tăng `eval_retry_count`. |
| Observability tối giản | DB-OBS-001 đến 005 | Mỗi task có log đủ field và có thể filter phục vụ Internal App. |

### Release gate đề xuất

- **Không release** nếu bất kỳ case P0 nào fail.
- P1 chỉ được chấp nhận khi có defect, owner, workaround và quyết định rủi ro rõ ràng.
- Mọi case “chưa chốt business rule” phải chuyển thành decision note trước khi biến thành constraint DB; không tự suy diễn thêm luật như giới hạn `weight`, format URL hoặc cascade delete.
- Test production chỉ chạy read-only/backup-restore được phê duyệt; migration, RLS và destructive test chạy trên staging/database clone.

## 12. Gap đã quan sát trong implementation hiện tại

Đây là các điểm cần QA mở defect khi chạy test, không phải kết luận đã pass/fail bằng static inspection:

1. `backend/alembic/versions/` hiện chưa có migration revision; cần chạy DB-MIG-001/002 sau khi có migration thật.
2. Các field enum/FSM trong model/deploy SQL đang thể hiện dạng `String`; cần DB-FSM-001/003 để xác nhận có constraint/trigger thật ở database.
3. Model `brand_settings` hiện chưa thể hiện `is_current`/unique-current; DB-BR-007 là P0 theo AC C1 của PRD tổng, nhưng cần xác nhận field này có thuộc schema MVP chính thức hay không.
4. `agent_memory.content_item_id` hiện chưa có FK trong model; DB-MEM-005 cần được chạy và mở defect nếu quan hệ này là bắt buộc.
5. Spec yêu cầu mọi update tự đổi `updated_at`; test phải kiểm tra trigger/ORM behavior ở database integration, không chỉ nhìn `onupdate` của SQLAlchemy.
6. `task_logs` trong spec chưa có `content_item_id`, trong khi MVP Internal App yêu cầu filter theo content item; DB-OBS-005 là scope gap cần quyết định trước khi build màn hình log.
7. `hitl_reviews.target_id` là polymorphic UUID nên FK không thể tự suy ra từ column hiện tại; DB-HITL-002 phải được enforce bằng trigger/service và cần test cross-tenant.
