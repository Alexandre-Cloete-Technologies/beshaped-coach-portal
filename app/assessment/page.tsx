"use client";

import { Search, ChevronDown, User, Calendar, Ruler, Camera } from "lucide-react";
import Sidebar from "../components/Sidebar";
import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Client {
  id: string;
  name: string;
  email: string;
}

const JACKSON_POLLOCK_SITES = [
  "Triceps",
  "Chest",
  "Subscapular",
  "Midaxillary",
  "Suprailiac",
  "Abdominal",
  "Thigh",
];

export default function AssessmentPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [assessmentDate, setAssessmentDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [lastAssessmentDate, setLastAssessmentDate] = useState<string | null>(null);
  const [loadingLastAssessment, setLoadingLastAssessment] = useState(false);

  // Basic stats
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");

  // Body circumferences (cm)
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [chest, setChest] = useState("");
  const [leftArm, setLeftArm] = useState("");
  const [rightArm, setRightArm] = useState("");
  const [leftThigh, setLeftThigh] = useState("");
  const [rightThigh, setRightThigh] = useState("");
  const [leftCalf, setLeftCalf] = useState("");
  const [rightCalf, setRightCalf] = useState("");

  // Skinfold measurements (mm)
  const [skinfolds, setSkinfolds] = useState<Record<string, string>>(
    Object.fromEntries(JACKSON_POLLOCK_SITES.map((s) => [s, ""]))
  );

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);

  const fetchClients = async () => {
    try {
      setLoadingClients(true);
      const usersSnapshot = await getDocs(collection(db, "users"));
      const fetched: Client[] = usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.displayName || data.username || "Unknown User",
          email: data.email || "No email",
        };
      });
      setClients(fetched);
    } catch (err) {
      console.error("Error fetching clients:", err);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchLastAssessment = async (userId: string) => {
    try {
      setLoadingLastAssessment(true);
      const assessmentsRef = collection(db, "assessments");
      const q = query(
        assessmentsRef,
        where("userId", "==", userId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const sorted = snapshot.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis?.() ?? 0;
          const bTime = b.data().createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
        const last = sorted[0];
        const createdAt = last.data().createdAt;
        if (createdAt?.toDate) {
          setLastAssessmentDate(createdAt.toDate().toISOString().split("T")[0]);
        } else if (createdAt) {
          setLastAssessmentDate(new Date(createdAt).toISOString().split("T")[0]);
        } else {
          setLastAssessmentDate(null);
        }
      } else {
        setLastAssessmentDate(null);
      }
    } catch (err) {
      console.error("Error fetching last assessment:", err);
      setLastAssessmentDate(null);
    } finally {
      setLoadingLastAssessment(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find((c) => c.id === selectedClientId);
      setSelectedClient(client || null);
      fetchLastAssessment(selectedClientId);
    } else {
      setSelectedClient(null);
      setLastAssessmentDate(null);
    }
  }, [selectedClientId, clients]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const updateSkinfold = (site: string, value: string) => {
    setSkinfolds((prev) => ({ ...prev, [site]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setPhotos((prev) => [...prev, ...Array.from(files)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-screen">
        <div className="p-8 max-w-4xl">
          <h1 className="text-2xl font-bold text-foreground mb-1">Assessment</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Record client assessments and track progress over time.
          </p>

          {/* Client Selection */}
          <section className="bg-card rounded-xl border border-border shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Client Selection
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Select Client
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-background text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-2"
                  />
                </div>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full h-10 pl-3 pr-10 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Choose a client...</option>
                  {loadingClients ? (
                    <option disabled>Loading...</option>
                  ) : (
                    filteredClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Assessment Date
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <input
                    type="date"
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    className="h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                {selectedClientId && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                      Last Assessment
                    </p>
                    {loadingLastAssessment ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : lastAssessmentDate ? (
                      <p className="text-sm font-medium text-card-foreground">
                        {lastAssessmentDate}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No previous assessment
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-8">
            {/* Basic Stats */}
            <section className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Basic Stats
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 175"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 72.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Age (years)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 32"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </section>

            {/* Body Circumferences */}
            <section className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Body Circumferences (cm)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Waist
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 82"
                    value={waist}
                    onChange={(e) => setWaist(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Hip
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 98"
                    value={hip}
                    onChange={(e) => setHip(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Chest
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 102"
                    value={chest}
                    onChange={(e) => setChest(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Left Arm
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 32"
                    value={leftArm}
                    onChange={(e) => setLeftArm(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Right Arm
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 32"
                    value={rightArm}
                    onChange={(e) => setRightArm(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Left Thigh
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 58"
                    value={leftThigh}
                    onChange={(e) => setLeftThigh(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Right Thigh
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 58"
                    value={rightThigh}
                    onChange={(e) => setRightThigh(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Left Calf
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 38"
                    value={leftCalf}
                    onChange={(e) => setLeftCalf(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Right Calf
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 38"
                    value={rightCalf}
                    onChange={(e) => setRightCalf(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </section>

            {/* Skinfold Measurements */}
            <section className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                Skinfold Measurements (mm) — Jackson-Pollock 7-Site
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {JACKSON_POLLOCK_SITES.map((site) => (
                  <div key={site}>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      {site}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 12"
                      value={skinfolds[site]}
                      onChange={(e) => updateSkinfold(site, e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Progress Photos */}
            <section className="bg-card rounded-xl border border-border shadow-sm p-6">
              <h2 className="text-lg font-semibold text-card-foreground mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Progress Photos
              </h2>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="photo-upload"
                />
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Camera className="w-12 h-12" />
                  <span className="text-sm font-medium">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs">PNG, JPG, WEBP up to 10MB</span>
                </label>
              </div>
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {photos.map((file, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted/30"
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Progress ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                      <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 truncate">
                        {file.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
