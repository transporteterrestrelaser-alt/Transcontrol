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

interface DailyDriverSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUnitId?: string;
  initialDate?: string;
}

type SearchMode = 'POR_DIA' | 'POR_CHOFER' | 'POR_UNIDAD';

export const DailyDriverSearchModal: React.FC<DailyDriverSearchModalProps> = ({
  isOpen,
  onClose,
  initialUnitId,
  initialDate,
}) => {
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
  const [filterDate, setFilterDate] = useState<string>(initialDate || currentAppDate);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId || '');
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

  // Preset dates: today, yesterday, and any historical dates
  const recentDates = useMemo(() => {
    const list = Array.from(new Set([currentAppDate, '2026-10-27', '2026-10-26', '2026-10-19', '2026-10-18', '2026-10-17', '2026-10-16', ...(allAssignedDates || [])]));
    return list.sort().reverse().slice(0, 8);
  }, [currentAppDate, allAssignedDates]);

  if (!isOpen) return null;

  // Handle open editor for a unit on that date
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-amber-400 text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Control Diario & Búsqueda
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-slate-300 text-xs font-semibold">
                  LASER Airlines
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Búsqueda de Choferes por Día</span>
              </h2>
              <p className="text-xs text-slate-400">
                Consulta qué chofer estaba manejando cada unidad según el día, o registra y guarda la asignación diaria.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsAppSummary}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
              title="Copiar lista de choferes para WhatsApp"
            >
              {copiedSuccess ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copiedSuccess ? '¡Copiado!' : 'Copiar Rol WhatsApp'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="bg-slate-950/60 px-4 sm:px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSearchMode('POR_DIA')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition ${
                searchMode === 'POR_DIA'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>1. Buscar por Día</span>
            </button>

            <button
              onClick={() => setSearchMode('POR_CHOFER')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition ${
                searchMode === 'POR_CHOFER'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>2. Historial por Chofer</span>
            </button>

            <button
              onClick={() => setSearchMode('POR_UNIDAD')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition ${
                searchMode === 'POR_UNIDAD'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>3. Historial por Unidad</span>
            </button>
          </div>

          {/* Quick Date Sync with main app */}
          {filterDate !== currentAppDate && (
            <button
              onClick={() => setAppDate(filterDate)}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
            >
              Fijar {formatDate(filterDate)} en la pantalla principal
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: BÚSQUEDA POR DÍA (FECHA ESPECÍFICA) */}
          {searchMode === 'POR_DIA' && (
            <div className="space-y-4">
              
              {/* Date Filter Toolbar */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase">Fecha:</span>
                  </div>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => e.target.value && setFilterDate(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-300 hidden sm:inline">
                    ({formatDate(filterDate)})
                  </span>
                </div>

                {/* Quick Date Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase shrink-0">Días:</span>
                  {recentDates.map(d => (
                    <button
                      key={d}
                      onClick={() => setFilterDate(d)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition ${
                        filterDate === d
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {d === currentAppDate ? `Hoy (${d.slice(5)})` : d.slice(5)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Roster of Units for Selected Date */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 shadow-lg">
                <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Rol de Choferes para el día {formatDate(filterDate)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {assignmentsForDate.length} unidades con asignación
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                      <tr>
                        <th className="py-3 px-4">Unidad</th>
                        <th className="py-3 px-3">Estatus Técnico</th>
                        <th className="py-3 px-4">Chofer Encargado en Fecha</th>
                        <th className="py-3 px-4">Ruta / Turno</th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
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
                              isInop ? 'bg-rose-950/15' : isCond ? 'bg-amber-950/15' : ''
                            }`}
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-0.5 overflow-hidden">
                                  <img 
                                    src={veh.photoUrl || getUnitDefaultPhoto(veh.unitNumber)} 
                                    alt={veh.unitNumber} 
                                    className="max-h-full max-w-full object-contain"
                                  />
                                </div>
                                <div>
                                  <span className="font-extrabold text-white text-xs block">
                                    {veh.unitNumber}
                                  </span>
                                  <span className="font-mono text-[10px] text-amber-300">
                                    {veh.licensePlate} • {veh.capacity}p
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              {isInop ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>Inoperativa (Taller)</span>
                                </span>
                              ) : isCond ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>Condicional (Falla)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>100% Operativa</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {isInop ? (
                                <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                                  <UserX className="w-4 h-4 text-rose-400" />
                                  <span>Sin chofer asignado (Unidad en taller)</span>
                                </div>
                              ) : asg?.driverName ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                                      {asg.driverName.charAt(0)}
                                    </div>
                                    <span className="font-extrabold text-white text-xs">
                                      {asg.driverName}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    {drvObj?.phone && (
                                      <span className="flex items-center gap-0.5">
                                        <Phone className="w-2.5 h-2.5 text-slate-400" />
                                        {drvObj.phone}
                                      </span>
                                    )}
                                    {drvObj?.licenseNumber && (
                                      <span className="font-mono text-slate-400">
                                        {drvObj.licenseNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">
                                  No asignado para este día
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4">
                              {isInop ? (
                                <span className="text-[10px] text-rose-400 font-mono">
                                  Patio / Taller Central
                                </span>
                              ) : asg ? (
                                <div>
                                  <span className="font-bold text-slate-200 text-xs block truncate max-w-[200px]">
                                    {asg.route || 'Ruta Regular'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    Turno: {asg.shift || 'COMPLETO'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-500 text-[10px]">--</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleOpenAssignModal(veh.id, veh.unitNumber)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition shadow-sm"
                                title={`Asignar o cambiar chofer de ${veh.unitNumber} para el ${formatDate(filterDate)}`}
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
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <UserCheck className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="flex-1 max-w-xs">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Filtrar por Chofer:
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => setSelectedDriverId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="">-- Todos los Choferes --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} ({d.status || 'Chofer'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 max-w-xs">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Buscar texto / fecha:
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar fecha, unidad, ruta..."
                        value={textQuery}
                        onChange={(e) => setTextQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400">
                    Total registros: <b className="text-amber-400">{driverHistoryList.length}</b>
                  </span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                      <tr>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Chofer</th>
                        <th className="py-3 px-3">Unidad Asignada</th>
                        <th className="py-3 px-4">Ruta / Destino</th>
                        <th className="py-3 px-3">Turno</th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {driverHistoryList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                            No se encontraron registros de conducción para este criterio.
                          </td>
                        </tr>
                      ) : (
                        driverHistoryList.map(item => (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-mono font-bold text-white">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                {formatDate(item.date)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-amber-300">
                                {item.driverName}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                {item.unitNumber}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {item.route}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {item.shift}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setFilterDate(item.date);
                                  setSearchMode('POR_DIA');
                                }}
                                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
                              >
                                Ver ese día
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
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <Bus className="w-5 h-5 text-amber-400 shrink-0" />
                  <div className="flex-1 max-w-xs">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Filtrar por Unidad:
                    </label>
                    <select
                      value={selectedUnitId}
                      onChange={(e) => setSelectedUnitId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="">-- Todas las Unidades --</option>
                      {activeVehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.unitNumber} ({v.model} • {v.licensePlate})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 max-w-xs">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Buscar chofer o fecha:
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar chofer, ruta, fecha..."
                        value={textQuery}
                        onChange={(e) => setTextQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-400">
                    Total registros: <b className="text-amber-400">{unitHistoryList.length}</b>
                  </span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 font-bold">
                      <tr>
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-3">Unidad</th>
                        <th className="py-3 px-4">Chofer Encargado</th>
                        <th className="py-3 px-4">Ruta Realizada</th>
                        <th className="py-3 px-3">Turno</th>
                        <th className="py-3 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {unitHistoryList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                            No se encontraron registros para esta unidad.
                          </td>
                        </tr>
                      ) : (
                        unitHistoryList.map(item => (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-3 px-4 font-mono font-bold text-white">
                              <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                {formatDate(item.date)}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-extrabold text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                {item.unitNumber}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-white text-xs">
                                {item.driverName}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              {item.route}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                {item.shift}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setFilterDate(item.date);
                                  setSearchMode('POR_DIA');
                                }}
                                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline"
                              >
                                Ver ese día
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
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Las asignaciones diarias se guardan de forma persistente día a día.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsAppSummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm text-xs"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedSuccess ? '¡Copiado!' : 'Copiar Rol WhatsApp'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-xs border border-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Fast Assignment / Edit Modal Overlay */}
        {editingAssignment && (
          <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-sm">
                    Asignar Chofer para el {formatDate(editingAssignment.date)}
                  </h3>
                </div>
                <button
                  onClick={() => setEditingAssignment(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAssignment} className="space-y-3.5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase block mb-1">
                    Unidad:
                  </span>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 font-bold text-white">
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

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingAssignment(null)}
                    className="px-3 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!editingAssignment.driverName.trim()}
                    className="px-4 py-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    Guardar para esta Fecha
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
