import QRCode from "qrcode";

const QR_CODE_SIZE_PX = 240;

export async function createShortUrlQrCodeDataUrl(
  shortUrl: string,
): Promise<string> {
  return QRCode.toDataURL(shortUrl, {
    color: {
      dark: "#020617",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
    margin: 2,
    type: "image/png",
    width: QR_CODE_SIZE_PX,
  });
}

export function createQrCodeFileName(code: string): string {
  const safeCode = code.replace(/[^A-Za-z0-9_-]/g, "_");

  return `linklite-${safeCode || "short-link"}-qr.png`;
}
