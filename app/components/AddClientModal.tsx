"use client";

import { X, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, addDoc, Timestamp, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded?: () => void;
}

export default function AddClientModal({ isOpen, onClose, onClientAdded }: AddClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [programs, setPrograms] = useState<string[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentProgram: "",
  });

  // Fetch programs from Firebase when modal opens
  useEffect(() => {
    const fetchPrograms = async () => {
      if (!isOpen) return;
      
      try {
        setLoadingPrograms(true);
        const programsCollection = collection(db, "programs");
        const programsSnapshot = await getDocs(programsCollection);
        
        const programNames = programsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return data.name || "Unnamed Program";
        });
        
        // Add "No Program" option at the end
        setPrograms([...programNames, "No Program"]);
      } catch (error) {
        console.error("Error fetching programs:", error);
        // Fallback to just "No Program" if there's an error
        setPrograms(["No Program"]);
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

  const selectProgram = (program: string) => {
    setFormData(prev => ({ ...prev, currentProgram: program }));
  };

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      currentProgram: "",
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
        username: formData.username,
        profilePhoto: "",
        role: "client",
        assignedCoachId: null,
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
        currentProgram: formData.currentProgram || "No Program",
      });

      // Reset form
      setFormData({
        username: "",
        email: "",
        currentProgram: "",
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
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-2xl font-bold text-card-foreground">Add New Client</h2>
            <p className="text-sm text-muted-foreground mt-1">Create a new client profile</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="johndoe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full h-11 px-4 rounded-lg border border-border bg-background text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Assign the client a training program
              </label>
              {loadingPrograms ? (
                <div className="flex items-center justify-center p-3 rounded-lg border border-border bg-background min-h-[100px]">
                  <p className="text-sm text-muted-foreground">Loading programs...</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-background min-h-[100px] max-h-[200px] overflow-y-auto">
                  {programs.length > 0 ? (
                    programs.map((program) => (
                      <button
                        key={program}
                        type="button"
                        onClick={() => selectProgram(program)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          formData.currentProgram === program
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {formData.currentProgram === program && (
                          <Check className="w-3 h-3 inline mr-1" />
                        )}
                        {program}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No programs available</p>
                  )}
                </div>
              )}
              {formData.currentProgram && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected: <span className="font-medium text-card-foreground">{formData.currentProgram}</span>
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={resetForm}
            className="h-11 px-6 rounded-lg text-muted-foreground font-medium hover:text-card-foreground hover:bg-accent transition-colors"
          >
            Reset
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 rounded-lg border border-border bg-background text-card-foreground font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.username || !formData.email}
              className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Client"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
