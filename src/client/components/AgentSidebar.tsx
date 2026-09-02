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
    <aside className="w-64 border-r border-[#22242B] bg-[#0E0F12] flex flex-col justify-between hidden md:flex shrink-0 h-full text-xs text-[#90909A] select-none font-sans overflow-hidden">
      <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
        {/* Quick Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#60606A]" />
          <input
            type="text"
            readOnly
            placeholder="Quick search..."
            className="w-full bg-[#141518] border border-[#22242B] rounded-lg pl-8 pr-12 py-1.5 text-xs text-[#D0D2DC] placeholder-[#60606A] focus:outline-none cursor-pointer"
          />
          <span className="absolute right-2 top-2 text-[10px] font-mono px-1 py-0.2 rounded bg-[#22242B] text-[#80808A] border border-[#2E303A]">
            Ctrl K
          </span>
        </div>

        {/* Section: Candidate Profile (Single Source of Truth for SQLite State) */}
        {candidate && (
          <div className="p-2.5 rounded-lg bg-[#141518] border border-[#22242B] space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-white text-xs">{candidate.name}</div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1E24] text-[#F6821F] border border-[#282A34]">
                {candidate.yearsOfExperience}y Exp
              </span>
            </div>
            <div className="text-[11px] text-[#80808A] truncate">{candidate.targetRole}</div>
            <button
              onClick={onEditProfile}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-[#1C1E24] hover:bg-[#242630] text-[#D0D2DC] hover:text-white text-[11px] font-medium border border-[#282A34] transition-colors cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#F6821F]" />
              <span>Edit Profile in SQLite</span>
            </button>
          </div>
        )}

        {/* Section: Agent Intelligence Workflows */}
        <div className="space-y-0.5 pt-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#60606A] px-2 pb-1">
            Agent Intelligence
          </div>

          <div>
            <button
              onClick={() => setIsCopilotOpen(!isCopilotOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#16171B] hover:text-[#E0E2EC] rounded-lg transition-colors text-left"
            >
              <span className="flex items-center gap-2 font-medium text-white">
                <Sparkles className="w-3.5 h-3.5 text-[#F6821F]" /> Instant Workflows
              </span>
              {isCopilotOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#60606A]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#60606A]" />
              )}
            </button>

            {isCopilotOpen && (
              <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-[#22242B] ml-3.5 mt-0.5">
                <button
                  onClick={() =>
                    onQuickAction(
                      "Evaluate candidate fit for Cloudflare's Software Engineer - Edge Platform & DevEx role in Bengaluru (Greenhouse #8168623)."
                    )
                  }
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-[#16171B] hover:text-white transition-colors group cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Award className="w-3 h-3 text-[#F6821F]" /> 1. Fit Evaluator
                  </span>
                  <span className="text-[9px] font-mono text-[#60606A] group-hover:text-[#F6821F]">35/30%</span>
                </button>

                <button
                  onClick={() =>
                    onQuickAction(
                      "Generate targeted resume bullets highlighting my experience with Cloudflare Workers, Durable Objects, and TypeScript."
                    )
                  }
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-[#16171B] hover:text-white transition-colors group cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-[#F6821F]" /> 2. Resume Bullets
                  </span>
                  <span className="text-[9px] font-mono text-[#60606A] group-hover:text-[#F6821F]">Edge</span>
                </button>

                <button
                  onClick={() =>
                    onQuickAction(
                      "Generate comprehensive interview preparation with technical questions, STAR-method behavioral stories, and edge systems architecture topics for Cloudflare."
                    )
                  }
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left hover:bg-[#16171B] hover:text-white transition-colors group cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3 h-3 text-[#F6821F]" /> 3. STAR Prep
                  </span>
                  <span className="text-[9px] font-mono text-[#60606A] group-hover:text-[#F6821F]">L5/L6</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section: Async Pipeline */}
        <div className="space-y-0.5 pt-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[#60606A] px-2 pb-1">
            Async Engine
          </div>

          <button
            onClick={onTriggerWorkflow}
            disabled={isTriggeringWorkflow}
            className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#16171B] hover:text-[#E0E2EC] rounded-lg transition-colors text-left disabled:opacity-50 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <GitBranch className={`w-3.5 h-3.5 text-[#F6821F] ${isTriggeringWorkflow ? "animate-spin" : ""}`} />
              Cloudflare Workflows
            </span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#1A1B20] text-[#F6821F] border border-[#282A34]">
              {isTriggeringWorkflow ? "Running" : "Async"}
            </span>
          </button>
        </div>

        {workflowStatus && (
          <div className="p-2.5 rounded-lg bg-[#141518] border border-[#22242B] text-[11px] font-mono space-y-1 text-[#A0A2AC]">
            <div className="text-white font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Workflow Dispatch
            </div>
            <div className="break-all text-[10px] text-[#80808A]">{workflowStatus}</div>
          </div>
        )}
      </div>
    </aside>
  );
}
