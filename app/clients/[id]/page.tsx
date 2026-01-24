"use client";

import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Edit, 
  Archive,
  LayoutGrid,
  History,
  TrendingUp,
  Apple,
  Settings,
  ArrowRight,
  Weight,
  Moon,
  Droplet,
  Dumbbell,
  Utensils,
  Scale,
  MessageSquare,
  FileText,
  Calendar,
  Filter,
  Flame
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Link from "next/link";

// Mock client data
const clientData = {
  id: "1",
  name: "Jane Doe",
  email: "janedoe@email.com",
  phone: "+1 (555) 123-4567",
  avatar: "/avatars/jane.jpg",
  avatarGradient: "bg-gradient-to-br from-rose-400 to-pink-600",
  isOnline: true,
  memberSince: "Jan 2023",
  streak: 12,
  currentProgram: {
    name: "Hypertrophy Phase 2",
    image: "/programs/hypertrophy.jpg",
    goal: "Muscle Gain",
    intensity: "High Intensity",
    currentWeek: 3,
    totalWeeks: 8,
    progress: 65,
    status: "ACTIVE",
    nextWorkout: "Lower Body Power",
  },
  stats: {
    weight: {
      current: 142.5,
      unit: "lbs",
      change: 1.2,
      period: "this week",
    },
    sleep: {
      average: "7h 12m",
      period: "Last 7 days average",
    },
    water: {
      current: 2.1,
      unit: "L",
      goalMet: true,
    },
  },
  recentActivity: [
    {
      id: 1,
      type: "workout",
      title: 'Completed "Upper Body Power"',
      description: "Personal Best on Bench Press! 🔥",
      timestamp: "Today, 8:00 AM",
      icon: Dumbbell,
    },
    {
      id: 2,
      type: "nutrition",
      title: "Logged Nutrition",
      description: "2,400 kcal • 180g Protein • 220g Carbs",
      timestamp: "Yesterday, 8:00 PM",
      icon: Utensils,
    },
    {
      id: 3,
      type: "weight",
      title: "Weight Check-in",
      description: "Recorded 142.5 lbs ( -0.5 lbs )",
      timestamp: "Yesterday, 7:30 AM",
      icon: Scale,
    },
  ],
  upcoming: [
    {
      id: 1,
      day: "MON",
      date: 14,
      title: "Lower Body Power",
      time: "09:00 AM - 10:30 AM",
    },
    {
      id: 2,
      day: "WED",
      date: 15,
      title: "Active Recovery",
      time: "Any time",
    },
    {
      id: 3,
      day: "THU",
      date: 16,
      title: "Check-in Call",
      time: "04:00 PM (Zoom)",
    },
  ],
  coachNote: {
    text: "Client is experiencing mild knee pain. Monitor squat depth in next session.",
    timestamp: "2 hours ago",
  },
};

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "workout-history", label: "Workout History", icon: History },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "nutrition", label: "Nutrition", icon: Apple },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function ClientDetailPage() {
  const activeTab = "overview";

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
                  <div className={`w-24 h-24 rounded-2xl ${clientData.avatarGradient} flex items-center justify-center`}>
                    <span className="text-white text-2xl font-semibold">
                      {clientData.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  {clientData.isOnline && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-4 border-card rounded-full" />
                  )}
                </div>

                {/* Client Info */}
                <div>
                  <h1 className="text-2xl font-bold text-foreground mb-2">{clientData.name}</h1>
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {clientData.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      {clientData.phone}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                      📅 Member since {clientData.memberSince}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400">
                      🔥 {clientData.streak} Day Streak
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button className="h-9 px-4 rounded-lg border border-border bg-card flex items-center gap-2 text-sm font-medium text-card-foreground hover:bg-accent transition-colors">
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button className="h-9 px-4 rounded-lg border border-border bg-card flex items-center gap-2 text-sm font-medium text-card-foreground hover:bg-accent transition-colors">
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="col-span-2 space-y-6">
              {/* Current Program */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Current Program</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View Full Plan
                  </button>
                </div>

                <div className="flex gap-4">
                  {/* Program Image */}
                  <div className="w-48 h-48 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex-shrink-0 overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop" 
                      alt="Program"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Program Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {clientData.currentProgram.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Goal: {clientData.currentProgram.goal} • {clientData.currentProgram.intensity}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                        {clientData.currentProgram.status}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          Week {clientData.currentProgram.currentWeek} of {clientData.currentProgram.totalWeeks}
                        </span>
                        <span className="font-semibold text-blue-600">
                          {clientData.currentProgram.progress}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${clientData.currentProgram.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">NEXT WORKOUT</p>
                        <p className="text-sm font-semibold text-foreground">
                          {clientData.currentProgram.nextWorkout}
                        </p>
                      </div>
                      <button className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 flex items-center justify-center transition-colors">
                        <ArrowRight className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4">
                {/* Weight */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Weight className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Weight</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">
                    {clientData.stats.weight.current} <span className="text-base font-normal text-muted-foreground">{clientData.stats.weight.unit}</span>
                  </p>
                  <p className="text-xs text-emerald-600 flex items-center gap-1">
                    ↓ {clientData.stats.weight.change} lbs {clientData.stats.weight.period}
                  </p>
                </div>

                {/* Sleep */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Moon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Avg Sleep</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">
                    {clientData.stats.sleep.average}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {clientData.stats.sleep.period}
                  </p>
                </div>

                {/* Water */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Droplet className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Water</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mb-1">
                    {clientData.stats.water.current} <span className="text-base font-normal text-muted-foreground">{clientData.stats.water.unit}</span>
                  </p>
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    💧 Goal met today
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {clientData.recentActivity.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground mb-0.5">
                            {activity.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {activity.timestamp}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <button className="w-full h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                    <MessageSquare className="w-4 h-4" />
                    Send Message
                  </button>
                  <button className="w-full h-10 px-4 rounded-lg border border-border bg-card text-sm font-medium text-card-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" />
                    Log Note
                  </button>
                  <button className="w-full h-10 px-4 rounded-lg border border-border bg-card text-sm font-medium text-card-foreground hover:bg-accent transition-colors flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Assign Workout
                  </button>
                </div>
              </div>

              {/* Upcoming */}
              <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Upcoming</h2>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    See All
                  </button>
                </div>

                <div className="space-y-3">
                  {clientData.upcoming.map((event) => (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">
                          {event.day}
                        </span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400 leading-none">
                          {event.date}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground mb-0.5">
                          {event.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {event.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coach Note */}
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3 h-3 text-amber-700 dark:text-amber-500" />
                  </div>
                  <span className="text-xs font-semibold text-amber-900 dark:text-amber-400 uppercase">
                    Coach Note
                  </span>
                </div>
                <p className="text-sm text-amber-900 dark:text-amber-300 italic">
                  "{clientData.coachNote.text}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
