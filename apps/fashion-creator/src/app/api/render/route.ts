import { NextResponse } from 'next/server';
import { buildImagePrompt } from '@/lib/imagePrompt';
import type { GarmentParams } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface RenderRequest {
  params: GarmentParams;
  seed?: number;
}

interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[] | null;
  error?: string | null;
}

export async function POST(req: Request) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'REPLICATE_API_TOKEN is not set' },
      { status: 500 },
    );
  }

  let body: RenderRequest;
  try {
    body = (await req.json()) as RenderRequest;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  if (!body?.params) {
    return NextResponse.json({ error: 'missing params' }, { status: 400 });
  }

  const prompt = buildImagePrompt(body.params);

  const res = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=55',
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: '9:16',
          num_inference_steps: 4,
          output_format: 'webp',
          output_quality: 88,
          ...(body.seed !== undefined ? { seed: body.seed } : {}),
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    return NextResponse.json(
      { error: 'replicate request failed', status: res.status, detail },
      { status: 502 },
    );
  }

  const prediction = (await res.json()) as ReplicatePrediction;

  if (prediction.status === 'failed' || prediction.status === 'canceled') {
    return NextResponse.json(
      { error: prediction.error ?? 'prediction failed' },
      { status: 502 },
    );
  }

  const url = Array.isArray(prediction.output)
    ? prediction.output[0]
    : prediction.output;

  if (!url) {
    return NextResponse.json(
      { error: 'no image returned', status: prediction.status, id: prediction.id },
      { status: 502 },
    );
  }

  return NextResponse.json({ url, prompt });
}
