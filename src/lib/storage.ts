import path from "node:path";

export const paymentProofDirectory = path.join(process.cwd(), "data", "payment-proofs");
export const courseFileDirectory = path.join(process.cwd(), "data", "course-files");

export function paymentProofPath(fileName: string) {
  return path.join(paymentProofDirectory, fileName);
}

export function courseFilePath(storageKey: string) {
  return path.join(courseFileDirectory, storageKey);
}
