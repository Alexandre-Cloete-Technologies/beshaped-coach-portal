"use client";

import { Plus, Search, SlidersHorizontal, MoreVertical, UserPlus, Edit, Trash2, AlertTriangle } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Pagination from "../components/Pagination";
import AddClientModal from "../components/AddClientModal";
import AssignProgramModal from "../components/AssignProgramModal";
import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, getDoc, doc, deleteDoc, query, where } from "firebase/firestore";
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
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteClick = (e: React.MouseEvent, client: { id: string; name: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    try {
      setDeleting(true);
      const userRef = doc(db, "users", clientToDelete.id);

      // Delete userPrograms entries for this user
      const userProgramsQuery = query(
        collection(db, "userPrograms"),
        where("userId", "==", userRef)
      );
      const userProgramsSnapshot = await getDocs(userProgramsQuery);
      await Promise.all(userProgramsSnapshot.docs.map((d) => deleteDoc(d.ref)));

      // Delete the user document
      await deleteDoc(userRef);
      setClients((prev) => prev.filter((c) => c.id !== clientToDelete.id));
      setDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (err) {
      console.error("Error deleting client:", err);
    } finally {
      setDeleting(false);
    }
  };

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

              <button
                onClick={() => setAssignModalOpen(true)}
                className="h-10 px-4 rounded-lg border border-border bg-card text-card-foreground text-sm font-medium flex items-center gap-2 hover:bg-accent transition-colors shadow-sm"
              >
                <UserPlus className="w-4 h-4" />
                Assign Program
              </button>

              {/* Add New Client Button */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="h-10 px-4 rounded-lg bg-beshaped-dark-green text-primary-foreground text-sm font-medium flex items-center gap-2 hover:bg-beshaped-green transition-colors shadow-sm"
              >
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
                  <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      Loading clients...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client, index) => {
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

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, { id: client.id, name: client.name })}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
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

      <AssignProgramModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        onAssigned={() => {
          fetchUsers(); // Refresh client program data after assignment
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { if (!deleting) { setDeleteModalOpen(false); setClientToDelete(null); } }}
          />
          <div className="relative bg-card rounded-2xl shadow-2xl border border-border p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-card-foreground">Delete Client</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Are you sure you want to delete <span className="font-semibold text-card-foreground">{clientToDelete?.name}</span>?
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setDeleteModalOpen(false); setClientToDelete(null); }}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-muted text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
