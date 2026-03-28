import { NextRequest, NextResponse } from 'next/server';
import { getValidationQueue } from '@/lib/queue';
import type { QueueMetrics } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const queue = getValidationQueue();

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    const counts = await queue.getJobCounts('paused');
    const paused = counts?.paused || 0;

    const metrics: QueueMetrics = {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };

    return NextResponse.json({
      queue:    'validation_queue',
      snapshot: new Date().toISOString(),
      counts:   metrics,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to fetch metrics: ${msg}` },
      { status: 503 }
    );
  }
}
