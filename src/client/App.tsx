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
  AlertCircle,
} from "lucide-react";
import type { CandidateProfile, ToolPartLike, ApiResponse, ScoreJobFitData, TailorResumeData, InterviewPrep } from "./types";
import { Header } from "./components/Header";
import { AgentSidebar } from "./components/AgentSidebar";
import { FitScoreView } from "./components/FitScoreView";
import { TailorResumeView } from "./components/TailorResumeView";
import { InterviewPrepView } from "./components/InterviewPrepView";
import { EditProfileModal } from "./components/EditProfileModal";
import { getClientSessionConfig } from "./session";

function renderToolPart(part: ToolPartLike, pIdx: number) {
  const toolName = part.type?.startsWith("tool-")
    ? part.type.replace("tool-", "")
    : part.toolName || part.type;

  // Ignore getCandidateProfile if present in legacy transcripts
  if (toolName === "getCandidateProfile") {
    return null;
  }

  const payload = part.output !== undefined ? part.output : part.input;
  const isError = part.state === "output-error" || Boolean(part.errorText) || Boolean(part.error);
  const isPending =
    !isError &&
    (part.state === "input-streaming" ||
      part.state === "input-available" ||
      (!part.output && !part.errorText && !part.error));

  if (isPending) {
    return (
      <div
        key={pIdx}
        className="mt-3 p-4 rounded-xl bg-[#141518] border border-[#2F333E] font-mono text-xs flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5 text-[#FB923C]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FB923C] animate-pulse" aria-hidden="true" />
          <span className="font-semibold">Executing {toolName} on Cloudflare Edge...</span>
        </div>
        <span className="badge badge-neutral badge-sm font-mono text-[#94A3B8] border border-[#3B3F4E]">
          Workers AI
        </span>
      </div>
    );
  }

  const payloadObj = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : null;
  const isPayloadError = payloadObj?.error === true;

  if (isError || isPayloadError) {
    const errorMsg =
      (payloadObj?.message as string) ||
      part.errorText ||
      (part.error ? String(part.error) : "An error occurred during tool execution.");
    return (
      <div
        key={pIdx}
        className="mt-3 p-4 rounded-xl bg-red-950/40 border border-red-800/60 font-mono text-xs text-red-200 space-y-1"
      >
        <div className="font-bold text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> Tool Execution Error: {toolName}
        </div>
        <p className="text-xs text-red-300">{errorMsg}</p>
      </div>
    );
  }

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
      <div key={pIdx} className="p-4 rounded-xl bg-[#141518] border border-[#2F333E] mt-3 space-y-2.5 text-xs text-[#CBD5E1]">
        <div className="flex items-center justify-between pb-2 border-b border-[#2F333E]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#F6821F]/20 text-[#FB923C] flex items-center justify-center font-bold" aria-hidden="true">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <h4 className="font-bold text-white text-xs font-mono">Profile Synced to SQLite</h4>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded bg-[#1C1E24] text-[#FB923C] font-mono border border-[#3B3F4E] font-medium">
            Durable Objects SQLite
          </span>
        </div>
        <p className="text-xs text-[#CBD5E1]">{data.message || "Candidate profile updated successfully."}</p>
        {candidate && (
          <div className="p-3 rounded-lg bg-[#0E0F12] border border-[#2F333E] text-xs space-y-1.5 font-mono text-[#CBD5E1]">
            <div className="text-white font-bold">
              {candidate.name} • {candidate.yearsOfExperience}y Exp • {candidate.location}
            </div>
            {candidate.targetRole && (
              <div className="text-[#CBD5E1] text-xs line-clamp-1">Role: {candidate.targetRole}</div>
            )}
            {candidate.skills && (
              <div className="text-[#94A3B8] text-xs line-clamp-1">
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
      className="mt-2 p-3.5 rounded-xl bg-[#141518] border border-[#2F333E] font-mono text-xs"
    >
      <div className="flex items-center gap-2 text-[#FB923C] font-bold mb-2">
        <Terminal className="w-4 h-4" aria-hidden="true" />
        Execution Tool: {toolName}
      </div>
      {payload !== undefined && payload !== null && (
        <pre className="text-xs text-[#CBD5E1] overflow-x-auto max-h-48 p-3 bg-[#0E0F12] rounded-lg border border-[#2F333E]">
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

  // Stable session configuration initialized once per page load
  const [{ userId, agentSessionName }] = useState(() => getClientSessionConfig());

  // Connect to CareerAgent Durable Object Actor with isolated session
  const agent = useAgent({
    agent: "CareerAgent",
    name: agentSessionName,
  });

  const { messages, sendMessage, clearHistory, status } = useAgentChat({
    agent,
    getInitialMessages: null,
  });

  useEffect(() => {
    fetch(`/api/candidate?userId=${encodeURIComponent(userId)}`)
      .then((res) => res.json() as Promise<ApiResponse<CandidateProfile>>)
      .then((data) => {
        if (data.candidate) setCandidate(data.candidate);
      })
      .catch((err) => console.error("Failed to load candidate:", err));
  }, [userId]);

  useEffect(() => {
    const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    messagesEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
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
    <div className="flex flex-col h-screen w-full bg-[#0E0F12] text-[#F8FAFC] overflow-hidden font-sans">
      {/* Skip Navigation Link for Keyboard & Screen Reader Users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-[#F6821F] focus:text-[#0C0D0E] focus:font-bold focus:rounded-md focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

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
          onTriggerWorkflow={triggerDirectWorkflow}
          isTriggeringWorkflow={isTriggeringWorkflow}
          workflowStatus={workflowStatus}
          candidate={candidate}
          onEditProfile={() => setIsEditModalOpen(true)}
        />

        {/* Center Main Dashboard Workspace */}
        <main
          id="main-content"
          aria-label="FlareAlign Copilot Workspace"
          className="flex-1 flex flex-col h-full bg-[#08080A] overflow-hidden"
        >
          <div className="flex-1 flex flex-col h-full w-full px-6 py-4">
            {/* Header Title Bar with Clear Chat */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#2F333E] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F6821F] text-[#0C0D0E] flex items-center justify-center font-bold" aria-hidden="true">
                  <Zap className="w-4 h-4 fill-[#0C0D0E]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold text-white tracking-tight">FlareAlign Copilot</h1>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#141518] text-[#FB923C] border border-[#3B3F4E] font-mono font-medium">
                      v1.0 Edge
                    </span>
                  </div>
                  <p className="text-xs text-[#CBD5E1]">
                    Workers AI (Llama 3.3 70B) • Durable Objects SQLite • Cloudflare Workflows
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearHistory}
                  className="px-3 py-1.5 rounded-md bg-[#141518] hover:bg-[#1E2026] border border-[#3B3F4E] hover:border-[#F6821F]/60 text-xs font-medium text-white flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                  title="Clear Conversation History"
                  aria-label="Clear conversation chat history"
                >
                  <Trash2 className="w-4 h-4 text-[#CBD5E1]" aria-hidden="true" />
                  <span>Clear Chat</span>
                </button>

                <button
                  onClick={() =>
                    handleQuickAction(
                      "Evaluate candidate fit for Cloudflare's Software Engineer - Edge Platform & DevEx opening in Bengaluru."
                    )
                  }
                  className="px-3.5 py-1.5 rounded-md bg-[#F6821F] hover:bg-[#E57213] text-[#0C0D0E] text-xs font-bold flex items-center gap-2 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
                  aria-label="Score candidate fit for Cloudflare SE role"
                >
                  <Sparkles className="w-4 h-4 fill-[#0C0D0E]" aria-hidden="true" />
                  <span>Score Fit</span>
                </button>
              </div>
            </div>

            {/* Natural Scrollable Message Feed */}
            <div
              role="log"
              aria-label="Conversation messages"
              aria-live="polite"
              className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-5 py-6">
                  <div className="w-14 h-14 rounded-full bg-[#141518] border border-[#2F333E] flex items-center justify-center text-[#FB923C]" aria-hidden="true">
                    <Sparkles className="w-7 h-7" />
                  </div>

                  <div className="space-y-1.5">
                    <h2 className="text-base font-bold text-white">
                      FlareAlign — Edge Platform &amp; DevEx Intelligence
                    </h2>
                    <p className="text-xs text-[#CBD5E1] leading-relaxed">
                      Evaluate candidate fit, generate edge-tailored resume bullets, or architect STAR interview preparation for Cloudflare Bengaluru.
                    </p>
                  </div>

                  {/* 3 Quick Action Starter Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-1" role="group" aria-label="Quick action starter shortcuts">
                    <button
                      onClick={() =>
                        handleQuickAction(
                          "Evaluate my profile against Cloudflare's Software Engineer - Edge Platform & DevEx opening in Bengaluru. Provide score breakdown."
                        )
                      }
                      className="p-3.5 text-left rounded-lg bg-[#141518] hover:bg-[#1E2026] border border-[#2F333E] hover:border-[#F6821F] text-xs transition-colors group focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                    >
                      <div className="font-semibold text-white mb-1.5 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#FB923C]" aria-hidden="true" /> 1. Fit Scoring
                      </div>
                      <div className="text-xs text-[#CBD5E1]">
                        35/30/20/15 heuristic match.
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        handleQuickAction(
                          "Generate targeted resume bullets highlighting my experience with Cloudflare Workers, Durable Objects, and TypeScript."
                        )
                      }
                      className="p-3.5 text-left rounded-lg bg-[#141518] hover:bg-[#1E2026] border border-[#2F333E] hover:border-[#F6821F] text-xs transition-colors group focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                    >
                      <div className="font-semibold text-white mb-1.5 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#FB923C]" aria-hidden="true" /> 2. Resume Bullets
                      </div>
                      <div className="text-xs text-[#CBD5E1]">
                        Tailor edge systems bullets.
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        handleQuickAction(
                          "Generate comprehensive interview preparation with technical questions, STAR-method behavioral stories, and edge systems architecture topics for Cloudflare."
                        )
                      }
                      className="p-3.5 text-left rounded-lg bg-[#141518] hover:bg-[#1E2026] border border-[#2F333E] hover:border-[#F6821F] text-xs transition-colors group focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                    >
                      <div className="font-semibold text-white mb-1.5 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#FB923C]" aria-hidden="true" /> 3. STAR Prep
                      </div>
                      <div className="text-xs text-[#CBD5E1]">
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
                        className={`flex gap-3 ${isUser ? "max-w-2xl ml-auto" : "w-full"} animate-fade-in`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 rounded-md bg-[#F6821F] text-[#0C0D0E] flex items-center justify-center shrink-0 font-bold" aria-hidden="true">
                            <Zap className="w-4 h-4 fill-[#0C0D0E]" />
                          </div>
                        )}

                        <div className="space-y-2 flex-1">
                          <div
                            className={`p-4 rounded-xl text-xs leading-relaxed ${
                              isUser
                                ? "bg-[#F6821F] text-[#0C0D0E] font-medium shadow-sm"
                                : "bg-[#141518] text-[#F8FAFC] border border-[#2F333E]"
                            }`}
                          >
                            {!hasContent && !isUser ? (
                              <div role="status" aria-live="polite" className="flex items-center gap-2.5 text-[#CBD5E1] font-mono text-xs">
                                <span className="w-2 h-2 rounded-full bg-[#FB923C] animate-pulse" aria-hidden="true" />
                                <span>Evaluating on Cloudflare Edge...</span>
                              </div>
                            ) : (
                              msg.parts?.map((part, pIdx) => {
                                if (part.type === "text") {
                                  if (!part.text?.trim() && toolParts.length > 0) return null;
                                  return (
                                    <div key={pIdx} className="whitespace-pre-wrap space-y-2 text-xs">
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
                          <div
                            role="img"
                            aria-label={`User: ${candidate?.name || "Candidate"}`}
                            className="w-8 h-8 rounded-md bg-[#1E2026] border border-[#3B3F4E] text-white font-bold text-xs flex items-center justify-center shrink-0 font-mono"
                          >
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
            <div className="pt-2.5 border-t border-[#2F333E] space-y-2.5 shrink-0">
              {/* Suggestion Chips */}
              <div
                role="group"
                aria-label="Suggested quick questions"
                className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-mono text-[#CBD5E1]"
              >
                <span className="text-[#94A3B8] text-xs uppercase font-bold">Actions:</span>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Evaluate my profile against Cloudflare's Software Engineer - Edge Platform & DevEx opening in Bengaluru. Provide score breakdown."
                    )
                  }
                  className="px-3 py-1 rounded-full bg-[#141518] hover:bg-[#1E2026] border border-[#3B3F4E] hover:border-[#F6821F] text-white transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                >
                  Score Fit
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Generate targeted resume bullets highlighting my experience with Cloudflare Workers, Durable Objects, and TypeScript."
                    )
                  }
                  className="px-3 py-1 rounded-full bg-[#141518] hover:bg-[#1E2026] border border-[#3B3F4E] hover:border-[#F6821F] text-white transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                >
                  Tailor Resume
                </button>
                <button
                  onClick={() =>
                    handleQuickAction(
                      "Generate comprehensive interview preparation with technical questions, STAR-method behavioral stories, and edge systems architecture topics for Cloudflare."
                    )
                  }
                  className="px-3 py-1 rounded-full bg-[#141518] hover:bg-[#1E2026] border border-[#3B3F4E] hover:border-[#F6821F] text-white transition-colors whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                >
                  STAR Prep
                </button>
              </div>

              {/* Main Single Message Input */}
              <form onSubmit={handleSend} className="flex items-center gap-2" aria-label="Chat input form">
                <input
                  id="chat-message-input"
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  aria-label="Message prompt input"
                  placeholder="Ask about Cloudflare SE roles, score fit, or tailor resume..."
                  className="flex-1 bg-[#141518] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-4 py-2.5 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  aria-label="Send message"
                  className="px-4 py-2.5 bg-[#F6821F] hover:bg-[#E57213] text-[#0C0D0E] font-bold rounded-lg text-xs flex items-center gap-2 transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
                >
                  <Send className="w-4 h-4 fill-[#0C0D0E]" aria-hidden="true" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      {candidate && (
        <EditProfileModal
          candidate={candidate}
          isOpen={isEditModalOpen}
          userId={userId}
          onClose={() => setIsEditModalOpen(false)}
          onSave={(updated) => setCandidate(updated)}
        />
      )}
    </div>
  );
}
