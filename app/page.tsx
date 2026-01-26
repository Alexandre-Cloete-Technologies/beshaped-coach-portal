"use client";

import { Plus } from "lucide-react";
import Sidebar from "./components/Sidebar";
import StatsCard from "./components/StatsCard";
import SearchBar from "./components/SearchBar";
import ClientCard, { ClientData } from "./components/ClientCard";
import AddClientCard from "./components/AddClientCard";
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

  const populateWeightLogs = async () => {
    try {
      setIsPopulating(true);
      
      const weightLogsCollection = collection(db, "weightLogs");
      
      // Get some users to create references
      const usersSnapshot = await getDocs(collection(db, "users"));
      
      if (usersSnapshot.empty) {
        alert("Please create some users first!");
        return;
      }
      
      const userDocs = usersSnapshot.docs;
      const addDoc = (await import("firebase/firestore")).addDoc;
      
      // Create sample weight logs for multiple users over time
      const sampleWeightLogs = [];
      
      // For first user - progressive weight loss journey
      for (let i = 0; i < 5; i++) {
        sampleWeightLogs.push({
          userId: userDocs[0].ref,
          photoTakenDate: new Date(Date.now() - (30 * i) * 24 * 60 * 60 * 1000), // Every 30 days
          weight: 85 - (i * 1.5), // Gradual weight loss
          weightUnit: "kg" as const,
          photos: i === 0 ? ["https://example.com/photo1.jpg", "https://example.com/photo2.jpg"] : [],
          notes: i === 0 ? "Starting my fitness journey!" : i === 4 ? "Feeling great!" : null,
          measurements: {
            waist: 95 - (i * 2),
            chest: 105 - (i * 1),
            hips: 100 - (i * 1.5),
            arms: 35 - (i * 0.5),
            unit: "cm" as const,
          },
          createdAt: new Date(Date.now() - (30 * i) * 24 * 60 * 60 * 1000),
        });
      }
      
      // For second user - muscle gain journey (if exists)
      if (userDocs.length > 1) {
        for (let i = 0; i < 4; i++) {
          sampleWeightLogs.push({
            userId: userDocs[1].ref,
            photoTakenDate: new Date(Date.now() - (21 * i) * 24 * 60 * 60 * 1000), // Every 3 weeks
            weight: 165 + (i * 3), // Gradual weight gain
            weightUnit: "lbs" as const,
            photos: i === 3 ? ["https://example.com/progress1.jpg"] : [],
            notes: i === 3 ? "New PR on deadlift!" : null,
            measurements: {
              waist: 32,
              chest: 40 + (i * 0.5),
              arms: 15 + (i * 0.3),
              unit: "inches" as const,
            },
            createdAt: new Date(Date.now() - (21 * i) * 24 * 60 * 60 * 1000),
          });
        }
      }
      
      // For third user - maintenance (if exists)
      if (userDocs.length > 2) {
        for (let i = 0; i < 3; i++) {
          sampleWeightLogs.push({
            userId: userDocs[2].ref,
            photoTakenDate: new Date(Date.now() - (14 * i) * 24 * 60 * 60 * 1000), // Every 2 weeks
            weight: 70 + (Math.random() * 0.5 - 0.25), // Slight fluctuation
            weightUnit: "kg" as const,
            photos: [],
            notes: null,
            createdAt: new Date(Date.now() - (14 * i) * 24 * 60 * 60 * 1000),
          });
        }
      }
      
      // Add all documents to Firestore
      for (const weightLog of sampleWeightLogs) {
        await addDoc(weightLogsCollection, weightLog);
      }
      
      alert(`Successfully created ${sampleWeightLogs.length} weight logs!`);
    } catch (error) {
      console.error("Error populating weight logs:", error);
      alert("Error creating weight logs. Check console for details.");
    } finally {
      setIsPopulating(false);
    }
  };

  const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersCollection = collection(db, "users");
        const usersSnapshot = await getDocs(usersCollection);
        
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
              weight: 0,
              weightChange: 0,
              lastWorkout: "No activity",
              status: "medium",
              nextWorkout: "Not scheduled",
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
                onClick={populateWeightLogs}
                disabled={isPopulating}
                className="h-11 px-5 rounded-xl bg-blue-600 text-white font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPopulating ? "Populating..." : "Populate WeightLogs"}
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

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatsCard type="active" value={24} label="Total Active" />
            <StatsCard type="attention" value={3} label="Needs Attention" />
            <StatsCard type="compliance" value="87%" label="Avg. Compliance" />
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
                <AddClientCard onClick={() =>setIsModalOpen(true)} />
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
