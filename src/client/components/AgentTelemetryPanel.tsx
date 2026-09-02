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
    <aside className="w-80 border-l border-[#22242B] bg-[#0E0F12] hidden xl:flex flex-col justify-start shrink-0 h-full p-4 space-y-4 overflow-y-auto text-xs text-[#90909A] font-sans select-none custom-scrollbar">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Edge Telemetry</h3>
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-medium">
          ● Active (100% SLA)
        </span>
      </div>

      {/* Requests & Quota */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#90909A]">Edge requests</span>
          <span className="text-white font-mono text-[11px]">47 / 100,000</span>
        </div>
        <div className="w-full bg-[#1A1B20] rounded-full h-1.5 overflow-hidden">
          <div className="bg-[#F6821F] h-1.5 rounded-full" style={{ width: "6%" }} />
        </div>
        <button
          onClick={() => setIsLimitsOpen(!isLimitsOpen)}
          className="flex items-center gap-1 text-[11px] text-[#F6821F] hover:underline pt-0.5 cursor-pointer"
        >
          <span>View quotas</span>
          {isLimitsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
        {isLimitsOpen && (
          <div className="p-2.5 rounded bg-[#141518] border border-[#22242B] text-[10px] space-y-1 font-mono text-[#A0A2AC]">
            <div>• Workers AI: 10k neurons/day</div>
            <div>• DO SQLite: 50MB per actor</div>
            <div>• Workflows: 100 concurrent runs</div>
          </div>
        )}
      </div>

      {/* 2x2 Metric Grid */}
      <div className="space-y-2 pt-2 border-t border-[#22242B]">
        <div className="text-[11px] text-[#70707A]">Live Runtime Metrics</div>
        <div className="grid grid-cols-2 gap-2">
          {/* Box 1 */}
          <div className="p-3 rounded-lg bg-[#141518] border border-[#22242B] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#80808A]">
              <span>Inference</span>
              <Info className="w-3 h-3 text-[#50505A]" />
            </div>
            <div className="text-lg font-bold text-white font-mono">42 ms</div>
          </div>

          {/* Box 2 */}
          <div className="p-3 rounded-lg bg-[#141518] border border-[#22242B] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#80808A]">
              <span>DO SQLite</span>
              <Info className="w-3 h-3 text-[#50505A]" />
            </div>
            <div className="text-lg font-bold text-white font-mono">4 Tables</div>
          </div>

          {/* Box 3 */}
          <div className="p-3 rounded-lg bg-[#141518] border border-[#22242B] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#80808A]">
              <span>Workers AI</span>
              <Info className="w-3 h-3 text-[#50505A]" />
            </div>
            <div className="text-xs font-bold text-white font-mono truncate">Llama-3.3</div>
          </div>

          {/* Box 4 */}
          <div className="p-3 rounded-lg bg-[#141518] border border-[#22242B] space-y-1">
            <div className="flex items-center justify-between text-[11px] text-[#80808A]">
              <span>Workflows</span>
              <Info className="w-3 h-3 text-[#50505A]" />
            </div>
            <div className="text-xs font-bold text-white font-mono">Ready</div>
          </div>
        </div>
      </div>

      {/* Candidate Profile Details */}
      {candidate && (
        <div className="p-3 rounded-lg bg-[#141518] border border-[#22242B] space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white">Candidate State</h4>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1C1E24] text-[#80808A] border border-[#282A34]">
              SQLite
            </span>
          </div>

          <div className="space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-[#80808A]">
              <span>Candidate:</span>
              <span className="text-white font-medium">{candidate.name}</span>
            </div>
            <div className="flex items-center justify-between text-[#80808A]">
              <span>Experience:</span>
              <span className="text-white font-mono">{candidate.yearsOfExperience} years</span>
            </div>
            <div className="flex items-center justify-between text-[#80808A]">
              <span>Location:</span>
              <span className="text-white">{candidate.location}</span>
            </div>
          </div>
        </div>
      )}

      {/* Durable Objects Actor Details */}
      <div className="p-3 rounded-lg bg-[#141518] border border-[#22242B] space-y-2.5">
        <h4 className="text-xs font-semibold text-white">Actor State</h4>

        <div className="space-y-1">
          <div className="text-[11px] text-[#80808A]">Actor ID</div>
          <div className="flex items-center justify-between gap-1 text-[11px] font-mono text-[#D0D2DC] bg-[#0E0F12] p-1.5 rounded border border-[#22242B]">
            <span className="truncate">{actorId}</span>
            <button
              onClick={handleCopyId}
              className="p-1 hover:text-white transition-colors shrink-0"
              title="Copy Actor ID"
            >
              {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

