// ─── Internal App: Mock Data — 3 F&B Clients for Demo/Pitch ──────────────────
// Aligned with MVP Scope §2j + Observability §1d

import {
  AgentInfo,
  Client,
  ContentItemAdmin,
  TaskLogEntry,
  RetryHistoryEntry,
  LLMUsageEntry,
  EvalCriterion,
} from './types';

// ─── 6 Agents ────────────────────────────────────────────────────────────────
export const AGENTS: AgentInfo[] = [
  { code: 'A01', name: 'Orchestrator', role: 'Điều phối pipeline, dispatch task, retry-routing', status: 'running', lastRun: 'Vừa xong', icon: '🧠' },
  { code: 'B02', name: 'Content Pillar', role: 'Đề xuất Trụ nội dung & Góc khai thác tuần', status: 'completed', lastRun: '2 phút trước', icon: '🧭' },
  { code: 'B03', name: 'Content Plan', role: 'Lên lịch đăng bài, phân bổ platform & giờ vàng', status: 'completed', lastRun: '5 phút trước', icon: '📅' },
  { code: 'D01', name: 'Caption Writer', role: 'Viết caption theo brand voice & platform', status: 'completed', lastRun: '1 phút trước', icon: '✍️' },
  { code: 'D02', name: 'Image Designer', role: 'Chọn ảnh thật phù hợp và tạo ảnh dẫn xuất bằng AI', status: 'completed', lastRun: '1 phút trước', icon: '🎨' },
  { code: 'E01', name: 'Evaluator', role: 'Chấm điểm caption + visual, retry-routing nếu fail', status: 'running', lastRun: 'Đang chạy...', icon: '✅' },
];

// ─── 3 Clients ───────────────────────────────────────────────────────────────
export const CLIENTS: Client[] = [
  {
    id: 'client-001',
    name: 'Bardinh Coffee',
    vertical: 'Cà phê specialty & Không gian sáng tạo',
    status: 'active',
    onboardedAt: new Date('2026-06-01'),
    contentItemCount: 6,
    activeTaskCount: 3,
    hasError: true,
    hasPendingApproval: true,
    platforms: ['fb', 'ig'],
    budgetTotal: 50,
    budgetUsed: 18.4,
  },
  {
    id: 'client-002',
    name: 'Cà Phê Muối Chú Lắm',
    vertical: 'Cà phê truyền thống Huế',
    status: 'active',
    onboardedAt: new Date('2026-06-15'),
    contentItemCount: 4,
    activeTaskCount: 2,
    hasError: false,
    hasPendingApproval: true,
    platforms: ['fb'],
    budgetTotal: 30,
    budgetUsed: 27,
  },
  {
    id: 'client-003',
    name: 'Bún Chả Hương Liên',
    vertical: 'Ẩm thực Hà Nội truyền thống',
    status: 'paused',
    onboardedAt: new Date('2026-06-10'),
    contentItemCount: 8,
    activeTaskCount: 0,
    hasError: false,
    hasPendingApproval: false,
    platforms: ['fb', 'ig'],
    budgetTotal: 100,
    budgetUsed: 0,
  },
];

// ─── Content Items — Bardinh Coffee (diverse FSM states) ─────────────────────
export const CONTENT_ITEMS: ContentItemAdmin[] = [
  {
    id: 'ci-001', clientId: 'client-001', title: 'Cold Brew Mùa Hè', platform: 'ig',
    state: 'pending_content_approval',
    caption: '☀️ Hè về, Bardinh Coffee ra mắt Cold Brew Mùa Hè — Pha lạnh 24 giờ...',
    imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
    publishTime: new Date('2026-06-17T08:00:00'), pillarLabel: 'Product Spotlight', weekNumber: 25,
    retryCount: 0, evalScoreCaption: 8.2, evalScoreVisual: 4.1, evalFeedback: 'Tone phù hợp, ảnh chất lượng tốt.',
    failedCriteria: [], currentAgent: null, needsRealPhoto: false,
    createdAt: new Date('2026-06-15T15:00:00'), updatedAt: new Date('2026-06-15T15:28:00'),
  },
  {
    id: 'ci-002', clientId: 'client-001', title: 'Bạc Xỉu Kem Trứng', platform: 'fb',
    state: 'visual_generating',
    caption: '🥚✨ Bạc Xỉu Kem Trứng — sự kết hợp hoàn hảo...',
    imageUrl: null,
    publishTime: new Date('2026-06-18T18:00:00'), pillarLabel: 'Product Spotlight', weekNumber: 25,
    retryCount: 0, evalScoreCaption: null, evalScoreVisual: null, evalFeedback: null,
    failedCriteria: [], currentAgent: 'D02', needsRealPhoto: true,
    createdAt: new Date('2026-06-15T15:25:00'), updatedAt: new Date('2026-06-15T15:31:00'),
  },
  {
    id: 'ci-003', clientId: 'client-001', title: 'Hậu trường barista sáng sớm', platform: 'ig',
    state: 'approved_ready_to_post',
    caption: '⏰ 5:30 sáng tại Bardinh Coffee — Khi cả thành phố còn đang ngủ...',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    publishTime: new Date('2026-06-19T17:00:00'), pillarLabel: 'Behind the Scenes', weekNumber: 25,
    retryCount: 0, evalScoreCaption: 8.8, evalScoreVisual: 4.5, evalFeedback: 'Brand voice rất tốt, ảnh thật chất lượng cao.',
    failedCriteria: [], currentAgent: null, needsRealPhoto: false,
    createdAt: new Date('2026-06-15T15:05:00'), updatedAt: new Date('2026-06-16T09:00:00'),
  },
  {
    id: 'ci-004', clientId: 'client-001', title: 'Combo Ăn Sáng Bánh Mì', platform: 'fb',
    state: 'eval_failed',
    caption: '🥖☕ Bắt đầu ngày mới với Combo Ăn Sáng đặc biệt của Bardinh!...',
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    publishTime: new Date('2026-06-20T18:00:00'), pillarLabel: 'Ưu đãi & Sự kiện', weekNumber: 25,
    retryCount: 1, evalScoreCaption: 6.2, evalScoreVisual: 3.8, evalFeedback: 'Tone quảng cáo quá mạnh, thiếu chất brand voice Bardinh. Ảnh sản phẩm chưa rõ nét.',
    failedCriteria: ['brand_voice', 'content_accuracy'], currentAgent: 'D01', needsRealPhoto: false,
    createdAt: new Date('2026-06-15T15:30:00'), updatedAt: new Date('2026-06-17T10:05:00'),
  },
  {
    id: 'ci-005', clientId: 'client-001', title: 'Không gian làm việc tại quán', platform: 'ig',
    state: 'posted',
    caption: '💻☕ Bardinh Coffee — Nơi lý tưởng để làm việc...',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400',
    publishTime: new Date('2026-06-21T17:00:00'), pillarLabel: 'Lifestyle & Cảm xúc', weekNumber: 25,
    retryCount: 0, evalScoreCaption: 9.0, evalScoreVisual: 4.8, evalFeedback: 'Xuất sắc. Tone ấm áp, ảnh không gian đẹp.',
    failedCriteria: [], currentAgent: null, needsRealPhoto: false,
    createdAt: new Date('2026-06-15T14:00:00'), updatedAt: new Date('2026-06-21T17:05:00'),
  },
  {
    id: 'ci-006', clientId: 'client-001', title: 'Happy Hour Thứ 6', platform: 'both',
    state: 'planned',
    caption: null, imageUrl: null,
    publishTime: new Date('2026-06-22T17:00:00'), pillarLabel: 'Ưu đãi & Sự kiện', weekNumber: 25,
    retryCount: 0, evalScoreCaption: null, evalScoreVisual: null, evalFeedback: null,
    failedCriteria: [], currentAgent: null, needsRealPhoto: false,
    createdAt: new Date('2026-06-15T08:35:00'), updatedAt: new Date('2026-06-15T08:35:00'),
  },
  // ── Cà Phê Muối Chú Lắm ──────────────────────────────────────────────────
  {
    id: 'ci-101', clientId: 'client-002', title: 'Cà Phê Muối Hương Chanh', platform: 'ig',
    state: 'evaluating',
    caption: '🍋🧂 Hương vị mới từ Chú Lắm — Cà Phê Muối Hương Chanh...',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=400',
    publishTime: new Date('2026-06-18T09:00:00'), pillarLabel: 'Sản phẩm mới', weekNumber: 25,
    retryCount: 0, evalScoreCaption: null, evalScoreVisual: null, evalFeedback: null,
    failedCriteria: [], currentAgent: 'E01', needsRealPhoto: false,
    createdAt: new Date('2026-06-16T10:00:00'), updatedAt: new Date('2026-06-16T10:45:00'),
  },
  {
    id: 'ci-102', clientId: 'client-002', title: 'Góc Huế tại Sài Gòn', platform: 'fb',
    state: 'pending_content_approval',
    caption: '🏮 Một góc Huế giữa lòng Sài Gòn — nơi bạn thưởng thức cà phê muối...',
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    publishTime: new Date('2026-06-19T18:00:00'), pillarLabel: 'Không gian', weekNumber: 25,
    retryCount: 0, evalScoreCaption: 7.8, evalScoreVisual: 4.2, evalFeedback: 'Caption tốt, ảnh hơi tối.',
    failedCriteria: [], currentAgent: null, needsRealPhoto: false,
    createdAt: new Date('2026-06-16T11:00:00'), updatedAt: new Date('2026-06-16T14:00:00'),
  },
  // ── Bún Chả Hương Liên (paused — old data) ───────────────────────────────
  {
    id: 'ci-201', clientId: 'client-003', title: 'Bún Chả Obama đặc biệt', platform: 'fb',
    state: 'posted',
    caption: '🇺🇸 Bún Chả "Obama" — Combo huyền thoại mà bạn không thể bỏ lỡ...',
    imageUrl: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400',
    publishTime: new Date('2026-06-10T12:00:00'), pillarLabel: 'Heritage', weekNumber: 23,
    retryCount: 0, evalScoreCaption: 9.2, evalScoreVisual: 4.9, evalFeedback: 'Tuyệt vời.',
    failedCriteria: [], currentAgent: null, needsRealPhoto: false,
    createdAt: new Date('2026-06-08T09:00:00'), updatedAt: new Date('2026-06-10T12:05:00'),
  },
];

// ─── Task Logs (§1d Observability — task_logs table) ─────────────────────────
export const TASK_LOGS: TaskLogEntry[] = [
  {
    id: 'tl-001', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'A01',
    taskType: 'dispatch', modelUsed: 'gpt-4o', tokensIn: 1240, tokensOut: 380,
    latencyMs: 2100, status: 'success', evalScore: null, wakeReason: 'scheduled',
    contentItemId: null, contentItemTitle: null,
    createdAt: new Date('2026-06-15T08:00:05'),
  },
  {
    id: 'tl-002', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'B02',
    taskType: 'generate_pillars', modelUsed: 'gpt-4o', tokensIn: 2800, tokensOut: 1560,
    latencyMs: 4200, status: 'success', evalScore: null, wakeReason: 'task_assigned',
    contentItemId: null, contentItemTitle: null,
    createdAt: new Date('2026-06-15T08:01:00'),
  },
  {
    id: 'tl-003', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'B03',
    taskType: 'generate_content_plan', modelUsed: 'gpt-4o-mini', tokensIn: 3200, tokensOut: 2100,
    latencyMs: 3800, status: 'success', evalScore: null, wakeReason: 'task_assigned',
    contentItemId: null, contentItemTitle: null,
    createdAt: new Date('2026-06-15T08:05:00'),
  },
  {
    id: 'tl-004', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'D01',
    taskType: 'write_caption', modelUsed: 'gpt-4o-mini', tokensIn: 1800, tokensOut: 650,
    latencyMs: 2800, status: 'success', evalScore: null, wakeReason: 'task_assigned',
    contentItemId: 'ci-001', contentItemTitle: 'Cold Brew Mùa Hè',
    createdAt: new Date('2026-06-15T15:01:00'),
  },
  {
    id: 'tl-005', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'D02',
    taskType: 'design_visual', modelUsed: 'dall-e-3', tokensIn: 800, tokensOut: 200,
    latencyMs: 18000, status: 'success', evalScore: null, wakeReason: 'task_assigned',
    contentItemId: 'ci-001', contentItemTitle: 'Cold Brew Mùa Hè',
    createdAt: new Date('2026-06-15T15:06:00'),
  },
  {
    id: 'tl-006', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'E01',
    taskType: 'evaluate_content', modelUsed: 'gpt-4o-mini', tokensIn: 2200, tokensOut: 480,
    latencyMs: 3200, status: 'success', evalScore: 8.2, wakeReason: 'task_assigned',
    contentItemId: 'ci-001', contentItemTitle: 'Cold Brew Mùa Hè',
    createdAt: new Date('2026-06-15T15:24:00'),
  },
  {
    id: 'tl-007', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'D01',
    taskType: 'write_caption', modelUsed: 'gpt-4o-mini', tokensIn: 1950, tokensOut: 720,
    latencyMs: 3100, status: 'success', evalScore: null, wakeReason: 'task_assigned',
    contentItemId: 'ci-004', contentItemTitle: 'Combo Ăn Sáng Bánh Mì',
    createdAt: new Date('2026-06-15T15:30:00'),
  },
  {
    id: 'tl-008', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'E01',
    taskType: 'evaluate_content', modelUsed: 'gpt-4o-mini', tokensIn: 2100, tokensOut: 520,
    latencyMs: 3500, status: 'success', evalScore: 6.2, wakeReason: 'task_assigned',
    contentItemId: 'ci-004', contentItemTitle: 'Combo Ăn Sáng Bánh Mì',
    createdAt: new Date('2026-06-16T09:00:00'),
  },
  {
    id: 'tl-009', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'A01',
    taskType: 'retry_routing', modelUsed: 'gpt-4o', tokensIn: 900, tokensOut: 280,
    latencyMs: 1500, status: 'success', evalScore: null, wakeReason: 'task_assigned',
    contentItemId: 'ci-004', contentItemTitle: 'Combo Ăn Sáng Bánh Mì',
    createdAt: new Date('2026-06-16T09:01:00'),
  },
  {
    id: 'tl-010', clientId: 'client-001', clientName: 'Bardinh Coffee', agentCode: 'D01',
    taskType: 'write_caption', modelUsed: 'gpt-4o-mini', tokensIn: 2100, tokensOut: 780,
    latencyMs: 3300, status: 'running', evalScore: null, wakeReason: 'retry',
    contentItemId: 'ci-004', contentItemTitle: 'Combo Ăn Sáng Bánh Mì',
    createdAt: new Date('2026-06-17T10:05:00'),
  },
  {
    id: 'tl-011', clientId: 'client-002', clientName: 'Cà Phê Muối Chú Lắm', agentCode: 'D01',
    taskType: 'write_caption', modelUsed: 'gpt-4o-mini', tokensIn: 1600, tokensOut: 590,
    latencyMs: 2400, status: 'success', evalScore: null, wakeReason: 'task_assigned',
    contentItemId: 'ci-101', contentItemTitle: 'Cà Phê Muối Hương Chanh',
    createdAt: new Date('2026-06-16T10:10:00'),
  },
  {
    id: 'tl-012', clientId: 'client-002', clientName: 'Cà Phê Muối Chú Lắm', agentCode: 'E01',
    taskType: 'evaluate_content', modelUsed: 'gpt-4o-mini', tokensIn: 2050, tokensOut: 460,
    latencyMs: 3000, status: 'running', evalScore: null, wakeReason: 'task_assigned',
    contentItemId: 'ci-101', contentItemTitle: 'Cà Phê Muối Hương Chanh',
    createdAt: new Date('2026-06-16T10:45:00'),
  },
  {
    id: 'tl-013', clientId: 'client-002', clientName: 'Cà Phê Muối Chú Lắm', agentCode: 'E01',
    taskType: 'evaluate_content', modelUsed: 'gpt-4o-mini', tokensIn: 2000, tokensOut: 440,
    latencyMs: 2900, status: 'success', evalScore: 7.8, wakeReason: 'task_assigned',
    contentItemId: 'ci-102', contentItemTitle: 'Góc Huế tại Sài Gòn',
    createdAt: new Date('2026-06-16T13:50:00'),
  },
  {
    id: 'tl-014', clientId: 'client-003', clientName: 'Bún Chả Hương Liên', agentCode: 'E01',
    taskType: 'evaluate_content', modelUsed: 'gpt-4o-mini', tokensIn: 1900, tokensOut: 410,
    latencyMs: 2700, status: 'success', evalScore: 9.2, wakeReason: 'task_assigned',
    contentItemId: 'ci-201', contentItemTitle: 'Bún Chả Obama đặc biệt',
    createdAt: new Date('2026-06-09T14:00:00'),
  },
];

// ─── Retry History (for Debug View — ci-004 Combo Ăn Sáng) ──────────────────
export const RETRY_HISTORY_CI004: RetryHistoryEntry[] = [
  {
    attempt: 1, agentCode: 'D01', action: 'Viết caption lần 1',
    evalScore: 6.2, result: 'fail', failedCriteria: ['brand_voice', 'content_accuracy'],
    timestamp: new Date('2026-06-16T09:00:00'),
  },
  {
    attempt: 2, agentCode: 'D01', action: 'Viết lại caption (retry)',
    evalScore: null, result: 'pending', failedCriteria: [],
    timestamp: new Date('2026-06-17T10:05:00'),
  },
];

// ─── LLM Usage (for Debug View — ci-001 Cold Brew) ──────────────────────────
export const LLM_USAGE_CI001: LLMUsageEntry[] = [
  { agentCode: 'D01', modelUsed: 'gpt-4o-mini', tokensIn: 1800, tokensOut: 650, latencyMs: 2800, timestamp: new Date('2026-06-15T15:01:00') },
  { agentCode: 'D02', modelUsed: 'dall-e-3', tokensIn: 800, tokensOut: 200, latencyMs: 18000, timestamp: new Date('2026-06-15T15:06:00') },
  { agentCode: 'E01', modelUsed: 'gpt-4o-mini', tokensIn: 2200, tokensOut: 480, latencyMs: 3200, timestamp: new Date('2026-06-15T15:24:00') },
];

// ─── Eval Criteria Breakdown (for Debug View — ci-001 Cold Brew) ─────────────
export const EVAL_CRITERIA_CI001: EvalCriterion[] = [
  { name: 'brand_voice', label: 'Brand Voice', score: 8.5, maxScore: 10, passed: true },
  { name: 'content_accuracy', label: 'Nội dung chính xác', score: 8.0, maxScore: 10, passed: true },
  { name: 'platform_fit', label: 'Phù hợp platform', score: 8.2, maxScore: 10, passed: true },
  { name: 'pillar_relevance', label: 'Đúng trụ nội dung', score: 8.0, maxScore: 10, passed: true },
  { name: 'originality', label: 'Sáng tạo', score: 8.2, maxScore: 10, passed: true },
  { name: 'visual_asset_fit', label: 'Ảnh phù hợp', score: 4.1, maxScore: 5, passed: true },
  { name: 'image_design_quality', label: 'Chất lượng thiết kế', score: 4.0, maxScore: 5, passed: true },
  { name: 'mobile_readability', label: 'Đọc được trên mobile', score: 4.2, maxScore: 5, passed: true },
];

// ─── Live Agent Log Entries (for terminal display) ───────────────────────────
export const LIVE_AGENT_LOGS = [
  { time: '10:45:12', agent: 'E01', type: 'INFO' as const, msg: 'Evaluator scoring "Cold Brew Mùa Hè"... Caption: 8.2/10, Visual: 4.1/5.0. PASSED ✓' },
  { time: '10:45:05', agent: 'D02', type: 'SUCCESS' as const, msg: 'Image selected for "Cold Brew Mùa Hè" — source: real_photo, tags: [cold brew, đồ uống, mùa hè]' },
  { time: '10:44:48', agent: 'D01', type: 'SUCCESS' as const, msg: 'Caption generated: 145 words, Tone: Warm & Authentic. Hashtags: #BardinhCoffee #ColdBrew' },
  { time: '10:44:20', agent: 'A01', type: 'FSM' as const, msg: 'State transition ci-001: visual_generating → evaluating → pending_content_approval' },
  { time: '10:43:10', agent: 'B03', type: 'INFO' as const, msg: 'Content plan generated for week 25: 6 items across FB/IG, optimized posting times applied' },
  { time: '10:42:05', agent: 'E01', type: 'WARN' as const, msg: 'Eval FAILED for "Combo Ăn Sáng" — score 6.2/10. failed_criteria: [brand_voice, content_accuracy]. Routing retry → D01' },
  { time: '10:41:30', agent: 'A01', type: 'FSM' as const, msg: 'Retry routing: ci-004 eval_failed → D01 (brand_voice fix). eval_retry_count: 1/3' },
  { time: '10:40:15', agent: 'D02', type: 'INFO' as const, msg: 'Source-guided visual generated for "Bạc Xỉu Kem Trứng".' },
];
