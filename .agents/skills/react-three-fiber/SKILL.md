---
name: react-three-fiber
description: Comprehensive React Three Fiber (R3F), Three.js, Rapier physics, and VRM avatar development guide for building interactive 3D web applications.
skills:
  - react-three-fiber
---

# React Three Fiber (R3F) & 3D Web Application Guide

This skill provides architecture, patterns, performance rules, and code templates for building 3D web experiences in React/Next.js using **React Three Fiber**, **Drei**, **Rapier Physics**, and **Three-VRM**.

---

## 1. Core Architecture & Next.js Integration

### 1.1 Next.js SSR Handling
3D WebGL scenes rely on browser-only APIs (`window`, `WebGLRenderingContext`, `HTMLCanvasElement`). In Next.js (App Router), any component rendering `<Canvas>` **MUST** be loaded dynamically with `ssr: false` or run strictly in a client component boundary.

```tsx
// features/virtual-office/components/VirtualOffice.tsx
'use client';

import dynamic from 'next/dynamic';
import React from 'react';

export const OfficeCanvas = dynamic(
  () => import('./OfficeCanvas').then((mod) => mod.OfficeCanvas),
  {
    ssr: false,
    loading: () => <OfficeLoadingScreen />,
  }
);
```

### 1.2 Clean Canvas Hierarchy
Keep Canvas wrapper clean and encapsulate scene lighting, physics, characters, and environment into separate modular components:

```tsx
<Canvas
  shadows
  camera={{ position: [0, 6, 10], fov: 45 }}
  gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
  dpr={[1, 2]} // clamp device pixel ratio for performance
>
  <Suspense fallback={null}>
    <Physics gravity={[0, -9.81, 0]}>
      <OfficeEnvironment />
      <OfficeLighting />
      <CEOCharacter />
      <AgentRoster />
    </Physics>
  </Suspense>
</Canvas>
```

---

## 2. Performance & Memory Management (Anti-Pattern Prevention)

1. **Avoid Allocations in `useFrame`:** Never instantiate `new THREE.Vector3()`, `new THREE.Color()`, or new objects inside `useFrame`. Reuse shared vectors / scratch objects.
2. **Proper Disposal:** R3F automatically disposes unmounted meshes, but when swapping textures or models manually, call `.dispose()` on unused geometries and materials.
3. **Texture Sizing:** Textures must be power-of-two (POT, e.g., 512x512, 1024x1024) and compressed (WebP, KTX2) whenever possible.
4. **Shadow Budget:** Limit shadow casters. In office scenes, use directional light shadow with carefully bounded shadow camera frustum (`shadow-camera-near`, `shadow-camera-far`, `shadow-mapSize={[1024, 1024]}`). Avoid multiple point/spot lights casting realtime shadows.
5. **DPR Clamping:** Use `dpr={[1, 1.5]}` on mobile and `dpr={[1, 2]}` on desktop to prevent 4K retina displays from lagging.

---

## 3. Physics & Collisions with `@react-three/rapier`

1. **Static Colliders for Environment:** Wrap office floors, walls, and desks in `<RigidBody type="fixed" colliders="cuboid">`.
2. **Interaction Triggers:** Use `<RigidBody type="fixed" sensor onIntersectionEnter={...} onIntersectionExit={...}>` to create proximity trigger zones around agent desks.
3. **Capsule Collider for CEO / Characters:** Use dynamic or kinematic position-based rigid bodies with a capsule shape for smooth navigation.

---

## 4. Character Controller (`ecctrl`) & Input Handling

When using `ecctrl`:
```tsx
import Ecctrl, { EcctrlAnimation } from 'ecctrl';

// Wrap CEO character in Ecctrl
<Ecctrl
  camInitDis={-5}
  camMaxDis={-8}
  camMinDis={-2}
  maxVelLimit={4}
  turnSpeed={10}
  position={[0, 1, 0]}
>
  <CEOAvatar />
</Ecctrl>
```

Keyboard mapping setup (`KeyboardControls` from `@react-three/drei`):
```tsx
const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'run', keys: ['Shift'] },
];
```

---

## 5. VRM Humanoid & Animation System (`@pixiv/three-vrm`)

1. Load `.vrm` avatars using `GLTFLoader` with `VRMLoaderPlugin`.
2. Update `vrm.update(delta)` inside `useFrame` for IK, spring bones, and expressions.
3. Map visual states (`idle`, `working`, `waiting_human`, `reviewing`, `success`) to VRM facial expressions (`happy`, `neutral`, `blink`, custom presets) and mixamo-compatible skeletal animations.

---

## 6. Interaction & DOM Overlay

1. **Raycasting / Hover:** Use pointer events directly on Three.js meshes (`onPointerOver`, `onPointerOut`, `onClick`). Always set `e.stopPropagation()` to prevent clicks passing through objects.
2. **Generous Interaction Colliders:** Wrap desks and agents in an invisible slightly oversized hit box (`<mesh visible={false}>`) to ensure comfortable clicking on touch devices and desktop.
3. **Decoupled 2D UI:** Render HUD, Agent Detail Sheet (shadcn Sheet), and modals outside the `<Canvas>` in HTML/DOM space, driven by a Zustand store (`useOfficeStore`).
