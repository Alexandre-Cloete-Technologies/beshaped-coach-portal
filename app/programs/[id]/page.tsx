"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, AlertCircle, X } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { useSignedInCoach } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";
import Navbar from "../../components/Navbar";
import ProgramBuilder from "../components/ProgramBuilder";
import {
  normalizeInitialProgram,
  toFirestorePayload,
  type ProgramFormData,
} from "../lib/useProgramEditor";
import { syncWorkoutLogsForProgramChange } from "../lib/workoutLogSync";

export default function ProgramDetailPage() {
  const { uid, role } = useSignedInCoach();
  const params = useParams();
  const programId = (params?.id as string) || "";

  const [program, setProgram] = useState<ProgramFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  useEffect(() => {
    if (!saveToast) return;
    const duration = saveToast.type === "error" ? 7000 : 4500;
    const t = setTimeout(() => setSaveToast(null), duration);
    return () => clearTimeout(t);
  }, [saveToast]);

  const handleSave = async (data: ProgramFormData) => {
    if (!programId) {
      setSaveToast({
        type: "error",
        message: "Cannot save: missing program id. Try refreshing the page.",
      });
      return;
    }
    if (!program) {
      setSaveToast({
        type: "error",
        message: "Program data is not loaded. Try refreshing the page.",
      });
      return;
    }
    try {
      setSaving(true);
      const previousProgram = program;
      const programRef = doc(db, "programs", programId);

      await updateDoc(programRef, toFirestorePayload(data));

      await syncWorkoutLogsForProgramChange(previousProgram, data, programRef, { uid, role });

      setProgram(data);
      setSaveToast({
        type: "success",
        message: "Program saved successfully.",
      });
    } catch (err) {
      console.error("Error saving program:", err);
      const message =
        err instanceof Error && err.message.trim().length > 0
          ? err.message
          : "Failed to save program. Please try again.";
      setSaveToast({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main
          className="flex flex-1 flex-col items-center justify-center px-4 py-12"
          aria-busy
          aria-label="Loading program"
        >
          <div className="max-w-sm text-center">
            <div
              className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-2 border-muted border-t-primary"
              role="status"
            />
            <h2 className="text-lg font-semibold text-foreground">
              Loading program
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Fetching your program from the library…
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
          <div className="max-w-md text-center">
            <h2 className="text-lg font-semibold text-foreground">
              Can&apos;t load program
            </h2>
            <p className="mt-2 text-sm text-destructive">{error || "Program not found"}</p>
            <Link
              href="/programs"
              className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
            >
              ← Back to programs
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <ProgramBuilder
        key={programId}
        initialProgram={program}
        saving={saving}
        submitLabel="Save Changes"
        backHref="/programs"
        onSave={handleSave}
        defaultExpandAllPhases
      />

      {saveToast && (
        <div
          role="alert"
          className={cn(
            "fixed bottom-6 right-6 z-[100] flex max-w-md items-start gap-3 rounded-lg border px-4 py-3 shadow-lg animate-in fade-in duration-200",
            saveToast.type === "success"
              ? "border-beshaped-dark-green/80 bg-card text-foreground"
              : "border-destructive/60 bg-destructive/10 text-foreground"
          )}
        >
          {saveToast.type === "success" ? (
            <CheckCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-beshaped-dark-green"
              aria-hidden
            />
          ) : (
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
              aria-hidden
            />
          )}
          <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
            {saveToast.message}
          </p>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
