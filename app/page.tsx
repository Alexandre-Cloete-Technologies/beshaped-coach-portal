import { Plus } from "lucide-react";
import Sidebar from "./components/Sidebar";
import StatsCard from "./components/StatsCard";
import SearchBar from "./components/SearchBar";
import ClientCard, { ClientData } from "./components/ClientCard";
import AddClientCard from "./components/AddClientCard";
import Pagination from "./components/Pagination";

// Mock client data
const mockClients: ClientData[] = [
  {
    id: "1",
    name: "Tom Holland",
    photo: "/avatars/tom.jpg",
    avatarGradient: "bg-gradient-to-br from-blue-500 to-indigo-600",
    program: "Hypertrophy",
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
  },
  {
    id: "2",
    name: "Sarah Miller",
    photo: "/avatars/sarah.jpg",
    avatarGradient: "bg-gradient-to-br from-rose-400 to-pink-600",
    program: "Weight Loss",
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
  },
  {
    id: "3",
    name: "David Chen",
    photo: "/avatars/david.jpg",
    avatarGradient: "bg-gradient-to-br from-amber-400 to-orange-600",
    program: "Strength",
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
  },
  {
    id: "4",
    name: "Anna Smith",
    photo: "/avatars/anna.jpg",
    avatarGradient: "bg-gradient-to-br from-emerald-400 to-teal-600",
    program: "Mobility",
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
  },
  {
    id: "5",
    name: "Jessica Lee",
    photo: "/avatars/jessica.jpg",
    avatarGradient: "bg-gradient-to-br from-violet-400 to-purple-600",
    program: "CrossFit",
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
  },
  {
    id: "6",
    name: "Mark Evans",
    photo: "/avatars/mark.jpg",
    avatarGradient: "bg-gradient-to-br from-slate-400 to-slate-600",
    program: "Rehab",
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
  },
];

export default function Home() {
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
            <button className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="w-5 h-5" />
              Add New Client
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <StatsCard type="active" value={24} label="Total Active" />
            <StatsCard type="attention" value={3} label="Needs Attention" />
            <StatsCard type="compliance" value="87%" label="Avg. Compliance" />
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <SearchBar />
          </div>

          {/* Client Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
            {mockClients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
            <AddClientCard />
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
    </div>
  );
}
