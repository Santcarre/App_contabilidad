import { beforeAll, describe, expect, it } from "vitest";
import { encrypt, decrypt } from "@/lib/encryption";
import { randomBytes } from "crypto";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("encryption", () => {
  it("cifra y descifra correctamente (roundtrip)", async () => {
    const plaintext = "ya29.refresh-token-de-prueba-123456";
    const ciphertext = await encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
    expect(await decrypt(ciphertext)).toBe(plaintext);
  });

  it("produce IVs únicos: mismo texto cifra distinto", async () => {
    const a = await encrypt("token-igual");
    const b = await encrypt("token-igual");
    expect(a).not.toBe(b);
    expect(await decrypt(a)).toBe(await decrypt(b));
  });

  it("descifra texto vacío", async () => {
    expect(await decrypt(await encrypt(""))).toBe("");
  });

  it("falla al descifrar datos corruptos", async () => {
    const ciphertext = await encrypt("datos");
    const tampered = ciphertext.slice(0, -2) + "ab";
    await expect(decrypt(tampered)).rejects.toThrow();
  });
});
