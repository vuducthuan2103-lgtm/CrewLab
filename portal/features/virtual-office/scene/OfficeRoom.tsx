'use client';

import React from 'react';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OFFICE_ROOM_CONFIG, CLIENT_BRAND_CONFIG } from '../config/office-layout';
import { useOfficeStore } from '../state/office-store';

/**
 * 1. BrandWall (Back Center): BAR | DINH signage centered at x = 0 (spans x = -3.5 to +3.5)
 */
const BrandWall: React.FC = () => {
  const brand = CLIENT_BRAND_CONFIG;
  const wh = OFFICE_ROOM_CONFIG.wallHeight;

  return (
    <group position={[0, 0, -10.95]}>
      {/* Centered Acoustic Wood Slats (14 slats spanning -3.25 to +3.25) */}
      {Array.from({ length: 14 }).map((_, idx) => (
        <mesh key={idx} position={[-3.25 + idx * 0.5, wh / 2, 0.02]} castShadow>
          <boxGeometry args={[0.38, wh - 0.2, 0.05]} />
          <meshStandardMaterial
            color={idx % 2 === 0 ? '#382414' : '#2a1a0d'}
            roughness={0.55}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* High-Resolution HTML Brand Logo with clean unified glowing frame */}
      <group position={[0, 4.2, 0.12]}>
        <Html
          center
          distanceFactor={7.5}
          zIndexRange={[10, 0]}
          transform
          occlude={false}
        >
          <div
            style={{
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              userSelect: 'none',
              pointerEvents: 'none',
              width: '500px',
              backgroundColor: '#0c0d12',
              border: '2px solid rgba(212, 255, 0, 0.6)',
              borderRadius: '12px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 35px rgba(0,0,0,0.9), 0 0 20px rgba(212,255,0,0.2)',
              WebkitFontSmoothing: 'antialiased',
            }}
          >
            {/* Top Workspace Tag */}
            <div
              style={{
                fontSize: '10px',
                fontWeight: 800,
                letterSpacing: '0.32em',
                color: '#D4FF00',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              ◆ CREWLAB AI OPERATIONS ◆
            </div>

            {/* Wordmark */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  fontSize: '52px',
                  fontWeight: 900,
                  letterSpacing: '0.22em',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  textShadow: '0 0 32px rgba(255,255,255,0.7), 0 0 12px rgba(212,255,0,0.5)',
                }}
              >
                BAR
              </span>

              <span
                style={{
                  display: 'inline-block',
                  width: '4px',
                  height: '46px',
                  backgroundColor: '#D4FF00',
                  margin: '0 16px',
                  boxShadow: '0 0 14px #D4FF00',
                }}
              />

              <span
                style={{
                  fontSize: '52px',
                  fontWeight: 900,
                  letterSpacing: '0.22em',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  textShadow: '0 0 32px rgba(255,255,255,0.7), 0 0 12px rgba(212,255,0,0.5)',
                }}
              >
                DINH
              </span>
            </div>

            {/* Subtitle */}
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.38em',
                color: brand.accentColor,
                textTransform: 'uppercase',
                marginTop: '12px',
              }}
            >
              COFFEE IN SUNSET · SAIGON
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
};

/**
 * 2. CoffeeBarCredenza (Back Wall Left Section): Centered at x = -8.1 (exact mathematical center of left back wall)
 */
const CoffeeBarCredenza: React.FC = () => {
  return (
    <group position={[-8.1, 0, -10.9]}>
      {/* Base Cabinet Credenza */}
      <mesh position={[0, 0.5, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 1.0, 0.45]} />
        <meshStandardMaterial color="#1a1410" roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Marble Countertop */}
      <mesh position={[0, 1.02, 0.2]} castShadow>
        <boxGeometry args={[3.85, 0.04, 0.48]} />
        <meshStandardMaterial color="#2d2926" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Multi-Tier Backlit Wall Shelves */}
      {[2.4, 3.8, 5.2].map((y, i) => (
        <group key={i} position={[0, y, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[3.6, 0.05, 0.25]} />
            <meshStandardMaterial color="#3e2714" roughness={0.4} />
          </mesh>
          {/* LED Underglow */}
          <mesh position={[0, -0.028, 0]}>
            <planeGeometry args={[3.5, 0.02]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}

      {/* Realistic Commercial Dual-Group Espresso Machine */}
      <group position={[-0.8, 1.3, 0.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.5, 0.35]} />
          <meshStandardMaterial color="#18181b" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Chrome Group Heads */}
        {[-0.18, 0.18].map((gx, gi) => (
          <mesh key={gi} position={[gx, -0.12, 0.19]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
            <meshStandardMaterial color="#e4e4e7" metalness={0.95} roughness={0.1} />
          </mesh>
        ))}
      </group>

      {/* Coffee Grinder */}
      <group position={[0.25, 1.32, 0.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.52, 16]} />
          <meshStandardMaterial color="#09090b" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.12, 0.06, 0.22, 16]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.4} roughness={0.1} />
        </mesh>
      </group>

      {/* Pour-over Stand & Glassware on Counter */}
      <group position={[1.1, 1.18, 0.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.2, 16]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.5} roughness={0.1} />
        </mesh>
      </group>

      {/* Cups and Barware on Shelves */}
      {[-1.0, -0.6, -0.2, 0.2, 0.6, 1.0].map((cx, ci) => (
        <mesh key={ci} position={[cx, 2.48, 0.12]} castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.08, 12]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
      ))}
      {[-0.9, -0.4, 0.1, 0.6, 1.0].map((cx, ci) => (
        <mesh key={`s2-${ci}`} position={[cx, 3.88, 0.12]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, 0.1, 12]} />
          <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
        </mesh>
      ))}
      {[-0.8, -0.2, 0.4, 0.9].map((cx, ci) => (
        <mesh key={`s3-${ci}`} position={[cx, 5.28, 0.12]} castShadow>
          <boxGeometry args={[0.14, 0.18, 0.12]} />
          <meshStandardMaterial color="#fef08a" roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
};

/**
 * 3. StrategyContentWallBoard (Back Wall Right Section): Clean single bezel with zero border misalignment
 */
const StrategyContentWallBoard: React.FC = () => {
  return (
    <group position={[7.6, 4.2, -10.9]}>
      {/* HTML High-Resolution Content Flow & KPI HUD */}
      <Html
        center
        distanceFactor={6.8}
        transform
        occlude={false}
        className="pointer-events-none select-none"
      >
        <div
          style={{
            width: '460px',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            backgroundColor: '#070a14',
            border: '2px solid rgba(212, 255, 0, 0.5)',
            borderRadius: '12px',
            padding: '16px',
            color: '#f1f5f9',
            boxShadow: '0 0 25px rgba(0,0,0,0.9), 0 0 15px rgba(212,255,0,0.15)',
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b', paddingBottom: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#D4FF00', boxShadow: '0 0 8px #D4FF00' }} />
              <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.1em', color: '#ffffff', textTransform: 'uppercase' }}>
                CHIẾN LƯỢC NỘI DUNG
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '9px', fontWeight: 700 }}>
              <span style={{ color: '#D4FF00', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>MỤC TIÊU</span>
              <span style={{ color: '#38bdf8', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>KÊNH</span>
              <span style={{ color: '#c084fc', backgroundColor: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>KPI</span>
            </div>
          </div>

          {/* Interactive Flowchart Diagram */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', margin: '14px 0', padding: '12px 6px', backgroundColor: '#0c1120', borderRadius: '8px', border: '1px solid #1e293b' }}>
            {/* Step 1 */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#065f46', border: '1px solid #34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 0 12px rgba(52,211,153,0.3)' }}>
                🎯
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#34d399', marginTop: '6px' }}>Mục tiêu Q3</div>
            </div>

            {/* Arrow 1 */}
            <div style={{ color: '#38bdf8', fontSize: '16px', fontWeight: 900, opacity: 0.8 }}>➔</div>

            {/* Step 2 */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#075985', border: '1px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 0 12px rgba(56,189,248,0.3)' }}>
                📱
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', marginTop: '6px' }}>Kênh FB/IG</div>
            </div>

            {/* Arrow 2 */}
            <div style={{ color: '#38bdf8', fontSize: '16px', fontWeight: 900, opacity: 0.8 }}>➔</div>

            {/* Step 3 */}
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#581c87', border: '1px solid #c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', boxShadow: '0 0 12px rgba(192,132,252,0.3)' }}>
                📊
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#c084fc', marginTop: '6px' }}>+35% Tương tác</div>
            </div>
          </div>

          {/* Performance Metric Stream */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <div style={{ backgroundColor: '#0b101c', padding: '8px 6px', borderRadius: '6px', textAlign: 'center', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '2px' }}>Reach Tuần</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#D4FF00', letterSpacing: '0.04em' }}>148.5K</div>
            </div>
            <div style={{ backgroundColor: '#0b101c', padding: '8px 6px', borderRadius: '6px', textAlign: 'center', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '2px' }}>Tương tác</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.04em' }}>12.4K</div>
            </div>
            <div style={{ backgroundColor: '#0b101c', padding: '8px 6px', borderRadius: '6px', textAlign: 'center', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '2px' }}>Chuyển đổi</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#34d399', letterSpacing: '0.04em' }}>8.9%</div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
};

/**
 * 4. LeftAnalyticsWall (Left Wall): Top 3 HUDs, "HIỆU SUẤT AGENT" 82% gauge, "NỘI DUNG HÔM NAY" 3-column Kanban
 */
const LeftAnalyticsWall: React.FC = () => {
  const halfW = OFFICE_ROOM_CONFIG.width / 2;
  const wh = OFFICE_ROOM_CONFIG.wallHeight;

  return (
    <group position={[-halfW + 0.12, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* Warm Oak Wall Backdrop Panel */}
      <mesh position={[0, wh / 2, -0.04]} receiveShadow>
        <boxGeometry args={[18, wh, 0.08]} />
        <meshStandardMaterial color="#1e1610" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Horizontal LED Accent Trim at upper wall */}
      <mesh position={[0, wh - 0.35, 0.01]}>
        <boxGeometry args={[17.8, 0.04, 0.02]} />
        <meshBasicMaterial color="#D4FF00" />
      </mesh>

      {/* ── TOP TIER: 3 FUTURISTIC HUD ANALYTICS MONITORS ── */}
      <group position={[-4.5, 5.8, 0.05]}>
        <Html center distanceFactor={7} transform occlude={false} className="pointer-events-none select-none">
          <div style={{ display: 'flex', gap: '22px', width: '580px', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {/* HUD 1: Tone waveform */}
            <div style={{ flex: 1, backgroundColor: '#070b14', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px', height: '120px', boxShadow: '0 0 16px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#38bdf8', marginBottom: '6px' }}>BRAND VOICE // FREQUENCY</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '75px', gap: '3px' }}>
                {[40, 65, 85, 50, 95, 70, 45, 80, 60, 90, 75, 55, 85, 95, 60].map((h, idx) => (
                  <div key={idx} style={{ flex: 1, height: `${h}%`, backgroundColor: '#38bdf8', borderRadius: '1px' }} />
                ))}
              </div>
            </div>
            {/* HUD 2: Pillar distribution bars */}
            <div style={{ flex: 1, backgroundColor: '#070b14', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px', height: '120px', boxShadow: '0 0 16px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#e879f9', marginBottom: '6px' }}>CONTENT ALLOCATION</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ width: '85%', height: '9px', backgroundColor: '#e879f9', borderRadius: '2px' }} />
                <div style={{ width: '65%', height: '9px', backgroundColor: '#38bdf8', borderRadius: '2px' }} />
                <div style={{ width: '92%', height: '9px', backgroundColor: '#D4FF00', borderRadius: '2px' }} />
                <div style={{ width: '50%', height: '9px', backgroundColor: '#34d399', borderRadius: '2px' }} />
              </div>
            </div>
            {/* HUD 3: Quality gauge */}
            <div style={{ flex: 1, backgroundColor: '#070b14', border: '1px solid #1e293b', borderRadius: '8px', padding: '10px', height: '120px', boxShadow: '0 0 16px rgba(0,0,0,0.6)' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#D4FF00', marginBottom: '6px' }}>SYSTEM TOKEN RATE</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#D4FF00', marginTop: '14px', textAlign: 'center' }}>98.4%</div>
              <div style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>TOKEN EFFICIENCY PASS</div>
            </div>
          </div>
        </Html>
      </group>

      {/* ── MIDDLE TIER: "HIỆU SUẤT AGENT" (82% CIRCULAR GAUGE) ── */}
      <group position={[-4.5, 3.8, 0.05]}>
        <Html center distanceFactor={6.5} transform occlude={false} className="pointer-events-none select-none">
          <div style={{ width: '440px', backgroundColor: '#080c18', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '18px', fontFamily: "'Inter', -apple-system, sans-serif", boxShadow: '0 0 20px rgba(0,0,0,0.7)' }}>
            {/* Circular Gauge */}
            <div style={{ width: '96px', height: '96px', borderRadius: '50%', border: '6px solid #D4FF00', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px rgba(212,255,0,0.3)' }}>
              <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff' }}>82%</span>
              <span style={{ fontSize: '8px', fontWeight: 700, color: '#D4FF00' }}>HEALTH</span>
            </div>

            {/* Text Metrics */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.08em', marginBottom: '8px' }}>HIỆU SUẤT AGENT</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#cbd5e1' }}>
                  <span>Thời gian phản hồi TB</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>1.4s</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#cbd5e1' }}>
                  <span>Tỷ lệ duyệt lần 1</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>92% Pass</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#cbd5e1' }}>
                  <span>Ngân sách token</span>
                  <span style={{ color: '#D4FF00', fontWeight: 700 }}>63% Còn lại</span>
                </div>
              </div>
            </div>
          </div>
        </Html>
      </group>

      {/* ── BOTTOM TIER: "NỘI DUNG HÔM NAY" (3-COLUMN KANBAN) ── */}
      <group position={[3.5, 3.8, 0.05]}>
        <Html center distanceFactor={6.5} transform occlude={false} className="pointer-events-none select-none">
          <div style={{ width: '460px', backgroundColor: '#080c18', border: '1px solid #1e293b', borderRadius: '10px', padding: '16px', fontFamily: "'Inter', -apple-system, sans-serif", boxShadow: '0 0 20px rgba(0,0,0,0.7)' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.1em', marginBottom: '12px', borderBottom: '1px solid #1e293b', paddingBottom: '6px' }}>
              NỘI DUNG HÔM NAY
            </div>

            {/* 3 Kanban Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {/* Column 1: Ý tưởng */}
              <div style={{ backgroundColor: '#0f172a', padding: '8px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginBottom: '8px' }}>Ý tưởng</div>
                <div style={{ backgroundColor: '#fef08a', color: '#713f12', padding: '6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, marginBottom: '6px' }}>
                  📝 Story góc hoàng hôn
                </div>
                <div style={{ backgroundColor: '#fed7aa', color: '#7c2d12', padding: '6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>
                  💡 Minigame Voucher
                </div>
              </div>

              {/* Column 2: Đang làm */}
              <div style={{ backgroundColor: '#0f172a', padding: '8px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#38bdf8', marginBottom: '8px' }}>Đang làm</div>
                <div style={{ backgroundColor: '#bae6fd', color: '#0369a1', padding: '6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, marginBottom: '6px' }}>
                  🎨 Banner Combo Trưa (D02)
                </div>
                <div style={{ backgroundColor: '#fbcfe8', color: '#831843', padding: '6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>
                  ✍️ Caption Trà Ổi Hồng (D01)
                </div>
              </div>

              {/* Column 3: Hoàn thành */}
              <div style={{ backgroundColor: '#0f172a', padding: '8px', borderRadius: '6px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#34d399', marginBottom: '8px' }}>Hoàn thành</div>
                <div style={{ backgroundColor: '#bbf7d0', color: '#14532d', padding: '6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, marginBottom: '6px' }}>
                  ✅ Lịch xuất bản T34 (B03)
                </div>
                <div style={{ backgroundColor: '#ddd6fe', color: '#4c1d95', padding: '6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600 }}>
                  ✅ 4 Trụ cột Content (B02)
                </div>
              </div>
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
};

/**
 * 5. Architectural Crown / Perimeter Cove Light Soffit (Positioned at y = 8.85m, completely open center so ZERO view obstruction)
 */
const CeilingPerimeterCrown: React.FC = () => {
  const { width, depth } = OFFICE_ROOM_CONFIG;
  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const isDay = timeOfDay === 'day';
  const crownY = 8.85;

  return (
    <group position={[0, crownY, 0]}>
      {/* ── BACK WALL PERIMETER SOFFIT ── */}
      <mesh position={[0, 0, -depth / 2 + 0.7]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.3, 1.4]} />
        <meshStandardMaterial color={isDay ? '#181a24' : '#0c0d14'} roughness={0.7} />
      </mesh>
      {/* Back Cove Light Glow Line */}
      <mesh position={[0, -0.16, -depth / 2 + 1.4]}>
        <boxGeometry args={[width, 0.04, 0.03]} />
        <meshBasicMaterial color={isDay ? '#ffffff' : '#D4FF00'} />
      </mesh>

      {/* ── LEFT WALL PERIMETER SOFFIT ── */}
      <mesh position={[-width / 2 + 0.7, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.3, depth]} />
        <meshStandardMaterial color={isDay ? '#181a24' : '#0c0d14'} roughness={0.7} />
      </mesh>
      {/* Left Cove Light Glow Line */}
      <mesh position={[-width / 2 + 1.4, -0.16, 0]}>
        <boxGeometry args={[0.03, 0.04, depth]} />
        <meshBasicMaterial color={isDay ? '#ffffff' : '#D4FF00'} />
      </mesh>

      {/* ── RIGHT GLASS WALL PERIMETER SOFFIT ── */}
      <mesh position={[width / 2 - 0.7, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.3, depth]} />
        <meshStandardMaterial color={isDay ? '#181a24' : '#0c0d14'} roughness={0.7} />
      </mesh>
      {/* Right Cove Light Glow Line */}
      <mesh position={[width / 2 - 1.4, -0.16, 0]}>
        <boxGeometry args={[0.03, 0.04, depth]} />
        <meshBasicMaterial color={isDay ? '#ffffff' : '#D4FF00'} />
      </mesh>

      {/* ── RECESSED PERIMETER DOWNLIGHTS ── */}
      {[-8.0, -4.0, 0, 4.0, 8.0].map((x, xi) => (
        <mesh key={`dl-b-${xi}`} position={[x, -0.16, -depth / 2 + 0.7]}>
          <circleGeometry args={[0.16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {[-6.0, -1.0, 4.0].map((z, zi) => (
        <React.Fragment key={`dl-sides-${zi}`}>
          <mesh position={[-width / 2 + 0.7, -0.16, z]}>
            <circleGeometry args={[0.16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[width / 2 - 0.7, -0.16, z]}>
            <circleGeometry args={[0.16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

/**
 * 6. AICommandKiosk (Front-Left Foreground): Angled Pedestal with "AI COMMAND CENTER" Avatar HUD
 */
const AICommandKiosk: React.FC = () => {
  return (
    <group position={[-6.8, 0, 6.8]} rotation={[0, 0.45, 0]}>
      {/* Pedestal Base */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.5]} />
        <meshStandardMaterial color="#12141c" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Neon Edge Accents */}
      <mesh position={[0, 0.78, 0.24]}>
        <boxGeometry args={[0.56, 0.02, 0.02]} />
        <meshBasicMaterial color="#D4FF00" />
      </mesh>

      {/* Angled Display Surface */}
      <group position={[0, 0.95, 0.08]} rotation={[-0.55, 0, 0]}>
        <mesh castShadow>
          <boxGeometry args={[1.05, 0.68, 0.05]} />
          <meshStandardMaterial color="#090a10" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, 0, 0.028]}>
          <planeGeometry args={[0.98, 0.62]} />
          <meshStandardMaterial color="#04060d" roughness={0.9} />
        </mesh>

        {/* HTML Robot Face & Command Center Status */}
        <group position={[0, 0, 0.035]}>
          <Html center distanceFactor={5} transform occlude={false} className="pointer-events-none select-none">
            <div style={{ width: '280px', backgroundColor: '#050a16', border: '2px solid #D4FF00', borderRadius: '8px', padding: '12px', textAlign: 'center', boxShadow: '0 0 20px rgba(212,255,0,0.25)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
              <div style={{ fontSize: '11px', fontWeight: 900, color: '#D4FF00', letterSpacing: '0.15em', marginBottom: '8px' }}>
                AI COMMAND CENTER
              </div>

              {/* Stylized Glowing AI Avatar Face */}
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#0c1a30', border: '2px solid #38bdf8', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px #38bdf8' }}>
                <div style={{ display: 'flex', gap: '14px', marginBottom: '6px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8', boxShadow: '0 0 6px #38bdf8' }} />
                </div>
                <div style={{ width: '22px', height: '3px', backgroundColor: '#D4FF00', borderRadius: '2px' }} />
              </div>

              <div style={{ fontSize: '9px', fontWeight: 700, color: '#38bdf8', marginTop: '8px' }}>
                SYSTEM ONLINE · 6 AGENTS READY
              </div>
            </div>
          </Html>
        </group>
      </group>
    </group>
  );
};

/**
 * 7. ForegroundLounge (Front-Right Foreground): Modern dark leather modular sofa
 */
const ForegroundLounge: React.FC = () => {
  return (
    <group position={[7.5, 0, 7.2]} rotation={[0, -0.3, 0]}>
      {/* Base */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.38, 0.95]} />
        <meshStandardMaterial color="#141418" roughness={0.8} />
      </mesh>
      {/* Cushions */}
      <mesh position={[-0.65, 0.43, 0.08]} castShadow>
        <boxGeometry args={[1.2, 0.12, 0.75]} />
        <meshStandardMaterial color="#1f2028" roughness={0.7} />
      </mesh>
      <mesh position={[0.65, 0.43, 0.08]} castShadow>
        <boxGeometry args={[1.2, 0.12, 0.75]} />
        <meshStandardMaterial color="#1f2028" roughness={0.7} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.62, 0.38]} castShadow>
        <boxGeometry args={[2.6, 0.48, 0.24]} />
        <meshStandardMaterial color="#111116" roughness={0.8} />
      </mesh>
    </group>
  );
};

export const OfficeRoom: React.FC = () => {
  const { width, depth, wallHeight } = OFFICE_ROOM_CONFIG;
  const halfW = width / 2;
  const halfD = depth / 2;
  const wallThickness = 0.6;

  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const isDay = timeOfDay === 'day';

  return (
    <group>
      {/* ═══════════════════════════════════════════════════════
          1. FLOOR — Dark Slate Tiles + Bright Electric-Lime Glow Grid
         ═══════════════════════════════════════════════════════ */}
      <RigidBody type="fixed" colliders="cuboid">
        <mesh position={[0, -0.25, 0]} receiveShadow>
          <boxGeometry args={[width, 0.5, depth]} />
          <meshStandardMaterial
            color={isDay ? '#181e2e' : '#0f111a'}
            roughness={0.16}
            metalness={0.35}
          />
        </mesh>
      </RigidBody>

      {/* Polished Square Slate Tiles */}
      {Array.from({ length: 14 }).map((_, xi) =>
        Array.from({ length: 12 }).map((_, zi) => (
          <mesh
            key={`${xi}-${zi}`}
            position={[-12 + xi * 1.86, 0.003, -10 + zi * 1.86]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <planeGeometry args={[1.8, 1.8]} />
            <meshStandardMaterial
              color={
                isDay
                  ? (xi + zi) % 2 === 0 ? '#20273a' : '#192032'
                  : (xi + zi) % 2 === 0 ? '#141622' : '#10121d'
              }
              roughness={isDay ? 0.2 : 0.15}
              metalness={isDay ? 0.35 : 0.45}
            />
          </mesh>
        ))
      )}

      {/* ── BRIGHT GLOWING ELECTRIC LIME / GOLD FLOOR GRID LINES ── */}
      {/* Longitudinal Main Axis Lines */}
      {[-3.8, 0, 3.8].map((x, i) => (
        <mesh key={`grid-x-${i}`} position={[x, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.035, depth - 2]} />
          <meshBasicMaterial color="#D4FF00" />
        </mesh>
      ))}

      {/* Transverse Cross Axis Lines */}
      {[-5.0, 0.5, 5.5].map((z, i) => (
        <mesh key={`grid-z-${i}`} position={[0, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width - 2, 0.035]} />
          <meshBasicMaterial color="#D4FF00" />
        </mesh>
      ))}

      {/* Workstation Floor Halos */}
      {/* A01 Center */}
      <mesh position={[0, 0.005, -5.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 1.83, 32]} />
        <meshBasicMaterial color="#D4FF00" />
      </mesh>
      {/* B02 Left Top */}
      <mesh position={[-7.0, 0.005, -4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.63, 32]} />
        <meshBasicMaterial color="#34d399" />
      </mesh>
      {/* B03 Left Mid */}
      <mesh position={[-7.0, 0.005, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.63, 32]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>
      {/* D01 Right Top */}
      <mesh position={[7.0, 0.005, -4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.63, 32]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      {/* D02 Right Mid */}
      <mesh position={[7.0, 0.005, 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.6, 1.63, 32]} />
        <meshBasicMaterial color="#e879f9" />
      </mesh>
      {/* E01 Front Center */}
      <mesh position={[0, 0.005, 5.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 1.73, 32]} />
        <meshBasicMaterial color="#a78bfa" />
      </mesh>

      {/* ═══════════════════════════════════════════════════════
          2. PERIMETER CEILING CROWN SOFFIT (Zero View Occlusion)
         ═══════════════════════════════════════════════════════ */}
      <CeilingPerimeterCrown />

      {/* ═══════════════════════════════════════════════════════
          3. BACK WALL & CREDENZA & STRATEGY BOARD
         ═══════════════════════════════════════════════════════ */}
      <RigidBody type="fixed" colliders="hull">
        {/* Solid Back Wall Base */}
        <mesh position={[0, wallHeight / 2, -halfD - wallThickness / 2]} receiveShadow castShadow>
          <boxGeometry args={[width, wallHeight, wallThickness]} />
          <meshStandardMaterial color="#14141a" roughness={0.85} />
        </mesh>
      </RigidBody>

      <BrandWall />
      <CoffeeBarCredenza />
      <StrategyContentWallBoard />

      {/* Vertical Light Columns Flanking Back Wall */}
      {[-10.8, 10.8].map((x, i) => (
        <group key={i} position={[x, wallHeight / 2, -10.9]}>
          <mesh>
            <boxGeometry args={[0.1, wallHeight - 0.4, 0.04]} />
            <meshBasicMaterial color="#D4FF00" />
          </mesh>
        </group>
      ))}

      {/* ═══════════════════════════════════════════════════════
          4. LEFT ANALYTICS & KANBAN WALL
         ═══════════════════════════════════════════════════════ */}
      <RigidBody type="fixed" colliders="hull">
        <mesh position={[-halfW - wallThickness / 2, wallHeight / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[wallThickness, wallHeight, depth]} />
          <meshStandardMaterial color="#14141a" roughness={0.85} />
        </mesh>
      </RigidBody>

      <LeftAnalyticsWall />

      {/* ═══════════════════════════════════════════════════════
          5. RIGHT PANORAMIC GLASS WALL & BALCONY TERRACE
         ═══════════════════════════════════════════════════════ */}
      <RigidBody type="fixed" colliders="hull">
        {/* Top Header */}
        <mesh position={[halfW, wallHeight - 0.05, 0]}>
          <boxGeometry args={[0.16, 0.1, depth]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Bottom Sill */}
        <mesh position={[halfW, 0.05, 0]}>
          <boxGeometry args={[0.16, 0.1, depth]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Vertical Mullions */}
        {[-8.8, -4.4, 0, 4.4, 8.8].map((zPos, idx) => (
          <mesh key={`mullion-${idx}`} position={[halfW, wallHeight / 2, zPos]}>
            <boxGeometry args={[0.14, wallHeight, 0.06]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.15} />
          </mesh>
        ))}

        {/* Clear Glass Pane */}
        <mesh position={[halfW, wallHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[0.04, wallHeight - 0.12, depth - 0.12]} />
          <meshPhysicalMaterial
            color={isDay ? '#ffffff' : '#e0e7ff'}
            transparent
            opacity={0.18}
            roughness={0.01}
            metalness={0.05}
            transmission={0.96}
            ior={1.52}
            reflectivity={0.6}
          />
        </mesh>
      </RigidBody>

      {/* Outdoor Balcony Terrace */}
      <group position={[halfW, 0, 0]}>
        <mesh position={[1.5, -0.06, 0]} receiveShadow>
          <boxGeometry args={[3.0, 0.12, depth]} />
          <meshStandardMaterial color={isDay ? '#3e2723' : '#18120e'} roughness={0.65} />
        </mesh>
        <mesh position={[2.9, 0.55, 0]}>
          <boxGeometry args={[0.04, 1.1, depth - 0.2]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.2} roughness={0.05} transmission={0.95} />
        </mesh>
        <mesh position={[2.9, 1.12, 0]}>
          <boxGeometry args={[0.1, 0.05, depth]} />
          <meshStandardMaterial color="#09090b" metalness={0.95} />
        </mesh>
        {/* Balcony Plants */}
        {[-7.5, -2.5, 2.5, 7.5].map((zPos, pIdx) => (
          <group key={`balcony-plant-${pIdx}`} position={[2.1, 0.0, zPos]}>
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[0.6, 0.6, 1.1]} />
              <meshStandardMaterial color="#1e293b" roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.75, 0]} castShadow>
              <sphereGeometry args={[0.45, 14, 14]} />
              <meshStandardMaterial color="#15803d" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ═══════════════════════════════════════════════════════
          6. FOREGROUND: AI COMMAND KIOSK & LOUNGE SOFA
         ═══════════════════════════════════════════════════════ */}
      <AICommandKiosk />
      <ForegroundLounge />

      {/* ═══════════════════════════════════════════════════════
          7. LUSH TROPICAL PLANTS IN POTS
         ═══════════════════════════════════════════════════════ */}
      {/* Front-Left Plant next to AI Command Kiosk */}
      <group position={[-8.8, 0, 7.2]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.3, 0.9, 20]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial color="#15803d" roughness={0.65} />
        </mesh>
        <mesh position={[0.2, 1.7, 0.1]} castShadow>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.65} />
        </mesh>
      </group>

      {/* Front-Right Plant in Planter Box */}
      <group position={[9.8, 0, 7.2]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.9, 0.7, 0.9]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.0, 0]} castShadow>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial color="#15803d" roughness={0.65} />
        </mesh>
      </group>

      {/* Back-Left Corner Plant */}
      <group position={[-11.2, 0, -9.5]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.26, 0.9, 20]} />
          <meshStandardMaterial color="#181822" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <sphereGeometry args={[0.58, 16, 16]} />
          <meshStandardMaterial color="#15803d" roughness={0.7} />
        </mesh>
      </group>

      {/* Back-Right Corner Plant */}
      <group position={[11.2, 0, -9.5]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.26, 0.9, 20]} />
          <meshStandardMaterial color="#181822" roughness={0.3} metalness={0.6} />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <sphereGeometry args={[0.58, 16, 16]} />
          <meshStandardMaterial color="#15803d" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};
