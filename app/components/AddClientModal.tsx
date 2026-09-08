"use client";

import { X, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { collection, addDoc, setDoc, Timestamp, getDocs, doc, query, where, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { buildProgramWorkoutSlots, seedMissingWorkoutLogsForUserProgram } from "@/lib/workoutLogSeed";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded?: () => void;
}

export default function AddClientModal({ isOpen, onClose, onClientAdded }: AddClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [programs, setPrograms] = useState<{id: string; name: string}[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // Static coaches data
  const staticCoaches = [
    { id: "c1", name: "Dewald" },
    { id: "c2", name: "Pieter van Zyl" },
  ];

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    phoneNumber: "",
    currentProgram: "",
    role: "client",
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

    fetchPrograms();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };



  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      password: "",
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
      // Create user in Firebase Auth first to get UID
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const uid = userCredential.user.uid;

      // Update Auth profile with display name
      await updateProfile(userCredential.user, { displayName: formData.username });

      // Create user document in Firestore using Auth UID as document ID
      const userDocRef = doc(db, "users", uid);
      await setDoc(userDocRef, {
        displayName: formData.username,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        username: formData.username,
        profilePhoto: "",
        role: formData.role,
        assignedCoachId: formData.assignedCoach || null,
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
        availablePrograms: formData.currentProgram
          ? [doc(db, "programs", formData.currentProgram)]
          : [],
      });

      // If a program was selected, create a userPrograms entry (only if none exists)
      if (formData.currentProgram) {
        const newUserRef = userDocRef;
        const programRef = doc(db, "programs", formData.currentProgram);

        // Check if a userPrograms doc already exists for this user
        const userProgramsQuery = query(
          collection(db, "userPrograms"),
          where("userId", "==", newUserRef)
        );
        const existingDocs = await getDocs(userProgramsQuery);

        if (existingDocs.empty) {
          // Fetch program doc to get extra details
          const programSnap = await getDoc(programRef);
          const programData = programSnap.data();
          const selectedProgramObj = programs.find((p) => p.id === formData.currentProgram);
          const totalDurationWeeks = programData?.totalDuration || programData?.phases?.length * 4 || 8;
          const workoutSlots = buildProgramWorkoutSlots(programData);

          const now = Timestamp.now();
          const estimatedEnd = new Date();
          estimatedEnd.setDate(estimatedEnd.getDate() + totalDurationWeeks * 7);

          await addDoc(collection(db, "userPrograms"), {
            userId: newUserRef,
            programId: programRef,
            programName: selectedProgramObj?.name || programData?.name || "Unknown Program",
            status: "active",
            currentPhase: 1,
            currentWeek: 1,
            currentDay: 1,
            nextWorkoutId: null,
            nextWorkoutName: null,
            createdAt: now,
            estimatedEndDate: Timestamp.fromDate(estimatedEnd),
            completedDate: null,
            lastWorkoutDate: null,
            totalWorkoutsCompleted: 0,
            totalWorkoutsMissed: 0,
            adherenceRate: 0,
            totalWorkoutsInProgram: workoutSlots.length,
            phasesCompleted: [],

            notes: null,
            trainerNotes: null,
          });

          const programName = selectedProgramObj?.name || programData?.name || "Unknown Program";
          await seedMissingWorkoutLogsForUserProgram({
            userId: uid,
            programRef,
            programName,
            slots: workoutSlots,
            startedAt: now,
          });
        }
      }

      // Reset form
      setFormData({
        username: "",
        email: "",
        password: "",
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
            <h2 className="text-lg font-semibold text-card-foreground">Add a New User</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Create a new user's profile</p>
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

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-card-foreground mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full h-11 px-3 pr-10 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
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
            disabled={loading || !formData.username || !formData.email || !formData.password || formData.password.length < 6}
            className="h-10 px-5 rounded-lg bg-beshaped-dark-green text-white text-xs font-medium hover:bg-beshaped-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding..." : "Add Client"}
          </button>
        </div>
      </div>
    </div>
  );
}
