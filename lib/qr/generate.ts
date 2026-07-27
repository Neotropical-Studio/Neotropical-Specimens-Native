// ============================================================================
// QR de trazabilidad logística (Sección 4). Codifica una URL, no un payload
// JSON: sigue siendo escaneable por la cámara de cualquier teléfono, el propio
// código PNG queda simple/robusto, y el contenido de la página de rastreo
// puede cambiar (estado del embarque) sin necesidad de reimprimir el QR.
// ============================================================================
import QRCode from 'qrcode';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const DEFAULT_LOCALE = process.env.NEXT_PUBLIC_DEFAULT_LOCALE || 'en';

export function buildTrackingUrl(shipmentCode: string): string {
  return `${SITE_URL}/${DEFAULT_LOCALE}/track/${encodeURIComponent(shipmentCode)}`;
}

export async function generateQrPngBuffer(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
  });
}
