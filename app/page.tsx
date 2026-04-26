"use client";

import {  UserPlus } from "lucide-react";
import Sidebar from "./components/Sidebar";
import SearchBar from "./components/SearchBar";
import ClientCard, { ClientData } from "./components/ClientCard";
import Pagination from "./components/Pagination";
import AddClientModal from "./components/AddClientModal";
import AssignProgramModal from "./components/AssignProgramModal";
import { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  getDoc,
  query,
  where,
  Timestamp,
  type DocumentData,
  type DocumentReference,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { profilePhotoUrl } from "@/lib/profilePhoto";
import {
  getClientProfilePhotoUrl,
  setClientProfilePhotoUrl,
} from "@/lib/clientProfilePhotoCache";

function toDateValue(value: unknown): Date {
  if (value == null) return new Date(0);
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

function parseLogWeight(d: DocumentData): number | null {
  const w = d.weight;
  if (w === undefined || w === null) return null;
  return typeof w === "number" ? w : Number(w) || null;
}

/** Latest body weight from `bodyWeightLogs` (by `photoTakenDate`), with change vs previous log. */
async function fetchLatestBodyweight(userRef: DocumentReference) {
  const bodyWeightLogsRef = collection(db, "bodyWeightLogs");
  const userIdStr = userRef.id;
  let snapshot = await getDocs(
    query(bodyWeightLogsRef, where("userId", "==", userRef))
  );
  if (snapshot.empty) {
    snapshot = await getDocs(
      query(bodyWeightLogsRef, where("userId", "==", userIdStr))
    );
  }
  if (snapshot.empty) {
    return { weight: null as number | null, weightUnit: "kg", weightChange: null as number | null };
  }

  const logs = snapshot.docs.map((d) => d.data());
  logs.sort((a, b) => toDateValue(b.photoTakenDate).getTime() - toDateValue(a.photoTakenDate).getTime());

  const latestLog = logs[0];
  const weight = parseLogWeight(latestLog);
  const weightUnit =
    typeof latestLog.weightUnit === "string" ? latestLog.weightUnit : "kg";

  if (logs.length < 2) {
    return { weight, weightUnit, weightChange: null as number | null };
  }
  const previousLog = logs[1];
  const previousWeight = parseLogWeight(previousLog);
  if (weight === null || previousWeight === null) {
    return { weight, weightUnit, weightChange: null as number | null };
  }
  return {
    weight,
    weightUnit,
    weightChange: Number((weight - previousWeight).toFixed(1)) as number,
  };
}

/** Fields read from `programs` docs when resolving a `currentProgram` reference */
type ProgramDoc = {
  name?: string;
  programName?: string;
};

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
            
            let weight: number | null = null;
            let weightChange: number | null = null;
            let weightUnit = "kg";
            try {
              const bw = await fetchLatestBodyweight(doc.ref);
              weight = bw.weight;
              weightUnit = bw.weightUnit;
              weightChange = bw.weightChange;
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
                    const programData = programDoc.data() as ProgramDoc;
                    programName = programData.name || programData.programName || "Unknown Program";
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

            const firestorePhoto = profilePhotoUrl(data.profilePhoto);
            const cachedPhoto = getClientProfilePhotoUrl(doc.id) ?? "";
            const photo = firestorePhoto || cachedPhoto;
            
            // Transform Firebase user to ClientData format
            return {
              id: doc.id,
              name: data.displayName || data.username || "Unknown User",
              photo,
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

        for (const c of fetchedUsers) {
          if (c.photo) setClientProfilePhotoUrl(c.id, c.photo);
        }
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

  /** Only the first load shows a full grid skeleton; refetches keep existing cards (and browser-cached avatars) visible. */
  const showInitialLoadPlaceholder = loading && clients.length === 0;

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
                className="h-10 px-4 rounded-lg bg-beshaped-dark-green text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-beshaped-green transition-colors shadow-sm"
              >
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
            {showInitialLoadPlaceholder ? (
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
