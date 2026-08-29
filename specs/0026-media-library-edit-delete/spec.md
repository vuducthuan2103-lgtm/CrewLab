# Spec 0026: Media Library Asset Edit and Delete

## 1. Overview & Business Context
Users in the Client Portal need full control over their Brand Assets in the Media Library (`/assets`), including:
1. **Deleting images** directly from the grid or detail panel with a safety confirmation dialog.
2. **Editing image descriptions** (`semantic_summary` / `notes`) so AI agents (D02) have accurate context.
3. **Editing AI tags** (adding new tags, removing irrelevant tags) to refine asset search and matching.

## 2. Technical Architecture

### 2.1 Backend APIs (`portal_router.py`)
- `PATCH /api/v1/assets/{asset_id}`
  - Request: `AssetUpdateRequest(description: Optional[str], tags: Optional[List[str]])`
  - Updates `BrandAsset.tags` and `SemanticAssetRecord.semantic_summary` + `suggested_tags`.
  - Returns `ApiResponse[BrandAssetOut]`.
- `DELETE /api/v1/assets/{asset_id}`
  - Deletes physical storage file via Supabase Storage (`delete_files`).
  - Removes DB records (`BrandAsset` and cascaded `SemanticAssetRecord`).
  - Returns `ApiResponse[dict]` with deleted asset ID.

### 2.2 Frontend UX (`portal/`)
- `portal/lib/api.ts`: Add `apiUpdateAsset(id, data)` and `apiDeleteAsset(id)`.
- `portal/lib/store.tsx`: Add `updateAsset(id, changes)` and `deleteAsset(id)` actions to `PortalContext`.
- `portal/components/assets/MediaLibraryGrid.tsx`:
  - Hover action: Quick delete button (Trash icon) and detail/edit button.
  - Detail/Edit Modal (`AssetDetailPanel`):
    - Editable Description textarea.
    - Interactive Tag Editor: Add tag input, chip list with remove `(x)` buttons.
    - Delete button with confirm dialog / modal.
    - Save changes button with loading indicator and toast feedback.

## 3. Acceptance Criteria
- [ ] User can delete any client-owned asset; deleted asset disappears from grid and store immediately.
- [ ] Supabase storage file is deleted when asset is deleted.
- [ ] User can edit asset description, saved to `SemanticAssetRecord.semantic_summary`.
- [ ] User can add/remove tags on any asset, saved to `BrandAsset.tags` and `SemanticAssetRecord.suggested_tags`.
- [ ] Unit and integration tests verify both backend API endpoints and frontend state updates.
