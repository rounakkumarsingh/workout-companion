import type { PhotoAngle } from '@/src/features/progress-tracking/photos';
import type { getProgressPhotos } from '@/src/db/repositories/photos';

export type ProgressPhotoRow = Awaited<ReturnType<typeof getProgressPhotos>>[number];

export const PHOTO_ANGLES: readonly PhotoAngle[] = ['front', 'side', 'rear'];

export const ANGLE_LABEL: Record<PhotoAngle, string> = {
  front: 'Front',
  side: 'Side',
  rear: 'Rear',
};

export function angleLabel(angle: string): string {
  return ANGLE_LABEL[angle as PhotoAngle] ?? angle;
}

export function formatPhotoDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
