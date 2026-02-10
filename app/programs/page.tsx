"use client";

import { Plus, Search, ChevronDown } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ProgramCard, { ProgramData } from "../components/ProgramCard";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

// Mock programs for fallback
const mockPrograms: ProgramData[] = [
  {
    id: "1",
    name: "Hypertrophy Phase 1",
    totalDuration: 12,
    phasesCount: 3,
    difficulty: "intermediate",
    focusAreas: ["Muscle Gain", "Strength"],
    isTemplate: true,
    activeClients: 14,
    updatedAt: "Updated 2 days ago",
  },
  {
    id: "2",
    name: "Mark's Marathon Prep",
    totalDuration: 16,
    phasesCount: 4,
    difficulty: "advanced",
    focusAreas: ["Endurance", "Cardio"],
    isTemplate: false,
    activeClients: 1,
    createdBy: "You",
  },
  {
    id: "3",
    name: "Strength Fundamentals",
    totalDuration: 8,
    phasesCount: 2,
    difficulty: "beginner",
    focusAreas: ["Technique", "Base"],
    isTemplate: true,
    activeClients: 7,
    updatedAt: "Updated 1 week ago",
  },
  {
    id: "4",
    name: "Advanced Cutting",
    totalDuration: 10,
    phasesCount: 3,
    difficulty: "advanced",
    focusAreas: ["Fat Loss", "Conditioning"],
    isTemplate: true,
    activeClients: 11,
    updatedAt: "Updated yesterday",
  },
];

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<ProgramData[]>(mockPrograms);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"library" | "builder">("library");

  // Fetch programs from Firebase
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const programsCollection = collection(db, "programs");
        const usersCollection = collection(db, "users");
        
        // Fetch programs and users in parallel
        const [programsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(programsCollection),
          getDocs(usersCollection),
        ]);
        
        // Build userId -> username lookup map
        const userMap: Record<string, string> = {};
        usersSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          userMap[doc.id] = data.displayName || data.username || "Unknown";
        });
        
        if (!programsSnapshot.empty) {
          const fetchedPrograms: ProgramData[] = programsSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || "Untitled Program",
              description: data.description,
              totalDuration: data.totalDuration || data.phases?.length * 4 || 8,
              phasesCount: data.phases?.length || 0,
              difficulty: data.difficulty || "intermediate",
              focusAreas: data.focusAreas || data.focus || [],
              isTemplate: data.isTemplate ?? true,
              activeClients: data.activeClients || 0,
              clientAvatars: data.clientAvatars || [],
              updatedAt: data.updatedAt ? `Updated ${formatDate(data.updatedAt)}` : undefined,
              createdBy: data.createdBy ? (userMap[data.createdBy] || data.createdBy) : undefined,
            };
          });
          
          setPrograms(fetchedPrograms.length > 0 ? fetchedPrograms : mockPrograms);
        }
      } catch (error) {
        console.error("Error fetching programs:", error);
        setPrograms(mockPrograms);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  // Format date helper
  const formatDate = (date: any): string => {
    if (!date) return "";
    const d = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? "s" : ""} ago`;
    return `${Math.floor(diffDays / 30)} month${diffDays >= 60 ? "s" : ""} ago`;
  };

  // Filter programs based on search
  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return programs;
    
    const query = searchQuery.toLowerCase();
    return programs.filter((program) => 
      program.name.toLowerCase().includes(query) ||
      program.focusAreas.some(f => f.toLowerCase().includes(query)) ||
      program.difficulty.toLowerCase().includes(query)
    );
  }, [programs, searchQuery]);

  const handleView = (id: string) => {
    console.log("View program:", id);
    // TODO: Navigate to program details
  };

  const handleEdit = (id: string) => {
    console.log("Edit program:", id);
    // TODO: Open program editor
  };

  const handleDuplicate = (id: string) => {
    console.log("Duplicate program:", id);
    // TODO: Duplicate program
  };

  const handleDelete = (id: string) => {
    console.log("Delete program:", id);
    // TODO: Delete program with confirmation
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="ml-[220px] min-h-screen">
        <div className="p-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">Program Library</h1>
              <p className="text-muted-foreground">Manage your training templates and custom programs.</p>
            </div>
            
            {/* Segmented Control */}
            <div className="bg-muted p-1 rounded-lg inline-flex">
              <button 
                onClick={() => setViewMode("library")}
                className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${
                  viewMode === "library" 
                    ? "bg-card text-card-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Library
              </button>
              <button 
                onClick={() => setViewMode("builder")}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === "builder" 
                    ? "bg-card text-card-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Builder
              </button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-card p-4 rounded-xl shadow-sm border border-border mb-8 flex flex-col xl:flex-row gap-4 items-center justify-between">
            {/* Search & Filters Group */}
            <div className="flex flex-1 flex-col md:flex-row gap-3 w-full xl:w-auto">
              {/* Search */}
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-muted border-none rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                  placeholder="Search programs..."
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                <button className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent whitespace-nowrap transition-colors">
                  Focus
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent whitespace-nowrap transition-colors">
                  Duration
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button className="flex items-center gap-2 px-3 py-2.5 bg-card border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent whitespace-nowrap transition-colors">
                  Difficulty
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Create Button */}
            <Link 
              href="/programs/builder"
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all"
            >
              <Plus className="w-5 h-5" />
              Create New Program
            </Link>
          </div>

          {/* Programs Grid */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading programs...
            </div>
          ) : filteredPrograms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPrograms.map((program) => (
                <ProgramCard 
                  key={program.id}
                  program={program}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-2">
                {searchQuery ? "No programs found matching your search" : "No programs yet"}
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

          {/* Load More */}
          {filteredPrograms.length > 0 && (
            <div className="flex justify-center mt-10">
              <button className="text-muted-foreground hover:text-primary text-sm font-semibold transition-colors flex items-center gap-2">
                Load more programs
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
