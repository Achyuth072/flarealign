import React, { useState } from "react";
import { Copy, Check, Info, ChevronDown, ChevronUp, Cpu, Database, GitBranch, Zap } from "lucide-react";
import type { CandidateProfile } from "../types";

interface AgentTelemetryPanelProps {
  candidate: CandidateProfile | null;
}

export function AgentTelemetryPanel({ candidate }: AgentTelemetryPanelProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [isLimitsOpen, setIsLimitsOpen] = useState(false);

  const actorId = "candidate-session-do-sqlite";

  const handleCopyId = () => {
    navigator.clipboard.writeText(actorId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <aside
      aria-label="Edge Telemetry and Actor Status"
      className="w-80 border-l border-[#2F333E] bg-[#0E0F12] hidden xl:flex flex-col justify-start shrink-0 h-full p-4 space-y-4 overflow-y-auto text-xs text-[#CBD5E1] font-sans custom-scrollbar"
    >
      {/* Telemetry Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Edge Telemetry</h3>
        <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold">
          ● Active (100% SLA)
        </span>
      </div>

      {/* Requests & Quota */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#CBD5E1] font-medium">Edge requests</span>
          <span className="text-white font-mono text-xs font-semibold">47 / 100,000</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={47}
          aria-valuemin={0}
          aria-valuemax={100000}
          aria-label="Edge requests: 47 out of 100,000 used"
          className="w-full bg-[#1E2026] rounded-full h-2 overflow-hidden border border-[#2F333E]"
        >
          <div className="bg-[#F6821F] h-2 rounded-full" style={{ width: "6%" }} />
        </div>
        <button
          onClick={() => setIsLimitsOpen(!isLimitsOpen)}
          aria-expanded={isLimitsOpen}
          aria-controls="edge-quotas-breakdown"
          className="flex items-center gap-1.5 text-xs text-[#FB923C] hover:text-[#FAAD3F] font-semibold pt-0.5 focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
        >
          <span>View quotas</span>
          {isLimitsOpen ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />}
        </button>
        {isLimitsOpen && (
          <div
            id="edge-quotas-breakdown"
            className="p-3 rounded-lg bg-[#141518] border border-[#2F333E] text-xs space-y-1.5 font-mono text-[#CBD5E1]"
          >
            <div>• Workers AI: 10k neurons/day</div>
            <div>• DO SQLite: 50MB per actor</div>
            <div>• Workflows: 100 concurrent runs</div>
          </div>
        )}
      </div>

      {/* 2x2 Metric Grid */}
      <div className="space-y-2 pt-2 border-t border-[#2F333E]">
        <div className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Live Runtime Metrics</div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Box 1 */}
          <div className="p-3 rounded-lg bg-[#141518] border border-[#2F333E] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#CBD5E1]">
              <span className="font-medium">Inference</span>
              <Info className="w-3.5 h-3.5 text-[#94A3B8]" aria-hidden="true" />
            </div>
            <div className="text-lg font-bold text-white font-mono">42 ms</div>
          </div>

          {/* Box 2 */}
          <div className="p-3 rounded-lg bg-[#141518] border border-[#2F333E] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#CBD5E1]">
              <span className="font-medium">DO SQLite</span>
              <Info className="w-3.5 h-3.5 text-[#94A3B8]" aria-hidden="true" />
            </div>
            <div className="text-lg font-bold text-white font-mono">4 Tables</div>
          </div>

          {/* Box 3 */}
          <div className="p-3 rounded-lg bg-[#141518] border border-[#2F333E] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#CBD5E1]">
              <span className="font-medium">Workers AI</span>
              <Info className="w-3.5 h-3.5 text-[#94A3B8]" aria-hidden="true" />
            </div>
            <div className="text-xs font-bold text-white font-mono truncate">Llama-3.3</div>
          </div>

          {/* Box 4 */}
          <div className="p-3 rounded-lg bg-[#141518] border border-[#2F333E] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#CBD5E1]">
              <span className="font-medium">Workflows</span>
              <Info className="w-3.5 h-3.5 text-[#94A3B8]" aria-hidden="true" />
            </div>
            <div className="text-xs font-bold text-emerald-400 font-mono">Ready</div>
          </div>
        </div>
      </div>

      {/* Candidate Profile Details */}
      {candidate && (
        <div className="p-3.5 rounded-lg bg-[#141518] border border-[#2F333E] space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Candidate State</h4>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1C1E24] text-[#FB923C] border border-[#3B3F4E] font-medium">
              SQLite
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[#CBD5E1]">
              <span>Candidate:</span>
              <span className="text-white font-semibold">{candidate.name}</span>
            </div>
            <div className="flex items-center justify-between text-[#CBD5E1]">
              <span>Experience:</span>
              <span className="text-white font-mono font-medium">{candidate.yearsOfExperience} years</span>
            </div>
            <div className="flex items-center justify-between text-[#CBD5E1]">
              <span>Location:</span>
              <span className="text-white font-medium">{candidate.location}</span>
            </div>
          </div>
        </div>
      )}

      {/* Durable Objects Actor Details */}
      <div className="p-3.5 rounded-lg bg-[#141518] border border-[#2F333E] space-y-2.5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Actor State</h4>

        <div className="space-y-1.5">
          <div className="text-xs text-[#CBD5E1] font-medium">Actor ID</div>
          <div className="flex items-center justify-between gap-2 text-xs font-mono text-white bg-[#0E0F12] p-2 rounded border border-[#2F333E]">
            <span className="truncate">{actorId}</span>
            <button
              onClick={handleCopyId}
              aria-label={copiedId ? "Actor ID copied to clipboard" : "Copy Actor ID to clipboard"}
              className="p-1.5 rounded hover:bg-[#1E2026] text-[#CBD5E1] hover:text-white transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
              title="Copy Actor ID"
            >
              {copiedId ? <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>
          {copiedId && (
            <div role="status" aria-live="polite" className="text-xs text-emerald-400 font-mono">
              Copied to clipboard!
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

