import React, { useState } from "react";
import { BookOpen, Award, Code2, Target, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { InterviewPrep, BehavioralQuestion, TechnicalQuestion } from "../types";

export function InterviewPrepView({ data }: { data: Partial<InterviewPrep> }) {
  const technicalQuestions = data.technicalQuestions || [];
  const behavioralQuestions = data.behavioralQuestions || [];
  const systemDesignFocus = data.systemDesignFocus || [];
  const [copied, setCopied] = useState(false);
  const [expandedTech, setExpandedTech] = useState<Record<number, boolean>>({});

  const toggleTech = (idx: number) => {
    setExpandedTech((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleCopy = () => {
    let output = `STAR INTERVIEW PREPARATION - ${data.jobTitle || "Role"} @ ${data.company || "Target"}\n\n`;

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
    <div className="card bg-base-100 border border-base-300 mt-3 overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-base-300 bg-base-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-base-content text-xs flex items-center gap-2">
              Structured STAR Interview Strategy
              <span className="badge badge-neutral badge-xs font-mono text-base-content/70 border-base-300">
                L5/L6 Rubric
              </span>
            </h4>
            <p className="text-[11px] text-base-content/60">
              {data.jobTitle ? `${data.jobTitle} • ` : ""}{data.company || "Target Role"}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="btn btn-neutral btn-xs gap-1.5 border border-base-300 font-mono text-base-content/80 hover:btn-primary hover:text-white"
          title="Copy STAR Guide"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Guide</span>
            </>
          )}
        </button>
      </div>

      <div className="card-body p-4 space-y-4">
        {/* Behavioral Scenarios (STAR Method) */}
        {behavioralQuestions.length > 0 && (
          <div className="space-y-3">
            <div className="text-[11px] font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-primary" />
              Behavioral Scenarios (STAR Method Architecture)
            </div>

            <div className="space-y-3">
              {behavioralQuestions.map((bq: BehavioralQuestion, idx: number) => (
                <div
                  key={idx}
                  className="rounded-xl bg-base-200 border border-base-300 p-3.5 space-y-3"
                >
                  <div className="font-medium text-base-content text-xs flex items-start gap-2">
                    <span className="badge badge-neutral badge-sm font-mono font-bold mt-0.5 border-base-300">
                      {idx + 1}
                    </span>
                    <span className="leading-snug pt-0.5">{bq.question}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                    {/* Situation & Task */}
                    {bq.situationTask && (
                      <div className="p-3 rounded-lg bg-base-100 border border-base-300 text-xs flex flex-col justify-between">
                        <div>
                          <span className="font-mono font-bold text-base-content/60 block mb-1 uppercase text-[10px] tracking-wider">
                            Situation &amp; Task
                          </span>
                          <span className="text-base-content/80 leading-relaxed">{bq.situationTask}</span>
                        </div>
                      </div>
                    )}

                    {/* Action Taken */}
                    {bq.actionTaken && (
                      <div className="p-3 rounded-lg bg-base-100 border border-base-300 text-xs flex flex-col justify-between">
                        <div>
                          <span className="font-mono font-bold text-primary block mb-1 uppercase text-[10px] tracking-wider">
                            Action Taken
                          </span>
                          <span className="text-base-content/80 leading-relaxed">{bq.actionTaken}</span>
                        </div>
                      </div>
                    )}

                    {/* Result & Impact */}
                    {bq.resultImpact && (
                      <div className="p-3 rounded-lg bg-base-100 border border-base-300 text-xs flex flex-col justify-between">
                        <div>
                          <span className="font-mono font-bold text-base-content block mb-1 uppercase text-[10px] tracking-wider">
                            Result &amp; Impact
                          </span>
                          <span className="text-base-content/80 leading-relaxed">{bq.resultImpact}</span>
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
          <div className="space-y-3 pt-3 border-t border-base-300">
            <div className="text-[11px] font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-primary" />
              Technical &amp; Systems Architecture Probing
            </div>

            <div className="space-y-2">
              {technicalQuestions.map((tq: TechnicalQuestion, idx: number) => {
                const isExpanded = expandedTech[idx] ?? true;
                return (
                  <div
                    key={idx}
                    className="rounded-xl bg-base-200 border border-base-300 overflow-hidden"
                  >
                    <button
                      onClick={() => toggleTech(idx)}
                      className="w-full text-left p-3 flex items-start justify-between gap-3 hover:bg-base-300/50 transition-colors"
                    >
                      <div className="flex items-start gap-2 flex-1">
                        <span className="badge badge-neutral badge-sm font-mono font-bold shrink-0 mt-0.5 border-base-300">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-medium text-base-content text-xs">{tq.question}</span>
                          {tq.focusArea && (
                            <span className="badge badge-neutral badge-xs font-mono ml-2 border-base-300 text-base-content/60">
                              {tq.focusArea}
                            </span>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-base-content/50 shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-base-content/50 shrink-0 mt-1" />
                      )}
                    </button>

                    {isExpanded && tq.keyTalkingPoints && tq.keyTalkingPoints.length > 0 && (
                      <div className="px-3.5 pb-3.5 pt-1 border-t border-base-300 bg-base-100">
                        <div className="text-[10px] font-mono uppercase text-base-content/50 mb-1.5 font-semibold">
                          Recommended Talking Points:
                        </div>
                        <ul className="space-y-1.5 pl-3 list-disc text-xs text-base-content/80 marker:text-primary">
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
          <div className="space-y-2 pt-3 border-t border-base-300">
            <div className="text-[11px] font-mono font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-primary" />
              Edge Systems Architecture Focus Areas
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {systemDesignFocus.map((focus: string, idx: number) => (
                <span key={idx} className="badge badge-neutral badge-sm font-mono font-medium border-base-300 text-base-content/80">
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
