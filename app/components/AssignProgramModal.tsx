"use client";

import { X, Users, BookOpen, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, addDoc, query, where, Timestamp, getDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildProgramWorkoutSlots, seedMissingWorkoutLogsForUserProgram } from "@/lib/workoutLogSeed";

interface AssignProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: () => void;
}

interface UserOption {
  id: string;
  name: string;
  currentProgram?: string;
}

interface ProgramOption {
  id: string;
  name: string;
}

export default function AssignProgramModal({ isOpen, onClose, onAssigned }: AssignProgramModalProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [programs, setPrograms] = useState<ProgramOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedProgramId, setSelectedProgramId] = useState("");

  // Fetch users and programs when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;

      try {
        setLoadingData(true);
        const [usersSnapshot, programsSnapshot] = await Promise.all([
          getDocs(collection(db, "users")),
          getDocs(collection(db, "programs")),
        ]);

        // Build a program name lookup from fetched programs
        const programNameMap: Record<string, string> = {};
        programsSnapshot.docs.forEach((d) => {
          programNameMap[d.id] = d.data().name || "Unnamed Program";
        });

        const fetchedUsers: UserOption[] = usersSnapshot.docs.map((d) => {
          const data = d.data();
          let currentProgram: string | undefined;

          if (data.currentProgram) {
            if (typeof data.currentProgram === "string" && data.currentProgram !== "No Program") {
              // Legacy string value
              currentProgram = data.currentProgram;
            } else if (data.currentProgram?.id) {
              // Firestore DocumentReference — resolve name from programs
              currentProgram = programNameMap[data.currentProgram.id] || data.currentProgram.id;
            }
          }

          return {
            id: d.id,
            name: data.displayName || data.username || data.email || "Unknown User",
            currentProgram,
          };
        });

        const fetchedPrograms: ProgramOption[] = programsSnapshot.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Unnamed Program",
        }));

        setUsers(fetchedUsers);
        setPrograms(fetchedPrograms);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Derive warning for the selected user
  const selectedUser = users.find((u) => u.id === selectedUserId);
  const hasExistingProgram = !!selectedUser?.currentProgram;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedProgramId) return;

    const selectedProgram = programs.find((p) => p.id === selectedProgramId);
    if (!selectedProgram) return;

    try {
      setLoading(true);
      const userRef = doc(db, "users", selectedUserId);
      const programRef = doc(db, "programs", selectedProgramId);
      await updateDoc(userRef, {
        currentProgram: programRef,
        availablePrograms: arrayUnion(programRef),
      });

      // Check if a userPrograms doc already exists for this user
      const userProgramsQuery = query(
        collection(db, "userPrograms"),
        where("userId", "==", userRef)
      );
      const existingDocs = await getDocs(userProgramsQuery);

      // Only create a userPrograms entry on FIRST-TIME assignment
      if (existingDocs.empty) {
        // Fetch program doc to get extra details
        const programSnap = await getDoc(programRef);
        const programData = programSnap.data();
        const totalDurationWeeks = programData?.totalDuration || programData?.phases?.length * 4 || 8;
        const workoutSlots = buildProgramWorkoutSlots(programData);

        const now = Timestamp.now();
        const estimatedEnd = new Date();
        estimatedEnd.setDate(estimatedEnd.getDate() + totalDurationWeeks * 7);

        await addDoc(collection(db, "userPrograms"), {
          userId: userRef,
          programId: programRef,
          programName: selectedProgram.name,
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

        await seedMissingWorkoutLogsForUserProgram({
          userId: selectedUserId,
          programRef,
          programName: selectedProgram.name,
          slots: workoutSlots,
          startedAt: now,
        });
      }

      // Reset selections
      setSelectedUserId("");
      setSelectedProgramId("");

      if (onAssigned) {
        onAssigned();
      }

      onClose();
    } catch (error) {
      console.error("Error assigning program:", error);
      alert("Failed to assign program. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">Assign Program</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Assign a training program to a user</p>
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
          <div className="space-y-5">
            {/* User Select */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-card-foreground mb-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                User *
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={loadingData}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
              >
                <option value="">{loadingData ? "Loading users..." : "Select a User"}</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>

              {/* Warning if user already has a program */}
              {hasExistingProgram && (
                <div className="flex items-start gap-2.5 mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <span className="font-semibold">{selectedUser?.name}</span> is already assigned to{" "}
                    <span className="font-semibold">{selectedUser?.currentProgram}</span>.
                    Assigning a new program will replace the current one.
                  </p>
                </div>
              )}
            </div>

            {/* Program Select */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-card-foreground mb-2">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                Program *
              </label>
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                disabled={loadingData}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all appearance-none"
              >
                <option value="">{loadingData ? "Loading programs..." : "Select a Program"}</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-border bg-background text-xs text-card-foreground font-medium hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedUserId || !selectedProgramId}
            className="h-10 px-5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Assigning..." : "Assign Program"}
          </button>
        </div>
      </div>
    </div>
  );
}
