"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { resetPassword } from "@/lib/firebase/auth";
import { inviteEmailErrorMessage } from "@/lib/clientInvite";

/**
 * Sends the client the Firebase set-password email (beshaped-backend#37, Decision log 2026-10-29 D2): for a client who
 * never got the invite or lost it. The page only loads clients in the signed-in coach's scope (a coach's own
 * clients, every client for an admin), so whoever sees this button may use it.
 */
export default function SendPasswordEmailButton({ email }: { email: string | null }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const send = async () => {
    if (!email || sending) return;
    setSending(true);
    setMessage(null);
    try {
      await resetPassword(email);
      setMessage({ ok: true, text: `Email sent to ${email}` });
    } catch (err) {
      setMessage({ ok: false, text: inviteEmailErrorMessage(err) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={send}
        disabled={!email || sending}
        title={email ? undefined : "This client has no email address"}
        className="inline-flex items-center gap-2 h-9 px-4 rounded-lg border border-border bg-background text-xs font-medium text-card-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send className="w-3.5 h-3.5" />
        {sending ? "Sending..." : "Send set-password email"}
      </button>
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={`text-xs ${message.ok ? "text-emerald-600" : "text-destructive"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
