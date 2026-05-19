export type CustomerType = "MEMBER" | "NON_MEMBER";
export type ProductType = "LOCKER" | "ROOM";

export interface PricingInput {
  customerType: CustomerType;
  productType: ProductType;
  startTime: Date;
  clientAge: number;
  hasBirthdayToday: boolean;
}

export interface PricingResult {
  subtotal: number;
  appliedRules: string[];
}

function isWeekdayPeak(date: Date): boolean {
  const day = date.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const hour = date.getHours();
  // Weekday 8am-4pm Mon-Fri
  if (day >= 1 && day <= 5 && hour >= 8 && hour < 16) return true;
  // Friday after 4pm is weekend pricing
  if (day === 5 && hour >= 16) return false;
  return false;
}

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
    if (weekend) {
      appliedRules.push("Weekend room rate");
      return { subtotal: 32, appliedRules };
    } else {
      appliedRules.push("Weekday room rate");
      return { subtotal: 30, appliedRules };
    }
  }

  return { subtotal: 0, appliedRules: ["Unknown product type"] };
}

export function getTaxRate(): number {
  const raw = process.env.TAX_RATE;
  if (raw) {
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) return parsed;
  }
  return 0.08875; // NYC default
}

export function computeTotal(subtotal: number): { tax: number; total: number } {
  const taxRate = getTaxRate();
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { tax, total };
}

export function calculateAge(dobString: string): number {
  const dob = new Date(dobString);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export function isBirthdayToday(dobString: string): boolean {
  const dob = new Date(dobString);
  const now = new Date();
  return dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
}
