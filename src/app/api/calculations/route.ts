import { NextRequest, NextResponse } from 'next/server';
import { executeCalculation } from '@/lib/calculations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await executeCalculation({
      region_code: body.region_code,
      travel_mode: body.travel_mode || 'none',
      travel_factor: body.travel_factor,
      exclude_incomplete: body.exclude_incomplete ?? false,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
