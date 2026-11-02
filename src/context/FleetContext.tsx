import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Vehicle,
  DailyVehicleStatus,
  MaintenanceReport,
  Driver,
  DailyDriverAssignment,
  UnitOperationalStatus,
  DriverLicense,
  ShiftType,
} from '../types/fleet';
import {
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_MAINTENANCE_REPORTS,
  INITIAL_LICENSES,
  getInitialDailyStatuses,
  getInitialDailyAssignments,
} from '../data/initialData';
import { 
  getTodayDateString, 
  calculateDowntimeMinutes, 
  calculateInoperativeDays 
} from '../utils/timeUtils';
import { getUnitDefaultPhoto } from '../utils/imageUtils';
import { getLicenseStatusInfo } from '../utils/licenseUtils';

interface FleetContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  dailyStatuses: DailyVehicleStatus[];
  maintenanceReports: MaintenanceReport[];
  dailyAssignments: DailyDriverAssignment[];
  
  // Status methods
  getUnitStatusForDate: (unitId: string, date?: string) => DailyVehicleStatus;
  getUnitFailures: (unitIdOrNumber: string) => MaintenanceReport[];
  getUnitLatestFailure: (unitIdOrNumber: string) => MaintenanceReport | undefined;
  getUnitActiveTicket: (unitId: string) => MaintenanceReport | undefined;
  setUnitStatus: (
    unitId: string,
    status: UnitOperationalStatus,
    reason?: string,
    notes?: string,
    createReport?: boolean,
    reportData?: Partial<MaintenanceReport>
  ) => void;
  batchSetStatus: (status: UnitOperationalStatus) => void;

  // Maintenance methods
  addMaintenanceReport: (report: Omit<MaintenanceReport, 'id'>) => string;
  updateMaintenanceReport: (id: string, updates: Partial<MaintenanceReport>) => void;
  resolveMaintenanceReport: (
    id: string,
    solutionData: {
      workshopActions: string;
      diagnosticNotes?: string;
      partsReplaced?: string;
      mechanicAssigned?: string;
      solutionDate: string;
      estimatedCost?: number;
      markUnitOperative?: boolean;
    }
  ) => void;
  deleteMaintenanceReport: (id: string) => void;

  // Vehicles & Drivers management
  addVehicle: (vehicle: Omit<Vehicle, 'id'>) => void;
  updateVehicle: (id: string, vehicle: Partial<Vehicle>) => void;
  updateVehiclePhoto: (id: string, photoUrl: string | undefined) => void;
  deleteVehicle: (id: string) => void;
  addDriver: (driver: Omit<Driver, 'id'>) => void;
  updateDriver: (id: string, driver: Partial<Driver>) => void;
  deleteDriver: (id: string) => void;

  // Assignments & Daily Driver Tracking
  addAssignment: (assignment: Omit<DailyDriverAssignment, 'id'>) => { success: boolean; error?: string };
  updateAssignment: (id: string, updates: Partial<DailyDriverAssignment>) => void;
  deleteAssignment: (id: string) => void;
  assignDriverToUnit: (
    unitId: string, 
    driverNameOrId: string, 
    date?: string, 
    shift?: ShiftType, 
    route?: string, 
    notes?: string
  ) => void;
  removeAssignmentForUnitAndDate: (unitId: string, date?: string) => void;
  getAssignmentForUnitAndDate: (unitId: string, date?: string) => DailyDriverAssignment | undefined;
  getDailyAssignmentsForDate: (date: string) => DailyDriverAssignment[];
  allAssignedDates: string[];

  // Licenses Management
  licenses: DriverLicense[];
  addLicense: (license: Omit<DriverLicense, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateLicense: (id: string, updates: Partial<DriverLicense>) => void;
  deleteLicense: (id: string) => void;
  renewLicense: (id: string, newExpiryDate: string, notes?: string) => void;
  licenseMetrics: {
    total: number;
    validCount: number;
    expiringSoonCount: number;
    expiredCount: number;
    departments: string[];
  };

  clearAllData: () => void;
  loadDemoData: () => void;
  resetToInitialData: () => void;

  // Computed metrics
  metrics: {
    totalActiveVehicles: number;
    pureOperativeCount: number;
    operativeCount: number;
    inoperativeCount: number;
    observationCount: number;
    availabilityRate: number; // Percentage 0 - 100
    activeFailuresCount: number;
    totalDowntimeMinutesAllTime: number;
    totalDowntimeHoursAllTime: number;
    totalInoperativeDays: number;
    averageResolutionHours: number;
    assignedDriversTodayCount: number;
    totalDriversCount: number;
    // Daily operational passenger capacity
    totalPassengerCapacity: number;
    operativePassengerCapacity: number;
    inoperativePassengerCapacity: number;
    observationPassengerCapacity: number;
    capacityAvailabilityRate: number; // Percentage 0 - 100 based on seats
    mobilizedPassengersToday: number;
  };
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

const STORAGE_KEYS = {
  VEHICLES: 'transcontrol_vehicles_v14_oct27_u42inop',
  DRIVERS: 'transcontrol_drivers_v14_oct27_u42inop',
  STATUSES: 'transcontrol_daily_statuses_v14_oct27_u42inop',
  MAINTENANCE: 'transcontrol_maintenance_v14_oct27_u42inop',
  ASSIGNMENTS: 'transcontrol_assignments_v14_oct27_u42inop',
  LICENSES: 'transcontrol_licenses_v14_oct27_u42inop',
};

// Clean legacy keys to ensure fresh load of user fleet data
try {
  [
    'transcontrol_vehicles_v2', 'transcontrol_drivers_v2', 'transcontrol_daily_statuses_v2', 'transcontrol_maintenance_v2', 'transcontrol_assignments_v2',
    'transcontrol_vehicles_v3_clean', 'transcontrol_drivers_v3_clean', 'transcontrol_daily_statuses_v3_clean', 'transcontrol_maintenance_v3_clean', 'transcontrol_assignments_v3_clean',
    'transcontrol_vehicles_v4_laser', 'transcontrol_drivers_v4_laser', 'transcontrol_daily_statuses_v4_laser', 'transcontrol_maintenance_v4_laser', 'transcontrol_assignments_v4_laser',
    'transcontrol_vehicles_v5_specs', 'transcontrol_drivers_v5_specs', 'transcontrol_daily_statuses_v5_specs', 'transcontrol_maintenance_v5_specs', 'transcontrol_assignments_v5_specs',
    'transcontrol_vehicles_v6_oct9', 'transcontrol_drivers_v6_oct9', 'transcontrol_daily_statuses_v6_oct9', 'transcontrol_maintenance_v6_oct9', 'transcontrol_assignments_v6_oct9',
    'transcontrol_vehicles_v7_oct9_dias_inop', 'transcontrol_drivers_v7_oct9_dias_inop', 'transcontrol_daily_statuses_v7_oct9_dias_inop', 'transcontrol_maintenance_v7_oct9_dias_inop', 'transcontrol_assignments_v7_oct9_dias_inop',
    'transcontrol_vehicles_v8_oct9_inop2025', 'transcontrol_drivers_v8_oct9_inop2025', 'transcontrol_daily_statuses_v8_oct9_inop2025', 'transcontrol_maintenance_v8_oct9_inop2025', 'transcontrol_assignments_v8_oct9_inop2025',
    'transcontrol_vehicles_v9_oct10_status', 'transcontrol_drivers_v9_oct10_status', 'transcontrol_daily_statuses_v9_oct10_status', 'transcontrol_maintenance_v9_oct10_status', 'transcontrol_assignments_v9_oct10_status',
    'transcontrol_vehicles_v10_oct13_status', 'transcontrol_drivers_v10_oct13_status', 'transcontrol_daily_statuses_v10_oct13_status', 'transcontrol_maintenance_v10_oct13_status', 'transcontrol_assignments_v10_oct13_status',
    'transcontrol_vehicles_v11_oct13_updated', 'transcontrol_drivers_v11_oct13_updated', 'transcontrol_daily_statuses_v11_oct13_updated', 'transcontrol_maintenance_v11_oct13_updated', 'transcontrol_assignments_v11_oct13_updated', 'transcontrol_licenses_v11_oct13_updated',
    'transcontrol_vehicles_v12_oct13_u23inop', 'transcontrol_drivers_v12_oct13_u23inop', 'transcontrol_daily_statuses_v12_oct13_u23inop', 'transcontrol_maintenance_v12_oct13_u23inop', 'transcontrol_assignments_v12_oct13_u23inop', 'transcontrol_licenses_v12_oct13_u23inop',
    'transcontrol_vehicles_v13_oct16_u23op', 'transcontrol_drivers_v13_oct16_u23op', 'transcontrol_daily_statuses_v13_oct16_u23op', 'transcontrol_maintenance_v13_oct16_u23op', 'transcontrol_assignments_v13_oct16_u23op', 'transcontrol_licenses_v13_oct16_u23op',
  ].forEach(k => {
    localStorage.removeItem(k);
  });
} catch {
  // Ignore in SSR
}

export const FleetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Vehicles
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VEHICLES);
      if (saved) {
        const parsed: Vehicle[] = JSON.parse(saved);
        return parsed.map(v => {
          const matched = INITIAL_VEHICLES.find(iv => iv.unitNumber.toLowerCase() === v.unitNumber.toLowerCase() || iv.id === v.id);
          if (matched) {
            return { 
              ...v, 
              capacity: matched.capacity, 
              type: matched.type, 
              model: matched.model,
              notes: v.notes || matched.notes,
              inoperativeSince: matched.inoperativeSince || v.inoperativeSince,
              inoperativeDays: matched.inoperativeDays || v.inoperativeDays,
              photoUrl: v.photoUrl || matched.photoUrl || getUnitDefaultPhoto(v.unitNumber),
            };
          }
          return {
            ...v,
            photoUrl: v.photoUrl || getUnitDefaultPhoto(v.unitNumber),
          };
        });
      }
      return INITIAL_VEHICLES;
    } catch {
      return INITIAL_VEHICLES;
    }
  });

  // Drivers
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DRIVERS);
      return saved ? JSON.parse(saved) : INITIAL_DRIVERS;
    } catch {
      return INITIAL_DRIVERS;
    }
  });

  // Daily Statuses
  const [dailyStatuses, setDailyStatuses] = useState<DailyVehicleStatus[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATUSES);
      const list: DailyVehicleStatus[] = saved ? JSON.parse(saved) : getInitialDailyStatuses(getTodayDateString());
      return list.map(item => {
        if (item.unitId === 'veh-11' || item.unitNumber.toLowerCase().includes('11')) {
          return {
            ...item,
            status: 'INOPERATIVA' as const,
            reason: 'ruido en motor, Inoperativa desde el 26/09/2025',
            inoperativeSince: '2025-09-26',
            inoperativeDays: calculateInoperativeDays('2025-09-26', item.date || '2026-10-19').days,
            maintenanceReportId: 'mnt-11',
          };
        }
        if (item.unitId === 'veh-23' || item.unitNumber.toLowerCase().includes('23')) {
          return {
            ...item,
            status: 'OPERATIVA' as const,
            notes: 'Operativa • Operador: Jose Dávila',
            reason: undefined,
            inoperativeSince: undefined,
            inoperativeDays: undefined,
            maintenanceReportId: undefined,
          };
        }
        if (item.unitId === 'veh-37' || item.unitNumber.toLowerCase().includes('37')) {
          return {
            ...item,
            status: 'OPERATIVA' as const,
            notes: 'Operativa • Operador: Graviel Azuaje',
          };
        }
        if (item.unitId === 'veh-42' || item.unitNumber.toLowerCase().includes('42')) {
          return {
            ...item,
            status: 'OPERATIVA' as const,
            notes: 'Operativa • Operador: Jose Dávila',
          };
        }
        if (item.unitId === 'veh-44' || item.unitNumber.toLowerCase().includes('44')) {
          return {
            ...item,
            status: 'OPERATIVA' as const,
            notes: 'Operativa • Estación Maracay • Operador: Vicente Chacón',
          };
        }
        if (item.unitId === 'veh-43' || item.unitNumber.toLowerCase().includes('43')) {
          return {
            ...item,
            status: 'EN_OBSERVACION' as const,
            reason: 'Falla de Potencia disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros',
            notes: 'Falla de Potencia disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros • Operador: Edgar Marín',
            maintenanceReportId: 'mnt-43',
          };
        }
        return item;
      });
    } catch {
      return getInitialDailyStatuses(getTodayDateString());
    }
  });

  // Maintenance Reports
  const [maintenanceReports, setMaintenanceReports] = useState<MaintenanceReport[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MAINTENANCE);
      return saved ? JSON.parse(saved) : INITIAL_MAINTENANCE_REPORTS;
    } catch {
      return INITIAL_MAINTENANCE_REPORTS;
    }
  });

  // Daily Assignments
  const [dailyAssignments, setDailyAssignments] = useState<DailyDriverAssignment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      return saved ? JSON.parse(saved) : getInitialDailyAssignments(getTodayDateString());
    } catch {
      return getInitialDailyAssignments(getTodayDateString());
    }
  });

  // Licenses State
  const [licenses, setLicenses] = useState<DriverLicense[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LICENSES);
      return saved ? JSON.parse(saved) : INITIAL_LICENSES;
    } catch {
      return INITIAL_LICENSES;
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STATUSES, JSON.stringify(dailyStatuses));
  }, [dailyStatuses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MAINTENANCE, JSON.stringify(maintenanceReports));
  }, [maintenanceReports]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(dailyAssignments));
  }, [dailyAssignments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LICENSES, JSON.stringify(licenses));
  }, [licenses]);

  /**
   * Helper to retrieve status for a specific vehicle on a given date.
   * Únicamente cuando la unidad esté con condición se coloca como operativa (EN_OBSERVACION).
   * Si está inoperativa en taller (como Unidad 11 desde 2025-09-26 o reporte en taller),
   * NO PUEDE estar disponible en la capacidad operativa y se mantiene como INOPERATIVA.
   */
  const getUnitStatusForDate = (unitId: string, date: string = selectedDate): DailyVehicleStatus => {
    const existing = dailyStatuses.find(s => s.unitId === unitId && s.date === date);
    if (existing) return existing;

    const vehicle = vehicles.find(v => v.id === unitId);
    if (!vehicle) {
      return {
        id: `virtual-${date}-${unitId}`,
        date,
        unitId,
        unitNumber: unitId,
        status: 'OPERATIVA',
        notes: '',
        updatedAt: new Date().toISOString(),
      };
    }

    // 1. Verificar si la unidad está inoperativa en taller
    const inopTicket = maintenanceReports.find(r => 
      (r.unitId === unitId || r.unitNumber.toLowerCase() === vehicle.unitNumber.toLowerCase()) &&
      r.status !== 'SOLUCIONADO' &&
      (r.priority === 'CRITICA' || r.status === 'EN_TALLER' || r.description.toLowerCase().includes('inoperativ') || r.description.toLowerCase().includes('ruido en motor'))
    );
    const isInopSince = vehicle.inoperativeSince && date >= vehicle.inoperativeSince;
    const isNotesInop = vehicle.notes && vehicle.notes.toLowerCase().includes('inoperativa') && !vehicle.notes.toLowerCase().includes('operativa con condicion');

    if (isInopSince || inopTicket || isNotesInop || vehicle.id === 'veh-11') {
      const defaultSince = '2025-09-26';
      const defaultReason = 'ruido en motor, Inoperativa desde el 26/09/2025';
      const calc = calculateInoperativeDays(vehicle.inoperativeSince || inopTicket?.workshopEntryDate || vehicle.notes || defaultSince, date);
      return {
        id: `virtual-${date}-${unitId}`,
        date,
        unitId,
        unitNumber: vehicle.unitNumber,
        status: 'INOPERATIVA',
        reason: vehicle.notes || inopTicket?.description || defaultReason,
        inoperativeSince: vehicle.inoperativeSince || defaultSince,
        inoperativeDays: calc.days,
        maintenanceReportId: inopTicket?.id || (vehicle.id === 'veh-11' ? 'mnt-11' : undefined),
        notes: vehicle.notes || 'Inoperativa en taller por falla de motor (No disponible en capacidad operativa)',
        updatedAt: new Date().toISOString(),
      };
    }

    // 2. Únicamente cuando la unidad tenga condición (Unidad 43) se coloca en observación
    const isCondition = (vehicle.notes && (vehicle.notes.toLowerCase().includes('falla de potencia') || vehicle.notes.toLowerCase().includes('condicion'))) || vehicle.id === 'veh-43';
    if (isCondition) {
      return {
        id: `virtual-${date}-${unitId}`,
        date,
        unitId,
        unitNumber: vehicle.unitNumber,
        status: 'EN_OBSERVACION',
        reason: 'Falla de Potencia disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros',
        maintenanceReportId: 'mnt-43',
        notes: vehicle.notes,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: `virtual-${date}-${unitId}`,
      date,
      unitId,
      unitNumber: vehicle.unitNumber,
      status: 'OPERATIVA',
      notes: vehicle.notes || '',
      updatedAt: new Date().toISOString(),
    };
  };

  /**
   * Returns all failure reports associated with a vehicle, ordered from most recent to oldest.
   */
  const getUnitFailures = (unitIdOrNumber: string): MaintenanceReport[] => {
    const q = unitIdOrNumber.toLowerCase().trim();
    return maintenanceReports
      .filter(r => r.unitId === unitIdOrNumber || r.unitNumber.toLowerCase().trim() === q)
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  };

  /**
   * Returns the most recent failure report for a unit, if any.
   */
  const getUnitLatestFailure = (unitIdOrNumber: string): MaintenanceReport | undefined => {
    const list = getUnitFailures(unitIdOrNumber);
    return list[0];
  };

  /**
   * Returns the currently active (unsolved) maintenance report for a unit.
   */
  const getUnitActiveTicket = (unitId: string): MaintenanceReport | undefined => {
    return maintenanceReports.find(r => (r.unitId === unitId || r.unitNumber.toLowerCase() === unitId.toLowerCase()) && r.status !== 'SOLUCIONADO');
  };

  /**
   * Update or insert daily status for a unit.
   */
  const setUnitStatus = (
    unitId: string,
    status: UnitOperationalStatus,
    reason?: string,
    notes?: string,
    createReport?: boolean,
    reportData?: Partial<MaintenanceReport>
  ) => {
    const vehicle = vehicles.find(v => v.id === unitId);
    if (!vehicle) return;

    let linkedReportId = reportData?.id;

    if (createReport && status === 'INOPERATIVA') {
      const newReportId = `mnt-${Date.now()}`;
      linkedReportId = newReportId;
      const newReport: MaintenanceReport = {
        id: newReportId,
        unitId,
        unitNumber: vehicle.unitNumber,
        licensePlate: vehicle.licensePlate,
        reportDate: reportData?.reportDate || `${selectedDate}T08:00`,
        reporterName: reportData?.reporterName || 'Inspector de Turno',
        category: reportData?.category || 'MECANICA',
        priority: reportData?.priority || 'ALTA',
        description: reason || reportData?.description || 'Unidad declarada inoperativa en inspección diaria.',
        status: 'ABIERTA',
        workshopEntryDate: `${selectedDate}T08:30`,
        mechanicAssigned: reportData?.mechanicAssigned || 'Taller Central',
      };
      setMaintenanceReports(prev => [newReport, ...prev]);
    }

    setDailyStatuses(prev => {
      const idx = prev.findIndex(s => s.unitId === unitId && s.date === selectedDate);
      
      let inopSince: string | undefined = undefined;
      let inopDays: number | undefined = undefined;
      if (status === 'INOPERATIVA') {
        const inopCalc = calculateInoperativeDays(
          reportData?.reportDate || reason || vehicle.inoperativeSince || selectedDate,
          selectedDate
        );
        inopSince = inopCalc.startDateIso || selectedDate;
        inopDays = inopCalc.days;
      }

      const updatedItem: DailyVehicleStatus = {
        id: idx >= 0 ? prev[idx].id : `stat-${selectedDate}-${unitId}`,
        date: selectedDate,
        unitId,
        unitNumber: vehicle.unitNumber,
        status,
        reason: status === 'OPERATIVA' ? undefined : (reason || (idx >= 0 ? prev[idx].reason : undefined)),
        inoperativeSince: inopSince,
        inoperativeDays: inopDays,
        maintenanceReportId: linkedReportId || (idx >= 0 ? prev[idx].maintenanceReportId : undefined),
        notes: notes !== undefined ? notes : (idx >= 0 ? prev[idx].notes : ''),
        updatedAt: new Date().toISOString(),
      };

      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedItem;
        return copy;
      } else {
        return [...prev, updatedItem];
      }
    });
  };

  /**
   * Batch update all active vehicles to a certain status for selectedDate.
   * Únicamente las unidades que no estén inoperativas en taller pueden cambiarse a operativa.
   * Si una unidad está inoperativa en taller (ej: Unidad 11), NO puede colocarse como disponible en la capacidad operativa.
   */
  const batchSetStatus = (status: UnitOperationalStatus) => {
    const activeVehicles = vehicles.filter(v => v.active);
    setDailyStatuses(prev => {
      const filtered = prev.filter(s => s.date !== selectedDate);
      const newStatuses: DailyVehicleStatus[] = activeVehicles.map(v => {
        // Verificar si la unidad está inoperativa en taller
        const inopTicket = maintenanceReports.find(r => 
          (r.unitId === v.id || r.unitNumber.toLowerCase() === v.unitNumber.toLowerCase()) &&
          r.status !== 'SOLUCIONADO' &&
          (r.priority === 'CRITICA' || r.status === 'EN_TALLER' || r.description.toLowerCase().includes('inoperativ') || r.description.toLowerCase().includes('ruido en motor'))
        );
        const isInop = (v.inoperativeSince && selectedDate >= v.inoperativeSince) ||
                       (v.notes && v.notes.toLowerCase().includes('inoperativa') && !v.notes.toLowerCase().includes('operativa con condicion')) ||
                       inopTicket !== undefined ||
                       v.id === 'veh-11';

        if (isInop && status === 'OPERATIVA') {
          const defaultSince = '2025-09-26';
          const defaultReason = 'ruido en motor, Inoperativa desde el 26/09/2025';
          const calc = calculateInoperativeDays(v.inoperativeSince || inopTicket?.workshopEntryDate || v.notes || defaultSince, selectedDate);
          return {
            id: `stat-${selectedDate}-${v.id}`,
            date: selectedDate,
            unitId: v.id,
            unitNumber: v.unitNumber,
            status: 'INOPERATIVA',
            reason: v.notes || inopTicket?.description || defaultReason,
            inoperativeSince: v.inoperativeSince || defaultSince,
            inoperativeDays: calc.days,
            maintenanceReportId: inopTicket?.id || (v.id === 'veh-11' ? 'mnt-11' : undefined),
            notes: v.notes || 'Inoperativa en taller por falla mecánica (No disponible en capacidad operativa)',
            updatedAt: new Date().toISOString(),
          };
        }

        // Si es unidad con condición (Unidad 43) y se solicita OPERATIVA, se mantiene como EN_OBSERVACION (operativa con condición)
        const isCondition = (v.notes && (v.notes.toLowerCase().includes('falla de potencia') || v.notes.toLowerCase().includes('condicion'))) || v.id === 'veh-43';
        if (isCondition && status === 'OPERATIVA') {
          return {
            id: `stat-${selectedDate}-${v.id}`,
            date: selectedDate,
            unitId: v.id,
            unitNumber: v.unitNumber,
            status: 'EN_OBSERVACION',
            reason: 'Falla de Potencia disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros',
            maintenanceReportId: 'mnt-43',
            notes: v.notes,
            updatedAt: new Date().toISOString(),
          };
        }

        return {
          id: `stat-${selectedDate}-${v.id}`,
          date: selectedDate,
          unitId: v.id,
          unitNumber: v.unitNumber,
          status,
          reason: status === 'OPERATIVA' ? undefined : 'Cambio masivo de estatus diario',
          notes: `Actualización global a ${status}`,
          updatedAt: new Date().toISOString(),
        };
      });
      return [...filtered, ...newStatuses];
    });
  };

  /**
   * Maintenance Actions
   */
  const addMaintenanceReport = (report: Omit<MaintenanceReport, 'id'>): string => {
    const id = `mnt-${Date.now()}`;
    const newReport: MaintenanceReport = {
      ...report,
      id,
    };
    setMaintenanceReports(prev => [newReport, ...prev]);

    // Also mark the vehicle as INOPERATIVA for the report date if status is not SOLUCIONADO
    if (newReport.status !== 'SOLUCIONADO') {
      const reportDay = newReport.reportDate.split('T')[0];
      setDailyStatuses(prev => {
        const idx = prev.findIndex(s => s.unitId === newReport.unitId && s.date === reportDay);
        const item: DailyVehicleStatus = {
          id: idx >= 0 ? prev[idx].id : `stat-${reportDay}-${newReport.unitId}`,
          date: reportDay,
          unitId: newReport.unitId,
          unitNumber: newReport.unitNumber,
          status: 'INOPERATIVA',
          reason: `Falla: ${newReport.description.slice(0, 60)}...`,
          maintenanceReportId: id,
          updatedAt: new Date().toISOString(),
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = item;
          return copy;
        }
        return [...prev, item];
      });
    }

    return id;
  };

  const updateMaintenanceReport = (id: string, updates: Partial<MaintenanceReport>) => {
    setMaintenanceReports(prev =>
      prev.map(item => {
        if (item.id === id) {
          const merged = { ...item, ...updates };
          if (merged.solutionDate && merged.reportDate) {
            merged.downtimeMinutes = calculateDowntimeMinutes(merged.reportDate, merged.solutionDate);
          }
          return merged;
        }
        return item;
      })
    );
  };

  const resolveMaintenanceReport = (
    id: string,
    solutionData: {
      workshopActions: string;
      diagnosticNotes?: string;
      partsReplaced?: string;
      mechanicAssigned?: string;
      solutionDate: string;
      estimatedCost?: number;
      markUnitOperative?: boolean;
    }
  ) => {
    setMaintenanceReports(prev =>
      prev.map(item => {
        if (item.id === id) {
          const totalMinutes = calculateDowntimeMinutes(
            item.workshopEntryDate || item.reportDate,
            solutionData.solutionDate
          );
          return {
            ...item,
            status: 'SOLUCIONADO',
            solutionActions: solutionData.workshopActions,
            diagnosticNotes: solutionData.diagnosticNotes || item.diagnosticNotes,
            partsReplaced: solutionData.partsReplaced || item.partsReplaced,
            mechanicAssigned: solutionData.mechanicAssigned || item.mechanicAssigned,
            solutionDate: solutionData.solutionDate,
            estimatedCost: solutionData.estimatedCost !== undefined ? solutionData.estimatedCost : item.estimatedCost,
            downtimeMinutes: totalMinutes,
          };
        }
        return item;
      })
    );

    // If requested, also set unit to OPERATIVA on selectedDate
    if (solutionData.markUnitOperative) {
      const rep = maintenanceReports.find(r => r.id === id);
      if (rep) {
        setUnitStatus(rep.unitId, 'OPERATIVA', undefined, 'Solucionado en taller mecánico. Unidad dada de alta.');
      }
    }
  };

  const deleteMaintenanceReport = (id: string) => {
    setMaintenanceReports(prev => prev.filter(r => r.id !== id));
  };

  // Vehicles CRUD
  const addVehicle = (veh: Omit<Vehicle, 'id'>) => {
    const id = `veh-${Date.now()}`;
    setVehicles(prev => [...prev, { ...veh, id }]);
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles(prev => prev.map(v => (v.id === id ? { ...v, ...updates } : v)));
  };

  const updateVehiclePhoto = (id: string, photoUrl: string | undefined) => {
    updateVehicle(id, { photoUrl });
  };

  const deleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  // Drivers CRUD
  const addDriver = (drv: Omit<Driver, 'id'>) => {
    const id = `drv-${Date.now()}`;
    setDrivers(prev => [...prev, { ...drv, id }]);
  };

  const updateDriver = (id: string, updates: Partial<Driver>) => {
    setDrivers(prev => prev.map(d => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDriver = (id: string) => {
    setDrivers(prev => prev.filter(d => d.id !== id));
  };

  // Assignments CRUD with validation
  const addAssignment = (assignment: Omit<DailyDriverAssignment, 'id'>): { success: boolean; error?: string } => {
    // Check if unit is inoperative on that date
    const unitStatus = getUnitStatusForDate(assignment.unitId, assignment.date);
    if (unitStatus.status === 'INOPERATIVA') {
      return {
        success: false,
        error: `La unidad ${assignment.unitNumber} se encuentra INOPERATIVA en fecha ${assignment.date} (${unitStatus.reason || 'En taller'}). Por seguridad no se puede asignar.`,
      };
    }

    // Check if driver is already assigned on same date and overlapping shift
    const existingDriverAssignment = dailyAssignments.find(
      a => a.date === assignment.date && a.driverId === assignment.driverId && a.shift === assignment.shift
    );
    if (existingDriverAssignment) {
      return {
        success: false,
        error: `El chofer ${assignment.driverName} ya tiene una asignación activa (${existingDriverAssignment.unitNumber} - ${existingDriverAssignment.route}) en el turno seleccionado.`,
      };
    }

    const newAssignment: DailyDriverAssignment = {
      ...assignment,
      id: `asg-${Date.now()}`,
    };
    setDailyAssignments(prev => [newAssignment, ...prev]);
    return { success: true };
  };

  const updateAssignment = (id: string, updates: Partial<DailyDriverAssignment>) => {
    setDailyAssignments(prev => prev.map(a => (a.id === id ? { ...a, ...updates } : a)));
  };

  const deleteAssignment = (id: string) => {
    setDailyAssignments(prev => prev.filter(a => a.id !== id));
  };

  /**
   * Asigna y guarda el chofer encargado de una unidad en una fecha determinada.
   * Permite actualizar o crear la asignación y sincroniza el operador en el estatus diario.
   */
  const assignDriverToUnit = (
    unitId: string, 
    driverNameOrId: string, 
    date?: string, 
    shift?: ShiftType, 
    route?: string, 
    notes?: string
  ) => {
    const targetDate = date || selectedDate;
    const vehicle = vehicles.find(v => v.id === unitId || v.unitNumber.toLowerCase() === unitId.toLowerCase());
    if (!vehicle) return;

    const matchedDriver = drivers.find(d => 
      d.id === driverNameOrId || 
      d.fullName.toLowerCase() === driverNameOrId.toLowerCase()
    );

    const driverName = matchedDriver ? matchedDriver.fullName : driverNameOrId;
    const driverId = matchedDriver 
      ? matchedDriver.id 
      : (driverNameOrId.startsWith('drv-') ? driverNameOrId : `drv-custom-${Date.now()}`);

    const defaultRoute = route || (vehicle.unitNumber.includes('44') 
      ? 'Estación Maracay' 
      : vehicle.unitNumber.includes('43') 
      ? 'Traslados o requerimientos cortos: tripulación, requerimientos especiales' 
      : 'Ruta Regular Transporte de Personal');

    setDailyAssignments(prev => {
      const existingIdx = prev.findIndex(a => 
        (a.unitId === vehicle.id || a.unitNumber.toLowerCase() === vehicle.unitNumber.toLowerCase()) && 
        a.date === targetDate
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          driverId,
          driverName,
          driverPhone: matchedDriver?.phone || next[existingIdx].driverPhone,
          licenseNumber: matchedDriver?.licenseNumber || next[existingIdx].licenseNumber,
          shift: shift || next[existingIdx].shift || 'COMPLETO',
          route: defaultRoute,
          notes: notes !== undefined ? notes : next[existingIdx].notes,
        };
        return next;
      } else {
        const newAsg: DailyDriverAssignment = {
          id: `asg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          date: targetDate,
          unitId: vehicle.id,
          unitNumber: vehicle.unitNumber,
          driverId,
          driverName,
          driverPhone: matchedDriver?.phone,
          licenseNumber: matchedDriver?.licenseNumber,
          shift: shift || 'COMPLETO',
          route: defaultRoute,
          notes: notes || '',
          assignedAt: new Date().toISOString(),
        };
        return [newAsg, ...prev];
      }
    });

    // Synchronize operatorName on dailyStatuses for that unit & targetDate
    setDailyStatuses(prev => {
      const sIndex = prev.findIndex(s => s.unitId === vehicle.id && s.date === targetDate);
      if (sIndex >= 0) {
        const nextStatuses = [...prev];
        nextStatuses[sIndex] = {
          ...nextStatuses[sIndex],
          operatorName: driverName,
        };
        return nextStatuses;
      }
      return prev;
    });
  };

  const removeAssignmentForUnitAndDate = (unitId: string, date?: string) => {
    const targetDate = date || selectedDate;
    setDailyAssignments(prev => 
      prev.filter(a => !( (a.unitId === unitId || a.unitNumber.toLowerCase() === unitId.toLowerCase()) && a.date === targetDate ))
    );
  };

  const getAssignmentForUnitAndDate = (unitId: string, date?: string) => {
    const targetDate = date || selectedDate;
    return dailyAssignments.find(a => 
      (a.unitId === unitId || a.unitNumber.toLowerCase() === unitId.toLowerCase()) && a.date === targetDate
    );
  };

  const getDailyAssignmentsForDate = (date: string) => {
    return dailyAssignments.filter(a => a.date === date);
  };

  const allAssignedDates = useMemo(() => {
    const dates = new Set<string>();
    if (Array.isArray(dailyAssignments)) {
      dailyAssignments.forEach(a => {
        if (a && a.date) dates.add(a.date);
      });
    }
    if (Array.isArray(dailyStatuses)) {
      dailyStatuses.forEach(s => {
        if (s && s.date) dates.add(s.date);
      });
    }
    return Array.from(dates).sort().reverse();
  }, [dailyAssignments, dailyStatuses]);

  // Licenses CRUD
  const addLicense = (data: Omit<DriverLicense, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const id = `lic-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const newRecord: DriverLicense = {
      ...data,
      id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setLicenses(prev => [newRecord, ...prev]);
    return id;
  };

  const updateLicense = (id: string, updates: Partial<DriverLicense>) => {
    const nowIso = new Date().toISOString();
    setLicenses(prev =>
      prev.map(lic => (lic.id === id ? { ...lic, ...updates, updatedAt: nowIso } : lic))
    );
  };

  const deleteLicense = (id: string) => {
    setLicenses(prev => prev.filter(lic => lic.id !== id));
  };

  const renewLicense = (id: string, newExpiryDate: string, notes?: string) => {
    const nowIso = new Date().toISOString();
    setLicenses(prev =>
      prev.map(lic => {
        if (lic.id === id) {
          const updatedNotes = notes 
            ? `${lic.notes ? lic.notes + ' • ' : ''}Renovada hasta ${newExpiryDate}: ${notes}`
            : lic.notes;
          return {
            ...lic,
            expiryDate: newExpiryDate,
            notes: updatedNotes,
            updatedAt: nowIso,
          };
        }
        return lic;
      })
    );
  };

  // Reset and clear functions
  const clearAllData = () => {
    setVehicles([]);
    setDrivers([]);
    setDailyStatuses([]);
    setMaintenanceReports([]);
    setDailyAssignments([]);
    setLicenses([]);
    Object.values(STORAGE_KEYS).forEach(k => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });
  };

  const loadDemoData = () => {
    resetToInitialData();
  };

  const resetToInitialData = () => {
    const today = '2026-10-27';
    setVehicles(INITIAL_VEHICLES);
    setDrivers(INITIAL_DRIVERS);
    setDailyStatuses(getInitialDailyStatuses(today));
    setMaintenanceReports(INITIAL_MAINTENANCE_REPORTS);
    setDailyAssignments(getInitialDailyAssignments(today));
    setLicenses(INITIAL_LICENSES);
    setSelectedDate(today);
    Object.values(STORAGE_KEYS).forEach(k => {
      try { localStorage.removeItem(k); } catch { /* ignore */ }
    });
  };

  // License Computed Metrics
  const licenseMetrics = useMemo(() => {
    let validCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    const deptSet = new Set<string>();

    licenses.forEach(lic => {
      if (lic.department && lic.department.trim()) {
        deptSet.add(lic.department.trim());
      }
      const info = getLicenseStatusInfo(lic.expiryDate, selectedDate);
      if (info.isExpired) {
        expiredCount++;
      } else if (info.isExpiringSoon) {
        expiringSoonCount++;
      } else {
        validCount++;
      }
    });

    return {
      total: licenses.length,
      validCount,
      expiringSoonCount,
      expiredCount,
      departments: Array.from(deptSet).sort(),
    };
  }, [licenses, selectedDate]);

  // Computed Metrics
  const metrics = useMemo(() => {
    const activeVehicles = vehicles.filter(v => v.active);
    const totalActiveVehicles = activeVehicles.length;

    let pureOperativeCount = 0;
    let operativeCount = 0;
    let inoperativeCount = 0;
    let observationCount = 0;

    let totalInoperativeDays = 0;

    let totalPassengerCapacity = 0;
    let operativePassengerCapacity = 0;
    let inoperativePassengerCapacity = 0;
    let observationPassengerCapacity = 0;

    activeVehicles.forEach(v => {
      const cap = v.capacity || 0;
      totalPassengerCapacity += cap;
      const st = getUnitStatusForDate(v.id, selectedDate);
      if (st.status === 'OPERATIVA') {
        pureOperativeCount++;
        operativeCount++;
        operativePassengerCapacity += cap;
      }
      else if (st.status === 'INOPERATIVA') {
        // Si está inoperativa en taller NO puede estar disponible en la capacidad operativa
        inoperativeCount++;
        inoperativePassengerCapacity += cap;
        const calc = calculateInoperativeDays(
          st.inoperativeSince || v.inoperativeSince || st.reason || v.notes,
          selectedDate
        );
        totalInoperativeDays += calc.days;
      }
      else if (st.status === 'EN_OBSERVACION') {
        // Únicamente cuando la unidad diga con condición es que se coloca y contabiliza como operativa en la capacidad operativa
        observationCount++;
        operativeCount++;
        operativePassengerCapacity += cap;
        observationPassengerCapacity += cap;
      }
    });

    const availabilityRate =
      totalActiveVehicles > 0 ? Math.round((operativeCount / totalActiveVehicles) * 100) : 0;

    const capacityAvailabilityRate =
      totalPassengerCapacity > 0
        ? Math.round((operativePassengerCapacity / totalPassengerCapacity) * 100)
        : 0;

    const activeFailuresCount = maintenanceReports.filter(r => r.status !== 'SOLUCIONADO').length;

    // Total downtime across all solved reports + currently active reports
    let totalDowntimeMinutesAllTime = 0;
    let solvedCount = 0;
    let solvedDowntimeMinutes = 0;

    maintenanceReports.forEach(r => {
      if (r.status === 'SOLUCIONADO' && r.downtimeMinutes !== undefined) {
        totalDowntimeMinutesAllTime += r.downtimeMinutes;
        solvedDowntimeMinutes += r.downtimeMinutes;
        solvedCount++;
      } else {
        const ongoingMinutes = calculateDowntimeMinutes(r.workshopEntryDate || r.reportDate, undefined, selectedDate);
        totalDowntimeMinutesAllTime += ongoingMinutes;
      }
    });

    const averageResolutionHours =
      solvedCount > 0 ? parseFloat((solvedDowntimeMinutes / solvedCount / 60).toFixed(1)) : 0;

    const assignedDriversToday = new Set(
      dailyAssignments.filter(a => a.date === selectedDate).map(a => a.driverId)
    );

    let mobilizedPassengersToday = 0;
    dailyAssignments
      .filter(a => a.date === selectedDate)
      .forEach(a => {
        if (a.passengersEstimated) {
          mobilizedPassengersToday += a.passengersEstimated;
        }
      });

    return {
      totalActiveVehicles,
      pureOperativeCount,
      operativeCount,
      inoperativeCount,
      observationCount,
      availabilityRate,
      activeFailuresCount,
      totalDowntimeMinutesAllTime,
      totalDowntimeHoursAllTime: parseFloat((totalDowntimeMinutesAllTime / 60).toFixed(1)),
      totalInoperativeDays,
      averageResolutionHours,
      assignedDriversTodayCount: assignedDriversToday.size,
      totalDriversCount: drivers.filter(d => d.active).length,
      totalPassengerCapacity,
      operativePassengerCapacity,
      inoperativePassengerCapacity,
      observationPassengerCapacity,
      capacityAvailabilityRate,
      mobilizedPassengersToday,
    };
  }, [vehicles, dailyStatuses, maintenanceReports, dailyAssignments, selectedDate]);

  return (
    <FleetContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        vehicles,
        drivers,
        dailyStatuses,
        maintenanceReports,
        dailyAssignments,
        getUnitStatusForDate,
        getUnitFailures,
        getUnitLatestFailure,
        getUnitActiveTicket,
        setUnitStatus,
        batchSetStatus,
        addMaintenanceReport,
        updateMaintenanceReport,
        resolveMaintenanceReport,
        deleteMaintenanceReport,
        addVehicle,
        updateVehicle,
        updateVehiclePhoto,
        deleteVehicle,
        addDriver,
        updateDriver,
        deleteDriver,
        addAssignment,
        updateAssignment,
        deleteAssignment,
        assignDriverToUnit,
        removeAssignmentForUnitAndDate,
        getAssignmentForUnitAndDate,
        getDailyAssignmentsForDate,
        allAssignedDates,
        clearAllData,
        loadDemoData,
        resetToInitialData,
        metrics,
        licenses,
        addLicense,
        updateLicense,
        deleteLicense,
        renewLicense,
        licenseMetrics,
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
