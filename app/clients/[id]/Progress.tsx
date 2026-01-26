"use client";

import { ArrowRight, Award, Plus } from "lucide-react";
import { useState } from "react";

export default function Progress() {
  const [selectedLift, setSelectedLift] = useState("Back Squat");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Main Content */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* Bodyweight History Chart */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-card-foreground text-lg font-bold">Bodyweight History</h3>
              <p className="text-sm text-muted-foreground">Past 6 months</p>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium uppercase">Current</span>
                <span className="text-xl font-bold text-card-foreground">
                  142.5 <span className="text-sm font-medium text-muted-foreground">lbs</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground font-medium uppercase">Change</span>
                <span className="text-xl font-bold text-green-600">
                  -8.4 <span className="text-sm font-medium text-muted-foreground">lbs</span>
                </span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-64 relative">
            <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-muted-foreground text-right pr-2">
              <span>160</span>
              <span>155</span>
              <span>150</span>
              <span>145</span>
              <span>140</span>
            </div>
            <div className="absolute left-12 right-0 top-0 bottom-8">
              <div className="w-full h-full flex flex-col justify-between">
                <div className="w-full h-px bg-border"></div>
                <div className="w-full h-px bg-border"></div>
                <div className="w-full h-px bg-border"></div>
                <div className="w-full h-px bg-border"></div>
                <div className="w-full h-px bg-border"></div>
              </div>
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 600 100"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="bodyweight-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path
                  d="M0,20 L100,30 L200,45 L300,65 L400,75 L500,85 L600,85 L600,100 L0,100 Z"
                  fill="url(#bodyweight-gradient)"
                />
                {/* Line */}
                <path
                  d="M0,20 L100,30 L200,45 L300,65 L400,75 L500,85 L600,85"
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                {/* Data points */}
                <circle className="fill-card stroke-primary" cx="0" cy="20" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-primary" cx="100" cy="30" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-primary" cx="200" cy="45" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-primary" cx="300" cy="65" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-primary" cx="400" cy="75" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-primary" cx="500" cy="85" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-primary" cx="600" cy="85" r="4" strokeWidth="2.5" />
              </svg>
            </div>
            <div className="absolute left-12 right-0 bottom-0 flex justify-between text-xs text-muted-foreground">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
            </div>
          </div>
        </div>

        {/* Progress Photos */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-card-foreground text-lg font-bold">Progress Photos</h3>
            <button className="text-primary text-sm font-semibold hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Photo */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-card-foreground">Before</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Jan 15, 2023
                </span>
              </div>
              <div className="aspect-[3/4] bg-muted rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-primary transition-colors">
                <div className="text-4xl text-muted-foreground mb-2">📷</div>
                <span className="text-sm text-muted-foreground">Front Pose</span>
              </div>
            </div>

            {/* Current Photo */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-card-foreground">Current</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Jun 15, 2023
                </span>
              </div>
              <div className="aspect-[3/4] bg-muted rounded-lg relative overflow-hidden group cursor-pointer bg-cover bg-center">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">Progress Photo</span>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-white/20 backdrop-blur-sm p-2 rounded-full text-white">
                    <span className="text-2xl">🔍</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Lifts Performance */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <h3 className="text-card-foreground text-lg font-bold">Key Lifts Performance</h3>
            <div className="flex items-center gap-2">
              <select
                className="bg-muted border-none text-sm font-medium rounded-lg text-card-foreground py-2 pl-3 pr-8 focus:ring-1 focus:ring-ring cursor-pointer"
                value={selectedLift}
                onChange={(e) => setSelectedLift(e.target.value)}
              >
                <option>Back Squat</option>
                <option>Bench Press</option>
                <option>Deadlift</option>
                <option>Overhead Press</option>
              </select>
            </div>
          </div>

          {/* Chart */}
          <div className="w-full h-56 relative">
            <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-muted-foreground text-right pr-2">
              <span>225</span>
              <span>200</span>
              <span>175</span>
              <span>150</span>
              <span>125</span>
            </div>
            <div className="absolute left-12 right-0 top-0 bottom-8">
              <div className="w-full h-full flex flex-col justify-between">
                <div className="w-full h-px bg-border"></div>
                <div className="w-full h-px bg-border"></div>
                <div className="w-full h-px bg-border"></div>
                <div className="w-full h-px bg-border"></div>
                <div className="w-full h-px bg-border"></div>
              </div>
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 600 100"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="lift-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <path
                  d="M0,90 L100,80 L200,75 L300,50 L400,40 L500,20 L600,20 L600,100 L0,100 Z"
                  fill="url(#lift-gradient)"
                />
                {/* Line */}
                <path
                  d="M0,90 L100,80 L200,75 L300,50 L400,40 L500,20 L600,20"
                  fill="none"
                  stroke="#f59e0b"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
                {/* Data points */}
                <circle className="fill-card stroke-orange-500" cx="0" cy="90" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-orange-500" cx="100" cy="80" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-orange-500" cx="200" cy="75" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-orange-500" cx="300" cy="50" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-orange-500" cx="400" cy="40" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-orange-500" cx="500" cy="20" r="4" strokeWidth="2.5" />
                <circle className="fill-card stroke-orange-500" cx="600" cy="20" r="4" strokeWidth="2.5" />
              </svg>
            </div>
            <div className="absolute left-12 right-0 bottom-0 flex justify-between text-xs text-muted-foreground">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Volume Load & Personal Records */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Volume Load */}
          <div className="bg-card rounded-xl p-6 border border-border flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-card-foreground text-lg font-bold">Volume Load</h3>
              <span className="text-xs text-muted-foreground">Weekly Total (lbs)</span>
            </div>
            <div className="flex-1 flex items-end justify-between gap-2 h-48 pt-4">
              <div className="flex flex-col items-center gap-2 flex-1 group">
                <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-sm h-[40%] group-hover:bg-primary transition-colors"></div>
                <span className="text-xs text-muted-foreground">W1</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 group">
                <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-sm h-[55%] group-hover:bg-primary transition-colors"></div>
                <span className="text-xs text-muted-foreground">W2</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 group">
                <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-sm h-[45%] group-hover:bg-primary transition-colors"></div>
                <span className="text-xs text-muted-foreground">W3</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 group">
                <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-sm h-[70%] group-hover:bg-primary transition-colors"></div>
                <span className="text-xs text-muted-foreground">W4</span>
              </div>
              <div className="flex flex-col items-center gap-2 flex-1 group">
                <div className="w-full bg-primary rounded-t-sm h-[85%] relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    45,200 lbs
                  </div>
                </div>
                <span className="text-xs text-card-foreground font-semibold">W5</span>
              </div>
            </div>
          </div>

          {/* Personal Records */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-card-foreground text-lg font-bold">Personal Records</h3>
              <button className="text-primary hover:text-blue-700">
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {/* PR 1 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-card-foreground">Back Squat</p>
                    <p className="text-xs text-muted-foreground">Jun 12, 2023</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-card-foreground">225 lbs</p>
                  <p className="text-xs text-muted-foreground">1 Rep Max</p>
                </div>
              </div>

              {/* PR 2 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-card-foreground">Deadlift</p>
                    <p className="text-xs text-muted-foreground">May 28, 2023</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-card-foreground">315 lbs</p>
                  <p className="text-xs text-muted-foreground">3 Reps</p>
                </div>
              </div>

              {/* PR 3 */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-500">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-card-foreground">Pull Ups</p>
                    <p className="text-xs text-muted-foreground">May 15, 2023</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-card-foreground">12 Reps</p>
                  <p className="text-xs text-muted-foreground">Bodyweight</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Sidebar (same as overview) */}
      <div className="flex flex-col gap-6">
        {/* Quick Actions */}
        <div className="bg-card rounded-xl p-5 border border-border sticky top-24">
          <h3 className="text-card-foreground text-lg font-bold mb-4">Quick Actions</h3>
          <div className="flex flex-col gap-3">
            <button className="flex items-center justify-center gap-2 w-full h-11 bg-primary hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
              💬 Send Message
            </button>
            <button className="flex items-center justify-center gap-2 w-full h-11 bg-card border border-border font-semibold rounded-lg hover:bg-accent transition-colors">
              📝 Log Note
            </button>
            <button className="flex items-center justify-center gap-2 w-full h-11 bg-card border border-border font-semibold rounded-lg hover:bg-accent transition-colors">
              ✅ Assign Workout
            </button>
          </div>
        </div>

        {/* Upcoming */}
        <div className="bg-card rounded-xl p-5 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-card-foreground text-lg font-bold">Upcoming</h3>
            <a className="text-xs font-semibold text-primary hover:underline" href="#">
              See All
            </a>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-start">
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg p-2 flex flex-col items-center min-w-[50px]">
                <span className="text-xs font-bold uppercase">Mon</span>
                <span className="text-lg font-bold leading-none">14</span>
              </div>
              <div>
                <p className="text-sm font-bold text-card-foreground">Lower Body Power</p>
                <p className="text-xs text-muted-foreground">09:00 AM - 10:30 AM</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg p-2 flex flex-col items-center min-w-[50px]">
                <span className="text-xs font-bold uppercase">Wed</span>
                <span className="text-lg font-bold leading-none">15</span>
              </div>
              <div>
                <p className="text-sm font-bold text-card-foreground">Active Recovery</p>
                <p className="text-xs text-muted-foreground">Any time</p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg p-2 flex flex-col items-center min-w-[50px]">
                <span className="text-xs font-bold uppercase">Thu</span>
                <span className="text-lg font-bold leading-none">16</span>
              </div>
              <div>
                <p className="text-sm font-bold text-card-foreground">Check-in Call</p>
                <p className="text-xs text-muted-foreground">04:00 PM (Zoom)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Coach Note */}
        <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-xl p-5 border border-yellow-100 dark:border-yellow-900/30">
          <div className="flex items-center gap-2 mb-2 text-yellow-800 dark:text-yellow-500">
            <span className="text-xl">📋</span>
            <h3 className="text-sm font-bold uppercase tracking-wide">Coach Note</h3>
          </div>
          <p className="text-sm text-card-foreground italic">
            "Client is experiencing mild knee pain. Monitor squat depth in next session."
          </p>
        </div>
      </div>
    </div>
  );
}
