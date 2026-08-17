'use client';

import React from 'react';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { OFFICE_ROOM_CONFIG, CLIENT_BRAND_CONFIG } from '../config/office-layout';
import { useOfficeStore } from '../state/office-store';

/**
 * 1. BrandWall (Back Center): BAR | DINH signage centered at x = 0
 */
const BrandWall: React.FC = () => {
  const brand = CLIENT_BRAND_CONFIG;
  const wh = OFFICE_ROOM_CONFIG.wallHeight;

  return (
    <group position={[0, 0, -10.95]}>
      {/* Centered Acoustic Wood Slats (Warm Walnut / Teak) */}
      {Array.from({ length: 14 }).map((_, idx) => (
        <mesh key={idx} position={[-3.25 + idx * 0.5, wh / 2, 0.02]} castShadow>
          <boxGeometry args={[0.38, wh - 0.2, 0.05]} />
          <meshStandardMaterial
            color={idx % 2 === 0 ? '#452a18' : '#341f12'}
            roughness={0.45}
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
              backgroundColor: '#0c0e18',
              border: '2px solid rgba(212, 255, 0, 0.6)',
              borderRadius: '12px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 35px rgba(0,0,0,0.85), 0 0 18px rgba(212,255,0,0.18)',
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
 * 2. CoffeeBarCredenza (Back Wall Left Section): Centered at x = -8.1 (warm hospitality area)
 */
const CoffeeBarCredenza: React.FC = () => {
  return (
    <group position={[-8.1, 0, -10.9]}>
      {/* Base Cabinet Credenza */}
      <mesh position={[0, 0.5, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 1.0, 0.45]} />
        <meshStandardMaterial color="#261b14" roughness={0.45} metalness={0.15} />
      </mesh>
      {/* Marble Countertop */}
      <mesh position={[0, 1.02, 0.2]} castShadow>
        <boxGeometry args={[3.85, 0.04, 0.48]} />
        <meshStandardMaterial color="#38332f" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Multi-Tier Backlit Wall Shelves */}
      {[2.4, 3.8, 5.2].map((y, i) => (
        <group key={i} position={[0, y, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[3.6, 0.05, 0.25]} />
            <meshStandardMaterial color="#4a301a" roughness={0.4} />
          </mesh>
          {/* LED Underglow */}
          <mesh position={[0, -0.028, 0]}>
            <planeGeometry args={[3.5, 0.02]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}

      {/* Commercial Dual-Group Espresso Machine */}
      <group position={[-0.8, 1.3, 0.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.8, 0.5, 0.35]} />
          <meshStandardMaterial color="#27272a" metalness={0.9} roughness={0.15} />
        </mesh>
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
          <meshStandardMaterial color="#18181b" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.12, 0.06, 0.22, 16]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.4} roughness={0.1} />
        </mesh>
      </group>

      {/* Pour-over Stand & Glassware */}
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
 * 3. DesignBookshelfCredenza (Back Wall Right Section): Centered at x = +8.1 for perfect architectural symmetry with the Coffee Bar Credenza
 */
const DesignBookshelfCredenza: React.FC = () => {
  return (
    <group position={[8.1, 0, -10.9]}>
      {/* Base Cabinet Credenza */}
      <mesh position={[0, 0.5, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 1.0, 0.45]} />
        <meshStandardMaterial color="#261b14" roughness={0.45} metalness={0.15} />
      </mesh>
      {/* Marble Countertop */}
      <mesh position={[0, 1.02, 0.2]} castShadow>
        <boxGeometry args={[3.85, 0.04, 0.48]} />
        <meshStandardMaterial color="#38332f" roughness={0.2} metalness={0.1} />
      </mesh>

      {/* Multi-Tier Backlit Wall Shelves */}
      {[2.4, 3.8, 5.2].map((y, i) => (
        <group key={i} position={[0, y, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[3.6, 0.05, 0.25]} />
            <meshStandardMaterial color="#4a301a" roughness={0.4} />
          </mesh>
          {/* LED Underglow */}
          <mesh position={[0, -0.028, 0]}>
            <planeGeometry args={[3.5, 0.02]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}

      {/* Countertop: Creative Design Books & Architectural Sculpture */}
      {/* Stacked Coffee Table Books */}
      <group position={[-1.0, 1.1, 0.2]} rotation={[0, 0.15, 0]}>
        <mesh castShadow position={[0, 0.02, 0]}>
          <boxGeometry args={[0.42, 0.04, 0.3]} />
          <meshStandardMaterial color="#0284c7" roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0.02, 0.06, -0.01]} rotation={[0, -0.1, 0]}>
          <boxGeometry args={[0.38, 0.04, 0.28]} />
          <meshStandardMaterial color="#d97706" roughness={0.5} />
        </mesh>
        <mesh castShadow position={[-0.01, 0.1, 0.01]} rotation={[0, 0.05, 0]}>
          <boxGeometry args={[0.35, 0.04, 0.25]} />
          <meshStandardMaterial color="#059669" roughness={0.5} />
        </mesh>
      </group>

      {/* Modern Geometric Trophy / Art Piece */}
      <group position={[0.2, 1.25, 0.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.08, 16]} />
          <meshStandardMaterial color="#18181b" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.14, 0]} castShadow>
          <octahedronGeometry args={[0.1, 0]} />
          <meshStandardMaterial color="#facc15" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* Minimalist Brass Reading Lamp */}
      <group position={[1.1, 1.28, 0.18]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.44, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.16, 0.18, 16]} />
          <meshStandardMaterial color="#fef3c7" roughness={0.3} />
        </mesh>
        {/* Soft Warm Lamp Glow */}
        <pointLight position={[0, 0.4, 0]} intensity={1.5} color="#fef08a" distance={3.5} />
      </group>

      {/* Shelf 1 (y = 2.4): Rows of Marketing & Design Books */}
      <group position={[-1.1, 2.7, 0.12]}>
        {[-0.32, -0.22, -0.12, -0.02, 0.08, 0.18, 0.28, 0.38, 0.48, 0.58].map((bx, bi) => (
          <mesh key={bi} position={[bx, 0, 0]} castShadow>
            <boxGeometry args={[0.08, 0.38, 0.18]} />
            <meshStandardMaterial
              color={
                bi % 5 === 0
                  ? '#38bdf8'
                  : bi % 5 === 1
                  ? '#f43f5e'
                  : bi % 5 === 2
                  ? '#10b981'
                  : bi % 5 === 3
                  ? '#fbbf24'
                  : '#a855f7'
              }
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>
      {/* Decorative Ceramic Planter on Shelf 1 */}
      <group position={[0.8, 2.62, 0.12]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.1, 0.07, 0.2, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        <mesh position={[0, 0.14, 0]} castShadow>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="#16a34a" roughness={0.7} />
        </mesh>
      </group>

      {/* Shelf 2 (y = 3.8): Art Books + Minimalist White Ceramic Vases */}
      <group position={[0.3, 4.1, 0.12]}>
        {[-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3].map((bx, bi) => (
          <mesh key={`s2-b-${bi}`} position={[bx, 0, 0]} castShadow>
            <boxGeometry args={[0.075, 0.36, 0.18]} />
            <meshStandardMaterial
              color={bi % 3 === 0 ? '#1e293b' : bi % 3 === 1 ? '#0284c7' : '#D4FF00'}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>
      <group position={[-0.9, 4.05, 0.12]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.11, 0.28, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.15} />
        </mesh>
      </group>
      <group position={[-0.5, 4.02, 0.12]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.08, 0.22, 16]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.3} />
        </mesh>
      </group>

      {/* Shelf 3 (y = 5.2): Design Artifacts & Award Statues */}
      {[-0.9, -0.3, 0.3, 0.9].map((ax, ai) => (
        <group key={`s3-art-${ai}`} position={[ax, 5.42, 0.12]}>
          <mesh castShadow>
            <boxGeometry args={[0.18, 0.24, 0.14]} />
            <meshStandardMaterial
              color={ai % 2 === 0 ? '#fef08a' : '#f8fafc'}
              roughness={0.3}
              metalness={0.5}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/**
 * 4. LeftAnalyticsWall (Left Wall): Scaled down by ~30%, tightened to wall with grounded storytelling
 */
const LeftAnalyticsWall: React.FC = () => {
  const halfW = OFFICE_ROOM_CONFIG.width / 2;
  const wh = OFFICE_ROOM_CONFIG.wallHeight;

  return (
    <group position={[-halfW + 0.08, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {/* Warm Oak Wall Backdrop Panel */}
      <mesh position={[0, wh / 2, -0.04]} receiveShadow>
        <boxGeometry args={[18, wh, 0.08]} />
        <meshStandardMaterial color="#2a1f16" roughness={0.55} metalness={0.1} />
      </mesh>

      {/* Horizontal Warm Accent Trim */}
      <mesh position={[0, wh - 0.35, 0.01]}>
        <boxGeometry args={[17.8, 0.03, 0.02]} />
        <meshBasicMaterial color="#fef08a" />
      </mesh>

      {/* ── TOP TIER: 3 COMPACT HUD DISPLAYS (Scaled down 30%) ── */}
      <group position={[-4.5, 5.8, 0.04]}>
        <Html center distanceFactor={5.6} transform occlude={false} className="pointer-events-none select-none">
          <div style={{ display: 'flex', gap: '14px', width: '420px', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            {/* HUD 1: Tone waveform */}
            <div style={{ flex: 1, backgroundColor: '#090d1a', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px', height: '105px', boxShadow: '0 0 14px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>BRAND VOICE // TONE</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '65px', gap: '2px' }}>
                {[45, 65, 80, 55, 90, 70, 50, 85, 65, 95, 75, 60, 85, 90, 65].map((h, idx) => (
                  <div key={idx} style={{ flex: 1, height: `${h}%`, backgroundColor: '#38bdf8', borderRadius: '1px' }} />
                ))}
              </div>
            </div>
            {/* HUD 2: Pillar distribution */}
            <div style={{ flex: 1, backgroundColor: '#090d1a', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px', height: '105px', boxShadow: '0 0 14px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#e879f9', marginBottom: '4px' }}>TRỤ CỘT NỘI DUNG</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                <div style={{ width: '85%', height: '7px', backgroundColor: '#e879f9', borderRadius: '2px' }} />
                <div style={{ width: '65%', height: '7px', backgroundColor: '#38bdf8', borderRadius: '2px' }} />
                <div style={{ width: '90%', height: '7px', backgroundColor: '#D4FF00', borderRadius: '2px' }} />
                <div style={{ width: '50%', height: '7px', backgroundColor: '#34d399', borderRadius: '2px' }} />
              </div>
            </div>
            {/* HUD 3: Agent status */}
            <div style={{ flex: 1, backgroundColor: '#090d1a', border: '1px solid #1e293b', borderRadius: '8px', padding: '8px', height: '105px', boxShadow: '0 0 14px rgba(0,0,0,0.5)' }}>
              <div style={{ fontSize: '8px', fontWeight: 700, color: '#D4FF00', marginBottom: '4px' }}>TRẠNG THÁI AGENT</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#D4FF00', marginTop: '8px', textAlign: 'center' }}>6 READY</div>
              <div style={{ fontSize: '8px', color: '#94a3b8', textAlign: 'center', marginTop: '4px' }}>3 ĐANG HOẠT ĐỘNG</div>
            </div>
          </div>
        </Html>
      </group>

      {/* ── MIDDLE TIER: STRATEGY PIPELINE STATUS (Scaled down 30%) ── */}
      <group position={[-4.5, 3.8, 0.04]}>
        <Html center distanceFactor={5.2} transform occlude={false} className="pointer-events-none select-none">
          <div style={{ width: '340px', backgroundColor: '#090d1a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', gap: '14px', fontFamily: "'Inter', -apple-system, sans-serif", boxShadow: '0 0 16px rgba(0,0,0,0.5)' }}>
            <div style={{ width: '68px', height: '68px', borderRadius: '50%', border: '4px solid #34d399', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 12px rgba(52,211,153,0.25)' }}>
              <span style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>T34</span>
              <span style={{ fontSize: '7px', fontWeight: 700, color: '#34d399' }}>TUẦN NÀY</span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.06em', marginBottom: '6px' }}>KẾ HOẠCH TUẦN</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '9px', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Trụ cột B02</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>4/4 Hoàn tất</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Lịch phát hành B03</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>14 Bài đăng</span>
                </div>
              </div>
            </div>
          </div>
        </Html>
      </group>

      {/* ── BOTTOM TIER: NỘI DUNG HÔM NAY (Scaled down 30%) ── */}
      <group position={[3.5, 3.8, 0.04]}>
        <Html center distanceFactor={5.2} transform occlude={false} className="pointer-events-none select-none">
          <div style={{ width: '360px', backgroundColor: '#090d1a', border: '1px solid #1e293b', borderRadius: '8px', padding: '12px', fontFamily: "'Inter', -apple-system, sans-serif", boxShadow: '0 0 16px rgba(0,0,0,0.5)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.08em', marginBottom: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
              NỘI DUNG HÔM NAY
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div style={{ backgroundColor: '#10162a', padding: '6px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px' }}>Ý tưởng</div>
                <div style={{ backgroundColor: '#fef08a', color: '#713f12', padding: '4px', borderRadius: '3px', fontSize: '8px', fontWeight: 600 }}>
                  📝 Story hoàng hôn
                </div>
              </div>

              <div style={{ backgroundColor: '#10162a', padding: '6px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '8px', fontWeight: 700, color: '#38bdf8', marginBottom: '4px' }}>Đang làm</div>
                <div style={{ backgroundColor: '#bae6fd', color: '#0369a1', padding: '4px', borderRadius: '3px', fontSize: '8px', fontWeight: 600 }}>
                  🎨 Combo Trưa (D02)
                </div>
              </div>

              <div style={{ backgroundColor: '#10162a', padding: '6px', borderRadius: '4px', border: '1px solid #1e293b' }}>
                <div style={{ fontSize: '8px', fontWeight: 700, color: '#34d399', marginBottom: '4px' }}>Đã duyệt</div>
                <div style={{ backgroundColor: '#bbf7d0', color: '#14532d', padding: '4px', borderRadius: '3px', fontSize: '8px', fontWeight: 600 }}>
                  ✅ Lịch T34 (B03)
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
 * 5. Architectural Crown / Perimeter Cove Light Soffit
 */
const CeilingPerimeterCrown: React.FC = () => {
  const { width, depth } = OFFICE_ROOM_CONFIG;
  const timeOfDay = useOfficeStore((s) => s.timeOfDay);
  const isDay = timeOfDay === 'day';
  const crownY = 8.85;

  return (
    <group position={[0, crownY, 0]}>
      {/* Back Wall Soffit */}
      <mesh position={[0, 0, -depth / 2 + 0.7]}>
        <boxGeometry args={[width, 0.3, 1.4]} />
        <meshStandardMaterial color={isDay ? '#222738' : '#141724'} roughness={0.6} />
      </mesh>
      {/* Cove Light Glow */}
      <mesh position={[0, -0.16, -depth / 2 + 1.4]}>
        <boxGeometry args={[width, 0.04, 0.03]} />
        <meshBasicMaterial color={isDay ? '#ffffff' : '#fef08a'} />
      </mesh>

      {/* Left Wall Soffit */}
      <mesh position={[-width / 2 + 0.7, 0, 0]}>
        <boxGeometry args={[1.4, 0.3, depth]} />
        <meshStandardMaterial color={isDay ? '#222738' : '#141724'} roughness={0.6} />
      </mesh>
      <mesh position={[-width / 2 + 1.4, -0.16, 0]}>
        <boxGeometry args={[0.03, 0.04, depth]} />
        <meshBasicMaterial color={isDay ? '#ffffff' : '#fef08a'} />
      </mesh>

      {/* Right Wall Soffit */}
      <mesh position={[width / 2 - 0.7, 0, 0]}>
        <boxGeometry args={[1.4, 0.3, depth]} />
        <meshStandardMaterial color={isDay ? '#222738' : '#141724'} roughness={0.6} />
      </mesh>
      <mesh position={[width / 2 - 1.4, -0.16, 0]}>
        <boxGeometry args={[0.03, 0.04, depth]} />
        <meshBasicMaterial color={isDay ? '#ffffff' : '#fef08a'} />
      </mesh>

      {/* Recessed Warm Downlights */}
      {[-8.0, -4.0, 0, 4.0, 8.0].map((x, xi) => (
        <mesh key={`dl-b-${xi}`} position={[x, -0.16, -depth / 2 + 0.7]}>
          <circleGeometry args={[0.16, 16]} />
          <meshBasicMaterial color="#fffbeb" />
        </mesh>
      ))}
      {[-6.0, -1.0, 4.0].map((z, zi) => (
        <React.Fragment key={`dl-sides-${zi}`}>
          <mesh position={[-width / 2 + 0.7, -0.16, z]}>
            <circleGeometry args={[0.16, 16]} />
            <meshBasicMaterial color="#fffbeb" />
          </mesh>
          <mesh position={[width / 2 - 0.7, -0.16, z]}>
            <circleGeometry args={[0.16, 16]} />
            <meshBasicMaterial color="#fffbeb" />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

/**
 * 6. AICommandKiosk: Repositioned as an elegant freestanding console in the entrance/lounge niche
 */
const AICommandKiosk: React.FC = () => {
  return (
    <group position={[-9.2, 0, 3.8]} rotation={[0, 0.6, 0]}>
      {/* Sleek Upright Pedestal */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1.1, 0.4]} />
        <meshStandardMaterial color="#181c2b" metalness={0.8} roughness={0.25} />
      </mesh>
      {/* Accent Edge */}
      <mesh position={[0, 1.08, 0.19]}>
        <boxGeometry args={[0.46, 0.02, 0.02]} />
        <meshBasicMaterial color="#D4FF00" />
      </mesh>

      {/* Slight 12-degree angled console display */}
      <group position={[0, 1.15, 0.06]} rotation={[-0.2, 0, 0]}>
        <Html center distanceFactor={5.0} transform occlude={false} className="pointer-events-none select-none">
          <div style={{ width: '260px', backgroundColor: '#090d1c', border: '2px solid #D4FF00', borderRadius: '8px', padding: '12px', textAlign: 'center', boxShadow: '0 0 18px rgba(212,255,0,0.2)', fontFamily: "'Inter', -apple-system, sans-serif" }}>
            <div style={{ fontSize: '10px', fontWeight: 900, color: '#D4FF00', letterSpacing: '0.12em', marginBottom: '6px' }}>
              CREWLAB OPERATIONS HUB
            </div>

            {/* Glowing AI Avatar Face */}
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#0e172e', border: '2px solid #38bdf8', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px #38bdf8' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
              </div>
              <div style={{ width: '18px', height: '2px', backgroundColor: '#D4FF00', borderRadius: '2px' }} />
            </div>

            <div style={{ fontSize: '8px', fontWeight: 700, color: '#38bdf8', marginTop: '6px' }}>
              6 AGENTS SYNCED · READY
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
};

/**
 * 7. ForegroundLounge (Front-Right Lounge Area): Dark leather modular sofa
 */
const ForegroundLounge: React.FC = () => {
  return (
    <group position={[8.5, 0, 6.8]} rotation={[0, -0.4, 0]}>
      {/* Base */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 0.38, 0.95]} />
        <meshStandardMaterial color="#1c1d26" roughness={0.7} />
      </mesh>
      {/* Cushions */}
      <mesh position={[-0.65, 0.43, 0.08]} castShadow>
        <boxGeometry args={[1.2, 0.12, 0.75]} />
        <meshStandardMaterial color="#282936" roughness={0.6} />
      </mesh>
      <mesh position={[0.65, 0.43, 0.08]} castShadow>
        <boxGeometry args={[1.2, 0.12, 0.75]} />
        <meshStandardMaterial color="#282936" roughness={0.6} />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.62, 0.38]} castShadow>
        <boxGeometry args={[2.6, 0.48, 0.24]} />
        <meshStandardMaterial color="#1a1b24" roughness={0.7} />
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
          1. FLOOR — Polished Dark Slate Tiles + Bright Electric-Lime Grid Lines
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
          2. PERIMETER CEILING CROWN SOFFIT
         ═══════════════════════════════════════════════════════ */}
      <CeilingPerimeterCrown />

      {/* ═══════════════════════════════════════════════════════
          3. BACK WALL & CREDENZAS (Hospitality Bar & Design Library)
         ═══════════════════════════════════════════════════════ */}
      <RigidBody type="fixed" colliders="hull">
        <mesh position={[0, wallHeight / 2, -halfD - wallThickness / 2]} receiveShadow castShadow>
          <boxGeometry args={[width, wallHeight, wallThickness]} />
          <meshStandardMaterial color="#14141a" roughness={0.85} />
        </mesh>
      </RigidBody>

      <BrandWall />
      <CoffeeBarCredenza />
      <DesignBookshelfCredenza />

      {/* Vertical Light Columns */}
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
          5. RIGHT PANORAMIC GLASS WALL & BALCONY TERRACE (Clean Open View)
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
            <meshStandardMaterial color="#11131c" metalness={0.9} roughness={0.15} />
          </mesh>
        ))}

        {/* Clear Glass Pane */}
        <mesh position={[halfW, wallHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[0.04, wallHeight - 0.12, depth - 0.12]} />
          <meshPhysicalMaterial
            color={isDay ? '#ffffff' : '#e0e7ff'}
            transparent
            opacity={0.15}
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
          <meshStandardMaterial color={isDay ? '#3e2723' : '#221914'} roughness={0.6} />
        </mesh>
        <mesh position={[2.9, 0.55, 0]}>
          <boxGeometry args={[0.04, 1.1, depth - 0.2]} />
          <meshPhysicalMaterial color="#ffffff" transparent opacity={0.2} roughness={0.05} transmission={0.95} />
        </mesh>
        <mesh position={[2.9, 1.12, 0]}>
          <boxGeometry args={[0.1, 0.05, depth]} />
          <meshStandardMaterial color="#11131c" metalness={0.95} />
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
              <meshStandardMaterial color="#16a34a" roughness={0.8} />
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
          7. INDOOR POTTED PLANTS
         ═══════════════════════════════════════════════════════ */}
      {/* Front-Left Plant near lounge */}
      <group position={[-9.8, 0, 5.5]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.3, 0.9, 20]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.65} />
        </mesh>
        <mesh position={[0.2, 1.7, 0.1]} castShadow>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshStandardMaterial color="#22c55e" roughness={0.65} />
        </mesh>
      </group>

      {/* Front-Right Plant in Planter Box */}
      <group position={[10.2, 0, 6.8]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.9, 0.7, 0.9]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.0, 0]} castShadow>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.65} />
        </mesh>
      </group>

      {/* Back-Left Corner Plant */}
      <group position={[-11.2, 0, -9.5]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.26, 0.9, 20]} />
          <meshStandardMaterial color="#222533" roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <sphereGeometry args={[0.58, 16, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.7} />
        </mesh>
      </group>

      {/* Back-Right Corner Plant */}
      <group position={[11.2, 0, -9.5]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.26, 0.9, 20]} />
          <meshStandardMaterial color="#222533" roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <sphereGeometry args={[0.58, 16, 16]} />
          <meshStandardMaterial color="#16a34a" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};
