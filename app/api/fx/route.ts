import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const amountUsd = parseFloat(searchParams.get('amountUsd') || '1');
    return NextResponse.json({ rate: 3.75, converted: amountUsd * 3.75, currency: 'PEN' });
  } catch (e) {
    return NextResponse.json({ rate: 1, converted: 1, currency: 'USD' });
  }
}
