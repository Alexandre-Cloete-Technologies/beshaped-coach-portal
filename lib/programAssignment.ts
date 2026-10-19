import { addDoc, collection, doc, getDoc, getDocs, limit, query, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { buildProgramWorkoutSlots, seedMissingWorkoutLogsForUserProgram } from "@/lib/workoutLogSeed";

/**
 * Gives a client a program's `userPrograms` doc (if they have none for it yet) and a scheduled workoutLog for every
 * program day they have no log for. Re-assigning the same program keeps their logs and progress and only adds
 * missing days (workoutLogs data contract, 2026-10-19). The caller writes users.currentProgram / availablePrograms.
 */
export async function assignProgramToClient(
  userId: string,
  programId: string,
  listedName?: string
): Promise<void> {
  const programSnap = await getDoc(doc(db, "programs", programId));
  const programData = programSnap.data();
  const programName = listedName || programData?.name || "Unknown Program";
  const workoutSlots = buildProgramWorkoutSlots(programData);

  const existingUserPrograms = await getDocs(
    query(
      collection(db, "userPrograms"),
      where("userId", "==", userId),
      where("programId", "==", programId),
      limit(1)
    )
  );

  if (existingUserPrograms.empty) {
    const totalDurationWeeks = programData?.totalDuration || programData?.phases?.length * 4 || 8;
    const now = Timestamp.now();
    const estimatedEnd = new Date();
    estimatedEnd.setDate(estimatedEnd.getDate() + totalDurationWeeks * 7);

    await addDoc(collection(db, "userPrograms"), {
      userId,
      programId,
      programName,
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
  }

  await seedMissingWorkoutLogsForUserProgram({ userId, programId, programName, slots: workoutSlots });
}
