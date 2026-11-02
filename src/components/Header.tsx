import React, { useState } from 'react';
import { 
  Bus, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileText,
  Users
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { formatDate, getTodayDateString } from '../utils/timeUtils';
import { WhatsAppIcon } from './WhatsAppStatusModal';

interface HeaderProps {
  onOpenReportModal: () => void;
  onOpenMonthlyReportModal?: () => void;
  onOpenWhatsAppModal?: () => void;
  onOpenDriverSearchModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenReportModal, 
  onOpenMonthlyReportModal,
  onOpenWhatsAppModal,
  onOpenDriverSearchModal
}) => {
  const { selectedDate, setSelectedDate, metrics, clearAllData } = useFleet();
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const todayStr = getTodayDateString();
  const isToday = selectedDate === todayStr;

  const handlePrevDay = () => {
    const parts = selectedDate.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() - 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${da}`);
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() + 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${yr}-${mo}-${da}`);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-4">
          
          {/* Brand & Department */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black">
              <Bus className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">TransControl</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Capacidad Operativa
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Control de Capacidad Operativa Diaria, Estatus de Flota y Taller
              </p>
            </div>
          </div>

          {/* Quick Date Control */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={handlePrevDay}
              title="Día anterior"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-400 hidden sm:inline">
                ({formatDate(selectedDate)})
              </span>
            </div>

            <button
              onClick={handleNextDay}
              title="Día siguiente"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isToday && (
              <button
                onClick={() => setSelectedDate(todayStr)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition border border-amber-500/40"
              >
                Ir a Hoy
              </button>
            )}
          </div>

          {/* Action buttons & Print Reports */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenReportModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition shadow-sm"
              title="Generar e imprimir Parte Diario Operativo"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Parte Diario</span>
            </button>

            {onOpenWhatsAppModal && (
              <button
                onClick={onOpenWhatsAppModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm shadow-emerald-950/40"
                title="Generar y compartir reporte para grupo de WhatsApp"
              >
                <WhatsAppIcon className="w-3.5 h-3.5" />
                <span>Estatus WhatsApp</span>
              </button>
            )}

            {onOpenMonthlyReportModal && (
              <button
                onClick={onOpenMonthlyReportModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition shadow-sm"
                title="Generar informe mensual consolidado de capacidad operativa y flota"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Informe Mensual</span>
              </button>
            )}

            {onOpenDriverSearchModal && (
              <button
                onClick={onOpenDriverSearchModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition shadow-sm"
                title="Buscar y registrar chofer encargado según el día"
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Choferes por Día</span>
              </button>
            )}

            <button
              onClick={() => setShowConfirmReset(true)}
              className="p-2 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-750 transition"
              title="Reiniciar datos de demostración"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global operational stats ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2.5 border-t border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/60">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">Capacidad Operativa Hoy:</span>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-emerald-400 text-sm">
                  {metrics.operativeCount} de {metrics.totalActiveVehicles}
                </span>
                <span className="text-emerald-300 text-[11px] font-bold">
                  unidades ({metrics.availabilityRate}%)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/60">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">Inoperativas / Taller:</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-rose-400 text-sm">
                  {metrics.inoperativeCount} unidades
                </span>
                {metrics.totalInoperativeDays > 0 && (
                  <span className="text-[10px] font-mono font-bold text-rose-300 bg-rose-950/80 px-1 rounded border border-rose-800/40">
                    {metrics.totalInoperativeDays}d acum.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/40 px-3 py-1.5 rounded-lg border border-slate-800/60">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[11px]">Tiempo Fuera Servicio:</span>
              <span className="font-bold text-amber-300 text-sm">
                {metrics.totalInoperativeDays > 0 ? `${metrics.totalInoperativeDays} días` : `${metrics.totalDowntimeHoursAllTime} hrs`}
              </span>
              <span className="text-slate-500 ml-1">
                ({metrics.totalDowntimeHoursAllTime} hrs)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal for reset */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">¿Vaciar datos y empezar desde cero?</h3>
            <p className="text-xs text-slate-300 mb-6">
              Esta acción borrará todas las unidades y reportes de fallas de taller para que puedas comenzar a cargar la información real de tu empresa en blanco.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearAllData();
                  setShowConfirmReset(false);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition shadow-lg shadow-rose-600/20"
              >
                Vaciar a Cero
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
