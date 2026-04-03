import { useState, useEffect, useCallback } from "react";
import { Bell, Shield, Info, AlertTriangle, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Notification = Tables<"notifications">;

const POLL_INTERVAL = 30_000; // 30 seconds

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}sem`;
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "admin_access_request":
    case "admin_access_granted":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Shield className="h-4 w-4 text-amber-400" />
        </div>
      );
    case "alert":
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cosmos-indigo/10 border border-cosmos-indigo/20">
          <Info className="h-4 w-4 text-cosmos-indigo" />
        </div>
      );
  }
}

function NotificationItem({
  notification,
  onAction,
}: {
  notification: Notification;
  onAction: (id: string, result: "approved" | "denied") => void;
}) {
  const isUnread = !notification.read;
  const isPending = notification.action_type === "approve_deny" && !notification.action_result;
  const isResolved = notification.action_type === "approve_deny" && !!notification.action_result;

  return (
    <div
      className={`relative flex gap-3 px-4 py-3 transition-colors ${
        isUnread ? "bg-white/[0.02]" : ""
      }`}
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute left-1.5 top-4 h-1.5 w-1.5 rounded-full bg-cosmos-indigo" />
      )}

      <NotificationIcon type={notification.type} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-[13px] leading-tight ${isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
            {notification.title}
          </p>
          <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap mt-0.5">
            {notification.created_at ? timeAgo(notification.created_at) : ""}
          </span>
        </div>
        <p className="text-[11.5px] text-muted-foreground mt-0.5 leading-relaxed">
          {notification.message}
        </p>

        {/* Approval buttons */}
        {isPending && (
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              className="h-7 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-none"
              onClick={(e) => {
                e.stopPropagation();
                onAction(notification.id, "approved");
              }}
            >
              <Check className="h-3 w-3 mr-1" />
              Permitir
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 px-3 text-[11px] shadow-none"
              onClick={(e) => {
                e.stopPropagation();
                onAction(notification.id, "denied");
              }}
            >
              <X className="h-3 w-3 mr-1" />
              Negar
            </Button>
          </div>
        )}

        {/* Resolved badge */}
        {isResolved && (
          <div className="mt-1.5">
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                notification.action_result === "approved"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {notification.action_result === "approved" ? (
                <>
                  <Check className="h-2.5 w-2.5" /> Acesso permitido
                </>
              ) : (
                <>
                  <X className="h-2.5 w-2.5" /> Acesso negado
                </>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (data) {
      // Filter out expired notifications
      const now = new Date();
      const valid = data.filter(
        (n) => !n.expires_at || new Date(n.expires_at) > now
      );
      setNotifications(valid);
      setUnreadCount(valid.filter((n) => !n.read).length);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Polling every 30s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Mark all as read when popover opens
  useEffect(() => {
    if (!open || !user || unreadCount === 0) return;

    const markRead = async () => {
      const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const now = new Date().toISOString();
      await supabase
        .from("notifications")
        .update({ read: true, read_at: now })
        .in("id", unreadIds);

      setNotifications((prev) =>
        prev.map((n) =>
          unreadIds.includes(n.id) ? { ...n, read: true, read_at: now } : n
        )
      );
      setUnreadCount(0);
    };

    // Small delay so user sees the unread state briefly
    const timeout = setTimeout(markRead, 1500);
    return () => clearTimeout(timeout);
  }, [open, user, unreadCount, notifications]);

  const handleAction = async (notificationId: string, result: "approved" | "denied") => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({
        action_result: result,
        action_resolved_at: now,
        read: true,
        read_at: now,
      })
      .eq("id", notificationId);

    if (error) {
      toast.error("Erro ao processar resposta");
      return;
    }

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, action_result: result, action_resolved_at: now, read: true, read_at: now }
          : n
      )
    );

    if (result === "approved") {
      toast.success("Acesso administrativo permitido");
    } else {
      toast.info("Acesso administrativo negado");

      // Log denial in audit_logs if we have the action_data
      const notification = notifications.find((n) => n.id === notificationId);
      const actionData = notification?.action_data as Record<string, string> | null;
      if (actionData?.tenant_id && actionData?.admin_user_id) {
        await supabase.from("audit_logs").insert({
          admin_user_id: actionData.admin_user_id,
          tenant_id: actionData.tenant_id,
          action: "admin_access_denied",
          details: { denied_at: now },
        });
      }
    }
  };

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-all duration-200 hover:bg-white/[0.04] hover:text-white/80"
          aria-label="Notificações"
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.7} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(239,68,68,0.5)]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-[360px] p-0 border-white/[0.08] bg-card shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h3 className="text-[13px] font-semibold text-foreground">Notificações</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-mono text-cosmos-indigo">
              {unreadCount} nova{unreadCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-[12px] text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div>
              {/* Unread section */}
              {unread.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono font-semibold uppercase tracking-[0.12em] text-white/30 px-4 pt-3 pb-1">
                    Novas
                  </p>
                  <div className="divide-y divide-white/[0.04]">
                    {unread.map((n) => (
                      <NotificationItem key={n.id} notification={n} onAction={handleAction} />
                    ))}
                  </div>
                </div>
              )}

              {/* Read section */}
              {read.length > 0 && (
                <div>
                  <p className="text-[9px] font-mono font-semibold uppercase tracking-[0.12em] text-white/30 px-4 pt-3 pb-1">
                    Anteriores
                  </p>
                  <div className="divide-y divide-white/[0.04]">
                    {read.map((n) => (
                      <NotificationItem key={n.id} notification={n} onAction={handleAction} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
