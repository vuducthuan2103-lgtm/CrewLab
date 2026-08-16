# CrewLab Virtual Office UX Upgrade — P0 → P1 → P2

**Status:** Founder-approved UX upgrade plan  
**Target:** CrewLab Client Portal — Virtual 3D Office  
**Primary Implementer:** Antigravity  
**Execution Rule:** Implement sequentially: **P0 → review → P1 → review → P2 → final review**

---

# 0. READ FIRST

You are improving the **existing CrewLab Virtual 3D Marketing Office implementation**.

This is **NOT a rebuild**.

The current implementation already contains:

- 3D Office scene
- Day / Night mode
- CEO character
- WASD movement
- six CrewLab agents
- agent workstations
- agent nameplates
- agent status bubbles
- quick agent popup
- detailed agent side panel
- AI Personnel Profile page
- Team List modal
- mock/test agent-state controls
- CrewLab/client branding

Your job is to refine the current product into a **cleaner, more useful and more immersive client-facing experience**.

The work MUST be divided into exactly three implementation phases:

```text
P0 — Fix UX foundation
↓
P1 — Make the office genuinely useful
↓
P2 — Add signature / wow interactions
```

Do NOT attempt to implement everything simultaneously.

Complete and verify each phase before starting the next.

---

# 1. SOURCE OF TRUTH

Existing CrewLab business workflow remains unchanged.

The 3D Office is:

> A visual and interaction layer over CrewLab.

It is NOT:

> A second workflow engine.

The following agents remain the only active employees:

```text
A01 — Orchestrator
B02 — Content Pillar
B03 — Content Plan
D01 — Caption Writer
D02 — Image Design
E01 — Evaluator
```

Customer communication remains through:

```text
A01
```

Do NOT create direct customer chat with:

```text
B02
B03
D01
D02
E01
```

Do NOT change existing approval, asset upload, Content Hub, Calendar, Gate or content workflow ownership.

---

# 2. APPROVED TOOLING

Do NOT add unnecessary dependencies, MCPs, plugins or frameworks.

Use the existing approved stack:

```text
three
@react-three/fiber
@react-three/drei
zustand
@react-three/rapier
ecctrl
@pixiv/three-vrm
```

Use existing:

```text
shadcn/ui
Lucide
CrewLab Design System
```

MCP:

```text
codebase-memory-mcp
existing read-only Supabase MCP
```

Skills:

```text
existing React Three Fiber skill set
Playwright skill
design-taste-frontend
```

Do NOT install:

```text
Blender MCP
Meshy MCP
Three.js DevTools MCP
Triplex
Theatre.js
React Three UIKit
another UI library
another 3D framework
```

unless a genuine blocker is found and founder approval is requested first.

---

# 3. REPOSITORY / EXECUTION RULES

Before changing code:

1. Read `AGENTS.md`.
2. Read the existing Virtual 3D Office spec.
3. Read the Virtual Office ADR if present.
4. Read the current CrewLab Design System.
5. Inspect the existing implementation using `codebase-memory-mcp`.
6. Inspect current agent-state mapping.
7. Inspect current 3D scene architecture.
8. Inspect current Portal routes/components.
9. Inspect how authentication and client scoping currently work.
10. Inspect existing tests.

Use the EXISTING implementation wherever possible.

Do not rebuild working systems unnecessarily.

Determine whether the Virtual Office work is:

```text
A. still on an active feature branch
or
B. already merged into main
```

If still on an active approved feature branch:

```text
continue using the existing spec/branch
```

If already merged:

```text
create the next appropriate spec
create a new feature branch
follow AGENTS.md
```

Do not assume Git state.

Do not commit directly to `main`.

---

# ==========================================================
# P0 — FIX UX FOUNDATION
# ==========================================================

## Goal

Make the current product cleaner, trustworthy, client-friendly and visually focused.

P0 contains eight changes.

---

## P0.1 — Hide Test / Debug Agent State Controls in Production

The current UI contains a developer bar similar to:

```text
Test A01
[Làm việc]
[Cần duyệt]
[Nghỉ]
[Xong]
[Kiệt]
```

This is useful for development but must NEVER appear in normal production client UX.

### Requirement

Move all agent-state testing controls behind an explicit development-only mechanism.

Acceptable options:

```text
NODE_ENV === development
```

or:

```text
?debugOffice=1
```

or another existing CrewLab dev flag.

Preferred behavior:

```text
normal user
→ debug controls completely absent

developer/debug mode
→ debug controls available
```

Do not merely disable them visually.

Do not leave unused production DOM controls.

### Normalize labels

Do not expose wording such as:

```text
Kiệt
```

Use normalized presentation terminology:

```text
idle
working
waiting_human
reviewing
reworking
success
error
rejected
```

Client-facing Vietnamese may use:

```text
Rảnh
Đang làm
Chờ bạn
Đang kiểm tra
Đang làm lại
Hoàn thành
Có lỗi
Đã từ chối
```

---

## P0.2 — Reduce Persistent Speech Bubble Clutter

Currently multiple agents permanently show large messages such as:

```text
Đang chờ lệnh...
Đang kiểm tra...
Cần xem qua ạ!
```

Too many persistent bubbles compete with the 3D environment.

### Introduce 3 information levels

#### Level 1 — Always visible

Keep lightweight:

```text
Agent code
Agent nickname
small status indicator
```

Example:

```text
B02 · Chị Hà · ●
```

#### Level 2 — Contextual

Show only on:

```text
hover
CEO nearby
agent selected
```

May include:

```text
role
short state text
```

#### Level 3 — Attention Bubble

Large bubble only when something genuinely deserves CEO attention.

Examples:

```text
Cần bạn duyệt
Cần ảnh từ bạn
Có lỗi cần kiểm tra
Kế hoạch đang chờ xác nhận
```

Do NOT use large attention bubbles for ordinary idle states.

Idle agents should not constantly say:

```text
Đang chờ lệnh...
```

---

## P0.3 — Standardize Visual State System

Audit every place where agent state appears:

```text
3D character
nameplate
speech bubble
Agent Detail
Team List
Personnel Profile
HUD counters
debug mode
```

All must derive from one normalized state model.

Use one central mapping.

Example:

```ts
type AgentVisualState =
  | "idle"
  | "working"
  | "waiting_human"
  | "reviewing"
  | "reworking"
  | "success"
  | "error"
  | "rejected";
```

Do not allow separate components to independently invent state labels.

Create or improve a centralized mapping such as:

```text
agent-state-map.ts
```

It should determine:

```text
client-facing label
status icon
animation state
emotion
attention priority
whether large bubble is allowed
```

IMPORTANT:

These remain PRESENTATION states.

Never write them back into CrewLab's actual workflow state.

---

## P0.4 — Remove / Hide Fake Metrics

The current Personnel Profile contains metrics similar to:

```text
99.4% Độ chuẩn Brand
< 1.2s Tốc độ xử lý
Viral 9.6/10
99.8% Chính xác
```

If a metric is not generated from a real measurable CrewLab source:

> DO NOT display it as a factual production metric.

Remove fake/demo numbers from production.

If necessary during development:

```text
mark clearly as DEMO
```

but preferably remove them from normal user mode.

Allowed performance metrics must come from real data.

Examples:

```text
32 tasks completed
94% passed E01 without retry
3 active tasks
1 task waiting for CEO
```

ONLY if CrewLab actually has the required data.

Do not invent metrics.

---

## P0.5 — Move Token / Model / Budget Out of Primary Client UX

The current Agent Detail / Team List surfaces technical information such as:

```text
GPT-4o Mini
Claude Sonnet
token %
input token
output token
monthly budget
```

These are not the CEO's primary concern.

### Primary agent detail should answer

```text
Who is this?
What are they doing?
What is the status?
Do they need me?
What can I do next?
```

Use structure similar to:

```text
Anh Minh
Content Planner

Đang lên lịch 7 bài tuần tới.

Trạng thái: Đang làm
Tiến độ: 5/7 bài
Cập nhật: 2 phút trước

Bạn cần làm gì:
Chưa cần hành động.

[Xem lịch nội dung]
```

Technical details MAY remain behind:

```text
Chi tiết kỹ thuật
```

if truly useful.

However:

```text
model
tokens
cost
latency
```

should not dominate client-facing primary UI.

If those belong more naturally in Internal App, do not duplicate them unnecessarily in Portal.

---

## P0.6 — Fix Day Mode Contrast and Lighting

Current Night mode is visually stronger than Day mode.

Current Day mode issues include:

```text
too much bright blue exterior
office appears to float outdoors
white/gray panel text loses contrast
lighting cone appears artificial
3D environment loses premium dark CrewLab identity
```

### Redesign Day mode as indoor daylight

Desired concept:

```text
same indoor office
+
natural daylight entering windows
+
soft exterior sky visible only through windows
```

Do NOT transform the scene into an outdoor floating diorama.

Use:

```text
soft daylight
controlled shadows
subtle warm sun patches
cool window fill
dark interior materials remain intact
```

Primary UI panels must continue satisfying CrewLab contrast standards.

Day and Night must feel like:

```text
same office at different times
```

not:

```text
two unrelated themes
```

---

## P0.7 — Clarify Information Architecture

There are currently several ways to inspect an agent.

They must each have a clear purpose.

### Quick Detail

Triggered by:

```text
CEO nearby
or
light interaction
```

Purpose:

> Quick operational glance.

Display only:

```text
name
role
current task
current status
does this agent need me?
```

Keep compact.

### Agent Detail

Triggered by:

```text
click agent
```

Purpose:

> Current operational work.

Display:

```text
task
progress
status
latest update
customer action
relevant CTA
```

### Hồ Sơ Nhân Sự AI

Purpose:

> Identity and capabilities.

Display:

```text
AI Persona
role
specialty
working style
capabilities
real historical performance if measurable
```

Do NOT make Profile another task panel.

Do NOT present fictional age, human employment history or fake career credentials as factual unless clearly labeled as persona/lore.

### Danh Sách

Purpose:

> Fast team navigation.

Display:

```text
who needs me
who is working
who is idle
quick locate
quick inspect
```

Do NOT make List another long technical dashboard.

---

## P0.8 — Improve Camera Focus During Agent Interaction

Current overview camera is useful but keeps agents visually small.

Keep overview mode.

Add smoother contextual camera behavior.

### Camera Modes

#### Office Overview

Default mode.

Shows:

```text
CEO
office
multiple agents
```

#### Proximity Focus

When CEO enters an agent interaction radius:

```text
slightly lower camera
slight zoom
keep movement available
```

Do NOT create aggressive camera snapping.

#### Agent Focus

When an agent is explicitly selected:

```text
camera moves closer
agent becomes visually readable
desk still visible
detail UI opens
```

Target:

Agent should occupy enough viewport area for:

```text
animation
posture
expression
```

to actually be noticeable.

When detail closes:

```text
camera smoothly returns to CEO / overview
```

Respect:

```text
prefers-reduced-motion
```

---

# P0 ACCEPTANCE CRITERIA

P0 is complete only when:

- debug state bar is absent in production
- large idle bubbles are removed
- visual states come from one central mapping
- fake metrics do not appear as factual client metrics
- technical token/model/budget information no longer dominates Agent Detail
- Day mode contrast and indoor lighting are improved
- Quick Detail, Agent Detail, Profile and List have distinct roles
- selected agent receives meaningful camera focus
- existing CEO movement still works
- existing agent selection still works
- existing CrewLab workflow links still work
- mobile layout is not broken
- Night mode is not degraded

---

# P0 DELIVERY GATE

When P0 is complete:

**STOP. Do not begin P1.**

Produce:

```text
P0 Completion Report
```

Include:

1. files changed
2. architecture changes
3. screenshots:
   - Day overview
   - Night overview
   - agent proximity
   - Agent Detail
   - Team List
   - Personnel Profile
4. tests run
5. P0 Acceptance Criteria PASS/FAIL table
6. known issues

Wait for founder review before beginning P1.

---

# ==========================================================
# P1 — MAKE THE EXPERIENCE SIGNIFICANTLY BETTER
# ==========================================================

## Goal

Turn the office from an attractive visualization into a useful daily interface.

P1 contains six major capabilities.

---

## P1.1 — CEO Attention Queue: “Ai cần tôi?”

This is a HIGH-priority CrewLab interaction.

The top HUD currently contains something similar to:

```text
1 Cần bạn duyệt
```

Upgrade this into a real Attention Queue.

### Concept

The office should immediately answer:

> Which employees need the CEO right now?

Attention items may include only real workflow conditions such as:

```text
approval needed
asset needed
Gate confirmation required
error requiring human action
other existing customer action
```

Do NOT invent new workflow types.

### Interaction

Click:

```text
1 Cần bạn
```

Open a compact queue.

Example:

```text
CẦN BẠN — 2

D02 · Anh Khoa
Đang chờ bạn duyệt hình ảnh
[Đi tới] [Xem]

E01 · Chị Lan
Bài đã kiểm tra xong, cần phê duyệt
[Đi tới] [Xem]
```

Sorting:

```text
urgent first
then oldest waiting item
```

Only real customer-action items belong here.

When Attention Queue opens:

```text
agents needing CEO
→ subtle highlight
```

Do not turn all lights neon.

---

## P1.2 — “Đi tới Agent” / Auto-Walk

Add:

```text
Đi tới
```

as a navigation action.

Available from:

```text
Team List
Personnel Profile
Attention Queue
optional Agent Detail
```

Flow:

```text
User clicks Đi tới B03
↓
Office becomes active
↓
CEO walks automatically toward B03
↓
camera follows
↓
CEO stops at safe interaction position
↓
B03 becomes focused
```

If the user gives manual WASD input:

```text
cancel auto-walk immediately
```

Avoid fighting the user.

Do not teleport unless pathing genuinely fails.

Use the simplest reliable navigation approach that works with the existing small office.

Do NOT build a large generic NPC pathfinding system.

A small office-specific waypoint/navigation solution is acceptable.

---

## P1.3 — Micro-Animations for All Six Agents

Each employee should feel alive even without high-end animation.

Do NOT build complex cinematic animation.

Implement lightweight reusable loops.

### Shared states

Every agent should have at minimum:

```text
idle
working
waiting_human
success
error/rework
```

### A01

Idle:

```text
check monitor
look around office
```

Working:

```text
switch screens
review board
```

Waiting human:

```text
look toward CEO
small raised-hand gesture
```

### B02

Idle:

```text
thinking
look at notes
```

Working:

```text
brainstorm
write
move notes
```

### B03

Working:

```text
calendar interaction
typing
```

### D01

Working:

```text
typing loop
pause to think
continue typing
```

Reworking:

```text
faster editing
```

### D02

Working:

```text
design/tablet interaction
```

Waiting:

```text
turn toward CEO
asset/request gesture
```

### E01

Working:

```text
review/checklist
```

Success:

```text
checkmark / nod
```

Failure:

```text
concerned review
```

Animations should reuse a common framework.

Do NOT create six separate animation engines.

---

## P1.4 — Focus Agent Camera

Build a polished:

```text
Focus Agent Mode
```

Triggered by agent selection.

Target composition:

```text
agent + desk
≈ 30–40% visual emphasis
```

Background office remains visible.

Optionally dim distant scene slightly, but do not make the selected agent feel disconnected from the office.

Agent Detail remains a DOM/shadcn surface.

Do not create UI inside WebGL.

Focus mode must work for all six agents.

Closing the panel restores normal camera behavior.

---

## P1.5 — Activity Feed

Add a lightweight recent activity view.

Purpose:

> Show that the AI team is actually working.

Do not show raw logs.

Display meaningful business events only.

Example:

```text
14:02  E01 bắt đầu kiểm tra bài Combo Trưa
14:01  D02 hoàn thành hình ảnh
13:58  D01 hoàn thành caption
13:51  A01 giao bước tiếp theo cho D01
```

Possible entry point:

```text
Hoạt động
```

Do not keep the whole feed permanently open.

Use a compact panel/popover.

Activity must come from real existing state/event data where possible.

If the system does not currently contain reliable historical events:

> STOP and report the data limitation.

Do NOT fabricate production history.

Avoid DB schema changes unless founder approves.

---

## P1.6 — Real State → Animation Synchronization

This is essential.

The office must visually reflect real CrewLab activity.

Architecture must remain:

```text
CrewLab domain state
↓
Office State Adapter
↓
Agent Visual State
↓
Animation / expression / attention UI
```

Examples:

```text
D01 starts caption work
↓
D01 working
↓
typing animation
```

```text
D02 needs customer image
↓
waiting_human
↓
D02 looks toward CEO
↓
Attention Queue + bubble
```

```text
E01 starts evaluation
↓
reviewing
↓
review animation
```

```text
task completes
↓
success
↓
short success reaction
↓
settle to idle / next task
```

Do NOT infer agent activity without backend evidence.

If the backend cannot determine owner/current work:

```text
show idle / no active task
```

rather than fake activity.

---

# P1 ACCEPTANCE CRITERIA

P1 passes only when:

- Attention Queue lists real human-action items
- clicking an attention item can focus/locate the correct agent
- auto-walk works for all six agents
- manual user movement cancels auto-walk
- all six agents have visible state-based micro-animation
- focus camera works consistently
- Activity Feed shows meaningful events only
- real backend state controls visible agent state
- no page reload is required when states change
- no fake production activity is generated
- P0 UX remains intact
- no new workflow owner is introduced

---

# P1 DELIVERY GATE

After P1:

**STOP. Do not begin P2.**

Produce:

```text
P1 Completion Report
```

Include video/screenshots demonstrating:

1. `Ai cần tôi?`
2. auto-walk
3. A01 working
4. D01 working
5. D02 waiting for CEO
6. E01 reviewing
7. Focus Agent mode
8. Activity Feed
9. real state changing animation

Also include:

```text
Acceptance Criteria PASS/FAIL
performance impact
known limitations
```

Wait for founder review before P2.

---

# ==========================================================
# P2 — SIGNATURE / WOW EXPERIENCE
# ==========================================================

## Goal

Make CrewLab's multi-agent orchestration visible and memorable.

These features should reinforce real CrewLab behavior.

---

## P2.1 — Visual Task Handoff

Visually represent work moving between employees.

Primary examples:

```text
D01 → D02
D02 → E01
```

Potential visualization:

```text
small document/card/icon
travels from desk A to desk B
```

or:

```text
subtle light/data trail
```

Do not build exaggerated sci-fi effects.

Sequence example:

```text
D01 completes caption
↓
short success reaction
↓
handoff visual D01 → D02
↓
D02 begins working animation
```

Another:

```text
D02 completes design
↓
handoff → E01
↓
E01 begins review
```

CRITICAL:

This visual effect must be triggered by actual workflow transition.

It MUST NOT trigger or own workflow transitions.

---

## P2.2 — Daily Stand-Up with A01

When the CEO enters the office for the first meaningful session of the day, A01 may offer a concise office briefing.

Example:

```text
Chào sếp.

Hôm nay đội đang có:
• 3 việc đang làm
• 1 bài cần bạn duyệt
• 2 việc đã hoàn thành

[Cần tôi xử lý gì?]
[Xem đội đang làm]
```

This must be assembled from real current data.

Do not use fake summaries.

Do not automatically interrupt every page load.

Daily stand-up should be:

```text
once per relevant daily session
or
manually reopened
```

Use lightweight client/session state if sufficient.

Do not add new DB persistence purely for this unless genuinely required and approved.

---

## P2.3 — Client Office Branding

Personalize the office using the current client's brand.

Examples:

```text
client logo on main wall
business name
brand imagery/posters
product photos
subtle brand accent
```

Current BAR | DINH branding is a good direction.

Do not completely recolor CrewLab UI.

CrewLab Electric Lime remains the product interaction color.

Client brand styling should apply primarily to:

```text
environment
wall artwork
decor
screens
```

not primary application controls.

Use existing client assets if available.

Do not invent client assets.

If none exist, keep generic CrewLab environment.

---

## P2.4 — Weekly Completion Celebration

When a meaningful weekly workflow milestone is genuinely completed:

```text
whole approved weekly plan completed
or another clearly defined existing milestone
```

trigger a short office celebration.

Examples:

```text
agents briefly react
subtle confetti
office board says Week Complete
```

Keep celebration approximately:

```text
2–4 seconds
```

Do NOT interrupt user control.

Respect:

```text
prefers-reduced-motion
```

Do not repeatedly replay celebration every time the page loads.

Use existing event/state evidence to determine whether celebration is warranted.

---

## P2.5 — Agent Look-at CEO

When CEO enters an agent's interaction range:

```text
agent subtly turns head/upper body toward CEO
```

Do NOT rotate the entire seated body unnaturally.

Behavior:

```text
far away
→ continue normal activity

CEO nearby
→ brief glance / attention

CEO selects agent
→ stronger attention toward CEO/camera
```

If agent is intensely working:

```text
small delay before glance
```

This helps agents feel aware of the CEO.

Keep movements subtle.

---

## P2.6 — Ambient Office Events + Better Day/Night Behavior

Day/Night should influence office life, not just sky/background.

### Day

Possible ambient behavior:

```text
stronger window daylight
active office
agents more energetic
```

### Night

Possible:

```text
desk lamps
monitor glow
darker environment
quieter ambient animation
more visible practical lighting
```

Also allow lightweight random environmental loops such as:

```text
monitor changing screen
small light variation
agent drinking coffee
agent stretching
subtle screen activity
```

Rules:

- ambient events must not affect business state
- do not spam animation
- do not cause performance degradation
- avoid large random scene changes
- preserve visual hierarchy
- respect reduced motion

---

# P2 ACCEPTANCE CRITERIA

P2 passes only when:

- real task transitions can generate visible handoff effects
- D01 → D02 → E01 is visually understandable
- A01 Daily Stand-Up summarizes real current data
- branding adapts to available client identity/assets
- weekly completion can trigger a short non-blocking celebration
- agents visually acknowledge nearby CEO
- Day/Night affects lighting and ambient behavior coherently
- none of the new features changes CrewLab workflow ownership
- no fake workflow transitions are generated
- performance remains acceptable
- P0 and P1 functionality remain stable

---

# ==========================================================
# CROSS-PHASE UX RULES
# ==========================================================

## A. Reduce UI Noise

The 3D office is the main visual surface.

Do not turn it into a traditional dashboard.

Always ask:

> Does this information need to be permanently visible?

If not:

```text
hide behind interaction
```

---

## B. CEO Language, Not Developer Language

Prefer:

```text
Đang viết caption
Cần bạn duyệt
Đang kiểm tra
Hoàn thành
```

over:

```text
FSM state
token consumption
provider model
task queue status
```

Technical metadata belongs in secondary detail or Internal App.

---

## C. Trust

Never present mock/demo numbers as real production performance.

Do not create fictional measurable claims.

Agent personality is allowed.

Fake performance evidence is not.

---

## D. Persona vs Reality

Personnel Profile may contain personality such as:

```text
Sếp Vũ “Bộ Não F&B”
Chị Hà “Thợ Săn Trend”
```

But clearly treat that as:

```text
AI Persona / working style
```

Avoid implying a fictional AI agent literally has:

```text
42 years old
former human career
real past employment
```

unless explicitly framed as fictional persona.

Recommended Profile structure:

```text
AI Persona
Role
Specialties
Working Style
Capabilities
Real Performance
```

---

## E. Performance

Do not introduce expensive effects merely for polish.

Avoid:

```text
React state update every frame
too many dynamic shadows
large postprocessing stack
unbounded particle effects
heavy agent logic duplicated six times
```

Reuse:

```text
animation controller
state mapping
interaction controller
camera controller
```

---

## F. Mobile

Every P0/P1/P2 feature must be evaluated on mobile.

Do not postpone mobile until the end.

Requirements include:

```text
tap interaction
touch target >= 44px
bottom sheet
mobile attention queue
mobile auto-walk
no hover dependency
readable text
```

---

## G. Accessibility

Keep existing accessible Team List.

New functionality must remain accessible outside 3D where reasonable.

Examples:

Attention Queue:

```text
must work via DOM UI
```

Agent Detail:

```text
must work via keyboard
```

Auto-walk:

```text
not required for accessing information
```

Animations must not become the only status signal.

---

# ==========================================================
# TESTING REQUIREMENTS
# ==========================================================

Use existing test setup and Playwright skill.

At minimum add/update tests for:

## P0

```text
debug controls hidden production
idle bubbles not permanently displayed
state labels centralized
fake metrics absent
Agent Detail hides primary token information
Day mode readable
camera focus selection works
```

## P1

```text
Attention Queue
Attention Queue → agent locate
auto-walk
manual auto-walk cancel
focus mode
Activity Feed
real state update → visual state
```

## P2

```text
handoff trigger
daily stand-up
client branding fallback
celebration one-shot behavior
agent look-at behavior
Day/Night ambient state
```

Do not attempt brittle pixel-perfect 3D visual snapshot tests unless existing infrastructure supports them reliably.

Test deterministic state and interaction boundaries instead.

---

# ==========================================================
# PERFORMANCE CHECK
# ==========================================================

After EACH phase:

Measure at least:

```text
desktop FPS
mobile FPS on pilot viewport
route load behavior
console errors
React warnings
memory leaks after entering/leaving /office
```

Targets remain approximately:

```text
desktop: 50–60 FPS
supported mobile: >= 30 FPS
```

If a new feature causes significant regression:

```text
optimize or simplify it
```

Do not sacrifice basic usability for visual effects.

---

# ==========================================================
# REQUIRED COMPLETION FORMAT
# ==========================================================

At the end of EVERY phase, report:

```text
PHASE:
P0 / P1 / P2

STATUS:
PASS / PARTIAL / BLOCKED

IMPLEMENTED:
...

FILES CHANGED:
...

TESTS:
...

PERFORMANCE:
...

SCREENSHOTS / DEMO:
...

ACCEPTANCE CRITERIA:
PASS / FAIL per item

KNOWN ISSUES:
...

NEXT PHASE:
Do not begin until approved.
```

---

# ==========================================================
# FINAL PRODUCT EXPERIENCE
# ==========================================================

After P0:

> The office should feel clean and understandable.

After P1:

> The office should help the CEO manage attention and understand the AI team.

After P2:

> The office should visibly communicate that multiple AI employees are collaborating in real time.

The target experience is:

```text
CEO enters office
↓
immediately sees who is working
↓
sees who needs attention
↓
can walk or auto-walk to an employee
↓
employee notices CEO
↓
CEO understands current task
↓
real system state drives character behavior
↓
work visibly moves between agents
↓
A01 summarizes the team's day
↓
the office feels like the client's own AI marketing department
```

The core success criterion is NOT:

> “The 3D graphics look impressive.”

The real success criterion is:

> **A customer can understand and interact with CrewLab's multi-agent workflow more naturally because the workflow has become visible inside the office.**

---

# FINAL HARD RULE

Do not implement P1 before P0 is reviewed.

Do not implement P2 before P1 is reviewed.

Work sequentially:

```text
P0
→ test
→ report
→ founder review

P1
→ test
→ report
→ founder review

P2
→ test
→ report
→ final review
```

Do not silently expand scope beyond this document.
