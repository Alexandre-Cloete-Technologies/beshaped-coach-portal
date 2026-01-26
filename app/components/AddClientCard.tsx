"use client";

import { Plus } from "lucide-react";

interface AddClientCardProps {
  onClick?: () => void;
}

export default function AddClientCard({ onClick }: AddClientCardProps) {
  return (
    <button 
      onClick={onClick}
      className="bg-card rounded-2xl border-2 border-dashed border-border p-5 min-h-[340px] flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-accent/30 transition-all group"
    >
      <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Plus className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="text-center">
        <p className="font-medium text-card-foreground">Add New Client</p>
        <p className="text-sm text-muted-foreground">Assign program & schedule</p>
      </div>
    </button>
  );
}
