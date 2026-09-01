import React, { useState, useEffect, useRef } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import {
  Zap,
  Cpu,
  Database,
  GitBranch,
  Send,
  Sparkles,
  FileText,
  CheckCircle2,
  Layers,
  Terminal,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

interface CandidateProfile {
  name: string;
  targetRole: string;
  location: string;
  yearsOfExperience: number;
  skills: string[];
  resumeSummary: string;
}

interface ApiResponse<T> {
  success?: boolean;
  candidate?: T;
  workflowInstanceId?: string;
  error?: string;
}

export function App() {
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [isTriggeringWorkflow, setIsTriggeringWorkflow] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to CareerAgent DO Actor
  const agent = useAgent({
    agent: "CareerAgent",
    name: "candidate-session",
  });

  const { messages, sendMessage, clearHistory, status } = useAgentChat({
    agent,
  });

  useEffect(() => {
    fetch("/api/candidate")
      .then((res) => res.json() as Promise<ApiResponse<CandidateProfile>>)
      .then((data) => {
        if (data.candidate) setCandidate(data.candidate);
      })
      .catch((err) => console.error("Failed to load candidate:", err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: inputVal.trim() }],
    });
    setInputVal("");
  };

  const handleQuickAction = (actionText: string) => {
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: actionText }],
    });
  };

  const triggerDirectWorkflow = async () => {
    setIsTriggeringWorkflow(true);
    setWorkflowStatus("Dispatching Cloudflare Workflow...");
    try {
      const res = await fetch("/api/workflows/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: "Software Engineer – Platforms & Productivity",
          company: "Cloudflare",
          jobDescription:
            "Architect edge-native platforms, developer tooling, Workers AI integration, and Durable Objects distributed systems at Cloudflare Bengaluru.",
        }),
      });
      const data = (await res.json()) as ApiResponse<unknown>;
      if (data.success && data.workflowInstanceId) {
        setWorkflowStatus(`Workflow Active: ${data.workflowInstanceId}`);
      } else {
        setWorkflowStatus(`Workflow Error: ${data.error || "Unknown error"}`);
      }
    } catch {
      setWorkflowStatus("Failed to trigger workflow");
    } finally {
      setIsTriggeringWorkflow(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0E0F12] text-slate-100 overflow-hidden font-sans">
      {/* Sidebar / Left Column */}
      <aside className="w-80 border-r border-[#22242B] bg-[#14151B] flex flex-col justify-between hidden md:flex">
        <div className="p-4 space-y-5 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center space-x-3 pb-3 border-b border-[#22242B]">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#F6821F] to-[#FAAD3F] flex items-center justify-center shadow-lg shadow-[#F6821F]/20">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                Cloudflare Agent
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F6821F]/20 text-[#F6821F] font-mono font-semibold">
                  v1.0
                </span>
              </h1>
              <p className="text-xs text-slate-400">Platforms & Productivity Copilot</p>
            </div>
          </div>

          {/* Architecture Badges */}
          <div className="space-y-2 bg-[#1A1C23] p-3 rounded-lg border border-[#262933]">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#F6821F]" />
              Edge Architecture
            </div>
            <div className="space-y-1.5 pt-1 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" /> Workers AI:
                </span>
                <span className="font-mono text-[11px] text-amber-300">Llama-3.3-70b</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Database className="w-3.5 h-3.5 text-emerald-400" /> State:
                </span>
                <span className="font-mono text-[11px] text-emerald-300">DO SQLite Actor</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <GitBranch className="w-3.5 h-3.5 text-sky-400" /> Pipeline:
                </span>
                <span className="font-mono text-[11px] text-sky-300">CF Workflows</span>
              </div>
            </div>
          </div>

          {/* Candidate Profile Card */}
          {candidate && (
            <div className="bg-[#1A1C23] p-3.5 rounded-lg border border-[#262933] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-white">
                    {candidate.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs text-slate-200">{candidate.name}</h3>
                    <p className="text-[11px] text-slate-400">{candidate.location}</p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  {candidate.yearsOfExperience}y Exp
                </span>
              </div>

              <div className="text-[11px] text-slate-300 line-clamp-2 bg-[#121316] p-2 rounded border border-[#22242B]">
                {candidate.targetRole}
              </div>

              <div>
                <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5">Top Skills</div>
                <div className="flex flex-wrap gap-1">
                  {candidate.skills.slice(0, 8).map((skill, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-[#22242F] text-slate-300 px-1.5 py-0.5 rounded border border-[#2F3240]"
                    >
                      {skill}
                    </span>
                  ))}
                  {candidate.skills.length > 8 && (
                    <span className="text-[10px] text-slate-500 px-1 py-0.5">
                      +{candidate.skills.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Instant Actions
            </div>
            <button
              onClick={() =>
                handleQuickAction(
                  "Score candidate fit for Cloudflare's Software Engineer – Platforms & Productivity role in Bengaluru (Greenhouse #8168623). Analyze skills, experience, domain, and trajectory fit."
                )
              }
              className="w-full text-left p-2.5 rounded-lg bg-[#1A1C23] hover:bg-[#232631] border border-[#262933] text-xs text-slate-200 transition-all flex items-center justify-between group"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#F6821F]" />
                Score Cloudflare SE Role
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 transition-colors" />
            </button>

            <button
              onClick={() =>
                handleQuickAction(
                  "Tailor my resume for the Cloudflare Platforms & Productivity role. Highlight Cloudflare Workers, Durable Objects SQLite, and distributed edge systems."
                )
              }
              className="w-full text-left p-2.5 rounded-lg bg-[#1A1C23] hover:bg-[#232631] border border-[#262933] text-xs text-slate-200 transition-all flex items-center justify-between group"
            >
              <span className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                Tailor Resume Bullets
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-200 transition-colors" />
            </button>

            <button
              onClick={triggerDirectWorkflow}
              disabled={isTriggeringWorkflow}
              className="w-full text-left p-2.5 rounded-lg bg-[#1A1C23] hover:bg-[#232631] border border-[#262933] text-xs text-slate-200 transition-all flex items-center justify-between group"
            >
              <span className="flex items-center gap-2">
                <GitBranch className={`w-3.5 h-3.5 text-emerald-400 ${isTriggeringWorkflow ? "animate-spin" : ""}`} />
                Run Cloudflare Workflow
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                Async
              </span>
            </button>

            {workflowStatus && (
              <div className="text-[11px] p-2 rounded bg-[#121316] text-emerald-400 border border-emerald-500/30 flex items-start gap-1.5 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="break-all">{workflowStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Connection Status */}
        <div className="p-3 border-t border-[#22242B] bg-[#101116] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "ready" || status === "submitted" || status === "streaming"
                  ? "bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse"
                  : "bg-amber-500"
              }`}
            />
            <span className="text-[11px] capitalize">{String(status) || "Ready"}</span>
          </div>
          <button
            onClick={() => clearHistory()}
            className="text-[11px] hover:text-slate-200 text-slate-500 flex items-center gap-1 transition-colors"
            title="Clear Chat History"
          >
            <RefreshCw className="w-3 h-3" />
            Clear
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col h-full bg-[#0E0F12] relative">
        {/* Mobile Header */}
        <header className="h-14 border-b border-[#22242B] px-4 flex items-center justify-between bg-[#14151B] md:hidden">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-[#F6821F]" />
            <span className="font-bold text-sm">Cloudflare AI Agent</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active
          </div>
        </header>

        {/* Message Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F6821F]/20 to-[#FAAD3F]/10 border border-[#F6821F]/30 flex items-center justify-center shadow-xl">
                <Zap className="w-8 h-8 text-[#F6821F]" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-white">Cloudflare Career Intelligence Agent</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Stateful AI assistant powered by <strong>Workers AI (Llama 3.3 70B)</strong>,{" "}
                  <strong>Durable Objects SQLite</strong>, and <strong>Cloudflare Workflows</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Evaluate my profile against Cloudflare's Software Engineer - Platforms & Productivity opening in Bengaluru. Provide score breakdown."
                    )
                  }
                  className="p-3 text-left rounded-lg bg-[#14151B] hover:bg-[#1C1E26] border border-[#22242B] text-xs text-slate-300 transition-all hover:border-[#F6821F]/50"
                >
                  <div className="font-semibold text-white mb-0.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F6821F]" /> 1. Fit Scoring
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Analyze multi-dimensional fit (skills, experience, trajectory).
                  </div>
                </button>

                <button
                  onClick={() =>
                    handleQuickAction(
                      "Generate targeted resume bullets highlighting my experience with Cloudflare Workers, Durable Objects, and TypeScript."
                    )
                  }
                  className="p-3 text-left rounded-lg bg-[#14151B] hover:bg-[#1C1E26] border border-[#22242B] text-xs text-slate-300 transition-all hover:border-sky-500/50"
                >
                  <div className="font-semibold text-white mb-0.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-400" /> 2. Resume Tailoring
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Craft tailored bullets aligned with edge platforms.
                  </div>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id || index}
                  className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto" : "mr-auto"}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F6821F] to-[#FAAD3F] flex items-center justify-center shrink-0 shadow-md">
                      <Zap className="w-4 h-4 text-black fill-black" />
                    </div>
                  )}

                  <div className="space-y-2 flex-1">
                    <div
                      className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-[#F6821F] text-black font-medium rounded-tr-none shadow-md shadow-[#F6821F]/10"
                          : "bg-[#161820] text-slate-200 rounded-tl-none border border-[#242733]"
                      }`}
                    >
                      {msg.parts?.map((part, pIdx) => {
                        if (part.type === "text") {
                          return (
                            <div key={pIdx} className="whitespace-pre-wrap space-y-2">
                              {part.text}
                            </div>
                          );
                        }
                        if (part.type.startsWith("tool-")) {
                          return (
                            <div
                              key={pIdx}
                              className="mt-2 p-2.5 rounded-lg bg-[#101116] border border-[#2B2E3C] text-[11px] font-mono text-slate-300"
                            >
                              <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                                <Terminal className="w-3.5 h-3.5" />
                                Tool Call: {part.type}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0 font-bold text-xs text-white">
                      A
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 md:p-4 border-t border-[#22242B] bg-[#14151B]">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto flex items-center gap-2">
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Ask about Cloudflare SE roles, score fit, or tailor your resume..."
              className="flex-1 bg-[#0E0F12] border border-[#262933] focus:border-[#F6821F] rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!inputVal.trim()}
              className="px-4 py-2.5 bg-gradient-to-r from-[#F6821F] to-[#FAAD3F] hover:from-[#E57213] hover:to-[#E59728] text-black font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
