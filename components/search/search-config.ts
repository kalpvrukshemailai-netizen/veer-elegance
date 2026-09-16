import type { ProductCategory } from "@/lib/products-db";

export interface CategoryOption {
  id: ProductCategory | "";
  label: string;
  themeTitle: string;
}

export const SEARCH_CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "",                   label: "All Pieces",       themeTitle: "All Collections" },
  { id: "chains",             label: "Chains",            themeTitle: "The Everyday" },
  { id: "rings",              label: "Rings",             themeTitle: "The Signature" },
  { id: "earrings",           label: "Earrings",          themeTitle: "The Glow" },
  { id: "bracelets",          label: "Bracelets",         themeTitle: "The Motion" },
  { id: "bangles",            label: "Bangles",           themeTitle: "The Halo" },
  { id: "mystery-box",        label: "Mystery Box",       themeTitle: "The Unknown" },
  { id: "gen-z-accessories",  label: "Gen-Z Accessories", themeTitle: "The Rebel" },
];
