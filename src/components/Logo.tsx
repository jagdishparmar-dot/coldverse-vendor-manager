import React from "react";

interface SmileLogoProps {
  className?: string;
  showText?: boolean;
}

export function SmileLogo({ className = "", showText = true }: SmileLogoProps) {
  if (showText) {
    return (
      <div className={`flex items-center select-none ${className}`}>
        {/* Full Coldverse Logo: Emblem + COLDVERSE + Tagline */}
        <svg
          viewBox="0 0 540 120"
          className="h-10 md:h-12 w-auto"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* LEFT EMBLEM (Center: 60, 60) */}
          {/* Left Dark Outer Ring */}
          <path d="M 60 5 A 55 55 0 0 0 60 115" stroke="#004e8c" strokeWidth="6" fill="none" />
          {/* Left Light Outer Ring */}
          <path d="M 60 10 A 50 50 0 0 0 60 110" stroke="#0072bc" strokeWidth="4" fill="none" />
          {/* Left Solid Fill Semi-circle */}
          <path d="M 60 14 A 46 46 0 0 0 60 106 Z" fill="#0060b6" />
          
          {/* Snowflake Details inside Left Half */}
          {/* Horizontal Stem */}
          <line x1="60" y1="60" x2="20" y2="60" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 44 60 L 37 51 M 44 60 L 37 69" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 31 60 L 26 53 M 31 60 L 26 67" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

          {/* Upper Diagonal Stem (120 degrees) */}
          <line x1="60" y1="60" x2="41" y2="27.1" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="50" y1="42.7" x2="56" y2="34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="42.7" x2="41" y2="38" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="39.6" y1="24.7" x2="35" y2="16" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

          {/* Lower Diagonal Stem (240 degrees) */}
          <line x1="60" y1="60" x2="41" y2="92.9" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="50" y1="77.3" x2="56" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="77.3" x2="41" y2="82" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

          {/* Top Half-Stem (pointing straight up) */}
          <line x1="60" y1="60" x2="60" y2="20" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="60" y1="42" x2="51" y2="34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="42" x2="51" y2="50" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="28" x2="53" y2="21" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

          {/* Bottom Half-Stem (pointing straight down) */}
          <line x1="60" y1="60" x2="60" y2="100" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="60" y1="78" x2="51" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="78" x2="51" y2="70" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="60" y1="92" x2="53" y2="99" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

          {/* RIGHT GLOBE (Center: 60, 60, radius: 48) */}
          {/* Right Wireframe Outer Semi-circle */}
          <path d="M 60 12 A 48 48 0 0 1 60 108" stroke="#0060b6" strokeWidth="3" fill="none" />
          {/* Right Wireframe Longitudinal Arcs */}
          <path d="M 60 12 A 22 48 0 0 1 60 108" stroke="#0060b6" strokeWidth="2.5" fill="none" />
          <path d="M 60 12 A 38 48 0 0 1 60 108" stroke="#0060b6" strokeWidth="2.5" fill="none" />
          {/* Right Wireframe Latitudinal Lines */}
          <line x1="60" y1="60" x2="108" y2="60" stroke="#0060b6" strokeWidth="3" />
          <line x1="60" y1="36" x2="101.5" y2="36" stroke="#0060b6" strokeWidth="2" />
          <line x1="60" y1="84" x2="101.5" y2="84" stroke="#0060b6" strokeWidth="2" />

          {/* BRAND NAME TEXT */}
          <text
            x="125"
            y="74"
            fill="#0060b6"
            fontFamily="'Inter', 'Space Grotesk', 'Segoe UI', system-ui, sans-serif"
            fontWeight="800"
            fontSize="56"
            letterSpacing="0.5"
          >
            COLDVERSE
          </text>

          {/* TAGLINE BANNER */}
          {/* Blue Background Strip */}
          <rect x="302" y="86" width="178" height="24" fill="#0060b6" />
          {/* White Tagline Text */}
          <text
            x="391"
            y="102"
            fill="#ffffff"
            fontFamily="'Inter', 'Space Grotesk', 'Segoe UI', system-ui, sans-serif"
            fontWeight="500"
            fontSize="12.5"
            textAnchor="middle"
            letterSpacing="0.2"
          >
            Every degree matters
          </text>
        </svg>
      </div>
    );
  }

  // Else, show only Emblem
  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* Coldverse Logo Emblem: snowflake half-globe circle */}
      <svg
        viewBox="0 0 120 120"
        className="h-10 w-10 md:h-12 md:w-12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* LEFT EMBLEM (Center: 60, 60) */}
        {/* Left Dark Outer Ring */}
        <path d="M 60 5 A 55 55 0 0 0 60 115" stroke="#004e8c" strokeWidth="6" fill="none" />
        {/* Left Light Outer Ring */}
        <path d="M 60 10 A 50 50 0 0 0 60 110" stroke="#0072bc" strokeWidth="4" fill="none" />
        {/* Left Solid Fill Semi-circle */}
        <path d="M 60 14 A 46 46 0 0 0 60 106 Z" fill="#0060b6" />
        
        {/* Snowflake Details inside Left Half */}
        <line x1="60" y1="60" x2="20" y2="60" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 44 60 L 37 51 M 44 60 L 37 69" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 31 60 L 26 53 M 31 60 L 26 67" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

        <line x1="60" y1="60" x2="41" y2="27.1" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="50" y1="42.7" x2="56" y2="34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="42.7" x2="41" y2="38" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

        <line x1="60" y1="60" x2="41" y2="92.9" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="50" y1="77.3" x2="56" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="50" y1="77.3" x2="41" y2="82" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

        <line x1="60" y1="60" x2="60" y2="20" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="60" y1="42" x2="51" y2="34" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="42" x2="51" y2="50" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="28" x2="53" y2="21" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

        <line x1="60" y1="60" x2="60" y2="100" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="60" y1="78" x2="51" y2="86" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="78" x2="51" y2="70" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="60" y1="92" x2="53" y2="99" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />

        {/* RIGHT GLOBE */}
        <path d="M 60 12 A 48 48 0 0 1 60 108" stroke="#0060b6" strokeWidth="3" fill="none" />
        <path d="M 60 12 A 22 48 0 0 1 60 108" stroke="#0060b6" strokeWidth="2.5" fill="none" />
        <path d="M 60 12 A 38 48 0 0 1 60 108" stroke="#0060b6" strokeWidth="2.5" fill="none" />
        <line x1="60" y1="60" x2="108" y2="60" stroke="#0060b6" strokeWidth="3" />
        <line x1="60" y1="36" x2="101.5" y2="36" stroke="#0060b6" strokeWidth="2" />
        <line x1="60" y1="84" x2="101.5" y2="84" stroke="#0060b6" strokeWidth="2" />
      </svg>
    </div>
  );
}

