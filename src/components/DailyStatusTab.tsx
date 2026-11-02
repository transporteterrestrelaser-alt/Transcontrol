import React, { useState } from 'react';
import { 
  Bus, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Wrench, 
  CheckCheck,
  Calendar,
  PlusCircle,
  FileText,
  Camera,
  ImageIcon,
  Clock,
  ArrowRight,
  List,
  LayoutGrid,
  Users,
  CheckCircle2,
  AlertTriangle,
  Gauge,
  TrendingUp,
  Printer,
  ChevronRight,
  X
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { UnitOperationalStatus, FailureCategory, FailurePriority, Vehicle, ShiftType } from '../types/fleet';
import { formatDate, OPERATIONAL_STATUS_CONFIG, CATEGORY_LABELS, calculateInoperativeDays } from '../utils/timeUtils';
import { VehiclePhotoModal } from './VehiclePhotoModal';
import { VehicleDossierModal } from './VehicleDossierModal';
import { getUnitDefaultPhoto } from '../utils/imageUtils';
import { WhatsAppIcon } from './WhatsAppStatusModal';

interface DailyStatusTabProps {
  onGoToMaintenance: (unitNumber?: string) => void;
  onViewUnitDossier?: (unitId: string) => void;
  onOpenMonthlyReport?: () => void;
  onOpenDailyReport?: () => void;
  onOpenWhatsAppModal?: () => void;
  onOpenDriverSearch?: () => void;
}

export const DailyStatusTab: React.FC<DailyStatusTabProps> = ({
  onGoToMaintenance,
  onViewUnitDossier,
  onOpenMonthlyReport,
  onOpenDailyReport,
  onOpenWhatsAppModal,
  onOpenDriverSearch,
}) => {
  const { 
    vehicles, 
    selectedDate, 
    getUnitStatusForDate, 
    getUnitLatestFailure,
    setUnitStatus, 
    batchSetStatus,
    maintenanceReports,
    addVehicle,
    updateVehiclePhoto,
    metrics,
    dailyAssignments,
    assignDriverToUnit,
    drivers,
  } = useFleet();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODAS' | UnitOperationalStatus>('TODAS');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | string>('TODOS');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [photoModalVehicle, setPhotoModalVehicle] = useState<Vehicle | null>(null);
  const [selectedDossierVehicle, setSelectedDossierVehicle] = useState<Vehicle | null>(null);

  // Modal for quick adding vehicle
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [quickUnitNumber, setQuickUnitNumber] = useState('');
  const [quickLicensePlate, setQuickLicensePlate] = useState('');
  const [quickModel, setQuickModel] = useState('');
  const [quickCapacity, setQuickCapacity] = useState(40);
  const [quickType, setQuickType] = useState<'Autobús' | 'Minibús' | 'Van' | 'Microbús' | 'Camioneta'>('Autobús');

  // Modal for changing status and registering inoperative reason / failure
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [modalTargetStatus, setModalTargetStatus] = useState<UnitOperationalStatus>('INOPERATIVA');
  const [reasonInput, setReasonInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [shouldCreateTicket, setShouldCreateTicket] = useState(true);
  const [ticketCategory, setTicketCategory] = useState<FailureCategory>('MECANICA');
  const [ticketPriority, setTicketPriority] = useState<FailurePriority>('ALTA');
  const [mechanicInput, setMechanicInput] = useState('Taller Central');

  // Quick driver assignment modal state
  const [assigningDriverVehicle, setAssigningDriverVehicle] = useState<Vehicle | null>(null);
  const [modalDriverName, setModalDriverName] = useState('');
  const [modalDriverShift, setModalDriverShift] = useState<ShiftType>('COMPLETO');
  const [modalDriverRoute, setModalDriverRoute] = useState('');
  const [modalDriverNotes, setModalDriverNotes] = useState('');

  const activeVehicles = vehicles.filter(v => v.active);

  // Available vehicle types in fleet
  const vehicleTypes = ['TODOS', ...Array.from(new Set(activeVehicles.map(v => v.type)))];

  // Filtered vehicles
  const filteredVehicles = activeVehicles.filter(veh => {
    const statusObj = getUnitStatusForDate(veh.id, selectedDate);
    const asg = dailyAssignments.find(a => 
      (a.unitId === veh.id || a.unitNumber.toLowerCase() === veh.unitNumber.toLowerCase()) && 
      a.date === selectedDate
    );
    
    // Status filter (Las unidades con condición se incluyen al consultar operativas)
    if (statusFilter !== 'TODAS') {
      if (statusFilter === 'OPERATIVA') {
        if (statusObj.status !== 'OPERATIVA' && statusObj.status !== 'EN_OBSERVACION') {
          return false;
        }
      } else if (statusObj.status !== statusFilter) {
        return false;
      }
    }

    // Type filter
    if (typeFilter !== 'TODOS' && veh.type !== typeFilter) {
      return false;
    }

    // Text search (incluyendo chofer y ruta del día)
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNumber = veh.unitNumber.toLowerCase().includes(q);
      const matchPlate = veh.licensePlate.toLowerCase().includes(q);
      const matchModel = veh.model.toLowerCase().includes(q);
      const matchReason = statusObj.reason?.toLowerCase().includes(q);
      const matchNotes = statusObj.notes?.toLowerCase().includes(q) || veh.notes?.toLowerCase().includes(q);
      const matchDriver = asg?.driverName.toLowerCase().includes(q) || asg?.route.toLowerCase().includes(q);
      if (!matchNumber && !matchPlate && !matchModel && !matchReason && !matchNotes && !matchDriver) {
        return false;
      }
    }

    return true;
  });

  // Calculate counts for filters
  // Nota: Las unidades con condición (en observación) se contabilizan en la capacidad operativa como operativas y nunca como inoperativas
  const counts = {
    TODAS: activeVehicles.length,
    OPERATIVA: activeVehicles.filter(v => {
      const s = getUnitStatusForDate(v.id, selectedDate).status;
      return s === 'OPERATIVA' || s === 'EN_OBSERVACION';
    }).length,
    INOPERATIVA: activeVehicles.filter(v => getUnitStatusForDate(v.id, selectedDate).status === 'INOPERATIVA').length,
    EN_OBSERVACION: activeVehicles.filter(v => getUnitStatusForDate(v.id, selectedDate).status === 'EN_OBSERVACION').length,
  };

  const openStatusModal = (unitId: string, targetStatus: UnitOperationalStatus) => {
    const veh = vehicles.find(v => v.id === unitId);
    const currStatus = getUnitStatusForDate(unitId, selectedDate);
    setEditingUnitId(unitId);
    setModalTargetStatus(targetStatus);
    setReasonInput(currStatus.reason || '');
    setNotesInput(currStatus.notes || '');
    setShouldCreateTicket(targetStatus === 'INOPERATIVA');
    if (targetStatus === 'OPERATIVA') {
      // Direct quick change if operative, or modal confirmation
      setUnitStatus(unitId, 'OPERATIVA', undefined, 'Puesta en servicio operativo.');
      setEditingUnitId(null);
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnitId) return;

    const veh = vehicles.find(v => v.id === editingUnitId);
    if (!veh) return;

    if (modalTargetStatus === 'INOPERATIVA' && shouldCreateTicket) {
      setUnitStatus(
        editingUnitId,
        'INOPERATIVA',
        reasonInput || 'Unidad inoperativa reportada',
        notesInput,
        true,
        {
          category: ticketCategory,
          priority: ticketPriority,
          mechanicAssigned: mechanicInput,
          description: reasonInput || `Falla mecánica en unidad ${veh.unitNumber}`,
          reportDate: `${selectedDate}T08:00`,
        }
      );
    } else {
      setUnitStatus(
        editingUnitId,
        modalTargetStatus,
        modalTargetStatus === 'OPERATIVA' ? undefined : reasonInput,
        notesInput
      );
    }

    setEditingUnitId(null);
    setReasonInput('');
    setNotesInput('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Capacidad Operativa Diaria & Actions Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-amber-400 font-extrabold uppercase tracking-wider text-xs bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                Módulo Principal • Control de Flota
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-200 text-xs font-bold flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Fecha Operativa: {formatDate(selectedDate)}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2.5">
              <span>Capacidad Operativa Diaria de Flota</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Monitoreo ejecutivo en tiempo real de la capacidad por unidades de la flota (Hoy se cuenta con <b className="text-emerald-400 font-extrabold">{metrics.operativeCount} unidades operativas de {metrics.totalActiveVehicles}</b>), condición técnica, fallas de taller y disponibilidad operativa • LASER Airlines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setQuickUnitNumber(`UN-${activeVehicles.length + 1}`);
                setQuickLicensePlate('');
                setQuickModel('');
                setQuickCapacity(40);
                setShowAddVehicleModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20"
              title="Registrar una nueva unidad de transporte"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Registrar Unidad</span>
            </button>

            {activeVehicles.length > 0 && (
              <button
                onClick={() => batchSetStatus('OPERATIVA')}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 transition shadow-sm"
                title="Abre la jornada marcando todas las unidades como operativas"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" />
                <span>Marcar Todas Operativas</span>
              </button>
            )}

            {onOpenDailyReport && (
              <button
                onClick={onOpenDailyReport}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20"
                title="Generar e imprimir el Parte Diario en 1 sola hoja con estatus total, inoperativas, con fallas y disponibles"
              >
                <Printer className="w-4 h-4 text-slate-950" />
                <span>Parte Diario (1 Hoja)</span>
              </button>
            )}

            {onOpenDriverSearch && (
              <button
                onClick={onOpenDriverSearch}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 transition shadow-sm"
                title="Consultar qué chofer estaba manejando según el día e historial"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>Buscar Chofer por Día</span>
              </button>
            )}

            {onOpenWhatsAppModal && (
              <button
                onClick={onOpenWhatsAppModal}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20"
                title="Generar y compartir reporte formateado para grupo operativo de WhatsApp"
              >
                <WhatsAppIcon className="w-4 h-4 text-white" />
                <span>Estatus WhatsApp</span>
              </button>
            )}

            {onOpenMonthlyReport && (
              <button
                onClick={onOpenMonthlyReport}
                className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/35 transition shadow-sm"
                title="Generar consolidado mensual de capacidad operativa y flota"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Informe Mensual</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Hero KPI Cards: Capacidad Operativa Diaria por Unidades */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Capacidad Operativa Disponible por Unidades */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition" />
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-[10px]">Capacidad Operativa de Flota</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold">
                <Bus className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {metrics.operativeCount} de {metrics.totalActiveVehicles}
              </span>
              <span className="text-xs text-slate-300 font-bold">
                unidades disponibles ({metrics.availabilityRate}%)
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${metrics.availabilityRate}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-300/90 font-medium mt-2 flex items-center justify-between">
              <span>{metrics.pureOperativeCount} operativas + {metrics.observationCount} con condición</span>
              <span className="font-bold font-mono">{metrics.availabilityRate}%</span>
            </p>
          </div>

          {/* Card 2: Unidades Inoperativas (Fuera de Servicio / En Taller) */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition" />
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-[10px]">Inoperativas en Taller</span>
              <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-400 font-mono">
                {metrics.inoperativeCount} de {metrics.totalActiveVehicles}
              </span>
              <span className="text-xs text-rose-300/80 font-bold">
                unidades fuera de servicio
              </span>
            </div>
            
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {metrics.inoperativeCount} {metrics.inoperativeCount === 1 ? 'unidad en taller' : 'unidades en taller'}
              </span>
              {metrics.totalInoperativeDays > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800/60 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-rose-400" />
                  {metrics.totalInoperativeDays}d acumulados
                </span>
              )}
            </div>
            <p className="text-[11px] text-rose-300/90 mt-2 font-medium">
              No disponible en la capacidad operativa
            </p>
          </div>

          {/* Card 3: Unidades en Observación (Condicionadas) */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/90 shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition" />
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-bold uppercase tracking-wider text-[10px]">Operativas con Condición</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 font-mono">
                {metrics.observationCount} de {metrics.totalActiveVehicles}
              </span>
              <span className="text-xs text-amber-300/80 font-bold">
                unidad condicionada
              </span>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {metrics.observationCount} {metrics.observationCount === 1 ? 'unidad en servicio corto' : 'unidades en servicio corto'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium mt-2">
              Contabilizada como operativa en la capacidad
            </p>
          </div>
        </div>

        {/* Visual Segment Bar of Total Fleet Capacity in Units (User Request) */}
        <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <span className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>Capacidad Operativa de Flota: <b className="text-emerald-400">{metrics.operativeCount} de {metrics.totalActiveVehicles} unidades</b> ({metrics.availabilityRate}%)</span>
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
              metrics.availabilityRate >= 50
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
            }`}>
              {metrics.operativeCount} de {metrics.totalActiveVehicles} unidades disponibles
            </span>
          </div>

          <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
            {/* Segment 1: Pure Operative (Verde) */}
            <div 
              style={{ width: `${(metrics.pureOperativeCount / (metrics.totalActiveVehicles || 1)) * 100}%` }}
              className="bg-emerald-500 h-full transition-all"
              title={`100% Operativas: ${metrics.pureOperativeCount} de ${metrics.totalActiveVehicles} unidades`}
            />
            {/* Segment 2: Con Condición (Ámbar) - Colocada como operativa */}
            <div 
              style={{ width: `${(metrics.observationCount / (metrics.totalActiveVehicles || 1)) * 100}%` }}
              className="bg-amber-500 h-full transition-all"
              title={`Operativa con Condición: ${metrics.observationCount} de ${metrics.totalActiveVehicles} unidades`}
            />
            {/* Segment 3: Inoperativa en Taller (Rojo) - NO disponible */}
            <div 
              style={{ width: `${(metrics.inoperativeCount / (metrics.totalActiveVehicles || 1)) * 100}%` }}
              className="bg-rose-500 h-full transition-all"
              title={`Inoperativa en Taller: ${metrics.inoperativeCount} de ${metrics.totalActiveVehicles} unidades (NO DISPONIBLE)`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-200 font-bold">{metrics.pureOperativeCount} unidades</span> 100% operativas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-amber-300 font-bold">{metrics.observationCount} unidad</span> con condición (operativa)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="text-rose-300 font-bold">{metrics.inoperativeCount} unidad</span> inoperativa en taller (<b className="text-rose-400">NO disponible</b>)
              </span>
            </div>
            <span className="font-mono text-emerald-400 font-bold">
              Total Flota: {metrics.totalActiveVehicles} unidades
            </span>
          </div>
        </div>

        {/* Toolbar: Filters, Type selector, Search & View Switcher */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter('TODAS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'TODAS'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({counts.TODAS})
            </button>
            <button
              onClick={() => setStatusFilter('OPERATIVA')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'OPERATIVA'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Operativas ({counts.OPERATIVA})
            </button>
            <button
              onClick={() => setStatusFilter('INOPERATIVA')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'INOPERATIVA'
                  ? 'bg-rose-500 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Inoperativas ({counts.INOPERATIVA})</span>
              {metrics.totalInoperativeDays > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800/60">
                  {metrics.totalInoperativeDays}d acum.
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter('EN_OBSERVACION')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === 'EN_OBSERVACION'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Observación ({counts.EN_OBSERVACION})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Vehicle Type Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              {vehicleTypes.map(t => (
                <option key={t} value={t}>
                  {t === 'TODOS' ? 'Todos los Tipos' : t}
                </option>
              ))}
            </select>

            {/* Search bar */}
            <div className="relative min-w-[200px] sm:min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar unidad, placa, chofer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition"
              />
            </div>

            {/* View Mode Toggle: TABLE vs CARDS */}
            <div className="flex items-center bg-slate-950/90 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'TABLE'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Listado Tabular de Capacidad Operativa"
              >
                <List className="w-3.5 h-3.5" />
                <span>Listado</span>
              </button>
              <button
                onClick={() => setViewMode('CARDS')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  viewMode === 'CARDS'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Vista Cuadrícula de Tarjetas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tarjetas</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visualización 1: Listado de Estatus y Capacidad Operativa (VISTA TABLA) */}
      {viewMode === 'TABLE' && filteredVehicles.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Listado Maestro de Unidades • Capacidad Operativa Diaria
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <b className="text-emerald-300">{metrics.operativeCount} de {metrics.totalActiveVehicles} unidades disponibles</b>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                <b className="text-rose-300">{metrics.inoperativeCount} unidades en taller</b>
              </span>
              {metrics.observationCount > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <b className="text-amber-300">{metrics.observationCount} en observación</b>
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                <tr>
                  <th className="py-3.5 px-4 font-bold">Unidad & Vehículo</th>
                  <th className="py-3.5 px-3 font-bold">Placa & Tipo</th>
                  <th className="py-3.5 px-3 font-bold text-center">Capacidad</th>
                  <th className="py-3.5 px-3 font-bold text-center">Estatus Operativo</th>
                  <th className="py-3.5 px-4 font-bold">Capacidad Diaria (Unidades)</th>
                  <th className="py-3.5 px-4 font-bold">Chofer Encargado (Día)</th>
                  <th className="py-3.5 px-4 font-bold">Falla Más Reciente / Condición</th>
                  <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredVehicles.map(veh => {
                  const statusObj = getUnitStatusForDate(veh.id, selectedDate);
                  const isOperative = statusObj.status === 'OPERATIVA';
                  const isInoperative = statusObj.status === 'INOPERATIVA';
                  const isObservation = statusObj.status === 'EN_OBSERVACION';
                  const cfg = OPERATIONAL_STATUS_CONFIG[statusObj.status];
                  const inopCalc = calculateInoperativeDays(
                    statusObj.inoperativeSince || veh.inoperativeSince || statusObj.reason || veh.notes,
                    selectedDate
                  );
                  const latestFailure = getUnitLatestFailure(veh.id) || getUnitLatestFailure(veh.unitNumber);

                  return (
                    <tr 
                      key={veh.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isInoperative 
                          ? 'bg-rose-950/10' 
                          : isObservation 
                          ? 'bg-amber-950/10' 
                          : ''
                      }`}
                    >
                      {/* Unidad & Vehículo */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setPhotoModalVehicle(veh)}
                            className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 p-0.5 shrink-0 overflow-hidden shadow-inner hover:border-amber-400 transition"
                            title="Ver / cambiar foto de la unidad"
                          >
                            <img 
                              src={veh.photoUrl || getUnitDefaultPhoto(veh.unitNumber)} 
                              alt={veh.unitNumber} 
                              className="max-h-full max-w-full object-contain mx-auto"
                            />
                          </button>
                          <div>
                            <button
                              onClick={() => {
                                if (onViewUnitDossier) {
                                  onViewUnitDossier(veh.id);
                                } else {
                                  setSelectedDossierVehicle(veh);
                                }
                              }}
                              className="font-extrabold text-sm text-white hover:text-amber-400 transition text-left block cursor-pointer"
                              title="Abrir Ficha Técnica"
                            >
                              {veh.unitNumber}
                            </button>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                              {veh.model}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Placa & Tipo */}
                      <td className="py-3.5 px-3">
                        <span className="font-mono text-xs font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {veh.licensePlate}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-1">
                          {veh.type}
                        </span>
                      </td>

                      {/* Capacidad Nominal */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-extrabold text-white text-xs bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          <span>{veh.capacity} pax</span>
                        </span>
                      </td>

                      {/* Estatus Operativo */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} animate-pulse`} />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Capacidad Diaria (Unidades) */}
                      <td className="py-3.5 px-4">
                        {isOperative ? (
                          <div>
                            <span className="text-emerald-400 font-extrabold text-xs flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              1 unidad operativa (100% activa)
                            </span>
                            <span className="text-[10px] text-emerald-500 font-medium block mt-0.5">
                              Aporte pleno a la flota • {veh.capacity} pax nominales
                            </span>
                          </div>
                        ) : isInoperative ? (
                          <div>
                            <span className="text-rose-400 font-extrabold text-xs flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              0 unidades (Fuera de servicio)
                            </span>
                            <span className="text-[10px] font-mono text-rose-300 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-rose-400" />
                              {inopCalc.days > 0 ? `${inopCalc.days} días de parada acumulada` : inopCalc.formatted}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-amber-400 font-extrabold text-xs flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                              1 unidad condicional (Restringida)
                            </span>
                            <span className="text-[10px] text-amber-300 font-medium block mt-0.5">
                              Falla de potencia: Solo traslados cortos/tripulación
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Chofer Encargado (Día) */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const asg = dailyAssignments.find(a => 
                            (a.unitId === veh.id || a.unitNumber.toLowerCase() === veh.unitNumber.toLowerCase()) && 
                            a.date === selectedDate
                          );
                          const drvObj = asg ? drivers.find(d => d.fullName.toLowerCase() === asg.driverName.toLowerCase() || d.id === asg.driverId) : undefined;

                          if (isInoperative) {
                            return (
                              <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                <span>En Taller • Sin Chofer</span>
                              </div>
                            );
                          }

                          if (asg?.driverName) {
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                                      {asg.driverName.charAt(0)}
                                    </div>
                                    <span className="font-extrabold text-white text-xs">
                                      {asg.driverName}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setAssigningDriverVehicle(veh);
                                      setModalDriverName(asg.driverName);
                                      setModalDriverShift(asg.shift);
                                      setModalDriverRoute(asg.route);
                                      setModalDriverNotes(asg.notes || '');
                                    }}
                                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline px-1"
                                    title="Cambiar chofer asignado para hoy"
                                  >
                                    Cambiar
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span className="truncate max-w-[140px] text-slate-300">
                                    {asg.route || 'Ruta Regular'}
                                  </span>
                                  <span className="px-1 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800 font-mono text-[9px]">
                                    {asg.shift}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <button
                              onClick={() => {
                                setAssigningDriverVehicle(veh);
                                const defaultRoute = veh.unitNumber.includes('44') 
                                  ? 'Estación Maracay' 
                                  : veh.unitNumber.includes('43') 
                                  ? 'Traslados o requerimientos cortos: tripulación' 
                                  : 'Ruta Regular Transporte de Personal';
                                setModalDriverName('');
                                setModalDriverShift('COMPLETO');
                                setModalDriverRoute(defaultRoute);
                                setModalDriverNotes('');
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition shadow-sm"
                              title="Asignar chofer para esta fecha"
                            >
                              <Users className="w-3 h-3 text-amber-400" />
                              <span>+ Asignar Chofer</span>
                            </button>
                          );
                        })()}
                      </td>

                      {/* Falla Más Reciente / Condición */}
                      <td className="py-3.5 px-4">
                        {latestFailure ? (
                          <div className="max-w-[220px]">
                            <div className="flex items-center gap-1 text-[10px] mb-0.5">
                              <span className="font-bold text-slate-300">
                                {CATEGORY_LABELS[latestFailure.category] || latestFailure.category}:
                              </span>
                              <span className={`px-1.5 py-0.2 rounded font-bold ${
                                latestFailure.status === 'SOLUCIONADO'
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : latestFailure.status === 'EN_TALLER'
                                  ? 'text-rose-400 bg-rose-500/10'
                                  : 'text-amber-400 bg-amber-500/10'
                              }`}>
                                {latestFailure.status === 'SOLUCIONADO' ? 'Solucionado' : latestFailure.status === 'EN_TALLER' ? 'En Taller' : 'Abierta'}
                              </span>
                            </div>
                            <p className="text-slate-200 text-xs font-medium truncate" title={latestFailure.description}>
                              "{latestFailure.description}"
                            </p>
                            {isInoperative && inopCalc.startDateFriendly && (
                              <span className="text-[10px] text-rose-300/80 font-mono block mt-0.5">
                                Parada desde: {inopCalc.startDateFriendly}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Sin fallas reportadas
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              if (onViewUnitDossier) {
                                onViewUnitDossier(veh.id);
                              } else {
                                setSelectedDossierVehicle(veh);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold transition shadow-sm"
                            title="Abrir Ficha Técnica y Hoja de Vida"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ver Ficha</span>
                          </button>

                          <button
                            onClick={() => openStatusModal(veh.id, isInoperative ? 'OPERATIVA' : 'INOPERATIVA')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700"
                            title="Cambiar estatus de la unidad"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-950/95 font-bold border-t border-slate-800 text-xs text-slate-300">
                <tr>
                  <td className="py-3.5 px-4 text-white">
                    Flota Total: {metrics.totalActiveVehicles} unidades
                  </td>
                  <td className="py-3.5 px-3 text-slate-400">
                    Capacidad Flota
                  </td>
                  <td className="py-3.5 px-3 text-center text-slate-300">
                    {metrics.totalPassengerCapacity} pax nom.
                  </td>
                  <td className="py-3.5 px-3 text-center text-emerald-400">
                    {metrics.operativeCount} de {metrics.totalActiveVehicles} ({metrics.availabilityRate}%)
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400">
                    <b>{metrics.operativeCount} de {metrics.totalActiveVehicles} unidades operativas</b>
                    {metrics.inoperativeCount > 0 && (
                      <span className="text-rose-400 font-normal block text-[10px]">
                        (-{metrics.inoperativeCount} unidades en taller)
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    <span className="text-emerald-300 font-bold">{metrics.pureOperativeCount} operativas</span>
                    {metrics.observationCount > 0 && <span className="text-amber-300 font-bold ml-1">+ {metrics.observationCount} con condición</span>}
                    {metrics.inoperativeCount > 0 && <span className="text-rose-400 font-bold ml-1">• {metrics.inoperativeCount} inop.</span>}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400">
                    LASER Flota
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Visualización 2: Cuadrícula de Tarjetas (VISTA CARDS) */}
      {viewMode === 'CARDS' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((veh) => {
          const statusObj = getUnitStatusForDate(veh.id, selectedDate);
          const isOperative = statusObj.status === 'OPERATIVA';
          const isInoperative = statusObj.status === 'INOPERATIVA';
          const isObservation = statusObj.status === 'EN_OBSERVACION';

          const cfg = OPERATIONAL_STATUS_CONFIG[statusObj.status];

          const inopCalc = calculateInoperativeDays(
            statusObj.inoperativeSince || veh.inoperativeSince || statusObj.reason || veh.notes,
            selectedDate
          );

          // Check if there is an active maintenance ticket
          const activeTicket = maintenanceReports.find(
            r => r.unitId === veh.id && r.status !== 'SOLUCIONADO'
          );

          return (
            <div
              key={veh.id}
              className={`rounded-2xl border transition-all duration-200 bg-slate-900 flex flex-col justify-between overflow-hidden shadow-md hover:shadow-xl ${
                isInoperative
                  ? 'border-rose-900/60 bg-gradient-to-b from-slate-900 to-rose-950/15'
                  : isObservation
                  ? 'border-amber-900/60 bg-gradient-to-b from-slate-900 to-amber-950/15'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-slate-800/80">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setPhotoModalVehicle(veh)}
                      title="Ver / cambiar foto de la unidad"
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold p-1 overflow-hidden shrink-0 transition hover:scale-105 ${
                        isInoperative
                          ? 'bg-rose-500/10 border border-rose-500/30'
                          : isObservation
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-emerald-500/10 border border-emerald-500/30'
                      }`}
                    >
                      <img 
                        src={veh.photoUrl || getUnitDefaultPhoto(veh.unitNumber)} 
                        alt={veh.unitNumber} 
                        className="max-h-full max-w-full object-contain"
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            if (onViewUnitDossier) {
                              onViewUnitDossier(veh.id);
                            } else {
                              setSelectedDossierVehicle(veh);
                            }
                          }}
                          className="font-extrabold text-base text-white tracking-wide hover:text-amber-400 transition text-left cursor-pointer"
                          title="Ver Ficha Técnica de la unidad"
                        >
                          {veh.unitNumber}
                        </button>
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {veh.licensePlate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{veh.model}</p>
                    </div>
                  </div>

                  {/* Badge & Inoperative Days Counter */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} animate-pulse`} />
                      {cfg.label}
                    </span>
                    {isInoperative && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm animate-pulse">
                        <Clock className="w-3 h-3 text-rose-400" />
                        {inopCalc.formatted} inoperativa
                      </span>
                    )}
                  </div>
                </div>

                {/* Photo & Dossier Quick Action & Vehicle Info */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isOperative
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : isInoperative
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    }`}>
                      {isOperative ? '1 unidad activa' : isInoperative ? '0 unid. (En taller)' : '1 unid. condicional'}
                    </span>
                    <span>Cap: <b className="text-slate-200">{veh.capacity}p</b></span>
                    <span>• {veh.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPhotoModalVehicle(veh)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white transition"
                      title="Ver o cambiar foto de la unidad"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span>Foto</span>
                    </button>
                    <button
                      onClick={() => {
                        if (onViewUnitDossier) {
                          onViewUnitDossier(veh.id);
                        } else {
                          setSelectedDossierVehicle(veh);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-[11px] font-bold transition shadow-sm"
                      title="Abrir Ficha Técnica y Hoja de Vida de la Unidad"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ver Ficha</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Details / Reason / Maintenance Details */}
              <div className="p-4 space-y-3 flex-1 text-xs">
                {isInoperative ? (
                  <div className="bg-rose-950/40 border border-rose-800/50 rounded-xl p-3 space-y-2.5">
                    {/* Inoperative Days Telemetry Card */}
                    <div className="bg-gradient-to-r from-rose-950 via-rose-900/40 to-slate-950 rounded-lg p-2.5 border border-rose-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-rose-500/25 text-rose-300">
                          <Clock className="w-4 h-4 text-rose-400" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-rose-300/80 block tracking-wider">
                            Días Fuera de Servicio
                          </span>
                          <span className="text-sm font-black text-rose-200">
                            {inopCalc.days} días consecutivos
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Inicio de Parada
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {inopCalc.startDateFriendly}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-rose-300 font-semibold text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>Motivo de Inoperatividad:</span>
                    </div>
                    <p className="text-rose-200 text-xs italic pl-5">
                      "{statusObj.reason || 'Sin motivo especificado'}"
                    </p>
                    {activeTicket ? (
                      <div className="pt-2 border-t border-rose-900/40 flex items-center justify-between">
                        <span className="text-[11px] text-slate-300 font-medium">
                          Taller: {activeTicket.mechanicAssigned || 'Taller Central'}
                        </span>
                        <button
                          onClick={() => onGoToMaintenance(veh.unitNumber)}
                          className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline inline-flex items-center gap-1"
                        >
                          <Wrench className="w-3 h-3" />
                          Ver Ficha de Taller
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openStatusModal(veh.id, 'INOPERATIVA')}
                        className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline inline-flex items-center gap-1 pt-1"
                      >
                        <PlusCircle className="w-3 h-3" />
                        Generar Reporte de Taller
                      </button>
                    )}
                  </div>
                ) : isObservation ? (
                  <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Observación Técnica:</span>
                    </div>
                    <p className="text-amber-200/90 italic pl-5">
                      "{statusObj.reason || statusObj.notes || 'Revisión preventiva pendiente'}"
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Unidad 100% Disponible para Servicio</span>
                    </div>
                    {statusObj.notes && (
                      <p className="text-slate-400 text-[11px] mt-1 pl-5">
                        Nota: {statusObj.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Fallas Más Recientes de la Unidad (User Request) */}
                {(() => {
                  const latestFailure = getUnitLatestFailure(veh.id) || getUnitLatestFailure(veh.unitNumber);
                  if (latestFailure) {
                    const isSolved = latestFailure.status === 'SOLUCIONADO';
                    const reportInop = calculateInoperativeDays(latestFailure.workshopEntryDate || latestFailure.reportDate, selectedDate);
                    return (
                      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1.5 shadow-inner">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-300">
                            <Wrench className={`w-3.5 h-3.5 ${isSolved ? 'text-emerald-400' : 'text-amber-400'}`} />
                            <span>Falla Más Reciente:</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSolved 
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                              : latestFailure.status === 'EN_TALLER'
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}>
                            {latestFailure.status === 'SOLUCIONADO' ? 'Solucionado' : latestFailure.status === 'EN_TALLER' ? 'En Taller' : 'Abierta'}
                          </span>
                        </div>
                        <p className="text-slate-200 text-xs font-medium pl-5 line-clamp-2">
                          "{latestFailure.description}"
                        </p>
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Reportado: <b className="text-slate-300 font-mono">{formatDate(latestFailure.reportDate)}</b></span>
                          <button
                            onClick={() => setSelectedDossierVehicle(veh)}
                            className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-1 hover:underline"
                            title="Ver ficha técnica completa y todas las fallas"
                          >
                            <span>Ver Ficha</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2.5 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="text-slate-300 font-medium">Sin fallas mecánicas activas</span>
                      </div>
                      <button
                        onClick={() => setSelectedDossierVehicle(veh)}
                        className="text-amber-400 hover:text-amber-300 font-bold inline-flex items-center gap-0.5 hover:underline text-[10px]"
                      >
                        <span>Ficha</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })()}

                {/* Chofer Encargado del Día */}
                {(() => {
                  const asg = dailyAssignments.find(a => 
                    (a.unitId === veh.id || a.unitNumber.toLowerCase() === veh.unitNumber.toLowerCase()) && 
                    a.date === selectedDate
                  );
                  return (
                    <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-2 shadow-inner">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isInoperative 
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
                            : asg?.driverName 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {isInoperative ? <X className="w-4 h-4" /> : asg?.driverName ? asg.driverName.charAt(0) : <Users className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Chofer Encargado (Hoy)
                          </span>
                          <span className="font-extrabold text-xs text-white block">
                            {isInoperative ? 'En Taller (Sin Chofer)' : asg?.driverName || 'Sin asignar'}
                          </span>
                          {asg?.route && !isInoperative && (
                            <span className="text-[10px] text-slate-400 block truncate max-w-[170px]">
                              {asg.route}
                            </span>
                          )}
                        </div>
                      </div>

                      {!isInoperative && (
                        <button
                          onClick={() => {
                            setAssigningDriverVehicle(veh);
                            setModalDriverName(asg?.driverName || '');
                            setModalDriverShift(asg?.shift || 'COMPLETO');
                            setModalDriverRoute(asg?.route || (veh.unitNumber.includes('44') ? 'Estación Maracay' : veh.unitNumber.includes('43') ? 'Traslados o requerimientos cortos: tripulación' : 'Ruta Regular Transporte de Personal'));
                            setModalDriverNotes(asg?.notes || '');
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition shadow-sm shrink-0"
                          title="Asignar o cambiar chofer para esta fecha"
                        >
                          {asg?.driverName ? 'Cambiar' : '+ Asignar'}
                        </button>
                      )}
                    </div>
                  );
                })()}

              </div>

              {/* Status Action Buttons Bar */}
              <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase px-1">
                  Cambiar Estatus:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openStatusModal(veh.id, 'OPERATIVA')}
                    title="Poner Operativa"
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      isOperative
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700'
                    }`}
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Operativa</span>
                  </button>

                  <button
                    onClick={() => openStatusModal(veh.id, 'INOPERATIVA')}
                    title="Marcar Inoperativa / Reportar Taller"
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      isInoperative
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Inoperativa</span>
                  </button>

                  <button
                    onClick={() => openStatusModal(veh.id, 'EN_OBSERVACION')}
                    title="Marcar En Observación"
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                      isObservation
                        ? 'bg-amber-600 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Obs.</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}

      {activeVehicles.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center max-w-xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-400">
            <Bus className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Comienza desde cero</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            No tienes unidades cargadas en el sistema. Agrega el número de unidad (ej. <b className="text-amber-400">UN-01</b>), placa y modelo de los transportes de tu empresa para comenzar a gestionar el estatus diario (Operativas/Inoperativas), reportar fallas de taller y asignar choferes.
          </p>
          <button
            onClick={() => {
              setQuickUnitNumber('UN-01');
              setQuickLicensePlate('');
              setQuickModel('');
              setQuickCapacity(40);
              setShowAddVehicleModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Registrar Primera Unidad</span>
          </button>
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Bus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No se encontraron unidades</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Ninguna unidad coincide con el filtro o término de búsqueda ingresado.
          </p>
        </div>
      ) : null}

      {/* Modal: Quick Add Vehicle */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registrar Unidad de Transporte</h3>
                  <p className="text-xs text-slate-400">Carga la unidad a tu flota operativa</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addVehicle({
                  unitNumber: quickUnitNumber.trim().toUpperCase(),
                  licensePlate: quickLicensePlate.trim().toUpperCase() || 'S/P',
                  type: quickType,
                  model: quickModel.trim() || 'Unidad de Transporte',
                  year: 2022,
                  capacity: Number(quickCapacity) || 40,
                  mileage: 50000,
                  fuelType: 'Diésel',
                  active: true,
                });
                setShowAddVehicleModal(false);
              }}
              className="mt-4 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Número de Unidad <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickUnitNumber}
                  onChange={(e) => setQuickUnitNumber(e.target.value)}
                  placeholder="Ej: UN-01, BUS-10, VAN-03"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Placa / Matrícula
                  </label>
                  <input
                    type="text"
                    value={quickLicensePlate}
                    onChange={(e) => setQuickLicensePlate(e.target.value)}
                    placeholder="Ej: ABC-123"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Capacidad (Pasajeros)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={quickCapacity}
                    onChange={(e) => setQuickCapacity(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tipo de Vehículo</label>
                  <select
                    value={quickType}
                    onChange={(e) => setQuickType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="Autobús">Autobús</option>
                    <option value="Minibús">Minibús</option>
                    <option value="Van">Van</option>
                    <option value="Microbús">Microbús</option>
                    <option value="Camioneta">Camioneta</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Marca / Modelo</label>
                  <input
                    type="text"
                    value={quickModel}
                    onChange={(e) => setQuickModel(e.target.value)}
                    placeholder="Ej: Mercedes-Benz, Toyota"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-lg shadow-amber-500/20"
                >
                  Guardar Unidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for setting Inoperative or Observation */}
      {editingUnitId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                    modalTargetStatus === 'INOPERATIVA'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Registrar Unidad {modalTargetStatus === 'INOPERATIVA' ? 'Inoperativa' : 'En Observación'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Unidad: <b className="text-amber-400">{vehicles.find(v => v.id === editingUnitId)?.unitNumber}</b> • Fecha: {formatDate(selectedDate)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingUnitId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Motivo de Inoperatividad / Síntoma de Falla <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Ej: Falla en bomba de agua, pérdida de refrigerante y recalentamiento..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observaciones internas de patio
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Ej: Chofer reportó al llegar a patio. Unidad remolcada."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* Maintenance Ticket Creation options */}
              {modalTargetStatus === 'INOPERATIVA' && (
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="createTicketCheck"
                      checked={shouldCreateTicket}
                      onChange={(e) => setShouldCreateTicket(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                    />
                    <label htmlFor="createTicketCheck" className="text-xs font-bold text-amber-300 cursor-pointer">
                      Generar Orden de Trabajo / Reporte de Falla de Taller
                    </label>
                  </div>
                  <p className="text-[11px] text-slate-400 pl-6">
                    Inicia el cronómetro de tiempo fuera de servicio (Downtime) y asigna el caso al taller mecánico.
                  </p>

                  {shouldCreateTicket && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Categoría de Falla
                        </label>
                        <select
                          value={ticketCategory}
                          onChange={(e) => setTicketCategory(e.target.value as FailureCategory)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        >
                          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Severidad / Prioridad
                        </label>
                        <select
                          value={ticketPriority}
                          onChange={(e) => setTicketPriority(e.target.value as FailurePriority)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                        >
                          <option value="CRITICA">Crítica (Parada Inmediata)</option>
                          <option value="ALTA">Alta</option>
                          <option value="MEDIA">Media</option>
                          <option value="BAJA">Baja</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Taller Mecánico / Especialista asignado
                        </label>
                        <input
                          type="text"
                          value={mechanicInput}
                          onChange={(e) => setMechanicInput(e.target.value)}
                          placeholder="Ej: Taller Mecánico Central / Técnico Antonio"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUnitId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
                >
                  Guardar Estatus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Vehicle Photo Modal */}
      {photoModalVehicle && (
        <VehiclePhotoModal
          vehicle={photoModalVehicle}
          onClose={() => setPhotoModalVehicle(null)}
          onSavePhoto={(vehId, photoUrl) => {
            updateVehiclePhoto(vehId, photoUrl);
            setPhotoModalVehicle(null);
          }}
        />
      )}

      {/* Vehicle Dossier Modal */}
      {selectedDossierVehicle && (
        <VehicleDossierModal
          vehicle={selectedDossierVehicle}
          onClose={() => setSelectedDossierVehicle(null)}
          onSelectVehicle={(v) => setSelectedDossierVehicle(v)}
          onOpenPhotoModal={(v) => {
            setSelectedDossierVehicle(null);
            setPhotoModalVehicle(v);
          }}
          onReportFailure={(uId) => {
            setSelectedDossierVehicle(null);
            onGoToMaintenance(uId);
          }}
        />
      )}

      {/* Quick Driver Assignment Modal */}
      {assigningDriverVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Asignar Chofer • {assigningDriverVehicle.unitNumber}
                </h3>
              </div>
              <button
                onClick={() => setAssigningDriverVehicle(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!modalDriverName.trim()) return;
                assignDriverToUnit(
                  assigningDriverVehicle.id,
                  modalDriverName.trim(),
                  selectedDate,
                  modalDriverShift,
                  modalDriverRoute,
                  modalDriverNotes
                );
                setAssigningDriverVehicle(null);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Unidad & Fecha:
                </span>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between font-bold text-white">
                  <span>{assigningDriverVehicle.unitNumber} ({assigningDriverVehicle.licensePlate})</span>
                  <span className="text-amber-400 text-xs font-mono">{formatDate(selectedDate)}</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Chofer Encargado:
                </label>
                <select
                  value={modalDriverName}
                  onChange={(e) => setModalDriverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400 cursor-pointer mb-2"
                >
                  <option value="">-- Seleccionar Chofer Registrado --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.fullName}>
                      {d.fullName} ({d.status || 'Activo'})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="O escribe un nuevo nombre de chofer..."
                  value={modalDriverName}
                  onChange={(e) => setModalDriverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Turno:
                </label>
                <select
                  value={modalDriverShift}
                  onChange={(e) => setModalDriverShift(e.target.value as ShiftType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="COMPLETO">COMPLETO (Jornada Regular)</option>
                  <option value="MANANA">MAÑANA</option>
                  <option value="TARDE">TARDE</option>
                  <option value="NOCHE">NOCHE</option>
                  <option value="ESPECIAL">ESPECIAL (Traslados cortos / tripulación)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Ruta / Asignación Operativa:
                </label>
                <input
                  type="text"
                  value={modalDriverRoute}
                  onChange={(e) => setModalDriverRoute(e.target.value)}
                  placeholder="Ej. Ruta Regular, Estación Maracay, Traslados cortos..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAssigningDriverVehicle(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!modalDriverName.trim()}
                  className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  Guardar para este Día
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
