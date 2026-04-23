"use client";

import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import ProgramBuilder from "../components/ProgramBuilder";
import {
  toFirestorePayload,
  type ProgramFormData,
} from "../lib/useProgramEditor";

const PROGRAM_BUILDER_DRAFT_KEY = "program-builder-draft";

export default function ProgramBuilderPage() {
  const router = useRouter();

  const handleSave = async (data: ProgramFormData) => {
    try {
      await addDoc(collection(db, "programs"), {
        ...toFirestorePayload(data),
        daysPerWeek: 7,
        difficulty: "intermediate",
        coverImage: "",
        createdBy: "coach",
        createdAt: serverTimestamp(),
        isActive: true,
        assignedTo: [],
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem(PROGRAM_BUILDER_DRAFT_KEY);
      }
      router.push("/programs");
    } catch (error) {
      console.error("Error saving program:", error);
      alert("Failed to save program. Please try again.");
    }
  };

  return (
    <ProgramBuilder
      headerVariant="aside"
      isEditing
      draftKey={PROGRAM_BUILDER_DRAFT_KEY}
      showClearButton
      submitLabel="Save"
      backHref="/programs"
      onSave={handleSave}
    />
  );
}
