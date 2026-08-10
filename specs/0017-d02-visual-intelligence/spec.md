# Feature Specification: D02 Visual Intelligence

**Feature Branch**: `feature/0017-d02-visual-intelligence`
**Created**: 2026-08-08
**Status**: Approved — implementation authorized by the client
**Input**: D02 must always create a final visual with an image-capable LLM; it must prefer a real client image as the editable source, allow D01 to declare text-only posts, and use image semantics so selection and E01 evaluation are grounded in the actual visual.

## 0. Context and Scope

The current D02 implementation can select an approved library image but does not generate or edit a real final image. It also receives a weak tag-based brief and the D01-to-D02 dispatch instruction is currently dropped. This means a completed caption can remain in `visual_matching` indefinitely.

This feature replaces the current D02 outcome with a traceable visual-production flow:

```text
D01 caption + Visual Intent
  -> text_only? -> E01 caption-only evaluation
  -> otherwise A01 dispatches D02
      -> eligible real images
      -> semantic candidate retrieval and visual ranking
      -> image-capable LLM creates final derivative
      -> E01 evaluates final image + Visual Intent + provenance
```

This is a deliberate amendment to the current tag-only Media Library rule. It does **not** add ChromaDB, document RAG, or cross-client search. Image semantic records and retrieval remain isolated to the owning client.

### Portal image-ingestion flow

The client upload is not itself an instruction to create a post image. It creates an immutable library source and starts background indexing. The client can continue using the Portal while indexing runs.

```text
Client uploads image in Portal
  -> validate type, size and safety; create immutable source asset
  -> record ordinary metadata, ownership and approval status
  -> show “Processing image” in Media Library
  -> create or refresh its Semantic Asset Record
       -> extract visual facts + technical/editability facts
       -> produce versioned multimodal embedding(s)
       -> check duplicate source and index integrity
  -> index ready?
       -> yes: show “Ready for D02” when also approved and rights-eligible
       -> no: show “Needs attention”; retain source, retry safely, never use it for D02

D01 Visual Intent
  -> create a compatible semantic query representation
  -> retrieve only ready records for that client, with metadata filters
  -> vision-verify and rank candidates
  -> create the LLM derivative; preserve source and decision trail
```

## User Scenarios & Testing

### User Story 1 - Produce a post visual from the best real image (Priority: P1)

As a client, I want a post to start from the most relevant real photograph in my library and be edited to fit the caption, so the output remains authentic to my business while looking purpose-made for the post.

**Why this priority**: Authentic product and venue images are the primary brand asset for F&B clients. The core D02 value is selecting the right source and producing a useful final image, not merely returning an existing file.

**Independent Test**: Seed several approved photographs with different subjects and provide a precise Visual Intent. Verify that D02 records the selected source, produces a derivative, and the derivative follows the requested composition and text treatment.

**Acceptance Scenarios**:

1. **Given** approved client photographs include one that closely matches the required product and setting, **When** D02 receives a visual-required post, **Then** it selects that photograph as the immutable source and creates a derived final visual through an image-capable LLM.
2. **Given** the source already closely fits the Visual Intent, **When** only small changes are needed, **Then** D02 performs a minimal edit such as lighting, crop, whitespace, or text overlay rather than unnecessarily changing the product or setting.
3. **Given** the final visual contains requested text, **When** it is completed, **Then** the text is legible on a mobile-sized preview and does not contradict the caption or brand rules.

---

### User Story 2 - Regenerate when no exact real image exists (Priority: P1)

As a client, I want D02 to preserve real brand context even when the library lacks an exact photograph, so the visual can still be made without waiting for a manual asset request.

**Why this priority**: The agreed operating rule is that D02 always produces a final visual. A close real image remains valuable reference material even when it cannot be published unchanged.

**Independent Test**: Provide only near-match photographs and then no suitable photographs. Verify the two different generation decisions and their provenance.

**Acceptance Scenarios**:

1. **Given** no photograph satisfies the exact Visual Intent but one or more are close matches, **When** D02 ranks the candidates, **Then** it uses the highest-ranked close match as the visual reference and creates a source-guided regenerated image.
2. **Given** no eligible real photograph reaches the minimum suitability threshold, **When** D02 receives the post, **Then** it creates a new image from the Visual Intent and records that no real source was used.
3. **Given** image generation or editing fails after infrastructure retries, **When** the failure is final, **Then** the content item is visibly marked failed with an actionable reason for the agency; it must not remain indefinitely in a working state.

---

### User Story 3 - Let D01 create a genuine text-only post (Priority: P1)

As a content creator, I want D01 to mark a post as text-only when a visual would not improve it, so the workflow does not manufacture a decorative image just to satisfy a technical rule.

**Why this priority**: Text-only is a valid editorial choice, not an error or a missing asset.

**Independent Test**: Submit a post type that is appropriate as text-only and verify it proceeds to review without D02 or a visual-failure retry.

**Acceptance Scenarios**:

1. **Given** D01 determines that the post is text-only, **When** it completes the caption, **Then** A01 routes the item directly to E01 and does not enqueue D02.
2. **Given** a text-only item reaches E01, **When** E01 evaluates it, **Then** visual evaluation is recorded as not applicable and no visual failure criteria are emitted.
3. **Given** D01 declares a post visual-required, **When** the caption completes, **Then** D02 remains mandatory and the item cannot bypass visual production.

---

### User Story 4 - Understand why an image was selected and approved (Priority: P2)

As an agency operator, I want to see why D02 chose a source image and what it changed, so I can audit quality, troubleshoot failures, and trust E01's result.

**Why this priority**: Image semantics should improve decisions without creating an opaque pipeline.

**Independent Test**: Inspect a finished item with a selected real source, a regenerated result, and a text-only result. Each must expose the expected decision trail without showing client secrets.

**Acceptance Scenarios**:

1. **Given** D02 used a real image, **When** an agency operator opens the item's task detail, **Then** they can see the source asset, selection rationale, edit mode, final derivative, and any generation failure reason.
2. **Given** E01 evaluates a visual, **When** it passes or fails, **Then** its evaluation references the final visual and the Visual Intent, not the source image alone.

---

### User Story 5 - Upload an image that becomes a reliable D02 source (Priority: P1)

As a client, I want every successfully uploaded library image to be analysed and labelled with its visual meaning and usable quality, so D02 can find the right real image without relying on my manual tags alone.

**Why this priority**: A semantic selector is only as good as the asset records it can search. The upload flow must create a trustworthy, client-isolated record without making the client wait in the browser.

**Independent Test**: Upload a new eligible product photograph. Verify that the original file remains unchanged, the Portal shows its indexing state, a Semantic Asset Record becomes ready, and a matching D02 Visual Intent retrieves it. Upload a corrupt or non-eligible image and verify it is never selectable.

**Acceptance Scenarios**:

1. **Given** a client uploads a supported image, **When** file acceptance succeeds, **Then** the Portal immediately shows the library asset as `processing` and the original source is stored immutably with its owner, upload time, and ordinary asset metadata.
2. **Given** semantic indexing succeeds, **When** the client views the asset, **Then** it shows `ready_for_d02` only if approval and usage-right checks also pass; the client can inspect a concise, human-readable description and suggested tags before deciding to revise metadata.
3. **Given** semantic indexing fails or the image is corrupt, unsafe, unsupported, or a duplicate of an existing source, **When** processing ends, **Then** the Portal shows a safe reason and a retry or duplicate-link outcome; D02 must not select an unready record.
4. **Given** a client replaces an image, **When** the replacement is uploaded, **Then** it becomes a new immutable source with a new Semantic Asset Record; it never overwrites the prior source or silently changes provenance of past D02 derivatives.

### Edge Cases

- A candidate has matching semantics but is not approved, lacks usage rights, is too small, or belongs to another client: it is ineligible regardless of similarity.
- The required product is present but the photo is technically poor for editing: D02 may use it only as regeneration reference, never as the final visual unchanged.
- A retry for a visual failure must not re-use the rejected final derivative as the final output; it may retain the original real source when the failure is only an edit-quality issue.
- The image model returns an unsafe, unreadable, or materially off-brief output: D02 records the failure and retries as infrastructure/quality handling requires; it must not silently publish it.
- A content item is processed twice: the same completed visual decision is reused; duplicate derivatives and duplicate downstream tasks are not created.
- Existing library photos without semantic records remain usable through metadata fallback until they are indexed; they must not become invisible.
- An upload finishes file storage but indexing is delayed: the Portal shows `processing`; the asset is not a D02 candidate until indexing is ready, while legacy assets retain the documented metadata-only fallback.
- The same file is uploaded twice by the same client: the Portal links the new upload attempt to the already indexed immutable source instead of creating duplicate semantic records or charging two indexing runs.
- A file is uploaded under an allowed image format but visual analysis cannot determine a safe product or scene: its record is marked `needs_attention`; no invented facts are used for retrieval.

## Requirements

### Functional Requirements

#### Workflow and reliability

- **FR-001**: The workflow MUST dispatch every instruction returned by A01. In particular, a completed D01 task MUST enqueue D02 for visual-required posts, and a completed D02 task MUST enqueue E01.
- **FR-002**: Only A01 is responsible for converting a workflow event into downstream task dispatches. Child agents MUST report their completion event through A01 rather than discard or independently reinterpret dispatch instructions.
- **FR-003**: Every agent failure MUST be recorded with the failing stage, retryability, safe error category, and support reference. The portal MUST distinguish a provider, database, dispatch, and invalid-model-output failure instead of presenting one generic outage message.
- **FR-004**: A worker restart or exhausted infrastructure retry MUST leave the item in a recoverable, observable state. It MUST NOT leave a task permanently displayed as actively generating without a pending task or failure record.

#### D01 Visual Intent

- **FR-005**: D01 MUST output a `visual_mode` of either `visual_required` or `text_only` for every post.
- **FR-006**: For `visual_required`, D01 MUST produce a structured Visual Intent that separates: required subject/product, preferred setting and composition, brand mood, prohibited elements, platform format, desired text treatment, and the desired degree of alteration.
- **FR-007**: D01 MUST mark `text_only` when it judges that a visual is not needed for the post. This decision and its short rationale MUST be persisted with the content item.
- **FR-008**: A text-only decision MUST be reversible only through a normal content revision/retry, never by silently assigning an image later.

#### Real-image selection and semantic retrieval

- **FR-009**: D02 MUST restrict candidate images to the current client and apply non-negotiable eligibility checks before semantic ranking: approved status, usable rights, valid source file, minimum editability, and no excluded subject or prior rejected final derivative.
- **FR-010**: The system MUST maintain a client-isolated semantic representation for each eligible library image, together with human-readable asset metadata. New or changed images MUST receive a representation before being considered fully indexed; legacy images MUST have a metadata fallback during backfill.
- **FR-011**: D02 MUST retrieve a bounded set of semantically relevant candidates from the Visual Intent and rank them using all of the following dimensions: required subject/product match, Visual Intent fit, brand and setting fit, technical editability, freshness/reuse, and usage-right eligibility.
- **FR-012**: Before selecting a source, D02 MUST use a vision-capable assessment of the leading candidates against the Visual Intent. Semantic similarity alone MUST NOT select the image.
- **FR-013**: D02 MUST save a Visual Selection Decision containing the candidates considered, source chosen or rejected, scores/rationale, and the selected action. This decision is tenant-scoped and visible only to authorized agency/client users.

#### Portal asset ingestion and Semantic Asset Records

- **FR-024**: When a client uploads an image through the Portal, the system MUST first create one immutable source asset scoped to that client, with a content fingerprint, storage reference, original filename, ordinary asset metadata, upload time, approval status, and usage-right status. The source file MUST NOT be altered during analysis.
- **FR-025**: File acceptance MUST validate the supported image type, configured size limit, readable image data, and safety policy before creating a D02-eligible asset. A rejected file MUST not create a searchable Semantic Asset Record.
- **FR-026**: Accepted new uploads MUST enter a visible semantic-indexing lifecycle: `processing`, `ready`, `needs_attention`, `failed`, or `superseded`. A record is usable by D02 only in `ready`, and only when its linked asset independently passes the eligibility checks in FR-009.
- **FR-027**: The Portal MUST expose the asset's indexing state and a safe, actionable reason when it is not ready. Indexing MUST run without requiring the client to keep the upload page open.
- **FR-028**: A Semantic Asset Record MUST contain, at minimum: immutable source-asset reference; client ID; record status; content fingerprint; analysis and embedding version; a human-readable semantic summary; primary and secondary products/subjects; setting; actions; composition; mood/lighting; available negative space and text-safe areas; visible text; suggested tags; technical quality and editability signals; safety findings; confidence per extracted fact; and timestamps. It MUST link to ordinary approval, rights, and reuse metadata rather than duplicate or override those controls.
- **FR-029**: The system MUST create a versioned multimodal embedding from the source image and its verified semantic description. It MAY maintain a second compatible text representation for retrieval, but all representations for one search MUST use the same declared embedding version. Embeddings are retrieval signals only; they are never the authoritative source of product facts, approval, rights, or E01 evaluation.
- **FR-030**: For each `visual_required` post, D02 MUST create a query representation from the persisted Visual Intent using the compatible embedding version, then perform hybrid retrieval: client-scoped semantic similarity plus exact/lexical product and tag signals plus hard metadata filters. The retrieval result MUST be bounded and auditable.
- **FR-031**: The system MUST compare an uploaded source fingerprint within the same client before indexing. A duplicate MUST reuse or link to the existing source's semantic analysis when the image bytes are identical; a visually similar but non-identical file MUST remain a separate asset and record.
- **FR-032**: Re-uploading, replacing, or materially changing an asset MUST create a new immutable source and a new Semantic Asset Record. The prior record is marked `superseded` only for future selection; it remains available for provenance of earlier D02 decisions and derivatives.
- **FR-033**: The system MUST never use face identity, biometric identity, or cross-client similarity to retrieve image assets. Semantic facts, embeddings, source fingerprints, candidate lists, and selection records MUST be isolated by client authorization.

#### Image generation and editing

- **FR-014**: For every `visual_required` post, D02 MUST create a final visual through an image-capable LLM. It MUST NOT use a library file as the final output unchanged.
- **FR-015**: D02 MUST preserve a selected real source image unchanged and create a separate derivative. The derivative MUST retain provenance to its source when one exists.
- **FR-016**: D02 MUST choose exactly one edit mode for a run:
  - `minimal_edit` when a high-confidence real source needs only crop, lighting, whitespace, minor composition, or text treatment;
  - `guided_edit` when the source matches the subject but needs meaningful visual changes;
  - `source_guided_generation` when only a close real source exists;
  - `new_generation` when no eligible source is sufficiently relevant.
- **FR-017**: D02 MUST use the following decision thresholds after eligibility checks and visual ranking: score 85–100 uses `minimal_edit` or `guided_edit`; score 65–84 uses `source_guided_generation`; score below 65 or no candidate uses `new_generation`.
- **FR-018**: D02 MUST make requested text overlay conditional on the Visual Intent. When text is requested, it MUST use the approved caption facts and follow the brief's placement, hierarchy, language, and readability constraints.
- **FR-019**: D02 MUST store the final visual, its generation/edit mode, source reference when any, generation prompt summary, and technical validation outcome. It MUST never overwrite the original client upload.

#### Evaluation

- **FR-020**: E01 MUST evaluate the final derivative or newly generated image together with the caption and Visual Intent. It MUST not judge visual fit from the source asset or semantic representation alone.
- **FR-021**: For visual-required posts, E01 MUST continue to use the existing visual failure vocabulary exactly: `visual_asset_fit`, `image_design_quality`, and `mobile_readability`.
- **FR-022**: For text-only posts, E01 MUST evaluate caption criteria normally and set visual evaluation to `not_applicable`; it MUST not emit any visual failure criterion or force D02.
- **FR-023**: On visual retry, D02 MUST use E01's fix instructions, avoid reusing the rejected final derivative, and save a new Visual Selection Decision. It MAY retain the original real source if it remains suitable.

### D02 Selection Policy

The following policy answers how D02 knows which real image to choose. It is the product rule to implement and test; detailed model/provider choices are deferred to planning.

| Stage | Rule | Outcome |
|---|---|---|
| 0. Record readiness | Restrict source records to the current client and `ready` indexing state. Join ordinary asset approval, rights, and reuse fields; ignore any `processing`, failed, or superseded record. | Searchable pool with trusted metadata. |
| 1. Eligibility | Exclude another client's images, unapproved assets, unusable rights, corrupted/undersized assets, and content the Visual Intent forbids. | Safe candidate pool only. |
| 2. Hybrid retrieval | Create a compatible semantic query from Visual Intent. Retrieve by multimodal similarity and combine it with exact product names, tags, and metadata filters. | Small candidate set, including images whose tags use different wording. |
| 3. Visual verification | A vision-capable model compares the leading candidates with the brief, including actual product, scene, composition, editability, and text-safe space. | Explainable rank, not a blind vector match. |
| 4. Scoring | Required product/subject 40%; Visual Intent fit 25%; brand/setting fit 15%; editability 10%; freshness/reuse 5%; rights/usage confidence 5%. A failed hard gate overrides the numeric score. | One ranked source and a confidence band. |
| 5. Produce | 85+ edit a close source; 65–84 regenerate guided by closest source; below 65 generate from the Visual Intent. | Final derivative always created by D02. |
| 6. Verify | E01 sees the final visual, caption, brief, and provenance—not the vector alone. | Correct semantic quality assessment and targeted retry. |

### Key Entities

- **Visual Intent**: D01's persisted visual decision and brief for one content item, including `visual_mode`, required content, preferences, prohibitions, format, text treatment, and alteration guidance.
- **Semantic Asset Record**: Client-isolated, versioned and searchable meaning/quality record for exactly one immutable library source. It contains the source's semantic facts, text-safe and editability findings, confidence, status, source fingerprint, and compatible multimodal embedding references; ordinary approval, rights and reuse controls remain on the linked asset.
- **Visual Selection Decision**: An audit record for one D02 run, including candidates, eligibility exclusions, ranking rationale, selected source, confidence, and chosen edit mode.
- **Visual Derivative**: The final image created for one content item. It records lineage to a real source when present and never replaces that source.
- **Visual Evaluation**: E01's assessment of the final visual. It is either scored against the existing visual criteria or explicitly `not_applicable` for a text-only post.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In a curated test set of 30 visual-required posts with a known suitable real source, D02 selects a human-approved source within its top result in at least 27 cases (90%).
- **SC-002**: 100% of visual-required posts that complete successfully have a final derivative and a provenance record; no original client asset is modified.
- **SC-003**: 100% of text-only posts reach content review without D02 execution and without visual failure criteria.
- **SC-004**: 100% of D01 completion events produce one observable downstream action: D02 for a visual-required post or E01 for a text-only post.
- **SC-005**: In acceptance tests, a visual failure causes a new D02 decision trail and does not reuse the previously rejected final derivative.
- **SC-006**: Agency operators can identify the source choice, edit mode, final visual, and safe failure reason for every completed or failed D02 run in under two minutes.
- **SC-007**: At least 95% of valid new image uploads show `ready` or a clear actionable non-ready outcome within five minutes, without requiring the client to keep the Portal page open.
- **SC-008**: In an acceptance set containing identical uploads, visually similar uploads, rejected uploads, and two-client assets, 100% of D02 retrievals exclude the rejected, non-ready, and other-client records; identical uploads create no duplicate indexed source.

## Assumptions and Boundaries

- The client has explicitly approved use of image-capable LLMs for its content. The provider and model remain configured per client; no provider or API key is exposed in the Portal.
- “Always create image by LLM” means every `visual_required` post receives a newly created derivative, including small edits. It does not apply to D01-declared `text_only` posts.
- Real library assets are always preferred as source/reference, but never treated as immutable final creative output.
- Semantic image retrieval is limited to a client's own approved Media Library. It does not add ChromaDB, long-document RAG, cross-client matching, or analytics agents.
- A multimodal embedding means a versioned numeric semantic representation of an image and its verified description, compatible with the equivalent representation of a D01 Visual Intent. It supports candidate retrieval only; a vision review and normal asset controls make the final decision.
- A normal Portal upload is visible as a library asset after safe file acceptance, but it becomes D02-selectable only after both semantic indexing and the existing approval/rights controls are ready.
- Existing assets are backfilled progressively. Until their record is ready, the existing metadata-only fallback applies only to legacy assets, never to newly uploaded assets that failed indexing.
- The existing E01 criterion names and pass thresholds remain unchanged. Text-only alters applicability of the visual dimension, not the caption quality bar.
- Human review at the existing Content Approval Gate remains mandatory before posting.

## Scope Changes and Dependencies

- This spec supersedes the tag-only selection and optional/mock AI-image branches of Spec 0007 for D02.
- This spec amends the text-only assumption in Spec 0008: no-image is valid only when D01 explicitly declares `text_only`; it is not a visual failure.
- It is governed by ADR-0013 for client-isolated image semantic records, data lifecycle, and backfill before implementation planning.
- It includes the previously diagnosed A01 dispatch and observability defects because they are prerequisites for any D02 result to reach E01 reliably.
- It does not include document embedding, customer-facing manual image editing controls, auto-publishing, or any agents outside the authorized MVP.
