import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Bus,
  Calendar,
  FileSpreadsheet,
  Clock,
  ShieldAlert,
  Wrench,
  CheckCheck,
  FileText,
  UserCheck,
  MapPin,
  Sparkles,
  Layers
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { 
  formatDate, 
  calculateInoperativeDays
} from '../utils/timeUtils';
import { getUnitDefaultPhoto } from '../utils/imageUtils';
import { WhatsAppIcon } from './WhatsAppStatusModal';

interface DailyReportModalProps {
  onClose: () => void;
  onOpenMonthlyReport?: () => void;
  onOpenWhatsApp?: () => void;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({ 
  onClose, 
  onOpenMonthlyReport,
  onOpenWhatsApp 
}) => {
  const { 
    vehicles, 
    selectedDate, 
    getUnitStatusForDate, 
    dailyAssignments, 
    maintenanceReports, 
    metrics 
  } = useFleet();

  const [isCompactFit, setIsCompactFit] = useState(true);

  const activeVehicles = vehicles.filter(v => v.active);

  // Classify units for today
  const classifiedUnits = activeVehicles.map(veh => {
    const st = getUnitStatusForDate(veh.id, selectedDate);
    const assignment = dailyAssignments.find(a => 
      (a.unitId === veh.id || a.unitNumber.toLowerCase() === veh.unitNumber.toLowerCase()) && 
      a.date === selectedDate
    );

    // Extract operator from assignment or status
    let operatorName = assignment?.driverName || st.operatorName;
    if (!operatorName) {
      if (veh.unitNumber.includes('23')) operatorName = 'Brayan Sivira';
      else if (veh.unitNumber.includes('37')) operatorName = 'Juan Guillen';
      else if (veh.unitNumber.includes('42')) operatorName = 'Sin conductor (Inoperativa)';
      else if (veh.unitNumber.includes('43')) operatorName = 'Edgar Marín';
      else if (veh.unitNumber.includes('44')) operatorName = 'Willian Rojas';
      else if (veh.unitNumber.includes('11')) operatorName = 'Sin conductor (Inoperativa)';
    }

    const inopCalc = calculateInoperativeDays(
      st.inoperativeSince || veh.inoperativeSince || st.reason || veh.notes,
      selectedDate
    );

    return {
      vehicle: veh,
      status: st,
      assignment,
      operatorName: operatorName || 'Por asignar',
      inopCalc,
      isPureOperative: st.status === 'OPERATIVA',
      isObservation: st.status === 'EN_OBSERVACION',
      isInoperative: st.status === 'INOPERATIVA',
    };
  });

  // Groups as explicitly requested by user:
  // 1. Inoperativas
  const inoperativeUnits = classifiedUnits.filter(u => u.isInoperative);
  // 2. Con fallas / En Observación
  const observationUnits = classifiedUnits.filter(u => u.isObservation);
  // 3. Disponibles (100% Operativas)
  const availableUnits = classifiedUnits.filter(u => u.isPureOperative);

  // Capacities
  const totalFleetCapacity = activeVehicles.reduce((acc, v) => acc + (v.capacity || 0), 0);
  const availableCapacity = availableUnits.reduce((acc, u) => acc + (u.vehicle.capacity || 0), 0);
  const observationCapacity = observationUnits.reduce((acc, u) => acc + (u.vehicle.capacity || 0), 0);
  const inoperativeCapacity = inoperativeUnits.reduce((acc, u) => acc + (u.vehicle.capacity || 0), 0);
  const totalOperativeCapacity = availableCapacity + observationCapacity;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const lines: string[] = [];

    // Header info
    lines.push('TRANSPORTE TERRESTRE LASER - PARTE DIARIO OPERATIVO');
    lines.push(`Fecha de Operación,${selectedDate}`);
    lines.push(`Flota Total,${activeVehicles.length} unidades`);
    lines.push(`Disponibles (100% Operativas),${availableUnits.length} unidades`);
    lines.push(`Con Fallas (Condición Especial),${observationUnits.length} unidades`);
    lines.push(`Inoperativas (Fuera de Servicio),${inoperativeUnits.length} unidades`);
    lines.push(`Disponibilidad de Flota,${metrics.availabilityRate}%`);
    lines.push('');

    // Detailed Table
    lines.push('CLASIFICACION,UNIDAD,PLACA,TIPO,CAPACIDAD,ESTATUS,OPERADOR_ESTACION,NOVEDAD_FALLA_CONDICION,OBSERVACIONES');
    
    // 1. Inoperativas
    inoperativeUnits.forEach(u => {
      lines.push([
        'INOPERATIVA',
        `"${u.vehicle.unitNumber}"`,
        `"${u.vehicle.licensePlate}"`,
        `"${u.vehicle.type}"`,
        u.vehicle.capacity,
        'INOPERATIVA',
        `"${u.operatorName}"`,
        `"${(u.status.reason || u.vehicle.notes || '').replace(/"/g, '""')}"`,
        `"Inoperativa desde ${u.status.inoperativeSince || u.vehicle.inoperativeSince || '26/09/2025'} (${u.inopCalc.formatted})"`
      ].join(','));
    });

    // 2. Con fallas / Observacion
    observationUnits.forEach(u => {
      lines.push([
        'CON FALLAS / CONDICION ESPECIAL',
        `"${u.vehicle.unitNumber}"`,
        `"${u.vehicle.licensePlate}"`,
        `"${u.vehicle.type}"`,
        u.vehicle.capacity,
        'EN_OBSERVACION',
        `"${u.operatorName}"`,
        `"${(u.status.reason || u.vehicle.notes || '').replace(/"/g, '""')}"`,
        `"${(u.status.notes || u.vehicle.notes || '').replace(/"/g, '""')}"`
      ].join(','));
    });

    // 3. Disponibles
    availableUnits.forEach(u => {
      lines.push([
        'DISPONIBLE (OPERATIVA)',
        `"${u.vehicle.unitNumber}"`,
        `"${u.vehicle.licensePlate}"`,
        `"${u.vehicle.type}"`,
        u.vehicle.capacity,
        'OPERATIVA',
        `"${u.operatorName}"`,
        'Sin fallas activas',
        `"${(u.status.notes || u.vehicle.notes || '100% Operativa').replace(/"/g, '""')}"`
      ].join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + lines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Parte_Diario_Flota_HojaUnica_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:m-0 print:bg-white print:overflow-visible">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-2 print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:bg-white print:rounded-none">
        
        {/* Top Modal Controls Bar (Hidden in Print) */}
        <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">Parte Diario Operativo</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Formato Hoja Única
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Estatus total de flota, unidad inoperativa, con fallas y disponibles en 1 sola hoja
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMonthlyReport && (
              <button
                onClick={onOpenMonthlyReport}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition border border-amber-500/40"
                title="Ver Informe Mensual Consolidado"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Informe Mensual</span>
              </button>
            )}

            {onOpenWhatsApp && (
              <button
                onClick={onOpenWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm shadow-emerald-950/40"
                title="Generar y compartir reporte para grupo de WhatsApp"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
              title="Descargar datos del parte diario en formato CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition shadow-md shadow-amber-500/20"
              title="Imprimir documento en 1 sola hoja de papel o guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF (1 Hoja)</span>
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

        {/* Printable Document Body - Strictly Engineered to Fit Exactly on 1 Single Page */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white text-slate-900 print:p-0 print:m-0 print:overflow-visible parte-diario-hoja-unica font-sans">
          
          {/* 1. Header Oficial de Transporte */}
          <div className="border-b-2 border-slate-900 pb-2.5 mb-2.5">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                  <Bus className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-950 leading-tight">
                    TRANSPORTE TERRESTRE LASER • PARTE DIARIO OPERATIVO
                  </h1>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    CONTROL GENERAL DE CAPACIDAD OPERATIVA, NOVEDADES Y DISPONIBILIDAD DE FLOTA
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 bg-slate-50 border border-slate-300 rounded px-2.5 py-1">
                <span className="text-[9px] font-bold uppercase text-slate-500 block">FECHA DE CORTE:</span>
                <span className="text-xs sm:text-sm font-black text-slate-950 font-mono block">
                  {formatDate(selectedDate)}
                </span>
                <span className="text-[8.5px] font-semibold text-slate-500 uppercase tracking-wider">
                  Corte Diario: 06:00 - 18:00
                </span>
              </div>
            </div>
          </div>

          {/* 2. Estatus Total de Flota (Resumen Ejecutivo de Alta Densidad) */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-600" />
                <h2 className="text-[9.5px] font-black uppercase tracking-wider text-slate-800">
                  Estatus Total de la Flota (Capacidad Operativa)
                </h2>
              </div>
              <span className="text-[8px] font-extrabold text-slate-700 uppercase bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                Disponibilidad Global: <b className="text-emerald-700">{metrics.availabilityRate}%</b> ({metrics.operativeCount} de {metrics.totalActiveVehicles} unidades habilitadas)
              </span>
            </div>

            {/* 4 Indicadores en Fila Compacta Reducida */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              {/* Total Flota */}
              <div className="bg-slate-100 border border-slate-300 rounded py-1 px-1.5 shadow-2xs">
                <span className="text-[7.5px] uppercase font-bold text-slate-500 block leading-tight">Flota Total</span>
                <div className="text-xs font-black text-slate-950 leading-tight">
                  {activeVehicles.length} <span className="text-[8.5px] font-bold text-slate-600">unid.</span>
                </div>
                <span className="text-[7px] text-slate-500 font-semibold block">{totalFleetCapacity} asientos</span>
              </div>

              {/* Disponibles 100% */}
              <div className="bg-emerald-50 border border-emerald-300 rounded py-1 px-1.5 shadow-2xs">
                <span className="text-[7.5px] uppercase font-extrabold text-emerald-800 block leading-tight">Disponibles (100%)</span>
                <div className="text-xs font-black text-emerald-700 leading-tight">
                  {availableUnits.length} <span className="text-[8.5px] font-bold text-emerald-800">unid.</span>
                </div>
                <span className="text-[7px] text-emerald-800 font-semibold block">
                  {Math.round((availableUnits.length / activeVehicles.length) * 100)}% flota ({availableCapacity} as.)
                </span>
              </div>

              {/* Con Fallas / Condición */}
              <div className="bg-amber-50 border border-amber-300 rounded py-1 px-1.5 shadow-2xs">
                <span className="text-[7.5px] uppercase font-extrabold text-amber-900 block leading-tight">Con Falla / Observación</span>
                <div className="text-xs font-black text-amber-700 leading-tight">
                  {observationUnits.length} <span className="text-[8.5px] font-bold text-amber-800">unid.</span>
                </div>
                <span className="text-[7px] text-amber-800 font-semibold block">
                  {Math.round((observationUnits.length / activeVehicles.length) * 100)}% flota ({observationCapacity} as.)
                </span>
              </div>

              {/* Inoperativas */}
              <div className="bg-rose-50 border border-rose-300 rounded py-1 px-1.5 shadow-2xs">
                <span className="text-[7.5px] uppercase font-extrabold text-rose-900 block leading-tight">Inoperativas (Taller)</span>
                <div className="text-xs font-black text-rose-700 leading-tight">
                  {inoperativeUnits.length} <span className="text-[8.5px] font-bold text-rose-800">unid.</span>
                </div>
                <span className="text-[7px] text-rose-800 font-semibold block">
                  {Math.round((inoperativeUnits.length / activeVehicles.length) * 100)}% flota ({inoperativeCapacity} as.)
                </span>
              </div>
            </div>

            {/* Barra visual proporcional */}
            <div className="mt-1 flex h-1.5 rounded-full overflow-hidden border border-slate-300 bg-slate-200">
              <div 
                style={{ width: `${(availableUnits.length / activeVehicles.length) * 100}%` }} 
                className="bg-emerald-500 transition-all" 
              />
              <div 
                style={{ width: `${(observationUnits.length / activeVehicles.length) * 100}%` }} 
                className="bg-amber-500 transition-all" 
              />
              <div 
                style={{ width: `${(inoperativeUnits.length / activeVehicles.length) * 100}%` }} 
                className="bg-rose-600 transition-all" 
              />
            </div>
          </div>

          {/* 3. SECCIÓN CRÍTICA DE NOVEDADES (PARALELO EN 2 COLUMNAS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
            
            {/* Columna A: Cuál es la Unidad Inoperativa */}
            <div className="border border-rose-300 bg-rose-50/70 rounded-lg p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-rose-200">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-900">
                      Unidad Inoperativa (Fuera de Servicio)
                    </span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-200 text-rose-900 border border-rose-300">
                    {inoperativeUnits.length} Parada
                  </span>
                </div>

                {inoperativeUnits.length > 0 ? (
                  inoperativeUnits.map(u => (
                    <div key={u.vehicle.id} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <img 
                            src={u.vehicle.photoUrl || getUnitDefaultPhoto(u.vehicle.unitNumber)} 
                            alt={u.vehicle.unitNumber} 
                            className="w-5 h-5 object-contain rounded shrink-0 bg-white border border-rose-200" 
                          />
                          <span className="font-black text-rose-950 font-mono text-xs">{u.vehicle.unitNumber}</span>
                          <span className="text-[10px] font-mono text-slate-600 bg-white px-1 rounded border border-rose-200">
                            {u.vehicle.licensePlate}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-extrabold text-rose-800 bg-rose-100 px-1.5 py-0.2 rounded border border-rose-300">
                          {u.inopCalc.formatted} inoperativa
                        </span>
                      </div>

                      <div className="bg-white/80 rounded p-1.5 border border-rose-200 text-[10px] text-slate-800 space-y-0.5">
                        <p className="font-bold text-rose-900 flex items-start gap-1">
                          <span className="text-slate-500 font-semibold shrink-0">Motivo:</span>
                          <span className="font-extrabold">{u.status.reason || u.vehicle.notes || 'Ruido en motor'}</span>
                        </p>
                        <p className="text-[9.5px] text-slate-700">
                          <span className="text-slate-500 font-semibold">Inoperativa desde:</span>{' '}
                          <b className="font-mono text-rose-900">{formatDate(u.status.inoperativeSince || u.vehicle.inoperativeSince || '2025-09-26')}</b>
                          <span className="text-slate-500 ml-1">({u.inopCalc.days} días acumulados)</span>
                        </p>
                        <p className="text-[9px] text-slate-600 italic">
                          Ubicación: Taller Central / Patio Mecánico • Sin asignación de ruta
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-emerald-800 font-bold bg-white/70 p-2 rounded text-center">
                    No hay unidades inoperativas registradas en la jornada.
                  </p>
                )}
              </div>
            </div>

            {/* Columna B: Cuál es la Unidad con Fallas */}
            <div className="border border-amber-300 bg-amber-50/70 rounded-lg p-2.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-amber-200">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-950">
                      Unidad con Fallas (Condición Especial)
                    </span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                    {observationUnits.length} Habilitada Especial
                  </span>
                </div>

                {observationUnits.length > 0 ? (
                  observationUnits.map(u => (
                    <div key={u.vehicle.id} className="text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <img 
                            src={u.vehicle.photoUrl || getUnitDefaultPhoto(u.vehicle.unitNumber)} 
                            alt={u.vehicle.unitNumber} 
                            className="w-5 h-5 object-contain rounded shrink-0 bg-white border border-amber-200" 
                          />
                          <span className="font-black text-amber-950 font-mono text-xs">{u.vehicle.unitNumber}</span>
                          <span className="text-[10px] font-mono text-slate-600 bg-white px-1 rounded border border-amber-200">
                            {u.vehicle.licensePlate}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-extrabold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                          Operativa c/ Condición
                        </span>
                      </div>

                      <div className="bg-white/80 rounded p-1.5 border border-amber-200 text-[10px] text-slate-800 space-y-0.5">
                        <p className="text-[9.5px] text-slate-800">
                          <span className="text-slate-500 font-semibold">Operador asignado:</span>{' '}
                          <b className="font-extrabold text-amber-950">{u.operatorName}</b>
                        </p>
                        <p className="font-bold text-amber-950 flex items-start gap-1">
                          <span className="text-slate-500 font-semibold shrink-0">Falla:</span>
                          <span className="font-extrabold">{u.status.reason || 'Falla de Potencia'}</span>
                        </p>
                        <p className="text-[9.5px] text-amber-950 leading-snug">
                          <span className="text-slate-500 font-semibold">Condición Operativa:</span>{' '}
                          <b className="font-semibold text-amber-900">
                            {u.status.notes || u.vehicle.notes || 'Disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros'}
                          </b>
                        </p>
                        <p className="text-[9px] text-slate-600 italic">
                          Restricción: No apta para rutas largas o de alta exigencia
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-emerald-800 font-bold bg-white/70 p-2 rounded text-center">
                    No hay unidades con fallas restrictivas registradas hoy.
                  </p>
                )}
              </div>
            </div>

          </div>

          {/* 4. SECCIÓN DE UNIDADES DISPONIBLES (100% OPERATIVAS) */}
          <div className="border border-emerald-300 bg-emerald-50/60 rounded-lg p-2.5 mb-2.5">
            <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-emerald-200">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-950">
                  Unidades Disponibles (100% Operativas sin Novedades)
                </span>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-200 text-emerald-900 border border-emerald-300">
                {availableUnits.length} Unidades Disponibles ({availableCapacity} puestos)
              </span>
            </div>

            {/* 4 Cards de unidades disponibles en cuadrícula 2x2 o 4x1 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {availableUnits.map(u => (
                <div key={u.vehicle.id} className="bg-white rounded border border-emerald-200 p-1.5 text-slate-800 shadow-2xs">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-black text-emerald-950 font-mono text-xs">{u.vehicle.unitNumber}</span>
                    <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1 py-0.2 rounded border border-slate-200">
                      {u.vehicle.licensePlate}
                    </span>
                  </div>

                  <div className="text-[9.5px] space-y-0.5">
                    <p className="text-slate-600 flex items-center justify-between">
                      <span>{u.vehicle.type}</span>
                      <b className="text-slate-900 font-bold">{u.vehicle.capacity}p</b>
                    </p>
                    <p className="font-semibold text-slate-900 truncate">
                      <span className="text-slate-500 font-normal text-[8.5px]">Operador: </span>
                      <b className="text-emerald-900 font-bold">{u.operatorName}</b>
                    </p>
                    {u.vehicle.unitNumber.includes('44') && (
                      <p className="text-[8.5px] font-bold text-blue-800 bg-blue-50 px-1 rounded inline-block">
                        Estación Maracay
                      </p>
                    )}
                    {u.vehicle.unitNumber.includes('23') && (
                      <p className="text-[8.5px] font-bold text-emerald-800 bg-emerald-100/60 px-1 rounded inline-block">
                        Frenos Reparados • Operativa
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 5. MATRIZ GENERAL CONSOLIDADA DE TODA LA FLOTA (TABLA RESUMEN EN 1 VISTA) */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                Matriz Consolidada de la Flota (Detalle de cada Unidad)
              </span>
              <span className="text-[9px] text-slate-500 font-medium">
                Total Registros: {classifiedUnits.length} Unidades
              </span>
            </div>

            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left text-[9.5px] border-collapse leading-tight">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                    <th className="py-1 px-1.5 border-r border-slate-300">Unidad</th>
                    <th className="py-1 px-1.5 border-r border-slate-300">Placa</th>
                    <th className="py-1 px-1.5 border-r border-slate-300">Tipo / Cap.</th>
                    <th className="py-1 px-1.5 border-r border-slate-300">Estatus Operativo</th>
                    <th className="py-1 px-1.5 border-r border-slate-300">Operador / Base</th>
                    <th className="py-1 px-1.5">Diagnóstico Técnico / Novedades / Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {classifiedUnits.map(u => {
                    const rowBg = u.isInoperative 
                      ? 'bg-rose-50/70 font-semibold' 
                      : u.isObservation 
                        ? 'bg-amber-50/70 font-semibold' 
                        : 'hover:bg-slate-50';

                    return (
                      <tr key={u.vehicle.id} className={rowBg}>
                        <td className="py-1 px-1.5 font-bold border-r border-slate-200 font-mono text-slate-950">
                          {u.vehicle.unitNumber}
                        </td>
                        <td className="py-1 px-1.5 font-mono border-r border-slate-200 text-slate-700">
                          {u.vehicle.licensePlate}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-slate-700">
                          {u.vehicle.type} ({u.vehicle.capacity}p)
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 whitespace-nowrap">
                          {u.isInoperative && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-black bg-rose-200 text-rose-900 border border-rose-300">
                              INOPERATIVA ({u.inopCalc.formatted})
                            </span>
                          )}
                          {u.isObservation && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-black bg-amber-200 text-amber-950 border border-amber-300">
                              CON FALLA / CONDICIÓN
                            </span>
                          )}
                          {u.isPureOperative && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                              100% OPERATIVA
                            </span>
                          )}
                        </td>
                        <td className="py-1 px-1.5 border-r border-slate-200 text-slate-800">
                          <span className="font-bold">{u.operatorName}</span>
                          {u.vehicle.unitNumber.includes('44') && (
                            <span className="text-[8px] text-blue-700 font-bold ml-1">• Base Maracay</span>
                          )}
                        </td>
                        <td className="py-1 px-1.5 text-slate-800">
                          {u.isInoperative && (
                            <span className="text-rose-900">
                              <b>{u.status.reason || u.vehicle.notes || 'Ruido en motor'}</b> (Inop. desde {formatDate(u.status.inoperativeSince || u.vehicle.inoperativeSince || '2025-09-26')})
                            </span>
                          )}
                          {u.isObservation && (
                            <span className="text-amber-950">
                              <b>Falla de Potencia:</b> disponible sólo para traslados o requerimientos cortos como: tripulación, requerimientos especiales entre otros
                            </span>
                          )}
                          {u.isPureOperative && (
                            <span className="text-emerald-900">
                              {u.vehicle.unitNumber.includes('23') 
                                ? 'Sistema neumático de frenos reparado y presurizado. 100% Disponible para servicio'
                                : 'Operativa sin novedades técnicas reportadas'}
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

          {/* 6. FIRMAS Y CONTROL OPERATIVO (Pie de Documento en Hoja Única) */}
          <div className="pt-2 border-t border-slate-300 text-slate-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="px-2">
                <div className="border-t border-slate-400 w-3/4 mx-auto mb-1"></div>
                <p className="text-[9.5px] font-black text-slate-900 uppercase">Inspector de Patio / Despacho</p>
                <p className="text-[8px] text-slate-500">Recepción, Asignación y Salida</p>
              </div>
              <div className="px-2">
                <div className="border-t border-slate-400 w-3/4 mx-auto mb-1"></div>
                <p className="text-[9.5px] font-black text-slate-900 uppercase">Supervisor de Taller Mecánico</p>
                <p className="text-[8px] text-slate-500">Mantenimiento y Control Técnico</p>
              </div>
              <div className="px-2">
                <div className="border-t border-slate-400 w-3/4 mx-auto mb-1"></div>
                <p className="text-[9.5px] font-black text-slate-900 uppercase">Jefe de Transporte Terrestre</p>
                <p className="text-[8px] text-slate-500">Aprobación de Operaciones</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[8px] text-slate-400 mt-2 pt-1 border-t border-slate-100">
              <span>Formato TransControl • PARTE-DIARIO-{selectedDate.replace(/-/g, '')}</span>
              <span className="font-bold text-slate-500 uppercase tracking-widest">
                Documento Oficial en Hoja Única (Página 1 de 1)
              </span>
              <span>Emisión: {selectedDate} • Sistema de Transporte LASER</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
