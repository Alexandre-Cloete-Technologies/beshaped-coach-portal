"use client";

import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Edit, 
  LayoutGrid,
  History,
  TrendingUp,
  Apple,
  Settings,
  Dumbbell,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";
import WorkoutHistory from "./WorkoutHistory";
import Progress from "./Progress";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "workout-history", label: "Workout History", icon: History },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "nutrition", label: "Nutrition", icon: Apple },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params?.id as string;
  const [activeTab, setActiveTab] = useState("overview");

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClient = async () => {
      if (!clientId) return;

      try {
        setLoading(true);
        const clientDoc = await getDoc(doc(db, "users", clientId));
        
        if (clientDoc.exists()) {
          const data = clientDoc.data();
          
          // Serialize and deserialize to remove all Firestore references
          const serializedData = JSON.parse(JSON.stringify(data));
          
          // Properly extract stats to avoid Firestore object references
          const stats = {
            totalWorkouts: serializedData.stats?.totalWorkouts || 0,
            currentStreak: serializedData.stats?.currentStreak || 0,
            longestStreak: serializedData.stats?.longestStreak || 0,
          };
          
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
              console.error("Error fetching program:", err);
              programName = "Unknown Program";
            }
          }
          
          // Fetch user program progress
          let programProgress = {
            currentDay: 0,
            currentWeek: 0,
            currentPhase: 0
          };
          
          try {
            const { collection, query, where, getDocs, limit } = await import("firebase/firestore");
            const q = query(
              collection(db, "userPrograms"), 
              where("userId", "==", clientDoc.ref),
              limit(1)
            );
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const progData = querySnapshot.docs[0].data();
              programProgress = {
                currentDay: progData.currentDay || 0,
                currentWeek: progData.currentWeek || 0,
                currentPhase: progData.currentPhase || 0
              };
            }
          } catch (err) {
            console.error("Error fetching user program progress:", err);
          }
          
          setClient({
            id: clientDoc.id,
            name: serializedData.displayName || serializedData.username || "Unknown User",
            email: serializedData.email || "No email",
            phone: serializedData.phoneNumber || "No Phone Number Stored",
            avatarGradient: `bg-gradient-to-br from-${['rose', 'purple', 'emerald', 'amber', 'blue'][clientId.charCodeAt(0) % 5]}-400 to-${['pink', 'purple', 'teal', 'orange', 'indigo'][clientId.charCodeAt(0) % 5]}-600`,
            isOnline: false,
            memberSince: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Unknown",
            streak: stats.currentStreak,
            currentProgram: programName,
            stats: stats,
            goals: serializedData.goals || null,
            ...programProgress,
          });
          setError(null);
        } else {
          setError("Client not found");
        }
      } catch (err) {
        console.error("Error fetching client:", err);
        setError("Failed to load client data");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading client...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="ml-[220px] min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error || "Client not found"}</p>
            <Link 
              href="/clients"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Clients
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen">
        <div className="p-8">
          {/* Back Button */}
          <Link 
            href="/clients"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Clients
          </Link>

          {/* Header Card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className={`w-24 h-24 rounded-2xl ${client.avatarGradient} flex items-center justify-center`}>
                    <span className="text-white text-2xl font-semibold">
                      {client.name.split(' ').map((n: string) => n[0]).join('')}
                    </span>
                  </div>
                  {client.isOnline && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-card rounded-full" />
                  )}
                </div>

                {/* Client Info */}
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">{String(client.name)}</h1>
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {String(client.email)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {String(client.phone)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center   ">
                        Member since {String(client.memberSince)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">


              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-t border-border pt-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "workout-history" ? (
            <WorkoutHistory />
          ) : activeTab === "progress" ? (
            <Progress clientId={clientId} />
          ) : activeTab === "overview" ? (
            /* Main Content Grid */
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column - Main Content */}
              <div className="col-span-2 space-y-6">
                {/* Current Program */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-foreground">Current Program</h2>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {String(client.currentProgram)}
                      </h3>
                      {client.goals && (
                        <div className="mt-2 text-sm">
                           <span className="text-muted-foreground">Goals: </span>
                           <span className="font-medium text-foreground">{client.goals}</span>
                         </div>
                      )}
                      
                      {(client.currentDay || client.currentWeek || client.currentPhase) && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          {[
                            client.currentPhase && `Phase ${client.currentPhase}`,
                            client.currentWeek && `Week ${client.currentWeek}`,
                            client.currentDay && `Day ${client.currentDay}`
                          ].filter(Boolean).join(" • ")}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Row - Placeholder */}
                {/* <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                  <h2 className="text-lg font-semibold text-foreground mb-4">Stats & Activity</h2>
                  <p className="text-sm text-muted-foreground">
                    Workout stats, nutrition logs, and activity tracking coming soon...
                  </p>
                </div> */}
              </div>

              
            </div>
          ) : (
            /* Placeholder for other tabs */
            <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
              <p className="text-muted-foreground">
                {tabs.find((t) => t.id === activeTab)?.label} content coming soon...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
