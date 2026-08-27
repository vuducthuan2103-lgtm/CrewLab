'use client';

import React from 'react';
import { ContactShadows, SoftShadows } from '@react-three/drei';
import { GardenOfficeModel } from './GardenOfficeModel';

export function GardenOfficeScene() {
  return (
    <>
      <color attach="background" args={['#142b29']} />
      <fog attach="fog" args={['#17322f', 34, 58]} />
      <SoftShadows size={16} samples={10} focus={0.62} />
      <ambientLight intensity={0.72} color="#fff0d2" />
      <hemisphereLight args={['#dff5ec', '#18322d', 1.18]} />
      <directionalLight
        castShadow
        position={[-11, 16, 10]}
        intensity={3.15}
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
      <pointLight position={[-8, 4, -6]} color="#f0c27b" intensity={1.25} distance={12} decay={2} />
      <pointLight position={[8, 4, -6]} color="#f0c27b" intensity={1.25} distance={12} decay={2} />
      <pointLight position={[0, 4.5, 2]} color="#70f5dd" intensity={0.8} distance={10} decay={2} />

      <GardenOfficeModel />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.24} scale={29} blur={2.8} far={7.5} color="#2c2820" />
    </>
  );
}
