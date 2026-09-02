import React from "react";
import {
  GitBranch,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import type { CandidateProfile } from "../types";

interface AgentSidebarProps {
  onTriggerWorkflow: () => void;
  isTriggeringWorkflow: boolean;
  workflowStatus: string | null;
  candidate: CandidateProfile | null;
  onEditProfile: () => void;
}

export function AgentSidebar({
  onTriggerWorkflow,
  isTriggeringWorkflow,
  workflowStatus,
  candidate,
  onEditProfile,
}: AgentSidebarProps) {
  return (
    <aside
      aria-label="Agent Navigation Sidebar"
      className="w-64 border-r border-[#2F333E] bg-[#0E0F12] flex flex-col justify-between hidden md:flex shrink-0 h-full text-xs text-[#CBD5E1] font-sans overflow-hidden"
    >
      <nav aria-label="Sidebar Navigation" className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">

        {/* Section: Candidate Profile (Single Source of Truth for SQLite State) */}
        {candidate && (
          <div className="p-3 rounded-lg bg-[#141518] border border-[#2F333E] space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-white text-xs">{candidate.name}</div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C1E24] text-[#FB923C] border border-[#3B3F4E] font-medium">
                {candidate.yearsOfExperience}y Exp
              </span>
            </div>
            <div className="text-xs text-[#94A3B8] truncate">{candidate.targetRole}</div>
            <button
              onClick={onEditProfile}
              aria-label={`Edit profile for ${candidate.name} in SQLite database`}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-[#18191E] hover:bg-[#272932] text-white text-xs font-medium border border-[#3B3F4E] hover:border-[#F6821F]/60 transition-colors focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-[#FB923C]" aria-hidden="true" />
              <span>Edit Profile in SQLite</span>
            </button>
          </div>
        )}

        {/* Section: Async Pipeline */}
        <div className="space-y-1 pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] px-2 pb-1">
            Async Engine
          </div>

          <button
            onClick={onTriggerWorkflow}
            disabled={isTriggeringWorkflow}
            aria-busy={isTriggeringWorkflow}
            className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-[#18191E] text-white rounded-lg transition-colors text-left disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
          >
            <span className="flex items-center gap-2 font-medium">
              <GitBranch className={`w-4 h-4 text-[#FB923C] ${isTriggeringWorkflow ? "animate-spin" : ""}`} aria-hidden="true" />
              Cloudflare Workflows
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#18191E] text-[#FB923C] border border-[#3B3F4E] font-medium">
              {isTriggeringWorkflow ? "Running" : "Async"}
            </span>
          </button>
        </div>

        {workflowStatus && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-lg bg-[#141518] border border-[#2F333E] text-xs font-mono space-y-1.5 text-[#CBD5E1]"
          >
            <div className="text-white font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" /> Workflow Dispatch
            </div>
            <div className="break-all text-xs text-[#CBD5E1]">{workflowStatus}</div>
          </div>
        )}
      </nav>
    </aside>
  );
}
