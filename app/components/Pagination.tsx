"use client";

// import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange?: (page: number) => void;
}

export default function Pagination({ 
  currentPage, 
  // totalPages, 
  totalItems, 
  itemsPerPage,
  // onPageChange 
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between py-4">
      {/* <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-card-foreground">{startItem}-{endItem}</span> of{" "}
        <span className="font-medium text-card-foreground">{totalItems}</span> clients
      </p> */}
      
      <div className="flex items-center gap-2">
        {/* <button
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-10 px-4 rounded-lg border border-border bg-card text-sm font-medium text-card-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <button
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-10 px-4 rounded-lg border border-border bg-card text-sm font-medium text-card-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button> */}
      </div>
    </div>
  );
}
