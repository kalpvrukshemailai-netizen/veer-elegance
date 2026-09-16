"use server";

/**
 * VEER ELEGANCE — Notification Server Actions
 *
 * Mark read / mark all read.
 * requireAdmin() re-verified on every call.
 */

import { revalidatePath }              from "next/cache";
import { requireAdmin }                from "@/lib/admin";
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/notifications";

// ─────────────────────────────────────────────────────────────────────────────

export type NotificationActionState = {
  error?:   string;
  success?: boolean;
};

export async function markReadAction(
  id:    string,
  _prev: NotificationActionState,
): Promise<NotificationActionState> {
  await requireAdmin("/admin/notifications");
  await markNotificationAsRead(id);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { success: true };
}

export async function markAllReadAction(
  _prev: NotificationActionState,
): Promise<NotificationActionState> {
  await requireAdmin("/admin/notifications");
  await markAllNotificationsAsRead();
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
  return { success: true };
}
