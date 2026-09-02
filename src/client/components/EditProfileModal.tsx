import React, { useState, useEffect } from "react";
import { X, Save, RefreshCw, UserCheck, AlertCircle } from "lucide-react";
import type { CandidateProfile, ApiResponse } from "../types";

interface EditProfileModalProps {
  candidate: CandidateProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: CandidateProfile) => void;
}

export function EditProfileModal({ candidate, isOpen, onClose, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState({
    name: candidate.name,
    location: candidate.location,
    targetRole: candidate.targetRole,
    yearsOfExperience: candidate.yearsOfExperience,
    skills: candidate.skills.join(", "),
    resumeSummary: candidate.resumeSummary,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData({
      name: candidate.name,
      location: candidate.location,
      targetRole: candidate.targetRole,
      yearsOfExperience: candidate.yearsOfExperience,
      skills: candidate.skills.join(", "),
      resumeSummary: candidate.resumeSummary,
    });
    setError(null);
  }, [candidate, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 50);
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const skillsArray = formData.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: formData.name.trim(),
      location: formData.location.trim(),
      targetRole: formData.targetRole.trim(),
      yearsOfExperience: Number(formData.yearsOfExperience),
      skills: skillsArray,
      resumeSummary: formData.resumeSummary.trim(),
    };

    try {
      const res = await fetch("/api/candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as ApiResponse<CandidateProfile>;
      if (data.success && data.candidate) {
        onSave(data.candidate);
        onClose();
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error updating profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      aria-describedby="edit-profile-desc"
      className="modal modal-open bg-black/80 z-50 flex items-center justify-center p-4"
    >
      <div className="modal-box bg-[#141518] border border-[#2F333E] max-w-lg w-full p-6 space-y-4 shadow-2xl rounded-2xl text-[#CBD5E1]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#2F333E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F6821F]/20 text-[#FB923C] flex items-center justify-center font-bold" aria-hidden="true">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="edit-profile-title" className="font-bold text-base text-white">Edit Candidate Profile</h3>
              <p id="edit-profile-desc" className="text-xs text-[#94A3B8] font-mono">Durable Object SQLite Actor State</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close edit profile dialog"
            className="p-1.5 rounded-lg hover:bg-[#1E2026] text-[#CBD5E1] hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div role="alert" aria-live="assertive" className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="form-control space-y-1">
              <label htmlFor="edit-profile-name" className="text-xs font-semibold text-white">
                Full Name
              </label>
              <input
                ref={firstInputRef}
                id="edit-profile-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
              />
            </div>
            <div className="form-control space-y-1">
              <label htmlFor="edit-profile-location" className="text-xs font-semibold text-white">
                Location
              </label>
              <input
                id="edit-profile-location"
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="form-control sm:col-span-2 space-y-1">
              <label htmlFor="edit-profile-role" className="text-xs font-semibold text-white">
                Target Role
              </label>
              <input
                id="edit-profile-role"
                type="text"
                required
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
              />
            </div>
            <div className="form-control space-y-1">
              <label htmlFor="edit-profile-years" className="text-xs font-semibold text-white">
                Years Exp
              </label>
              <input
                id="edit-profile-years"
                type="number"
                min="0"
                max="50"
                required
                value={formData.yearsOfExperience}
                onChange={(e) =>
                  setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })
                }
                className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none font-mono"
              />
            </div>
          </div>

          <div className="form-control space-y-1">
            <label htmlFor="edit-profile-skills" className="text-xs font-semibold text-white">
              Core Skills <span className="text-xs text-[#94A3B8] font-mono font-normal">(comma-separated)</span>
            </label>
            <input
              id="edit-profile-skills"
              type="text"
              required
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg px-3 py-2 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none"
            />
          </div>

          <div className="form-control space-y-1">
            <label htmlFor="edit-profile-summary" className="text-xs font-semibold text-white">
              Executive / Resume Summary
            </label>
            <textarea
              id="edit-profile-summary"
              rows={3}
              required
              value={formData.resumeSummary}
              onChange={(e) => setFormData({ ...formData, resumeSummary: e.target.value })}
              className="w-full bg-[#0E0F12] border border-[#3B3F4E] focus:border-[#F6821F] rounded-lg p-3 text-xs text-white placeholder-[#94A3B8] focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="modal-action pt-3 border-t border-[#2F333E] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#1E2026] hover:bg-[#272932] border border-[#3B3F4E] text-white text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#F6821F] focus-visible:outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-[#F6821F] hover:bg-[#E57213] text-[#0C0D0E] font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>Save to SQLite</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
