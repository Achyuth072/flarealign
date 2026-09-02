import React from "react";
import { Sparkles, CheckCircle2, AlertCircle, Award } from "lucide-react";
import type { ScoreJobFitData } from "../types";

export function FitScoreView({ data }: { data: ScoreJobFitData }) {
  const score = data.compositeScore ?? data.score ?? 0;
  const rec = data.recommendation;
  const breakdown = data.breakdown?.subDimensions || data.subDimensions;
  const strengths = data.breakdown?.strengths || [];
  const gaps = data.breakdown?.gaps || [];
  const reasoning = data.breakdown?.reasoning;

  return (
    <div className="card bg-base-100 border border-base-300 mt-3 overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-base-300 bg-base-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-base-content text-xs flex items-center gap-2">
              Role Fit Evaluation
              <span className="badge badge-neutral badge-xs font-mono text-base-content/70 border-base-300">
                Workers AI Heuristics
              </span>
            </h4>
            <p className="text-[11px] text-base-content/60">Weighted 4-dimension composite score</p>
          </div>
        </div>

        {rec && (
          <span className="badge badge-neutral font-medium font-mono text-xs px-2.5 py-1 text-primary border-base-300">
            {rec}
          </span>
        )}
      </div>

      <div className="card-body p-4 space-y-4">
        {/* Score & Sub-dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Main Score Box */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-base-200 border border-base-300">
            <div
              className="radial-progress text-primary font-mono font-bold text-2xl"
              style={{
                "--value": score,
                "--size": "5.5rem",
                "--thickness": "6px",
              } as React.CSSProperties}
              role="progressbar"
            >
              {score}
            </div>
            <span className="mt-2 text-xs font-semibold text-base-content font-mono">Composite Fit Index</span>
            <span className="text-[10px] text-base-content/50 font-mono">Target: 80+ for Strong Fit</span>
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
                <div key={idx} className="p-2.5 rounded-lg bg-base-200 border border-base-300 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-base-content/80 flex items-center gap-1 font-mono text-xs">
                      {dim.label} <span className="text-[10px] text-base-content/40">({dim.weight})</span>
                    </span>
                    <span className="font-mono font-bold text-base-content">{dim.val}%</span>
                  </div>
                  <progress
                    className="progress progress-primary w-full h-2 bg-base-300"
                    value={dim.val}
                    max="100"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Strengths & Growth Areas */}
        {(strengths.length > 0 || gaps.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-base-300">
            {strengths.length > 0 && (
              <div className="p-3 rounded-lg bg-base-200 border border-base-300 space-y-1.5">
                <div className="text-[11px] font-bold text-base-content flex items-center gap-1 uppercase font-mono tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Key Strengths
                </div>
                <ul className="space-y-1 text-xs text-base-content/80">
                  {strengths.map((str, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {gaps.length > 0 && (
              <div className="p-3 rounded-lg bg-base-200 border border-base-300 space-y-1.5">
                <div className="text-[11px] font-bold text-base-content flex items-center gap-1 uppercase font-mono tracking-wider">
                  <AlertCircle className="w-3.5 h-3.5 text-base-content/50" /> Growth Areas
                </div>
                <ul className="space-y-1 text-xs text-base-content/80">
                  {gaps.map((gap, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-base-content/50 mt-0.5">•</span>
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
          <div className="p-3 rounded-lg bg-base-200 border border-base-300 text-xs text-base-content/80 leading-relaxed">
            <span className="font-bold text-base-content block mb-1 uppercase font-mono text-[10px] tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" /> Evaluation Synthesis
            </span>
            {reasoning}
          </div>
        )}
      </div>
    </div>
  );
}
