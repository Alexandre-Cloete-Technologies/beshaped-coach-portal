"use client";

import { Plus } from "lucide-react";
import Sidebar from "./components/Sidebar";
import StatsCard from "./components/StatsCard";
import SearchBar from "./components/SearchBar";
import ClientCard, { ClientData } from "./components/ClientCard";
import Pagination from "./components/Pagination";
import AddClientModal from "./components/AddClientModal";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


// Mock client data
const mockClients: ClientData[] = [
  {
    id: "1",
    name: "Tom Holland",
    photo: "/avatars/tom.jpg",
    avatarGradient: "bg-gradient-to-br from-blue-500 to-indigo-600",
    currentProgram: "Hypertrophy",
    week: 8,
    totalWeeks: 12,
    compliance: 92,
    totalWorkouts: 25,
    completedWorkouts: 23,
    weight: 82.5,
    weightChange: -1,
    lastWorkout: "Today",
    status: "high",
    todayWorkout: {
      name: "Upper Body Push",
      exercisesCompleted: 6,
      totalExercises: 8,
    },
    nextWorkout: "Leg Day",
    goals: "Gain 5kg lean muscle mass",
  },
  {
    id: "2",
    name: "Sarah Miller",
    photo: "/avatars/sarah.jpg",
    avatarGradient: "bg-gradient-to-br from-rose-400 to-pink-600",
    currentProgram: "Weight Loss",
    week: 3,
    totalWeeks: 8,
    compliance: 45,
    totalWorkouts: 20,
    completedWorkouts: 9,
    weight: 66,
    weightChange: -1.5,
    lastWorkout: "4 days ago",
    status: "low",
    nextWorkout: "Cardio HIIT",
    goals: "Lose 10kg & improve cardio",
  },
  {
    id: "3",
    name: "David Chen",
    photo: "/avatars/david.jpg",
    avatarGradient: "bg-gradient-to-br from-amber-400 to-orange-600",
    currentProgram: "Strength",
    week: 12,
    totalWeeks: 16,
    compliance: 78,
    totalWorkouts: 24,
    completedWorkouts: 19,
    weight: 88.5,
    weightChange: 1.5,
    lastWorkout: "Yesterday",
    status: "medium",
    nextWorkout: "Rest Day",
    goals: "Deadlift 200kg, back squat 180kg",
  },
  {
    id: "4",
    name: "Anna Smith",
    photo: "/avatars/anna.jpg",
    avatarGradient: "bg-gradient-to-br from-emerald-400 to-teal-600",
    currentProgram: "Mobility",
    week: 1,
    totalWeeks: 6,
    compliance: 100,
    totalWorkouts: 4,
    completedWorkouts: 4,
    weight: 58,
    weightChange: 0,
    lastWorkout: "Today",
    status: "perfect",
    todayWorkout: {
      name: "Yoga Flow",
      exercisesCompleted: 8,
      totalExercises: 8,
    },
    nextWorkout: "Yoga Flow",
    goals: "Touch toes & full splits",
  },
  {
    id: "5",
    name: "Jessica Lee",
    photo: "/avatars/jessica.jpg",
    avatarGradient: "bg-gradient-to-br from-violet-400 to-purple-600",
    currentProgram: "CrossFit",
    week: 5,
    totalWeeks: 10,
    compliance: 85,
    totalWorkouts: 20,
    completedWorkouts: 17,
    weight: 68,
    weightChange: -0.5,
    lastWorkout: "Today",
    status: "high",
    todayWorkout: {
      name: "Power Clean",
      exercisesCompleted: 5,
      totalExercises: 7,
    },
    nextWorkout: "Power Clean",
    goals: "Compete in CrossFit Open 2024",
  },
  {
    id: "6",
    name: "Mark Evans",
    photo: "/avatars/mark.jpg",
    avatarGradient: "bg-gradient-to-br from-slate-400 to-slate-600",
    currentProgram: "Rehab",
    week: 2,
    totalWeeks: 8,
    compliance: 20,
    totalWorkouts: 10,
    completedWorkouts: 2,
    weight: 90,
    weightChange: 1,
    lastWorkout: "7 days ago",
    status: "critical",
    nextWorkout: "Physical Therapy",
    goals: "Full recovery from knee injury",
  },
];

export default function Home() {
  const [clients, setClients] = useState<ClientData[]>(mockClients);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const populateBodyWeightLogs = async () => {
    try {
      setIsPopulating(true);
      
      const bodyWeightLogsCollection = collection(db, "bodyWeightLogs");
      
      // Get some users to create references
      const usersSnapshot = await getDocs(collection(db, "users"));
      
      if (usersSnapshot.empty) {
        alert("Please create some users first!");
        return;
      }
      
      const userDocs = usersSnapshot.docs;
      const { addDoc, Timestamp } = await import("firebase/firestore");
      
      // Create sample weight logs for multiple users over time
      const sampleBodyWeightLogs = [];
      
      // For first user - progressive weight loss journey
      for (let i = 0; i < 5; i++) {
        const date = new Date(Date.now() - (30 * i) * 24 * 60 * 60 * 1000);
        sampleBodyWeightLogs.push({
          userId: userDocs[0].ref,
          photoTakenDate: date,
          weight: 85 - (i * 1.5),
          weightUnit: "kg" as const,
          photos: i === 0 || i === 4 ? [{
            url: `https://example.com/photo${i}.jpg`,
            dateTaken: date.toISOString().split('T')[0], // "YYYY-MM-DD"
            timestampTaken: Timestamp.fromDate(date),
            notes: i === 0 ? "Initial starting point" : "Check-in photo",
            type: "front" as const
          }] : [],
          notes: i === 0 ? "Starting my fitness journey!" : i === 4 ? "Feeling great!" : null,
          measurements: {
            waist: 95 - (i * 2),
            chest: 105 - (i * 1),
            hips: 100 - (i * 1.5),
            arms: 35 - (i * 0.5),
            unit: "cm" as const,
          },
          createdAt: Timestamp.fromDate(date),
        });
      }
      
      // For second user - muscle gain journey (if exists)
      if (userDocs.length > 1) {
        for (let i = 0; i < 4; i++) {
          const date = new Date(Date.now() - (21 * i) * 24 * 60 * 60 * 1000);
          sampleBodyWeightLogs.push({
            userId: userDocs[1].ref,
            photoTakenDate: date,
            weight: 165 + (i * 3),
            weightUnit: "lbs" as const,
             photos: i === 3 ? [{
              url: "https://example.com/progress1.jpg",
              dateTaken: date.toISOString().split('T')[0],
              timestampTaken: Timestamp.fromDate(date),
              notes: "Flexing",
              type: "front" as const
            }] : [],
            notes: i === 3 ? "New PR on deadlift!" : null,
            measurements: {
              waist: 32,
              chest: 40 + (i * 0.5),
              arms: 15 + (i * 0.3),
              unit: "inches" as const,
            },
            createdAt: Timestamp.fromDate(date),
          });
        }
      }
      
      // For third user - maintenance (if exists)
      if (userDocs.length > 2) {
        for (let i = 0; i < 3; i++) {
          const date = new Date(Date.now() - (14 * i) * 24 * 60 * 60 * 1000);
          sampleBodyWeightLogs.push({
            userId: userDocs[2].ref,
            photoTakenDate: date,
            weight: 70 + (Math.random() * 0.5 - 0.25),
            weightUnit: "kg" as const,
            photos: [],
            notes: null,
            createdAt: Timestamp.fromDate(date),
          });
        }
      }
      
      // Add all documents to Firestore
      for (const log of sampleBodyWeightLogs) {
        await addDoc(bodyWeightLogsCollection, log);
      }
      
      alert(`Successfully created ${sampleBodyWeightLogs.length} bodyWeightLogs!`);
    } catch (error) {
      console.error("Error populating bodyWeightLogs:", error);
      alert("Error creating bodyWeightLogs. Check console for details.");
    } finally {
      setIsPopulating(false);
    }
  };

  const populateWorkoutLogs = async () => {
    try {
      setIsPopulating(true);
      
      const workoutLogsCollection = collection(db, "workoutLogs");
      
      // Get users and programs
      const usersSnapshot = await getDocs(collection(db, "users"));
      const programsSnapshot = await getDocs(collection(db, "programs"));
      
      if (usersSnapshot.empty) {
        alert("Please create some users first!");
        return;
      }
      
      if (programsSnapshot.empty) {
        alert("Please create some programs first!");
        return;
      }
      
      const userDocs = usersSnapshot.docs;
      const programDocs = programsSnapshot.docs;
      const { addDoc, Timestamp } = await import("firebase/firestore");
      
      const sampleWorkoutLogs = [];
      const now = new Date();
      
      // Workout Log 1 - Completed Upper Body
      sampleWorkoutLogs.push({
        dateCompleted: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Yesterday
        userId: userDocs[0].id,
        programId: programDocs[0].ref,
        programName: programDocs[0].data().name || "Training Program",
        phaseNumber: 1,
        workoutName: "Upper Body Power",
        dayNumber: 1,
        weekNumber: 3,
        startedAt: Timestamp.fromDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 75 * 60 * 1000)),
        completedAt: Timestamp.fromDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)),
        totalDuration: 75,
        status: "completed" as const,
        exercises: [
          {
            name: "Barbell Bench Press",
            sets: [
              { done: true, reps: "10", weight: "185" },
              { done: true, reps: "9", weight: "185" },
              { done: true, reps: "8", weight: "195" },
              { done: true, reps: "7", weight: "195" },
            ],
          },
          {
            name: "Incline Dumbbell Press",
            sets: [
              { done: true, reps: "12", weight: "65" },
              { done: true, reps: "11", weight: "65" },
              { done: true, reps: "10", weight: "65" },
            ],
          },
          {
            name: "Cable Flyes",
            sets: [
              { done: true, reps: "15", weight: "30" },
              { done: true, reps: "14", weight: "30" },
              { done: true, reps: "12", weight: "30" },
            ],
          },
        ],
        totalVolume: 8655,
        totalSets: 7,
        totalReps: 67,
        personalBests: ["Incline Dumbbell Press - 12 reps @ 65lbs"],
        notes: "Great session, felt strong today!",
        energyLevel: "high" as const,
        sleepQuality: "good" as const,
      });

      // Workout Log 2 - Completed Lower Body
      sampleWorkoutLogs.push({
        dateCompleted: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        userId: userDocs[0].id,
        programId: programDocs[0].ref,
        programName: programDocs[0].data().name || "Training Program",
        phaseNumber: 1,
        workoutName: "Lower Body Strength",
        dayNumber: 2,
        weekNumber: 3,
        startedAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 - 90 * 60 * 1000)),
        completedAt: Timestamp.fromDate(new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)),
        totalDuration: 90,
        status: "completed" as const,
        exercises: [
          {
            name: "Barbell Back Squat",
            sets: [
              { done: true, reps: "5", weight: "225" },
              { done: true, reps: "5", weight: "245" },
              { done: true, reps: "5", weight: "265" },
              { done: true, reps: "5", weight: "275" },
              { done: true, reps: "4", weight: "285" },
            ],
          },
          {
            name: "Romanian Deadlift",
            sets: [
              { done: true, reps: "10", weight: "135" },
              { done: true, reps: "10", weight: "155" },
              { done: true, reps: "8", weight: "175" },
            ],
          },
          {
            name: "Leg Press",
            sets: [
              { done: true, reps: "12", weight: "360" },
              { done: true, reps: "12", weight: "360" },
              { done: true, reps: "10", weight: "400" },
            ],
          },
        ],
        totalVolume: 6475,
        totalSets: 11,
        totalReps: 86,
        personalBests: ["Barbell Back Squat - 285lbs x 4"],
        notes: "Legs are going to be sore tomorrow",
        energyLevel: "medium" as const,
        sleepQuality: "fair" as const,
      });

      // Workout Log 3 - Skipped
      sampleWorkoutLogs.push({
        dateCompleted: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        userId: userDocs[0].id,
        programId: programDocs[0].ref,
        programName: programDocs[0].data().name || "Training Program",
        phaseNumber: 1,
        workoutName: "Pull Day",
        dayNumber: 3,
        weekNumber: 2,
        startedAt: null,
        completedAt: null,
        totalDuration: null,
        status: "skipped" as const,
        skipReason: "Feeling under the weather, needed rest",
        skippedAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)),
        exercises: [
          {
            name: "Pull-ups",
            sets: [
              { done: false, reps: "", weight: "" },
              { done: false, reps: "", weight: "" },
              { done: false, reps: "", weight: "" },
            ],
          },
          {
            name: "Barbell Rows",
            sets: [
              { done: false, reps: "", weight: "" },
              { done: false, reps: "", weight: "" },
              { done: false, reps: "", weight: "" },
            ],
          },
          {
            name: "Face Pulls",
            sets: [
              { done: false, reps: "", weight: "" },
              { done: false, reps: "", weight: "" },
              { done: false, reps: "", weight: "" },
            ],
          },
        ],
        totalVolume: 0,
        totalSets: 0,
        totalReps: 0,
        personalBests: [],
        notes: null,
        energyLevel: "low" as const,
        sleepQuality: "poor" as const,
      });

      // Add all documents to Firestore
      for (const workoutLog of sampleWorkoutLogs) {
        await addDoc(workoutLogsCollection, workoutLog);
      }

      alert(`Successfully created ${sampleWorkoutLogs.length} workout logs!`);
    } catch (error) {
      console.error("Error populating workout logs:", error);
      alert("Error creating workout logs. Check console for details.");
    } finally {
      setIsPopulating(false);
    }
  };

  const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        const { query, where, orderBy, limit } = await import("firebase/firestore");
        
        // Fetch all userPrograms
        const userProgramsCollection = collection(db, "userPrograms");
        const userProgramsSnapshot = await getDocs(userProgramsCollection);
        
        // Create a map of userId -> userProgram data
        const userProgramsMap = new Map();
        for (const upDoc of userProgramsSnapshot.docs) {
          const upData = upDoc.data();
          // Get the userId from the reference
          let userId = null;
          if (upData.userId?.id) {
            userId = upData.userId.id;
          } else if (typeof upData.userId === 'string') {
            userId = upData.userId;
          }
          
          if (userId) {
            userProgramsMap.set(userId, {
              currentWeek: upData.currentWeek || 0,
              currentDay: upData.currentDay || 0,
              currentPhase: upData.currentPhase || 0,
              totalWorkoutsCompleted: upData.totalWorkoutsCompleted || 0,
              totalWorkoutsInProgram: upData.totalWorkoutsInProgram || 0,
            });
          }
        }
        
        const fetchedUsers: ClientData[] = await Promise.all(
          usersSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            
            // Fetch latest body weight log
            let weight: number | null = null;
            let weightChange: number = 0;
            let weightUnit = "kg";
            try {
              const bodyWeightLogsRef = collection(db, "bodyWeightLogs");
              const weightQuery = query(
                bodyWeightLogsRef,
                where("userId", "==", doc.ref)
              );
              const weightSnapshot = await getDocs(weightQuery);
              
              if (!weightSnapshot.empty) {
                // Client-side sort
                const logs = weightSnapshot.docs.map(d => d.data());
                logs.sort((a, b) => {
                  const dateA = a.photoTakenDate?.toDate ? a.photoTakenDate.toDate() : new Date(a.photoTakenDate || 0);
                  const dateB = b.photoTakenDate?.toDate ? b.photoTakenDate.toDate() : new Date(b.photoTakenDate || 0);
                  return dateB.getTime() - dateA.getTime();
                });
                
                const latestLog = logs[0];
                weight = latestLog.weight !== undefined ? latestLog.weight : null;
                weightUnit = latestLog.weightUnit || "kg";

                if (logs.length > 1) {
                  const previousLog = logs[1];
                  const previousWeight = previousLog.weight !== undefined ? previousLog.weight : null;
                  if (weight !== null && previousWeight !== null) {
                     // Calculate change: current - previous
                     // If user lost weight: 80 - 82 = -2
                     // If user gained weight: 82 - 80 = +2
                     weightChange = Number((weight - previousWeight).toFixed(1));
                  }
                }
              }
            } catch (err) {
              console.error("Error fetching weight logs for user", doc.id, err);
            }

            // Generate avatar gradient based on user ID
            const gradients = [
              "bg-gradient-to-br from-blue-500 to-indigo-600",
              "bg-gradient-to-br from-rose-400 to-pink-600",
              "bg-gradient-to-br from-amber-400 to-orange-600",
              "bg-gradient-to-br from-emerald-400 to-teal-600",
              "bg-gradient-to-br from-violet-400 to-purple-600",
              "bg-gradient-to-br from-slate-400 to-slate-600",
            ];
            const gradientIndex = doc.id.charCodeAt(0) % gradients.length;
            
            // Fetch program name if currentProgram is a reference
            let programName = "No Program";
            if (data.currentProgram) {
              try {
                // Check if it's a DocumentReference
                if (data.currentProgram.path) {
                  // It's a reference, fetch the document
                  const programDoc = await getDoc(data.currentProgram);
                  if (programDoc.exists()) {
                    const programData: any = programDoc.data();
                    programName = programData?.name || programData?.programName || "Unknown Program";
                  }
                } else if (typeof data.currentProgram === 'string') {
                  // It's already a string
                  programName = data.currentProgram;
                }
              } catch (err) {
                console.error("Error fetching program for user", doc.id, err);
                programName = "Unknown Program";
              }
            }
            
            // Get userProgram data for this user
            const userProgramData = userProgramsMap.get(doc.id);
            
            // Transform Firebase user to ClientData format
            return {
              id: doc.id,
              name: data.displayName || data.username || "Unknown User",
              photo: data.profilePhoto || "", // Use profilePhoto from Firebase or empty string
              avatarGradient: gradients[gradientIndex],
              currentProgram: programName,
              week: userProgramData?.currentWeek || 0,
              totalWeeks: userProgramData?.totalWorkoutsInProgram || 0,
              currentDay: userProgramData?.currentDay,
              currentPhase: userProgramData?.currentPhase,
              compliance: 0,
              totalWorkouts: userProgramData?.totalWorkoutsCompleted || 0,
              completedWorkouts: userProgramData?.totalWorkoutsCompleted || 0,
              totalWorkoutsInProgram: userProgramData?.totalWorkoutsInProgram || 0,
              weight: weight,
              weightUnit: weightUnit,
              weightChange: weightChange,
              lastWorkout: "No activity",
              status: "medium",
              nextWorkout: "Not scheduled",
              goals: data.goals || "",
            };
          })
        );

        // Combine Firebase users with mock clients (keeping mock clients)
        setClients([...fetchedUsers, ...mockClients]);
      } catch (err) {
        console.error("Error fetching users:", err);
        // Keep using mock clients on error
        setClients(mockClients);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }

    const query = searchQuery.toLowerCase();
    return clients.filter((client) => {
      const name = client.name.toLowerCase();
      const program = client.currentProgram.toLowerCase();
      
      return name.includes(query) || program.includes(query);
    });
  }, [clients, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="ml-[220px] min-h-screen">
        <div className="p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground mt-1">View clients progress</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={populateBodyWeightLogs}
                disabled={isPopulating}
                className="h-11 px-5 rounded-xl bg-blue-600 text-white font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPopulating ? "Populating..." : "populate BodyWeightLogs"}
              </button>
              <button 
                onClick={populateWorkoutLogs}
                disabled={isPopulating}
                className="h-11 px-5 rounded-xl bg-red-600 text-white font-medium flex items-center gap-2 hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPopulating ? "Populating..." : "Populate WorkoutLogs"}
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Add New Client
              </button>
            </div>
          </div>


          {/* Search Bar */}
          <div className="mb-8">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
          </div>

          {/* Client Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
            {loading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Loading clients...
              </div>
            ) : filteredClients.length > 0 ? (
              <>
                {filteredClients.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </>
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground mb-2">
                  {searchQuery ? "No clients found matching your search" : "No clients yet"}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-primary hover:underline text-sm"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={1}
            totalPages={4}
            totalItems={24}
            itemsPerPage={6}
          />
        </div>
      </main>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClientAdded={() => {
          fetchUsers(); // Refresh the client list
        }}
      />
    </div>
  );
}
