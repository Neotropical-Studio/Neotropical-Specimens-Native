import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const slot = formData.get('slot') as string | null;

    if (!file && !slot) {
      return NextResponse.json(
        { ok: false, error: 'Parámetros insuficientes en la solicitud.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Operación procesada correctamente.',
      slot: slot || 'default',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Error no identificado en el servidor.';

    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/admin/node-media',
    status: 'active',
  });
}
