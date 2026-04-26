"use client";

import { ArrowRight, Award, Plus, X } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  Timestamp,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ProgressProps {
  clientId: string;
}

interface BodyWeightLog {
  id: string;
  weight: number;
  weightUnit?: string;
  photoTakenDate?: unknown;
  photos?: { url: string }[];
}

/** Normalize Firestore Timestamp / date-like field to a `Date` */
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

function mapDocToBodyWeightLog(d: QueryDocumentSnapshot): BodyWeightLog {
  const data = d.data() as Record<string, unknown>;
  return {
    id: d.id,
    weight: typeof data.weight === "number" ? data.weight : Number(data.weight) || 0,
    weightUnit: typeof data.weightUnit === "string" ? data.weightUnit : undefined,
    photoTakenDate: data.photoTakenDate,
    photos: data.photos as BodyWeightLog["photos"],
  };
}

export default function Progress({ clientId }: ProgressProps) {
  const [selectedLift, setSelectedLift] = useState("Back Squat");
  const [weightLogs, setWeightLogs] = useState<BodyWeightLog[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeightLogs = async () => {
        if (!clientId) return;
        try {
            // Using logic from page.tsx: fetch all and sort client-side to avoid index issues
            const logsRef = collection(db, "bodyWeightLogs");
            const q = query(logsRef, where("userId", "==", doc(db, "users", clientId)));
            const snapshot = await getDocs(q);
            
            const logs: BodyWeightLog[] = snapshot.docs.map((docSnap) =>
              mapDocToBodyWeightLog(docSnap)
            );
            
            // Sort by date ascending
            logs.sort((a, b) => {
                const dateA = toDateValue(a.photoTakenDate);
                const dateB = toDateValue(b.photoTakenDate);
                return dateA.getTime() - dateB.getTime();
            });
            
            setWeightLogs(logs);
        } catch (err) {
            console.error("Error fetching weight logs:", err);
        }
    };
    fetchWeightLogs();
  }, [clientId]);

  const { currentWeight, weightChange, weightUnit, weightParams } = useMemo(() => {
      if (weightLogs.length === 0) return { currentWeight: null, weightChange: null, weightUnit: "kg", weightParams: null };

      const currentLog = weightLogs[weightLogs.length - 1];
      const current = currentLog.weight;
      const unit = currentLog.weightUnit || "kg"; // Default to kg if missing.
      // Actually, let's just use what's in the db.
      
      // Compare with oldest log in the set
      const initial = weightLogs[0].weight;
      const change = current - initial;

      // Prepare Chart Data
      // We want to map the logs to SVG coordinates (600x100)
      // X axis: Time
      // Y axis: Weight
      
      const weights = weightLogs.map(l => l.weight);
      const minWeight = Math.min(...weights) - 2; // Buffer
      const maxWeight = Math.max(...weights) + 2; // Buffer
      const weightRange = maxWeight - minWeight || 1; // Avoid division by zero

      const startTime = toDateValue(weightLogs[0].photoTakenDate).getTime();
      const endTime = toDateValue(weightLogs[weightLogs.length - 1].photoTakenDate).getTime();
      const timeRange = endTime - startTime || 1;

      const points = weightLogs.map((log) => {
          const time = toDateValue(log.photoTakenDate).getTime();
          
          // X coordinate (0 to 600)
          const x = ((time - startTime) / timeRange) * 600;
          
          // Y coordinate (0 to 100), Note: SVG Y is inverted (0 is top)
          // Value normalized 0-1: (val - min) / range
          // SVG Y: 100 - (normalized * 100)
          const y = 100 - (((log.weight - minWeight) / weightRange) * 100);
          
          const d = toDateValue(log.photoTakenDate);
          return { x, y, val: log.weight, date: d.toLocaleDateString(), unit: log.weightUnit || unit };
      });

      // Generate Line Path
      const linePath = points.length > 1 
        ? `M${points[0].x},${points[0].y} ` + points.slice(1).map(p => `L${p.x},${p.y}`).join(" ")
        : points.length === 1 ? `M0,${points[0].y} L600,${points[0].y}` : "";

      // Area Path is essentially line path
       const areaPath = linePath;
      
      // Generate Labels (approximate distribution)
      // Pick ~5 labels evenly distributed
      const labels = [];
      if (weightLogs.length > 0) {
        // Just take simple approach: Start, 25%, 50%, 75%, End
        const steps = 5;
        for (let i = 0; i < steps; i++) {
             const t = startTime + (timeRange * (i / (steps - 1)));
             labels.push(new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}));
        }
      }

      return {
          currentWeight: current,
          weightChange: change,
          weightUnit: unit,
          weightParams: {
              min: minWeight,
              max: maxWeight,
              points,
              linePath,
              areaPath,
              labels
          }
      };

  }, [weightLogs]);

  const latestPhotoLog = useMemo(() => {
    if (!weightLogs.length) return null;
    const logsWithPhotos = weightLogs.filter(l => l.photos && l.photos.length > 0);
    return logsWithPhotos.length > 0 ? logsWithPhotos[logsWithPhotos.length - 1] : null;
  }, [weightLogs]);

  
  return (
    <>
      <div className="w-full min-w-0 flex flex-col gap-6">
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

              {/* Left Column: Large Latest Photo */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-card-foreground">Latest Photo</span>
                  {latestPhotoLog && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {toDateValue(latestPhotoLog.photoTakenDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  )}
                </div>
                
                {latestPhotoLog && latestPhotoLog.photos?.[0] ? (
                  <div 
                    className="aspect-[3/4] bg-muted rounded-lg border-2 border-border flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer bg-cover bg-center hover:border-primary transition-colors"
                    style={{ backgroundImage: `url(${latestPhotoLog.photos![0].url})` }}
                    onClick={() => setSelectedImage(latestPhotoLog.photos![0].url)}
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white text-xl font-bold drop-shadow-md">
                        {toDateValue(latestPhotoLog.photoTakenDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-muted rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center relative overflow-hidden">
                    <span className="text-sm text-muted-foreground font-medium">No Photo Uploaded</span>
                  </div>
                )}
              </div>

              {/* Right Column: Grid of Smaller Photos */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-card-foreground">Recent Photos</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Last 30 Days
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   {/* Photo 1 */}
                   <div 
                     className="aspect-[3/4] bg-muted rounded-lg relative overflow-hidden group cursor-pointer"
                     onClick={() => setSelectedImage("https://images.unsplash.com/photo-1549476464-37392f717541?auto=format&fit=crop&q=80&w=300&h=400")}
                   >
                      <Image
                        src="https://images.unsplash.com/photo-1549476464-37392f717541?auto=format&fit=crop&q=80&w=300&h=400"
                        alt="Progress Photo"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 150px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/50 to-indigo-500/50 flex items-center justify-center">
                         <span className="text-white text-xs font-medium drop-shadow-md">Jun 20</span>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                   </div>
                   {/* Photo 2 */}
                   <div 
                     className="aspect-[3/4] bg-muted rounded-lg relative overflow-hidden group cursor-pointer"
                     onClick={() => setSelectedImage("https://images.unsplash.com/photo-1550259979-ed79b48d2a30?auto=format&fit=crop&q=80&w=300&h=400")}
                   >
                      <Image
                        src="https://images.unsplash.com/photo-1550259979-ed79b48d2a30?auto=format&fit=crop&q=80&w=300&h=400"
                        alt="Progress Photo"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 150px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/50 to-teal-500/50 flex items-center justify-center">
                         <span className="text-white text-xs font-medium drop-shadow-md">Jun 15</span>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                   </div>
                   {/* Photo 3 */}
                   <div 
                     className="aspect-[3/4] bg-muted rounded-lg relative overflow-hidden group cursor-pointer"
                     onClick={() => setSelectedImage("https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=300&h=400")}
                   >
                      <Image
                        src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=300&h=400"
                        alt="Progress Photo"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 150px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-400/50 to-red-500/50 flex items-center justify-center">
                         <span className="text-white text-xs font-medium drop-shadow-md">Jun 10</span>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                   </div>
                   {/* Photo 4 */}
                   <div 
                     className="aspect-[3/4] bg-muted rounded-lg relative overflow-hidden group cursor-pointer"
                     onClick={() => setSelectedImage("https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=300&h=400")}
                   >
                      <Image
                        src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=300&h=400"
                        alt="Progress Photo"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 150px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-400/50 to-pink-500/50 flex items-center justify-center">
                         <span className="text-white text-xs font-medium drop-shadow-md">Jun 05</span>
                      </div>
                       <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                   </div>
                </div>
              </div>
            </div>
          </div>
          {/* Bodyweight History Chart */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-card-foreground text-lg font-bold">Bodyweight History</h3>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium uppercase">Current</span>
                  <span className="text-xl font-bold text-card-foreground">
                    {currentWeight !== null ? currentWeight : "N/A"} <span className="text-sm font-medium text-muted-foreground">{weightUnit || "kg"}</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground font-medium uppercase">Change</span>
                  {weightChange !== null ? (
                      <span className={`text-xl font-bold ${weightChange > 0 ? "text-red-500" : "text-emerald-600"}`}>
                      {weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">{weightUnit || "kg"}</span>
                      </span>
                  ) : (
                      <span className="text-xl font-bold text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </div>
  
            {/* Chart */}
            <div className="w-full h-64 relative">
               {weightParams ? (
                   <>
                      <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-muted-foreground text-right pr-2">
                      {/* Y-axis labels dynamically generated */}
                      {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i}>{(weightParams.max - (i * (weightParams.max - weightParams.min) / 4)).toFixed(0)}</span>
                      ))}
                      </div>
                      <div className="absolute left-12 right-0 top-0 bottom-8">
                      <div className="w-full h-full flex flex-col justify-between">
                          {[...Array(5)].map((_, i) => (
                              <div key={i} className="w-full h-px bg-border"></div>
                          ))}
                      </div>
                      <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox="0 0 600 100"
                          preserveAspectRatio="none"
                      >
                          <defs>
                          <linearGradient id="bodyweight-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
                          </linearGradient>
                          </defs>
                          {/* Area fill */}
                          <path
                          d={`${weightParams.areaPath} L600,100 L0,100 Z`}
                          fill="url(#bodyweight-gradient)"
                          />
                          {/* Line */}
                          <path
                          d={weightParams.linePath}
                          fill="none"
                          stroke="rgb(59, 130, 246)"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          />
                          {/* Data points */}
                          {weightParams.points.map((p, i) => (
                               <circle key={i} className="fill-card stroke-primary transition-all duration-300 hover:r-6" cx={p.x} cy={p.y} r="4" strokeWidth="2.5">
                                   <title>{p.date} - {p.val} lbs</title>
                               </circle>
                          ))}
                      </svg>
                      </div>
                      <div className="absolute left-12 right-0 bottom-0 flex justify-between text-xs text-muted-foreground px-2">
                          {weightParams.labels.map((label, i) => (
                              <span key={i}>{label}</span>
                          ))}
                      </div>
                   </>
               ) : (
                   <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                       No bodyweight data available
                   </div>
               )}
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
            {/* <div className="bg-card rounded-xl p-6 border border-border flex flex-col">
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
            </div> */}
  
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
  
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl w-full min-h-[200px] h-[min(90vh,900px)]">
            <button 
              className="absolute -top-12 right-0 text-white hover:text-gray-300 p-2"
              onClick={() => setSelectedImage(null)}
            >
              <span className="sr-only">Close</span>
              <X className="w-8 h-8" />
            </button>
            <Image
              src={selectedImage}
              alt="Full screen progress"
              unoptimized
              fill
              className="object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
}
