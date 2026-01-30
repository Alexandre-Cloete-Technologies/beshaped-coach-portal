"use client";

import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Search Input */}
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by name, program, or goal..."
          className="w-full h-12 pl-12 pr-4 rounded-xl border border-border bg-card text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        />
      </div>

      {/* Sort Dropdown */}
      {/* <button className="h-12 px-4 rounded-xl border border-border bg-card flex items-center gap-2 text-sm font-medium text-card-foreground hover:bg-accent transition-colors">
        <span className="text-muted-foreground">Sort:</span>
        <span>Most Active</span>
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button> */}

      {/* Filters Button */}
      <button className="h-12 px-5 rounded-xl border border-border bg-card flex items-center gap-2 text-sm font-medium text-card-foreground hover:bg-accent transition-colors">
        <SlidersHorizontal className="w-4 h-4" />
        Filters
      </button>
    </div>
  );
}
