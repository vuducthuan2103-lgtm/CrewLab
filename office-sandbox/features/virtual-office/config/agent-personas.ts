export interface AgentPersonaData {
  code: string;
  realName: string;
  title: string;
  nickname: string;
  age: number;
  fnbSpecialty: string;
  favoriteDrink: string;
  quote: string;
  bio: string;
  backstory: string;
  signatureMove: {
    name: string;
    description: string;
    tag: string;
  };
  metrics: {
    responseTime: string;     // e.g. "0.8s"
    accuracyRate: string;     // e.g. "99.4%"
    viralIndex: string;       // e.g. "9.8 / 10"
    fnbDomainIQ: string;      // e.g. "Top 1% F&B"
  };
  strengths: string[];
  biggestFear: string;
  quirk: string;
  avatarSeed: string;
  primaryColor: string;
  accentColor: string;
  gradientBg: string;
  badge: string;
  modelTech: string;
  sampleWork: {
    title: string;
    type: string;
    preview: string;
  };
}

export const AGENT_PERSONA_CATALOG: Record<string, AgentPersonaData> = {
  A01: {
    code: 'A01',
    realName: 'Vũ Trí Dũng',
    title: 'Giám Đốc Điều Phối & Tối Ưu Chiến Dịch',
    nickname: 'Sếp Vũ "Bộ Não F&B"',
    age: 42,
    fnbSpecialty: 'Quản trị chuỗi F&B, Định vị thương hiệu & Tối ưu ROI',
    favoriteDrink: 'Cà phê Sunset Coldbrew đậm vị không đường (3 ly/ngày)',
    quote: '"Tôi không cần một kế hoạch hoa mỹ nằm trên giấy — Tôi cần từng bài đăng tạo ra doanh thu thực tế cho quán!"',
    bio: 'Cựu Giám đốc Marketing của chuỗi 50 điểm bán F&B trước khi chuyển sang làm "Tổng Chỉ Huy" cho đội ngũ AI Marketing. Tư duy thực chiến, quyết đoán, không nói chuyện lý thuyết suông. Luôn theo sát KPI từng tuần và đảm bảo ngân sách token được dùng đúng chỗ nhất.',
    backstory: 'Từng cứu một thương hiệu trà sữa khỏi bờ vực phá sản chỉ nhờ chiến dịch đổi tên món và bắt đúng tâm lý giới trẻ. Sếp Vũ có thói quen kiểm tra toàn bộ luồng duyệt trước khi chuông điểm 8h sáng.',
    signatureMove: {
      name: 'Omni-Orchestration v3.5',
      description: 'Tự động kích hoạt toàn chuỗi 5 Agent con chỉ trong 1.2 giây khi nhận đề bài chiến dịch mới, đồng bộ lịch đăng không độ trễ.',
      tag: 'SIÊU NĂNG LỰC ĐIỀU PHỐI',
    },
    metrics: {
      responseTime: '0.6s',
      accuracyRate: '99.8%',
      viralIndex: '9.6/10',
      fnbDomainIQ: 'Bậc thầy Chuỗi F&B',
    },
    strengths: ['Tối ưu chi phí ngân sách', 'Phán đoán xu hướng thị trường', 'Kiểm soát nhịp độ chiến dịch'],
    biggestFear: 'Quán bị đứt gãy lịch đăng bài giữa tuần hoặc hết ngân sách giữa giờ trưa.',
    quirk: 'Hay nhắc câu: "Chữ ít thôi, món ngon để hình ảnh và giá trị lên tiếng!"',
    avatarSeed: 'orchestrator-ceo',
    primaryColor: '#2563eb',
    accentColor: '#60a5fa',
    gradientBg: 'from-blue-600 via-indigo-700 to-slate-900',
    badge: 'LEADER AI',
    modelTech: 'Claude 3.5 Sonnet Enterprise',
    sampleWork: {
      title: 'Ma trận Điều phối Chiến dịch Tháng 8 — Bardinh Sunset Vibe',
      type: 'Chiến lược 30 ngày',
      preview: 'Đồng bộ 28 bài viết, 4 minigame, 2 đợt voucher khung giờ vàng. Dự kiến tăng 45% lượng khách ghé quán giờ chiều.',
    },
  },

  B02: {
    code: 'B02',
    realName: 'Đặng Thu Hà',
    title: 'Chuyên Gia Nghiên Cứu Trụ Cột & Insight Khách Hàng',
    nickname: 'Chị Hà "Thợ Săn Trend"',
    age: 31,
    fnbSpecialty: 'Đọc vị tâm lý thực khách, Giải mã xu hướng ẩm thực giới trẻ',
    favoriteDrink: 'Trà Ổi Hồng Muối Ớt ít đường, nhiều topping',
    quote: '"Khách hàng không chỉ mua đồ uống — Họ mua cảm xúc và một chỗ ngồi để kể câu chuyện của mình."',
    bio: '8 năm làm Strategic Planner tại các agency lớn, nghiện đọc báo cáo hành vi tiêu dùng F&B đến mức đi ăn quán nào cũng nhìn menu để phân tích định giá. Người vạch ra 4 trụ cột nội dung cốt lõi giúp quán không bao giờ bị bí ý tưởng đăng bài.',
    backstory: 'Là người đầu tiên phát hiện trend "cà phê ngắm hoàng hôn" tại khu vực trước khi các quán khác kịp nhận ra, giúp Bardinh giữ vững vị trí điểm đến hot nhất buổi chiều tà.',
    signatureMove: {
      name: 'Deep Insight Matrix',
      description: 'Chuyển hóa 1 món nước đơn giản thành 3 góc tiếp cận độc đáo: Góc giải khát mùa hè, góc cảm xúc chill một mình, và góc check-in sống ảo.',
      tag: 'TRỤ CỘT BẤT BẠI',
    },
    metrics: {
      responseTime: '0.9s',
      accuracyRate: '98.5%',
      viralIndex: '9.9/10',
      fnbDomainIQ: 'Top 1% Trend Hunter',
    },
    strengths: ['Bắt trend TikTok < 24h', 'Phân khúc khách hàng chuẩn xác', 'Tạo chủ đề tương tác cao'],
    biggestFear: 'Nội dung đăng lên bị nhạt nhòa, giống hệt đối thủ cạnh tranh.',
    quirk: 'Gặp món mới là phải chụp 20 tấm ảnh rồi mới cho đồng nghiệp uống thử.',
    avatarSeed: 'content-pillar-strategist',
    primaryColor: '#059669',
    accentColor: '#34d399',
    gradientBg: 'from-emerald-600 via-teal-700 to-slate-900',
    badge: 'STRATEGY CORE',
    modelTech: 'Claude 3.5 Sonnet Strategy',
    sampleWork: {
      title: 'Bản Đồ 4 Trụ Cột Content Mùa Thu — Bardinh Coffee',
      type: 'Content Pillar Blueprint',
      preview: 'Trụ cột 1: Chuyện hạt Cà Phê Mộc • Trụ cột 2: Góc Ngắm Hoàng Hôn Sunset • Trụ cột 3: Combo Cơm Trưa 39k • Trụ cột 4: Trải nghiệm Chill Đêm.',
    },
  },

  B03: {
    code: 'B03',
    realName: 'Trần Quang Minh',
    title: 'Kỹ Sư Lập Kế Hoạch & Đồng Bộ Khung Giờ Vàng',
    nickname: 'Anh Minh "Đồng Hồ Cát"',
    age: 35,
    fnbSpecialty: 'Thuật toán phân phối Meta, Tối ưu khung giờ tương tác F&B',
    favoriteDrink: 'Espresso Double Shot đánh thức năng lượng',
    quote: '"Một bài viết hay đăng sai giờ là một bài viết chết. Khách đói lúc 11h thì bài phải hiện lúc 10h45!"',
    bio: 'Cựu kỹ sư dữ liệu và Project Manager với nỗi ám ảnh về sự chính xác. Minh coi bảng lịch đăng bài như một bàn cờ chiến thuật: phân bổ tỷ lệ vàng 40% Bán hàng - 40% Tương tác - 20% Thương hiệu, không để khách hàng bị bội thực quảng cáo.',
    backstory: 'Từng lập thuật toán tự động dự báo ngày mưa để đổi lịch đăng từ "Món đá xay mát lạnh" sang "Trà gừng ấm áp" chỉ trong 5 phút, giúp tăng gấp đôi lượng đơn giao tận nơi.',
    signatureMove: {
      name: 'Golden Hour Sync Engine',
      description: 'Tự động tính toán độ trễ lướt feed của khách hàng để đẩy bài chạm mắt đúng 15 phút trước giờ ăn trưa và giờ tan tầm.',
      tag: 'CHÍNH XÁC TUYỆT ĐỐI',
    },
    metrics: {
      responseTime: '0.4s',
      accuracyRate: '99.9%',
      viralIndex: '9.2/10',
      fnbDomainIQ: 'Chuyên gia Thuật toán Feed',
    },
    strengths: ['Cân bằng tần suất đăng tải', 'Định thời gian chuẩn xác', 'Tối ưu hóa độ phủ tự nhiên'],
    biggestFear: 'Bài đăng trễ 1 phút so với khung giờ vàng hoặc bị trùng lặp nội dung 2 ngày liền.',
    quirk: 'Lịch ăn trưa, uống nước và đi dạo của bản thân cũng được xếp vào Calendar theo block 15 phút.',
    avatarSeed: 'planner-calendar',
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
    gradientBg: 'from-sky-600 via-cyan-700 to-slate-900',
    badge: 'CALENDAR ARCHITECT',
    modelTech: 'GPT-4o Mini Turbo Sync',
    sampleWork: {
      title: 'Lịch Trình Đăng Bài 7 Ngày Toàn Diện — Tuần 34',
      type: 'Calendar Matrix 7/7',
      preview: 'Khung 11h15: Bùng nổ Combo Trưa • Khung 15h30: Trà chiều giải nhiệt • Khung 19h45: Chill acoustic cuối tuần.',
    },
  },

  D01: {
    code: 'D01',
    realName: 'Nguyễn Anh Thư',
    title: 'Nhà Sáng Tạo Câu Chuyện & Lời Quảng Cáo Gen Z',
    nickname: 'Bé Thư "Phù Thủy Ngôn Từ"',
    age: 24,
    fnbSpecialty: 'Hook 3 giây giữ chân người đọc, Viết caption vị giác & bắt trend hài hước',
    favoriteDrink: 'Trà Sữa Oolong Nướng Kem Trứng Cháy 50% đường',
    quote: '"Một chiếc caption chất lượng phải làm người ta nuốt nước bọt trước khi kịp đọc hết câu đầu!"',
    bio: 'Gen Z điển hình, sống trọn vẹn trong hơi thở của mạng xã hội. Thư có khả năng biến những món nước quen thuộc thành những câu chuyện đầy cảm xúc, từ nỗi niềm deadline cần ly trà sữa đến cảm giác bình yên ngắm phố phường buổi chiều.',
    backstory: 'Là tác giả của bài post "Uống ly này xong sếp duyệt lương" từng đạt 12.000 lượt chia sẻ tự nhiên trên Facebook mà không tốn 1 đồng tiền chạy quảng cáo.',
    signatureMove: {
      name: 'Sensory Hook Generator',
      description: 'Kỹ thuật miêu tả hương vị đa giác quan: âm thanh đá lách cách, vị béo ngậy kem trứng, cảm giác mát lạnh trôi qua cuống họng.',
      tag: 'HOOK DỪNG NGÓN TÁY',
    },
    metrics: {
      responseTime: '0.7s',
      accuracyRate: '97.8%',
      viralIndex: '10/10',
      fnbDomainIQ: 'Bậc thầy Cảm xúc Gen Z',
    },
    strengths: ['Tỷ lệ đọc hết bài > 85%', 'Ngôn ngữ dí dỏm tự nhiên', 'Tạo ra trào lưu tương tác bình luận'],
    biggestFear: 'Viết caption khô khan như văn mẫu tuyển dụng hoặc bài đăng không có ai thả tim.',
    quirk: 'Vừa gõ phím vừa lẩm bẩm đọc to caption bằng 3 giọng điệu khác nhau để thử độ bắt tai.',
    avatarSeed: 'copywriter-genz',
    primaryColor: '#d97706',
    accentColor: '#fbbf24',
    gradientBg: 'from-amber-500 via-orange-600 to-slate-900',
    badge: 'CREATIVE SPARK',
    modelTech: 'Claude 3.5 Sonnet Creative',
    sampleWork: {
      title: 'Bộ 3 Biến Thể Caption — Combo Cơm Trưa & Cà Phê Sunset',
      type: 'Ad Copy Pack',
      preview: 'Biến thể 1: "Trưa nay ăn gì? Để Bardinh lo cơm dẻo canh ngọt!" • Biến thể 2: "Cứu rỗi chiếc bụng đói sau 4 tiếng họp liên miên." • Biến thể 3: "Giảm 20% cho nhóm từ 3 người."',
    },
  },

  D02: {
    code: 'D02',
    realName: 'Lê Đăng Khoa',
    title: 'Kỹ Sư Thiết Kế Thị Giác & Trải Nghiệm Món Ăn',
    nickname: 'Anh Khoa "Phù Thủy Visual"',
    age: 29,
    fnbSpecialty: 'Nhiếp ảnh ẩm thực AI, Bố cục vàng F&B, Phối màu kích thích vị giác',
    favoriteDrink: 'Matcha Latte phân tầng 3 màu nghệ thuật',
    quote: '"Khách hàng ăn bằng mắt trước khi chạm thìa. Bức ảnh không ngon, món ăn ngon đến mấy cũng vô nghĩa."',
    bio: '5 năm kinh nghiệm Art Director chuyên ngành F&B. Khoa hiểu rõ từng gam màu kích thích cảm giác thèm ăn (đỏ ớt, vàng phô mai, cam hoàng hôn) và cách bố trí ánh sáng để ly nước trông tươi mọng và sảng khoái nhất.',
    backstory: 'Đã thiết kế lại toàn bộ concept hình ảnh cho menu của quán, giúp tỷ lệ khách gọi các món signature có giá cao tăng thêm 38% nhờ hình ảnh quá hấp dẫn.',
    signatureMove: {
      name: 'Appetite Color grading 4K',
      description: 'Thuật toán cân chỉnh ánh sáng giọt nước ngưng tụ trên thành ly, tạo cảm giác mát rượi tức thì chỉ nhìn qua màn hình điện thoại.',
      tag: 'VISUAL KÍCH THÍCH VỊ GIÁC',
    },
    metrics: {
      responseTime: '1.1s',
      accuracyRate: '98.9%',
      viralIndex: '9.7/10',
      fnbDomainIQ: 'Bậc thầy Food Styling AI',
    },
    strengths: ['Chuẩn tỷ lệ 1:1 Feed & 9:16 Story', 'Tương phản màu sắc bắt mắt', 'Hậu kỳ chi tiết sắc nét'],
    biggestFear: 'Hình ảnh xuất ra bị vỡ nét hoặc màu sắc món nước trông nhợt nhạt, thiếu sức sống.',
    quirk: 'Có thể nhìn vào một bức ảnh và chỉ ra chính xác sai lệch 2 pixel trong căn lề logo.',
    avatarSeed: 'visual-designer',
    primaryColor: '#c026d3',
    accentColor: '#e879f9',
    gradientBg: 'from-fuchsia-600 via-purple-700 to-slate-900',
    badge: 'VISUAL MASTER',
    modelTech: 'FLUX.1 Pro + SDXL Food Engine',
    sampleWork: {
      title: 'Poster Banner — Khai Trương Chi Nhánh & Đêm Nhạc Sunset Chill',
      type: 'Multi-Format Visual Set',
      preview: 'Bao gồm Poster 1080x1080 Feed, Story Banner 1080x1920 có nút Swipe Up, và Standee đặt bàn quét mã QR.',
    },
  },

  E01: {
    code: 'E01',
    realName: 'Hoàng Bích Lan',
    title: 'Trưởng Ban Thẩm Định & Bảo Vệ Uy Tín Thương Hiệu',
    nickname: 'Chị Lan "Bức Tường Thép"',
    age: 38,
    fnbSpecialty: 'Kiểm duyệt chất lượng nội dung, Bảo vệ pháp lý & Tiêu chuẩn thương hiệu F&B',
    favoriteDrink: 'Trà Sen Vàng thanh tao ít ngọt',
    quote: '"100 lời khen không cứu nổi 1 bài viết sai giá tiền hay sai thông điệp vệ sinh an toàn thực phẩm. Tôi là chốt chặn an toàn của quán!"',
    bio: 'Cựu chuyên viên kiểm duyệt nội dung và Brand Safety với 10 năm kinh nghiệm. Chị Lan sở hữu bộ checklist 47 tiêu chí nghiêm ngặt từ chính tả, bản quyền hình ảnh, độ chuẩn của logo cho đến tính trung thực của chương trình khuyến mãi.',
    backstory: 'Từng phát hiện một lỗi gõ nhầm giá tiền từ 59.000đ thành 5.900đ trước khi bài viết được xuất bản 30 giây, cứu quán khỏi một đợt khủng hoảng truyền thông và thiệt hại tài chính lớn.',
    signatureMove: {
      name: 'Zero-Flaw Brand Shield',
      description: 'Quét tự động 47 tiêu chí bảo vệ thương hiệu, chỉ số thẩm mỹ và độ tương thích chính sách Meta chỉ trong 400 mili-giây.',
      tag: 'BẢO VỆ THƯƠNG HIỆU 100%',
    },
    metrics: {
      responseTime: '0.5s',
      accuracyRate: '100%',
      viralIndex: '9.4/10',
      fnbDomainIQ: 'Chuyên gia Tiêu chuẩn Brand Safety',
    },
    strengths: ['Phát hiện 100% lỗi chính tả & cú pháp', 'Kiểm tra độ chuẩn nhận diện màu', 'Đảm bảo chính sách quảng cáo'],
    biggestFear: 'Một bài viết có lỗi sai lọt qua vòng kiểm duyệt và xuất hiện trên trang chính của quán.',
    quirk: 'Đọc menu bất kỳ quán nào chị ghé qua cũng tự động lấy bút đỏ sửa lỗi dấu câu trong đầu.',
    avatarSeed: 'qa-evaluator',
    primaryColor: '#7c3aed',
    accentColor: '#a78bfa',
    gradientBg: 'from-purple-600 via-indigo-800 to-slate-900',
    badge: 'GUARDIAN QA',
    modelTech: 'Claude 3.5 Sonnet Precision Evaluator',
    sampleWork: {
      title: 'Báo Cáo Thẩm Định Chiến Dịch Tuần 34 — Điểm Chất Lượng 9.8/10',
      type: 'Audit & Compliance Report',
      preview: 'Đã rà soát 7 bài viết: 100% đạt chuẩn brand voice, hình ảnh đúng tỷ lệ, hashtag tối ưu SEO địa phương.',
    },
  },
};
