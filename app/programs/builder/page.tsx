"use client";

import { useState } from "react";
import { 
  Search, 
  GripVertical, 
  Info, 
  Plus, 
  ChevronDown, 
  X, 
  Clock, 
  Hotel,
  Edit,
  MoreHorizontal,
  CheckCircle,
  Send,
  Dumbbell
} from "lucide-react";
import Link from "next/link";

// Mock template data
const mockTemplates = [
  { id: "1", name: "Upper Body Power", exercises: 4, duration: 45, category: "recent" },
  { id: "2", name: "Leg Day Hypertrophy", exercises: 6, duration: 60, category: "recent" },
  { id: "3", name: "Full Body Circuit", exercises: 8, duration: 30, category: "recent" },
  { id: "4", name: "5x5 Stronglifts A", exercises: 3, duration: 50, category: "strength" },
  { id: "5", name: "Deadlift Focus", exercises: 4, duration: 45, category: "strength" },
];

interface PhaseDay {
  type: "workout" | "rest" | "empty";
  workoutName?: string;
  duration?: number;
  label?: string;
}

interface Phase {
  id: string;
  name: string;
  description: string;
  weeks: string;
  days: PhaseDay[];
  isExpanded: boolean;
}

export default function ProgramBuilderPage() {
  const [programName, setProgramName] = useState("Summer Shred 2024");
  const [sidebarTab, setSidebarTab] = useState<"templates" | "exercises">("templates");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [phases, setPhases] = useState<Phase[]>([
    {
      id: "1",
      name: "Phase 1: Accumulation",
      description: "Weeks 1-2 • Focus on volume and technique",
      weeks: "1-2",
      isExpanded: true,
      days: [
        { type: "workout", workoutName: "Upper Body Power", duration: 45, label: "Workout A" },
        { type: "workout", workoutName: "Leg Day Hypertrophy", duration: 60, label: "Workout B" },
        { type: "rest" },
        { type: "workout", workoutName: "Upper Body Power", duration: 45, label: "Workout A" },
        { type: "empty" },
        { type: "empty" },
        { type: "rest" },
      ],
    },
  ]);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const togglePhase = (phaseId: string) => {
    setPhases(phases.map(phase => 
      phase.id === phaseId ? { ...phase, isExpanded: !phase.isExpanded } : phase
    ));
  };

  const addPhase = () => {
    const newPhase: Phase = {
      id: `${phases.length + 1}`,
      name: `Phase ${phases.length + 1}: New Phase`,
      description: "Define your phase focus",
      weeks: `${phases.length * 2 + 1}-${phases.length * 2 + 2}`,
      isExpanded: true,
      days: Array(7).fill({ type: "empty" }),
    };
    setPhases([...phases, newPhase]);
  };

  const filteredTemplates = mockTemplates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentTemplates = filteredTemplates.filter(t => t.category === "recent");
  const strengthTemplates = filteredTemplates.filter(t => t.category === "strength");

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Navigation */}
      <header className="flex shrink-0 items-center justify-between whitespace-nowrap border-b border-border bg-card px-6 py-3 z-20">
        <div className="flex items-center gap-4 text-card-foreground">
          <Link href="/programs" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
            <div className="size-8 flex items-center justify-center bg-primary/10 rounded-lg text-primary">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold leading-tight tracking-tight">Program Builder</h2>
          </Link>
        </div>
        <div className="flex flex-1 justify-end gap-6 items-center">
          <div className="text-sm text-muted-foreground hidden md:block">
            Auto-saved 2 mins ago
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center ring-2 ring-card">
              <span className="text-white text-sm font-medium">JC</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar */}
        <aside className="w-[280px] shrink-0 flex flex-col bg-card border-r border-border z-10">
          {/* Sidebar Header / Search */}
          <div className="p-4 border-b border-border space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border-none rounded-lg bg-muted text-sm placeholder-muted-foreground focus:ring-2 focus:ring-ring focus:bg-card transition-all"
                placeholder="Search library..."
              />
            </div>
            
            {/* Segmented Control */}
            <div className="flex p-1 bg-muted rounded-lg">
              <button 
                onClick={() => setSidebarTab("templates")}
                className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-all ${
                  sidebarTab === "templates" 
                    ? "bg-card text-card-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Templates
              </button>
              <button 
                onClick={() => setSidebarTab("exercises")}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                  sidebarTab === "exercises" 
                    ? "bg-card text-card-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Exercises
              </button>
            </div>
          </div>

          {/* Draggable List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {recentTemplates.length > 0 && (
              <>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Recent</div>
                {recentTemplates.map((template) => (
                  <div 
                    key={template.id}
                    className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
                    draggable
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">{template.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{template.exercises} Exercises • {template.duration} min</p>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
            
            {strengthTemplates.length > 0 && (
              <>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1 mt-4">Strength</div>
                {strengthTemplates.map((template) => (
                  <div 
                    key={template.id}
                    className="group flex items-center gap-3 bg-card border border-border rounded-lg p-3 hover:border-primary/50 hover:shadow-md cursor-grab active:cursor-grabbing transition-all"
                    draggable
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-card-foreground truncate">{template.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{template.exercises} Exercises • {template.duration} min</p>
                    </div>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Plus className="w-4 h-4" />
              Create New Template
            </button>
          </div>
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 overflow-y-auto bg-background scroll-smooth">
          <div className="mx-auto max-w-[1280px] p-8 flex flex-col gap-8 pb-32">
            {/* Program Header Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 shadow-lg text-white">
              <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/5 to-transparent"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="text-blue-100 text-xs font-semibold uppercase tracking-wider">Program Title</label>
                    <input 
                      type="text"
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      className="w-full bg-transparent border-none text-4xl font-bold text-white placeholder-blue-200 focus:ring-0 px-0 leading-tight focus:outline-none"
                      placeholder="Enter program name"
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                      <span className="text-xs text-blue-100">Duration</span>
                      <span className="font-medium">4 Weeks</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                      <span className="text-xs text-blue-100">Difficulty</span>
                      <span className="font-medium">Intermediate</span>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20 flex flex-col">
                      <span className="text-xs text-blue-100">Focus</span>
                      <span className="font-medium">Hypertrophy</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="bg-white/20 hover:bg-white/30 text-white rounded-lg px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Details
                  </button>
                </div>
              </div>
            </div>

            {/* Phases */}
            {phases.map((phase) => (
              <div key={phase.id} className="flex flex-col rounded-xl bg-card shadow-sm border border-border">
                {/* Phase Header */}
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => togglePhase(phase.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ChevronDown className={`w-5 h-5 transition-transform ${phase.isExpanded ? "" : "-rotate-90"}`} />
                    </button>
                    <div>
                      <h3 className="text-lg font-bold text-card-foreground">{phase.name}</h3>
                      <p className="text-sm text-muted-foreground">{phase.description}</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Weekly Grid */}
                {phase.isExpanded && (
                  <>
                    <div className="p-6">
                      <div className="grid grid-cols-7 gap-4 min-w-[800px]">
                        {/* Column Headers */}
                        {dayNames.map((day) => (
                          <div key={day} className="text-center">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{day}</span>
                          </div>
                        ))}

                        {/* Days */}
                        {phase.days.map((day, idx) => (
                          <div key={idx} className="flex flex-col gap-2">
                            {day.type === "workout" ? (
                              <div className="group relative flex flex-col gap-2 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 hover:shadow-md transition-shadow cursor-pointer">
                                <div className="flex justify-between items-start">
                                  <span className="inline-flex items-center rounded bg-indigo-100 dark:bg-indigo-900 px-1.5 py-0.5 text-[10px] font-medium text-indigo-800 dark:text-indigo-200">
                                    {day.label}
                                  </span>
                                  <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                <p className="text-sm font-semibold text-card-foreground leading-tight">{day.workoutName}</p>
                                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {day.duration} min
                                </div>
                              </div>
                            ) : day.type === "rest" ? (
                              <div className="flex h-24 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 text-muted-foreground">
                                <Hotel className="w-5 h-5 mb-1" />
                                <span className="text-xs font-medium">Rest Day</span>
                              </div>
                            ) : (
                              <div className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                                <div className="size-8 rounded-full bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-card flex items-center justify-center mb-2 transition-colors">
                                  <Plus className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">Drop Workout</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Phase Footer */}
                    <div className="bg-muted/50 px-6 py-3 border-t border-border rounded-b-xl flex items-center justify-between">
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Total Workouts: {phase.days.filter(d => d.type === "workout").length}</span>
                        <span>Est. Time: {phase.days.filter(d => d.type === "workout").reduce((sum, d) => sum + (d.duration || 0), 0)} min</span>
                      </div>
                      <button className="text-xs font-medium text-primary hover:underline">Copy week to next week</button>
                    </div>
                  </>
                )}
              </div>
            ))}

            {/* Add Phase Button */}
            <button 
              onClick={addPhase}
              className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-transparent py-6 transition-all hover:border-primary hover:bg-card hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-lg font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add New Phase</span>
            </button>
          </div>
        </main>

        {/* Fixed Footer / Action Bar */}
        <div className="absolute bottom-0 right-0 left-0 md:left-[280px] bg-card/90 backdrop-blur-md border-t border-border px-8 py-4 z-20">
          <div className="flex items-center justify-between mx-auto max-w-[1280px]">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-500" />
              All changes saved
            </div>
            <div className="flex gap-4">
              <button className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
                Save as Draft
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors">
                <span>Assign to Clients</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
