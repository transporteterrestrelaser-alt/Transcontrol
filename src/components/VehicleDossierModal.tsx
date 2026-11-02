import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Bus, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  Wrench, 
  CheckCircle2, 
  AlertCircle, 
  Fuel, 
  Gauge, 
  Users, 
  Printer, 
  Camera, 
  PlusCircle, 
  FileText,
  ShieldAlert,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Vehicle, MaintenanceReport } from '../types/fleet';
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

interface VehicleDossierModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onOpenPhotoModal?: (vehicle: Vehicle) => void;
  onReportFailure?: (unitId: string) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

export const VehicleDossierModal: React.FC<VehicleDossierModalProps> = ({
  vehicle: initialVehicle,
  onClose,
  onOpenPhotoModal,
  onReportFailure,
  onSelectVehicle,
}) => {
  const { 
    vehicles,
    selectedDate, 
    getUnitStatusForDate, 
    maintenanceReports 
  } = useFleet();

  const activeVehicles = useMemo(() => vehicles.filter(v => v.active), [vehicles]);
  const [selectedId, setSelectedId] = useState<string>(initialVehicle.id);

  useEffect(() => {
    setSelectedId(initialVehicle.id);
  }, [initialVehicle.id]);

  const currentIndex = useMemo(() => {
    const idx = activeVehicles.findIndex(v => v.id === selectedId);
    return idx >= 0 ? idx : 0;
  }, [activeVehicles, selectedId]);

  const vehicle = activeVehicles[currentIndex] || initialVehicle;

  // Next / Previous vehicle navigation
  const handlePrevVehicle = () => {
    if (activeVehicles.length === 0) return;
    const prevIndex = (currentIndex - 1 + activeVehicles.length) % activeVehicles.length;
    const targetVeh = activeVehicles[prevIndex];
    setSelectedId(targetVeh.id);
    if (onSelectVehicle) onSelectVehicle(targetVeh);
  };

  const handleNextVehicle = () => {
    if (activeVehicles.length === 0) return;
    const nextIndex = (currentIndex + 1) % activeVehicles.length;
    const targetVeh = activeVehicles[nextIndex];
    setSelectedId(targetVeh.id);
    if (onSelectVehicle) onSelectVehicle(targetVeh);
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

  // Status on the currently selected date
  const statusObj = getUnitStatusForDate(vehicle.id, selectedDate);
  const statusConfig = OPERATIONAL_STATUS_CONFIG[statusObj.status];
  const isInoperative = statusObj.status === 'INOPERATIVA';
  const isObservation = statusObj.status === 'EN_OBSERVACION';

  // Inoperative calculation
  const inopCalc = calculateInoperativeDays(
    statusObj.inoperativeSince || vehicle.inoperativeSince || statusObj.reason || vehicle.notes,
    selectedDate
  );

  // All failures / maintenance tickets for this vehicle sorted by most recent
  const vehicleReports: MaintenanceReport[] = maintenanceReports
    .filter(r => r.unitId === vehicle.id || r.unitNumber.toLowerCase() === vehicle.unitNumber.toLowerCase())
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());

  const latestFailure = vehicleReports[0];

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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-4 print:max-h-none print:h-auto print:border-none print:shadow-none print:m-0 print:p-0">
        
        {/* Printable Official Document Letterhead (Visible ONLY on print) */}
        <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-4">
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

        {/* Top Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white tracking-wide">
                  Ficha Técnica: {vehicle.unitNumber}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  {vehicle.licensePlate}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${statusConfig.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} animate-pulse`} />
                  {statusConfig.label}
                </span>
                {isInoperative && inopCalc.days > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono animate-pulse">
                    <Clock className="w-3 h-3 text-rose-400" />
                    {inopCalc.formatted} fuera de servicio
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hoja de Vida y Control Técnico Operativo • LASER Airlines Flota Terrestre
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Prev / Next Vehicle Buttons */}
            <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
              <button
                onClick={handlePrevVehicle}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 shadow-sm cursor-pointer"
                title="Ver unidad anterior (o tecla ←)"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-300 px-2 py-1">
                {currentIndex + 1} de {activeVehicles.length}
              </span>
              <button
                onClick={handleNextVehicle}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 shadow-sm cursor-pointer"
                title="Ver siguiente unidad (o tecla →)"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            {/* Imprimir en PDF */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
              title="Imprimir o guardar en PDF la Ficha Técnica de esta Unidad"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir en PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Cerrar ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-300">

          {/* Section 1: Vehicle Identity & Specs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left: Photo preview and quick actions (5 cols) */}
            <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-4">
              <div>
                <div className="relative w-full h-44 rounded-xl bg-slate-900 border border-slate-800/80 p-2 flex items-center justify-center overflow-hidden group shadow-inner">
                  <img 
                    src={vehicle.photoUrl || getUnitDefaultPhoto(vehicle.unitNumber)} 
                    alt={vehicle.unitNumber} 
                    className="max-h-full max-w-full object-contain drop-shadow-md transition group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 font-bold border border-slate-800">
                    {vehicle.type}
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <span className="text-base font-extrabold text-white block">
                    {vehicle.unitNumber}
                  </span>
                  <span className="text-xs text-slate-400 block font-medium">
                    {vehicle.model}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                {onOpenPhotoModal && (
                  <button
                    onClick={() => {
                      onOpenPhotoModal(vehicle);
                      onClose();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cambiar Foto</span>
                  </button>
                )}

                {onReportFailure && (
                  <button
                    onClick={() => {
                      onReportFailure(vehicle.id);
                      onClose();
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold transition border border-rose-500/40"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reportar Falla</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Technical specifications and daily operational status (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Technical Specifications Grid */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-2.5">
                  1. Especificaciones Técnicas del Vehículo
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Capacidad:</span>
                    <span className="font-extrabold text-white text-sm flex items-center gap-1 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      {vehicle.capacity} pasajeros
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Tipo de Vehículo:</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">
                      {vehicle.type}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Año Fabricación:</span>
                    <span className="font-bold text-white text-xs mt-0.5 block">
                      {vehicle.year}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Combustible:</span>
                    <span className="font-bold text-white text-xs flex items-center gap-1 mt-0.5">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      {vehicle.fuelType}
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Kilometraje:</span>
                    <span className="font-bold text-white text-xs font-mono flex items-center gap-1 mt-0.5">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      {vehicle.mileage.toLocaleString()} km
                    </span>
                  </div>

                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Placa / Matrícula:</span>
                    <span className="font-bold text-amber-400 text-xs font-mono mt-0.5 block">
                      {vehicle.licensePlate}
                    </span>
                  </div>
                </div>

                {vehicle.notes && (
                  <p className="text-[11px] text-slate-300 italic mt-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <b className="text-slate-400 not-italic">Observación de Ficha:</b> {vehicle.notes}
                  </p>
                )}
              </div>

              {/* Current Day Operational Telemetry (Al 09/10/2026) */}
              <div className={`p-4 rounded-2xl border ${
                isInoperative 
                  ? 'bg-rose-950/30 border-rose-900/50' 
                  : isObservation 
                  ? 'bg-amber-950/30 border-amber-900/50' 
                  : 'bg-emerald-950/20 border-emerald-900/40'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    2. Estado Operativo Actual (Fecha: {formatDate(selectedDate)})
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${statusConfig.badge}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {isInoperative ? (
                  <div className="space-y-2">
                    <div className="bg-gradient-to-r from-rose-950 to-slate-950 p-2.5 rounded-xl border border-rose-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-rose-400" />
                        <div>
                          <span className="text-[10px] uppercase text-rose-300/80 font-bold block">Tiempo Fuera de Servicio:</span>
                          <span className="text-sm font-black text-rose-200">{inopCalc.days} días consecutivos</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-slate-400 font-bold block">Fecha de Parada:</span>
                        <span className="text-xs font-mono font-bold text-slate-200">{inopCalc.startDateFriendly}</span>
                      </div>
                    </div>
                    <p className="text-rose-200 text-xs italic pl-2 border-l-2 border-rose-500">
                      Motivo: "{statusObj.reason || 'Sin motivo detallado'}"
                    </p>
                  </div>
                ) : isObservation ? (
                  <div className="space-y-1">
                    <p className="text-amber-200 text-xs italic pl-2 border-l-2 border-amber-500">
                      Condición especial: "{statusObj.reason || statusObj.notes || 'Operativa con restricciones'}"
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-300 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Unidad en óptimas condiciones para traslados y rutas regulares.</span>
                  </div>
                )}

              </div>

            </div>
          </div>

          {/* Section 2: Fallas Más Recientes & Historial Técnico (KEY USER REQUIREMENT) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    3. Fallas Más Recientes & Historial de Mantenimiento
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Registro cronológico de reportes de fallas, taller asignado y diagnósticos de la unidad
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300 self-start sm:self-auto">
                {vehicleReports.length} {vehicleReports.length === 1 ? 'reporte registrado' : 'reportes registrados'}
              </span>
            </div>

            {/* List of Failure Reports for this Unit */}
            {vehicleReports.length > 0 ? (
              <div className="space-y-3">
                {vehicleReports.map((report, idx) => {
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
                      className={`p-4 rounded-2xl border transition-all ${
                        isLatest && !isResolved
                          ? 'bg-rose-950/20 border-rose-800/60 shadow-md'
                          : isResolved
                          ? 'bg-slate-900/90 border-slate-800/80'
                          : 'bg-slate-900/90 border-amber-800/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isLatest && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                              Falla Más Reciente
                            </span>
                          )}
                          <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {CATEGORY_LABELS[report.category] || report.category}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityCfg.badge}`}>
                            {priorityCfg.label}
                          </span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.badge}`}>
                            {statusCfg.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>Reportado: {formatDateTime(report.reportDate)}</span>
                        </div>
                      </div>

                      {/* Failure Description & Findings */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-3 text-xs">
                        <div className="md:col-span-8 space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Descripción de la Falla:
                          </span>
                          <p className="text-slate-200 font-medium leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                            {report.description}
                          </p>

                          {report.diagnosticNotes && (
                            <p className="text-[11px] text-slate-300 italic pl-3 border-l-2 border-amber-500/60">
                              <b>Diagnóstico Técnico:</b> {report.diagnosticNotes}
                            </p>
                          )}

                          {report.solutionActions && (
                            <p className="text-[11px] text-emerald-300/90 pl-3 border-l-2 border-emerald-500/60">
                              <b>Trabajo / Solución Ejecutada:</b> {report.solutionActions}
                            </p>
                          )}

                          {report.partsReplaced && (
                            <p className="text-[11px] text-blue-300/90 pl-3 border-l-2 border-blue-500/60">
                              <b>Repuestos Reemplazados:</b> {report.partsReplaced}
                            </p>
                          )}
                        </div>

                        {/* Right workshop & downtime details */}
                        <div className="md:col-span-4 bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-2">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Taller / Responsable:</span>
                            <span className="font-bold text-slate-200 text-xs block">
                              {report.mechanicAssigned || 'Taller Central'}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tiempo Fuera de Servicio:</span>
                            <span className={`font-extrabold text-xs block ${isResolved ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {!isResolved && reportInop.days > 0 ? `${reportInop.days} días (${dt.detailed})` : dt.detailed}
                            </span>
                          </div>

                          {report.solutionDate && (
                            <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-emerald-400 font-medium">
                              Solucionado el: {formatDate(report.solutionDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white mb-1">Sin fallas mecánicas registradas</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Esta unidad se encuentra al día con sus mantenimientos y no cuenta con reportes de averías activos.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Ficha de Unidad • Sistema de Transporte Terrestre LASER Airlines
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition"
          >
            Cerrar Ficha
          </button>
        </div>

      </div>
    </div>
  );
};
