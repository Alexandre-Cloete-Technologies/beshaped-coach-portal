/** Exercise row from Firestore / library, normalized for workout UIs. */
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  musclesInvolved?: string[];
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const muscleGroupOrder = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Core",
  "Full Body",
  "Cardio",
  "Other",
];

export const muscleToCategory: Record<string, string> = {
  chest: "Chest",
  pectorals: "Chest",
  pecs: "Chest",
  "upper chest": "Chest",
  "lower chest": "Chest",
  back: "Back",
  lats: "Back",
  "latissimus dorsi": "Back",
  rhomboids: "Back",
  traps: "Back",
  trapezius: "Back",
  "lower back": "Back",
  "erector spinae": "Back",
  "rear delts": "Back",
  "upper back": "Back",
  "mid back": "Back",
  shoulders: "Shoulders",
  delts: "Shoulders",
  deltoids: "Shoulders",
  "front delts": "Shoulders",
  "side delts": "Shoulders",
  "lateral delts": "Shoulders",
  "anterior deltoid": "Shoulders",
  "posterior deltoid": "Shoulders",
  "rotator cuff": "Shoulders",
  arms: "Arms",
  biceps: "Arms",
  triceps: "Arms",
  forearms: "Arms",
  brachialis: "Arms",
  bicep: "Arms",
  tricep: "Arms",
  forearm: "Arms",
  wrists: "Arms",
  legs: "Legs",
  quads: "Legs",
  quadriceps: "Legs",
  hamstrings: "Legs",
  glutes: "Legs",
  gluteus: "Legs",
  calves: "Legs",
  calf: "Legs",
  "hip flexors": "Legs",
  adductors: "Legs",
  abductors: "Legs",
  thighs: "Legs",
  "lower body": "Legs",
  core: "Core",
  abs: "Core",
  abdominals: "Core",
  obliques: "Core",
  "lower abs": "Core",
  "upper abs": "Core",
  "transverse abdominis": "Core",
  hip: "Core",
  pelvis: "Core",
  "full body": "Full Body",
  compound: "Full Body",
  "total body": "Full Body",
  "whole body": "Full Body",
  cardio: "Cardio",
  cardiovascular: "Cardio",
  heart: "Cardio",
  conditioning: "Cardio",
  endurance: "Cardio",
};

export function getCategoryFromMuscle(muscle: string): string {
  if (!muscle) return "Other";
  const normalized = muscle.toLowerCase().trim();
  if (muscleToCategory[normalized]) return muscleToCategory[normalized];
  for (const [key, category] of Object.entries(muscleToCategory)) {
    if (normalized.includes(key) || key.includes(normalized)) return category;
  }
  for (const category of muscleGroupOrder) {
    if (normalized.includes(category.toLowerCase())) return category;
  }
  return "Other";
}
