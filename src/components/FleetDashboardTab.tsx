import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  Bus, 
  Wrench, 
  TrendingUp, 
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  FileText
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { 
  formatDate, 
  formatDowntime, 
  calculateDowntimeMinutes, 
  calculateInoperativeDays,
  CATEGORY_LABELS,
  OPERATIONAL_STATUS_CONFIG 
} from '../utils/timeUtils';
import { getUnitDefaultPhoto } from '../utils/imageUtils';
import { FailureCategory, Vehicle } from '../types/fleet';
import { VehicleDossierModal } from './VehicleDossierModal';

interface FleetDashboardTabProps {
  onGoToDailyStatus: () => void;
  onGoToMaintenance: (unitFilter?: string) => void;
  onViewUnitDossier?: (unitId: string) => void;
  onOpenMonthlyReport?: () => void;
}

export const FleetDashboardTab: React.FC<FleetDashboardTabProps> = ({
  onGoToDailyStatus,
  onGoToMaintenance,
  onViewUnitDossier,
  onOpenMonthlyReport,
}) => {
  const { 
    vehicles, 
    selectedDate, 
    getUnitStatusForDate, 
    getUnitLatestFailure,
    maintenanceReports, 
    metrics 
  } = useFleet();

  const [selectedDossierVehicle, setSelectedDossierVehicle] = useState<Vehicle | null>(null);

  // Downtime per vehicle ranking
  const downtimeByVehicle = useMemo(() => {
    const map: Record<string, { 
      unitId: string;
      unitNumber: string; 
      licensePlate: string; 
      totalMinutes: number; 
      ticketsCount: number; 
      currentStatus: string;
      inoperativeSince?: string;
    }> = {};

    vehicles.forEach(v => {
      const st = getUnitStatusForDate(v.id, selectedDate);
      map[v.id] = {
        unitId: v.id,
        unitNumber: v.unitNumber,
        licensePlate: v.licensePlate,
        totalMinutes: 0,
        ticketsCount: 0,
        currentStatus: st.status,
        inoperativeSince: st.inoperativeSince || v.inoperativeSince || st.reason || v.notes,
      };
    });

    maintenanceReports.forEach(r => {
      if (map[r.unitId]) {
        map[r.unitId].ticketsCount += 1;
        const mins = r.status === 'SOLUCIONADO'
          ? (r.downtimeMinutes ?? calculateDowntimeMinutes(r.workshopEntryDate || r.reportDate, r.solutionDate))
          : calculateDowntimeMinutes(r.workshopEntryDate || r.reportDate, undefined, selectedDate);
        map[r.unitId].totalMinutes += mins;
      }
    });

    return Object.values(map)
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .filter(item => item.totalMinutes > 0 || item.ticketsCount > 0);
  }, [vehicles, maintenanceReports, selectedDate, getUnitStatusForDate]);

  // Failures by category distribution
  const failuresByCategory = useMemo(() => {
    const counts: Partial<Record<FailureCategory, number>> = {};
    maintenanceReports.forEach(r => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([cat, count]) => ({
        category: cat as FailureCategory,
        label: CATEGORY_LABELS[cat as FailureCategory] || cat,
        count: count || 0,
        percentage: Math.round(((count || 0) / (maintenanceReports.length || 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [maintenanceReports]);

  // Critical units currently in workshop > 24 hours
  const prolongedStopReports = useMemo(() => {
    return maintenanceReports
      .filter(r => r.status !== 'SOLUCIONADO')
      .map(r => ({
        ...r,
        mins: calculateDowntimeMinutes(r.workshopEntryDate || r.reportDate, undefined, selectedDate),
      }))
      .sort((a, b) => b.mins - a.mins);
  }, [maintenanceReports]);

  return (
    <div className="space-y-6">
      {/* Top Welcome / Executive Summary */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Panel Ejecutivo de Flota
              </span>
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {formatDate(selectedDate)}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Control de Operaciones y Disponibilidad de Flota
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Monitoreo centralizado del departamento de transporte de personal: disponibilidad de unidades, causas de inoperatividad, productividad del taller y estado técnico.
            </p>
            {onOpenMonthlyReport && (
              <div className="mt-3.5">
                <button
                  onClick={onOpenMonthlyReport}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-md shadow-amber-500/20"
                >
                  <FileText className="w-4 h-4 text-slate-950" />
                  <span>Generar Informe Mensual</span>
                </button>
              </div>
            )}
          </div>

          {/* Availability Gauge Card */}
          <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl flex items-center gap-5 shadow-inner">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`${metrics.availabilityRate >= 80 ? 'text-emerald-400' : 'text-amber-400'} transition-all duration-1000`}
                  strokeDasharray={`${metrics.availabilityRate}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-white">{metrics.availabilityRate}%</span>
                <span className="text-[9px] uppercase font-bold text-slate-400">Flota</span>
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <span className="text-slate-400 text-[11px] block uppercase font-bold tracking-wider">
                Disponibilidad Diaria
              </span>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-200 font-semibold">{metrics.operativeCount} Operativas</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <span className="text-slate-200 font-semibold">{metrics.inoperativeCount} Inoperativas</span>
              </div>
              {metrics.observationCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="text-slate-200 font-semibold">{metrics.observationCount} En Observación</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row (Capacidad, Taller, Downtime) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1 */}
        <div 
          onClick={onGoToDailyStatus}
          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 transition cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Capacidad Operativa</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">{metrics.operativeCount} de {metrics.totalActiveVehicles}</span>
            <span className="text-xs text-slate-400">unidades ({metrics.availabilityRate}%)</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-2 flex items-center justify-between font-medium">
            <span>{metrics.pureOperativeCount} operativas + {metrics.observationCount} con condición</span>
            <ArrowUpRight className="w-3 h-3" />
          </p>
        </div>

        {/* KPI 2 */}
        <div 
          onClick={() => onGoToMaintenance()}
          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 transition cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inoperativas en Taller</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400">{metrics.inoperativeCount}</span>
            <span className="text-xs text-slate-400">unidades fuera de servicio</span>
          </div>
          <p className="text-[11px] text-rose-400 mt-2 flex items-center justify-between font-medium">
            <span>No disponible en capacidad operativa</span>
            <ArrowUpRight className="w-3 h-3" />
          </p>
        </div>

        {/* KPI 3 */}
        <div 
          onClick={() => onGoToMaintenance()}
          className="bg-slate-900 border border-slate-800 p-4 rounded-2xl hover:border-slate-700 transition cursor-pointer group shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tiempo Fuera de Servicio</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400">{metrics.totalDowntimeHoursAllTime}</span>
            <span className="text-xs text-slate-400">horas acumuladas</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-medium flex items-center justify-between">
            {metrics.totalInoperativeDays > 0 ? (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <span>{metrics.totalInoperativeDays} días inoperativos totales</span>
              </span>
            ) : (
              <span>Promedio: <b className="text-slate-200">{metrics.averageResolutionHours} hrs/falla</b></span>
            )}
            <ArrowUpRight className="w-3 h-3 text-amber-400" />
          </p>
        </div>
      </div>

      {/* Two columns: Top Downtime Units & Category distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Table: Ranking de Unidades con Mayor Tiempo Fuera de Servicio */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Unidades con Mayor Tiempo Fuera de Servicio
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Ranking histórico</span>
          </div>

          <div className="divide-y divide-slate-800/80 mt-3 text-xs">
            {downtimeByVehicle.slice(0, 5).map((item, idx) => {
              const dt = formatDowntime(item.totalMinutes);
              const isFirst = idx === 0;
              const isInop = item.currentStatus === 'INOPERATIVA';
              const inopCalc = isInop && item.inoperativeSince ? calculateInoperativeDays(item.inoperativeSince, selectedDate) : null;

              return (
                <div key={item.unitNumber} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isFirst ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      <img 
                        src={getUnitDefaultPhoto(item.unitNumber)} 
                        alt={item.unitNumber} 
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{item.unitNumber}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded">
                          {item.licensePlate}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          isInop
                            ? 'bg-rose-500/15 text-rose-400 font-bold'
                            : 'bg-emerald-500/15 text-emerald-400'
                        }`}>
                          {item.currentStatus}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {item.ticketsCount} {item.ticketsCount === 1 ? 'reporte de falla' : 'reportes de falla'}
                        {isInop && inopCalc && inopCalc.startDateFriendly && (
                          <span className="text-slate-400"> • Detenida: {inopCalc.startDateFriendly}</span>
                        )}
                      </span>

                      {/* Falla Más Reciente (User Request) */}
                      {(() => {
                        const latest = getUnitLatestFailure(item.unitId) || getUnitLatestFailure(item.unitNumber);
                        if (latest) {
                          return (
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-300/90 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800/80 max-w-sm truncate">
                              <Wrench className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate"><b>Falla reciente:</b> {latest.description}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    {isInop && inopCalc && inopCalc.days > 0 ? (
                      <>
                        <span className="font-extrabold text-rose-400 text-sm block font-mono">
                          {inopCalc.formatted}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {dt.detailed} ({dt.hoursDecimal}h)
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-extrabold text-amber-400 text-sm block">
                          {dt.detailed}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {dt.hoursDecimal} horas
                        </span>
                      </>
                    )}

                    <button
                      onClick={() => {
                        const v = vehicles.find(veh => veh.id === item.unitId || veh.unitNumber.toLowerCase() === item.unitNumber.toLowerCase());
                        if (v) {
                          if (onViewUnitDossier) {
                            onViewUnitDossier(v.id);
                          } else {
                            setSelectedDossierVehicle(v);
                          }
                        }
                      }}
                      className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/70 transition"
                      title="Ver Ficha Técnica"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Ver Ficha</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {downtimeByVehicle.length === 0 && (
              <p className="text-slate-500 text-center py-6">No hay datos de tiempo fuera de servicio registrados.</p>
            )}
          </div>
        </div>

        {/* Breakdown: Categorías de Falla más comunes */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Desglose de Fallas por Sistema
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">Causas de inoperatividad</span>
          </div>

          <div className="space-y-3.5 mt-4 text-xs">
            {failuresByCategory.map((cat) => (
              <div key={cat.category} className="space-y-1">
                <div className="flex items-center justify-between text-slate-300 font-medium">
                  <span>{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{cat.count} {cat.count === 1 ? 'evento' : 'eventos'}</span>
                    <span className="font-bold text-white min-w-[36px] text-right">{cat.percentage}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}

            {failuresByCategory.length === 0 && (
              <p className="text-slate-500 text-center py-6">No hay reportes de falla para categorizar.</p>
            )}
          </div>
        </div>
      </div>

      {/* Active High-Priority Alerts in Workshop */}
      {prolongedStopReports.length > 0 && (
        <div className="bg-slate-900 border border-rose-900/60 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Unidades Actualmente en Taller con Parada Prolongada
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-xs">
            {prolongedStopReports.map(rep => {
              const dt = formatDowntime(rep.mins);
              return (
                <div 
                  key={rep.id} 
                  className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-start justify-between gap-3 hover:border-slate-700 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">{rep.unitNumber}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {rep.licensePlate}
                      </span>
                      <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                        {CATEGORY_LABELS[rep.category]}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs line-clamp-2">
                      {rep.description}
                    </p>
                    <span className="text-[11px] text-slate-500 block">
                      Taller: {rep.mechanicAssigned || 'Taller Central'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Parada</span>
                    <span className="font-black text-rose-400 text-sm">
                      {dt.detailed}
                    </span>
                    <div className="flex flex-col gap-1 items-end mt-2">
                      <button
                        onClick={() => onGoToMaintenance(rep.unitNumber)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline block"
                      >
                        Ver en Taller →
                      </button>
                      <button
                        onClick={() => {
                          const v = vehicles.find(veh => veh.id === rep.unitId || veh.unitNumber.toLowerCase() === rep.unitNumber.toLowerCase());
                          if (v) setSelectedDossierVehicle(v);
                        }}
                        className="text-[10px] font-bold text-slate-300 hover:text-white inline-flex items-center gap-1 hover:underline"
                      >
                        <FileText className="w-2.5 h-2.5 text-amber-400" />
                        <span>Ficha Técnica</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vehicle Dossier / Technical Sheet Modal (Ficha de la Unidad) */}
      {selectedDossierVehicle && (
        <VehicleDossierModal
          vehicle={selectedDossierVehicle}
          onClose={() => setSelectedDossierVehicle(null)}
        />
      )}
    </div>
  );
};
