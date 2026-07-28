import { describe, expect, it, vi } from "vitest";

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn(async () => "data:image/png;base64,test"),
  },
}));

import QRCode from "qrcode";

import {
  createQrCodeFileName,
  createShortUrlQrCodeDataUrl,
} from "./create-qr-code";

const mockedQrCode = vi.mocked(QRCode);

describe("createShortUrlQrCodeDataUrl", () => {
  it("generates a PNG QR data URL from the final short URL", async () => {
    await expect(
      createShortUrlQrCodeDataUrl("https://example.com/Ab3xP9q"),
    ).resolves.toBe("data:image/png;base64,test");

    expect(mockedQrCode.toDataURL).toHaveBeenCalledWith(
      "https://example.com/Ab3xP9q",
      {
        color: {
          dark: "#020617",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
        margin: 2,
        type: "image/png",
        width: 240,
      },
    );
  });
});

describe("createQrCodeFileName", () => {
  it("creates a safe PNG filename from the short code", () => {
    expect(createQrCodeFileName("Ab3xP9q")).toBe("linklite-Ab3xP9q-qr.png");
    expect(createQrCodeFileName("bad/code")).toBe("linklite-bad_code-qr.png");
  });
});
