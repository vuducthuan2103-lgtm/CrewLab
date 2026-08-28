'use client';

import React from 'react';
import { ContactShadows } from '@react-three/drei';
import { GardenOfficeModel } from './GardenOfficeModel';

export function GardenOfficeScene() {
  return (
    <>
      <color attach="background" args={['#142b29']} />
      <fog attach="fog" args={['#17322f', 34, 58]} />
      <ambientLight intensity={0.66} color="#fff0d2" />
      <hemisphereLight args={['#e9f7ee', '#182a25', 1.08]} />
      <directionalLight
        castShadow
        position={[-11, 16, 10]}
        intensity={3.35}
        color="#ffdca5"
        shadow-mapSize={[1536, 1536]}
        shadow-camera-near={1}
        shadow-camera-far={38}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.00045}
      />
      <pointLight position={[-7.7, 3.5, -6.3]} color="#72dce0" intensity={1.05} distance={11} decay={2} />
      <pointLight position={[6.9, 3.6, -6.2]} color="#ffc278" intensity={1.75} distance={12} decay={2} />
      <pointLight position={[0, 4.5, 2]} color="#70f5dd" intensity={0.8} distance={10} decay={2} />

      <GardenOfficeModel />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.22} scale={31} blur={2.8} far={7.5} color="#2c2820" />
    </>
  );
}
