"use server";

/**
 * VEER ELEGANCE — Admin Enquiry Server Actions
 *
 * Status updates go through here. requireAdmin() is verified
 * on every execution.
 */

import { revalidatePath } from "next/cache";
import { requireAdmin }   from "@/lib/admin";
import { updateEnquiryStatus, type EnquiryStatus } from "@/lib/enquiries";

export type EnquiryActionState = {
  error?:   string;
  success?: boolean;
  message?: string;
};

const VALID_STATUSES: EnquiryStatus[] = ["new", "contacted", "qualified", "closed"];

export async function updateEnquiryStatusAction(
  enquiryId: string,
  _prev:     EnquiryActionState,
  formData:  FormData,
): Promise<EnquiryActionState> {
  await requireAdmin("/admin/enquiries");

  const raw = (formData.get("status") as string | null)?.trim() ?? "";

  if (!VALID_STATUSES.includes(raw as EnquiryStatus)) {
    return { error: "Invalid enquiry status value." };
  }

  const newStatus = raw as EnquiryStatus;
  const result    = await updateEnquiryStatus(enquiryId, newStatus);

  if (!result.success) {
    return { error: result.error || "Failed to update enquiry status." };
  }

  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${enquiryId}`);

  return { success: true, message: `Enquiry status updated to ${newStatus}.` };
}
