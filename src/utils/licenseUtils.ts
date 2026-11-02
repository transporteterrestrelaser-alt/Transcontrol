import { LicenseStatus, DriverLicense } from '../types/fleet';

export const DEFAULT_DEPARTMENTS = [
  'Transporte Terrestre',
  'Estación Maracay',
  'Operaciones',
  'Mantenimiento Central',
  'Seguridad y Logística',
  'Administración',
];

export const DEFAULT_LICENSE_CATEGORIES = [
  '5to Grado Profesional',
  '4to Grado',
  '3er Grado',
  '2do Grado',
  'Especial Transporte de Pasajeros',
];

export interface LicenseStatusInfo {
  status: LicenseStatus;
  daysDiff: number; // positive = days until expiry; negative = days overdue
  formattedLabel: string;
  badgeClass: string;
  dotClass: string;
  isExpired: boolean;
  isExpiringSoon: boolean; // within 30 days
  isExpiringModerate: boolean; // within 60 days
}

/**
 * Calculates license expiration status relative to a reference date (YYYY-MM-DD)
 */
export function getLicenseStatusInfo(
  expiryDateStr?: string,
  referenceDateStr: string = '2026-10-27'
): LicenseStatusInfo {
  if (!expiryDateStr) {
    return {
      status: 'VENCIDA',
      daysDiff: -999,
      formattedLabel: 'Sin fecha de vencimiento',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      dotClass: 'bg-rose-500',
      isExpired: true,
      isExpiringSoon: false,
      isExpiringModerate: false,
    };
  }

  // Parse YYYY-MM-DD safely
  const parseDateParts = (str: string) => {
    const parts = str.split('T')[0].split('-');
    if (parts.length === 3) {
      return {
        y: parseInt(parts[0], 10),
        m: parseInt(parts[1], 10),
        d: parseInt(parts[2], 10),
      };
    }
    const d = new Date(str);
    return {
      y: d.getFullYear(),
      m: d.getMonth() + 1,
      d: d.getDate(),
    };
  };

  const exp = parseDateParts(expiryDateStr);
  const ref = parseDateParts(referenceDateStr);

  const expUtc = Date.UTC(exp.y, exp.m - 1, exp.d);
  const refUtc = Date.UTC(ref.y, ref.m - 1, ref.d);

  const diffMs = expUtc - refUtc;
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) {
    const overdueDays = Math.abs(daysDiff);
    return {
      status: 'VENCIDA',
      daysDiff,
      formattedLabel: overdueDays === 1 ? 'Vencida hace 1 día' : `Vencida hace ${overdueDays} días`,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950',
      dotClass: 'bg-rose-500 animate-pulse',
      isExpired: true,
      isExpiringSoon: false,
      isExpiringModerate: false,
    };
  }

  if (daysDiff <= 30) {
    return {
      status: 'POR_VENCER',
      daysDiff,
      formattedLabel: daysDiff === 0 ? 'Vence hoy' : daysDiff === 1 ? 'Vence mañana (1 día)' : `Vence en ${daysDiff} días`,
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950',
      dotClass: 'bg-amber-400 animate-ping',
      isExpired: false,
      isExpiringSoon: true,
      isExpiringModerate: true,
    };
  }

  if (daysDiff <= 60) {
    return {
      status: 'VIGENTE',
      daysDiff,
      formattedLabel: `Vence en ${daysDiff} días (Próxima)`,
      badgeClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
      dotClass: 'bg-yellow-400',
      isExpired: false,
      isExpiringSoon: false,
      isExpiringModerate: true,
    };
  }

  // Calculate months/years if far in future
  let label = `Vence en ${daysDiff} días`;
  if (daysDiff > 365) {
    const years = (daysDiff / 365).toFixed(1);
    label = `Vigente (~${years} años)`;
  } else if (daysDiff > 60) {
    const months = Math.round(daysDiff / 30);
    label = `Vigente (~${months} meses)`;
  }

  return {
    status: 'VIGENTE',
    daysDiff,
    formattedLabel: label,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
    isExpired: false,
    isExpiringSoon: false,
    isExpiringModerate: false,
  };
}
