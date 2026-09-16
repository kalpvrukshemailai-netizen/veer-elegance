/**
 * VEER ELEGANCE — POST /api/enquiries
 *
 * Public endpoint for submitting wholesale, bulk, and retailer enquiries.
 * Supports both guest visitors and authenticated users.
 *
 * Validates:
 *   - Full name (required)
 *   - Email (required + valid format)
 *   - Phone (required)
 *   - Enquiry type (required)
 *   - Message (required)
 */

import { NextRequest, NextResponse } from "next/server";
import { createEnquiry, type CreateEnquiryInput } from "@/lib/enquiries";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json() as unknown;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 },
    );
  }

  const b = body as Record<string, unknown>;
  const fullName    = typeof b.fullName === "string" ? b.fullName.trim() : "";
  const businessName = typeof b.businessName === "string" ? b.businessName.trim() : "";
  const email       = typeof b.email === "string" ? b.email.trim() : "";
  const phone       = typeof b.phone === "string" ? b.phone.trim() : "";
  const city        = typeof b.city === "string" ? b.city.trim() : "";
  const country     = typeof b.country === "string" ? b.country.trim() : "";
  const enquiryType = typeof b.enquiryType === "string" ? b.enquiryType.trim() : "";
  const message     = typeof b.message === "string" ? b.message.trim() : "";

  let expectedQuantity: number | null = null;
  if (b.expectedQuantity !== undefined && b.expectedQuantity !== null && b.expectedQuantity !== "") {
    const parsed = Number(b.expectedQuantity);
    if (isNaN(parsed) || parsed <= 0 || !Number.isInteger(parsed)) {
      return NextResponse.json(
        { success: false, error: "Expected quantity must be a positive whole number." },
        { status: 400 },
      );
    }
    expectedQuantity = parsed;
  }

  // Validation
  if (!fullName) {
    return NextResponse.json(
      { success: false, error: "Full name is required." },
      { status: 400 },
    );
  }

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  if (!phone) {
    return NextResponse.json(
      { success: false, error: "Phone number is required." },
      { status: 400 },
    );
  }

  if (!enquiryType) {
    return NextResponse.json(
      { success: false, error: "Please select an enquiry type." },
      { status: 400 },
    );
  }

  if (!message) {
    return NextResponse.json(
      { success: false, error: "Please provide a brief message describing your enquiry." },
      { status: 400 },
    );
  }

  const input: CreateEnquiryInput = {
    fullName,
    businessName: businessName || null,
    email,
    phone,
    city: city || null,
    country: country || null,
    enquiryType,
    expectedQuantity,
    message,
  };

  const result = await createEnquiry(input);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? "Failed to submit enquiry." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: true, enquiryId: result.enquiryId },
    { status: 201 },
  );
}
