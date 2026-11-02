import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  Search, 
  Calendar, 
  DollarSign, 
  Sparkles,
  ArrowRight,
  Filter,
  Trash2,
  Edit2,
  FileText
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { 
  MaintenanceReport, 
  FailureCategory, 
  FailurePriority, 
  MaintenanceStatus,
  Vehicle
} from '../types/fleet';
import { 
  formatDateTime, 
  formatDowntime, 
  calculateDowntimeMinutes, 
  calculateInoperativeDays,
  getCurrentDateTimeLocalString,
  CATEGORY_LABELS, 
  PRIORITY_LABELS, 
  MAINTENANCE_STATUS_LABELS 
} from '../utils/timeUtils';
import { getUnitDefaultPhoto } from '../utils/imageUtils';
import { VehicleDossierModal } from './VehicleDossierModal';

interface MaintenanceTabProps {
  initialUnitFilter?: string;
  onViewUnitDossier?: (unitId: string) => void;
}

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ 
  initialUnitFilter,
  onViewUnitDossier 
}) => {
  const { 
    vehicles, 
    maintenanceReports, 
    addMaintenanceReport, 
    updateMaintenanceReport, 
    resolveMaintenanceReport, 
    deleteMaintenanceReport,
    selectedDate,
    getUnitStatusForDate,
  } = useFleet();

  const [search, setSearch] = useState(initialUnitFilter || '');
  const [statusFilter, setStatusFilter] = useState<'TODAS' | MaintenanceStatus>('TODAS');
  const [categoryFilter, setCategoryFilter] = useState<'TODAS' | FailureCategory>('TODAS');
  const [selectedDossierVehicle, setSelectedDossierVehicle] = useState<Vehicle | null>(null);

  // Modal: Nueva Falla
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [newUnitId, setNewUnitId] = useState('');
  const [newCategory, setNewCategory] = useState<FailureCategory>('MECANICA');
  const [newPriority, setNewPriority] = useState<FailurePriority>('ALTA');
  const [newReporter, setNewReporter] = useState('');
  const [newReportDate, setNewReportDate] = useState(getCurrentDateTimeLocalString());
  const [newDescription, setNewDescription] = useState('');
  const [newMechanic, setNewMechanic] = useState('Taller Central');

  // Modal: Resolver Falla / Solución de Taller
  const [resolvingTicket, setResolvingTicket] = useState<MaintenanceReport | null>(null);
  const [solutionActions, setSolutionActions] = useState('');
  const [diagnosticNotes, setDiagnosticNotes] = useState('');
  const [partsReplaced, setPartsReplaced] = useState('');
  const [mechanicResponsible, setMechanicResponsible] = useState('');
  const [solutionDate, setSolutionDate] = useState(getCurrentDateTimeLocalString());
  const [costInput, setCostInput] = useState<number | ''>('');
  const [markOperativeOnResolve, setMarkOperativeOnResolve] = useState(true);

  // Edit general modal
  const [editingReport, setEditingReport] = useState<MaintenanceReport | null>(null);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return maintenanceReports.filter(rep => {
      if (statusFilter !== 'TODAS' && rep.status !== statusFilter) return false;
      if (categoryFilter !== 'TODAS' && rep.category !== categoryFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchUnit = rep.unitNumber.toLowerCase().includes(q);
        const matchPlate = rep.licensePlate.toLowerCase().includes(q);
        const matchDesc = rep.description.toLowerCase().includes(q);
        const matchMech = rep.mechanicAssigned?.toLowerCase().includes(q);
        const matchReporter = rep.reporterName.toLowerCase().includes(q);
        if (!matchUnit && !matchPlate && !matchDesc && !matchMech && !matchReporter) {
          return false;
        }
      }

      return true;
    });
  }, [maintenanceReports, statusFilter, categoryFilter, search]);

  // Overall statistics for workshop
  const workshopStats = useMemo(() => {
    let totalDowntimeMinutes = 0;
    let activeTickets = 0;
    let resolvedTickets = 0;
    let totalCosts = 0;

    maintenanceReports.forEach(r => {
      if (r.estimatedCost) totalCosts += r.estimatedCost;

      if (r.status === 'SOLUCIONADO') {
        resolvedTickets++;
        const mins = r.downtimeMinutes ?? calculateDowntimeMinutes(r.workshopEntryDate || r.reportDate, r.solutionDate);
        totalDowntimeMinutes += mins;
      } else {
        activeTickets++;
        const ongoingMins = calculateDowntimeMinutes(r.workshopEntryDate || r.reportDate);
        totalDowntimeMinutes += ongoingMins;
      }
    });

    const averageResolutionMins = resolvedTickets > 0 ? Math.round(totalDowntimeMinutes / resolvedTickets) : 0;

    return {
      totalTickets: maintenanceReports.length,
      activeTickets,
      resolvedTickets,
      totalDowntimeMinutes,
      totalHours: (totalDowntimeMinutes / 60).toFixed(1),
      avgHours: (averageResolutionMins / 60).toFixed(1),
      totalCosts,
    };
  }, [maintenanceReports]);

  // Handlers
  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle = vehicles.find(v => v.id === newUnitId);
    if (!vehicle) return;

    addMaintenanceReport({
      unitId: vehicle.id,
      unitNumber: vehicle.unitNumber,
      licensePlate: vehicle.licensePlate,
      reportDate: newReportDate,
      reporterName: newReporter.trim() || 'Inspector de Transporte',
      category: newCategory,
      priority: newPriority,
      description: newDescription.trim(),
      status: 'EN_TALLER',
      workshopEntryDate: newReportDate,
      mechanicAssigned: newMechanic.trim() || 'Taller Central',
    });

    setShowNewReportModal(false);
    setNewDescription('');
    setNewReporter('');
    setNewUnitId('');
  };

  const handleOpenResolveModal = (report: MaintenanceReport) => {
    setResolvingTicket(report);
    setSolutionActions(report.solutionActions || '');
    setDiagnosticNotes(report.diagnosticNotes || '');
    setPartsReplaced(report.partsReplaced || '');
    setMechanicResponsible(report.mechanicAssigned || 'Taller Central');
    setSolutionDate(getCurrentDateTimeLocalString());
    setCostInput(report.estimatedCost ?? '');
    setMarkOperativeOnResolve(true);
  };

  const handleSaveResolution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;

    resolveMaintenanceReport(resolvingTicket.id, {
      workshopActions: solutionActions.trim(),
      diagnosticNotes: diagnosticNotes.trim(),
      partsReplaced: partsReplaced.trim(),
      mechanicAssigned: mechanicResponsible.trim(),
      solutionDate,
      estimatedCost: costInput === '' ? undefined : Number(costInput),
      markUnitOperative: markOperativeOnResolve,
    });

    setResolvingTicket(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Workshop KPI Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-xs">
                Mantenimiento y Taller Mecánico
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 text-xs font-semibold">
                Control de Fallas, Reparaciones y Tiempo Fuera de Servicio
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Registro de Fallas y Soluciones de Taller (Downtime)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Calcula con precisión las horas y días que cada unidad permanece detenida por desperfectos mecánicos.
            </p>
          </div>

          <button
            onClick={() => {
              if (vehicles.length > 0 && !newUnitId) setNewUnitId(vehicles[0].id);
              setShowNewReportModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Reportar Falla a Taller</span>
          </button>
        </div>

        {/* Workshop Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Tiempo Fuera de Servicio</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-extrabold text-amber-400">
              {workshopStats.totalHours} hrs
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {formatDowntime(workshopStats.totalDowntimeMinutes).detailed} acumulado
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Fallas en Taller (Activas)</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-extrabold text-rose-400">
              {workshopStats.activeTickets}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Deteniendo unidades operativas
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Solucionadas / Dadas de Alta</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-emerald-400">
              {workshopStats.resolvedTickets}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Reparaciones completadas
            </p>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Inversión en Reparaciones</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-extrabold text-blue-400">
              ${workshopStats.totalCosts.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Repuestos y mano de obra
            </p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Status pills */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
              {(['TODAS', 'EN_TALLER', 'ESPERA_REPUESTOS', 'ABIERTA', 'SOLUCIONADO'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    statusFilter === st
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'TODAS'
                    ? 'Todas'
                    : st === 'EN_TALLER'
                    ? 'En Taller'
                    : st === 'ESPERA_REPUESTOS'
                    ? 'Repuestos'
                    : st === 'ABIERTA'
                    ? 'Reportadas'
                    : 'Solucionadas'}
                </button>
              ))}
            </div>

            {/* Category selector */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="TODAS">Todas las Categorías</option>
              {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar unidad, falla o taller..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Barra de Fichas Técnicas por Unidad (User Request) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Fichas Técnicas de Unidades • Acceso Directo & Fallas Más Recientes
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Haz clic en cualquier unidad para ver su ficha técnica completa e historial de averías
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {vehicles.map(v => {
            const st = getUnitStatusForDate(v.id, selectedDate);
            const isInop = st.status === 'INOPERATIVA';
            const isObs = st.status === 'EN_OBSERVACION';
            const vReports = maintenanceReports.filter(r => r.unitId === v.id || r.unitNumber.toLowerCase() === v.unitNumber.toLowerCase());
            const activeCount = vReports.filter(r => r.status !== 'SOLUCIONADO').length;

            return (
              <button
                key={v.id}
                onClick={() => {
                  if (onViewUnitDossier) {
                    onViewUnitDossier(v.id);
                  } else {
                    setSelectedDossierVehicle(v);
                  }
                }}
                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between group hover:scale-[1.02] shadow-sm ${
                  isInop
                    ? 'bg-rose-950/30 border-rose-800/60 hover:border-rose-500'
                    : isObs
                    ? 'bg-amber-950/20 border-amber-800/50 hover:border-amber-500'
                    : 'bg-slate-950/70 border-slate-800 hover:border-amber-500/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="font-extrabold text-white text-xs group-hover:text-amber-400 transition">
                    {v.unitNumber}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {v.licensePlate}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] mt-1 pt-1 border-t border-slate-800/60">
                  <span className={`px-1.5 py-0.2 rounded font-bold ${
                    isInop 
                      ? 'text-rose-400 bg-rose-500/10' 
                      : isObs 
                      ? 'text-amber-400 bg-amber-500/10' 
                      : 'text-emerald-400 bg-emerald-500/10'
                  }`}>
                    {isInop ? 'Inoperativa' : isObs ? 'Observación' : 'Operativa'}
                  </span>
                  <span className="text-slate-400 font-medium">
                    {activeCount > 0 ? (
                      <span className="text-rose-400 font-bold">{activeCount} en taller</span>
                    ) : (
                      <span>{vReports.length} {vReports.length === 1 ? 'falla' : 'fallas'}</span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {filteredReports.map((report) => {
          const isResolved = report.status === 'SOLUCIONADO';
          const downtimeMinutes = isResolved
            ? (report.downtimeMinutes ?? calculateDowntimeMinutes(report.workshopEntryDate || report.reportDate, report.solutionDate))
            : calculateDowntimeMinutes(report.workshopEntryDate || report.reportDate, undefined, selectedDate);

          const downtimeFormatted = formatDowntime(downtimeMinutes);
          const inopCalc = calculateInoperativeDays(report.workshopEntryDate || report.reportDate, selectedDate);
          const priorityCfg = PRIORITY_LABELS[report.priority];
          const statusCfg = MAINTENANCE_STATUS_LABELS[report.status];

          return (
            <div
              key={report.id}
              className={`rounded-2xl border transition-all duration-200 bg-slate-900 overflow-hidden shadow-md ${
                !isResolved
                  ? 'border-amber-900/40 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="p-5">
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                      <img 
                        src={getUnitDefaultPhoto(report.unitNumber)} 
                        alt={report.unitNumber} 
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-amber-400 text-sm font-extrabold">{report.unitNumber}</span>
                        <span className="text-[10px] text-slate-300 font-mono px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {report.licensePlate}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {CATEGORY_LABELS[report.category]}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityCfg.badge}`}>
                          Prioridad: {priorityCfg.label}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.badge}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Reportado por: <b className="text-slate-300">{report.reporterName}</b> • {formatDateTime(report.reportDate)}
                      </p>
                    </div>
                  </div>

                  {/* Downtime Badge - Hero metric */}
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <div className={`p-1.5 rounded-lg ${isResolved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400 animate-pulse'}`}>
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        {isResolved ? 'Tiempo Fuera de Servicio Total' : 'Días Fuera de Servicio (En Curso)'}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-base font-extrabold ${isResolved ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {!isResolved && inopCalc.days > 0 ? `${inopCalc.days} días` : downtimeFormatted.detailed}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          ({downtimeFormatted.hoursDecimal} hrs)
                        </span>
                      </div>
                      {!isResolved && inopCalc.days > 0 && (
                        <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                          Desde: {inopCalc.startDateFriendly}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description & Technical Findings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 text-xs">
                  {/* Left: Failure details */}
                  <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                      Descripción de la Falla Reportada:
                    </span>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      {report.description}
                    </p>
                    {report.workshopEntryDate && (
                      <p className="text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                        Ingreso a taller: <span className="text-slate-300 font-mono">{formatDateTime(report.workshopEntryDate)}</span>
                      </p>
                    )}
                  </div>

                  {/* Right: Technical Diagnostic & Solution */}
                  <div className={`rounded-xl p-3.5 border space-y-2 ${
                    isResolved 
                      ? 'bg-emerald-950/15 border-emerald-900/30' 
                      : 'bg-slate-950/60 border-slate-800/80'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                        Diagnóstico y Solución de Taller:
                      </span>
                      {report.mechanicAssigned && (
                        <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          Taller: {report.mechanicAssigned}
                        </span>
                      )}
                    </div>

                    {report.diagnosticNotes && (
                      <p className="text-slate-300 text-xs">
                        <b className="text-slate-400">Diagnóstico:</b> {report.diagnosticNotes}
                      </p>
                    )}

                    {report.solutionActions ? (
                      <div className="space-y-1">
                        <p className="text-emerald-300 font-medium">
                          <b className="text-slate-400">Trabajo realizado:</b> {report.solutionActions}
                        </p>
                        {report.partsReplaced && (
                          <p className="text-slate-300 text-[11px]">
                            <b className="text-slate-400">Repuestos sustituidos:</b> {report.partsReplaced}
                          </p>
                        )}
                        {report.estimatedCost && (
                          <p className="text-slate-300 text-[11px]">
                            <b className="text-slate-400">Costo reparación:</b> ${report.estimatedCost} USD
                          </p>
                        )}
                        {report.solutionDate && (
                          <p className="text-emerald-400 text-[11px] font-medium pt-1">
                            ✓ Entregada y solucionada el: {formatDateTime(report.solutionDate)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic text-xs">
                        Trabajos en ejecución en taller mecánico. Pendiente registro de solución final.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500">ID: {report.id}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        const veh = vehicles.find(v => v.id === report.unitId || v.unitNumber.toLowerCase() === report.unitNumber.toLowerCase());
                        if (veh) {
                          setSelectedDossierVehicle(veh);
                        } else {
                          // Fallback vehicle object
                          setSelectedDossierVehicle({
                            id: report.unitId,
                            unitNumber: report.unitNumber,
                            licensePlate: report.licensePlate,
                            type: 'Autobús',
                            model: report.unitNumber,
                            year: 2022,
                            capacity: 40,
                            mileage: 100000,
                            fuelType: 'Diésel',
                            active: true,
                          });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs transition border border-slate-700 hover:border-amber-500/50"
                      title="Abrir Ficha Técnica y Hoja de Vida de la Unidad"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Ficha de la Unidad</span>
                    </button>

                    {!isResolved && (
                      <button
                        onClick={() => handleOpenResolveModal(report)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/20"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Registrar Solución / Dar Alta</span>
                      </button>
                    )}

                    {isResolved && (
                      <button
                        onClick={() => handleOpenResolveModal(report)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar Solución</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (confirm(`¿Deseas eliminar el reporte de la unidad ${report.unitNumber}?`)) {
                          deleteMaintenanceReport(report.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                      title="Eliminar reporte"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredReports.length === 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No hay reportes de falla</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No se encontraron reportes con los filtros seleccionados. Todas las unidades pueden estar operativas o sin fallas registradas.
          </p>
        </div>
      )}

      {/* Modal: Crear Nuevo Reporte de Falla */}
      {showNewReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reportar Falla Mecánica / Taller</h3>
                  <p className="text-xs text-slate-400">Inicia el conteo de tiempo fuera de servicio (Downtime)</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewReportModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="mt-4 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Unidad Afectada <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={newUnitId}
                    onChange={(e) => setNewUnitId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="">{vehicles.length === 0 ? '⚠️ No hay unidades registradas' : 'Seleccione una unidad'}</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.unitNumber} ({v.licensePlate}) - {v.model}
                      </option>
                    ))}
                  </select>
                  {vehicles.length === 0 && (
                    <p className="text-[11px] text-rose-400 mt-1">
                      Debes registrar primero tus unidades en el menú "Estatus Diario" o "Flota & Choferes".
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Fecha y Hora del Reporte <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={newReportDate}
                    onChange={(e) => setNewReportDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Categoría del Desperfecto
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as FailureCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Severidad / Prioridad
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as FailurePriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="CRITICA">Crítica (Detención Inmediata)</option>
                    <option value="ALTA">Alta (Inoperativa)</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja (Preventivo)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Chofer / Inspector que Reporta
                  </label>
                  <input
                    type="text"
                    value={newReporter}
                    onChange={(e) => setNewReporter(e.target.value)}
                    placeholder="Ej: Chofer Juan Pérez / Inspector Patio"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Taller Mecánico Asignado
                  </label>
                  <input
                    type="text"
                    value={newMechanic}
                    onChange={(e) => setNewMechanic(e.target.value)}
                    placeholder="Ej: Taller Central / Mec. Carlos"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Descripción Detallada de la Falla <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Detalla qué ruido, comportamiento o síntoma presenta la unidad en ruta o patio..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewReportModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-lg shadow-amber-500/20"
                >
                  Registrar Falla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Registrar Solución de Taller y Dar Alta */}
      {resolvingTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Registrar Solución y Liberar Unidad
                  </h3>
                  <p className="text-xs text-slate-400">
                    Unidad: <b className="text-amber-400">{resolvingTicket.unitNumber}</b> ({resolvingTicket.licensePlate})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResolvingTicket(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Downtime Preview Box */}
            <div className="mt-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Inicio de Inoperatividad:</span>
                <span className="font-mono text-slate-200">
                  {formatDateTime(resolvingTicket.workshopEntryDate || resolvingTicket.reportDate)}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-600" />
              <div className="text-right">
                <span className="text-slate-400 block text-[11px]">Tiempo Fuera de Servicio Calculado:</span>
                <span className="font-bold text-amber-400 text-sm">
                  {formatDowntime(calculateDowntimeMinutes(resolvingTicket.workshopEntryDate || resolvingTicket.reportDate, solutionDate)).detailed}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveResolution} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Trabajo y Solución Aplicada por el Taller <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={solutionActions}
                  onChange={(e) => setSolutionActions(e.target.value)}
                  placeholder="Describe las reparaciones ejecutadas (ej. Se sustituyó la bomba de agua, purgado del circuito, prueba de presión ok)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Diagnóstico Técnico Final
                  </label>
                  <input
                    type="text"
                    value={diagnosticNotes}
                    onChange={(e) => setDiagnosticNotes(e.target.value)}
                    placeholder="Ej: Desgaste normal por fatiga / Fuga de sello"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Repuestos / Piezas Instaladas
                  </label>
                  <input
                    type="text"
                    value={partsReplaced}
                    onChange={(e) => setPartsReplaced(e.target.value)}
                    placeholder="Ej: Bomba de agua Gates, 2 abrazaderas, 5L anticongelante"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Mecánico / Taller Responsable
                  </label>
                  <input
                    type="text"
                    value={mechanicResponsible}
                    onChange={(e) => setMechanicResponsible(e.target.value)}
                    placeholder="Nombre del técnico o taller"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Fecha y Hora de Liberación / Solución <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={solutionDate}
                    onChange={(e) => setSolutionDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Costo Total Estimado ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costInput}
                    onChange={(e) => setCostInput(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Auto update unit status checkbox */}
              <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="markOperativeCheck"
                  checked={markOperativeOnResolve}
                  onChange={(e) => setMarkOperativeOnResolve(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500"
                />
                <label htmlFor="markOperativeCheck" className="text-xs font-semibold text-emerald-300 cursor-pointer">
                  Cambiar automáticamente el estatus diario de la unidad a <b>OPERATIVA</b>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolvingTicket(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/30"
                >
                  Guardar Solución y Dar Alta
                </button>
              </div>
            </form>
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
