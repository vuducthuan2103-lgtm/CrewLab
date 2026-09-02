'use client';

import React from 'react';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { GardenOfficeModel } from './GardenOfficeModel';

export function GardenOfficeScene() {
  return (
    <>
      <color attach="background" args={['#809fc0']} />
      <fog attach="fog" args={['#91abc4', 74, 132]} />
      <ambientLight intensity={0.62} color="#fbfdff" />
      <hemisphereLight args={['#edf9ff', '#b7c5bc', 1.04]} />
      <directionalLight
        castShadow
        position={[-11, 16, 10]}
        intensity={2.86}
        color="#fffefa"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={38}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-bias={-0.00045}
      />
      <Environment resolution={192}>
        <Lightformer form="rect" intensity={1.82} color="#f8fcff" position={[-8, 11, 2]} scale={[9, 6, 1]} rotation={[Math.PI / 2, 0, 0.35]} />
        <Lightformer form="rect" intensity={1.32} color="#d8f4f2" position={[10, 7, -7]} scale={[7, 4, 1]} rotation={[Math.PI / 2, 0, -0.55]} />
        <Lightformer form="ring" intensity={0.84} color="#fff8ec" position={[0, 6, 7]} scale={[5, 5, 1]} rotation={[Math.PI / 2, 0, 0]} />
      </Environment>
      <pointLight position={[-7.7, 3.5, -6.3]} color="#c7edf0" intensity={0.42} distance={11} decay={2} />
      <pointLight position={[6.9, 3.6, -6.2]} color="#fff6e5" intensity={0.5} distance={12} decay={2} />
      <pointLight position={[0, 4.5, 2]} color="#d7fff0" intensity={0.36} distance={10} decay={2} />

      <GardenOfficeModel />
      <ContactShadows frames={1} position={[0, 0.02, 0]} opacity={0.24} scale={31} blur={2.4} far={7.5} color="#314a43" />
    </>
  );
}
