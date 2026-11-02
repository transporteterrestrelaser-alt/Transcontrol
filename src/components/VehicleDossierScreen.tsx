import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bus, 
  ArrowLeft, 
  Wrench, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  FileText, 
  Fuel, 
  Calendar, 
  ShieldAlert, 
  Printer, 
  PlusCircle, 
  ChevronLeft,
  ChevronRight,
  Gauge,
  Users,
  AlertCircle,
  Tag,
  Share2,
  RefreshCw,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { Vehicle, MaintenanceReport, UnitOperationalStatus, FailureCategory, FailurePriority } from '../types/fleet';
import { useFleet } from '../context/FleetContext';
import { 
  formatDate, 
  formatDateTime, 
  formatDowntime, 
  calculateDowntimeMinutes, 
  calculateInoperativeDays,
  CATEGORY_LABELS, 
  PRIORITY_LABELS, 
  MAINTENANCE_STATUS_LABELS,
  OPERATIONAL_STATUS_CONFIG 
} from '../utils/timeUtils';
import { getUnitDefaultPhoto } from '../utils/imageUtils';
import { VehiclePhotoModal } from './VehiclePhotoModal';

interface VehicleDossierScreenProps {
  initialVehicleId?: string;
  onBack: () => void;
  onGoToMaintenance?: (unitNumber?: string) => void;
}

export const VehicleDossierScreen: React.FC<VehicleDossierScreenProps> = ({
  initialVehicleId,
  onBack,
  onGoToMaintenance,
}) => {
  const { 
    vehicles, 
    selectedDate, 
    getUnitStatusForDate, 
    maintenanceReports,
    updateVehiclePhoto,
    setUnitStatus,
    addMaintenanceReport,
    updateVehicle
  } = useFleet();

  const activeVehicles = useMemo(() => vehicles.filter(v => v.active), [vehicles]);

  // Current selected vehicle on screen
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialVehicleId && activeVehicles.some(v => v.id === initialVehicleId)) {
      return initialVehicleId;
    }
    return activeVehicles[0]?.id || '';
  });

  // Keep track of external initialVehicleId changes without overriding internal navigation
  const prevInitialIdRef = useRef(initialVehicleId);
  useEffect(() => {
    if (initialVehicleId && initialVehicleId !== prevInitialIdRef.current) {
      prevInitialIdRef.current = initialVehicleId;
      if (activeVehicles.some(v => v.id === initialVehicleId)) {
        setSelectedId(initialVehicleId);
      }
    }
  }, [initialVehicleId, activeVehicles]);

  const [photoModalVehicle, setPhotoModalVehicle] = useState<Vehicle | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');

  // Status modal state
  const [modalTargetStatus, setModalTargetStatus] = useState<UnitOperationalStatus>('INOPERATIVA');
  const [reasonInput, setReasonInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  // Failure modal state
  const [failureCategory, setFailureCategory] = useState<FailureCategory>('MECANICA');
  const [failurePriority, setFailurePriority] = useState<FailurePriority>('ALTA');
  const [failureDescription, setFailureDescription] = useState('');
  const [failureDiagnostic, setFailureDiagnostic] = useState('');
  const [failureMechanic, setFailureMechanic] = useState('Taller Central');

  const currentVehicleIndex = useMemo(() => {
    const idx = activeVehicles.findIndex(v => v.id === selectedId);
    return idx >= 0 ? idx : 0;
  }, [activeVehicles, selectedId]);

  const vehicle = activeVehicles[currentVehicleIndex] || activeVehicles[0];

  // Next / Previous navigation handlers (cycles through all active units)
  const handlePrevVehicle = () => {
    if (activeVehicles.length === 0) return;
    const prevIndex = (currentVehicleIndex - 1 + activeVehicles.length) % activeVehicles.length;
    const nextVeh = activeVehicles[prevIndex];
    if (nextVeh) {
      prevInitialIdRef.current = nextVeh.id;
      setSelectedId(nextVeh.id);
    }
  };

  const handleNextVehicle = () => {
    if (activeVehicles.length === 0) return;
    const nextIndex = (currentVehicleIndex + 1) % activeVehicles.length;
    const nextVeh = activeVehicles[nextIndex];
    if (nextVeh) {
      prevInitialIdRef.current = nextVeh.id;
      setSelectedId(nextVeh.id);
    }
  };

  const handleSelectVehicleId = (id: string) => {
    prevInitialIdRef.current = id;
    setSelectedId(id);
  };

  // Keyboard navigation: Left Arrow (←) for previous, Right Arrow (→) for next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        handlePrevVehicle();
      } else if (e.key === 'ArrowRight') {
        handleNextVehicle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!vehicle) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Bus className="w-12 h-12 mx-auto mb-3 text-slate-600" />
        <p className="text-lg font-bold">No se encontraron vehículos disponibles.</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl"
        >
          Volver a Capacidad Operativa
        </button>
      </div>
    );
  }

  // Status on selected date
  const statusObj = getUnitStatusForDate(vehicle.id, selectedDate);
  const statusConfig = OPERATIONAL_STATUS_CONFIG[statusObj.status];
  const isOperative = statusObj.status === 'OPERATIVA';
  const isInoperative = statusObj.status === 'INOPERATIVA';
  const isObservation = statusObj.status === 'EN_OBSERVACION';

  // Inoperative calculation
  const inopCalc = calculateInoperativeDays(
    statusObj.inoperativeSince || vehicle.inoperativeSince || statusObj.reason || vehicle.notes,
    selectedDate
  );

  // All reports for this unit sorted newest first
  const unitReports = maintenanceReports
    .filter(r => r.unitId === vehicle.id || r.unitNumber.toLowerCase() === vehicle.unitNumber.toLowerCase())
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());

  const latestReport = unitReports[0];

  // Print as PDF with clean document metadata title
  const handlePrint = () => {
    const originalTitle = document.title;
    const safeUnit = (vehicle.unitNumber || '').replace(/[^a-zA-Z0-9]/g, '_');
    const safePlate = (vehicle.licensePlate || '').replace(/[^a-zA-Z0-9]/g, '_');
    const safeDate = formatDate(selectedDate).replace(/\//g, '-');
    document.title = `Ficha_Tecnica_${safeUnit}_${safePlate}_LASER_Airlines_${safeDate}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1200);
  };

  const handleOpenStatusModal = (target: UnitOperationalStatus) => {
    setModalTargetStatus(target);
    setReasonInput(statusObj.reason || '');
    setNotesInput(statusObj.notes || '');
    setShowStatusModal(true);
  };

  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    setUnitStatus(
      vehicle.id,
      modalTargetStatus,
      reasonInput,
      notesInput,
      modalTargetStatus === 'INOPERATIVA',
      {
        description: reasonInput || `Unidad ${vehicle.unitNumber} declarada inoperativa en taller.`,
        category: 'MECANICA',
        priority: 'ALTA',
        status: 'EN_TALLER'
      }
    );
    setShowStatusModal(false);
  };

  const handleCreateFailureReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!failureDescription.trim()) return;

    addMaintenanceReport({
      unitId: vehicle.id,
      unitNumber: vehicle.unitNumber,
      licensePlate: vehicle.licensePlate,
      reporterName: 'Supervisor de Flota',
      category: failureCategory,
      priority: failurePriority,
      status: 'EN_TALLER',
      description: failureDescription.trim(),
      diagnosticNotes: failureDiagnostic.trim() || undefined,
      mechanicAssigned: failureMechanic.trim() || 'Taller Central',
      reportDate: new Date().toISOString(),
      workshopEntryDate: new Date().toISOString(),
    });

    // Also mark inoperative if high or critical
    if (failurePriority === 'CRITICA' || failurePriority === 'ALTA') {
      setUnitStatus(
        vehicle.id,
        'INOPERATIVA',
        failureDescription.trim(),
        failureDiagnostic.trim() || undefined
      );
    }

    setFailureDescription('');
    setFailureDiagnostic('');
    setShowFailureModal(false);
  };

  const handleSaveNotes = () => {
    updateVehicle(vehicle.id, { notes: notesDraft.trim() });
    setEditingNotes(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 print:p-0 print:m-0 print:space-y-4">
      {/* Printable Official Document Letterhead (Visible ONLY on print) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-500 block">
              LASER AIRLINES • GERENCIA DE OPERACIONES TERRESTRES
            </span>
            <h1 className="text-xl font-black uppercase text-slate-950 tracking-tight mt-0.5">
              EXPEDIENTE TÉCNICO Y FICHA DE HOJA DE VIDA DE UNIDAD
            </h1>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">
              Control Integral de Flota, Especificaciones Técnicas, Diagnósticos y Fallas Recientes
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">FECHA DE EMISIÓN:</span>
            <span className="text-sm font-black font-mono text-slate-950">{formatDate(selectedDate)}</span>
            <span className="text-[11px] font-bold text-amber-700 block mt-0.5">{vehicle.unitNumber} • {vehicle.licensePlate}</span>
          </div>
        </div>
      </div>

      {/* Top Header / Unit Switcher Toolbar (Hidden on print) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Back button & Breadcrumb */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 hover:border-slate-600 shadow-sm"
              title="Volver a la vista de Capacidad Operativa Diaria"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Volver a Capacidad Operativa</span>
            </button>

            <div className="hidden sm:block text-xs">
              <span className="text-slate-500">Módulo Principal /</span>
              <span className="text-amber-400 font-bold ml-1">Ficha Técnica: {vehicle.unitNumber}</span>
            </div>
          </div>

          {/* Quick Prev / Next Arrows */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={handlePrevVehicle}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 hover:border-slate-600 shadow-sm"
              title="Ver unidad anterior"
            >
              <ChevronLeft className="w-4 h-4 text-amber-400" />
              <span>Anterior</span>
            </button>
            <span className="text-xs font-mono font-bold text-slate-300 px-2 py-1 rounded bg-slate-950 border border-slate-800">
              {currentVehicleIndex + 1} de {activeVehicles.length}
            </span>
            <button
              onClick={handleNextVehicle}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 hover:border-slate-600 shadow-sm"
              title="Ver siguiente unidad"
            >
              <span>Siguiente</span>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>

            {/* Prominent Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/20 ml-2 cursor-pointer active:scale-95"
              title="Imprimir o guardar en PDF la Ficha Técnica de esta Unidad"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir en PDF</span>
            </button>
          </div>
        </div>

        {/* Units Switcher Ribbon: Click any unit to see its screen */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase font-bold text-slate-300 tracking-wider flex items-center gap-1.5">
              <Bus className="w-3.5 h-3.5 text-amber-400" />
              <span>Cambiar de Ficha entre Vehículos:</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Haz clic en cualquier unidad o usa las flechas [← / →] del teclado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {activeVehicles.map(v => {
              const st = getUnitStatusForDate(v.id, selectedDate);
              const isSelected = v.id === vehicle.id;
              const isOp = st.status === 'OPERATIVA';
              const isInop = st.status === 'INOPERATIVA';

              return (
                <button
                  key={v.id}
                  onClick={() => handleSelectVehicleId(v.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/40'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/60'
                  }`}
                  title={`Ver ficha completa de ${v.unitNumber}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs block group-hover:text-amber-300 transition">
                      {v.unitNumber}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      isOp ? 'bg-emerald-400 animate-pulse' : isInop ? 'bg-rose-500' : 'bg-amber-400'
                    }`} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] mt-1 text-slate-400">
                    <span className="font-mono">{v.licensePlate}</span>
                    <span className={`font-semibold ${isOp ? 'text-emerald-400' : isInop ? 'text-rose-400' : 'text-amber-400'}`}>
                      {isOp ? 'Operativa' : isInop ? 'En Taller' : 'Observación'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>


      {/* Main Screen Layout for Current Unit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Visual Unit Profile & Quick Status (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Unit Photo & Identity Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
            {/* Top status banner badge */}
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${statusConfig.badge}`}>
                <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor} animate-pulse`} />
                {statusConfig.label}
              </span>

              <button
                onClick={() => setPhotoModalVehicle(vehicle)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700"
                title="Cambiar o editar fotografía de la unidad"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Foto</span>
              </button>
            </div>

            {/* Photo Container */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group shadow-inner">
              <img
                src={vehicle.photoUrl || getUnitDefaultPhoto(vehicle.unitNumber)}
                alt={`Unidad ${vehicle.unitNumber}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white font-mono bg-slate-950/75 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-800">
                <span>{vehicle.model}</span>
                <span className="font-bold text-amber-400">Año {vehicle.year}</span>
              </div>
            </div>

            {/* Unit Headline */}
            <div className="mt-4 text-center">
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
                <Bus className="w-6 h-6 text-amber-400" />
                <span>{vehicle.unitNumber}</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Placa: <b className="text-slate-200">{vehicle.licensePlate}</b> • {vehicle.type}
              </p>
            </div>

            {/* Capacity Contribution Pill */}
            <div className={`mt-4 p-3 rounded-2xl border text-center ${
              isOperative 
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                : isInoperative
                ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
            }`}>
              <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
                Aporte a Capacidad Operativa Diaria:
              </span>
              <span className="text-sm font-black mt-0.5 block">
                {isOperative 
                  ? '1 UNIDAD ACTIVA (100% DISPONIBLE)'
                  : isInoperative
                  ? '0 UNIDADES (DETENIDA EN TALLER)'
                  : '1 UNIDAD CONDICIONAL (RESTRINGIDA)'}
              </span>
              <span className="text-[11px] opacity-90 mt-0.5 block">
                Capacidad nominal de puestos: <b>{vehicle.capacity} pasajeros</b>
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-4 grid grid-cols-2 gap-2 print:hidden">
              <button
                onClick={() => setShowFailureModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold transition border border-rose-500/40"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Reportar Falla</span>
              </button>

              <button
                onClick={() => handleOpenStatusModal(isOperative ? 'INOPERATIVA' : 'OPERATIVA')}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Cambiar Estatus</span>
              </button>
            </div>
          </div>

          {/* Service Condition & Fleet Contribution Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Condición de Servicio</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {formatDate(selectedDate)}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400">Capacidad Transporte:</span>
                <span className="font-extrabold text-white">{vehicle.capacity} puestos</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400">Combustible:</span>
                <span className="font-bold text-amber-300">{vehicle.fuelType}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-slate-400">Aporte a Capacidad:</span>
                <span className={`font-black ${isOperative || isObservation ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isOperative ? '100% Activa (1 unidad)' : isObservation ? 'Condicional (1 unidad)' : 'Fuera de Servicio (0)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Specifications, Operational State & Recent Failures (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Section 1: Características Completas del Vehículo */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  1. Características Técnicas del Vehículo
                </h2>
              </div>
              <span className="text-[11px] font-bold text-slate-400 font-mono">
                Expediente: EXP-{vehicle.unitNumber.replace(/\s+/g, '')}
              </span>
            </div>

            {/* Technical Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Capacidad Pasajeros:</span>
                <span className="font-extrabold text-white text-base flex items-center gap-1.5 mt-1">
                  <Users className="w-4 h-4 text-amber-400" />
                  {vehicle.capacity} puestos
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Tipo de Unidad:</span>
                <span className="font-bold text-white text-sm mt-1 block">
                  {vehicle.type}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Año de Fabricación:</span>
                <span className="font-bold text-white text-sm mt-1 block">
                  {vehicle.year}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Combustible:</span>
                <span className="font-bold text-white text-sm flex items-center gap-1.5 mt-1">
                  <Fuel className="w-4 h-4 text-amber-400" />
                  {vehicle.fuelType}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Odómetro / Kilometraje:</span>
                <span className="font-bold text-white text-sm font-mono flex items-center gap-1.5 mt-1">
                  <Gauge className="w-4 h-4 text-blue-400" />
                  {vehicle.mileage.toLocaleString()} km
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Placa / Matrícula:</span>
                <span className="font-mono font-bold text-amber-400 text-sm mt-1 block">
                  {vehicle.licensePlate}
                </span>
              </div>
            </div>

            {/* General Technical Observations / Notes */}
            <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Observaciones Generales de la Ficha:</span>
                </span>
                {!editingNotes ? (
                  <button
                    onClick={() => {
                      setNotesDraft(vehicle.notes || '');
                      setEditingNotes(true);
                    }}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold transition"
                  >
                    Editar observaciones
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveNotes}
                      className="text-[11px] px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingNotes(false)}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {editingNotes ? (
                <textarea
                  value={notesDraft}
                  onChange={e => setNotesDraft(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Escribe observaciones permanentes de la unidad (ej: motor, caja, condiciones de carrocería)..."
                />
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                  {vehicle.notes || 'Sin observaciones permanentes registradas en la ficha.'}
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Estado Operativo Actual (Fecha Seleccionada) */}
          <div className={`rounded-3xl p-5 sm:p-6 border shadow-xl ${
            isInoperative 
              ? 'bg-rose-950/20 border-rose-900/60' 
              : isObservation 
              ? 'bg-amber-950/20 border-amber-900/60' 
              : 'bg-emerald-950/15 border-emerald-900/50'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
              <span className="text-xs font-black uppercase text-slate-300 tracking-wider">
                2. Condición Operativa al Día ({formatDate(selectedDate)})
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${statusConfig.badge}`}>
                {statusConfig.label}
              </span>
            </div>

            {isInoperative ? (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-rose-950/90 to-slate-950 p-3.5 rounded-2xl border border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/25 text-rose-300">
                      <Clock className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-300 block tracking-wider">
                        Días Consecutivos Fuera de Servicio:
                      </span>
                      <span className="text-lg font-black text-rose-200">
                        {inopCalc.days} días consecutivos
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-slate-900/80 p-2 sm:p-0 rounded-lg sm:bg-transparent">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Fecha de Detención:
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {inopCalc.startDateFriendly}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-rose-950/40 rounded-xl border border-rose-800/40">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">
                    Motivo de Inoperatividad Reportado:
                  </span>
                  <p className="text-xs text-rose-200 font-medium">
                    "{statusObj.reason || 'Sin motivo especificado en el registro diario.'}"
                  </p>
                </div>
              </div>
            ) : isObservation ? (
              <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/40 space-y-1">
                <span className="text-[10px] uppercase font-bold text-amber-400 block">
                  Condición Técnica Especial / Observación:
                </span>
                <p className="text-xs text-amber-200 font-medium">
                  "{statusObj.reason || statusObj.notes || 'Operativa con restricciones preventivas en ruta.'}"
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-emerald-950/30 rounded-xl border border-emerald-800/40 text-emerald-300 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold block">Unidad al 100% de Capacidad Operativa</span>
                  <span className="text-slate-300 text-[11px]">
                    Sin fallas críticas reportadas. Apta para cumplimiento de rutas y traslados de personal.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Fallas Más Recientes & Historial Técnico (KEY USER REQUIREMENT) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    3. Fallas Más Recientes & Historial de Taller
                  </h3>
                  <span className="text-[11px] text-slate-400 block">
                    Detalle cronológico de novedades, diagnósticos, trabajos realizados y tiempo fuera de servicio
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-bold text-slate-300 print:border-slate-300 print:text-slate-800">
                  {unitReports.length} {unitReports.length === 1 ? 'reporte' : 'reportes'}
                </span>
                <button
                  onClick={() => setShowFailureModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-sm print:hidden"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Nuevo Reporte</span>
                </button>
              </div>
            </div>

            {/* If there are reports for this unit */}
            {unitReports.length > 0 ? (
              <div className="space-y-4">
                {unitReports.map((report, idx) => {
                  const isResolved = report.status === 'SOLUCIONADO';
                  const isLatest = idx === 0;
                  const downtimeMins = isResolved
                    ? (report.downtimeMinutes ?? calculateDowntimeMinutes(report.workshopEntryDate || report.reportDate, report.solutionDate))
                    : calculateDowntimeMinutes(report.workshopEntryDate || report.reportDate, undefined, selectedDate);
                  
                  const dt = formatDowntime(downtimeMins);
                  const reportInop = calculateInoperativeDays(report.workshopEntryDate || report.reportDate, selectedDate);
                  const priorityCfg = PRIORITY_LABELS[report.priority];
                  const statusCfg = MAINTENANCE_STATUS_LABELS[report.status];

                  return (
                    <div 
                      key={report.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isLatest && !isResolved
                          ? 'bg-rose-950/20 border-rose-700/60 shadow-lg'
                          : isLatest && isResolved
                          ? 'bg-slate-950 border-amber-500/40'
                          : 'bg-slate-950/80 border-slate-800/80'
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isLatest && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                              ★ Falla Más Reciente
                            </span>
                          )}
                          <span className="text-xs font-bold text-white px-2.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {CATEGORY_LABELS[report.category] || report.category}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityCfg.badge}`}>
                            {priorityCfg.label}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.badge}`}>
                            {statusCfg.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-xs">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>{formatDateTime(report.reportDate)}</span>
                        </div>
                      </div>

                      {/* Ticket Body: Failure Details */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-3 text-xs">
                        
                        {/* Main Description & Diagnostics (8 cols) */}
                        <div className="md:col-span-8 space-y-2.5">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Descripción de la Falla:
                            </span>
                            <p className="text-slate-200 font-medium leading-relaxed bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                              {report.description}
                            </p>
                          </div>

                          {report.diagnosticNotes && (
                            <div className="pl-3 border-l-2 border-amber-500/70 py-1">
                              <span className="text-[10px] uppercase font-bold text-amber-400 block">
                                Diagnóstico Técnico / Causa Raíz:
                              </span>
                              <p className="text-slate-300 italic text-[11px] mt-0.5">
                                {report.diagnosticNotes}
                              </p>
                            </div>
                          )}

                          {report.solutionActions && (
                            <div className="pl-3 border-l-2 border-emerald-500/70 py-1">
                              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                                Acciones Ejecutadas / Reparación:
                              </span>
                              <p className="text-emerald-300/90 text-[11px] mt-0.5">
                                {report.solutionActions}
                              </p>
                            </div>
                          )}

                          {report.partsReplaced && (
                            <div className="pl-3 border-l-2 border-blue-500/70 py-1">
                              <span className="text-[10px] uppercase font-bold text-blue-400 block">
                                Repuestos Reemplazados:
                              </span>
                              <p className="text-blue-300/90 text-[11px] mt-0.5">
                                {report.partsReplaced}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Workshop & Downtime Box (4 cols) */}
                        <div className="md:col-span-4 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800 space-y-2.5 self-start">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Mecánico / Taller Asignado:
                            </span>
                            <span className="font-bold text-slate-200 text-xs mt-0.5 block">
                              {report.mechanicAssigned || 'Taller Central'}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-800">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Tiempo Fuera de Servicio:
                            </span>
                            <span className={`font-black text-xs mt-0.5 block ${isResolved ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {!isResolved && reportInop.days > 0 
                                ? `${reportInop.days} días (${dt.detailed})` 
                                : dt.detailed}
                            </span>
                          </div>

                          {report.solutionDate && (
                            <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-bold">
                              ✓ Solucionado: {formatDate(report.solutionDate)}
                            </div>
                          )}

                          {onGoToMaintenance && (
                            <button
                              onClick={() => onGoToMaintenance(vehicle.unitNumber)}
                              className="w-full mt-2 text-center text-[11px] text-amber-400 hover:text-amber-300 font-bold py-1 rounded bg-slate-950 border border-slate-800"
                            >
                              Ver en Taller →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-950 text-center border border-slate-800">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-white">
                  Sin Fallas Recientes Registradas
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  La {vehicle.unitNumber} se encuentra en condiciones operativas óptimas sin reportes pendientes de taller.
                </p>
                <button
                  onClick={() => setShowFailureModal(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Registrar novedad para esta unidad</span>
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Bottom Floating Navigation & PDF Export Toolbar (Hidden on print) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevVehicle}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 hover:border-slate-600 shadow-sm cursor-pointer"
            title="Ver ficha de la unidad anterior (o presiona flecha izquierda ←)"
          >
            <ChevronLeft className="w-4 h-4 text-amber-400" />
            <span>Ficha Anterior</span>
          </button>
          
          <div className="text-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-xs font-mono font-bold text-amber-400 block">
              {vehicle.unitNumber}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {currentVehicleIndex + 1} de {activeVehicles.length} unidades
            </span>
          </div>

          <button
            onClick={handleNextVehicle}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 hover:border-slate-600 shadow-sm cursor-pointer"
            title="Ver ficha de la siguiente unidad (o presiona flecha derecha →)"
          >
            <span>Siguiente Ficha</span>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <span className="text-[11px] text-slate-400 hidden md:inline">
            Navegación con teclado: <b>←</b> / <b>→</b>
          </span>
          <button
            onClick={handlePrint}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 w-full sm:w-auto"
            title="Imprimir o Guardar en PDF la Ficha Técnica de esta Unidad"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir en PDF</span>
          </button>
        </div>
      </div>

      {/* Modal for Photo Upload/Change */}
      {photoModalVehicle && (
        <VehiclePhotoModal
          vehicle={photoModalVehicle}
          onClose={() => setPhotoModalVehicle(null)}
          onSavePhoto={(vid, url) => {
            updateVehiclePhoto(vid, url);
            setPhotoModalVehicle(null);
          }}
        />
      )}

      {/* Modal to Change Status */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-2">
              Cambiar Estatus Operativo: {vehicle.unitNumber}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Fecha de operación: {formatDate(selectedDate)}
            </p>

            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Nuevo Estatus:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['OPERATIVA', 'INOPERATIVA', 'EN_OBSERVACION'] as UnitOperationalStatus[]).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setModalTargetStatus(st)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                        modalTargetStatus === st
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-black'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {st === 'OPERATIVA' ? 'Operativa' : st === 'INOPERATIVA' ? 'Inoperativa' : 'Observación'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Motivo / Novedad:
                </label>
                <textarea
                  value={reasonInput}
                  onChange={e => setReasonInput(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  placeholder="Detalla la razón del cambio de estatus..."
                  required={modalTargetStatus !== 'OPERATIVA'}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
                >
                  Confirmar Estatus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal to Report Failure */}
      {showFailureModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Reportar Falla: {vehicle.unitNumber}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Registra una nueva falla técnica para incorporar a la ficha de la unidad
            </p>

            <form onSubmit={handleCreateFailureReport} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Categoría:</label>
                  <select
                    value={failureCategory}
                    onChange={e => setFailureCategory(e.target.value as FailureCategory)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    <option value="MECANICA">Mecánica General</option>
                    <option value="MOTOR">Motor / Combustión</option>
                    <option value="FRENOS">Frenos / Neumática</option>
                    <option value="ELECTRICA">Eléctrica</option>
                    <option value="TRANSMISION">Transmisión / Caja</option>
                    <option value="SUSPENSION">Suspensión / Dirección</option>
                    <option value="CARROCERIA">Carrocería / Vidrios</option>
                    <option value="CAUCHOS">Cauchos / Neumáticos</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Prioridad:</label>
                  <select
                    value={failurePriority}
                    onChange={e => setFailurePriority(e.target.value as FailurePriority)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  >
                    <option value="CRITICA">Crítica (Detiene unidad)</option>
                    <option value="ALTA">Alta (Inoperativa)</option>
                    <option value="MEDIA">Media (En observación)</option>
                    <option value="BAJA">Baja (Preventivo)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Descripción de la Falla *:</label>
                <textarea
                  value={failureDescription}
                  onChange={e => setFailureDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  placeholder="Describe detalladamente el síntoma o avería..."
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Diagnóstico Inicial (Opcional):</label>
                <textarea
                  value={failureDiagnostic}
                  onChange={e => setFailureDiagnostic(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  placeholder="Evaluación técnica previa del mecánico..."
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Mecánico / Taller Responsable:</label>
                <input
                  type="text"
                  value={failureMechanic}
                  onChange={e => setFailureMechanic(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white"
                  placeholder="Ej: Taller Central, Mecánico Jesús..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFailureModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  Registrar Falla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
