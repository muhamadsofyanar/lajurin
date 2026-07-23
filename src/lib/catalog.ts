export const productTypeLabel = {
  COURSE: "Kursus digital",
  DIGITAL: "Produk digital",
  SERVICE: "Jasa / layanan",
} as const;

export function productEditHref(product: { id: string; type: keyof typeof productTypeLabel }) {
  if (product.type === "SERVICE") return `/dashboard/services/products/${product.id}`;
  if (product.type === "DIGITAL") return `/dashboard/digital-products/${product.id}`;
  return `/dashboard/products/${product.id}`;
}
