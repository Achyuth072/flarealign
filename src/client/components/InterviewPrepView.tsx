import React, { useState } from "react";
import { BookOpen, Award, Code2, Target, Copy, Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import type { InterviewPrep, BehavioralQuestion, TechnicalQuestion, JobPosting } from "../types";

export interface InterviewPrepViewProps {
  data?: Partial<InterviewPrep> | null;
  job?: JobPosting | null;
  onIngestJob?: () => void;
}

export function InterviewPrepView({ data, job, onIngestJob }: InterviewPrepViewProps) {
  const technicalQuestions = data?.technicalQuestions || [];
  const behavioralQuestions = data?.behavioralQuestions || [];
  const systemDesignFocus = data?.systemDesignFocus || [];
  const [copied, setCopied] = useState(false);
  const [expandedTech, setExpandedTech] = useState<Record<number, boolean>>({});

  const hasContent = technicalQuestions.length > 0 || behavioralQuestions.length > 0 || systemDesignFocus.length > 0;

  if (!data || !hasContent) {
    return (
      <div className="card bg-[#141518] border border-[#2F333E] mt-3 overflow-hidden text-[#CBD5E1]">
        <div className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#1C1E24] border border-[#3B3F4E] flex items-center justify-center mx-auto text-[#FB923C]">
            <BookOpen className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="font-bold text-white text-sm">Target Job Required for Interview Prep</h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Ingest a target job posting to architect structured STAR behavioral responses, systems design talking points, and technical probing questions.
            </p>
          </div>
          {onIngestJob && (
            <button
              onClick={onIngestJob}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F6821F] hover:bg-[#E57213] text-[#0C0D0E] font-bold text-xs transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
            >
              <Plus className="w-4 h-4 fill-[#0C0D0E]" aria-hidden="true" />
              <span>Ingest Job Posting</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const toggleTech = (idx: number) => {
    setExpandedTech((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = () => {
    let output = `STAR INTERVIEW PREPARATION - ${data.jobTitle || job?.title || "Role"} @ ${data.company || job?.company || "Target"}\n\n`;

    if (behavioralQuestions.length > 0) {
      output += "--- BEHAVIORAL QUESTIONS (STAR METHOD) ---\n";
      behavioralQuestions.forEach((bq, i) => {
        output += `\nQ${i + 1}: ${bq.question}\n`;
        if (bq.situationTask) output += `  Situation & Task: ${bq.situationTask}\n`;
        if (bq.actionTaken) output += `  Action Taken: ${bq.actionTaken}\n`;
        if (bq.resultImpact) output += `  Result & Impact: ${bq.resultImpact}\n`;
      });
    }

    if (technicalQuestions.length > 0) {
      output += "\n--- TECHNICAL QUESTIONS ---\n";
      technicalQuestions.forEach((tq, i) => {
        output += `\nQ${i + 1}: ${tq.question} (${tq.focusArea || "General"})\n`;
        if (tq.keyTalkingPoints) {
          tq.keyTalkingPoints.forEach((tp) => (output += `  • ${tp}\n`));
        }
      });
    }

    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card bg-[#141518] border border-[#2F333E] mt-3 overflow-hidden text-[#CBD5E1]">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-[#2F333E] bg-[#0E0F12] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F6821F]/20 text-[#FB923C] flex items-center justify-center font-bold" aria-hidden="true">
            <BookOpen className="w-4 h-4 text-[#FB923C]" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              Structured STAR Interview Strategy
              <span className="badge badge-neutral badge-sm font-mono text-[#CBD5E1] border border-[#3B3F4E]">
                L5/L6 Rubric
              </span>
            </h4>
            <p className="text-xs text-[#94A3B8]">
              {data.jobTitle || job?.title ? `${data.jobTitle || job?.title} • ` : ""}{data.company || job?.company || "Target Role"}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          aria-label={copied ? "STAR Guide copied to clipboard" : "Copy STAR interview preparation guide"}
          className="px-3 py-1.5 rounded-md bg-[#18191E] hover:bg-[#272932] border border-[#3B3F4E] hover:border-[#F6821F]/60 text-xs font-mono font-medium text-white flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
          title="Copy STAR Guide"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#CBD5E1]" aria-hidden="true" />
              <span>Copy Guide</span>
            </>
          )}
        </button>
      </div>

      <div className="card-body p-4 space-y-5">
        {/* Behavioral Scenarios (STAR Method) */}
        {behavioralQuestions.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold text-[#FB923C] uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FB923C]" aria-hidden="true" />
              Behavioral Scenarios (STAR Method Architecture)
            </div>

            <div className="space-y-3">
              {behavioralQuestions.map((bq: BehavioralQuestion, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl bg-[#0E0F12] border border-[#2F333E] p-4 space-y-3"
                >
                  <div className="font-semibold text-white text-xs flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-[#1E2026] text-white font-mono font-bold border border-[#3B3F4E] text-xs">
                      {idx + 1}
                    </span>
                    <span className="leading-snug pt-0.5">{bq.question}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {/* Situation & Task */}
                    {bq.situationTask && (
                      <div className="p-3.5 rounded-lg bg-[#141518] border border-[#2F333E] text-xs flex flex-col justify-between">
                        <div>
                          <span className="font-mono font-bold text-[#94A3B8] block mb-1.5 uppercase text-xs tracking-wider">
                            Situation &amp; Task
                          </span>
                          <span className="text-[#F8FAFC] leading-relaxed">{bq.situationTask}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Taken */}
                    {bq.actionTaken && (
                      <div className="p-3.5 rounded-lg bg-[#141518] border border-[#2F333E] text-xs flex flex-col justify-between">
                        <div>
                          <span className="font-mono font-bold text-[#FB923C] block mb-1.5 uppercase text-xs tracking-wider">
                            Action Taken
                          </span>
                          <span className="text-[#F8FAFC] leading-relaxed">{bq.actionTaken}</span>
                        </div>
                      </div>
                    )}

                    {/* Result & Impact */}
                    {bq.resultImpact && (
                      <div className="p-3.5 rounded-lg bg-[#141518] border border-[#2F333E] text-xs flex flex-col justify-between">
                        <div>
                          <span className="font-mono font-bold text-emerald-400 block mb-1.5 uppercase text-xs tracking-wider">
                            Result &amp; Impact
                          </span>
                          <span className="text-[#F8FAFC] leading-relaxed">{bq.resultImpact}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Technical Questions */}
        {technicalQuestions.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-[#2F333E]">
            <div className="text-xs font-mono font-bold text-[#FB923C] uppercase tracking-wider flex items-center gap-2">
              <Code2 className="w-4 h-4 text-[#FB923C]" aria-hidden="true" />
              Technical &amp; Systems Architecture Probing
            </div>

            <div className="space-y-2.5">
              {technicalQuestions.map((tq: TechnicalQuestion, idx: number) => {
                const isExpanded = expandedTech[idx] ?? true;
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-[#0E0F12] border border-[#2F333E] overflow-hidden"
                  >
                    <button
                      onClick={() => toggleTech(idx)}
                      aria-expanded={isExpanded}
                      aria-controls={`tech-question-content-${idx}`}
                      className="w-full text-left p-3.5 flex items-start justify-between gap-3 hover:bg-[#18191E] transition-colors focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5 flex-1">
                        <span className="px-2 py-0.5 rounded bg-[#1E2026] text-white font-mono font-bold shrink-0 mt-0.5 border border-[#3B3F4E] text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-white text-xs">{tq.question}</span>
                          {tq.focusArea && (
                            <span className="inline-block px-2 py-0.5 rounded bg-[#1C1E24] text-[#FB923C] font-mono text-xs border border-[#3B3F4E] ml-2">
                              {tq.focusArea}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-[#CBD5E1] shrink-0 mt-1" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#CBD5E1] shrink-0 mt-1" aria-hidden="true" />
                      )}
                    </button>

                    {isExpanded && tq.keyTalkingPoints && tq.keyTalkingPoints.length > 0 && (
                      <div
                        id={`tech-question-content-${idx}`}
                        role="region"
                        aria-label={`Talking points for question: ${tq.question}`}
                        className="px-4 pb-4 pt-2 border-t border-[#2F333E] bg-[#141518]"
                      >
                        <div className="text-xs font-mono uppercase text-[#94A3B8] mb-2 font-bold">
                          Recommended Talking Points:
                        </div>
                        <ul className="space-y-2 pl-3 list-disc text-xs text-[#F8FAFC] marker:text-[#FB923C]">
                          {tq.keyTalkingPoints.map((tp: string, ptIdx: number) => (
                            <li key={ptIdx} className="leading-relaxed">
                              {tp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* System Design Focus Tags */}
        {systemDesignFocus.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-[#2F333E]">
            <div className="text-xs font-mono font-bold text-[#FB923C] uppercase tracking-wider flex items-center gap-2">
              <Target className="w-4 h-4 text-[#FB923C]" aria-hidden="true" />
              Edge Systems Architecture Focus Areas
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {systemDesignFocus.map((focus: string, idx: number) => (
                <span key={idx} className="px-3 py-1 rounded-md bg-[#0E0F12] border border-[#3B3F4E] text-white font-mono text-xs font-medium">
                  {focus}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
