'use client';

import React from 'react';
import { ContactShadows } from '@react-three/drei';
import { GardenOfficeModel } from './GardenOfficeModel';

export function GardenOfficeScene() {
  return (
    <>
      <color attach="background" args={['#c9e2df']} />
      <fog attach="fog" args={['#c8ddd7', 34, 62]} />
      <ambientLight intensity={0.78} color="#f8fbff" />
      <hemisphereLight args={['#eaf7ff', '#b8c8bc', 1.05]} />
      <directionalLight
        castShadow
        position={[-11, 16, 10]}
        intensity={2.85}
        color="#fffdf5"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={38}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.00045}
      />
      <pointLight position={[-7.7, 3.5, -6.3]} color="#bfe9ef" intensity={0.5} distance={11} decay={2} />
      <pointLight position={[6.9, 3.6, -6.2]} color="#fff6e5" intensity={0.62} distance={12} decay={2} />
      <pointLight position={[0, 4.5, 2]} color="#d7fff0" intensity={0.44} distance={10} decay={2} />

      <GardenOfficeModel />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.2} scale={31} blur={2.55} far={7.5} color="#365149" />
    </>
  );
}
