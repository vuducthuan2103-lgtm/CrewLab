import { AgentCode, ContentItem, ContentPillar, TaskCard } from './types';
import { getISOWeekNumber } from './dateUtils';

export interface AgentInfo {
  code: AgentCode;
  name: string;
  role: string;
  shortDesc: string;
  fullDesc: string;
  defaultModel: string;
  colorClass: string;
  borderClass: string;
  badgeClass: string;
}

export const AGENT_REGISTRY: Record<string, AgentInfo> = {
  A01: {
    code: 'A01',
    name: 'Orchestrator',
    role: 'Chỉ huy & Điều phối',
    shortDesc: 'Quản lý tiến độ và tự động hóa toàn bộ quy trình',
    fullDesc: 'Agent hạt nhân chịu trách nhiệm điều phối toàn bộ 5 agent còn lại, giám sát chu kỳ tuần, xử lý hàng đợi và kích hoạt các bước tạo nội dung.',
    defaultModel: 'claude-3-5-sonnet',
    colorClass: 'text-zinc-200',
    borderClass: 'border-zinc-700',
    badgeClass: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  },
  B02: {
    code: 'B02',
    name: 'Content Pillar',
    role: 'Chiến lược Trụ cột',
    shortDesc: 'Xác định 5 trụ cột nội dung và tỷ lệ phân bổ kênh',
    fullDesc: 'Phân tích định vị thương hiệu F&B để kiến tạo 5 trụ cột nội dung cốt lõi, đề xuất góc tiếp cận (angles) phù hợp với khách hàng mục tiêu.',
    defaultModel: 'deepseek-v3',
    colorClass: 'text-zinc-200',
    borderClass: 'border-zinc-700',
    badgeClass: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  },
  B03: {
    code: 'B03',
    name: 'Content Plan',
    role: 'Kế hoạch Nội dung',
    shortDesc: 'Lập lịch phát hành bài viết và phân bổ ngày giờ tối ưu',
    fullDesc: 'Chuyển đổi các trụ cột nội dung thành kế hoạch phát hành chi tiết 7 ngày trong tuần, xác định khung giờ vàng tương tác cho Facebook & Instagram.',
    defaultModel: 'gpt-4o-mini',
    colorClass: 'text-zinc-200',
    borderClass: 'border-zinc-700',
    badgeClass: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  },
  D01: {
    code: 'D01',
    name: 'Caption Writer',
    role: 'Sáng tạo Caption',
    shortDesc: 'Biên soạn bài viết chuẩn Brand Voice và thông điệp F&B',
    fullDesc: 'Sáng tạo nội dung bài đăng chi tiết với tiêu đề cuốn hút, thân bài giàu cảm xúc, CTA kích thích hành động và bộ hashtag tối ưu.',
    defaultModel: 'gpt-4o-mini',
    colorClass: 'text-zinc-200',
    borderClass: 'border-zinc-700',
    badgeClass: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  },
  D02: {
    code: 'D02',
    name: 'Image Design',
    role: 'Thiết kế Hình ảnh',
    shortDesc: 'Phối cảnh visual và xử lý đồ họa nhận diện thương hiệu',
    fullDesc: 'Xử lý hình ảnh sản phẩm từ thư viện tư liệu, kết hợp AI để tạo ảnh đồ ăn, đồ uống chân thực và bắt mắt nhất.',
    defaultModel: 'gpt-4o-mini',
    colorClass: 'text-zinc-200',
    borderClass: 'border-zinc-700',
    badgeClass: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  },
  E01: {
    code: 'E01',
    name: 'Quality Evaluator',
    role: 'Thẩm định Chất lượng',
    shortDesc: 'Đánh giá độ chuẩn thương hiệu và chấm điểm trước khi duyệt',
    fullDesc: 'Đóng vai trò QA độc lập, kiểm tra chặt chẽ tính chính xác, quy tắc Brand Voice (Do/Don\'t) và chấm điểm bài viết trước khi gửi khách hàng duyệt.',
    defaultModel: 'gpt-4o-mini',
    colorClass: 'text-zinc-200',
    borderClass: 'border-zinc-700',
    badgeClass: 'bg-zinc-800 text-zinc-200 border-zinc-700',
  },
  HUMAN: {
    code: 'HUMAN',
    name: 'Khách hàng',
    role: 'Phê duyệt & Xuất bản',
    shortDesc: 'Kiểm tra và bấm nút duyệt bài',
    fullDesc: 'Bạn là người kiểm duyệt cuối cùng để đảm bảo mọi bài viết và hình ảnh hoàn toàn ưng ý trước khi xuất bản.',
    defaultModel: 'Client HITL',
    colorClass: 'text-lime-brand',
    borderClass: 'border-lime-500/40',
    badgeClass: 'bg-lime-500/10 text-lime-brand border-lime-500/30',
  },
};

export interface SubtaskStep {
  id: string;
  title: string;
  status: 'done' | 'in_progress' | 'pending' | 'failed';
  description?: string;
  timeSpent?: string;
}

/**
 * Định dạng thời gian tương đối hoặc tuyệt đối rõ ràng
 */
export function formatRelativeTime(date?: Date | null): string {
  if (!date) return 'Vừa xong';
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  if (diffHours < 24) {
    return `Hôm nay, ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} • ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Định dạng ngày giờ lên lịch đăng bài
 */
export function formatScheduleDate(date?: Date | null): string {
  if (!date) return 'Chưa lên lịch';
  const d = new Date(date);
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = days[d.getDay()];
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return `${dayName} (${dateStr}) lúc ${timeStr}`;
}

/**
 * Chuyển đổi tên task kỹ thuật thành ngôn ngữ công việc thực tế, thân thiện với người dùng
 */
export function humanizeTaskTitle(
  agentCode: string,
  rawTaskType: string,
  linkedItem?: ContentItem | null
): string {
  const itemTopic = linkedItem?.title ? `"${linkedItem.title}"` : '';

  switch (agentCode) {
    case 'B02':
      return 'Nghiên cứu & Xây dựng 5 Content Pillars tuần';
    case 'B03':
      return 'Lập Kế hoạch & Lịch phát hành nội dung tuần';
    case 'D01':
      return itemTopic
        ? `Sáng tạo Caption & Thông điệp bài: ${itemTopic}`
        : 'Biên soạn bài viết & tối ưu thông điệp truyền thông';
    case 'D02':
      return itemTopic
        ? `Thiết kế Visual & Phối cảnh hình ảnh: ${itemTopic}`
        : 'Thiết kế & Xử lý đồ họa nhận diện thương hiệu';
    case 'E01':
      return itemTopic
        ? `Thẩm định chất lượng & Brand Voice: ${itemTopic}`
        : 'Thẩm định chất lượng bài viết & kiểm tra tiêu chuẩn';
    case 'A01':
      return 'Điều phối & Lập lịch công việc tự động';
    case 'HUMAN':
      return itemTopic
        ? `Duyệt nội dung & hình ảnh bài: ${itemTopic}`
        : 'Duyệt nội dung chuẩn bị xuất bản';
    default:
      return rawTaskType || 'Tác vụ xử lý tự động';
  }
}

/**
 * Tạo danh sách các công việc nhỏ (subtasks) thực tế dựa trên loại task
 */
export function getSubtasksForTask(
  task: TaskCard,
  linkedItem?: ContentItem | null
): SubtaskStep[] {
  const isDone = task.column === 'done';
  const isInProgress = task.column === 'in_progress';
  const isReview = task.column === 'review';
  const isFailed = task.hasError || linkedItem?.state === 'eval_failed';
  const isVisualBlocked = Array.isArray(linkedItem?.failedCriteria) && linkedItem.failedCriteria.includes('visual_generation_unavailable');

  switch (task.assigneeCode) {
    case 'B02':
      return [
        {
          id: 'step-1',
          title: 'Thu thập Brand Voice & định vị sản phẩm',
          status: isDone || isInProgress ? 'done' : 'in_progress',
          description: 'Trích xuất thông điệp cốt lõi và phong cách giao tiếp của quán',
          timeSpent: '1.2s',
        },
        {
          id: 'step-2',
          title: 'Phân tích xu hướng ẩm thực & F&B trong tuần',
          status: isDone ? 'done' : isInProgress ? 'in_progress' : 'pending',
          description: 'Nắm bắt các dịp đặc biệt, thời tiết và xu hướng ăn uống',
          timeSpent: '2.5s',
        },
        {
          id: 'step-3',
          title: 'Thiết lập 5 Trụ cột nội dung (Content Pillars)',
          status: isDone ? 'done' : 'pending',
          description: 'Định hình tỷ lệ phân bổ: Giới thiệu món, Trải nghiệm, Khuyến mãi, Hậu trường, Tương tác',
          timeSpent: '4.1s',
        },
        {
          id: 'step-4',
          title: 'Phát triển các góc tiếp cận (Content Angles)',
          status: isDone ? 'done' : 'pending',
          description: 'Gợi ý 3-5 góc nhìn sáng tạo cho mỗi trụ cột',
          timeSpent: '1.8s',
        },
      ];

    case 'B03':
      return [
        {
          id: 'step-1',
          title: 'Tiếp nhận 5 Content Pillars đã phê duyệt',
          status: 'done',
          description: 'Đối chiếu tỷ lệ phần trăm phân bổ nội dung',
        },
        {
          id: 'step-2',
          title: 'Lập lịch trình 7 ngày phát hành',
          status: isDone || isInProgress ? 'done' : 'in_progress',
          description: 'Phân chia bài đăng đều các ngày trong tuần',
        },
        {
          id: 'step-3',
          title: 'Tối ưu khung giờ đăng bài (Golden Hours)',
          status: isDone ? 'done' : isInProgress ? 'in_progress' : 'pending',
          description: 'Chọn khung 11:30 (Trưa) và 18:30 (Tối) để đạt reach cao nhất',
        },
        {
          id: 'step-4',
          title: 'Đồng bộ lịch lên Content Calendar',
          status: isDone ? 'done' : 'pending',
          description: 'Sẵn sàng kích hoạt Agent D01 & D02',
        },
      ];

    case 'D01':
      return [
        {
          id: 'step-1',
          title: 'Đọc brief đề tài & góc nhìn tiếp cận',
          status: 'done',
          description: linkedItem?.title ? `Đề tài: "${linkedItem.title}"` : 'Đọc yêu cầu bài đăng',
        },
        {
          id: 'step-2',
          title: 'Soạn thảo Tiêu đề thu hút & Thân bài (Caption)',
          status: isDone || isReview || linkedItem?.caption ? 'done' : isFailed ? 'failed' : 'in_progress',
          description: 'Ứng dụng Brand Voice, văn phong tự nhiên, đúng cá tính thương hiệu',
        },
        {
          id: 'step-3',
          title: 'Đính kèm Call-To-Action & Tối ưu Hashtags',
          status: isDone || isReview || linkedItem?.caption ? 'done' : isFailed ? 'failed' : isInProgress ? 'in_progress' : 'pending',
          description: 'Kêu gọi đặt bàn / ghé quán kèm bộ hashtag địa phương',
        },
      ];

    case 'D02':
      return [
        {
          id: 'step-1',
          title: 'Phân tích thông điệp bài viết & định hướng hình ảnh',
          status: 'done',
          description: 'Xác định mood & tone, góc chụp sản phẩm',
        },
        {
          id: 'step-2',
          title: 'Khởi tạo & Phối cảnh hình ảnh AI',
          status: isDone || isReview || linkedItem?.imageUrl ? 'done' : isFailed ? 'failed' : isInProgress ? 'in_progress' : 'pending',
          description: isFailed
            ? (linkedItem?.fixInstructions || 'Tài khoản OpenAI đã hết credit tạo ảnh. Bạn có thể duyệt bài dạng text hoặc tự bổ sung ảnh.')
            : 'Chọn lọc ảnh chụp thực tế hoặc tạo ảnh AI độ nét cao',
        },
        {
          id: 'step-3',
          title: 'Xử lý visual, căn chỉnh tỉ lệ & màu sắc nhận diện',
          status: isDone || isReview || linkedItem?.imageUrl ? 'done' : isFailed ? 'pending' : isInProgress ? 'in_progress' : 'pending',
          description: 'Tối ưu khung hình vuông/dọc cho Facebook & Instagram',
        },
      ];

    case 'E01':
      if (isVisualBlocked) {
        return [
          {
            id: 'step-1',
            title: 'Sáng tạo nội dung Caption (D01)',
            status: 'done',
            description: 'Caption đã soạn thảo hoàn tất đạt chuẩn giọng điệu thương hiệu',
          },
          {
            id: 'step-2',
            title: 'Tạo hình ảnh AI (D02)',
            status: 'failed',
            description: linkedItem?.fixInstructions || 'Tài khoản OpenAI đã hết credit tạo ảnh. Bạn có thể duyệt bài viết này dạng text.',
          },
          {
            id: 'step-3',
            title: 'Sẵn sàng kiểm duyệt bài viết',
            status: linkedItem?.caption ? 'done' : 'pending',
            description: 'Nội dung đã hoàn tất để bạn kiểm tra và phê duyệt',
          },
        ];
      }
      return [
        {
          id: 'step-1',
          title: 'Kiểm tra quy tắc cấm kỵ (Forbidden Words & Do/Don\'t)',
          status: 'done',
          description: 'Đảm bảo không vi phạm từ ngữ cấm và chính sách quảng cáo',
        },
        {
          id: 'step-2',
          title: 'Đánh giá độ khớp giọng điệu thương hiệu (Brand Voice Match)',
          status: isDone || isReview ? 'done' : isFailed ? 'failed' : 'in_progress',
          description: isFailed
            ? (linkedItem?.fixInstructions || 'Chưa đạt điểm chuẩn Brand Voice, cần điều chỉnh lại')
            : 'Chấm điểm tính tự nhiên, độ gần gũi và hấp dẫn',
        },
        {
          id: 'step-3',
          title: 'Xuất điểm thẩm định & Đẩy lên hàng chờ khách duyệt',
          status: isDone || isReview ? 'done' : 'pending',
          description: isFailed ? 'Tạm dừng xuất bản' : 'Thẩm định hoàn tất với kết quả đạt chuẩn chất lượng',
        },
      ];

    case 'HUMAN':
      return [
        {
          id: 'step-1',
          title: 'Xem trước nội dung và ảnh minh họa',
          status: isDone ? 'done' : 'in_progress',
          description: 'Kiểm tra sự phù hợp với thực tế tại quán',
        },
        {
          id: 'step-2',
          title: 'Chỉnh sửa trực tiếp (nếu cần)',
          status: isDone ? 'done' : 'pending',
          description: 'Sửa nhanh câu từ hoặc thay đổi giờ đăng',
        },
        {
          id: 'step-3',
          title: 'Phê duyệt & Sẵn sàng xuất bản',
          status: isDone ? 'done' : 'pending',
          description: 'Đưa bài viết vào trạng thái sẵn sàng phát hành',
        },
      ];

    default:
      return [
        {
          id: 'step-1',
          title: 'Khởi tạo quy trình',
          status: 'done',
        },
        {
          id: 'step-2',
          title: 'Thực thi tác vụ AI',
          status: isDone ? 'done' : isInProgress ? 'in_progress' : 'pending',
        },
        {
          id: 'step-3',
          title: 'Lưu kết quả vào hệ thống',
          status: isDone ? 'done' : 'pending',
        },
      ];
  }
}

/**
 * Tạo danh sách các công việc Marketing hợp nhất (Unified Work Board Tasks)
 * Lọc sạch log hệ thống, gắn mốc thời gian, loại bỏ trùng lặp và phản ánh đúng trạng thái thực tế
 */
export function generateUnifiedWorkBoardTasks(
  rawTasks: TaskCard[],
  contentItems: ContentItem[],
  pillars: ContentPillar[],
  weekApproved: boolean
): TaskCard[] {
  const result: TaskCard[] = [];

  // Tìm task B02 gần nhất trong log
  const b02Logs = rawTasks.filter((t) => t.assigneeCode === 'B02');
  const latestB02 = b02Logs[0];
  const hasPillars = pillars.length > 0;
  const isB02Running = latestB02?.column === 'in_progress';

  // 1. Task Chiến lược B02
  result.push({
    id: 'milestone-b02-pillar',
    title: 'Nghiên cứu & Xây dựng 5 Content Pillars tuần',
    assigneeType: 'agent',
    assigneeCode: 'B02',
    desk: 'strategy',
    column: hasPillars ? 'done' : isB02Running ? 'in_progress' : 'todo',
    linkedContentItemId: null,
    retryCount: 0,
    hasError: Boolean(latestB02?.hasError && !hasPillars),
    errorMessage: latestB02?.errorMessage,
    slaDeadline: null,
    createdAt: latestB02?.createdAt || new Date(),
    startedAt: latestB02?.startedAt || new Date(),
    completedAt: hasPillars ? (latestB02?.completedAt || new Date()) : null,
    timeLabel: hasPillars
      ? `Đã tạo ${pillars.length} trụ cột (${formatRelativeTime(latestB02?.completedAt || latestB02?.createdAt)})`
      : isB02Running
      ? 'Đang phân tích Brand Voice...'
      : 'Chờ lên lịch',
    durationLabel: hasPillars ? 'Hoàn thành' : isB02Running ? 'Đang chạy' : undefined,
    weekNumber: getISOWeekNumber(latestB02?.createdAt || new Date()),
  });

  // 2. Task Kế hoạch tuần B03
  const b03Logs = rawTasks.filter((t) => t.assigneeCode === 'B03');
  const latestB03 = b03Logs[0];
  const isB03Running = latestB03?.column === 'in_progress';
  const hasPlan = contentItems.length > 0;

  result.push({
    id: 'milestone-b03-plan',
    title: 'Lập Kế hoạch & Lịch phát hành nội dung 7 ngày',
    assigneeType: 'agent',
    assigneeCode: 'B03',
    desk: 'strategy',
    column: weekApproved ? 'done' : hasPlan ? 'review' : isB03Running ? 'in_progress' : 'todo',
    linkedContentItemId: null,
    retryCount: 0,
    hasError: Boolean(latestB03?.hasError && !hasPlan),
    errorMessage: latestB03?.errorMessage,
    slaDeadline: null,
    createdAt: latestB03?.createdAt || new Date(),
    startedAt: latestB03?.startedAt || new Date(),
    completedAt: weekApproved ? (latestB03?.completedAt || new Date()) : null,
    timeLabel: weekApproved
      ? `Kế hoạch tuần đã duyệt (${formatRelativeTime(latestB03?.completedAt)})`
      : hasPlan
      ? 'Kế hoạch đã sẵn sàng • Chờ duyệt'
      : isB03Running
      ? 'Đang tính toán giờ vàng...'
      : 'Chờ hoàn thành Pillar',
    durationLabel: weekApproved ? 'Đã duyệt' : hasPlan ? 'Cần duyệt' : undefined,
    weekNumber: getISOWeekNumber(latestB03?.createdAt || new Date()),
  });

  // 3. Các đầu việc tương ứng với từng Bài viết trong tuần
  contentItems.forEach((item) => {
    const pillar = pillars.find((p) => p.id === item.pillarId);
    const scheduleStr = formatScheduleDate(item.publishTime);

    let assignee: AgentCode = 'D01';
    let col: TaskCard['column'] = 'todo';
    let title = `Sáng tạo Caption bài: "${item.title}"`;
    let timeLabel = `Dự kiến: ${scheduleStr}`;
    let durationLabel: string | undefined = undefined;

    switch (item.state) {
      case 'planned':
        assignee = 'B03';
        col = 'todo';
        title = `Lên lịch bài viết: "${item.title}"`;
        timeLabel = `Đăng: ${scheduleStr}`;
        break;

      case 'ready_for_generation':
        assignee = 'D01';
        col = 'todo';
        title = `Chuẩn bị viết bài: "${item.title}"`;
        timeLabel = `Lên lịch đăng: ${scheduleStr}`;
        break;

      case 'caption_generating':
        assignee = 'D01';
        col = 'in_progress';
        title = `D01 đang viết Caption: "${item.title}"`;
        timeLabel = 'AI đang soạn thảo nội dung...';
        durationLabel = 'Đang chạy';
        break;

      case 'visual_matching':
        assignee = 'D02';
        col = 'in_progress';
        title = `D02 đang xử lý hình ảnh: "${item.title}"`;
        timeLabel = 'AI đang phối cảnh & chọn ảnh...';
        durationLabel = 'Đang chạy';
        break;

      case 'evaluating':
        assignee = 'E01';
        col = 'in_progress';
        title = `E01 đang thẩm định chất lượng: "${item.title}"`;
        timeLabel = 'Đang kiểm tra Brand Voice & tiêu chuẩn...';
        durationLabel = 'Thẩm định';
        break;

      case 'eval_failed':
        const isVisualBlocked = Array.isArray(item.failedCriteria) && item.failedCriteria.includes('visual_generation_unavailable');
        assignee = isVisualBlocked ? 'D02' : 'E01';
        col = item.caption ? 'review' : 'todo';
        title = isVisualBlocked
          ? `Tạm dừng tạo ảnh AI (Hết credit): "${item.title}"`
          : `Thẩm định cần điều chỉnh: "${item.title}"`;
        timeLabel = isVisualBlocked
          ? 'Hết credit AI tạo ảnh • Bạn có thể duyệt dùng caption'
          : (item.fixInstructions || 'Chưa đạt chuẩn • Bấm để xem chi tiết');
        durationLabel = isVisualBlocked ? 'Lỗi credit' : 'Chưa đạt';
        break;

      case 'pending_content_approval':
        assignee = 'HUMAN';
        col = 'review';
        title = `Duyệt bài viết: "${item.title}"`;
        timeLabel = `Đã thẩm định chuẩn • Đăng: ${scheduleStr}`;
        durationLabel = 'Cần bạn duyệt';
        break;

      case 'approved_ready_to_post':
        assignee = 'HUMAN';
        col = 'done';
        title = `Đã duyệt — Lên lịch: "${item.title}"`;
        timeLabel = `Sẵn sàng phát hành: ${scheduleStr}`;
        durationLabel = 'Đã duyệt';
        break;

      case 'posted':
        assignee = 'HUMAN';
        col = 'done';
        title = `Đã xuất bản: "${item.title}"`;
        timeLabel = `Đã đăng thành công (${formatRelativeTime(item.publishTime)})`;
        durationLabel = 'Đã đăng';
        break;

      case 'rejected':
        assignee = 'HUMAN';
        col = 'todo';
        title = `Yêu cầu viết lại: "${item.title}"`;
        timeLabel = 'Đã chuyển phản hồi cho AI';
        durationLabel = 'Chờ làm lại';
        break;
    }

    result.push({
      id: `item-task-${item.id}`,
      title,
      assigneeType: assignee === 'HUMAN' ? 'human' : 'agent',
      assigneeCode: assignee,
      desk: assignee === 'D01' || assignee === 'D02' ? 'creative' : assignee === 'E01' ? 'qa' : 'strategy',
      column: col,
      linkedContentItemId: item.id,
      retryCount: item.eval_retry_count || 0,
      hasError: item.state === 'eval_failed',
      errorMessage: item.state === 'eval_failed' ? 'Cần thẩm định lại tiêu chuẩn' : undefined,
      slaDeadline: item.publishTime || null,
      createdAt: item.publishTime || new Date(),
      startedAt: new Date(),
      completedAt: col === 'done' ? (item.publishTime || new Date()) : null,
      timeLabel,
      durationLabel,
      pillarLabel: pillar?.label || 'Chung',
      platform: item.platform,
      weekNumber: item.weekNumber || getISOWeekNumber(item.publishTime || new Date()),
    });
  });

  return result;
}

/**
 * Tính toán thống kê Token và Quota cho từng Agent
 */
export function getAgentStats(
  agentCode: string,
  allTasks: TaskCard[],
  modelName?: string,
  tierName?: string,
  budgetUSD: number = 20
) {
  const agentTasks = allTasks.filter((t) => t.assigneeCode === agentCode);
  const doneTasks = agentTasks.filter((t) => t.column === 'done');
  const inProgressTasks = agentTasks.filter((t) => t.column === 'in_progress');
  const todoTasks = agentTasks.filter((t) => t.column === 'todo');

  let realTokensIn = 0;
  let realTokensOut = 0;
  agentTasks.forEach((t) => {
    realTokensIn += t.tokensIn || 0;
    realTokensOut += t.tokensOut || 0;
  });

  const totalTokens = (realTokensIn + realTokensOut) > 0
    ? (realTokensIn + realTokensOut)
    : (doneTasks.length * (agentCode === 'B02' ? 3200 : agentCode === 'D01' ? 2400 : agentCode === 'D02' ? 1800 : agentCode === 'E01' ? 1600 : 1200) + (inProgressTasks.length > 0 ? 800 : 0));

  const tokensIn = realTokensIn > 0 ? realTokensIn : Math.round(totalTokens * 0.4);
  const tokensOut = realTokensOut > 0 ? realTokensOut : Math.round(totalTokens * 0.6);

  const budget = budgetUSD > 0 ? budgetUSD : 20;
  const maxTokens = Math.max(50000, Math.round(budget * 200000));
  const usedPercent = Math.min(100, Math.round((totalTokens / maxTokens) * 100));
  const remainingPercent = Math.max(0, 100 - usedPercent);

  // Lấy model từ cấu hình backend hoặc từ TaskLog thực tế
  const latestTaskWithModel = agentTasks.find((t) => t.modelUsed);
  const resolvedModel = modelName || latestTaskWithModel?.modelUsed || AGENT_REGISTRY[agentCode]?.defaultModel || 'gpt-4o-mini';

  return {
    model: resolvedModel,
    tier: tierName || 'standard',
    budgetUSD: budget,
    tokensIn,
    tokensOut,
    totalTokens,
    usedPercent,
    remainingPercent,
    taskCount: {
      total: agentTasks.length,
      done: doneTasks.length,
      inProgress: inProgressTasks.length,
      todo: todoTasks.length,
    },
    activeTask: inProgressTasks[0] || null,
    queuedTasks: todoTasks,
    completedTasks: doneTasks,
  };
}
