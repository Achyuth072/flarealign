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
    <div className="card bg-[#141518] border border-[#2F333E] mt-3 overflow-hidden text-[#CBD5E1]">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-[#2F333E] bg-[#0E0F12] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F6821F]/20 text-[#FB923C] flex items-center justify-center font-bold" aria-hidden="true">
            <FileText className="w-4 h-4 text-[#FB923C]" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs flex items-center gap-2">
              Tailored Resume Synthesis
              <span className="badge badge-neutral badge-sm font-mono text-[#CBD5E1] border border-[#3B3F4E]">
                Edge Tailoring
              </span>
            </h4>
            <p className="text-xs text-[#94A3B8]">
              {data.jobTitle ? `${data.jobTitle} • ` : ""}{data.company || "Cloudflare Target"}
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          aria-label={copied ? "Resume content copied to clipboard" : "Copy tailored resume content"}
          className="px-3 py-1.5 rounded-md bg-[#18191E] hover:bg-[#272932] border border-[#3B3F4E] hover:border-[#F6821F]/60 text-xs font-mono font-medium text-white flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
          title="Copy Resume Content"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span className="text-emerald-400 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#CBD5E1]" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="card-body p-4 space-y-4">
        {/* Executive Summary */}
        {data.executiveSummary && (
          <div className="p-3.5 rounded-xl bg-[#0E0F12] border border-[#2F333E] border-l-4 border-l-[#F6821F] space-y-1.5">
            <div className="text-xs uppercase font-mono font-bold text-[#FB923C] tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FB923C]" aria-hidden="true" /> Executive Summary Callout
            </div>
            <p className="text-xs text-[#F8FAFC] leading-relaxed">{data.executiveSummary}</p>
          </div>
        )}

        {/* Tailored Bullets */}
        {bullets.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase font-mono font-bold text-[#CBD5E1] tracking-wider">
              Verified High-Impact Bullets
            </div>
            <div className="space-y-2">
              {bullets.map((b: string, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[#0E0F12] border border-[#2F333E] hover:border-[#F6821F]/50 transition-colors group"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/30" aria-hidden="true">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-[#F8FAFC] leading-relaxed font-normal">
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
