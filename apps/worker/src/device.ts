import type { Device } from '@deep2k/shared';

export function detectDevice(ua: string): Device {
  if (/iPad|Tablet|PlayBook/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod|Opera Mini|IEMobile/i.test(ua)) return 'mobile';
  return 'desktop';
}
