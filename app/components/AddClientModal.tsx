"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, addDoc, Timestamp, getDocs, doc, query, where, getDoc } from "firebase/firestore";
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
      const userDocRef = await addDoc(collection(db, "users"), {
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

      // If a program was selected, create a userPrograms entry (only if none exists)
      if (formData.currentProgram) {
        const newUserRef = doc(db, "users", userDocRef.id);
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

          const now = Timestamp.now();
          const estimatedEnd = new Date();
          estimatedEnd.setDate(estimatedEnd.getDate() + totalDurationWeeks * 7);

          await addDoc(collection(db, "userPrograms"), {
            userId: newUserRef,
            programId: programRef,
            programName: selectedProgramObj?.name || programData?.name || "Unknown Program",
            status: "active",
            availablePrograms: [],
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
            totalWorkoutsInProgram: 0,
            phasesCompleted: [],

            notes: null,
            trainerNotes: null,
          });

          // Create a workoutLog for the first non-rest workout in the program
          const phases = programData?.phases || [];
          if (phases.length > 0) {
            const firstPhase = phases[0];
            const workouts = firstPhase.workouts || firstPhase.days || [];
            const firstWorkout = workouts.find(
              (w: any) => !w.isRestDay && w.type !== "rest" && w.type !== "empty"
            );

            if (firstWorkout) {
              const rawExercises = firstWorkout.exercises || [];
              const exercises = rawExercises.map((ex: any, idx: number) => ({
                exerciseId: ex.exerciseId || ex.id || "",
                exerciseName: ex.exerciseName || ex.name || "Unknown Exercise",
                order: ex.order ?? idx + 1,
                targetSets: ex.sets || 0,
                targetReps: ex.repsRange || "",
                restPeriod: ex.restPeriod || "",
                personalBest: false,
                notes: ex.notes || null,
                sets: Array.from({ length: ex.sets || 0 }, (_, i) => ({
                  setNumber: i + 1,
                  weight: 0,
                  weightUnit: "kg",
                  reps: 0,
                  completed: false,
                  rpe: null,
                  timestamp: null,
                  notes: null,
                })),
              }));

              const programName = selectedProgramObj?.name || programData?.name || "Unknown Program";

              await addDoc(collection(db, "workoutLogs"), {
                dateCompleted: null,
                userId: userDocRef.id,
                programId: programRef,
                programName,
                phaseNumber: 1,
                workoutName: firstWorkout.workoutName || firstWorkout.label || "Workout 1",
                dayNumber: firstWorkout.dayNumber || 1,
                weekNumber: 1,
                startedAt: now,
                completedAt: null,
                totalDuration: null,
                status: "in-progress",
                exercises,
                totalVolume: 0,
                totalSets: 0,
                totalReps: 0,
                personalBests: [],
                notes: null,
              });
            }
          }
        }
      }

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
