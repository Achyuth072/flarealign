import React from "react";
import { Zap, User, ChevronDown, Briefcase, Plus } from "lucide-react";
import type { CandidateProfile, JobPosting } from "../types";

interface HeaderProps {
  candidate: CandidateProfile | null;
  job: JobPosting | null;
  onEditProfile: () => void;
  onEditJob: () => void;
  status: string;
}

export function Header({
  candidate,
  job,
  onEditProfile,
  onEditJob,
  status,
}: HeaderProps) {
  return (
    <header
      role="banner"
      aria-label="Application header"
      className="navbar bg-[#0E0F12] border-b border-[#2F333E] px-4 h-14 min-h-[3.5rem] justify-between z-20 shrink-0 font-sans"
    >
      {/* Left: Cloudflare Cloud Logo + Agent Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F6821F] text-[#0C0D0E] flex items-center justify-center font-bold shadow-sm" aria-hidden="true">
            <Zap className="w-4 h-4 fill-[#0C0D0E]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-white font-mono tracking-tight">
              FlareAlign
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#18191E] text-[#FB923C] border border-[#3B3F4E] font-mono font-medium hidden sm:inline-block">
              Edge Career Copilot
            </span>
          </div>
        </div>

        {/* Target Job Pill / Badge */}
        {job ? (
          <button
            onClick={onEditJob}
            aria-label={`Target job: ${job.title} at ${job.company}. Click to edit target job.`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#141518] hover:bg-[#1E2026] text-xs text-[#CBD5E1] hover:text-white transition-colors border border-[#2F333E] hover:border-[#F6821F]/60 ml-2 hidden md:flex focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
            title="Edit Target Job in SQLite"
          >
            <Briefcase className="w-3.5 h-3.5 text-[#FB923C]" aria-hidden="true" />
            <span className="font-semibold text-xs text-white truncate max-w-[180px]">
              {job.title} <span className="text-[#94A3B8] font-normal">@ {job.company}</span>
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#1C1E24] text-[#FB923C] border border-[#3B3F4E] font-mono font-medium hidden lg:inline-block">
              Edit JD
            </span>
          </button>
        ) : (
          <button
            onClick={onEditJob}
            aria-label="No target job configured. Click to ingest a job posting."
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#18191E] hover:bg-[#272932] text-xs text-[#FB923C] hover:text-white transition-colors border border-dashed border-[#F6821F]/60 hover:border-[#F6821F] ml-2 hidden md:flex focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
            title="Ingest Target Job"
          >
            <Plus className="w-3.5 h-3.5 text-[#FB923C]" aria-hidden="true" />
            <span className="font-medium text-xs text-[#CBD5E1]">No Target Job Set</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#2A1705] text-[#FB923C] font-mono font-bold">
              + Ingest JD
            </span>
          </button>
        )}

        {/* Candidate Selector Pill */}
        {candidate && (
          <button
            onClick={onEditProfile}
            aria-label={`Edit profile for candidate ${candidate.name}, ${candidate.yearsOfExperience} years of experience`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#141518] hover:bg-[#1E2026] text-xs text-[#CBD5E1] hover:text-white transition-colors border border-[#2F333E] hover:border-[#F6821F]/60 ml-1 hidden lg:flex focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
            title="Edit Candidate Profile in SQLite"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="font-medium truncate max-w-[140px] text-xs text-white">{candidate.name}</span>
            <span className="text-xs text-[#94A3B8]">({candidate.yearsOfExperience}y)</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 text-xs text-[#CBD5E1]">
        {/* Edge Status Pill */}
        <div
          role="status"
          aria-label="Edge runtime status: 42 milliseconds on Edge, Llama 3.3 70B"
          className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-[#141518] border border-[#2F333E] text-xs font-mono"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden="true" />
          <span className="text-white font-semibold">42ms Edge</span>
          <span className="text-[#64748B]" aria-hidden="true">|</span>
          <span className="text-[#CBD5E1]">Llama 3.3 70B</span>
        </div>

        {/* Ingest Job Quick Button for Mobile/Small Screens */}
        <button
          onClick={onEditJob}
          aria-label={job ? "Edit target job" : "Ingest target job"}
          className="md:hidden px-2.5 py-1 rounded bg-[#18191E] border border-[#3B3F4E] text-xs text-[#FB923C] font-mono flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
        >
          <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{job ? "JD" : "+ JD"}</span>
        </button>

        {/* User Avatar / Profile Indicator */}
        <div
          role="img"
          className="w-8 h-8 rounded-full bg-[#18191E] border border-[#3B3F4E] flex items-center justify-center text-[#CBD5E1]"
          aria-label={candidate ? `Active candidate: ${candidate.name} (${candidate.targetRole})` : "Active Profile"}
          title={candidate ? `${candidate.name} (${candidate.targetRole})` : "Active Profile"}
        >
          <User className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
