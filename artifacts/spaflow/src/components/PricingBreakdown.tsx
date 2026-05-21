import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface PricingBreakdownProps {
  subtotal: number;
  tax: number;
  total: number;
  appliedRules: string[];
  membershipCost?: number;
  membershipBundled?: boolean;
  taxRate?: number;
}

/**
 * Rule explanations for pricing rules
 */
const RULE_EXPLANATIONS: Record<string, string> = {
  "Birthday Special: locker fee waived":
    "Client's birthday today - locker rental is free as a special offer",
  "18-24 Special: weekend locker rate $7":
    "Members aged 18-24 receive discounted weekend locker rate of $7",
  "18-24 Special: weekday locker is free":
    "Members aged 18-24 receive free weekday locker rentals",
  "Weekend locker rate":
    "Standard weekend rate applies (Friday 4pm - Monday 8am)",
  "Weekday peak locker rate (8am-4pm)":
    "Higher rate during weekday peak hours (8am-4pm Monday-Friday)",
  "Weekday off-peak locker rate":
    "Standard rate during weekday off-peak hours",
  "Standard room rate (weekday)":
    "Base rate for standard quality room on weekdays",
  "Standard room rate (weekend)":
    "Base rate for standard quality room on weekends",
  "Premium room rate (weekday)":
    "Enhanced rate for premium quality room on weekdays",
  "Premium room rate (weekend)":
    "Enhanced rate for premium quality room on weekends",
  "Deluxe room rate (weekday)":
    "Luxury rate for deluxe quality room on weekdays",
  "Deluxe room rate (weekend)":
    "Luxury rate for deluxe quality room on weekends",
  "Birthday special disabled due to special event":
    "Birthday special is temporarily disabled due to a special event",
  "18-24 special disabled due to special event":
    "18-24 special is temporarily disabled due to a special event",
};

/**
 * Determines if a rule is a special pricing rule
 */
function isSpecialRule(rule: string): boolean {
  return (
    rule.includes("Birthday") ||
    rule.includes("18-24") ||
    rule.includes("1824")
  );
}

/**
 * Gets the badge variant for a pricing rule
 */
function getRuleBadgeVariant(rule: string): "default" | "secondary" | "outline" {
  if (rule.includes("Birthday")) return "default";
  if (rule.includes("18-24") || rule.includes("1824")) return "secondary";
  return "outline";
}

/**
 * Gets the badge color class for special rules
 */
function getRuleBadgeColor(rule: string): string {
  if (rule.includes("Birthday")) return "bg-purple-100 text-purple-800 border-purple-300";
  if (rule.includes("18-24") || rule.includes("1824")) return "bg-blue-100 text-blue-800 border-blue-300";
  return "";
}

export function PricingBreakdown({
  subtotal,
  tax,
  total,
  appliedRules,
  membershipCost,
  membershipBundled,
  taxRate,
}: PricingBreakdownProps) {
  // Calculate rental cost by subtracting membership cost if bundled
  const rentalCost = membershipBundled && membershipCost
    ? subtotal - membershipCost
    : subtotal;

  return (
    <TooltipProvider>
      <div className="space-y-2 text-sm">
        {/* Applied Rules Section */}
        {appliedRules.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Applied Pricing Rules
            </p>
            <div className="space-y-1">
              {appliedRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Badge
                    variant={getRuleBadgeVariant(rule)}
                    className={cn(
                      "text-[10px] px-1.5 h-5",
                      isSpecialRule(rule) && getRuleBadgeColor(rule)
                    )}
                  >
                    {isSpecialRule(rule) ? "Special" : "Standard"}
                  </Badge>
                  <span className="text-xs flex-1">{rule}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Info size={12} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      <p className="text-xs">{RULE_EXPLANATIONS[rule] || "No explanation available"}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-2" />

        {/* Cost Breakdown */}
        <div className="space-y-1.5">
          {/* Rental Cost */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {membershipBundled ? "Rental Cost" : "Subtotal"}
            </span>
            <span className="font-medium">${rentalCost.toFixed(2)}</span>
          </div>

          {/* Membership Cost (if bundled) */}
          {membershipBundled && membershipCost && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Membership</span>
              <span className="font-medium">${membershipCost.toFixed(2)}</span>
            </div>
          )}

          {/* Subtotal (if membership bundled, show combined subtotal) */}
          {membershipBundled && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${subtotal.toFixed(2)}</span>
            </div>
          )}

          {/* Tax */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Tax ({taxRate !== undefined ? (taxRate * 100).toFixed(3) : "8.875"}%)
            </span>
            <span>${tax.toFixed(2)}</span>
          </div>

          <Separator className="my-2" />

          {/* Total */}
          <div className="flex justify-between font-semibold text-base">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
