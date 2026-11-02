import React, { useState } from 'react';
import { 
  Bus, 
  X, 
  Wrench, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  FileText, 
  UserCheck, 
  Fuel, 
  Calendar, 
  ShieldAlert, 
  Printer, 
  PlusCircle, 
  ExternalLink,
  ChevronRight,
  Gauge,
  Sliders,
  CheckCircle,
  Tag
} from 'lucide-react';
import { Vehicle, MaintenanceReport, DailyDriverAssignment, DailyVehicleStatus } from '../types/fleet';
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

interface UnitDossierModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  statusObj?: DailyVehicleStatus;
  assignment?: DailyDriverAssignment;
  reports: MaintenanceReport[];
  selectedDate: string;
  onOpenPhotoModal?: (vehicle: Vehicle) => void;
  onNewReportForUnit?: (vehicle: Vehicle) => void;
  onGoToAssignments?: (unitId: string) => void;
}

export const UnitDossierModal: React.FC<UnitDossierModalProps> = ({
  vehicle,
  onClose,
  statusObj,
  assignment,
  reports,
  selectedDate,
  onOpenPhotoModal,
  onNewReportForUnit,
  onGoToAssignments,
}) => {
  const [filterType, setFilterType] = useState<'TODAS' | 'ACTIVAS' | 'RESUELTAS'>('TODAS');

  // Filter and sort reports for this vehicle (most recent first)
  const unitReports = reports
    .filter(r => r.unitId === vehicle.id || r.unitNumber.toLowerCase() === vehicle.unitNumber.toLowerCase())
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());

  const activeReports = unitReports.filter(r => r.status !== 'SOLUCIONADO');
  const resolvedReports = unitReports.filter(r => r.status === 'SOLUCIONADO');

  const displayedReports = filterType === 'TODAS'
    ? unitReports
    : filterType === 'ACTIVAS'
    ? activeReports
    : resolvedReports;

  const currentStatus = statusObj?.status || 'OPERATIVA';
  const isInoperative = currentStatus === 'INOPERATIVA';
  const isObservation = currentStatus === 'EN_OBSERVACION';
  const statusCfg = OPERATIONAL_STATUS_CONFIG[currentStatus];

  const inopCalc = calculateInoperativeDays(
    statusObj?.inoperativeSince || vehicle.inoperativeSince || statusObj?.reason || vehicle.notes,
    selectedDate
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in duration-200">
        
        {/* Top Header / Action Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>Ficha Técnica y Expediente: {vehicle.unitNumber}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {vehicle.licensePlate}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Historial técnico de fallas, telemetría y especificaciones de flota
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
              title="Imprimir Ficha de Unidad"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Imprimir Ficha</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Main Hero Card: Photo + Specs + Current Status */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center md:items-start gap-6">
            
            {/* Left: Unit Official Transparent Photo */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-44 h-36 rounded-2xl bg-slate-900 border border-slate-800 p-2 flex items-center justify-center overflow-hidden shadow-inner relative group">
                <img 
                  src={vehicle.photoUrl || getUnitDefaultPhoto(vehicle.unitNumber)} 
                  alt={vehicle.unitNumber}
                  className="max-h-full max-w-full object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {onOpenPhotoModal && (
                <button
                  onClick={() => onOpenPhotoModal(vehicle)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 hover:underline transition pt-1 print:hidden"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cambiar / Editar Foto</span>
                </button>
              )}
            </div>

            {/* Right: Technical Specs & Status Summary */}
            <div className="flex-1 space-y-4 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black text-white">{vehicle.unitNumber}</h1>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                      {vehicle.licensePlate}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                      {vehicle.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">{vehicle.model}</p>
                </div>

                {/* Status Badge */}
                <div className="flex flex-col sm:items-end gap-1">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusCfg.badge}`}>
                    <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor} animate-pulse`} />
                    {statusCfg.label}
                  </span>
                  {isInoperative && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono animate-pulse">
                      <Clock className="w-3 h-3 text-rose-400" />
                      {inopCalc.formatted} inoperativa
                    </span>
                  )}
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Capacidad</span>
                  <span className="text-slate-200 font-bold text-xs">{vehicle.capacity} pasajeros</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Año Modelo</span>
                  <span className="text-slate-200 font-bold text-xs">{vehicle.year}</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Combustible</span>
                  <span className="text-slate-200 font-bold text-xs flex items-center gap-1">
                    <Fuel className="w-3 h-3 text-amber-400" />
                    {vehicle.fuelType}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">Kilometraje</span>
                  <span className="text-slate-200 font-mono font-bold text-xs">{vehicle.mileage.toLocaleString()} km</span>
                </div>
              </div>

              {/* Inoperative / Observation Alert Banner */}
              {isInoperative && (
                <div className="bg-gradient-to-r from-rose-950 via-rose-900/40 to-slate-950 border border-rose-700/60 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-500/25 text-rose-300">
                        <Clock className="w-4 h-4 text-rose-400" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-black tracking-wider text-rose-300/80 block">
                          Parada Técnica Prolongada
                        </span>
                        <span className="text-sm font-black text-rose-200">
                          {inopCalc.days} días fuera de servicio ({inopCalc.days * 24} hrs acumuladas)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Fecha de Inicio
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {inopCalc.startDateFriendly}
                      </span>
                    </div>
                  </div>
                  <p className="text-rose-200 text-xs italic pl-8">
                    "{statusObj?.reason || vehicle.notes || 'Ruido en motor o componentes críticos en taller.'}"
                  </p>
                </div>
              )}

              {isObservation && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-bold text-amber-300 block">
                      Operativa con Condiciones Técnicas Especiales:
                    </span>
                    <p className="text-amber-200/90 text-xs italic mt-0.5">
                      "{statusObj?.reason || vehicle.notes || 'Disponible solo para traslados cortos / tripulación.'}"
                    </p>
                  </div>
                </div>
              )}

              {/* Assigned Driver on active date */}
              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserCheck className={`w-4 h-4 ${assignment ? 'text-blue-400' : 'text-slate-600'}`} />
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Operador Asignado al {formatDate(selectedDate)}:
                    </span>
                    {assignment ? (
                      <div>
                        <span className="font-bold text-slate-200 text-xs">
                          {assignment.driverName}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          • {assignment.route} ({assignment.shift})
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic text-xs">
                        {isInoperative ? 'No disponible para asignación (En Taller)' : 'Sin chofer programado para esta fecha'}
                      </span>
                    )}
                  </div>
                </div>

                {onGoToAssignments && (
                  <button
                    onClick={() => {
                      onGoToAssignments(vehicle.id);
                      onClose();
                    }}
                    className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline shrink-0 print:hidden"
                  >
                    Ver Programación
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section: Fallas Más Recientes & Historial Técnico */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Fallas Más Recientes & Historial de Taller
                </h3>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                  {unitReports.length} {unitReports.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              {/* Filter Tabs & New Failure Action */}
              <div className="flex items-center gap-2 print:hidden">
                <div className="bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex items-center text-[10px]">
                  <button
                    onClick={() => setFilterType('TODAS')}
                    className={`px-2 py-1 rounded-md font-semibold transition ${
                      filterType === 'TODAS' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas ({unitReports.length})
                  </button>
                  <button
                    onClick={() => setFilterType('ACTIVAS')}
                    className={`px-2 py-1 rounded-md font-semibold transition ${
                      filterType === 'ACTIVAS' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    En Taller ({activeReports.length})
                  </button>
                  <button
                    onClick={() => setFilterType('RESUELTAS')}
                    className={`px-2 py-1 rounded-md font-semibold transition ${
                      filterType === 'RESUELTAS' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Resueltas ({resolvedReports.length})
                  </button>
                </div>

                {onNewReportForUnit && (
                  <button
                    onClick={() => {
                      onNewReportForUnit(vehicle);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition shadow"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Reportar Falla</span>
                  </button>
                )}
              </div>
            </div>

            {/* List of Failure Reports */}
            <div className="space-y-3">
              {displayedReports.map((report, idx) => {
                const isResolved = report.status === 'SOLUCIONADO';
                const downtimeMins = isResolved
                  ? (report.downtimeMinutes ?? calculateDowntimeMinutes(report.workshopEntryDate || report.reportDate, report.solutionDate))
                  : calculateDowntimeMinutes(report.workshopEntryDate || report.reportDate, undefined, selectedDate);
                const dtFormatted = formatDowntime(downtimeMins);
                const reportInopCalc = calculateInoperativeDays(report.workshopEntryDate || report.reportDate, selectedDate);
                const priorityCfg = PRIORITY_LABELS[report.priority];
                const mntStatusCfg = MAINTENANCE_STATUS_LABELS[report.status];

                return (
                  <div
                    key={report.id}
                    className={`rounded-2xl border p-4 space-y-3 transition ${
                      !isResolved
                        ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/20 border-rose-900/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          #{report.id.toUpperCase()}
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                          {CATEGORY_LABELS[report.category]}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${priorityCfg.badge}`}>
                          {priorityCfg.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mntStatusCfg.badge}`}>
                          {mntStatusCfg.label}
                        </span>
                        {idx === 0 && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Falla Más Reciente
                          </span>
                        )}
                      </div>

                      {/* Downtime Telemetry */}
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Clock className={`w-3.5 h-3.5 ${isResolved ? 'text-emerald-400' : 'text-rose-400'}`} />
                        <span className={`font-black ${isResolved ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {!isResolved && reportInopCalc.days > 0 ? `${reportInopCalc.days} días` : dtFormatted.detailed}
                        </span>
                        <span className="text-slate-500">({dtFormatted.hoursDecimal} hrs fuera)</span>
                      </div>
                    </div>

                    {/* Description and Details */}
                    <div className="space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-slate-200 font-semibold leading-relaxed">
                          {report.description}
                        </p>
                      </div>

                      {report.diagnosticNotes && (
                        <div className="pl-5 text-slate-400 text-[11px] space-y-0.5">
                          <span className="font-bold text-slate-300 block">Diagnóstico Técnico:</span>
                          <p className="italic">{report.diagnosticNotes}</p>
                        </div>
                      )}

                      {isResolved && report.solutionActions && (
                        <div className="pl-5 text-emerald-300/90 text-[11px] pt-1">
                          <span className="font-bold block">Solución Aplicada:</span>
                          <p>{report.solutionActions}</p>
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <div>
                        Reportado por: <b className="text-slate-300">{report.reporterName}</b> el <span className="font-mono">{formatDateTime(report.reportDate)}</span>
                      </div>
                      <div>
                        Taller: <b className="text-slate-300">{report.mechanicAssigned || 'Taller Mecánico Central'}</b>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* If no reports at all */}
              {unitReports.length === 0 && (
                <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-6 text-center space-y-2">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Sin Fallas Técnicas Reportadas</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Esta unidad no cuenta con reportes de fallas activas. Se encuentra al día con sus mantenimientos preventivos y disponible para la operación.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs print:hidden">
          <span className="text-slate-500 font-mono text-[11px]">
            Expediente de Flota • TransControl Laser
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition"
          >
            Cerrar Ficha
          </button>
        </div>

      </div>
    </div>
  );
};
