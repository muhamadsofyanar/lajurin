import path from "node:path";

export const paymentProofDirectory = path.join(process.cwd(), "data", "payment-proofs");
export const commissionProofDirectory = path.join(process.cwd(), "data", "commission-proofs");
export const courseFileDirectory = path.join(process.cwd(), "data", "course-files");
export const landingMediaDirectory = path.join(process.cwd(), "data", "landing-media");
export const communityMediaDirectory = path.join(process.cwd(), "data", "community-media");
export const serviceDocumentDirectory = path.join(process.cwd(), "data", "service-documents");

const storageKeyPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/;

function safeStoragePath(directory: string, storageKey: string) {
  if (!storageKeyPattern.test(storageKey) || path.basename(storageKey) !== storageKey) {
    throw new Error("Invalid storage key");
  }
  const resolvedDirectory = path.resolve(directory);
  const resolvedFile = path.resolve(directory, storageKey);
  if (!resolvedFile.startsWith(`${resolvedDirectory}${path.sep}`)) throw new Error("Invalid storage path");
  return resolvedFile;
}

export function paymentProofPath(fileName: string) {
  return safeStoragePath(paymentProofDirectory, fileName);
}

export function commissionProofPath(fileName: string) {
  return safeStoragePath(commissionProofDirectory, fileName);
}

export function courseFilePath(storageKey: string) {
  return safeStoragePath(courseFileDirectory, storageKey);
}

export function landingMediaPath(storageKey: string) {
  return safeStoragePath(landingMediaDirectory, storageKey);
}

export function communityMediaPath(storageKey: string) {
  return safeStoragePath(communityMediaDirectory, storageKey);
}

export function serviceDocumentPath(storageKey: string) {
  return safeStoragePath(serviceDocumentDirectory, storageKey);
}

export const persistentStorageDirectories = [paymentProofDirectory, commissionProofDirectory, courseFileDirectory, landingMediaDirectory, communityMediaDirectory, serviceDocumentDirectory] as const;
