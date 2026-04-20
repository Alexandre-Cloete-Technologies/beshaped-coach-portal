"use client";

import { BookOpen, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ProgramItem {
  id: string;
  name: string;
}

interface ClientProgramsProps {
  clientId: string;
}

export default function ClientPrograms({ clientId }: ClientProgramsProps) {
  const [availablePrograms, setAvailablePrograms] = useState<ProgramItem[]>([]);
  const [allPrograms, setAllPrograms] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState("");

  const fetchData = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const userRef = doc(db, "users", clientId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setAvailablePrograms([]);
        setAllPrograms([]);
        return;
      }

      const data = userSnap.data();
      const availableRefs = data?.availablePrograms ?? [];

      // Resolve each ref to get program id and name
      const resolved: ProgramItem[] = [];
      for (const ref of availableRefs) {
        if (ref?.path) {
          try {
            const programSnap = await getDoc(ref);
            if (programSnap.exists()) {
              const programData = programSnap.data() as { name?: string };
              resolved.push({
                id: programSnap.id,
                name: programData?.name || "Unnamed Program",
              });
            }
          } catch (err) {
            console.error("Error resolving program ref:", err);
          }
        }
      }

      setAvailablePrograms(resolved);

      // Fetch all programs for the Add dropdown
      const programsSnapshot = await getDocs(collection(db, "programs"));
      const all: ProgramItem[] = programsSnapshot.docs.map((d) => ({
        id: d.id,
        name: d.data().name || "Unnamed Program",
      }));
      setAllPrograms(all);
    } catch (err) {
      console.error("Error fetching client programs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const programsToAdd = allPrograms.filter(
    (p) => !availablePrograms.some((ap) => ap.id === p.id)
  );

  const handleAdd = async () => {
    if (!selectedProgramId || !clientId) return;

    const program = allPrograms.find((p) => p.id === selectedProgramId);
    if (!program) return;

    try {
      setAdding(true);
      const userRef = doc(db, "users", clientId);
      const programRef = doc(db, "programs", selectedProgramId);
      await updateDoc(userRef, {
        availablePrograms: arrayUnion(programRef),
      });
      setAvailablePrograms((prev) => [...prev, program]);
      setSelectedProgramId("");
    } catch (err) {
      console.error("Error adding program:", err);
      alert("Failed to add program. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (programId: string) => {
    if (!clientId) return;

    try {
      setRemovingId(programId);
      const userRef = doc(db, "users", clientId);
      const programRef = doc(db, "programs", programId);
      await updateDoc(userRef, {
        availablePrograms: arrayRemove(programRef),
      });
      setAvailablePrograms((prev) => prev.filter((p) => p.id !== programId));
    } catch (err) {
      console.error("Error removing program:", err);
      alert("Failed to remove program. Please try again.");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Loading programs...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-muted-foreground" />
          Available Programs
        </h2>
        {programsToAdd.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
            >
              <option value="">Select a program to add</option>
              {programsToAdd.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={!selectedProgramId || adding}
              className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        )}
      </div>

      {availablePrograms.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground mb-4">No programs assigned yet</p>
          {programsToAdd.length > 0 ? (
            <div className="flex justify-center gap-2">
              <select
                value={selectedProgramId}
                onChange={(e) => setSelectedProgramId(e.target.value)}
                className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[200px]"
              >
                <option value="">Select a program</option>
                {programsToAdd.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedProgramId || adding}
                className="h-10 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {adding ? "Adding..." : "Add Program"}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All programs have been assigned to this client
            </p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {availablePrograms.map((program) => (
            <li
              key={program.id}
              className="flex items-center justify-between py-3 px-4 rounded-lg border border-border bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <span className="font-medium text-foreground">{program.name}</span>
              <button
                onClick={() => handleRemove(program.id)}
                disabled={removingId === program.id}
                className="h-8 px-3 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                aria-label={`Remove ${program.name}`}
              >
                <Trash2 className="w-4 h-4" />
                {removingId === program.id ? "Removing..." : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
