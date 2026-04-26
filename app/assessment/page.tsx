"use client";

import { Search, User, Calendar, Ruler, Camera, RotateCcw } from "lucide-react";
import Image from "next/image";
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

const ASSESSMENT_DRAFT_KEY = "beshaped-coach-assessment-draft";

const CIRCUMFERENCE_FIELDS = [
  { key: "shoulder", label: "Shoulder" },
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "abdominal", label: "Abdominal" },
  { key: "hip", label: "Hip" },
  { key: "rightArm", label: "Right arm" },
  { key: "rightArmContracted", label: "Right arm contracted" },
  { key: "rightForearm", label: "Right forearm" },
  { key: "leftArm", label: "Left arm" },
  { key: "leftArmContracted", label: "Left arm contracted" },
  { key: "leftForearm", label: "Left forearm" },
  { key: "rightThigh", label: "Right thigh" },
  { key: "leftThigh", label: "Left thigh" },
  { key: "rightCalf", label: "Right calf" },
  { key: "leftCalf", label: "Left calf" },
] as const;

type CircumferenceKey = (typeof CIRCUMFERENCE_FIELDS)[number]["key"];

function emptyCircumferences(): Record<CircumferenceKey, string> {
  return Object.fromEntries(CIRCUMFERENCE_FIELDS.map((f) => [f.key, ""])) as Record<
    CircumferenceKey,
    string
  >;
}

type AssessmentDraftV1 = {
  v: 1;
  searchQuery: string;
  selectedClientId: string;
  assessmentDate: string;
  height: string;
  weight: string;
  age: string;
} & Record<CircumferenceKey, string> & {
    skinfolds: Record<string, string>;
  };

function defaultSkinfolds(): Record<string, string> {
  return Object.fromEntries(JACKSON_POLLOCK_SITES.map((s) => [s, ""]));
}

function mergeSkinfolds(stored: Record<string, string> | undefined): Record<string, string> {
  const base = defaultSkinfolds();
  if (!stored || typeof stored !== "object") return base;
  for (const site of JACKSON_POLLOCK_SITES) {
    if (typeof stored[site] === "string") base[site] = stored[site];
  }
  return base;
}

const BMI_CLASSIFICATION_ROWS = [
  { range: "0 – 18.49", classification: "Underweight" },
  { range: "18.5 – 24.99", classification: "Normal" },
  { range: "25 – 29.99", classification: "Overweight" },
  { range: "30 – 34.99", classification: "Obesity Class 1" },
  { range: "35 – 39.99", classification: "Obesity Class 2" },
  { range: "40 or higher", classification: "Obesity Class 3" },
] as const;

/** Brackets aligned with BMI_CLASSIFICATION_ROWS */
function classificationFromBmi(bmi: number): (typeof BMI_CLASSIFICATION_ROWS)[number]["classification"] {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  if (bmi < 35) return "Obesity Class 1";
  if (bmi < 40) return "Obesity Class 2";
  return "Obesity Class 3";
}

function readAssessmentDraft(): Partial<AssessmentDraftV1> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ASSESSMENT_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Partial<AssessmentDraftV1>;
  } catch {
    return null;
  }
}

export default function AssessmentPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
  const [circumferences, setCircumferences] = useState(emptyCircumferences);

  // Skinfold measurements (mm)
  const [skinfolds, setSkinfolds] = useState<Record<string, string>>(defaultSkinfolds);

  // Photos (not persisted — File objects cannot be stored in localStorage)
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoInputKey, setPhotoInputKey] = useState(0);

  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const d = readAssessmentDraft();
    if (d) {
      if (typeof d.searchQuery === "string") setSearchQuery(d.searchQuery);
      if (typeof d.selectedClientId === "string") setSelectedClientId(d.selectedClientId);
      if (typeof d.assessmentDate === "string") setAssessmentDate(d.assessmentDate);
      if (typeof d.height === "string") setHeight(d.height);
      if (typeof d.weight === "string") setWeight(d.weight);
      if (typeof d.age === "string") setAge(d.age);
      setCircumferences(() => {
        const next = emptyCircumferences();
        const raw = d as Record<string, unknown>;
        for (const { key } of CIRCUMFERENCE_FIELDS) {
          const val = raw[key];
          if (typeof val === "string") next[key] = val;
        }
        return next;
      });
      setSkinfolds(mergeSkinfolds(d.skinfolds));
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady || typeof window === "undefined") return;
    const payload: AssessmentDraftV1 = {
      v: 1,
      searchQuery,
      selectedClientId,
      assessmentDate,
      height,
      weight,
      age,
      ...circumferences,
      skinfolds,
    };
    try {
      localStorage.setItem(ASSESSMENT_DRAFT_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error("Failed to persist assessment draft:", err);
    }
  }, [
    draftReady,
    searchQuery,
    selectedClientId,
    assessmentDate,
    height,
    weight,
    age,
    circumferences,
    skinfolds,
  ]);

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
      fetchLastAssessment(selectedClientId);
    } else {
      setLastAssessmentDate(null);
    }
  }, [selectedClientId]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  /** BMI = weight (kg) / height (m)²; height form is in cm */
  const bmiFromStats = useMemo(() => {
    const hCm = parseFloat(height);
    const wKg = parseFloat(weight);
    if (
      !Number.isFinite(hCm) ||
      !Number.isFinite(wKg) ||
      hCm <= 0 ||
      wKg <= 0
    ) {
      return null;
    }
    const hM = hCm / 100;
    const bmi = wKg / (hM * hM);
    if (!Number.isFinite(bmi)) return null;
    return {
      display: bmi.toFixed(2),
      classification: classificationFromBmi(bmi),
    };
  }, [height, weight]);

  const bmiDisplay = bmiFromStats?.display ?? null;
  const bmiClassificationDisplay = bmiFromStats?.classification ?? null;

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

  const resetForm = () => {
    setSearchQuery("");
    setSelectedClientId("");
    setAssessmentDate(new Date().toISOString().split("T")[0]);
    setHeight("");
    setWeight("");
    setAge("");
    setCircumferences(emptyCircumferences());
    setSkinfolds(defaultSkinfolds());
    setPhotos([]);
    setPhotoInputKey((k) => k + 1);
    try {
      localStorage.removeItem(ASSESSMENT_DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />

      <main className="ml-[220px] min-h-dvh">
        <div className="p-8 w-full">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">Assessment</h1>
              <p className="text-sm text-muted-foreground">
                Record client assessments and track progress over time.
              </p>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex shrink-0 items-center justify-center gap-2 h-10 px-4 rounded-lg border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset form
            </button>
          </div>

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
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                  <div className="shrink-0">
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
                  </div>

                  <div className="min-w-0 flex-1 lg:max-w-sm">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      BMI classification (reference)
                    </p>
                    <div className="overflow-hidden rounded-md border border-foreground/25 dark:border-border">
                      <table className="w-full border-collapse text-center text-sm">
                        <thead>
                          <tr className="bg-pink-600 text-white dark:bg-pink-700">
                            <th className="border-b border-r border-white/25 px-3 py-2.5 font-semibold">
                              BMI
                            </th>
                            <th className="border-b border-white/25 px-3 py-2.5 font-semibold">
                              Classification
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-background text-foreground dark:bg-card dark:text-card-foreground">
                          {BMI_CLASSIFICATION_ROWS.map((row) => (
                            <tr
                              key={row.classification}
                              className="border-b border-foreground/15 last:border-b-0 dark:border-border"
                            >
                              <td className="border-r border-foreground/15 px-3 py-2 dark:border-border">
                                {row.range}
                              </td>
                              <td className="px-3 py-2">{row.classification}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
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
                    BMI
                  </label>
                  <input
                    type="text"
                    readOnly
                    aria-readonly="true"
                    value={bmiDisplay ?? ""}
                    placeholder="From height & weight"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/40 text-sm text-card-foreground cursor-default focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    BMI classification
                  </label>
                  <input
                    type="text"
                    readOnly
                    aria-readonly="true"
                    value={bmiClassificationDisplay ?? ""}
                    placeholder="From BMI"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted/40 text-sm text-card-foreground cursor-default focus:outline-none"
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
                {CIRCUMFERENCE_FIELDS.map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      {label}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 40"
                      value={circumferences[key]}
                      onChange={(e) =>
                        setCircumferences((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
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
                  key={photoInputKey}
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
                      <Image
                        src={URL.createObjectURL(file)}
                        alt={`Progress ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                        sizes="(max-width: 640px) 50vw, 25vw"
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
