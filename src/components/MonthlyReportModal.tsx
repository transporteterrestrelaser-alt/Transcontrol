import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  FileSpreadsheet, 
  X, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle, 
  Bus, 
  Wrench, 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  BarChart3,
  FileText,
  Filter
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { 
  formatDate, 
  calculateDowntimeMinutes, 
  calculateInoperativeDays,
  CATEGORY_LABELS,
  OPERATIONAL_STATUS_CONFIG
} from '../utils/timeUtils';
import { UnitOperationalStatus, FailureCategory } from '../types/fleet';

interface MonthlyReportModalProps {
  onClose: () => void;
  initialMonth?: string; // YYYY-MM
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ onClose, initialMonth }) => {
  const { 
    vehicles, 
    drivers, 
    selectedDate, 
    dailyStatuses, 
    maintenanceReports, 
    dailyAssignments, 
    getUnitStatusForDate 
  } = useFleet();

  // Determine initial month/year from initialMonth or selectedDate (default YYYY-MM)
  const defaultYearMonth = useMemo(() => {
    if (initialMonth && /^\d{4}-\d{2}$/.test(initialMonth)) {
      return initialMonth;
    }
    const [y, m] = selectedDate.split('-');
    return `${y}-${m}`;
  }, [initialMonth, selectedDate]);

  const [currentYearMonth, setCurrentYearMonth] = useState<string>(defaultYearMonth);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPERATIVE' | 'INOPERATIVE'>('ALL');

  const [year, month] = useMemo(() => {
    const parts = currentYearMonth.split('-');
    return [parseInt(parts[0], 10), parseInt(parts[1], 10)];
  }, [currentYearMonth]);

  // Days in selected month
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Month label in Spanish (e.g. "Octubre 2026")
  const monthName = MONTH_NAMES[month - 1];
  const periodLabel = `${monthName} ${year}`;

  // Month navigation handlers
  const handlePrevMonth = () => {
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setCurrentYearMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleResetToCurrent = () => {
    const [y, m] = selectedDate.split('-');
    setCurrentYearMonth(`${y}-${m}`);
  };

  // Active vehicles list
  const activeVehicles = useMemo(() => vehicles.filter(v => v.active), [vehicles]);

  // Generate list of all date strings in the month: YYYY-MM-01 .. YYYY-MM-daysInMonth
  const monthDates = useMemo(() => {
    const dates: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return dates;
  }, [year, month, daysInMonth]);

  // Calculate monthly stats per vehicle
  // Rules honored: En capacidad operativa, las unidades con condición se contabilizan como operativas y nunca como inoperativas.
  const vehicleMonthlyStats = useMemo(() => {
    return activeVehicles.map(veh => {
      let daysOperative = 0;
      let daysInoperative = 0;
      let daysWithCondition = 0;

      // Status at representative/latest date in the month
      // If selectedDate is within this month, use selectedDate, else use last day of month
      const refDate = selectedDate.startsWith(currentYearMonth)
        ? selectedDate
        : monthDates[monthDates.length - 1];

      const refStatus = getUnitStatusForDate(veh.id, refDate);

      monthDates.forEach(dateStr => {
        const st = getUnitStatusForDate(veh.id, dateStr);
        if (st.status === 'OPERATIVA') {
          daysOperative++;
        } else if (st.status === 'EN_OBSERVACION') {
          daysWithCondition++;
          // Rule: contabilizar en capacidad operativa como operativa
          daysOperative++;
        } else if (st.status === 'INOPERATIVA') {
          daysInoperative++;
        }
      });

      const availabilityRate = daysInMonth > 0 
        ? Math.round((daysOperative / daysInMonth) * 100) 
        : 0;

      // Calculate inoperative days detail if inoperative
      const inopCalc = calculateInoperativeDays(
        refStatus.inoperativeSince || veh.inoperativeSince || refStatus.reason || veh.notes,
        refDate
      );

      // Maintenance reports in this month
      const reportsInMonth = maintenanceReports.filter(r => {
        if (r.unitId !== veh.id) return false;
        const reportDatePrefix = (r.workshopEntryDate || r.reportDate).slice(0, 7);
        return reportDatePrefix === currentYearMonth;
      });

      // Assignments in this month
      const assignmentsInMonth = dailyAssignments.filter(a => {
        return a.unitId === veh.id && a.date.startsWith(currentYearMonth);
      });

      // Frequent driver in month
      const driverCounts: Record<string, number> = {};
      assignmentsInMonth.forEach(a => {
        if (a.driverName) {
          driverCounts[a.driverName] = (driverCounts[a.driverName] || 0) + 1;
        }
      });
      const topDriver = Object.entries(driverCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

      return {
        vehicle: veh,
        refStatus,
        daysOperative,
        daysInoperative,
        daysWithCondition,
        availabilityRate,
        inopCalc,
        reportsInMonth,
        assignmentsCount: assignmentsInMonth.length,
        topDriver: topDriver || (veh.notes && veh.notes.includes('Operador:') ? veh.notes.split('Operador:')[1].trim().split('•')[0].trim() : 'Sin asignar'),
      };
    });
  }, [activeVehicles, monthDates, daysInMonth, selectedDate, currentYearMonth, getUnitStatusForDate, maintenanceReports, dailyAssignments]);

  // Filtered vehicles according to status tab
  const filteredVehicles = useMemo(() => {
    if (statusFilter === 'OPERATIVE') {
      return vehicleMonthlyStats.filter(v => v.refStatus.status === 'OPERATIVA' || v.refStatus.status === 'EN_OBSERVACION');
    }
    if (statusFilter === 'INOPERATIVE') {
      return vehicleMonthlyStats.filter(v => v.refStatus.status === 'INOPERATIVA');
    }
    return vehicleMonthlyStats;
  }, [vehicleMonthlyStats, statusFilter]);

  // Aggregate fleet monthly metrics
  const monthlyMetrics = useMemo(() => {
    const totalUnits = activeVehicles.length;
    let sumAvailability = 0;
    let totalOperativeDaysFleet = 0;
    let totalInoperativeDaysFleet = 0;
    let totalSeats = 0;
    let totalOperativeSeats = 0;

    let totalReportsInMonth = 0;
    let resolvedReportsInMonth = 0;
    let pendingReportsInMonth = 0;

    let unitsOperativeAtClose = 0;
    let unitsWithConditionAtClose = 0;
    let unitsInoperativeAtClose = 0;

    vehicleMonthlyStats.forEach(item => {
      sumAvailability += item.availabilityRate;
      totalOperativeDaysFleet += item.daysOperative;
      totalInoperativeDaysFleet += item.daysInoperative;
      totalSeats += item.vehicle.capacity || 0;

      if (item.refStatus.status === 'OPERATIVA') {
        unitsOperativeAtClose++;
        totalOperativeSeats += item.vehicle.capacity || 0;
      } else if (item.refStatus.status === 'EN_OBSERVACION') {
        unitsWithConditionAtClose++;
        unitsOperativeAtClose++; // Counted as operative in capacity
        totalOperativeSeats += item.vehicle.capacity || 0;
      } else {
        unitsInoperativeAtClose++;
      }
    });

    // Maintenance reports in month across all vehicles
    maintenanceReports.forEach(r => {
      const repMonth = (r.workshopEntryDate || r.reportDate).slice(0, 7);
      if (repMonth === currentYearMonth) {
        totalReportsInMonth++;
        if (r.status === 'SOLUCIONADO') {
          resolvedReportsInMonth++;
        } else {
          pendingReportsInMonth++;
        }
      }
    });

    const averageAvailabilityRate = totalUnits > 0 
      ? Math.round(sumAvailability / totalUnits) 
      : 0;

    const seatAvailabilityRate = totalSeats > 0 
      ? Math.round((totalOperativeSeats / totalSeats) * 100) 
      : 0;

    // Total dispatches/shifts in this month
    const totalDispatchesInMonth = dailyAssignments.filter(a => a.date.startsWith(currentYearMonth)).length;

    return {
      totalUnits,
      averageAvailabilityRate,
      totalOperativeDaysFleet,
      totalInoperativeDaysFleet,
      unitsOperativeAtClose,
      unitsWithConditionAtClose,
      unitsInoperativeAtClose,
      totalSeats,
      totalOperativeSeats,
      seatAvailabilityRate,
      totalReportsInMonth,
      resolvedReportsInMonth,
      pendingReportsInMonth,
      totalDispatchesInMonth,
    };
  }, [activeVehicles, vehicleMonthlyStats, maintenanceReports, currentYearMonth, dailyAssignments]);

  // Maintenance tickets in this month
  const monthlyMaintenanceTickets = useMemo(() => {
    return maintenanceReports.filter(r => {
      const repMonth = (r.workshopEntryDate || r.reportDate).slice(0, 7);
      return repMonth === currentYearMonth;
    }).sort((a, b) => b.reportDate.localeCompare(a.reportDate));
  }, [maintenanceReports, currentYearMonth]);

  // Failure categories breakdown for this month
  const failureCategoryCounts = useMemo(() => {
    const counts: Partial<Record<FailureCategory, number>> = {};
    monthlyMaintenanceTickets.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
  }, [monthlyMaintenanceTickets]);

  // Daily availability breakdown across the month (Day 1..N)
  const dailyBreakdown = useMemo(() => {
    return monthDates.map(dateStr => {
      let operative = 0;
      let inoperative = 0;
      let condition = 0;

      activeVehicles.forEach(v => {
        const st = getUnitStatusForDate(v.id, dateStr);
        if (st.status === 'OPERATIVA') {
          operative++;
        } else if (st.status === 'EN_OBSERVACION') {
          condition++;
          operative++; // counted as operative in operational capacity
        } else {
          inoperative++;
        }
      });

      const dayNumber = parseInt(dateStr.split('-')[2], 10);
      const rate = activeVehicles.length > 0 ? Math.round((operative / activeVehicles.length) * 100) : 0;

      return {
        dateStr,
        dayNumber,
        operative,
        inoperative,
        condition,
        rate
      };
    });
  }, [monthDates, activeVehicles, getUnitStatusForDate]);

  // Print as PDF handler
  const handlePrintPDF = () => {
    const originalTitle = document.title;
    document.title = `TransControl_Informe_Mensual_${monthName}_${year}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = [
      'Mes',
      'Unidad',
      'Placa',
      'Modelo',
      'Capacidad_Pax',
      'Estatus_Cierre',
      'Condicion_Operativa',
      'Dias_Operativos_Mes',
      'Dias_Inoperativos_Mes',
      'Disponibilidad_Mensual_Pct',
      'Dias_Inop_Acumulados',
      'Novedades_Mantenimiento_Mes',
      'Observaciones'
    ];

    const rows = vehicleMonthlyStats.map(item => {
      const v = item.vehicle;
      const st = item.refStatus;
      return [
        `"${periodLabel}"`,
        `"${v.unitNumber}"`,
        `"${v.licensePlate}"`,
        `"${v.model}"`,
        v.capacity,
        st.status,
        st.status === 'EN_OBSERVACION' ? 'OPERATIVA CON CONDICION' : st.status,
        item.daysOperative,
        item.daysInoperative,
        `${item.availabilityRate}%`,
        st.status === 'INOPERATIVA' ? item.inopCalc.days : 0,
        item.reportsInMonth.length,
        `"${(st.reason || v.notes || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const summarySection = [
      '',
      `"RESUMEN MENSUAL: ${periodLabel}"`,
      `"Flota Activa: ${monthlyMetrics.totalUnits} unidades"`,
      `"Disponibilidad Promedio: ${monthlyMetrics.averageAvailabilityRate}%"`,
      `"Unidades Operativas: ${monthlyMetrics.unitsOperativeAtClose}"`,
      `"Unidades con Condición: ${monthlyMetrics.unitsWithConditionAtClose}"`,
      `"Unidades Inoperativas: ${monthlyMetrics.unitsInoperativeAtClose}"`,
      `"Capacidad de Asientos: ${monthlyMetrics.totalOperativeSeats} / ${monthlyMetrics.totalSeats} (${monthlyMetrics.seatAvailabilityRate}%)"`,
      `"Reportes de Mantenimiento: ${monthlyMetrics.totalReportsInMonth}"`,
      ''
    ].join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [
      summarySection,
      headers.join(','),
      ...rows
    ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TransControl_Informe_Mensual_${year}_${String(month).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-3">
        
        {/* Top Modal Controls Toolbar (Hidden in Print) */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-base">Informe Mensual de Flota y Capacidad Operativa</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {periodLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Consolidado de disponibilidad, asignaciones, días fuera de servicio y mantenimiento
              </p>
            </div>
          </div>

          {/* Month / Year Switcher */}
          <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-xl border border-slate-750">
            <button
              onClick={handlePrevMonth}
              title="Mes anterior"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-1">
              <Calendar className="w-4 h-4 text-amber-400" />
              <input
                type="month"
                value={currentYearMonth}
                onChange={(e) => e.target.value && setCurrentYearMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextMonth}
              title="Mes siguiente"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleResetToCurrent}
              title="Ir al mes de la fecha activa"
              className="ml-1 px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition"
            >
              Mes Actual
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 shadow-sm"
              title="Descargar consolidado mensual en CSV / Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrintPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition shadow-md shadow-amber-500/20"
              title="Imprimir o guardar en archivo PDF con membrete oficial"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-1"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar (Hidden in print) */}
        <div className="px-6 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Filtrar tabla:
            </span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  statusFilter === 'ALL'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas ({vehicleMonthlyStats.length})
              </button>
              <button
                onClick={() => setStatusFilter('OPERATIVE')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  statusFilter === 'OPERATIVE'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Operativas ({monthlyMetrics.unitsOperativeAtClose})
              </button>
              <button
                onClick={() => setStatusFilter('INOPERATIVE')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  statusFilter === 'INOPERATIVE'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Inoperativas ({monthlyMetrics.unitsInoperativeAtClose})
              </button>
            </div>
          </div>

          <div className="text-slate-400 text-xs hidden sm:block">
            Mostrando período de <span className="text-white font-semibold">{daysInMonth} días</span> • Total activo: <span className="text-amber-400 font-bold">{monthlyMetrics.totalUnits} unidades</span>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white text-slate-900 print:p-0 print:m-0 print:overflow-visible">
          
          {/* Official Letterhead Header */}
          <div className="border-b-2 border-slate-950 pb-4 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg print:border print:border-slate-800">
                  <Bus className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-950">
                    DEPARTAMENTO DE TRANSPORTE Y CONTROL DE FLOTA
                  </h1>
                  <p className="text-xs font-extrabold text-amber-700 uppercase tracking-wider">
                    SISTEMA DE GESTIÓN OPERATIVA • TRANSCONTROL
                  </p>
                  <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                    INFORME MENSUAL DE CAPACIDAD OPERATIVA, DISPONIBILIDAD Y GESTIÓN DE FLOTA
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right border-l-2 sm:border-l-0 sm:border-r-0 border-amber-500 pl-3 sm:pl-0">
                <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-300 inline-block text-left sm:text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">PERÍODO EVALUADO:</span>
                  <span className="text-sm font-black text-slate-950 uppercase">{periodLabel}</span>
                  <span className="text-[10px] text-slate-600 block mt-0.5">
                    01/{String(month).padStart(2, '0')}/{year} al {daysInMonth}/{String(month).padStart(2, '0')}/{year} ({daysInMonth} días)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Disponibilidad Operativa</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-700">{monthlyMetrics.averageAvailabilityRate}%</span>
                <span className="text-[11px] font-bold text-slate-600">promedio mensual</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-1 font-medium">
                {monthlyMetrics.unitsOperativeAtClose} de {monthlyMetrics.totalUnits} unidades disponibles
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Estatus al Cierre</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-950">{monthlyMetrics.unitsOperativeAtClose}</span>
                <span className="text-xs font-bold text-emerald-700">Operativas</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-sm font-bold text-rose-700">{monthlyMetrics.unitsInoperativeAtClose}</span>
                <span className="text-[10px] font-bold text-rose-700">Inop.</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-1 font-medium">
                {monthlyMetrics.unitsWithConditionAtClose > 0 
                  ? `Incluye ${monthlyMetrics.unitsWithConditionAtClose} unidad con condición operativa`
                  : 'Flota en servicio regular'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Capacidad de Puestos</span>
                <Users className="w-4 h-4 text-amber-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-950">{monthlyMetrics.totalOperativeSeats}</span>
                <span className="text-xs font-bold text-slate-600">/ {monthlyMetrics.totalSeats} asientos</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-1 font-medium">
                {monthlyMetrics.seatAvailabilityRate}% de capacidad de transporte activa
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-300 bg-slate-50 shadow-xs">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Mantenimiento y Taller</span>
                <Wrench className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-950">{monthlyMetrics.totalReportsInMonth}</span>
                <span className="text-xs font-bold text-slate-600">reportes</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-1 font-medium">
                {monthlyMetrics.resolvedReportsInMonth} resueltos • {monthlyMetrics.pendingReportsInMonth} en taller / pendientes
              </p>
            </div>
          </div>

          {/* Section 1: Detailed Vehicle Monthly Matrix */}
          <div className="mb-6">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-amber-600" />
                1. Matriz Consolidada de Disponibilidad y Condición por Unidad ({periodLabel})
              </h2>
              <span className="text-[11px] text-slate-600 font-semibold">
                Total evaluado: {filteredVehicles.length} unidades
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-300 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-black uppercase text-slate-700">
                    <th className="py-2.5 px-3">Unidad</th>
                    <th className="py-2.5 px-3">Placa / Modelo</th>
                    <th className="py-2.5 px-2 text-center">Capacidad</th>
                    <th className="py-2.5 px-3 text-center">Estatus Cierre</th>
                    <th className="py-2.5 px-2 text-center">Días Oper.</th>
                    <th className="py-2.5 px-2 text-center">Días Inop.</th>
                    <th className="py-2.5 px-2 text-center">% Dispon.</th>
                    <th className="py-2.5 px-3">Condición Operativa / Novedades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredVehicles.map(({ vehicle, refStatus, daysOperative, daysInoperative, availabilityRate, inopCalc }) => {
                    const isOperative = refStatus.status === 'OPERATIVA';
                    const isCondition = refStatus.status === 'EN_OBSERVACION';
                    const isInoperative = refStatus.status === 'INOPERATIVA';

                    return (
                      <tr key={vehicle.id} className="hover:bg-slate-50 transition-colors">
                        {/* Unit Number */}
                        <td className="py-2.5 px-3 font-black text-slate-950 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{
                              backgroundColor: isInoperative ? '#e11d48' : isCondition ? '#f59e0b' : '#10b981'
                            }} />
                            <span className="text-sm font-black">{vehicle.unitNumber}</span>
                          </div>
                        </td>

                        {/* Plate & Model */}
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold text-slate-900 block">{vehicle.licensePlate}</span>
                          <span className="text-[11px] text-slate-600 block line-clamp-1">{vehicle.model}</span>
                        </td>

                        {/* Capacity */}
                        <td className="py-2.5 px-2 text-center font-bold text-slate-800">
                          {vehicle.capacity} <span className="text-[10px] text-slate-500 font-normal">pax</span>
                        </td>

                        {/* Estatus Cierre */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isOperative && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              OPERATIVA
                            </span>
                          )}
                          {isCondition && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              OPERATIVA C/ CONDICIÓN
                            </span>
                          )}
                          {isInoperative && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                              INOPERATIVA EN TALLER
                            </span>
                          )}
                        </td>

                        {/* Days Operative */}
                        <td className="py-2.5 px-2 text-center font-bold text-emerald-700">
                          {daysOperative} <span className="text-[10px] text-slate-500 font-normal">d</span>
                        </td>

                        {/* Days Inoperative */}
                        <td className="py-2.5 px-2 text-center font-bold text-rose-700">
                          {daysInoperative > 0 ? `${daysInoperative} d` : '-'}
                        </td>

                        {/* % Availability */}
                        <td className="py-2.5 px-2 text-center font-black">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                            availabilityRate >= 90 
                              ? 'text-emerald-800 bg-emerald-50' 
                              : availabilityRate > 0 
                                ? 'text-amber-800 bg-amber-50' 
                                : 'text-rose-800 bg-rose-50'
                          }`}>
                            {availabilityRate}%
                          </span>
                        </td>

                        {/* Notes & Condition */}
                        <td className="py-2.5 px-3 text-slate-700 text-[11px]">
                          {isInoperative && (
                            <div>
                              <span className="font-bold text-rose-800 block">
                                Inoperativa ({inopCalc.days} días fuera de servicio acum.)
                              </span>
                              <span className="text-slate-600 block">
                                {refStatus.reason || vehicle.notes || 'Ruido en motor, en taller'}
                              </span>
                            </div>
                          )}
                          {isCondition && (
                            <div>
                              <span className="font-bold text-amber-800 block">
                                Condición Operativa Especial:
                              </span>
                              <span className="text-slate-600 block">
                                {refStatus.reason || vehicle.notes || 'Disponible sólo para requerimientos especiales o cortos'}
                              </span>
                            </div>
                          )}
                          {isOperative && (
                            <span className="text-slate-600">
                              {refStatus.notes || vehicle.notes || 'Operativa sin novedades'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Daily Availability Trend Table (Day 1..N) */}
          <div className="mb-6 page-break-inside-avoid">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                2. Comportamiento Diario de la Capacidad Operativa en el Mes ({periodLabel})
              </h2>
              <span className="text-[11px] text-slate-600 font-semibold">
                Total días: {daysInMonth}
              </span>
            </div>

            {/* Grid of daily tags */}
            <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-16 gap-1.5 text-center">
              {dailyBreakdown.map(d => (
                <div 
                  key={d.dateStr}
                  className={`p-1.5 rounded-lg border text-xs flex flex-col justify-between ${
                    d.rate >= 80 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                      : d.rate >= 50 
                        ? 'bg-amber-50 border-amber-300 text-amber-950' 
                        : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <span className="text-[10px] font-bold text-slate-600">Día {d.dayNumber}</span>
                  <span className="text-xs font-black my-0.5">{d.rate}%</span>
                  <span className="text-[9px] font-medium text-slate-600">
                    {d.operative}/{activeVehicles.length} op
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 italic">
              * Nota de cómputo: Conforme al protocolo de capacidad operativa, las unidades operativas con condición se contabilizan como operativas y garantizan la prestación del servicio.
            </p>
          </div>

          {/* Section 3: Maintenance & Workshop Failures Registered in Month */}
          <div className="mb-6 page-break-inside-avoid">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2 mb-3">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-rose-600" />
                3. Resumen de Novedades Técnicas y Mantenimientos del Mes ({monthlyMaintenanceTickets.length} registros)
              </h2>
            </div>

            {monthlyMaintenanceTickets.length === 0 ? (
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-center text-slate-500 text-xs">
                No se registraron fallas técnicas nuevas durante el mes de {periodLabel}.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 text-[11px] font-black uppercase text-slate-700">
                      <th className="py-2 px-3">Fecha</th>
                      <th className="py-2 px-3">Unidad</th>
                      <th className="py-2 px-3">Categoría</th>
                      <th className="py-2 px-4">Descripción de Falla</th>
                      <th className="py-2 px-3">Taller / Diagnóstico</th>
                      <th className="py-2 px-2 text-center">Estatus</th>
                      <th className="py-2 px-3 text-right">Downtime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {monthlyMaintenanceTickets.map(report => (
                      <tr key={report.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-[11px] whitespace-nowrap text-slate-800">
                          {report.reportDate.split('T')[0]}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-950 whitespace-nowrap">
                          {report.unitNumber}
                        </td>
                        <td className="py-2 px-3 text-[11px] font-semibold text-slate-700">
                          {CATEGORY_LABELS[report.category] || report.category}
                        </td>
                        <td className="py-2 px-4 text-slate-900 text-[11px] max-w-xs">
                          {report.description}
                        </td>
                        <td className="py-2 px-3 text-slate-700 text-[11px]">
                          {report.diagnosticNotes || report.solutionActions || report.mechanicAssigned || 'En revisión'}
                        </td>
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            report.status === 'SOLUCIONADO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-[11px] text-slate-800">
                          {report.downtimeMinutes 
                            ? `${Math.round(report.downtimeMinutes / 60)} hrs` 
                            : report.status === 'SOLUCIONADO' ? '0 hrs' : 'Activo'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Executive Signatures Block for Official Submission */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs page-break-inside-avoid">
            <div>
              <div className="border-b border-slate-400 pb-8 mb-2"></div>
              <p className="font-black text-slate-950 uppercase text-[11px]">ELABORADO POR</p>
              <p className="text-[10px] text-slate-600">Jefatura de Operaciones y Flota</p>
              <p className="text-[9px] text-slate-500">TransControl Transporte de Personal</p>
            </div>

            <div>
              <div className="border-b border-slate-400 pb-8 mb-2"></div>
              <p className="font-black text-slate-950 uppercase text-[11px]">REVISADO POR</p>
              <p className="text-[10px] text-slate-600">Coordinación de Mantenimiento</p>
              <p className="text-[9px] text-slate-500">Taller y Control Técnico</p>
            </div>

            <div>
              <div className="border-b border-slate-400 pb-8 mb-2"></div>
              <p className="font-black text-slate-950 uppercase text-[11px]">APROBADO POR</p>
              <p className="text-[10px] text-slate-600">Gerencia General / Dirección</p>
              <p className="text-[9px] text-slate-500">Aceptación y Cierre de Período</p>
            </div>
          </div>

          {/* Document Footer */}
          <div className="mt-6 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 flex justify-between items-center">
            <span>Sistema TransControl • Informe Oficial Mensual de Capacidad Operativa</span>
            <span>Generado el: {formatDate(selectedDate)} • Período: {periodLabel}</span>
          </div>

        </div>

      </div>
    </div>
  );
};
