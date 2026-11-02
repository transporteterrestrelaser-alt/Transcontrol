import React, { useState } from 'react';
import { X, RefreshCw, Calendar, CheckCircle2, ShieldCheck, Building2, User } from 'lucide-react';
import { DriverLicense } from '../types/fleet';
import { formatDate } from '../utils/timeUtils';
import { getLicenseStatusInfo } from '../utils/licenseUtils';

interface RenewLicenseModalProps {
  license: DriverLicense;
  referenceDate: string;
  onClose: () => void;
  onRenew: (id: string, newExpiryDate: string, notes?: string) => void;
}

export const RenewLicenseModal: React.FC<RenewLicenseModalProps> = ({
  license,
  referenceDate,
  onClose,
  onRenew,
}) => {
  // Default new date: calculate 3 years or 5 years from referenceDate (or from current expiry if future)
  const calculateQuickDate = (years: number): string => {
    const baseDate = new Date(referenceDate);
    baseDate.setFullYear(baseDate.getFullYear() + years);
    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
    const d = String(baseDate.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [newExpiryDate, setNewExpiryDate] = useState<string>(calculateQuickDate(3));
  const [renewalNotes, setRenewalNotes] = useState('Trámite de renovación completado ante el INTT con certificado médico vigente.');
  const [error, setError] = useState('');

  const currentStatus = getLicenseStatusInfo(license.expiryDate, referenceDate);
  const previewStatus = newExpiryDate ? getLicenseStatusInfo(newExpiryDate, referenceDate) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpiryDate) {
      setError('Por favor indica la nueva fecha de vencimiento.');
      return;
    }
    if (newExpiryDate <= referenceDate) {
      setError('La nueva fecha de vencimiento debe ser posterior a la fecha actual.');
      return;
    }
    onRenew(license.id, newExpiryDate, renewalNotes.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-6 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Renovar Licencia de Manejo</h3>
              <p className="text-xs text-slate-400">Actualizar vigencia y prórroga legal del conductor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Driver Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-white">
                  {license.firstName} {license.lastName}
                </span>
                {license.documentId && (
                  <span className="text-xs text-slate-400 font-mono">({license.documentId})</span>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${currentStatus.badgeClass}`}>
                {currentStatus.status}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-1 border-t border-slate-900">
              <div className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>{license.department}</span>
              </div>
              <div>
                Licencia: <span className="font-mono text-slate-200 font-bold">{license.licenseNumber}</span>
              </div>
              <div>
                Vence actual: <span className="text-rose-300 font-semibold">{formatDate(license.expiryDate)}</span>
              </div>
            </div>
          </div>

          {/* Quick Selection Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Extensión rápida de vigencia:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewExpiryDate(calculateQuickDate(1));
                  setError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  newExpiryDate === calculateQuickDate(1)
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                +1 Año
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewExpiryDate(calculateQuickDate(3));
                  setError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  newExpiryDate === calculateQuickDate(3)
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                +3 Años (Estándar)
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewExpiryDate(calculateQuickDate(5));
                  setError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  newExpiryDate === calculateQuickDate(5)
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                +5 Años (INTT)
              </button>
            </div>
          </div>

          {/* Custom Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nueva Fecha de Vencimiento:</span>
            </label>
            <input
              type="date"
              value={newExpiryDate}
              onChange={(e) => {
                setNewExpiryDate(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
            {error && <p className="text-xs text-rose-400 mt-1.5">{error}</p>}
          </div>

          {/* New Status Preview */}
          {previewStatus && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Quedará con estatus: <b>{previewStatus.formattedLabel}</b></span>
              </div>
              <span className="font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                VIGENTE
              </span>
            </div>
          )}

          {/* Renewal Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nota / Registro del Trámite de Renovación:
            </label>
            <textarea
              value={renewalNotes}
              onChange={(e) => setRenewalNotes(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Renovación</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
