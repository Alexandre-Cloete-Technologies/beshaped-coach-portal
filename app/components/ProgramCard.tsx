"use client";

import { Calendar, Layers, Edit, Copy, Trash2 } from "lucide-react";

export interface ProgramData {
  id: string;
  name: string;
  description?: string;
  totalDuration: number; // weeks
  phasesCount: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  focusAreas: string[];
  isTemplate?: boolean;
  activeClients?: number;
  clientAvatars?: string[];
  updatedAt?: string;
  createdBy?: string;
}

interface ProgramCardProps {
  program: ProgramData;
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function ProgramCard({ 
  program, 
  onView, 
  onEdit, 
  onDuplicate, 
  onDelete 
}: ProgramCardProps) {
  const getBadgeStyle = () => {
    if (program.isTemplate) {
      return "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-800";
    }
    return "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 border-purple-100 dark:border-purple-800";
  };

  return (
    <article className="group relative flex flex-col bg-card rounded-xl border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      <div className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 pr-2">
            <h3 className="text-lg font-bold text-card-foreground leading-tight">{program.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {program.updatedAt || (program.createdBy ? `Created by ${program.createdBy}` : "")}
            </p>
          </div>
        </div>

        {/* Meta Data Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">{program.totalDuration} Weeks</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-4 h-4" />
            <span className="text-sm font-medium">{program.phasesCount} {program.phasesCount === 1 ? "Phase" : "Phases"}</span>
          </div>
        </div>

        {/* Focus & Stats */}
        <div className="mb-6 space-y-3">

          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Active Clients</span>
            <div className="flex items-center mt-1 gap-2">
              {program.clientAvatars && program.clientAvatars.length > 0 ? (
                <>
                  <div className="flex -space-x-2">
                    {program.clientAvatars.slice(0, 3).map((avatar, idx) => (
                      <div 
                        key={idx}
                        className="size-6 rounded-full ring-2 ring-card bg-cover bg-center bg-gradient-to-br from-blue-400 to-indigo-500"
                        style={avatar ? { backgroundImage: `url("${avatar}")` } : {}}
                      />
                    ))}
                  </div>
                  {(program.activeClients || 0) > 3 && (
                    <span className="text-xs font-medium text-muted-foreground">
                      +{(program.activeClients || 0) - 3} more
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs font-medium text-muted-foreground">
                  {program.activeClients || 0} clients
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto pt-4 border-t border-border flex items-center gap-2">
          <button 
            onClick={() => onView?.(program.id)}
            className="flex-1 bg-card border border-border hover:border-primary hover:text-primary py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            View
          </button>
          <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              onClick={() => onEdit?.(program.id)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" 
              title="Edit"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onDuplicate?.(program.id)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors" 
              title="Duplicate"
            >
              <Copy className="w-5 h-5" />
            </button>
            <button 
              onClick={() => onDelete?.(program.id)}
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" 
              title="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
