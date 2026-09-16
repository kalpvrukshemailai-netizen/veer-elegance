/**
 * VEER ELEGANCE — Complete the Look Types & Pricing Calculations
 *
 * Core pure types and calculation functions for curated product looks.
 * Customer storefront bundle display & checkout logic will be staged in later steps.
 */

export interface CompleteTheLookProduct {
  id:        string;
  slug:      string;
  name:      string;
  price:     number;
  imageUrl:  string | null;
  category:  string;
  published: boolean;
  archived:  boolean;
  inStock?:  boolean;
}

export interface CompleteTheLookItemRow {
  id:           string;
  setId:        string;
  productId:    string;
  displayOrder: number;
  createdAt:    string;
  product?:     CompleteTheLookProduct;
}

export interface CompleteTheLookSetRow {
  id:            string;
  baseProductId: string;
  bundlePrice:   number;
  enabled:       boolean;
  couponAllowed: boolean;
  createdAt:     string;
  updatedAt:     string;
}

export interface LookPricingSummary {
  individualTotal: number;
  bundlePrice:     number;
  customerSavings: number;
  savingsPercent:  number;
  isDiscounted:    boolean;
}

export interface CompleteTheLookDetail extends CompleteTheLookSetRow, LookPricingSummary {
  baseProduct:      CompleteTheLookProduct;
  matchingProducts: (CompleteTheLookProduct & { displayOrder: number })[];
  allProducts:      CompleteTheLookProduct[];
}

export interface UpsertCompleteTheLookInput {
  baseProductId:  string;
  bundlePrice:    number;
  enabled?:       boolean;
  couponAllowed?: boolean;
  itemProductIds: string[];
}

/**
 * Calculates individual total, customer savings, and discount status
 * from current product selling prices and fixed bundle price.
 */
export function calculateLookPricing(
  basePrice: number,
  matchingPrices: number[],
  bundlePrice: number
): LookPricingSummary {
  const safeBase = Math.max(0, Number(basePrice) || 0);
  const safeMatching = matchingPrices.map(p => Math.max(0, Number(p) || 0));
  const individualTotal = Number((safeBase + safeMatching.reduce((sum, p) => sum + p, 0)).toFixed(2));
  const safeBundle = Math.max(0, Number(bundlePrice) || 0);

  const customerSavings = Number(Math.max(0, individualTotal - safeBundle).toFixed(2));
  const savingsPercent = individualTotal > 0 ? Math.round((customerSavings / individualTotal) * 100) : 0;
  const isDiscounted = safeBundle < individualTotal;

  return {
    individualTotal,
    bundlePrice: safeBundle,
    customerSavings,
    savingsPercent,
    isDiscounted,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: SMART CUSTOMER-FACING PRICING & PERSUASION MESSAGING
// ─────────────────────────────────────────────────────────────────────────────

export interface CompleteLookMessagingOptions {
  allProducts: CompleteTheLookProduct[];
  selectedIds: string[];
  bundlePrice: number;
}

export interface CompleteLookMessagingResult {
  isComplete:       boolean;
  canBeCompleted:   boolean;
  selectedTotal:    number;
  individualTotal:  number;
  bundlePrice:      number;
  savings:          number;
  remainingAmount:  number;
  hasRemainingGap:  boolean;
  missingProducts:  CompleteTheLookProduct[];
  missingCount:     number;
  primaryMessage:   string;
  secondaryMessage: string | null;
  badgeText:        string;
}

/**
 * Pure calculation function generating customer-facing messaging based on selection state.
 */
export function getCompleteLookMessaging(
  options: CompleteLookMessagingOptions
): CompleteLookMessagingResult {
  const { allProducts, selectedIds, bundlePrice } = options;

  const totalCount = allProducts.length;
  const individualTotal = Number(
    allProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0).toFixed(2)
  );
  const safeBundle = Math.max(0, Number(bundlePrice) || 0);

  const selectedProducts = allProducts.filter(p => selectedIds.includes(p.id));
  const selectedTotal = Number(
    selectedProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0).toFixed(2)
  );

  const missingProducts = allProducts.filter(p => !selectedIds.includes(p.id));
  const missingCount = missingProducts.length;

  const hasOutOfStockPiece = allProducts.some(
    p => p.inStock === false || !p.published || p.archived
  );
  const canBeCompleted = !hasOutOfStockPiece;

  const isComplete = totalCount > 0 && missingCount === 0;
  const savings = isComplete ? Math.max(0, Number((individualTotal - safeBundle).toFixed(2))) : 0;

  // Case 1: ALL PRODUCTS SELECTED
  if (isComplete) {
    const formattedSavings = `₹${savings.toLocaleString("en-IN")}`;
    return {
      isComplete: true,
      canBeCompleted,
      selectedTotal,
      individualTotal,
      bundlePrice: safeBundle,
      savings,
      remainingAmount: 0,
      hasRemainingGap: false,
      missingProducts: [],
      missingCount: 0,
      primaryMessage: savings > 0
        ? `Complete Your Look & Save ${formattedSavings} ✨`
        : "Your complete look is unlocked ✨",
      secondaryMessage: "All curated pieces selected. Look pricing active.",
      badgeText: "Complete Look Active",
    };
  }

  // Case 2: ZERO PRODUCTS SELECTED
  if (selectedProducts.length === 0) {
    return {
      isComplete: false,
      canBeCompleted,
      selectedTotal: 0,
      individualTotal,
      bundlePrice: safeBundle,
      savings: 0,
      remainingAmount: safeBundle,
      hasRemainingGap: safeBundle > 0,
      missingProducts,
      missingCount,
      primaryMessage: "Select pieces above to customize your look ✨",
      secondaryMessage: `Get the complete ${totalCount}-piece look for ₹${safeBundle.toLocaleString("en-IN")}.`,
      badgeText: "Curated Look",
    };
  }

  // Case 3: PARTIAL SELECTION
  const remainingGap = Number((safeBundle - selectedTotal).toFixed(2));
  const hasRemainingGap = remainingGap > 0;
  const remainingAmount = hasRemainingGap ? remainingGap : 0;

  const missingHasOos = missingProducts.some(p => p.inStock === false || !p.published || p.archived);

  let primaryMessage = "";
  let secondaryMessage: string | null = null;

  if (missingHasOos) {
    primaryMessage = `Selected Items Total: ₹${selectedTotal.toLocaleString("en-IN")}`;
    secondaryMessage = "Some curated pieces in this look are currently out of stock.";
  } else if (hasRemainingGap) {
    primaryMessage = `You're only ₹${remainingAmount.toLocaleString("en-IN")} away from completing the look ✨`;
    if (missingCount === 1) {
      secondaryMessage = `Add ${missingProducts[0].name} to unlock the Complete Look price.`;
    } else {
      secondaryMessage = `Add the remaining ${missingCount} pieces to unlock your Complete Look price ✨`;
    }
  } else {
    // selectedTotal is already >= bundlePrice (no negative or zero gap shown)
    primaryMessage = `Complete the full look for ₹${safeBundle.toLocaleString("en-IN")} ✨`;
    if (missingCount === 1) {
      secondaryMessage = `Add ${missingProducts[0].name} to unlock the Complete Look price.`;
    } else {
      secondaryMessage = `Add the remaining ${missingCount} pieces to unlock the Complete Look price.`;
    }
  }

  return {
    isComplete: false,
    canBeCompleted,
    selectedTotal,
    individualTotal,
    bundlePrice: safeBundle,
    savings: 0,
    remainingAmount,
    hasRemainingGap,
    missingProducts,
    missingCount,
    primaryMessage,
    secondaryMessage,
    badgeText: hasRemainingGap ? "Almost Complete" : "Complete the Look",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CART RECOMMENDATION & DISCOVERY LOGIC
// ─────────────────────────────────────────────────────────────────────────────

export interface CartLookRecommendationProduct extends CompleteTheLookProduct {
  inCart: boolean;
}

export interface CartLookRecommendation {
  setId:                       string;
  baseProductId:               string;
  bundlePrice:                 number;
  couponAllowed:               boolean;
  allProducts:                 CompleteTheLookProduct[];
  inCartProducts:              CompleteTheLookProduct[];
  remainingProducts:           CompleteTheLookProduct[];
  currentCartBundleItemsTotal: number;
  remainingProductsTotal:      number;
  totalIndividualPrice:        number;
  savings:                     number;
  hasRemainingGap:             boolean;
  remainingGap:                number;
  isComplete:                  boolean;
  canBeCompleted:              boolean;
  headline:                    string;
  subline:                     string;
  badgeText:                   string;
}

export interface CartLookRecommendationParams {
  allProducts:       CompleteTheLookProduct[];
  inCartProductKeys: string[]; // IDs or slugs present in customer cart
  bundlePrice:       number;
  setId?:            string;
  baseProductId?:    string;
  couponAllowed?:    boolean;
}

export function getCartLookRecommendationMessaging(
  params: CartLookRecommendationParams
): CartLookRecommendation {
  const {
    allProducts,
    inCartProductKeys,
    bundlePrice,
    setId = "",
    baseProductId = "",
    couponAllowed = true,
  } = params;

  const keySet = new Set(inCartProductKeys.map((k) => k.trim().toLowerCase()));

  const inCartProducts: CompleteTheLookProduct[] = [];
  const remainingProducts: CompleteTheLookProduct[] = [];

  for (const prod of allProducts) {
    const isPresent =
      keySet.has(prod.id.toLowerCase()) || keySet.has(prod.slug.toLowerCase());
    if (isPresent) {
      inCartProducts.push(prod);
    } else {
      remainingProducts.push(prod);
    }
  }

  const currentCartBundleItemsTotal = inCartProducts.reduce(
    (sum, p) => sum + (Number(p.price) || 0),
    0
  );
  const remainingProductsTotal = remainingProducts.reduce(
    (sum, p) => sum + (Number(p.price) || 0),
    0
  );
  const totalIndividualPrice = currentCartBundleItemsTotal + remainingProductsTotal;

  const safeBundle = Math.max(0, Number(bundlePrice) || 0);
  const savings = Math.max(0, totalIndividualPrice - safeBundle);

  const isComplete = remainingProducts.length === 0 && allProducts.length >= 2;
  const canBeCompleted = remainingProducts.every(
    (p) => p.inStock !== false && p.published && !p.archived
  );

  const hasRemainingGap =
    !isComplete &&
    safeBundle > currentCartBundleItemsTotal &&
    safeBundle - currentCartBundleItemsTotal > 0;
  const remainingGap = hasRemainingGap
    ? safeBundle - currentCartBundleItemsTotal
    : 0;

  let headline = "";
  let subline = "";
  let badgeText = "";

  if (isComplete) {
    headline = "Complete Look unlocked ✨";
    subline = `Individual value ₹${totalIndividualPrice.toLocaleString("en-IN")} · Complete Look ₹${safeBundle.toLocaleString("en-IN")} · You save ₹${savings.toLocaleString("en-IN")}`;
    badgeText = "Unlocked";
  } else if (!canBeCompleted) {
    headline = "Complete the Look ✨";
    subline = "Some pieces in this curated look are currently out of stock.";
    badgeText = "Complete the Look";
  } else if (remainingProducts.length === 1) {
    headline = "You're almost there ✨";
    if (hasRemainingGap && remainingGap > 0) {
      subline = `Add ${remainingProducts[0].name} for just ₹${remainingGap.toLocaleString("en-IN")} more to unlock your Complete Look price.`;
    } else {
      subline = `Add ${remainingProducts[0].name} to unlock your Complete Look price of ₹${safeBundle.toLocaleString("en-IN")}.`;
    }
    badgeText = "Almost There";
  } else {
    headline = "You're one step closer ✨";
    if (hasRemainingGap && remainingGap > 0) {
      subline = `Add the remaining ${remainingProducts.length} pieces for just ₹${remainingGap.toLocaleString("en-IN")} more to unlock your Complete Look price.`;
    } else {
      subline = `Add the remaining ${remainingProducts.length} pieces to unlock your Complete Look price of ₹${safeBundle.toLocaleString("en-IN")}.`;
    }
    badgeText = "Complete the Look";
  }

  return {
    setId,
    baseProductId,
    bundlePrice: safeBundle,
    couponAllowed,
    allProducts,
    inCartProducts,
    remainingProducts,
    currentCartBundleItemsTotal,
    remainingProductsTotal,
    totalIndividualPrice,
    savings,
    hasRemainingGap,
    remainingGap,
    isComplete,
    canBeCompleted,
    headline,
    subline,
    badgeText,
  };
}
