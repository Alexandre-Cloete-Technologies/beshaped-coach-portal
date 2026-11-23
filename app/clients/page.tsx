"use client";

import { Search, UserPlus, Edit, Trash2, AlertTriangle, Archive, ArchiveRestore } from "lucide-react";
import Sidebar from "../components/Sidebar";
import Pagination from "../components/Pagination";
import AddClientModal from "../components/AddClientModal";
import AssignProgramModal from "../components/AssignProgramModal";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getDoc } from "firebase/firestore";
import { useSignedInCoach } from "@/lib/auth/AuthProvider";
import { fetchScopedClients, isArchivedClient } from "@/lib/coachScope";
import { clientRemovalErrorMessage, deleteClientPermanently, setClientArchived } from "@/lib/clientRemoval";
import { profilePhotoUrl } from "@/lib/profilePhoto";
import { setClientProfilePhotoUrl } from "@/lib/clientProfilePhotoCache";



const statusColors = {
  Active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  Onboarding: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  Inactive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  Archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

/** What the confirm dialog is about to do to a client. */
type RemovalAction = "archive" | "restore" | "delete";

/** Fields read from a `programs` document when resolving `currentProgram` */
type ProgramDoc = {
  name?: string;
  programName?: string;
};

type ClientListItem = {
  id: string;
  name: string;
  email: string;
  /** Firestore `profilePhoto` URL or `""` for generated avatar */
  photo: string;
  avatarGradient: string;
  status: keyof typeof statusColors;
  currentProgram: string;
  programProgress: number;
  lastActive: string;
  engagement: string;
  avatarInitials?: string;
};

const TABLE_AVATAR_PX = 36;

function ClientsTableRowAvatar({
  name,
  photo,
  avatarGradient,
  avatarInitials,
}: {
  name: string;
  photo: string;
  avatarGradient: string;
  avatarInitials?: string;
}) {
  // The URL that failed to load; a new photo URL gets a fresh attempt.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = photo?.trim() ?? "";
  const show = url.length > 0 && failedUrl !== url;
  const initials =
    avatarInitials ||
    name
      .split(" ")
      .map((n) => n[0])
      .join("");

  return (
    <div
      className={`w-9 h-9 rounded-full flex-shrink-0 overflow-hidden ${
        show
          ? "bg-muted"
          : `${avatarGradient} flex items-center justify-center`
      }`}
    >
      {show ? (
        <Image
          src={url}
          alt={`${name} profile photo`}
          width={TABLE_AVATAR_PX}
          height={TABLE_AVATAR_PX}
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(url)}
          unoptimized
        />
      ) : (
        <span className="text-white text-xs font-semibold">{initials}</span>
      )}
    </div>
  );
}

// const engagementConfig = {
//   "Very High": { dots: 3, color: "bg-emerald-500" },
//   High: { dots: 3, color: "bg-emerald-500" },
//   Medium: { dots: 2, color: "bg-amber-500" },
//   Low: { dots: 1, color: "bg-red-500" },
// };

export default function ClientsPage() {
  const { uid, role } = useSignedInCoach();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [pending, setPending] = useState<{ action: RemovalAction; id: string; name: string } | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Permanent delete asks for the client's name to be typed, so a mis-click can't erase anyone.
  const [confirmText, setConfirmText] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Only this coach's clients (all clients for an admin)
      const clientDocs = await fetchScopedClients({ uid, role }, { includeArchived: true });
      
      const fetchedUsers = await Promise.all(clientDocs.map(async (doc) => {
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
                const programData = programDoc.data() as ProgramDoc;
                programName = programData.name || programData.programName || "Unknown Program";
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
          photo: profilePhotoUrl(data.profilePhoto),
          avatarGradient: gradients[gradientIndex],
          status: isArchivedClient(data) ? ("Archived" as const) : ("Active" as const),
          currentProgram: programName,
          programProgress: 0,
          lastActive: "Recently",
          engagement: "Medium",
        } satisfies ClientListItem;
      }));

      for (const c of fetchedUsers) {
        if (c.photo) setClientProfilePhotoUrl(c.id, c.photo);
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the signed-in coach changes
  }, [uid, role]);

  const archivedCount = clients.filter((c) => c.status === "Archived").length;

  const filteredClients = clients.filter(client => {
    if (!showArchived && client.status === "Archived") return false;
    const query = searchQuery.toLowerCase();
    const name = client.name ? client.name.toString().toLowerCase() : "";
    const program = client.currentProgram ? client.currentProgram.toString().toLowerCase() : "";
    
    return name.includes(query) || program.includes(query);
  });

  const openAction = (e: React.MouseEvent, action: RemovalAction, client: { id: string; name: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setPending({ action, id: client.id, name: client.name });
    setActionError(null);
    setConfirmText("");
  };

  const closeAction = () => {
    if (working) return;
    setPending(null);
    setActionError(null);
  };

  const confirmAction = async () => {
    if (!pending) return;
    try {
      setWorking(true);
      setActionError(null);
      if (pending.action === "delete") {
        await deleteClientPermanently(pending.id);
        setClients((prev) => prev.filter((c) => c.id !== pending.id));
      } else {
        const archived = pending.action === "archive";
        await setClientArchived(pending.id, archived);
        setClients((prev) =>
          prev.map((c) => (c.id === pending.id ? { ...c, status: archived ? "Archived" : "Active" } : c))
        );
      }
      setPending(null);
    } catch (err) {
      console.error(`Client ${pending.action} failed for ${pending.id}:`, err);
      setActionError(clientRemovalErrorMessage(err));
    } finally {
      setWorking(false);
    }
  };

  const nameConfirmed = pending != null && confirmText.trim() === pending.name.trim();

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

              <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-beshaped-dark-green"
                />
                Show archived{archivedCount > 0 ? ` (${archivedCount})` : ""}
              </label>

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
                          <ClientsTableRowAvatar
                            name={client.name}
                            photo={client.photo}
                            avatarGradient={client.avatarGradient}
                            avatarInitials={client.avatarInitials}
                          />
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
                          {client.status === "Archived" ? (
                            <button
                              onClick={(e) => openAction(e, "restore", client)}
                              className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                              title="Restore client"
                              aria-label={`Restore ${client.name}`}
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => openAction(e, "archive", client)}
                              className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                              title="Archive client"
                              aria-label={`Archive ${client.name}`}
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          {role === "admin" && (
                            <button
                              onClick={(e) => openAction(e, "delete", client)}
                              className="p-2 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete permanently"
                              aria-label={`Delete ${client.name} permanently`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Archive / restore / delete confirmation */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeAction} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-action-title"
            className="relative bg-card rounded-2xl shadow-2xl border border-border p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  pending.action === "delete" ? "bg-red-100 dark:bg-red-900/30" : "bg-muted"
                }`}
              >
                {pending.action === "delete" ? (
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : pending.action === "archive" ? (
                  <Archive className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ArchiveRestore className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <h2 id="client-action-title" className="text-lg font-bold text-card-foreground">
                {pending.action === "delete"
                  ? "Delete client permanently"
                  : pending.action === "archive"
                    ? "Archive client"
                    : "Restore client"}
              </h2>
            </div>

            {pending.action === "archive" && (
              <div className="text-sm text-muted-foreground space-y-2 mb-6">
                <p>
                  <span className="font-semibold text-card-foreground">{pending.name}</span> won&apos;t be able to
                  sign in to the app, and will be hidden from your client lists.
                </p>
                <p>Their workouts, logs and photos are kept. You can restore them at any time.</p>
              </div>
            )}
            {pending.action === "restore" && (
              <p className="text-sm text-muted-foreground mb-6">
                <span className="font-semibold text-card-foreground">{pending.name}</span> will be able to sign in
                again, and will show in your client lists.
              </p>
            )}
            {pending.action === "delete" && (
              <div className="text-sm text-muted-foreground space-y-3 mb-6">
                <p>
                  This erases <span className="font-semibold text-card-foreground">{pending.name}</span>&apos;s
                  account and everything they have logged: workouts, nutrition, body weight, progress photos and
                  programs. <span className="font-semibold text-card-foreground">It can&apos;t be undone.</span>
                </p>
                <p>To stop working with a client but keep their history, archive them instead.</p>
                <label className="block">
                  <span className="block mb-1">Type their name to confirm:</span>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={pending.name}
                    disabled={working}
                    autoFocus
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              </div>
            )}

            {actionError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-4">
                {actionError}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={closeAction}
                disabled={working}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-muted text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={working || (pending.action === "delete" && !nameConfirmed)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  pending.action === "delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-beshaped-dark-green hover:bg-beshaped-green"
                }`}
              >
                {pending.action === "delete"
                  ? working ? "Deleting…" : "Delete permanently"
                  : pending.action === "archive"
                    ? working ? "Archiving…" : "Archive"
                    : working ? "Restoring…" : "Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
