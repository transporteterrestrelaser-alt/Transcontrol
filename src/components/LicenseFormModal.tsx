import React, { useState, useEffect } from 'react';
import { X, IdCard, Calendar, Building2, User, Phone, Bus, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DriverLicense } from '../types/fleet';
import { DEFAULT_DEPARTMENTS, DEFAULT_LICENSE_CATEGORIES, getLicenseStatusInfo } from '../utils/licenseUtils';

interface LicenseFormModalProps {
  license?: DriverLicense;
  referenceDate: string;
  onClose: () => void;
  onSave: (data: Omit<DriverLicense, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const LicenseFormModal: React.FC<LicenseFormModalProps> = ({
  license,
  referenceDate,
  onClose,
  onSave,
}) => {
  const isEditing = !!license;

  const [licenseNumber, setLicenseNumber] = useState(license?.licenseNumber || '');
  const [issueDate, setIssueDate] = useState(license?.issueDate || '2023-01-15');
  const [expiryDate, setExpiryDate] = useState(license?.expiryDate || '');
  const [department, setDepartment] = useState(license?.department || DEFAULT_DEPARTMENTS[0]);
  const [customDepartment, setCustomDepartment] = useState('');
  const [firstName, setFirstName] = useState(license?.firstName || '');
  const [lastName, setLastName] = useState(license?.lastName || '');
  const [documentId, setDocumentId] = useState(license?.documentId || '');
  const [category, setCategory] = useState(license?.category || DEFAULT_LICENSE_CATEGORIES[0]);
  const [phone, setPhone] = useState(license?.phone || '');
  const [assignedUnit, setAssignedUnit] = useState(license?.assignedUnit || '');
  const [notes, setNotes] = useState(license?.notes || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCustomDept = department === 'OTRO';

  // Preview status of the entered expiry date
  const statusInfo = expiryDate ? getLicenseStatusInfo(expiryDate, referenceDate) : null;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!licenseNumber.trim()) {
      newErrors.licenseNumber = 'El número de licencia es obligatorio.';
    }
    if (!expiryDate) {
      newErrors.expiryDate = 'La fecha de vencimiento es obligatoria.';
    }
    if (!firstName.trim()) {
      newErrors.firstName = 'El nombre es obligatorio.';
    }
    if (!lastName.trim()) {
      newErrors.lastName = 'El apellido es obligatorio.';
    }
    const finalDept = isCustomDept ? customDepartment.trim() : department;
    if (!finalDept) {
      newErrors.department = 'El departamento es obligatorio.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalDept = isCustomDept ? customDepartment.trim() : department;

    onSave({
      licenseNumber: licenseNumber.trim().toUpperCase(),
      issueDate: issueDate || undefined,
      expiryDate,
      department: finalDept,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      documentId: documentId.trim() || undefined,
      category: category.trim() || undefined,
      phone: phone.trim() || undefined,
      assignedUnit: assignedUnit.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <IdCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {isEditing ? 'Editar Registro de Licencia' : 'Registrar Nueva Licencia de Manejo'}
              </h3>
              <p className="text-xs text-slate-400">
                Control de vencimientos vinculado al conductor, departamento y placa técnica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Status Preview Banner */}
          {statusInfo && (
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
              statusInfo.status === 'VENCIDA'
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-200'
                : statusInfo.status === 'POR_VENCER'
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
            }`}>
              <div className="flex items-center gap-2.5">
                {statusInfo.status === 'VENCIDA' ? (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                ) : statusInfo.status === 'POR_VENCER' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div>
                  <span className="text-xs font-bold block">
                    Estado calculado al {referenceDate}:
                  </span>
                  <span className="text-sm font-black">
                    {statusInfo.formattedLabel}
                  </span>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${statusInfo.badgeClass}`}>
                {statusInfo.status}
              </span>
            </div>
          )}

          {/* Section: Datos del Conductor */}
          <div>
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>1. Nombre, Apellido y Cédula</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nombre <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ej. José"
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition ${
                    errors.firstName ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {errors.firstName && <p className="text-[11px] text-rose-400 mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Apellido <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ej. Dávila"
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition ${
                    errors.lastName ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {errors.lastName && <p className="text-[11px] text-rose-400 mt-1">{errors.lastName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Cédula / Documento de Identidad
                </label>
                <input
                  type="text"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  placeholder="Ej. V-16.782.901"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Teléfono de Contacto</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +58 414 000 0023"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
                />
              </div>
            </div>
          </div>

          {/* Section: Licencia y Vencimiento */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-3 flex items-center gap-2">
              <IdCard className="w-4 h-4" />
              <span>2. Licencia y Fecha de Vencimiento</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Número de Licencia <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="Ej. LIC-DAVILA-5023"
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition ${
                    errors.licenseNumber ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {errors.licenseNumber && <p className="text-[11px] text-rose-400 mt-1">{errors.licenseNumber}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Fecha de Emisión</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fecha de Vencimiento <span className="text-rose-400">*</span></span>
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition ${
                    errors.expiryDate ? 'border-rose-500' : 'border-slate-800'
                  }`}
                />
                {errors.expiryDate && <p className="text-[11px] text-rose-400 mt-1">{errors.expiryDate}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Grado / Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
                >
                  {DEFAULT_LICENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-slate-400" />
                  <span>Unidad Habitual / Asignada</span>
                </label>
                <input
                  type="text"
                  value={assignedUnit}
                  onChange={(e) => setAssignedUnit(e.target.value)}
                  placeholder="Ej. Unidad 23 / Unidad 42"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
                />
              </div>
            </div>
          </div>

          {/* Section: Departamento y Observaciones */}
          <div className="pt-2 border-t border-slate-800">
            <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>3. Departamento de la Empresa</span>
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Departamento Asignado <span className="text-rose-400">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
                >
                  {DEFAULT_DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                  <option value="OTRO">+ Agregar otro departamento...</option>
                </select>
              </div>

              {isCustomDept && (
                <div>
                  <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                    Especificar Nombre del Departamento <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    placeholder="Ej. Seguridad Industrial / Tráfico Aéreo"
                    className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition ${
                      errors.department ? 'border-rose-500' : 'border-amber-500/50'
                    }`}
                  />
                  {errors.department && <p className="text-[11px] text-rose-400 mt-1">{errors.department}</p>}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Observaciones / Notas de Trámite</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalles sobre renovación, certificado médico, estado de trámites ante INTT..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition resize-none"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEditing ? 'Guardar Cambios' : 'Registrar Licencia'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
