import React, { useState } from "react";
import { FileText, CheckCircle2, Copy, Check, Sparkles } from "lucide-react";
import type { TailorResumeData } from "../types";

export function TailorResumeView({ data }: { data: TailorResumeData }) {
  const bullets = data.tailoredBullets || [];
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = [
      data.executiveSummary ? `Executive Summary:\n${data.executiveSummary}\n` : "",
      "Tailored Impact Bullets:",
      ...bullets.map((b) => `• ${b}`),
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card bg-base-100 border border-base-300 mt-3 overflow-hidden">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-base-300 bg-base-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-base-content text-xs flex items-center gap-2">
              Tailored Resume Synthesis
              <span className="badge badge-neutral badge-xs font-mono text-base-content/70 border-base-300">
                Edge Tailoring
              </span>
            </h4>
            <p className="text-[11px] text-base-content/60">
              {data.jobTitle ? `${data.jobTitle} • ` : ""}{data.company || "Cloudflare Target"}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="btn btn-neutral btn-xs gap-1.5 border border-base-300 font-mono text-base-content/80 hover:btn-primary hover:text-white"
          title="Copy Resume Content"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="card-body p-4 space-y-3.5">
        {/* Executive Summary */}
        {data.executiveSummary && (
          <div className="p-3.5 rounded-xl bg-base-200 border border-base-300 border-l-4 border-l-primary space-y-1.5">
            <div className="text-[10px] uppercase font-mono font-bold text-primary tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Executive Summary Callout
            </div>
            <p className="text-xs text-base-content leading-relaxed">{data.executiveSummary}</p>
          </div>
        )}

        {/* Tailored Bullets */}
        {bullets.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] uppercase font-mono font-bold text-base-content/60 tracking-wider">
              Verified High-Impact Bullets
            </div>
            <div className="space-y-2">
              {bullets.map((b: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-base-200 border border-base-300 hover:border-primary/40 transition-colors group"
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-base-content/90 group-hover:text-base-content transition-colors leading-relaxed">
                    {b}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
