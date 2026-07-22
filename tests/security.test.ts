import assert from "node:assert/strict";
import test from "node:test";
import { paymentProofPath } from "../src/lib/storage";
import { verifyUploadSignature } from "../src/lib/security";

test("storage path menolak traversal dan separator", () => {
  assert.throws(() => paymentProofPath("../rahasia.env"));
  assert.throws(() => paymentProofPath("folder/bukti.jpg"));
  assert.match(paymentProofPath("bukti-123.jpg"), /payment-proofs/);
});

test("signature file umum diverifikasi dari isi", () => {
  assert.equal(verifyUploadSignature(Buffer.from([0xff, 0xd8, 0xff, 0x00]), "image/jpeg"), true);
  assert.equal(verifyUploadSignature(Buffer.from("bukan gambar"), "image/jpeg"), false);
  assert.equal(verifyUploadSignature(Buffer.from("%PDF-1.7"), "application/pdf"), true);
  assert.equal(verifyUploadSignature(Buffer.from("RIFF1234WEBP"), "image/webp"), true);
});
