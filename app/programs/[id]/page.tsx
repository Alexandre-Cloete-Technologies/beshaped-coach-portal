"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import Navbar from "../../components/Navbar";
import ProgramBuilder from "../components/ProgramBuilder";
import {
  normalizeInitialProgram,
  toFirestorePayload,
  type ProgramFormData,
} from "../lib/useProgramEditor";
import { syncWorkoutLogsForProgramChange } from "../lib/workoutLogSync";

export default function ProgramDetailPage() {
  const params = useParams();
  const programId = (params?.id as string) || "";

  const [program, setProgram] = useState<ProgramFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // When the route id changes, clear immediately so we never show ProgramBuilder
  // with the previous program's data (or a mismatched id) while a new doc loads.
  useLayoutEffect(() => {
    if (!programId) return;
    setProgram(null);
    setError(null);
    setLoading(true);
  }, [programId]);

  useEffect(() => {
    const fetchProgram = async () => {
      if (!programId) return;

      try {
        setLoading(true);
        const programDoc = await getDoc(doc(db, "programs", programId));

        if (programDoc.exists()) {
          const data = programDoc.data() as Record<string, unknown>;
          const parsed = normalizeInitialProgram({
            id: programDoc.id,
            name: (data.name as string) || "Untitled Program",
            description: (data.description as string) || "",
            accessType:
              (data.accessType as ProgramFormData["accessType"]) || "free",
            price: (data.price as number | null) ?? null,
            phases: Array.isArray(data.phases)
              ? (data.phases as ProgramFormData["phases"])
              : [],
          });

          setProgram(parsed);
          setError(null);
        } else {
          setError("Program not found");
        }
      } catch (err) {
        console.error("Error fetching program:", err);
        setError("Failed to load program");
      } finally {
        setLoading(false);
      }
    };

    fetchProgram();
  }, [programId]);

  const handleSave = async (data: ProgramFormData) => {
    if (!programId || !program) return;
    try {
      setSaving(true);
      const previousProgram = program;
      const programRef = doc(db, "programs", programId);

      await updateDoc(programRef, toFirestorePayload(data));

      await syncWorkoutLogsForProgramChange(previousProgram, data, programRef);

      setProgram(data);
    } catch (err) {
      console.error("Error saving program:", err);
      alert("Failed to save program. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <main className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading program...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Navbar />
        <main className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || "Program not found"}</p>
            <Link
              href="/programs"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Programs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <ProgramBuilder
      key={programId}
      initialProgram={program}
      saving={saving}
      submitLabel="Save Changes"
      backHref="/programs"
      onSave={handleSave}
    />
  );
}
