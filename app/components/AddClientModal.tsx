"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, addDoc, Timestamp, getDocs, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded?: () => void;
}

export default function AddClientModal({ isOpen, onClose, onClientAdded }: AddClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<{id: string; name: string}[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // Static coaches data
  const staticCoaches = [
    { id: "c1", name: "Coach Mike" },
    { id: "c2", name: "Sarah Connor" },
    { id: "c3", name: "John Doe" },
  ];

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phoneNumber: "",
    currentProgram: "",
    role: "client",
    assignedCoach: "",
    goals: "",
  });

  // Fetch programs from Firebase when modal opens
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!isOpen) return;
      
      try {
        setLoadingPrograms(true);
        const programsCollection = collection(db, "programs");
        const programsSnapshot = await getDocs(programsCollection);
        
        const programList = programsSnapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Unnamed Program",
        }));
        
        setPrograms(programList);
      } catch (error) {
        console.error("Error fetching programs:", error);
        // Fallback to just "No Program" if there's an error
        setPrograms([]);
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchPrograms();
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };



  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      phoneNumber: "",
      currentProgram: "",
      role: "client",
      assignedCoach: "",
      goals: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create user document in Firebase
      await addDoc(collection(db, "users"), {
        displayName: formData.username,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        username: formData.username,
        profilePhoto: "",
        role: formData.role,
        assignedCoachId: formData.assignedCoach || null, // Storing name as ID for now based on text input
        goals: formData.goals,
        onboardingCompleted: false,
        createdAt: Timestamp.now(),
        lastActive: Timestamp.now(),
        settings: {
          weightUnit: "kg",
          notifications: true,
          theme: "light",
          restTimerEnabled: true,
          soundEffects: true,
        },
        stats: {
          totalWorkouts: 0,
          currentStreak: 0,
          longestStreak: 0,
        },
        currentProgram: formData.currentProgram ? doc(db, "programs", formData.currentProgram) : null,
      });

      // Reset form
      setFormData({
        username: "",
        email: "",
        phoneNumber: "",
        currentProgram: "",
        role: "client",
        assignedCoach: "",
        goals: "",
      });

      // Notify parent component
      if (onClientAdded) {
        onClientAdded();
      }

      onClose();
    } catch (error) {
      console.error("Error adding client:", error);
      alert("Failed to add client. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Add New Client</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Create a new client profile</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

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

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-card-foreground mb-2">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
              >
                <option value="client">Client</option>
                <option value="coach">Coach</option>
              </select>
            </div>

            {/* Assigned Coach */}
            {formData.role === "client" ? (
              <div>
                <label className="block text-xs font-medium text-card-foreground mb-2">
                  Assigned Coach
                </label>
                <select
                  name="assignedCoach"
                  value={formData.assignedCoach}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedCoach: e.target.value }))}
                  className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
                >
                  <option value="">Select a Coach</option>
                  {staticCoaches.map((coach) => (
                    <option key={coach.id} value={coach.name}>
                      {coach.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : <div />}

            {/* Goals & Program - only for clients */}
            {formData.role === "client" && (
              <>
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
                    disabled={loadingPrograms}
                    className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
                  >
                    <option value="">{loadingPrograms ? "Loading programs..." : "Select a Program"}</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
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
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-border bg-background text-xs text-card-foreground font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.username || !formData.email}
            className="h-10 px-5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding..." : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
