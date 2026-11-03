export interface SportInfo {
  key: string;
  label: string;
  icon: string;
  color: string;
}

const SPORT_MAP: Record<string, { label: string; icon: string; color: string }> = {
  running: { label: '户外跑步', icon: 'Footprints', color: 'text-emerald-500' },
  trail_running: { label: '越野跑', icon: 'Mountain', color: 'text-amber-500' },
  treadmill_running: { label: '跑步机', icon: 'Footprints', color: 'text-emerald-400' },
  street_running: { label: '路跑', icon: 'Footprints', color: 'text-emerald-500' },
  track_running: { label: '操场跑', icon: 'Footprints', color: 'text-emerald-600' },
  cycling: { label: '户外骑行', icon: 'Bike', color: 'text-blue-500' },
  indoor_cycling: { label: '室内骑行', icon: 'Bike', color: 'text-blue-400' },
  road_biking: { label: '公路骑行', icon: 'Bike', color: 'text-blue-500' },
  mountain_biking: { label: '山地骑行', icon: 'Bike', color: 'text-indigo-500' },
  gravel_cycling: { label: '砾石骑行', icon: 'Bike', color: 'text-indigo-600' },
  swimming: { label: '游泳', icon: 'Waves', color: 'text-cyan-500' },
  lap_swimming: { label: '泳池游泳', icon: 'Waves', color: 'text-cyan-500' },
  open_water_swimming: { label: '公开水域', icon: 'Waves', color: 'text-sky-600' },
  walking: { label: '步行', icon: 'Footprints', color: 'text-lime-500' },
  hiking: { label: '徒步', icon: 'MountainSnow', color: 'text-orange-500' },
  strength_training: { label: '力量训练', icon: 'Dumbbell', color: 'text-rose-500' },
  cardio_training: { label: '有氧训练', icon: 'Activity', color: 'text-pink-500' },
  yoga: { label: '瑜伽', icon: 'Heart', color: 'text-purple-500' },
  pilates: { label: '普拉提', icon: 'HeartPulse', color: 'text-purple-400' },
  rowing: { label: '划船', icon: 'Ship', color: 'text-teal-500' },
  indoor_rowing: { label: '划船机', icon: 'Ship', color: 'text-teal-400' },
  elliptical: { label: '椭圆机', icon: 'Activity', color: 'text-indigo-400' },
  stair_climbing: { label: '爬楼梯', icon: 'TrendingUp', color: 'text-yellow-500' },
  skiing: { label: '滑雪', icon: 'Snowflake', color: 'text-cyan-400' },
  snowboarding: { label: '单板滑雪', icon: 'Snowflake', color: 'text-cyan-300' },
  cross_country_skiing: { label: '越野滑雪', icon: 'Snowflake', color: 'text-sky-500' },
  fitness_equipment: { label: '健身器材', icon: 'Dumbbell', color: 'text-zinc-400' },
  other: { label: '其他运动', icon: 'Activity', color: 'text-zinc-500' },
};

export function getSportInfo(typeKey?: string): SportInfo {
  const normalizedKey = (typeKey || 'other').toLowerCase();
  const entry = SPORT_MAP[normalizedKey] || SPORT_MAP.other;
  return {
    key: normalizedKey,
    label: entry.label,
    icon: entry.icon,
    color: entry.color,
  };
}

export function formatDistance(meters?: number): string {
  if (meters === undefined || meters === null || Number.isNaN(meters)) return '-';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return '-';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDateTime(isoOrText?: string): string {
  if (!isoOrText) return '-';
  try {
    const d = new Date(isoOrText);
    if (Number.isNaN(d.getTime())) return isoOrText;
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoOrText;
  }
}
