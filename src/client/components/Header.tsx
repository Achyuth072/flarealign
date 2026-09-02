import React from "react";
import { Zap, User, ChevronDown } from "lucide-react";
import type { CandidateProfile } from "../types";

interface HeaderProps {
  candidate: CandidateProfile | null;
  onEditProfile: () => void;
  status: string;
}

export function Header({
  candidate,
  onEditProfile,
  status,
}: HeaderProps) {
  return (
    <header className="navbar bg-[#0E0F12] border-b border-[#22242B] px-4 h-12 min-h-[3rem] justify-between z-20 shrink-0 font-sans select-none">
      {/* Left: Cloudflare Cloud Logo + Agent Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-7 h-7 rounded-lg bg-[#F6821F] text-white flex items-center justify-center font-bold shadow-sm">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-white font-mono tracking-tight">
              Cloudflare Agent
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1A1B20] text-[#F6821F] border border-[#282A34] font-mono font-medium hidden sm:inline-block">
              Platforms &amp; Productivity
            </span>
          </div>
        </div>

        {/* Candidate Selector Pill */}
        {candidate && (
          <button
            onClick={onEditProfile}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[#18191E] text-xs text-[#90909A] hover:text-[#E0E2EC] transition-colors border border-transparent hover:border-[#282A34] ml-2 hidden md:flex"
            title="Edit Candidate Profile in SQLite"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium truncate max-w-[160px] text-xs">{candidate.name}</span>
            <span className="text-[10px] text-[#606068]">({candidate.yearsOfExperience}y Exp)</span>
            <ChevronDown className="w-3 h-3 text-[#60606A]" />
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 text-xs text-[#90909A]">
        {/* Edge Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#141518] border border-[#22242B] text-[11px] font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-white font-medium">42ms Edge</span>
          <span className="text-[#40404A]">|</span>
          <span className="text-[#80808A]">Llama 3.3 70B</span>
        </div>

        {/* User Avatar / Profile */}
        <button
          onClick={onEditProfile}
          className="w-7 h-7 rounded-full bg-[#1A1B20] border border-[#282A34] flex items-center justify-center text-[#D0D2DC] hover:text-white hover:border-[#3E4252] transition-colors"
          title="Candidate Profile"
        >
          <User className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
