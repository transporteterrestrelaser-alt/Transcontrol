import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Calendar, 
  Search, 
  Bus, 
  UserCheck, 
  UserX, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Check, 
  Edit3, 
  Copy, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Phone,
  ArrowRight
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { formatDate } from '../utils/timeUtils';
import { ShiftType } from '../types/fleet';
import { getUnitDefaultPhoto } from '../utils/imageUtils';

interface DailyDriversTabProps {
  onGoToUnitDossier?: (unitId: string) => void;
}

type SearchMode = 'POR_DIA' | 'POR_CHOFER' | 'POR_UNIDAD';

export const DailyDriversTab: React.FC<DailyDriversTabProps> = ({ onGoToUnitDossier }) => {
  const { 
    vehicles, 
    drivers, 
    dailyAssignments, 
    assignDriverToUnit, 
    getUnitStatusForDate,
    selectedDate: currentAppDate,
    setSelectedDate: setAppDate,
    allAssignedDates,
  } = useFleet();

  const [searchMode, setSearchMode] = useState<SearchMode>('POR_DIA');
  const [filterDate, setFilterDate] = useState<string>(currentAppDate);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [textQuery, setTextQuery] = useState<string>('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Quick edit / assign state
  const [editingAssignment, setEditingAssignment] = useState<{
    unitId: string;
    unitNumber: string;
    driverName: string;
    driverId?: string;
    date: string;
    shift: ShiftType;
    route: string;
    notes: string;
  } | null>(null);

  const activeVehicles = vehicles.filter(v => v.active);

  // Get assignments for the currently queried date
  const assignmentsForDate = dailyAssignments.filter(a => a.date === filterDate);

  // Preset dates: today, yesterday, and historical dates
  const recentDates = useMemo(() => {
    const list = Array.from(new Set([currentAppDate, '2026-10-27', '2026-10-26', '2026-10-19', '2026-10-18', '2026-10-17', '2026-10-16', ...(allAssignedDates || [])]));
    return list.sort().reverse().slice(0, 10);
  }, [currentAppDate, allAssignedDates]);

  const handlePrevDay = () => {
    const parts = filterDate.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() - 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    setFilterDate(`${yr}-${mo}-${da}`);
  };

  const handleNextDay = () => {
    const parts = filterDate.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() + 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    setFilterDate(`${yr}-${mo}-${da}`);
  };

  // Open editor for a unit on that date
  const handleOpenAssignModal = (unitId: string, unitNumber: string) => {
    const existing = assignmentsForDate.find(a => a.unitId === unitId || a.unitNumber.toLowerCase() === unitNumber.toLowerCase());
    const unit = vehicles.find(v => v.id === unitId || v.unitNumber.toLowerCase() === unitNumber.toLowerCase());
    const defaultRoute = unit?.unitNumber.includes('44') 
      ? 'Estación Maracay' 
      : unit?.unitNumber.includes('43') 
      ? 'Traslados o requerimientos cortos: tripulación, requerimientos especiales' 
      : 'Ruta Regular Transporte de Personal';

    setEditingAssignment({
      unitId,
      unitNumber,
      driverName: existing?.driverName || '',
      driverId: existing?.driverId || '',
      date: filterDate,
      shift: existing?.shift || 'COMPLETO',
      route: existing?.route || defaultRoute,
      notes: existing?.notes || '',
    });
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment || !editingAssignment.driverName.trim()) return;

    assignDriverToUnit(
      editingAssignment.unitId,
      editingAssignment.driverName.trim(),
      editingAssignment.date,
      editingAssignment.shift,
      editingAssignment.route,
      editingAssignment.notes
    );

    setEditingAssignment(null);
  };

  // Copy WhatsApp summary of drivers for that day
  const handleCopyWhatsAppSummary = () => {
    const formatted = formatDate(filterDate);
    let text = `📋 *ROL DE CHOFERES POR UNIDAD*\n`;
    text += `📅 *Fecha:* ${formatted}\n`;
    text += `🏢 *LASER Airlines • Transporte Terrestre*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    activeVehicles.forEach(veh => {
      const statusObj = getUnitStatusForDate(veh.id, filterDate);
      const asg = assignmentsForDate.find(a => a.unitId === veh.id || a.unitNumber.toLowerCase() === veh.unitNumber.toLowerCase());
      
      if (statusObj.status === 'INOPERATIVA') {
        text += `🔴 *${veh.unitNumber}* [${veh.licensePlate}]: *INOPERATIVA EN TALLER* (Sin Chofer)\n`;
      } else if (asg?.driverName) {
        const condNote = statusObj.status === 'EN_OBSERVACION' ? ' (Condicional)' : '';
        text += `🟢 *${veh.unitNumber}* [${veh.licensePlate}]: Operador *${asg.driverName}*${condNote}\n`;
        text += `   ↳ *Ruta:* ${asg.route || 'Ruta Regular'}\n`;
      } else {
        text += `⚪ *${veh.unitNumber}* [${veh.licensePlate}]: Sin Chofer Asignado\n`;
      }
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `_Control Operativo de Flota TransControl_`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Filtered driver history
  const driverHistoryList = useMemo(() => {
    if (!selectedDriverId && !textQuery.trim()) return dailyAssignments;
    return dailyAssignments.filter(a => {
      const matchDriverId = selectedDriverId ? a.driverId === selectedDriverId || a.driverName.toLowerCase() === selectedDriverId.toLowerCase() : true;
      const matchText = textQuery.trim() ? (
        a.driverName.toLowerCase().includes(textQuery.toLowerCase()) ||
        a.unitNumber.toLowerCase().includes(textQuery.toLowerCase()) ||
        a.date.includes(textQuery) ||
        a.route.toLowerCase().includes(textQuery.toLowerCase())
      ) : true;
      return matchDriverId && matchText;
    });
  }, [dailyAssignments, selectedDriverId, textQuery]);

  // Filtered unit history
  const unitHistoryList = useMemo(() => {
    if (!selectedUnitId && !textQuery.trim()) return dailyAssignments;
    return dailyAssignments.filter(a => {
      const matchUnitId = selectedUnitId ? a.unitId === selectedUnitId || a.unitNumber.toLowerCase() === selectedUnitId.toLowerCase() : true;
      const matchText = textQuery.trim() ? (
        a.driverName.toLowerCase().includes(textQuery.toLowerCase()) ||
        a.unitNumber.toLowerCase().includes(textQuery.toLowerCase()) ||
        a.date.includes(textQuery) ||
        a.route.toLowerCase().includes(textQuery.toLowerCase())
      ) : true;
      return matchUnitId && matchText;
    });
  }, [dailyAssignments, selectedUnitId, textQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-amber-400 font-extrabold uppercase tracking-wider text-xs bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                Personal Operativo • Asignación Diaria
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-200 text-xs font-bold flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Fecha Operativa: {formatDate(filterDate)}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2.5">
              <span>Control y Búsqueda de Choferes por Día</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Guarda y consulta diariamente el chofer encargado de cada unidad por día. Permite buscar por día, por chofer o por unidad según la fecha • LASER Airlines.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopyWhatsAppSummary}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg shadow-emerald-600/20"
              title="Copiar lista de choferes para WhatsApp"
            >
              {copiedSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSuccess ? '¡Rol Copiado!' : 'Copiar Rol WhatsApp'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              title="Imprimir reporte de asignaciones"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir Rol</span>
            </button>
          </div>
        </div>

        {/* 3 Search Mode Pills */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setSearchMode('POR_DIA')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition shrink-0 ${
              searchMode === 'POR_DIA'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. Buscar por Día (Fecha Seleccionada)</span>
          </button>

          <button
            onClick={() => setSearchMode('POR_CHOFER')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition shrink-0 ${
              searchMode === 'POR_CHOFER'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>2. Historial por Chofer ("¿Qué manejó?")</span>
          </button>

          <button
            onClick={() => setSearchMode('POR_UNIDAD')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition shrink-0 ${
              searchMode === 'POR_UNIDAD'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>3. Historial por Unidad ("¿Quién la manejó?")</span>
          </button>
        </div>
      </div>

      {/* TAB 1: BÚSQUEDA POR DÍA */}
      {searchMode === 'POR_DIA' && (
        <div className="space-y-4">
          
          {/* Date Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
              <button
                onClick={handlePrevDay}
                title="Día anterior"
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => e.target.value && setFilterDate(e.target.value)}
                  className="bg-transparent text-sm font-bold text-white focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={handleNextDay}
                title="Día siguiente"
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase shrink-0">Recientes:</span>
              {recentDates.map(d => (
                <button
                  key={d}
                  onClick={() => setFilterDate(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition ${
                    filterDate === d
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {d === currentAppDate ? `Hoy (${d.slice(5)})` : d.slice(5)}
                </button>
              ))}
            </div>

            {/* Sync button */}
            {filterDate !== currentAppDate && (
              <button
                onClick={() => setAppDate(filterDate)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 underline"
              >
                Fijar {formatDate(filterDate)} como fecha activa
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Rol de Choferes por Unidad • {formatDate(filterDate)}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {assignmentsForDate.length} unidades asignadas
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Unidad & Vehículo</th>
                    <th className="py-3.5 px-3">Placa & Capacidad</th>
                    <th className="py-3.5 px-3">Estatus Técnico</th>
                    <th className="py-3.5 px-4">Chofer Encargado en Fecha</th>
                    <th className="py-3.5 px-4">Ruta / Servicio</th>
                    <th className="py-3.5 px-3">Turno</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {activeVehicles.map(veh => {
                    const statusObj = getUnitStatusForDate(veh.id, filterDate);
                    const isInop = statusObj.status === 'INOPERATIVA';
                    const isCond = statusObj.status === 'EN_OBSERVACION';
                    const asg = assignmentsForDate.find(a => a.unitId === veh.id || a.unitNumber.toLowerCase() === veh.unitNumber.toLowerCase());
                    const drvObj = asg ? drivers.find(d => d.fullName.toLowerCase() === asg.driverName.toLowerCase() || d.id === asg.driverId) : undefined;

                    return (
                      <tr 
                        key={veh.id}
                        className={`hover:bg-slate-800/40 transition-colors ${
                          isInop ? 'bg-rose-950/10' : isCond ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 p-0.5 overflow-hidden shrink-0">
                              <img 
                                src={veh.photoUrl || getUnitDefaultPhoto(veh.unitNumber)} 
                                alt={veh.unitNumber} 
                                className="max-h-full max-w-full object-contain mx-auto"
                              />
                            </div>
                            <div>
                              <button
                                onClick={() => onGoToUnitDossier && onGoToUnitDossier(veh.id)}
                                className="font-extrabold text-sm text-white hover:text-amber-400 transition text-left block"
                              >
                                {veh.unitNumber}
                              </button>
                              <span className="text-[11px] text-slate-400 block">
                                {veh.model}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-mono text-xs font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                            {veh.licensePlate}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {veh.capacity} pax
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          {isInop ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Inoperativa (Taller)</span>
                            </span>
                          ) : isCond ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              <span>Condicional (Falla)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>100% Operativa</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isInop ? (
                            <div className="text-slate-400 italic flex items-center gap-1.5 text-xs">
                              <UserX className="w-4 h-4 text-rose-400" />
                              <span>En Taller • Sin Chofer Asignado</span>
                            </div>
                          ) : asg?.driverName ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                                  {asg.driverName.charAt(0)}
                                </div>
                                <span className="font-extrabold text-white text-sm">
                                  {asg.driverName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2.5 text-[11px] text-slate-400">
                                {drvObj?.phone && (
                                  <span className="flex items-center gap-1 text-slate-300">
                                    <Phone className="w-3 h-3 text-amber-400" />
                                    {drvObj.phone}
                                  </span>
                                )}
                                {drvObj?.licenseNumber && (
                                  <span className="font-mono text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                                    {drvObj.licenseNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-xs">
                              Sin chofer asignado para este día
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isInop ? (
                            <span className="text-xs text-rose-400/80 font-mono">
                              Patio / Taller Central
                            </span>
                          ) : asg ? (
                            <div>
                              <span className="font-bold text-slate-200 text-xs block">
                                {asg.route || 'Ruta Regular Transporte'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">--</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {asg ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-200 border border-slate-800">
                              {asg.shift}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">--</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenAssignModal(veh.id, veh.unitNumber)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/30 transition shadow-sm"
                            title={`Asignar o modificar chofer de ${veh.unitNumber} en fecha ${formatDate(filterDate)}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{asg?.driverName ? 'Cambiar Chofer' : '+ Asignar'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORIAL POR CHOFER */}
      {searchMode === 'POR_CHOFER' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="flex-1 max-w-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Seleccionar Chofer a Consultar:
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="">-- Todos los Choferes (Ver todo el historial) --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.status || 'Chofer Activo'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 max-w-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Búsqueda rápida por texto / fecha:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar fecha, unidad, ruta..."
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-400">
                Registros encontrados: <b className="text-amber-400 text-sm font-black">{driverHistoryList.length}</b>
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Fecha de Conducción</th>
                    <th className="py-3.5 px-4">Chofer</th>
                    <th className="py-3.5 px-3">Unidad Asignada</th>
                    <th className="py-3.5 px-4">Ruta / Servicio</th>
                    <th className="py-3.5 px-3">Turno</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {driverHistoryList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 italic text-sm">
                        No se encontraron registros de asignación para este chofer.
                      </td>
                    </tr>
                  ) : (
                    driverHistoryList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            {formatDate(item.date)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-amber-300 text-sm">
                            {item.driverName}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-extrabold text-white bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                            {item.unitNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-200">
                          {item.route}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                            {item.shift}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setFilterDate(item.date);
                              setSearchMode('POR_DIA');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 underline"
                          >
                            <span>Ver ese día</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HISTORIAL POR UNIDAD */}
      {searchMode === 'POR_UNIDAD' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
              <div className="flex-1 max-w-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Seleccionar Unidad a Consultar:
                </label>
                <select
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="">-- Todas las Unidades (Ver todo el historial) --</option>
                  {activeVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.unitNumber} ({v.model} • {v.licensePlate})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 max-w-sm">
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                  Buscar chofer o fecha:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar chofer, fecha, ruta..."
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-slate-400">
                Registros encontrados: <b className="text-amber-400 text-sm font-black">{unitHistoryList.length}</b>
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                  <tr>
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-3">Unidad</th>
                    <th className="py-3.5 px-4">Chofer Encargado</th>
                    <th className="py-3.5 px-4">Ruta Realizada</th>
                    <th className="py-3.5 px-3">Turno</th>
                    <th className="py-3.5 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {unitHistoryList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500 italic text-sm">
                        No se encontraron registros de asignación para esta unidad.
                      </td>
                    </tr>
                  ) : (
                    unitHistoryList.map(item => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            {formatDate(item.date)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-extrabold text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                            {item.unitNumber}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-white text-sm">
                            {item.driverName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-200">
                          {item.route}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-950 text-slate-300 border border-slate-800">
                            {item.shift}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setFilterDate(item.date);
                              setSearchMode('POR_DIA');
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 underline"
                          >
                            <span>Ver ese día</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  Asignar Chofer para el {formatDate(editingAssignment.date)}
                </h3>
              </div>
              <button
                onClick={() => setEditingAssignment(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Unidad:
                </span>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-extrabold text-white text-sm">
                  {editingAssignment.unitNumber}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Fecha de Asignación:
                </label>
                <input
                  type="date"
                  value={editingAssignment.date}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, date: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Chofer Encargado:
                </label>
                <select
                  value={editingAssignment.driverName}
                  onChange={(e) => {
                    const selectedDrv = drivers.find(d => d.fullName === e.target.value);
                    setEditingAssignment({
                      ...editingAssignment,
                      driverName: e.target.value,
                      driverId: selectedDrv?.id,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-amber-400 cursor-pointer mb-2"
                >
                  <option value="">-- Seleccionar de la Lista de Choferes --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.fullName}>
                      {d.fullName} (Lic. {d.licenseType || 'Cat 5'})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="O escribe un nombre de chofer manual..."
                  value={editingAssignment.driverName}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, driverName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                  Turno:
                </label>
                <select
                  value={editingAssignment.shift}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, shift: e.target.value as ShiftType })}
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
                  value={editingAssignment.route}
                  onChange={(e) => setEditingAssignment({ ...editingAssignment, route: e.target.value })}
                  placeholder="Ej. Ruta Regular, Estación Maracay, Traslados cortos..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!editingAssignment.driverName.trim()}
                  className="px-5 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  Guardar para esta Fecha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
