'use client';

import React from 'react';
import { ContactShadows } from '@react-three/drei';
import { GardenOfficeModel } from './GardenOfficeModel';

export function GardenOfficeScene() {
  return (
    <>
      <color attach="background" args={['#10251f']} />
      <fog attach="fog" args={['#18392d', 29, 52]} />
      <ambientLight intensity={0.34} color="#ffe5bb" />
      <hemisphereLight args={['#d9efdc', '#102019', 0.68]} />
      <directionalLight
        castShadow
        position={[-11, 16, 10]}
        intensity={4.25}
        color="#ffd39a"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={38}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.00045}
      />
      <pointLight position={[-7.7, 3.5, -6.3]} color="#65d6d0" intensity={0.72} distance={11} decay={2} />
      <pointLight position={[6.9, 3.6, -6.2]} color="#ffb75f" intensity={1.35} distance={12} decay={2} />
      <pointLight position={[0, 4.5, 2]} color="#60d8ac" intensity={0.52} distance={10} decay={2} />

      <GardenOfficeModel />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.32} scale={31} blur={2.15} far={7.5} color="#241e16" />
    </>
  );
}
