# Virtual Office — Visual State and Event Contract

## Normalized visual model

The renderer consumes one client-scoped adapter model. It never reads workflow objects opportunistically and never writes presentation state to the backend.

```ts
type OfficeVisualAgent = {
  agentId: 'A01' | 'B02' | 'B03' | 'D01' | 'D02' | 'E01';
  displayName: string;
  role: string;
  presence: 'available' | 'away' | 'offline';
  workflowState: 'idle' | 'working' | 'waiting_human' | 'reviewing' | 'reworking' | 'success' | 'error' | 'rejected';
  activeTask?: { id: string; title: string; href?: string };
  progress?: { value: number; label: string }; // only when factual
  artifact?: { id: string; name: string; thumbnailUrl?: string };
  blockedReason?: string;
  lastUpdated: string;
};

type OfficeVisualEvent =
  | { type: 'artifact_handoff'; from: OfficeVisualAgent['agentId']; to: OfficeVisualAgent['agentId']; artifactId: string; occurredAt: string }
  | { type: 'state_changed'; agentId: OfficeVisualAgent['agentId']; occurredAt: string };
```

## Presentation rules

| State | Scene treatment | Popup treatment |
| --- | --- | --- |
| idle / available | quiet seated or away posture | “Sẵn sàng” with latest meaningful update |
| working | role-specific micro motion at workstation | task title; no invented percentage |
| reviewing | comparison/review surface and restrained focus | review task and source link |
| waiting_human | local marker + distinct shape/motion | clear action request and CTA |
| reworking | working variant with revision cue | factual feedback/context |
| success | short settling acknowledgement, then normal state | recent completed output |
| error / rejected | local warning only, colour plus icon/motion | cause and recovery CTA |

## Event rules

An artifact handoff has initiate → travel → receive choreography lasting 1–2 seconds. Concurrent events are queued or merged visually; selected-agent events win. It is not replayed on first load unless an event timeline explicitly requests it.

State updates reconcile smoothly, but product truth wins over a long animation. Offline state is communicated by ordinary product UI; semantic animation stops without inventing a new scene narrative.

## Accessibility and motion

Every critical visual fact is also exposed in DOM: keyboard-focusable agent controls, accessible roster, popup text and existing Portal deep links. Reduced motion replaces long camera tweening and travel paths with short fades or near-instant transitions; it does not remove meaning.
