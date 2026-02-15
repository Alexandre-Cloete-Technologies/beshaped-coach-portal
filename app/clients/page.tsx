"use client";

import { Plus, Search, SlidersHorizontal, MoreVertical } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Pagination from "../components/Pagination";
import AddClientModal from "../components/AddClientModal";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";



const statusColors = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  Onboarding: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  Inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const engagementConfig = {
  "Very High": { dots: 3, color: "bg-emerald-500" },
  High: { dots: 3, color: "bg-emerald-500" },
  Medium: { dots: 2, color: "bg-amber-500" },
  Low: { dots: 1, color: "bg-red-500" },
};

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersCollection = collection(db, "users");
      const usersSnapshot = await getDocs(usersCollection);
      
      const fetchedUsers = await Promise.all(usersSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        
        // Generate avatar gradient based on user ID
        const gradients = [
          "bg-gradient-to-br from-rose-400 to-pink-600",
          "bg-gradient-to-br from-purple-400 to-purple-600",
          "bg-gradient-to-br from-emerald-400 to-teal-600",
          "bg-gradient-to-br from-amber-400 to-orange-600",
          "bg-gradient-to-br from-blue-400 to-indigo-600",
        ];
        const gradientIndex = doc.id.charCodeAt(0) % gradients.length;
        
        // Resolve current program name if it's a reference
        let programName = "No Program";
        if (data.currentProgram) {
          if (typeof data.currentProgram === 'string') {
            programName = data.currentProgram;
          } else if (typeof data.currentProgram === 'object' && data.currentProgram.path) {
            // It's a reference
            try {
              const programDoc = await getDoc(data.currentProgram);
              if (programDoc.exists()) {
                programName = (programDoc.data() as any)?.name || "Unknown Program";
              }
            } catch (err) {
              console.error("Error fetching program name:", err);
            }
          }
        }

        return {
          id: doc.id,
          name: data.displayName || data.username || "Unknown User",
          email: data.email || "No email",
          avatarGradient: gradients[gradientIndex],
          status: "Active", // Default for now
          currentProgram: programName,
          programProgress: 0,
          lastActive: "Recently",
          engagement: "Medium",
        };
      }));

      setClients(fetchedUsers);
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError("Failed to load users from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredClients = clients.filter(client => {
    const query = searchQuery.toLowerCase();
    const name = client.name ? client.name.toString().toLowerCase() : "";
    const program = client.currentProgram ? client.currentProgram.toString().toLowerCase() : "";
    
    return name.includes(query) || program.includes(query);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="ml-[220px] min-h-screen">
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Clients</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  View your active clients.
                </p>
              </div>
            </div>

            {/* Search and Actions Bar */}
            <div className="flex items-center gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-card text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                />
              </div>

              {/* Filter Button */}
              {/* <button className="h-10 px-4 rounded-lg border border-border bg-card flex items-center gap-2 text-sm font-medium text-card-foreground hover:bg-accent transition-colors">
                <SlidersHorizontal className="w-4 h-4" />
                Filter
              </button> */}

              {/* Add New Client Button */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="h-10 px-4 rounded-lg bg-blue-600 text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add New Client
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Current Program
                  </th>
                  {/* <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Last Active
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Engagement
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th> */}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      Loading clients...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client, index) => {
                  const engagement = engagementConfig[client.engagement as keyof typeof engagementConfig];
                  const initials = client.avatarInitials || client.name.split(' ').map((n: string) => n[0]).join('');
                  
                  return (
                    <tr
                      key={client.id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${
                        index % 2 === 0 ? '' : 'bg-muted/5'
                      }`}
                    >
                      {/* Client Name */}
                      <td className="py-3 px-4">
                        <Link href={`/clients/${client.id}`} className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-full ${client.avatarGradient} flex items-center justify-center flex-shrink-0`}
                          >
                            <span className="text-white text-xs font-semibold">
                              {initials}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-card-foreground">
                              {client.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {client.email}
                            </p>
                          </div>
                        </Link>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <Link href={`/clients/${client.id}`} className="block">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                              statusColors[client.status as keyof typeof statusColors]
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                              client.status === 'Active' ? 'bg-emerald-500' :
                              client.status === 'Onboarding' ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`} />
                            {client.status}
                          </span>
                        </Link>
                      </td>

                      {/* Current Program */}
                      <td className="py-3 px-4">
                        <Link href={`/clients/${client.id}`} className="block">
                          <div className="max-w-[180px]">
                            <p className="text-xs font-medium text-card-foreground mb-1">
                              {client.currentProgram}
                            </p>
                            <div className="flex items-center gap-2">
                              {/* <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${client.programProgress}%` }}
                                />
                              </div> */}
                            </div>
                          </div>
                        </Link>
                      </td>

                      {/* Last Active */}
                      {/* <td className="py-3 px-4">
                        <Link href={`/clients/${client.id}`} className="block">
                          <span className="text-xs text-muted-foreground">
                            {client.lastActive}
                          </span>
                        </Link>
                      </td> */}

                      {/* Engagement */}
                      {/* <td className="py-3 px-4">
                        <Link href={`/clients/${client.id}`} className="block">
                          <div className="flex items-center gap-1">
                            {Array.from({ length: engagement.dots }).map((_, i) => (
                              <div
                                key={i}
                                className={`w-1.5 h-1.5 rounded-full ${engagement.color}`}
                              />
                            ))}
                          </div>
                        </Link>
                      </td> */}

                      {/* Actions */}
                      {/* <td className="py-3 px-4">
                        <button 
                          onClick={(e) => e.preventDefault()}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td> */}
                    </tr>
                  );
                }))
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4">
            <Pagination
              currentPage={1}
              totalPages={5}
              totalItems={24}
              itemsPerPage={5}
            />
          </div>
        </div>
      </main>

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClientAdded={() => {
          fetchUsers(); // Refresh the client list
        }}
      />
    </div>
  );
}
