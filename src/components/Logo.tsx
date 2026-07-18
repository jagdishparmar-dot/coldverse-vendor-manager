"use client";

import React from "react";
import {
  COMPANY_LEGAL_NAME,
  COMPANY_LOGO_PATH,
  COMPANY_SHORT_NAME,
} from "@/src/constants/brand";

interface SmileLogoProps {
  className?: string;
  showText?: boolean;
}

export function SmileLogo({ className = "", showText = true }: SmileLogoProps) {
  if (showText) {
    return (
      <div className={`flex items-center gap-3 select-none ${className}`}>
        <img
          src={COMPANY_LOGO_PATH}
          alt={COMPANY_LEGAL_NAME}
          className="h-10 md:h-12 w-auto object-contain"
        />
        <div className="min-w-0 leading-tight hidden sm:block">
          <p className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight truncate">
            {COMPANY_SHORT_NAME}
          </p>
          <p className="text-[10px] md:text-[11px] font-medium text-slate-500 truncate">
            Integrated Logistics Limited
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src={COMPANY_LOGO_PATH}
        alt={COMPANY_SHORT_NAME}
        className="h-10 w-auto md:h-12 object-contain"
      />
    </div>
  );
}
