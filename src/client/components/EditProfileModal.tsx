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
    <div className="modal modal-open bg-black/80 z-50">
      <div className="modal-box bg-base-100 border border-base-300 max-w-lg p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-base-content">Edit Candidate Profile</h3>
              <p className="text-[11px] text-base-content/60 font-mono">Durable Object SQLite Actor State</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-base-content"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="alert alert-error p-2.5 rounded-lg text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70">Full Name</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input input-bordered input-sm bg-base-200 focus:input-primary text-xs"
              />
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70">Location</span>
              </label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="input input-bordered input-sm bg-base-200 focus:input-primary text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="form-control col-span-2">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70">Target Role</span>
              </label>
              <input
                type="text"
                required
                value={formData.targetRole}
                onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                className="input input-bordered input-sm bg-base-200 focus:input-primary text-xs"
              />
            </div>
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text text-xs text-base-content/70">Years Exp</span>
              </label>
              <input
                type="number"
                min="0"
                max="50"
                required
                value={formData.yearsOfExperience}
                onChange={(e) =>
                  setFormData({ ...formData, yearsOfExperience: Number(e.target.value) })
                }
                className="input input-bordered input-sm bg-base-200 focus:input-primary text-xs"
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs text-base-content/70">
                Core Skills <span className="text-[10px] text-base-content/40 font-mono">(comma-separated)</span>
              </span>
            </label>
            <input
              type="text"
              required
              value={formData.skills}
              onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
              className="input input-bordered input-sm bg-base-200 focus:input-primary text-xs"
            />
          </div>

          <div className="form-control">
            <label className="label py-1">
              <span className="label-text text-xs text-base-content/70">Executive / Resume Summary</span>
            </label>
            <textarea
              rows={3}
              required
              value={formData.resumeSummary}
              onChange={(e) => setFormData({ ...formData, resumeSummary: e.target.value })}
              className="textarea textarea-bordered bg-base-200 focus:textarea-primary text-xs resize-none"
            />
          </div>

          <div className="modal-action pt-2 border-t border-base-300 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-ghost btn-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary btn-sm gap-1.5 font-mono"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save to SQLite</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
