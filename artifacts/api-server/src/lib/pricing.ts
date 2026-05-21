import { getEnv } from "./env";

/**
 * Customer type for pricing calculations
 * MEMBER: Customer has purchased a membership (eligible for discounts)
 * NON_MEMBER: Customer has not purchased a membership (standard rates)
 */
export type CustomerType = "MEMBER" | "NON_MEMBER";

/**
 * Product type for pricing calculations
 * LOCKER: Locker rental
 * ROOM: Private dressing room rental
 */
export type ProductType = "LOCKER" | "ROOM";

/**
 * Room quality tier for tier-based pricing
 * standard: Basic room with standard pricing
 * premium: Enhanced room with premium pricing
 * deluxe: Luxury room with highest pricing
 */
export type RoomQualityTier = "standard" | "premium" | "deluxe";

/**
 * Tier pricing ranges for rooms (in dollars)
 */
export const TIER_PRICING = {
  weekday: {
    standard: { min: 25, max: 28 },
    premium: { min: 29, max: 32 },
    deluxe: { min: 33, max: 34 },
  },
  weekend: {
    standard: { min: 28, max: 31 },
    premium: { min: 32, max: 35 },
    deluxe: { min: 36, max: 37 },
  },
} as const;

/**
 * Gets the base price for a room tier at a given time
 * Returns the minimum price in the tier range
 *
 * @param tier - Room quality tier
 * @param isWeekend - Whether the rental is during weekend pricing period
 * @returns Base price for the tier
 */
export function getTierPrice(tier: RoomQualityTier, isWeekend: boolean): number {
  const pricing = isWeekend ? TIER_PRICING.weekend[tier] : TIER_PRICING.weekday[tier];
  return pricing.min;
}

/**
 * Input parameters for pricing calculation
 */
export interface PricingInput {
  /** Customer type (MEMBER or NON_MEMBER) */
  customerType: CustomerType;
  /** Product type being rented (LOCKER or ROOM) */
  productType: ProductType;
  /** Start time of the rental (determines peak/off-peak pricing) */
  startTime: Date;
  /** Client age in years (for age-based discounts) */
  clientAge: number;
  /** Whether today is the client's birthday (for birthday special) */
  hasBirthdayToday: boolean;
  /** Room quality tier (only applicable for ROOM product type) */
  roomTier?: RoomQualityTier;
}

/**
 * Result of pricing calculation
 */
export interface PricingResult {
  /** Calculated subtotal before tax (in dollars) */
  subtotal: number;
  /** List of pricing rules that were applied (for display/debugging) */
  appliedRules: string[];
}

/**
 * Determines if a given date/time falls within weekday peak hours
 * Peak hours: Monday-Friday, 8am-4pm
 *
 * @param date - The date/time to check
 * @returns True if within weekday peak hours, false otherwise
 */
function isWeekdayPeak(date: Date): boolean {
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const hour = date.getHours();
  // Weekday 8am-4pm Mon-Fri
  if (day >= 1 && day <= 5 && hour >= 8 && hour < 16) return true;
  // Friday after 4pm is weekend pricing
  if (day === 5 && hour >= 16) return false;
  return false;
}

/**
 * Determines if a given date/time falls within weekend pricing period
 * Weekend period: Friday 4pm through Monday 8am
 *
 * @param date - The date/time to check
 * @returns True if within weekend period, false otherwise
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  const hour = date.getHours();
  // Friday 4pm to Monday 8am
  if (day === 6) return true; // Saturday all day
  if (day === 0) return true; // Sunday all day
  if (day === 5 && hour >= 16) return true; // Friday after 4pm
  if (day === 1 && hour < 8) return true; // Monday before 8am
  return false;
}

/**
 * Calculates the rental price based on customer type, product type, time, and age
 * Applies special rules including birthday free, 18-24 discounts, and peak/off-peak pricing
 *
 * @param input - Pricing calculation parameters
 * @returns Pricing result with subtotal and applied rules
 *
 * @example
 * ```typescript
 * const result = calculatePrice({
 *   customerType: "MEMBER",
 *   productType: "LOCKER",
 *   startTime: new Date("2026-05-20T10:00:00"),
 *   clientAge: 20,
 *   hasBirthdayToday: false
 * });
 * // Returns: { subtotal: 0, appliedRules: ["18-24 Special: weekday locker is free"] }
 * ```
 */
export function calculatePrice(input: PricingInput): PricingResult {
  const { customerType, productType, startTime, clientAge, hasBirthdayToday } = input;
  const appliedRules: string[] = [];

  // Birthday special: locker is free regardless of other rates
  if (hasBirthdayToday && productType === "LOCKER") {
    appliedRules.push("Birthday Special: locker fee waived");
    return { subtotal: 0, appliedRules };
  }

  const weekend = isWeekend(startTime);
  const weekdayPeak = isWeekdayPeak(startTime);

  if (productType === "LOCKER") {
    // 18-24 special (MEMBER only, applies after membership purchase)
    if (clientAge >= 18 && clientAge <= 24 && customerType === "MEMBER") {
      if (weekend) {
        appliedRules.push("18-24 Special: weekend locker rate $7");
        return { subtotal: 7, appliedRules };
      } else {
        appliedRules.push("18-24 Special: weekday locker is free");
        return { subtotal: 0, appliedRules };
      }
    }

    // Standard locker pricing
    if (weekend) {
      appliedRules.push("Weekend locker rate");
      return { subtotal: 24, appliedRules };
    } else if (weekdayPeak) {
      appliedRules.push("Weekday peak locker rate (8am-4pm)");
      return { subtotal: 15, appliedRules };
    } else {
      appliedRules.push("Weekday off-peak locker rate");
      return { subtotal: 20, appliedRules };
    }
  }

  if (productType === "ROOM") {
    const tier = input.roomTier ?? "standard";
    const tierPrice = getTierPrice(tier, weekend);
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
    appliedRules.push(`${tierName} room rate (${weekend ? "weekend" : "weekday"})`);
    return { subtotal: tierPrice, appliedRules };
  }

  return { subtotal: 0, appliedRules: ["Unknown product type"] };
}

/**
 * Gets the current tax rate from environment configuration
 *
 * @returns Tax rate as a decimal (e.g., 0.08875 for 8.875%)
 */
export function getTaxRate(): number {
  return getEnv().TAX_RATE;
}

/**
 * Computes tax and total from a subtotal
 * Uses the configured tax rate and rounds to 2 decimal places
 *
 * @param subtotal - The subtotal before tax (in dollars)
 * @returns Object containing tax amount and total amount
 */
export function computeTotal(subtotal: number): { tax: number; total: number } {
  const taxRate = getTaxRate();
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { tax, total };
}

/**
 * Calculates age from a date of birth string
 *
 * @param dobString - Date of birth in a format recognized by Date constructor
 * @returns Age in years
 */
export function calculateAge(dobString: string): number {
  const dob = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Checks if today is the birthday based on date of birth
 * Compares month and day only, ignoring year
 *
 * @param dobString - Date of birth in a format recognized by Date constructor
 * @returns True if today is the birthday, false otherwise
 */
export function isBirthdayToday(dobString: string): boolean {
  const dob = new Date(dobString);
  const now = new Date();
  return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
}
