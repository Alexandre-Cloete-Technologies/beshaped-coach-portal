"use client";

import { X, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createClientAccount } from "@/lib/createClient";
import { createClientErrorMessage } from "@/lib/createClientErrors";
import { emailsMatch, inviteEmailErrorMessage } from "@/lib/clientInvite";
import { resetPassword } from "@/lib/firebase/auth";
import { useSignedInCoach } from "@/lib/auth/AuthProvider";
import { assignProgramToClient } from "@/lib/programAssignment";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded?: () => void;
}

export default function AddClientModal({ isOpen, onClose, onClientAdded }: AddClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once the account exists: what to tell the coach (the invite email, and anything that needs a follow-up).
  const [created, setCreated] = useState<{ email: string; inviteSent: boolean; notes: string[] } | null>(null);
  const [programs, setPrograms] = useState<{id: string; name: string}[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const { uid: coachUid, role: coachRole } = useSignedInCoach();
  // Admin only: staff accounts a new client can be assigned to. A coach always assigns to themselves.
  const [coaches, setCoaches] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    confirmEmail: "",
    phoneNumber: "",
    currentProgram: "",
    assignedCoach: "",
    goals: "",
  });

  // Prefetch programs on mount so the dropdown label is stable when the modal opens
  useEffect(() => {
    let cancelled = false;

    const fetchPrograms = async () => {
      try {
        const programsSnapshot = await getDocs(collection(db, "programs"));
        if (cancelled) return;
        setPrograms(
          programsSnapshot.docs.map((d) => ({
            id: d.id,
            name: d.data().name || "Unnamed Program",
          }))
        );
      } catch (error) {
        console.error("Error fetching programs:", error);
        if (!cancelled) setPrograms([]);
      } finally {
        if (!cancelled) setLoadingPrograms(false);
      }
    };

    const fetchCoaches = async () => {
      if (coachRole !== "admin") return;
      try {
        const staffSnapshot = await getDocs(
          query(collection(db, "users"), where("role", "in", ["coach", "admin"]))
        );
        if (cancelled) return;
        setCoaches(
          staffSnapshot.docs.map((d) => {
            const data = d.data();
            const name = data.displayName || data.username || data.email || "Unnamed coach";
            // Role and email too: staff names in `users` aren't reliable (e.g. a coach named "Admin").
            const details = [data.role === "admin" ? "Admin" : "Coach", d.id === coachUid ? "you" : null]
              .filter(Boolean)
              .join(", ");
            const email = data.email && data.email !== name ? ` · ${data.email}` : "";
            return { id: d.id, name: `${name} (${details})${email}` };
          })
        );
      } catch (error) {
        console.error("Error fetching coaches:", error);
      }
    };

    fetchPrograms();
    fetchCoaches();
    return () => {
      cancelled = true;
    };
  }, [coachRole, coachUid]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };



  const resetForm = () => {
    setError(null);
    setFormData({
      username: "",
      email: "",
      confirmEmail: "",
      phoneNumber: "",
      currentProgram: "",
      assignedCoach: "",
      goals: "",
    });
  };

  const handleClose = () => {
    setError(null);
    setCreated(null);
    onClose();
  };

  const confirmMismatch = formData.confirmEmail !== "" && !emailsMatch(formData.email, formData.confirmEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const email = formData.email.trim();
    if (!emailsMatch(email, formData.confirmEmail)) {
      setError("The two email addresses do not match.");
      return;
    }
    setLoading(true);

    let uid: string;
    try {
      // The backend creates the Auth account and the users doc (Admin SDK, rolled back together), so the coach
      // stays signed in. It sets no usable password: the client sets their own from the invite email below.
      // An admin's coach choice is sent; for a coach the backend uses their own uid.
      ({ uid } = await createClientAccount({
        email,
        username: formData.username.trim(),
        phoneNumber: formData.phoneNumber || undefined,
        goals: formData.goals || undefined,
        assignedCoachId: coachRole === "admin" && formData.assignedCoach ? formData.assignedCoach : undefined,
        programId: formData.currentProgram || undefined,
      }));
    } catch (err) {
      console.error("Error adding client:", err);
      setError(createClientErrorMessage(err));
      setLoading(false);
      return;
    }

    // The account exists now, so a retry would only say the email is taken: report what is left to do instead.
    const notes: string[] = [];
    try {
      // If a program was selected: its userPrograms doc and a scheduled workoutLog per program day
      if (formData.currentProgram) {
        const selectedProgramObj = programs.find((p) => p.id === formData.currentProgram);
        await assignProgramToClient(uid, formData.currentProgram, selectedProgramObj?.name);
      }
    } catch (err) {
      console.error("Client created, but assigning the program failed:", err);
      notes.push("Their program could not be set up. Open the client and assign the program again.");
    }

    let inviteSent = false;
    try {
      await resetPassword(email);
      inviteSent = true;
    } catch (err) {
      console.error("Client created, but the set-password email failed:", err);
      notes.push(`${inviteEmailErrorMessage(err)} Open the client and use "Send set-password email".`);
    }

    resetForm();
    setCreated({ email, inviteSent, notes });
    onClientAdded?.();
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Add a New User</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Create a new user&apos;s profile. They get an email to set their own password.</p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {created ? (
          <>
            <div className="px-6 py-8" role="status">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 mt-0.5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-card-foreground">
                    {created.inviteSent ? `Invite sent to ${created.email}` : `Client added (${created.email})`}
                  </p>
                  {created.inviteSent && (
                    <p className="text-xs text-muted-foreground mt-1">
                      They set their own password from the email, then sign in to the app.
                    </p>
                  )}
                  {created.notes.map((note) => (
                    <p key={note} className="text-sm text-destructive mt-2">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="h-10 px-4 rounded-lg border border-border bg-background text-xs text-card-foreground font-medium hover:bg-accent transition-colors"
              >
                Add another
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="h-10 px-5 rounded-lg bg-beshaped-dark-green text-white text-xs font-medium hover:bg-beshaped-green transition-colors"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-6">
              <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                {/* Username */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="johndoe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Confirm email: the client's invite goes to this address, so a typo must not slip through */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Confirm Email Address *
                  </label>
                  <input
                    type="email"
                    name="confirmEmail"
                    value={formData.confirmEmail}
                    onChange={handleInputChange}
                    required
                    aria-invalid={confirmMismatch}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="john@example.com"
                  />
                  {confirmMismatch && (
                    <p className="mt-1 text-xs text-destructive">The two email addresses do not match.</p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                    placeholder="+264 81 234 5678"
                  />
                </div>

                {/* Assigned Coach (admin only), with an empty cell so Goals and Program stay on one row */}
                {coachRole === "admin" && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-card-foreground mb-2">
                        Assigned Coach
                      </label>
                      <select
                        name="assignedCoach"
                        value={formData.assignedCoach || coachUid}
                        onChange={(e) => setFormData(prev => ({ ...prev, assignedCoach: e.target.value }))}
                        className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
                      >
                        {!coaches.some((coach) => coach.id === coachUid) && (
                          <option value={coachUid}>Me</option>
                        )}
                        {coaches.map((coach) => (
                          <option key={coach.id} value={coach.id}>
                            {coach.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div />
                  </>
                )}

                {/* Goals */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Goals
                  </label>
                  <textarea
                    name="goals"
                    value={formData.goals}
                    onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                    className="w-full h-28 px-3 py-2 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                    placeholder="e.g. Lose 5kg, Improve squat form..."
                  />
                </div>

                {/* Training Program */}
                <div>
                  <label className="block text-xs font-medium text-card-foreground mb-2">
                    Training Program
                  </label>
                  <select
                    name="currentProgram"
                    value={formData.currentProgram}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentProgram: e.target.value }))}
                    disabled={loadingPrograms && programs.length === 0}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
                  >
                    <option value="">Select a Program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {error && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {error}
                </p>
              )}
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
              <button
                type="button"
                onClick={resetForm}
                className="h-10 px-4 rounded-lg text-xs text-muted-foreground font-medium hover:text-card-foreground hover:bg-accent transition-colors"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="h-10 px-4 rounded-lg border border-border bg-background text-xs text-card-foreground font-medium hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.username || !formData.email || !emailsMatch(formData.email, formData.confirmEmail)}
                className="h-10 px-5 rounded-lg bg-beshaped-dark-green text-white text-xs font-medium hover:bg-beshaped-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Adding..." : "Add Client"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
