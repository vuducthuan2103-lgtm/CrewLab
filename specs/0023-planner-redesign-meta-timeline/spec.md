# Spec 0023 - Planner Redesign & Meta Business Suite Timeline

**Status:** Approved by direct user request on 2026-08-15

## Goal

Redesign the Portal Planning screen (`/content-hub`) into a streamlined "Công cụ lập kế hoạch" featuring a compact header schedule popover and a Meta Business Suite Planner-inspired timeline view with 7-day columns (Monday to Sunday), multi-faceted filters, full week approval, and updated Inter typography.

## In scope

- Compact header auto-scheduling trigger button (`WeeklySchedulePopover`) with day/time configuration and save action (removing obsolete manual cycle trigger/close buttons).
- Restructure Level-1 tabs into two main tabs: "Trụ nội dung" and "Bảng kế hoạch" (deprecating the standalone Level-1 calendar tab).
- Sub-tabs within "Bảng kế hoạch": "Lịch (Meta Planner)" and "Bảng dữ liệu".
- Meta Business Suite Planner Timeline (`MetaPlannerTimeline`):
  - View switch: "Tuần" and "Tháng".
  - Date navigation (`<`, `Hôm nay`, `>`) with dynamic period labeling.
  - Dropdown filters: Content Pillar, Content Type, Platform (FB/IG).
  - Bulk actions: "Duyệt cả tuần" (Approve all week) and "Xuất kế hoạch CSV".
  - 7-day week grid (Monday `T2` to Sunday `CN`) with post cards styled like Meta Planner (time pill `08:51`, media box with circular FB/IG platform badges, pillar tags, FSM state badges, and click-to-modal approval).
  - 35-day month calendar grid view.
- Update global typography to `Inter` across Portal and Internal App layouts and design tokens.
- Add unit test suite for planner redesign and verify zero lint errors.

## Out of scope

- Direct publishing to Facebook Graph API / Meta OAuth.
- Adding manual post creation buttons (`+`) inside the AI-automated planner.
- Database schema changes (uses existing client schedule settings and content item store).

## Acceptance criteria

| ID | Criterion |
| --- | --- |
| AC-0023-01 | Header displays "Công cụ lập kế hoạch" with a compact `[ ⏰ Lịch tạo tự động: {Day} {Time} ▾ ]` popover button. |
| AC-0023-02 | Weekly schedule popover allows updating day and time and calling `apiUpdateWeeklySchedule`, with obsolete trigger/close buttons removed. |
| AC-0023-03 | Level-1 tabs only contain "Trụ nội dung" and "Bảng kế hoạch". |
| AC-0023-04 | "Bảng kế hoạch" supports sub-tabs switching between "Lịch (Meta Planner)" and "Bảng dữ liệu". |
| AC-0023-05 | Meta Planner view supports week (Monday T2 to Sunday CN) and month views, date navigation, and Pillar/Type/Platform filtering. |
| AC-0023-06 | Meta Planner post cards display time, media thumbnail with platform badge, pillar info, and click-to-open `ContentApprovalModal`. |
| AC-0023-07 | Both "Duyệt cả tuần" and "Xuất CSV" actions are accessible and functional. |
| AC-0023-08 | Unit tests in `portal/tests/planner-redesign.test.tsx` pass and `npm run lint` succeeds with 0 errors. |
