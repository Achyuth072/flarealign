import React, { useState, useEffect, useRef } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import {
  Send,
  Sparkles,
  FileText,
  BookOpen,
  Terminal,
  Zap,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import type { CandidateProfile, ToolPartLike, ApiResponse, ScoreJobFitData, TailorResumeData, InterviewPrep } from "./types";
import { Header } from "./components/Header";
import { AgentSidebar } from "./components/AgentSidebar";
import { AgentTelemetryPanel } from "./components/AgentTelemetryPanel";
import { FitScoreView } from "./components/FitScoreView";
import { TailorResumeView } from "./components/TailorResumeView";
import { InterviewPrepView } from "./components/InterviewPrepView";
import { EditProfileModal } from "./components/EditProfileModal";

function renderToolPart(part: ToolPartLike, pIdx: number) {
  const toolName = part.type?.startsWith("tool-")
    ? part.type.replace("tool-", "")
    : part.toolName || part.type;
  const payload = part.output || part.input;

  if (toolName === "generateInterviewPrep" && payload) {
    return <InterviewPrepView key={pIdx} data={payload as Partial<InterviewPrep>} />;
  }

  if (toolName === "scoreJobFit" && payload) {
    return <FitScoreView key={pIdx} data={payload as ScoreJobFitData} />;
  }

  if (toolName === "tailorResume" && payload) {
    return <TailorResumeView key={pIdx} data={payload as TailorResumeData} />;
  }

  if (toolName === "updateCandidateProfile" && payload) {
    const data = payload as { candidate?: CandidateProfile; updatedCandidate?: CandidateProfile; message?: string };
    const candidate = data.candidate || data.updatedCandidate;
    return (
      <div key={pIdx} className="p-4 rounded-xl bg-[#141518] border border-[#22242B] mt-3 space-y-2 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#22242B]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#F6821F]/15 text-[#F6821F] flex items-center justify-center font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <h4 className="font-bold text-white text-xs font-mono">Profile Synced to SQLite</h4>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#1C1E24] text-[#80808A] font-mono border border-[#282A34]">
            Durable Objects SQLite
          </span>
        </div>
        <p className="text-[11px] text-[#90909A]">{data.message || "Candidate profile updated successfully."}</p>
        {candidate && (
          <div className="p-2.5 rounded-lg bg-[#0E0F12] border border-[#22242B] text-[11px] space-y-1 font-mono">
            <div className="text-white font-bold">
              {candidate.name} • {candidate.yearsOfExperience}y Exp • {candidate.location}
            </div>
            {candidate.targetRole && (
              <div className="text-[#90909A] text-[10px] line-clamp-1">Role: {candidate.targetRole}</div>
            )}
            {candidate.skills && (
              <div className="text-[#70707A] text-[10px] line-clamp-1">
                Skills: {candidate.skills.join(", ")}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      key={pIdx}
      className="mt-2 p-3 rounded-xl bg-[#141518] border border-[#22242B] font-mono text-xs"
    >
      <div className="flex items-center gap-1.5 text-[#F6821F] font-bold mb-1.5">
        <Terminal className="w-3.5 h-3.5" />
        Execution Tool: {toolName}
      </div>
      {payload !== undefined && payload !== null && (
        <pre className="text-[10px] text-[#A0A2AC] overflow-x-auto max-h-48 p-2 bg-[#0E0F12] rounded-lg border border-[#22242B]">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function App() {
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const [isTriggeringWorkflow, setIsTriggeringWorkflow] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Connect to CareerAgent Durable Object Actor
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
          jobTitle: "Software Engineer – Edge Platform & DevEx",
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
    <div className="flex flex-col h-screen w-full bg-[#0E0F12] text-[#E0E2EC] overflow-hidden font-sans">
      {/* Top Navbar */}
      <Header
        candidate={candidate}
        onEditProfile={() => setIsEditModalOpen(true)}
        status={String(status)}
      />

      {/* Main 3-Column Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Navigation Sidebar */}
        <AgentSidebar
          onQuickAction={handleQuickAction}
          onTriggerWorkflow={triggerDirectWorkflow}
          isTriggeringWorkflow={isTriggeringWorkflow}
          workflowStatus={workflowStatus}
          candidate={candidate}
          onEditProfile={() => setIsEditModalOpen(true)}
        />

        {/* Center Main Dashboard Workspace */}
        <main className="flex-1 flex flex-col h-full bg-[#08080A] overflow-hidden">
          <div className="flex-1 flex flex-col h-full max-w-4xl mx-auto w-full px-6 py-4">
            {/* Header Title Bar with Clear Chat */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#1A1B22] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F6821F] text-white flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4 fill-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-sm font-bold text-white tracking-tight">FlareAlign Copilot</h1>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#141518] text-[#F6821F] border border-[#22242B] font-mono">
                      v1.0 Edge
                    </span>
                  </div>
                  <p className="text-[11px] text-[#80808A]">
                    Workers AI (Llama 3.3 70B) • Durable Objects SQLite • Cloudflare Workflows
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearHistory}
                  className="px-2.5 py-1.5 rounded-md bg-[#141518] hover:bg-[#1E2028] border border-[#22242B] text-xs text-[#90909A] hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Clear Conversation History"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Chat</span>
                </button>

                <button
                  onClick={() =>
                    handleQuickAction(
                      "Evaluate candidate fit for Cloudflare's Software Engineer - Edge Platform & DevEx opening in Bengaluru."
                    )
                  }
                  className="px-3 py-1.5 rounded-md bg-[#F6821F] hover:bg-[#E57213] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Score Fit</span>
                </button>
              </div>
            </div>

            {/* Natural Scrollable Message Feed */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-5 py-6">
                  <div className="w-12 h-12 rounded-full bg-[#141518] border border-[#22242B] flex items-center justify-center text-[#F6821F]">
                    <Sparkles className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white">
                      FlareAlign — Edge Platform &amp; DevEx Intelligence
                    </h3>
                    <p className="text-xs text-[#80808A] leading-relaxed">
                      Evaluate candidate fit, generate edge-tailored resume bullets, or architect STAR interview preparation for Cloudflare Bengaluru.
                    </p>
                  </div>

                  {/* 3 Quick Action Starter Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full pt-1">
                    <button
                      onClick={() =>
                        handleQuickAction(
                          "Evaluate my profile against Cloudflare's Software Engineer - Edge Platform & DevEx opening in Bengaluru. Provide score breakdown."
                        )
                      }
                      className="p-3 text-left rounded-lg bg-[#141518] hover:bg-[#1A1B22] border border-[#22242B] hover:border-[#F6821F]/40 text-xs transition-colors group cursor-pointer"
                    >
                      <div className="font-medium text-white mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#F6821F]" /> 1. Fit Scoring
                      </div>
                      <div className="text-[11px] text-[#70707A]">
                        35/30/20/15 heuristic match.
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        handleQuickAction(
                          "Generate targeted resume bullets highlighting my experience with Cloudflare Workers, Durable Objects, and TypeScript."
                        )
                      }
                      className="p-3 text-left rounded-lg bg-[#141518] hover:bg-[#1A1B22] border border-[#22242B] hover:border-[#F6821F]/40 text-xs transition-colors group cursor-pointer"
                    >
                      <div className="font-medium text-white mb-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#F6821F]" /> 2. Resume Bullets
                      </div>
                      <div className="text-[11px] text-[#70707A]">
                        Tailor edge systems bullets.
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        handleQuickAction(
                          "Generate comprehensive interview preparation with technical questions, STAR-method behavioral stories, and edge systems architecture topics for Cloudflare."
                        )
                      }
                      className="p-3 text-left rounded-lg bg-[#141518] hover:bg-[#1A1B22] border border-[#22242B] hover:border-[#F6821F]/40 text-xs transition-colors group cursor-pointer"
                    >
                      <div className="font-medium text-white mb-1 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[#F6821F]" /> 3. STAR Prep
                      </div>
                      <div className="text-[11px] text-[#70707A]">
                        Architect STAR answers.
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isUser = msg.role === "user";
                    const textParts = msg.parts?.filter((p) => p.type === "text" && p.text?.trim()) || [];
                    const toolParts = msg.parts?.filter((p) => p.type.startsWith("tool-") || p.type === "dynamic-tool") || [];
                    const hasContent = textParts.length > 0 || toolParts.length > 0;

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto" : "mr-auto"} animate-fade-in`}
                      >
                        {!isUser && (
                          <div className="w-7 h-7 rounded-md bg-[#F6821F] text-white flex items-center justify-center shrink-0 font-bold">
                            <Zap className="w-4 h-4 fill-white" />
                          </div>
                        )}

                        <div className="space-y-2 flex-1">
                          <div
                            className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                              isUser
                                ? "bg-[#F6821F] text-white font-medium"
                                : "bg-[#141518] text-[#E0E2EC] border border-[#22242B]"
                            }`}
                          >
                            {!hasContent && !isUser ? (
                              <div className="flex items-center gap-2 text-[#80808A] font-mono text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F6821F] animate-pulse" />
                                <span>Evaluating on Cloudflare Edge...</span>
                              </div>
                            ) : (
                              msg.parts?.map((part, pIdx) => {
                                if (part.type === "text") {
                                  if (!part.text?.trim() && toolParts.length > 0) return null;
                                  return (
                                    <div key={pIdx} className="whitespace-pre-wrap space-y-2">
                                      {part.text}
                                    </div>
                                  );
                                }
                                if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
                                  return renderToolPart(part, pIdx);
                                }
                                return null;
                              })
                            )}
                          </div>
                        </div>

                        {isUser && (
                          <div className="w-7 h-7 rounded-md bg-[#22242B] border border-[#2E303A] text-white font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                            {candidate?.name ? candidate.name.charAt(0) : "U"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Single Dedicated Bottom Input Bar with Suggestion Chips */}
            <div className="pt-2 border-t border-[#1A1B22] space-y-2 shrink-0">
              {/* Suggestion Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono text-[#80808A]">
                <span className="text-[#50505A] text-[10px] uppercase font-semibold">Actions:</span>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Evaluate my profile against Cloudflare's Software Engineer - Edge Platform & DevEx opening in Bengaluru. Provide score breakdown."
                    )
                  }
                  className="px-2.5 py-0.5 rounded-full bg-[#141518] hover:bg-[#1E2028] border border-[#22242B] hover:border-[#F6821F]/40 text-[#D0D2DC] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Score Fit
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Generate targeted resume bullets highlighting my experience with Cloudflare Workers, Durable Objects, and TypeScript."
                    )
                  }
                  className="px-2.5 py-0.5 rounded-full bg-[#141518] hover:bg-[#1E2028] border border-[#22242B] hover:border-[#F6821F]/40 text-[#D0D2DC] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Tailor Resume
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Generate comprehensive interview preparation with technical questions, STAR-method behavioral stories, and edge systems architecture topics for Cloudflare."
                    )
                  }
                  className="px-2.5 py-0.5 rounded-full bg-[#141518] hover:bg-[#1E2028] border border-[#22242B] hover:border-[#F6821F]/40 text-[#D0D2DC] transition-colors whitespace-nowrap cursor-pointer"
                >
                  STAR Prep
                </button>
              </div>

              {/* Main Single Message Input */}
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder="Ask about Cloudflare SE roles, score fit, or tailor resume..."
                  className="flex-1 bg-[#141518] border border-[#22242B] focus:border-[#F6821F]/60 rounded-lg px-3.5 py-2.5 text-xs text-[#D0D2DC] placeholder-[#60606A] focus:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="px-4 py-2.5 bg-[#F6821F] hover:bg-[#E57213] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </main>

        {/* Right Telemetry Panel */}
        <AgentTelemetryPanel
          candidate={candidate}
        />
      </div>

      {/* Edit Profile Modal */}
      {candidate && (
        <EditProfileModal
          candidate={candidate}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updated) => setCandidate(updated)}
        />
      )}
    </div>
  );
}
