import path from "node:path";

export const paymentProofDirectory = path.join(process.cwd(), "data", "payment-proofs");

export function paymentProofPath(fileName: string) {
  return path.join(paymentProofDirectory, fileName);
}
