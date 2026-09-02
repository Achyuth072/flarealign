import React, { useState } from "react";
import {
  Search,
  Sparkles,
  FileText,
  BookOpen,
  GitBranch,
  ChevronDown,
  ChevronRight,
  UserCheck,
  CheckCircle2,
  Award,
} from "lucide-react";
import type { CandidateProfile } from "../types";

interface AgentSidebarProps {
  onQuickAction: (actionText: string) => void;
  onTriggerWorkflow: () => void;
  isTriggeringWorkflow: boolean;
  workflowStatus: string | null;
  candidate: CandidateProfile | null;
  onEditProfile: () => void;
}

export function AgentSidebar({
  onQuickAction,
  onTriggerWorkflow,
  isTriggeringWorkflow,
  workflowStatus,
  candidate,
  onEditProfile,
}: AgentSidebarProps) {
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);

  return (
    <aside
      aria-label="Agent Navigation Sidebar"
      className="w-64 border-r border-[#2F333E] bg-[#0E0F12] flex flex-col justify-between hidden md:flex shrink-0 h-full text-xs text-[#CBD5E1] font-sans overflow-hidden"
    >
      <nav aria-label="Sidebar Navigation" className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
        {/* Quick Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[#94A3B8]" aria-hidden="true" />
          <input
            type="text"
            readOnly
            aria-label="Quick search shortcuts"
            placeholder="Quick search..."
            className="w-full bg-[#141518] border border-[#2F333E] focus:border-[#F6821F] rounded-lg pl-8 pr-14 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
          />
          <span className="absolute right-2 top-2 text-xs font-mono px-1.5 py-0.5 rounded bg-[#1E2026] text-[#CBD5E1] border border-[#3B3F4E]">
            Ctrl K
          </span>
        </div>

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

        {/* Section: Agent Intelligence Workflows */}
        <div className="space-y-1 pt-1">
          <div className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] px-2 pb-1">
            Agent Intelligence
          </div>

          <div>
            <button
              onClick={() => setIsCopilotOpen(!isCopilotOpen)}
              aria-expanded={isCopilotOpen}
              aria-controls="instant-workflows-menu"
              className="w-full flex items-center justify-between px-2.5 py-2 hover:bg-[#18191E] text-white rounded-lg transition-colors text-left focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
            >
              <span className="flex items-center gap-2 font-semibold text-white">
                <Sparkles className="w-4 h-4 text-[#FB923C]" aria-hidden="true" /> Instant Workflows
              </span>
              {isCopilotOpen ? (
                <ChevronDown className="w-4 h-4 text-[#94A3B8]" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4 text-[#94A3B8]" aria-hidden="true" />
              )}
            </button>

            {isCopilotOpen && (
              <div
                id="instant-workflows-menu"
                role="region"
                aria-label="Instant Workflows actions"
                className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-[#2F333E] ml-3.5 mt-1"
              >
                <button
                  onClick={() =>
                    onQuickAction(
                      "Evaluate candidate fit for Cloudflare's Software Engineer - Edge Platform & DevEx role in Bengaluru (Greenhouse #8168623)."
                    )
                  }
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[#CBD5E1] hover:text-white hover:bg-[#18191E] transition-colors group focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-[#FB923C]" aria-hidden="true" /> 1. Fit Evaluator
                  </span>
                  <span className="text-xs font-mono text-[#94A3B8] group-hover:text-[#FB923C]">35/30%</span>
                </button>

                <button
                  onClick={() =>
                    onQuickAction(
                      "Generate targeted resume bullets highlighting my experience with Cloudflare Workers, Durable Objects, and TypeScript."
                    )
                  }
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[#CBD5E1] hover:text-white hover:bg-[#18191E] transition-colors group focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#FB923C]" aria-hidden="true" /> 2. Resume Bullets
                  </span>
                  <span className="text-xs font-mono text-[#94A3B8] group-hover:text-[#FB923C]">Edge</span>
                </button>

                <button
                  onClick={() =>
                    onQuickAction(
                      "Generate comprehensive interview preparation with technical questions, STAR-method behavioral stories, and edge systems architecture topics for Cloudflare."
                    )
                  }
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs font-medium text-[#CBD5E1] hover:text-white hover:bg-[#18191E] transition-colors group focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#FB923C]" aria-hidden="true" /> 3. STAR Prep
                  </span>
                  <span className="text-xs font-mono text-[#94A3B8] group-hover:text-[#FB923C]">L5/L6</span>
                </button>
              </div>
            )}
          </div>
        </div>

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
