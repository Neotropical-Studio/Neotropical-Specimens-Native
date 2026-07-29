import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Destino del payload QR sandbox (escaneo → landing de intención de pago).
 * En producción WorldFirst / Alipay / WeChat resuelven el deep link nativo.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId') || '';
  const amount = url.searchParams.get('amount') || '';
  const method = url.searchParams.get('method') || 'alipay';
  const rail = url.searchParams.get('rail') || 'worldfirst';

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Pago QR · ${orderId}</title>
<style>
  body{font-family:Georgia,serif;background:#0a1f18;color:#e8f5ef;margin:0;min-height:100vh;display:grid;place-items:center;padding:24px}
  .card{max-width:420px;background:#122a22;border:1px solid #1f5c45;border-radius:16px;padding:28px}
  h1{font-size:1.25rem;margin:0 0 8px}
  p{color:#9ab5a8;font-size:.95rem;line-height:1.5}
  code{font-size:.8rem;color:#7dcea0}
</style></head>
<body><div class="card">
  <p style="letter-spacing:.2em;text-transform:uppercase;font-size:11px;color:#7dcea0;margin:0 0 12px">WorldFirst · ${method}</p>
  <h1>Intención de pago</h1>
  <p>Orden <strong>${orderId}</strong></p>
  <p>Monto: <strong>USD $${amount}</strong></p>
  <p>Riel: <code>${rail}</code> · Método: <code>${method}</code></p>
  <p style="margin-top:16px">Sandbox: en producción este QR abre Alipay / WeChat Pay vía WorldFirst. La confirmación llega por webhook y activa courier + permisos.</p>
</div></body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
