import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Puedes definir tu ADMIN_EMAIL y ADMIN_PASSWORD en tu .env.local
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@neotropics.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (email === adminEmail && password === adminPassword) {
      const response = NextResponse.json({ success: true });
      // Guardar cookie de sesión admin
      response.cookies.set('admin_session', 'true', {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_NODE_ENV === 'production',
      });
      return response;
    }

    return NextResponse.json(
      { message: 'Correo o contraseña no válidos' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
