export function normalizeCouponCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function calculateDiscount(price: number, type: "PERCENT" | "FIXED", value: number) {
  if (type === "PERCENT") return Math.min(price - 1000, Math.floor((price * value) / 100));
  return Math.min(price - 1000, value);
}
