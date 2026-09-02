import React from "react";
import { Sparkles, CheckCircle2, AlertCircle, Award, Briefcase, Plus } from "lucide-react";
import type { ScoreJobFitData, JobPosting } from "../types";

export interface FitScoreViewProps {
  data?: ScoreJobFitData | null;
  job?: JobPosting | null;
  onIngestJob?: () => void;
}

export function FitScoreView({ data, job, onIngestJob }: FitScoreViewProps) {
  if (!data || (data.compositeScore === undefined && data.score === undefined)) {
    return (
      <div className="card bg-[#141518] border border-[#2F333E] mt-3 overflow-hidden text-[#CBD5E1]">
        <div className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#1C1E24] border border-[#3B3F4E] flex items-center justify-center mx-auto text-[#FB923C]">
            <Sparkles className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="font-bold text-white text-sm">Target Job Required for Fit Scoring</h4>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Ingest a target job posting to compute composite role alignment across Skills (35%), Experience (30%), Domain (20%), and Trajectory (15%).
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

  const score = data.compositeScore ?? data.score ?? 0;
  const rec = data.recommendation;
  const breakdown = data.breakdown?.subDimensions || data.subDimensions;
  const strengths = data.breakdown?.strengths || [];
  const gaps = data.breakdown?.gaps || [];
  const reasoning = data.breakdown?.reasoning;

  return (
    <div className="card bg-[#141518] border border-[#2F333E] mt-3 overflow-hidden text-[#CBD5E1]">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-[#2F333E] bg-[#0E0F12] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F6821F]/20 text-[#FB923C] flex items-center justify-center font-bold" aria-hidden="true">
            <Sparkles className="w-4 h-4 text-[#FB923C]" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              Role Fit Evaluation
              <span className="badge badge-neutral badge-sm font-mono text-[#CBD5E1] border border-[#3B3F4E]">
                Workers AI Heuristics
              </span>
            </h4>
            <p className="text-xs text-[#94A3B8]">
              {job ? `${job.title} @ ${job.company}` : "Weighted 4-dimension composite score"}
            </p>
          </div>
        </div>

        {rec && (
          <span className="px-2.5 py-1 rounded bg-[#1E2026] text-[#FB923C] border border-[#3B3F4E] font-bold font-mono text-xs">
            {rec}
          </span>
        )}
      </div>

      <div className="card-body p-4 space-y-4">
        {/* Score & Sub-dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Main Score Box */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-[#0E0F12] border border-[#2F333E]">
            <div
              className="radial-progress text-[#FB923C] font-mono font-bold text-2xl"
              style={{
                "--value": score,
                "--size": "5.5rem",
                "--thickness": "6px",
              } as React.CSSProperties}
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Composite Fit Score: ${score} percent`}
            >
              {score}
            </div>
            <span className="mt-2 text-xs font-bold text-white font-mono">Composite Fit Index</span>
            <span className="text-xs text-[#94A3B8] font-mono">Target: 80+ for Strong Fit</span>
          </div>

          {/* Sub-dimensions */}
          {breakdown && (
            <div className="md:col-span-8 space-y-2">
              {[
                { label: "Skills Alignment", weight: "35%", val: breakdown.skillsFit },
                { label: "Experience Depth", weight: "30%", val: breakdown.experienceFit },
                { label: "Edge & Domain Match", weight: "20%", val: breakdown.domainFit },
                { label: "Career Trajectory", weight: "15%", val: breakdown.trajectoryFit },
              ].map((dim, idx) => (
                <div key={idx} className="p-2.5 rounded-lg bg-[#0E0F12] border border-[#2F333E] space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-[#CBD5E1] flex items-center gap-1.5 font-mono text-xs">
                      {dim.label} <span className="text-xs text-[#94A3B8]">({dim.weight})</span>
                    </span>
                    <span className="font-mono font-bold text-white">{dim.val}%</span>
                  </div>
                  <progress
                    className="progress progress-primary w-full h-2.5 bg-[#1E2026]"
                    value={dim.val}
                    max="100"
                    aria-label={`${dim.label}: ${dim.val} percent`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strengths & Growth Areas */}
        {(strengths.length > 0 || gaps.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#2F333E]">
            {strengths.length > 0 && (
              <div className="p-3 rounded-lg bg-[#0E0F12] border border-[#2F333E] space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" /> Key Strengths
                </div>
                <ul className="space-y-1 text-xs text-[#CBD5E1]">
                  {strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#FB923C] font-bold mt-0.5" aria-hidden="true">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {gaps.length > 0 && (
              <div className="p-3 rounded-lg bg-[#0E0F12] border border-[#2F333E] space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  <AlertCircle className="w-4 h-4 text-amber-400" aria-hidden="true" /> Growth Areas
                </div>
                <ul className="space-y-1 text-xs text-[#CBD5E1]">
                  {gaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold mt-0.5" aria-hidden="true">•</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Reasoning */}
        {reasoning && (
          <div className="p-3.5 rounded-lg bg-[#0E0F12] border border-[#2F333E] text-xs text-[#CBD5E1] leading-relaxed">
            <span className="font-bold text-white block mb-1.5 uppercase font-mono text-xs tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#FB923C]" aria-hidden="true" /> Evaluation Synthesis
            </span>
            {reasoning}
          </div>
        )}
      </div>
    </div>
  );
}
