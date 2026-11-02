import { 
  UnitOperationalStatus, 
  FailureCategory, 
  FailurePriority, 
  MaintenanceStatus, 
  ShiftType 
} from '../types/fleet';

/**
 * Returns today's date formatted as YYYY-MM-DD in local time
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current timestamp for datetime-local input YYYY-MM-DDTHH:mm
 */
export function getCurrentDateTimeLocalString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Calculates downtime in minutes between start date and end date (or reference date/now)
 */
export function calculateDowntimeMinutes(startIso: string, endIso?: string, referenceDateStr?: string): number {
  if (!startIso) return 0;
  const start = new Date(startIso).getTime();
  let end: number;
  if (endIso) {
    end = new Date(endIso).getTime();
  } else if (referenceDateStr) {
    end = new Date(referenceDateStr.includes('T') ? referenceDateStr : `${referenceDateStr}T18:00:00`).getTime();
  } else {
    const nowMs = Date.now();
    // In case system clock is behind the simulated fleet date (e.g. 2026), anchor to 2026-10-13
    if (nowMs < start) {
      end = new Date('2026-10-16T18:00:00').getTime();
    } else {
      end = nowMs;
    }
  }
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Math.round((end - start) / (1000 * 60));
}

/**
 * Calculates elapsed inoperative days from a start date (or text containing a date)
 * to a target reference date (default: '2026-10-19').
 * Example: '2025-09-26' -> 388 days
 */
export function calculateInoperativeDays(
  startStr?: string,
  referenceDateStr: string = '2026-10-19'
): {
  days: number;
  startDateIso: string;
  startDateFriendly: string;
  formatted: string;
  label: string;
  badgeText: string;
} {
  if (!startStr) {
    return {
      days: 0,
      startDateIso: '',
      startDateFriendly: '-',
      formatted: '0 días',
      label: '0 días inoperativa',
      badgeText: '0 días',
    };
  }

  // 1. Try to extract date from string (YYYY-MM-DD or DD/MM/YYYY)
  let year = 2026;
  let month = 9;
  let day = 26;
  let found = false;

  const ymdMatch = startStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
    found = true;
  } else {
    const dmyMatch = startStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      day = parseInt(dmyMatch[1], 10);
      month = parseInt(dmyMatch[2], 10);
      year = parseInt(dmyMatch[3], 10);
      found = true;
    }
  }

  if (!found) {
    // Check if it's an ISO timestamp
    const d = new Date(startStr);
    if (!isNaN(d.getTime())) {
      year = d.getUTCFullYear();
      month = d.getUTCMonth() + 1;
      day = d.getUTCDate();
      found = true;
    }
  }

  if (!found) {
    return {
      days: 0,
      startDateIso: '',
      startDateFriendly: '-',
      formatted: '0 días',
      label: '0 días inoperativa',
      badgeText: '0 días',
    };
  }

  const startDateIso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const startDateFriendly = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

  // Parse reference date
  let refYear = 2026;
  let refMonth = 10;
  let refDay = 16;

  const refMatchYmd = referenceDateStr.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (refMatchYmd) {
    refYear = parseInt(refMatchYmd[1], 10);
    refMonth = parseInt(refMatchYmd[2], 10);
    refDay = parseInt(refMatchYmd[3], 10);
  } else {
    const refMatchDmy = referenceDateStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (refMatchDmy) {
      refDay = parseInt(refMatchDmy[1], 10);
      refMonth = parseInt(refMatchDmy[2], 10);
      refYear = parseInt(refMatchDmy[3], 10);
    }
  }

  const startUtc = Date.UTC(year, month - 1, day);
  const refUtc = Date.UTC(refYear, refMonth - 1, refDay);

  const diffMs = refUtc - startUtc;
  const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  return {
    days,
    startDateIso,
    startDateFriendly,
    formatted: `${days} ${days === 1 ? 'día' : 'días'}`,
    label: `${days} ${days === 1 ? 'día' : 'días'} inoperativa`,
    badgeText: `${days} ${days === 1 ? 'día' : 'días'} fuera de servicio`,
  };
}

/**
 * Formats minutes into human readable string: "3d 4h 15m" or "5.2 hrs"
 */
export function formatDowntime(minutes: number): {
  detailed: string;
  hoursDecimal: number;
  days: number;
  hours: number;
  mins: number;
  daysOnly: string;
} {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const days = Math.floor(safeMinutes / (24 * 60));
  const remainingMinsAfterDays = safeMinutes % (24 * 60);
  const hours = Math.floor(remainingMinsAfterDays / 60);
  const mins = remainingMinsAfterDays % 60;
  const hoursDecimal = parseFloat((safeMinutes / 60).toFixed(1));

  let detailed = '';
  if (days > 0) {
    detailed += `${days}d `;
  }
  if (hours > 0 || days > 0) {
    detailed += `${hours}h `;
  }
  detailed += `${mins}m`;

  return {
    detailed: detailed.trim(),
    hoursDecimal,
    days,
    hours,
    mins,
    daysOnly: `${days} ${days === 1 ? 'día' : 'días'}`,
  };
}

/**
 * Formats YYYY-MM-DD or ISO to friendly Spanish date
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats datetime string (YYYY-MM-DDTHH:mm) into readable date and time
 */
export function formatDateTime(dateTimeStr?: string): string {
  if (!dateTimeStr) return '-';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateTimeStr;
  }
}

export const CATEGORY_LABELS: Record<FailureCategory, string> = {
  MECANICA: 'Mecánica General',
  ELECTRICA: 'Sistema Eléctrico',
  FRENOS: 'Sistema de Frenos',
  MOTOR: 'Motor y Refrigeración',
  NEUMATICOS: 'Neumáticos / Llantas',
  TRANSMISION: 'Caja y Transmisión',
  CLIMATIZACION: 'Aire Acondicionado (A/C)',
  SUSPENSION: 'Suspensión y Dirección',
  CARROCERIA: 'Carrocería / Cristales',
  SISTEMA_COMBUSTIBLE: 'Inyección / Combustible',
  PREVENTIVO: 'Mantenimiento Preventivo',
  OTRO: 'Otro / Inspección',
};

export const PRIORITY_LABELS: Record<FailurePriority, { label: string; color: string; badge: string }> = {
  CRITICA: {
    label: 'Crítica (Parada Inmediata)',
    color: 'text-rose-400',
    badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
  },
  ALTA: {
    label: 'Alta',
    color: 'text-orange-400',
    badge: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  },
  MEDIA: {
    label: 'Media',
    color: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  },
  BAJA: {
    label: 'Baja',
    color: 'text-blue-400',
    badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  },
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, { label: string; badge: string; bg: string }> = {
  ABIERTA: {
    label: 'Falla Reportada',
    badge: 'bg-red-500/20 text-red-300 border border-red-500/40',
    bg: 'bg-red-500',
  },
  EN_TALLER: {
    label: 'En Taller / Reparación',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    bg: 'bg-amber-500',
  },
  ESPERA_REPUESTOS: {
    label: 'En Espera de Repuestos',
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
    bg: 'bg-purple-500',
  },
  SOLUCIONADO: {
    label: 'Solucionado / Operativa',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    bg: 'bg-emerald-500',
  },
};

export const OPERATIONAL_STATUS_CONFIG: Record<UnitOperationalStatus, {
  label: string;
  badge: string;
  dotColor: string;
  bgLight: string;
}> = {
  OPERATIVA: {
    label: 'Operativa',
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    dotColor: 'bg-emerald-400 ring-emerald-400/30',
    bgLight: 'bg-emerald-950/20',
  },
  INOPERATIVA: {
    label: 'Inoperativa',
    badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    dotColor: 'bg-rose-500 ring-rose-500/30',
    bgLight: 'bg-rose-950/20',
  },
  EN_OBSERVACION: {
    label: 'En Observación',
    badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    dotColor: 'bg-amber-400 ring-amber-400/30',
    bgLight: 'bg-amber-950/20',
  },
};

export const SHIFT_LABELS: Record<ShiftType, string> = {
  MANANA: 'Mañana (06:00 - 14:00)',
  TARDE: 'Tarde (14:00 - 22:00)',
  NOCHE: 'Noche (22:00 - 06:00)',
  COMPLETO: 'Turno Completo / Diurno',
  ESPECIAL: 'Servicio Especial / Expreso',
};
