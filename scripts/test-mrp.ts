/**
 * Test MRP & Selling Price Logic
 */
import { calculateDiscountPercent } from "../lib/products-db";

console.log("=== RUNNING MRP & DISCOUNT TESTS ===");

// 1. Product A: MRP 999, Selling 699 -> 30% OFF
const discA = calculateDiscountPercent(999, 699);
console.log(`Product A (MRP 999, Selling 699): ${discA}% OFF`);
if (discA !== 30) throw new Error(`Expected 30% OFF, got ${discA}`);

// 2. Product B: MRP 1000, Selling 1000 -> no discount badge
const discB = calculateDiscountPercent(1000, 1000);
console.log(`Product B (MRP 1000, Selling 1000): ${discB}`);
if (discB !== null) throw new Error(`Expected null, got ${discB}`);

// 3. Product C: MRP NULL, Selling 699 -> only ₹699
const discC = calculateDiscountPercent(null, 699);
console.log(`Product C (MRP null, Selling 699): ${discC}`);
if (discC !== null) throw new Error(`Expected null, got ${discC}`);

// 4. Invalid: MRP 500, Selling 699 -> calculateDiscountPercent returns null
const discInvalid = calculateDiscountPercent(500, 699);
console.log(`Invalid (MRP 500, Selling 699): ${discInvalid}`);
if (discInvalid !== null) throw new Error(`Expected null for MRP < Selling, got ${discInvalid}`);

// 5. Invalid: Negative MRP -999, Selling 699 -> returns null
const discNeg = calculateDiscountPercent(-999, 699);
console.log(`Invalid (MRP -999, Selling 699): ${discNeg}`);
if (discNeg !== null) throw new Error(`Expected null for negative MRP, got ${discNeg}`);

// 6. Rounding test: MRP 1499, Selling 999 -> (1499-999)/1499 * 100 = 33.355% -> 33%
const discRound = calculateDiscountPercent(1499, 999);
console.log(`Rounding test (MRP 1499, Selling 999): ${discRound}% OFF`);
if (discRound !== 33) throw new Error(`Expected 33% OFF, got ${discRound}`);

console.log("✓ ALL UNIT TESTS PASSED SUCCESSFULLY!");
