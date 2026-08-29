'use client';

import React from 'react';

interface AgentAvatarProps {
  code: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
}

export const AgentAvatarIllustration: React.FC<AgentAvatarProps> = ({
  code,
  size = 'md',
  showBadge = true,
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const badgeSizeMap = {
    sm: 'text-[8px] px-1 py-0.2',
    md: 'text-[9px] px-1.5 py-0.5',
    lg: 'text-[10px] px-2 py-0.5',
    xl: 'text-xs px-2.5 py-1',
  };

  const renderAvatarContent = () => {
    switch (code) {
      case 'A01': // Sếp Vũ - Team lead with AR glasses & navy cyber suit
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bgA01" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e3a8a" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
              <linearGradient id="suitA01" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="glowA01" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#D4FF00" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="24" fill="url(#bgA01)" />
            {/* Background Halo */}
            <circle cx="50" cy="50" r="38" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.4" />
            <circle cx="50" cy="50" r="32" stroke="#60a5fa" strokeWidth="0.75" opacity="0.6" />
            
            {/* Body / Navy Suit */}
            <path d="M22 96 C22 74 34 68 50 68 C66 68 78 74 78 96 Z" fill="url(#suitA01)" />
            <path d="M42 68 L50 82 L58 68 Z" fill="#ffffff" />
            {/* Electric Tie */}
            <path d="M47 70 L53 70 L52 88 L50 92 L48 88 Z" fill="#D4FF00" />
            
            {/* Neck */}
            <rect x="44" y="54" width="12" height="16" rx="3" fill="#fed7aa" />
            {/* Head */}
            <rect x="33" y="26" width="34" height="34" rx="14" fill="#fed7aa" />
            {/* Sharp Executive Hair */}
            <path d="M30 32 C30 18 42 14 62 14 C70 14 74 20 74 28 C74 34 70 30 68 28 C60 22 42 20 36 34 Z" fill="#0f172a" />
            <path d="M30 32 L33 42 L36 34 Z" fill="#0f172a" />
            {/* Eyebrows */}
            <path d="M38 36 L46 34" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M54 34 L62 36" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
            {/* Eyes */}
            <circle cx="42" cy="41" r="2.2" fill="#0f172a" />
            <circle cx="58" cy="41" r="2.2" fill="#0f172a" />
            {/* AR Cyber Glasses */}
            <rect x="36" y="37" width="13" height="8" rx="2" fill="#3b82f6" fillOpacity="0.45" stroke="#60a5fa" strokeWidth="1.5" />
            <rect x="51" y="37" width="13" height="8" rx="2" fill="#3b82f6" fillOpacity="0.45" stroke="#60a5fa" strokeWidth="1.5" />
            <line x1="49" y1="41" x2="51" y2="41" stroke="#60a5fa" strokeWidth="1.5" />
            {/* Glasses HUD scan line */}
            <line x1="38" y1="40" x2="47" y2="40" stroke="#D4FF00" strokeWidth="0.8" />
            {/* Confident Smile */}
            <path d="M44 51 Q50 55 56 51" stroke="#9a3412" strokeWidth="1.5" strokeLinecap="round" />
            {/* Ear */}
            <circle cx="32" cy="42" r="3" fill="#fca5a5" />
            <circle cx="68" cy="42" r="3" fill="#fca5a5" />
            {/* Executive Neural Earpiece */}
            <circle cx="69" cy="44" r="2" fill="#D4FF00" />
          </svg>
        );

      case 'B02': // Chị Hà - Trend Hunter & Content Pillar with smart glasses & emerald blazer
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bgB02" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#064e3b" />
                <stop offset="100%" stopColor="#022c22" />
              </linearGradient>
              <linearGradient id="suitB02" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="24" fill="url(#bgB02)" />
            {/* Background Hologram Bars */}
            <rect x="20" y="24" width="4" height="12" rx="1" fill="#34d399" opacity="0.3" />
            <rect x="26" y="18" width="4" height="18" rx="1" fill="#34d399" opacity="0.5" />
            <rect x="74" y="20" width="4" height="16" rx="1" fill="#34d399" opacity="0.4" />
            
            {/* Hair Bun Back */}
            <circle cx="50" cy="18" r="14" fill="#3b1d11" />
            {/* Body / Emerald Blazer */}
            <path d="M22 96 C22 74 34 68 50 68 C66 68 78 74 78 96 Z" fill="url(#suitB02)" />
            <path d="M42 68 L50 84 L58 68 Z" fill="#ecfdf5" />
            {/* Silk Scarf */}
            <path d="M46 72 L54 72 L50 82 Z" fill="#34d399" />
            
            {/* Neck */}
            <rect x="44" y="54" width="12" height="16" rx="3" fill="#fed7aa" />
            {/* Head */}
            <rect x="33" y="26" width="34" height="34" rx="14" fill="#fed7aa" />
            {/* Sleek Brunette Hair */}
            <path d="M30 32 C30 18 42 16 58 16 C70 16 74 22 74 32 C74 42 72 48 70 52 C68 44 66 26 50 24 C36 24 32 38 30 52 Z" fill="#3b1d11" />
            {/* Trendy Cat-eye Smart Glasses */}
            <path d="M35 38 L48 38 L45 46 L37 46 Z" fill="#047857" fillOpacity="0.3" stroke="#34d399" strokeWidth="1.4" />
            <path d="M52 38 L65 38 L63 46 L55 46 Z" fill="#047857" fillOpacity="0.3" stroke="#34d399" strokeWidth="1.4" />
            <line x1="48" y1="41" x2="52" y2="41" stroke="#34d399" strokeWidth="1.4" />
            {/* Eyes behind glasses */}
            <circle cx="41" cy="42" r="2" fill="#1e1b4b" />
            <circle cx="59" cy="42" r="2" fill="#1e1b4b" />
            {/* Bright Smile */}
            <path d="M44 51 Q50 56 56 51" stroke="#be123c" strokeWidth="1.8" strokeLinecap="round" />
            {/* Earrings */}
            <circle cx="31" cy="45" r="2" fill="#34d399" />
            <circle cx="69" cy="45" r="2" fill="#34d399" />
          </svg>
        );

      case 'B03': // Anh Minh - Calendar Master with high-tech headset & crisp azure shirt
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bgB03" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#075985" />
                <stop offset="100%" stopColor="#082f49" />
              </linearGradient>
              <linearGradient id="suitB03" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="24" fill="url(#bgB03)" />
            {/* Grid Matrix overlay in background */}
            <line x1="16" y1="20" x2="84" y2="20" stroke="#38bdf8" strokeWidth="0.8" opacity="0.25" />
            <line x1="16" y1="35" x2="84" y2="35" stroke="#38bdf8" strokeWidth="0.8" opacity="0.25" />
            
            {/* Body */}
            <path d="M22 96 C22 74 34 68 50 68 C66 68 78 74 78 96 Z" fill="url(#suitB03)" />
            <path d="M44 68 L50 78 L56 68 Z" fill="#ffffff" />
            <rect x="48" y="78" width="4" height="18" fill="#38bdf8" />
            
            {/* Neck */}
            <rect x="44" y="54" width="12" height="16" rx="3" fill="#fed7aa" />
            {/* Head */}
            <rect x="33" y="26" width="34" height="34" rx="14" fill="#fed7aa" />
            {/* Neat Professional Haircut */}
            <path d="M31 30 C31 16 46 15 62 15 C72 15 72 24 72 30 C72 34 68 30 64 28 C56 24 40 24 33 32 Z" fill="#18181b" />
            {/* Precision Eyebrows */}
            <line x1="38" y1="36" x2="46" y2="36" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="54" y1="36" x2="62" y2="36" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
            {/* Eyes */}
            <circle cx="42" cy="41" r="2.2" fill="#0f172a" />
            <circle cx="58" cy="41" r="2.2" fill="#0f172a" />
            {/* High-Tech Headset with mic */}
            <path d="M30 40 C30 20 70 20 70 40" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="27" y="36" width="5" height="12" rx="2" fill="#38bdf8" />
            <rect x="68" y="36" width="5" height="12" rx="2" fill="#38bdf8" />
            <path d="M30 46 L40 52 L44 50" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="45" cy="50" r="1.5" fill="#D4FF00" />
            {/* Calm confident mouth */}
            <line x1="45" y1="52" x2="55" y2="52" stroke="#9a3412" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );

      case 'D01': // Bé Thư - Copywriter Gen Z with cat-ear headphones & glowing vibe
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bgD01" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9a3412" />
                <stop offset="100%" stopColor="#431407" />
              </linearGradient>
              <linearGradient id="suitD01" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="24" fill="url(#bgD01)" />
            {/* Floating Sparkles */}
            <path d="M22 24 L24 20 L26 24 L30 26 L26 28 L24 32 L22 28 L18 26 Z" fill="#fbbf24" />
            <path d="M74 22 L75.5 19 L77 22 L80 23.5 L77 25 L75.5 28 L74 25 L71 23.5 Z" fill="#fbbf24" />
            
            {/* Long Hair Back */}
            <path d="M26 40 C24 60 22 80 24 96 C24 96 76 96 76 96 C78 80 76 60 74 40 Z" fill="#78350f" />
            {/* Cute Yellow Hoodie */}
            <path d="M22 96 C22 74 34 68 50 68 C66 68 78 74 78 96 Z" fill="url(#suitD01)" />
            <circle cx="50" cy="74" r="5" fill="#fef3c7" />
            
            {/* Neck */}
            <rect x="44" y="54" width="12" height="16" rx="3" fill="#fed7aa" />
            {/* Head */}
            <rect x="33" y="26" width="34" height="34" rx="14" fill="#fed7aa" />
            {/* Gen Z Bangs and Hair */}
            <path d="M30 32 C30 18 42 16 58 16 C70 16 74 24 74 32 C74 40 70 38 68 36 C64 32 60 30 50 30 C40 30 36 32 32 36 Z" fill="#78350f" />
            <path d="M34 30 Q42 38 46 32 Q54 38 66 30" fill="#78350f" />
            {/* Sparkling Big Eyes */}
            <circle cx="41" cy="42" r="3.2" fill="#18181b" />
            <circle cx="40" cy="40.5" r="1.2" fill="#ffffff" />
            <circle cx="59" cy="42" r="3.2" fill="#18181b" />
            <circle cx="58" cy="40.5" r="1.2" fill="#ffffff" />
            {/* Pink Blush */}
            <ellipse cx="36" cy="46" rx="3" ry="1.5" fill="#fb7185" opacity="0.6" />
            <ellipse cx="64" cy="46" rx="3" ry="1.5" fill="#fb7185" opacity="0.6" />
            {/* Playful Open Smile */}
            <path d="M44 50 Q50 57 56 50 Z" fill="#e11d48" />
            
            {/* Cat-Ear Gaming Headphone */}
            <path d="M30 40 C30 20 70 20 70 40" stroke="#fbbf24" strokeWidth="2.5" />
            {/* Left Cat Ear */}
            <polygon points="34,22 42,12 44,22" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
            <polygon points="36,21 41,15 42,21" fill="#f43f5e" />
            {/* Right Cat Ear */}
            <polygon points="56,22 58,12 66,22" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1" />
            <polygon points="58,21 59,15 64,21" fill="#f43f5e" />
            {/* Ear Cups with LED Glow */}
            <circle cx="28" cy="42" r="5" fill="#fbbf24" />
            <circle cx="28" cy="42" r="3" fill="#f43f5e" />
            <circle cx="72" cy="42" r="5" fill="#fbbf24" />
            <circle cx="72" cy="42" r="3" fill="#f43f5e" />
          </svg>
        );

      case 'D02': // Anh Khoa - Visual Designer with neon artist glasses & purple cyberpunk vest
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bgD02" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#701a75" />
                <stop offset="100%" stopColor="#3b0764" />
              </linearGradient>
              <linearGradient id="suitD02" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c026d3" />
                <stop offset="100%" stopColor="#9333ea" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="24" fill="url(#bgD02)" />
            {/* Color Palette Wheel Background */}
            <circle cx="22" cy="24" r="4" fill="#f43f5e" />
            <circle cx="28" cy="18" r="4" fill="#3b82f6" />
            <circle cx="36" cy="16" r="4" fill="#10b981" />
            <circle cx="76" cy="24" r="5" stroke="#e879f9" strokeWidth="1" strokeDasharray="2 2" />
            
            {/* Body / Cyberpunk Purple Vest */}
            <path d="M22 96 C22 74 34 68 50 68 C66 68 78 74 78 96 Z" fill="url(#suitD02)" />
            <path d="M40 68 L50 82 L60 68 Z" fill="#18181b" />
            {/* Laser Stylus on chest */}
            <line x1="47" y1="74" x2="47" y2="88" stroke="#e879f9" strokeWidth="2" strokeLinecap="round" />
            
            {/* Neck */}
            <rect x="44" y="54" width="12" height="16" rx="3" fill="#fed7aa" />
            {/* Head */}
            <rect x="33" y="26" width="34" height="34" rx="14" fill="#fed7aa" />
            {/* Stylish Undercut / Purple highlights */}
            <path d="M30 32 C30 16 46 12 64 14 C74 16 76 26 76 32 C70 30 64 26 50 26 C36 26 32 34 30 40 Z" fill="#1e1b4b" />
            <path d="M42 16 C52 14 62 18 68 24 Z" fill="#e879f9" opacity="0.8" />
            {/* Designer Round Glasses */}
            <circle cx="41" cy="41" r="6.5" stroke="#e879f9" strokeWidth="1.6" fill="#581c87" fillOpacity="0.3" />
            <circle cx="59" cy="41" r="6.5" stroke="#e879f9" strokeWidth="1.6" fill="#581c87" fillOpacity="0.3" />
            <line x1="47.5" y1="41" x2="52.5" y2="41" stroke="#e879f9" strokeWidth="1.6" />
            {/* Eyes */}
            <circle cx="41" cy="41" r="2.2" fill="#ffffff" />
            <circle cx="59" cy="41" r="2.2" fill="#ffffff" />
            {/* Creative smirk */}
            <path d="M45 52 Q52 55 58 50" stroke="#831843" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        );

      case 'E01': // Chị Lan - Guardian QA with holographic scan monocle & purple trench coat
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bgE01" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4c1d95" />
                <stop offset="100%" stopColor="#1e1b4b" />
              </linearGradient>
              <linearGradient id="suitE01" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#5b21b6" />
              </linearGradient>
            </defs>
            <rect width="100" height="100" rx="24" fill="url(#bgE01)" />
            {/* Shield Check Grid in background */}
            <path d="M72 18 L80 22 L80 32 Q80 38 72 42 Q64 38 64 32 L64 22 Z" stroke="#a78bfa" strokeWidth="1" fill="none" opacity="0.4" />
            <path d="M69 28 L72 31 L77 25" stroke="#a78bfa" strokeWidth="1.2" fill="none" opacity="0.6" />
            
            {/* Body / High-Collar Trench Coat */}
            <path d="M22 96 C22 74 34 68 50 68 C66 68 78 74 78 96 Z" fill="url(#suitE01)" />
            <path d="M38 68 L50 86 L62 68 Z" fill="#18181b" />
            {/* Golden Badge */}
            <polygon points="50,76 53,82 59,82 54,86 56,92 50,88 44,92 46,86 41,82 47,82" fill="#fbbf24" />
            
            {/* Neck */}
            <rect x="44" y="54" width="12" height="16" rx="3" fill="#fed7aa" />
            {/* Head */}
            <rect x="33" y="26" width="34" height="34" rx="14" fill="#fed7aa" />
            {/* Sleek Bob Haircut */}
            <path d="M28 32 C28 16 42 14 58 14 C72 14 74 22 74 36 C74 48 72 54 70 56 C68 44 66 26 50 26 C34 26 30 42 28 56 Z" fill="#09090b" />
            {/* Sharp Eyes */}
            <circle cx="39" cy="41" r="2.2" fill="#0f172a" />
            {/* Monocle Scanner over Left Eye (viewer's right) */}
            <circle cx="59" cy="41" r="6" stroke="#a78bfa" strokeWidth="1.6" fill="#a78bfa" fillOpacity="0.25" />
            <circle cx="59" cy="41" r="2" fill="#D4FF00" />
            {/* Crosshair on Monocle */}
            <line x1="59" y1="33" x2="59" y2="49" stroke="#D4FF00" strokeWidth="0.7" strokeDasharray="1 1" />
            <line x1="51" y1="41" x2="67" y2="41" stroke="#D4FF00" strokeWidth="0.7" strokeDasharray="1 1" />
            {/* Strict smile / composure */}
            <path d="M44 52 L56 52" stroke="#831843" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      default: // Generic fallback
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="24" fill="#1e293b" />
            <circle cx="50" cy="40" r="16" fill="#fed7aa" />
            <path d="M24 96 C24 74 36 68 50 68 C64 68 76 74 76 96 Z" fill="#0f172a" />
            <circle cx="50" cy="50" r="24" stroke="#D4FF00" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
        );
    }
  };

  return (
    <div className={`relative flex-shrink-0 ${sizeMap[size]} ${className}`}>
      {/* Outer subtle glow */}
      <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-transform duration-300 group-hover:scale-105">
        {renderAvatarContent()}
      </div>

      {/* Optional Badge */}
      {showBadge && (
        <span
          className={`absolute -bottom-1.5 -right-1.5 font-mono font-black rounded-lg border shadow-lg bg-[#09090B] ${badgeSizeMap[size]}`}
          style={{
            borderColor: code === 'A01' ? '#3b82f6' : code === 'B02' ? '#10b981' : code === 'B03' ? '#0ea5e9' : code === 'D01' ? '#f59e0b' : code === 'D02' ? '#d946ef' : '#8b5cf6',
            color: code === 'A01' ? '#60a5fa' : code === 'B02' ? '#34d399' : code === 'B03' ? '#38bdf8' : code === 'D01' ? '#fbbf24' : code === 'D02' ? '#f472b6' : '#a78bfa',
          }}
        >
          {code}
        </span>
      )}
    </div>
  );
};
