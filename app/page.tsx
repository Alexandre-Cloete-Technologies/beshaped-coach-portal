"use client";

import { Plus, UserPlus } from "lucide-react";
import Sidebar from "./components/Sidebar";
import StatsCard from "./components/StatsCard";
import SearchBar from "./components/SearchBar";
import ClientCard, { ClientData } from "./components/ClientCard";
import Pagination from "./components/Pagination";
import AddClientModal from "./components/AddClientModal";
import AssignProgramModal from "./components/AssignProgramModal";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";


export default function Home() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

        setClients(fetchedUsers);
      } catch (err) {
        console.error("Error fetching users:", err);
        setClients([]);
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
                onClick={() => setAssignModalOpen(true)}
                className="h-11 px-5 rounded-xl bg-card border border-border text-card-foreground font-medium flex items-center gap-2 hover:bg-accent transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Assign Program
              </button>

              <button 
                onClick={() => setIsModalOpen(true)}
                className="h-11 px-5 rounded-xl bg-blue-600 text-primary-foreground font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
              >
                Add A New Client
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

      <AssignProgramModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssigned={() => {
          fetchUsers(); // Refresh client program data after assignment
        }}
      />
    </div>
  );
}
