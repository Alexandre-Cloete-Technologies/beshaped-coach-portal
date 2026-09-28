"use client";

import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  LayoutGrid,
  History,
  TrendingUp,
  Apple,
  Settings,
  Dumbbell,
  BookOpen,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSignedInCoach } from "@/lib/auth/AuthProvider";
import { isClientInScope } from "@/lib/coachScope";
import { useParams, useSearchParams } from "next/navigation";
import { profilePhotoUrl } from "@/lib/profilePhoto";
import {
  getClientProfilePhotoUrl,
  setClientProfilePhotoUrl,
} from "@/lib/clientProfilePhotoCache";
import WorkoutHistory from "./WorkoutHistory";
import Progress from "./Progress";
import ClientPrograms from "./ClientPrograms";
import Nutrition from "./Nutrition";

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "workout-history", label: "Workout History", icon: History },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "programs", label: "Programs", icon: BookOpen },
  { id: "nutrition", label: "Nutrition", icon: Apple },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

const TAB_IDS = new Set<string>(tabs.map((t) => t.id));
type TabId = (typeof tabs)[number]["id"];

/** Fields read from a `programs` document when resolving `currentProgram` */
type ProgramDoc = {
  name?: string;
  programName?: string;
};

interface ClientView {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Firestore `profilePhoto` download URL, or `""` for initials. */
  profilePhoto: string;
  avatarGradient: string;
  isOnline: boolean;
  memberSince: string;
  streak: number;
  currentProgram: string;
  stats: {
    totalWorkouts: number;
    currentStreak: number;
    longestStreak: number;
  };
  goals: string | null;
  currentDay: number;
  currentWeek: number;
  currentPhase: number;
}

const DETAIL_AVATAR_PX = 96;

function ClientDetailHeaderAvatar({
  name,
  photoUrl,
  avatarGradient,
  isOnline,
}: {
  name: string;
  photoUrl: string;
  avatarGradient: string;
  isOnline: boolean;
}) {
  // The URL that failed to load; a new photo URL gets a fresh attempt.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const trimmed = photoUrl?.trim() ?? "";
  const show = trimmed.length > 0 && failedUrl !== trimmed;

  return (
    <div className="relative">
      <div
        className={`w-24 h-24 rounded-2xl flex-shrink-0 overflow-hidden ${
          show
            ? "bg-muted"
            : `${avatarGradient} flex items-center justify-center`
        }`}
      >
        {show ? (
          <Image
            src={trimmed}
            alt={`${name} profile photo`}
            width={DETAIL_AVATAR_PX}
            height={DETAIL_AVATAR_PX}
            className="h-full w-full object-cover"
            onError={() => setFailedUrl(trimmed)}
            unoptimized
          />
        ) : (
          <span className="text-white text-2xl font-semibold">
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        )}
      </div>
      {isOnline && (
        <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-card rounded-full" />
      )}
    </div>
  );
}

export default function ClientDetailPage() {
  const { uid, role } = useSignedInCoach();
  const params = useParams();
  const searchParams = useSearchParams();
  const clientId = params?.id as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(["overview"]));

  const [client, setClient] = useState<ClientView | null>(null);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setVisitedTabs((prev) => new Set(prev).add(tabId));
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cachedHeaderPhoto = clientId ? getClientProfilePhotoUrl(clientId) : null;

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab || !TAB_IDS.has(tab)) return;
    setActiveTab(tab as TabId);
    setVisitedTabs((prev) => new Set(prev).add(tab));
  }, [searchParams]);

  useEffect(() => {
    const fetchClient = async () => {
      if (!clientId) return;

      try {
        setLoading(true);
        const clientDoc = await getDoc(doc(db, "users", clientId));
        
        // Another coach's client looks the same as a missing one. The tabs below (history,
        // nutrition, progress, programs) only mount once `client` is set, so they never load for it.
        if (clientDoc.exists() && isClientInScope({ uid, role }, clientDoc.data())) {
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
                  const programData = programDoc.data() as ProgramDoc;
                  programName = programData.name || programData.programName || "Unknown Program";
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
          
          const g = serializedData.goals;
          const goals: string | null =
            g == null || g === "" ? null : typeof g === "string" ? g : String(g);

          const p = profilePhotoUrl(data.profilePhoto);
          if (p) setClientProfilePhotoUrl(clientDoc.id, p);

          setClient({
            id: clientDoc.id,
            name: serializedData.displayName || serializedData.username || "Unknown User",
            email: serializedData.email || "No email",
            phone: serializedData.phoneNumber || "No Phone Number Stored",
            profilePhoto: p,
            avatarGradient: `bg-gradient-to-br from-${['rose', 'purple', 'emerald', 'amber', 'blue'][clientId.charCodeAt(0) % 5]}-400 to-${['pink', 'purple', 'teal', 'orange', 'indigo'][clientId.charCodeAt(0) % 5]}-600`,
            isOnline: false,
            memberSince: data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Unknown",
            streak: stats.currentStreak,
            currentProgram: programName,
            stats: stats,
            goals,
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
  }, [clientId, uid, role]);

  if (loading) {
    if (cachedHeaderPhoto) {
      return (
        <div className="min-h-screen bg-background">
          <Sidebar />
          <main className="ml-[220px] min-h-screen">
            <div className="p-4">
              <Link
                href="/clients"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Clients
              </Link>
              <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6">
                <div className="flex items-start gap-4">
                  <ClientDetailHeaderAvatar
                    name="User"
                    photoUrl={cachedHeaderPhoto}
                    avatarGradient="bg-gradient-to-br from-slate-400 to-slate-600"
                    isOnline={false}
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">
                      Loading client…
                    </h1>
                    <p className="text-sm text-muted-foreground">Fetching info…</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mb-3" />
                <p className="text-muted-foreground text-sm">Loading client…</p>
              </div>
            </div>
          </main>
        </div>
      );
    }
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
        <div className="p-4">
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
                <ClientDetailHeaderAvatar
                  name={client.name}
                  photoUrl={client.profilePhoto}
                  avatarGradient={client.avatarGradient}
                  isOnline={client.isOnline}
                />

                {/* Client Info */}
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">{String(client.name)}</h1>
                  <div className="flex flex-col gap-1">
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

            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-t border-border pt-3">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
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

          {/* Tab Content - heavy tabs stay mounted once visited to avoid re-fetch on tab switch */}
          {visitedTabs.has("workout-history") && (
            <div style={{ display: activeTab === "workout-history" ? "block" : "none" }}>
              <WorkoutHistory />
            </div>
          )}
          {visitedTabs.has("progress") && (
            <div style={{ display: activeTab === "progress" ? "block" : "none" }}>
              <Progress clientId={clientId} />
            </div>
          )}
          {visitedTabs.has("programs") && (
            <div style={{ display: activeTab === "programs" ? "block" : "none" }}>
              <ClientPrograms clientId={clientId} />
            </div>
          )}
          {visitedTabs.has("nutrition") && (
            <div style={{ display: activeTab === "nutrition" ? "block" : "none" }}>
              <Nutrition clientId={clientId} />
            </div>
          )}
          {activeTab === "overview" && (
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
          )}
          {activeTab === "settings" && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-8 text-center">
              <p className="text-muted-foreground">Settings content coming soon...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
