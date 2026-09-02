import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Save,
  RefreshCw,
  Briefcase,
  Sparkles,
  AlertCircle,
  FileText,
  CheckCircle2,
  MapPin,
  Clock,
  Layers,
} from "lucide-react";
import type { JobPosting, JobPostingInput, ApiResponse } from "../types";
import { extractJobPostingHeuristic } from "../../lib/job";

export interface EditJobModalProps {
  job: JobPosting | null;
  isOpen: boolean;
  userId?: string;
  sessionId?: string;
  agentSessionName?: string;
  onClose: () => void;
  onSave: (updated: JobPosting) => void;
}

export function EditJobModal({
  job,
  isOpen,
  userId,
  agentSessionName,
  onClose,
  onSave,
}: EditJobModalProps) {
  const [activeTab, setActiveTab] = useState<"paste" | "manual">(() => (job ? "manual" : "paste"));
  const [rawText, setRawText] = useState(() => job?.rawDescription || "");
  const [formData, setFormData] = useState(() => ({
    title: job?.title || "",
    company: job?.company || "",
    location: job?.location || "Remote",
    experienceLevel: job?.experienceLevel || "Mid-Senior Level",
    requiredSkills: (job?.requiredSkills || []).join(", "),
    preferredSkills: (job?.preferredSkills || []).join(", "),
    responsibilities: (job?.responsibilities || []).join("\n"),
    rawDescription: job?.rawDescription || "",
  }));
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedNotice, setExtractedNotice] = useState<string | null>(null);

  const rawTextareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync state when modal opens or job prop changes
  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || "",
        company: job.company || "",
        location: job.location || "Remote",
        experienceLevel: job.experienceLevel || "Mid-Senior Level",
        requiredSkills: (job.requiredSkills || []).join(", "),
        preferredSkills: (job.preferredSkills || []).join(", "),
        responsibilities: (job.responsibilities || []).join("\n"),
        rawDescription: job.rawDescription || "",
      });
      setRawText(job.rawDescription || "");
      setActiveTab("manual");
    } else {
      setFormData({
        title: "",
        company: "",
        location: "Remote",
        experienceLevel: "Mid-Senior Level",
        requiredSkills: "",
        preferredSkills: "",
        responsibilities: "",
        rawDescription: "",
      });
      setRawText("");
      setActiveTab("paste");
    }
    setError(null);
    setExtractedNotice(null);
  }, [job, isOpen]);

  // Keyboard accessibility and initial focus
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (activeTab === "paste") {
          rawTextareaRef.current?.focus();
        } else {
          titleInputRef.current?.focus();
        }
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, activeTab, onClose]);

  if (!isOpen) return null;

  // Quick auto-extraction workflow
  const handleAutoExtract = () => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setError("Please paste job posting text to extract requirements.");
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const extracted = extractJobPostingHeuristic(trimmed, {
        title: formData.title.trim() || undefined,
        company: formData.company.trim() || undefined,
      });

      setFormData({
        title: extracted.title,
        company: extracted.company,
        location: extracted.location,
        experienceLevel: extracted.experienceLevel,
        requiredSkills: extracted.requiredSkills.join(", "),
        preferredSkills: extracted.preferredSkills.join(", "),
        responsibilities: extracted.responsibilities.join("\n"),
        rawDescription: extracted.rawDescription || trimmed,
      });

      setExtractedNotice(
        `Extracted "${extracted.title}" at ${extracted.company} with ${extracted.requiredSkills.length} required skills.`
      );
      setActiveTab("manual");
    } catch (err) {
      setError(`Extraction failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Save handler (persists to /api/job)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setExtractedNotice(null);

    if (!formData.title.trim() || !formData.company.trim()) {
      setError("Job Title and Company are required.");
      setIsSaving(false);
      return;
    }

    const requiredSkillsArray = formData.requiredSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const preferredSkillsArray = formData.preferredSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const responsibilitiesArray = formData.responsibilities
      .split("\n")
      .map((s) => s.replace(/^[-*•\d+.]\s*/, "").trim())
      .filter(Boolean);

    const payload: JobPostingInput = {
      id: job?.id,
      title: formData.title.trim(),
      company: formData.company.trim(),
      location: formData.location.trim() || "Remote",
      experienceLevel: formData.experienceLevel.trim() || "Mid-Senior Level",
      requiredSkills: requiredSkillsArray,
      preferredSkills: preferredSkillsArray,
      responsibilities: responsibilitiesArray,
      rawDescription: formData.rawDescription.trim() || rawText.trim(),
    };

    try {
      const params = new URLSearchParams();
      if (agentSessionName) {
        params.set("session", agentSessionName);
      }
      if (userId) {
        params.set("userId", userId);
      }
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/job${queryString}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as ApiResponse<JobPosting>;
      if (data.success && data.job) {
        onSave(data.job);
        onClose();
      } else {
        setError(data.error || "Failed to save target job description.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error saving target job.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-job-title"
      aria-describedby="edit-job-desc"
      className="modal modal-open bg-black/80 z-50 flex items-center justify-center p-4"
    >
      <div className="modal-box bg-[#141518] border border-[#2F333E] max-w-2xl w-full p-6 space-y-4 shadow-2xl rounded-2xl text-[#CBD5E1] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2F333E] shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-[#F6821F]/20 text-[#FB923C] flex items-center justify-center font-bold"
              aria-hidden="true"
            >
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 id="edit-job-title" className="font-bold text-base text-white">
                {job ? "Edit Target Job Description" : "Ingest Target Job Posting"}
              </h3>
              <p id="edit-job-desc" className="text-xs text-[#94A3B8] font-mono">
                Persistent SQLite Session Target Role
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close job ingestion dialog"
            className="p-1.5 rounded-lg hover:bg-[#1E2026] text-[#CBD5E1] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#2F333E] pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "paste"
                ? "bg-[#F6821F] text-[#0C0D0E]"
                : "bg-[#1E2026] text-[#CBD5E1] hover:text-white hover:bg-[#272932]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>1. Quick Paste &amp; Auto-Extract</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === "manual"
                ? "bg-[#F6821F] text-[#0C0D0E]"
                : "bg-[#1E2026] text-[#CBD5E1] hover:text-white hover:bg-[#272932]"
            }`}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            <span>2. Manual Field Editor</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2 shrink-0"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {extractedNotice && (
          <div
            role="status"
            aria-live="polite"
            className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 shrink-0"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{extractedNotice}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 custom-scrollbar">
          {activeTab === "paste" ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  htmlFor="raw-job-text"
                  className="text-xs font-semibold text-white flex items-center justify-between"
                >
                  <span>Paste Raw Job Description</span>
                  <span className="text-xs text-[#94A3B8] font-normal">
                    Plain text from Greenhouse, Lever, LinkedIn, etc.
                  </span>
                </label>
                <textarea
                  ref={rawTextareaRef}
                  id="raw-job-text"
                  rows={10}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste full job posting text here (e.g. title, responsibilities, requirements)..."
                  className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg p-3 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none resize-none font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-[#94A3B8]">
                  Auto-extracts role title, company, required skills, and duties into structured fields.
                </p>
                <button
                  type="button"
                  onClick={handleAutoExtract}
                  disabled={isExtracting || !rawText.trim()}
                  className="px-4 py-2 rounded-lg bg-[#F6821F] hover:bg-[#E57213] text-[#0C0D0E] font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
                >
                  {isExtracting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="w-4 h-4 fill-[#0C0D0E]" aria-hidden="true" />
                  )}
                  <span>Auto-Extract Fields</span>
                </button>
              </div>
            </div>
          ) : (
            <form id="manual-job-form" onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="form-control space-y-1">
                  <label htmlFor="edit-job-title-input" className="text-xs font-semibold text-white">
                    Job Title <span className="text-[#FB923C]">*</span>
                  </label>
                  <input
                    ref={titleInputRef}
                    id="edit-job-title-input"
                    type="text"
                    required
                    placeholder="e.g. Software Engineer – Edge Platform"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
                  />
                </div>

                <div className="form-control space-y-1">
                  <label htmlFor="edit-job-company" className="text-xs font-semibold text-white">
                    Company Name <span className="text-[#FB923C]">*</span>
                  </label>
                  <input
                    id="edit-job-company"
                    type="text"
                    required
                    placeholder="e.g. Cloudflare"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="form-control space-y-1">
                  <label
                    htmlFor="edit-job-location"
                    className="text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" aria-hidden="true" /> Location
                  </label>
                  <input
                    id="edit-job-location"
                    type="text"
                    placeholder="e.g. Remote / San Francisco, CA / Bengaluru"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
                  />
                </div>

                <div className="form-control space-y-1">
                  <label
                    htmlFor="edit-job-experience"
                    className="text-xs font-semibold text-white flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-[#94A3B8]" aria-hidden="true" /> Experience Tier
                  </label>
                  <input
                    id="edit-job-experience"
                    type="text"
                    placeholder="e.g. Senior Level (5+ years)"
                    value={formData.experienceLevel}
                    onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                    className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
                  />
                </div>
              </div>

              <div className="form-control space-y-1">
                <label
                  htmlFor="edit-job-required-skills"
                  className="text-xs font-semibold text-white flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#FB923C]" aria-hidden="true" />
                    Required Skills
                  </span>
                  <span className="text-xs text-[#94A3B8] font-mono font-normal">
                    (comma-separated)
                  </span>
                </label>
                <input
                  id="edit-job-required-skills"
                  type="text"
                  placeholder="e.g. TypeScript, Cloudflare Workers, Distributed Systems, Durable Objects"
                  value={formData.requiredSkills}
                  onChange={(e) => setFormData({ ...formData, requiredSkills: e.target.value })}
                  className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
                />
              </div>

              <div className="form-control space-y-1">
                <label
                  htmlFor="edit-job-preferred-skills"
                  className="text-xs font-semibold text-white flex items-center justify-between"
                >
                  <span>Preferred / Nice-to-Have Skills</span>
                  <span className="text-xs text-[#94A3B8] font-mono font-normal">
                    (comma-separated)
                  </span>
                </label>
                <input
                  id="edit-job-preferred-skills"
                  type="text"
                  placeholder="e.g. Rust, WebAssembly, Kafka, gRPC"
                  value={formData.preferredSkills}
                  onChange={(e) => setFormData({ ...formData, preferredSkills: e.target.value })}
                  className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
                />
              </div>

              <div className="form-control space-y-1">
                <label
                  htmlFor="edit-job-responsibilities"
                  className="text-xs font-semibold text-white flex items-center justify-between"
                >
                  <span>Key Responsibilities &amp; Duties</span>
                  <span className="text-xs text-[#94A3B8] font-mono font-normal">
                    (one per line)
                  </span>
                </label>
                <textarea
                  id="edit-job-responsibilities"
                  rows={3}
                  placeholder="Design high-throughput edge architectures&#10;Maintain developer tooling runtime platforms"
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg p-3 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none resize-none leading-relaxed font-mono"
                />
              </div>
            </form>
          )}
        </div>

        {/* Footer actions */}
        <div className="modal-action pt-3 border-t border-[#2F333E] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1E2026] hover:bg-[#272932] border border-[#3B3F4E] text-white text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {activeTab === "paste" && rawText.trim() && (
              <button
                type="button"
                onClick={() => setActiveTab("manual")}
                className="px-3.5 py-2 rounded-lg bg-[#18191E] hover:bg-[#272932] border border-[#3B3F4E] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Review Fields
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                if (activeTab === "paste" && (!formData.title || !formData.company)) {
                  handleAutoExtract();
                } else {
                  handleSubmit(e);
                }
              }}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-[#F6821F] hover:bg-[#E57213] text-[#0C0D0E] font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Save Target Job</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
