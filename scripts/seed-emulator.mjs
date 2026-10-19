/**
 * Emulator-only seed for testing coach-portal login and scoping (BSF-71).
 *
 * Creates two coaches, one admin, clients for each coach, one client-only account (no role claim),
 * a few unassigned/legacy clients, programs, userPrograms and logs. Safe to re-run: fixed IDs,
 * overwritten each time. Logs and links use the 2026-10-19 shapes (workoutLogs data contract): id strings
 * for userId/programId, program log ids by workoutLogId(), timeStartedAt/timeCompletedAt.
 *
 * Refuses to run unless both emulator hosts are set, so it can never write to a real project:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 npm run seed:emulator
 */
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const PROJECT_ID = "demo-beshaped"; // matches beshaped-backend/.firebaserc "default"
// Test-only password for every seeded account. Emulator data only.
const TEST_PASSWORD = "beshaped-test-1";

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    "Refusing to run: set FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST to the local emulators."
  );
  process.exit(1);
}
// Never pick up a real service account, even by accident.
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

const app = initializeApp({ projectId: PROJECT_ID });
const auth = getAuth(app);
const db = getFirestore(app);

const now = Timestamp.now();
const daysAgo = (n) => Timestamp.fromMillis(Date.now() - n * 24 * 60 * 60 * 1000);
const dateKey = (ts) => ts.toDate().toISOString().slice(0, 10);

async function upsertAuthUser({ uid, email, displayName, role }) {
  try {
    await auth.updateUser(uid, { email, displayName, password: TEST_PASSWORD });
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    await auth.createUser({ uid, email, displayName, password: TEST_PASSWORD });
  }
  await auth.setCustomUserClaims(uid, role ? { role } : null);
}

// --- Accounts -------------------------------------------------------------------------------
const staff = [
  { uid: "coach-a", email: "coach-a@beshaped.test", displayName: "Coach Anna", role: "coach" },
  { uid: "coach-b", email: "coach-b@beshaped.test", displayName: "Coach Ben", role: "coach" },
  { uid: "admin", email: "admin@beshaped.test", displayName: "Admin Dewald", role: "admin" },
];

// Coach A gets 17 clients.
const clients = [
  ...Array.from({ length: 17 }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    return { uid: `client-a-${n}`, displayName: `Anna Client ${n}`, assignedCoachId: "coach-a" };
  }),
  { uid: "client-b-01", displayName: "Ben Client 01", assignedCoachId: "coach-b" },
  { uid: "client-b-02", displayName: "Ben Client 02", assignedCoachId: "coach-b" },
  // Data shapes seen before BSF-71: only an admin should see these.
  { uid: "client-unassigned", displayName: "Unassigned Client", assignedCoachId: undefined },
  { uid: "client-legacy-name", displayName: "Legacy Name Client", assignedCoachId: "Dewald" },
  {
    uid: "client-legacy-ref",
    displayName: "Legacy Ref Client",
    assignedCoachId: db.doc("users/coach-a"),
  },
];
// A real client of Coach A with no role claim: can use the mobile app, must be refused by the portal.
const clientOnly = {
  uid: "client-only",
  email: "client-only@beshaped.test",
  displayName: "Client Only",
  assignedCoachId: "coach-a",
};

// --- Catalogue ------------------------------------------------------------------------------
const exercises = [
  { id: "ex-squat", name: "Back Squat", muscleGroup: "Legs" },
  { id: "ex-bench", name: "Bench Press", muscleGroup: "Chest" },
  { id: "ex-row", name: "Barbell Row", muscleGroup: "Back" },
];

function programWorkout(weekNumber, dayNumber, workoutName, exerciseIds) {
  return {
    dayNumber,
    weekNumber,
    workoutName,
    isRestDay: false,
    workoutId: null,
    exercises: exerciseIds.map((exerciseId, order) => ({
      exerciseId,
      exerciseName: exercises.find((e) => e.id === exerciseId).name,
      musclesInvolved: [],
      order,
      sets: 3,
      repsRange: "8-10",
      restPeriod: "90s",
      notes: null,
    })),
  };
}

// A phase as the builder stores it: durationWeeks × 7 days, empty days included (useProgramEditor.ts).
function phaseWorkouts(durationWeeks, workouts) {
  return Array.from({ length: durationWeeks * 7 }, (_, i) => {
    const weekNumber = Math.floor(i / 7) + 1;
    const dayNumber = (i % 7) + 1;
    return (
      workouts.find((w) => w.weekNumber === weekNumber && w.dayNumber === dayNumber) ?? {
        dayNumber, weekNumber, isRestDay: false, workoutId: null, workoutName: null, exercises: [],
      }
    );
  });
}

const programs = [
  {
    id: "prog-strength",
    name: "Strength Foundations",
    accessType: "assigned",
    durationWeeks: 2,
    workouts: [
      programWorkout(1, 1, "Lower", ["ex-squat"]),
      programWorkout(1, 2, "Upper", ["ex-bench", "ex-row"]),
      programWorkout(2, 1, "Lower B", ["ex-squat"]),
      programWorkout(2, 2, "Upper B", ["ex-bench", "ex-row"]),
    ],
  },
  {
    id: "prog-free",
    name: "Free Starter Plan",
    accessType: "free",
    durationWeeks: 1,
    workouts: [programWorkout(1, 1, "Full Body", ["ex-squat", "ex-bench"])],
  },
];

// Same rule as lib/workoutLogSeed.ts (workoutLogId) and the app's lib/workout-logs.ts.
const workoutLogId = (userId, programId, w) => `${userId}_${programId}_r1_p1w${w.weekNumber}d${w.dayNumber}`;

const logExercises = (w, done) =>
  w.exercises.map((ex) => ({
    exerciseId: ex.exerciseId,
    exerciseName: ex.exerciseName,
    order: ex.order,
    targetSets: ex.sets,
    targetReps: ex.repsRange,
    restPeriod: ex.restPeriod,
    notes: null,
    sets: [1, 2, 3].map((setNumber) =>
      done
        ? { setNumber, weight: 60, reps: 8, completed: true, timestamp: null, notes: null }
        : { setNumber, weight: 0, reps: 0, completed: false, timestamp: null, notes: null }
    ),
  }));

async function seed() {
  for (const s of staff) {
    await upsertAuthUser(s);
    await db.doc(`users/${s.uid}`).set({
      displayName: s.displayName,
      username: s.displayName,
      email: s.email,
      role: s.role,
      createdAt: now,
    });
  }

  for (const e of exercises) {
    await db.doc(`exercises/${e.id}`).set({
      name: e.name,
      muscleGroup: e.muscleGroup,
      description: "",
      primaryMuscles: [e.muscleGroup],
      secondaryMuscles: [],
      createdBy: "admin",
      createdAt: now,
    });
  }

  for (const p of programs) {
    await db.doc(`programs/${p.id}`).set({
      name: p.name,
      description: `${p.name} (seed)`,
      accessType: p.accessType,
      price: null,
      difficulty: "beginner",
      totalDuration: p.durationWeeks,
      daysPerWeek: p.workouts.filter((w) => w.weekNumber === 1).length,
      isActive: true,
      createdBy: "admin",
      createdAt: now,
      phases: [
        {
          phaseId: `${p.id}-phase-1`,
          name: "Phase 1",
          description: "",
          order: 0,
          durationWeeks: p.durationWeeks,
          focusAreas: [],
          workouts: phaseWorkouts(p.durationWeeks, p.workouts),
        },
      ],
    });
  }

  await db.doc("workouts/wo-push").set({
    name: "Push Day",
    description: null,
    createdBy: "coach-a",
    createdByRole: "coach",
    exercises: [{ exerciseId: "ex-bench", exerciseName: "Bench Press", order: 0, targetSets: 3, targetReps: "8-10" }],
    tags: ["push"],
    estimatedDuration: 45,
    createdAt: now,
    updatedAt: now,
  });

  await upsertAuthUser({ ...clientOnly, role: null });
  const allClients = [...clients, clientOnly];

  for (const [i, c] of allClients.entries()) {
    const email = c.email ?? `${c.uid}@beshaped.test`;
    if (!c.email) await upsertAuthUser({ uid: c.uid, email, displayName: c.displayName, role: null });

    const program = programs[i % 2 === 0 ? 0 : 1];
    const programRef = db.doc(`programs/${program.id}`);
    const userRef = db.doc(`users/${c.uid}`);

    const userDoc = {
      displayName: c.displayName,
      username: c.displayName,
      email,
      role: "client",
      goals: "Get stronger",
      profilePhoto: "",
      currentProgram: programRef,
      availablePrograms: [programRef],
      createdAt: daysAgo(30),
      lastActive: now,
    };
    if (c.assignedCoachId !== undefined) userDoc.assignedCoachId = c.assignedCoachId;
    await userRef.set(userDoc);

    await db.doc(`userPrograms/up-${c.uid}`).set({
      userId: c.uid,
      programId: program.id,
      programName: program.name,
      status: "active",
      currentPhase: 1,
      currentWeek: 1,
      currentDay: 2,
      totalWorkoutsCompleted: 1,
      totalWorkoutsInProgram: program.workouts.length,
      createdAt: daysAgo(14),
    });

    // As the portal seeds them: one log per program day, the first one completed, the rest scheduled.
    for (const [k, w] of program.workouts.entries()) {
      const done = k === 0;
      const sets = done ? 3 * w.exercises.length : 0;
      await db.doc(`workoutLogs/${workoutLogId(c.uid, program.id, w)}`).set({
        userId: c.uid,
        sourceType: "program",
        programId: program.id,
        programName: program.name,
        round: 1,
        phaseNumber: 1,
        weekNumber: w.weekNumber,
        dayNumber: w.dayNumber,
        workoutName: w.workoutName,
        status: done ? "completed" : "to-be-completed",
        timeStartedAt: done ? daysAgo(2) : null,
        timeCompletedAt: done ? daysAgo(2) : null,
        dateCompleted: done ? daysAgo(2) : null,
        totalDuration: done ? 3600 : null,
        exercises: logExercises(w, done),
        totalVolume: done ? 480 * sets : 0,
        totalSets: sets,
        totalReps: done ? 8 * sets : 0,
        personalBests: [],
        notes: null,
      });
    }

    const eatenAt = daysAgo(0);
    await db.doc(`nutritionLogs/nl-${c.uid}`).set({
      userId: c.uid,
      meal: "lunch",
      eatenAt,
      date: dateKey(eatenAt),
      notes: `Seed lunch for ${c.displayName}`,
      photoUrl: "",
      storagePath: "",
      createdAt: eatenAt,
      updatedAt: eatenAt,
    });

    for (const [j, weight] of [80 + (i % 5), 79 + (i % 5)].entries()) {
      const taken = daysAgo(7 - j * 7);
      await db.doc(`bodyWeightLogs/bw-${c.uid}-${j}`).set({
        userId: c.uid,
        weight,
        weightUnit: "kg",
        dateOfBodyWeightRecord: taken,
        photoTakenDate: taken,
        notes: null,
        createdAt: taken,
      });
    }
  }

  console.log(
    `Seeded ${staff.length} staff, ${allClients.length} clients (${clients.filter((c) => c.assignedCoachId === "coach-a").length + 1} for coach-a), ` +
      `${programs.length} programs into ${PROJECT_ID}. Password for every account: see TEST_PASSWORD in this file.`
  );
}

seed().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
