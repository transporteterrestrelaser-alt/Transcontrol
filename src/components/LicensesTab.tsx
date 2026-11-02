import React, { useState, useMemo } from 'react';
import { 
  IdCard, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Building2, 
  User, 
  Phone, 
  Bus, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  FileSpreadsheet, 
  Printer, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowUpDown,
  AlertOctagon,
  FileText
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { DriverLicense, LicenseStatus } from '../types/fleet';
import { formatDate } from '../utils/timeUtils';
import { getLicenseStatusInfo } from '../utils/licenseUtils';
import { LicenseFormModal } from './LicenseFormModal';
import { RenewLicenseModal } from './RenewLicenseModal';

type StatusFilterType = 'ALL' | 'VENCIDA' | 'POR_VENCER' | 'VIGENTE';
type SortOption = 'URGENCY' | 'NAME' | 'DEPARTMENT' | 'EXPIRY' | 'LICENSE_NUM';

export const LicensesTab: React.FC = () => {
  const { 
    licenses, 
    addLicense, 
    updateLicense, 
    deleteLicense, 
    renewLicense, 
    licenseMetrics, 
    selectedDate 
  } = useFleet();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('URGENCY');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLicense, setEditingLicense] = useState<DriverLicense | null>(null);
  const [renewingLicense, setRenewingLicense] = useState<DriverLicense | null>(null);
  const [deletingLicense, setDeletingLicense] = useState<DriverLicense | null>(null);

  // Filtered & Sorted Licenses
  const filteredLicenses = useMemo(() => {
    return licenses.filter(lic => {
      // 1. Text Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchNum = lic.licenseNumber.toLowerCase().includes(q);
        const matchFirst = lic.firstName.toLowerCase().includes(q);
        const matchLast = lic.lastName.toLowerCase().includes(q);
        const matchFull = `${lic.firstName} ${lic.lastName}`.toLowerCase().includes(q);
        const matchDept = lic.department.toLowerCase().includes(q);
        const matchDoc = lic.documentId?.toLowerCase().includes(q) || false;
        const matchUnit = lic.assignedUnit?.toLowerCase().includes(q) || false;

        if (!matchNum && !matchFirst && !matchLast && !matchFull && !matchDept && !matchDoc && !matchUnit) {
          return false;
        }
      }

      // 2. Department Filter
      if (departmentFilter !== 'ALL' && lic.department !== departmentFilter) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL') {
        const info = getLicenseStatusInfo(lic.expiryDate, selectedDate);
        if (info.status !== statusFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const infoA = getLicenseStatusInfo(a.expiryDate, selectedDate);
      const infoB = getLicenseStatusInfo(b.expiryDate, selectedDate);

      if (sortBy === 'URGENCY') {
        // Most overdue/expiring first (lowest daysDiff first)
        return infoA.daysDiff - infoB.daysDiff;
      }
      if (sortBy === 'NAME') {
        const nameA = `${a.lastName} ${a.firstName}`.toLowerCase();
        const nameB = `${b.lastName} ${b.firstName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'DEPARTMENT') {
        const deptCompare = a.department.localeCompare(b.department);
        if (deptCompare !== 0) return deptCompare;
        return a.lastName.localeCompare(b.lastName);
      }
      if (sortBy === 'EXPIRY') {
        return a.expiryDate.localeCompare(b.expiryDate);
      }
      if (sortBy === 'LICENSE_NUM') {
        return a.licenseNumber.localeCompare(b.licenseNumber);
      }
      return 0;
    });
  }, [licenses, searchTerm, departmentFilter, statusFilter, sortBy, selectedDate]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Numero_Licencia',
      'Nombre',
      'Apellido',
      'Nombre_Completo',
      'Cedula',
      'Departamento',
      'Fecha_Vencimiento',
      'Estado_Vigencia',
      'Dias_Diferencia',
      'Categoria',
      'Telefono',
      'Unidad_Asignada',
      'Observaciones'
    ];

    const rows = filteredLicenses.map(lic => {
      const info = getLicenseStatusInfo(lic.expiryDate, selectedDate);
      return [
        `"${lic.licenseNumber}"`,
        `"${lic.firstName}"`,
        `"${lic.lastName}"`,
        `"${lic.firstName} ${lic.lastName}"`,
        `"${lic.documentId || ''}"`,
        `"${lic.department}"`,
        lic.expiryDate,
        info.status,
        info.daysDiff,
        `"${lic.category || ''}"`,
        `"${lic.phone || ''}"`,
        `"${lic.assignedUnit || ''}"`,
        `"${(lic.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vencimiento_Licencias_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Department pill badge colors
  const getDeptColor = (dept: string) => {
    switch (dept.toLowerCase()) {
      case 'transporte terrestre':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'estación maracay':
      case 'estacion maracay':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'operaciones':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'mantenimiento central':
      case 'taller':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/30';
      case 'seguridad y logística':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <IdCard className="w-3.5 h-3.5" />
                Módulo de Tránsito & Personal
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Corte: <b className="text-white">{formatDate(selectedDate)}</b>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Control de Vencimiento de Licencias de Manejo
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Monitoreo y alerta preventiva de vigencia legal para todo el personal de conducción.
              Registros indexados por <b>Número de Licencia</b>, <b>Fecha de Vencimiento</b>, <b>Departamento</b> y <b>Nombre / Apellido</b>.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 shadow-md"
              title="Descargar censo en formato CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 shadow-md"
              title="Imprimir relación oficial"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Licencia</span>
            </button>
          </div>
        </div>

        {/* 2. Critical Alert Banner if expired or expiring soon */}
        {(licenseMetrics.expiredCount > 0 || licenseMetrics.expiringSoonCount > 0) && (
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-rose-950/70 via-amber-950/40 to-slate-900 border border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-inner">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="font-extrabold text-rose-200 text-sm">
                  Alerta Regulatoria de Tránsito
                </p>
                <p className="text-slate-300 text-xs mt-0.5">
                  Hay <b className="text-rose-400">{licenseMetrics.expiredCount} licencia(s) vencida(s)</b> y <b className="text-amber-400">{licenseMetrics.expiringSoonCount} próxima(s) a vencer</b> en los próximos 30 días. Por normativa vial, conductores con licencia vencida no deben operar unidades de transporte.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setStatusFilter(licenseMetrics.expiredCount > 0 ? 'VENCIDA' : 'POR_VENCER');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-bold text-xs shrink-0 transition"
            >
              Ver Críticas
            </button>
          </div>
        )}
      </div>

      {/* 3. KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card: Total */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Censo Total</span>
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
              <IdCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{licenseMetrics.total}</span>
            <span className="text-xs text-slate-400 font-semibold">conductores</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {licenseMetrics.departments.length} departamento(s) activos
          </p>
        </div>

        {/* Card: Vigentes */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'VIGENTE' ? 'ALL' : 'VIGENTE')}
          className={`bg-slate-900 border rounded-3xl p-5 shadow-lg cursor-pointer transition hover:border-emerald-500/50 ${
            statusFilter === 'VIGENTE' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Vigentes (Al Día)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">{licenseMetrics.validCount}</span>
            <span className="text-xs text-emerald-500/80 font-bold">
              ({licenseMetrics.total > 0 ? Math.round((licenseMetrics.validCount / licenseMetrics.total) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Aptos para conducir y despachar
          </p>
        </div>

        {/* Card: Por Vencer (≤30 días) */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'POR_VENCER' ? 'ALL' : 'POR_VENCER')}
          className={`bg-slate-900 border rounded-3xl p-5 shadow-lg cursor-pointer transition hover:border-amber-500/50 ${
            statusFilter === 'POR_VENCER' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Por Vencer (≤ 30d)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">{licenseMetrics.expiringSoonCount}</span>
            <span className="text-xs text-amber-500/80 font-semibold">próximas</span>
          </div>
          <p className="text-[11px] text-amber-300/80 mt-1 font-medium">
            Gestionar cita de renovación
          </p>
        </div>

        {/* Card: Vencidas */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'VENCIDA' ? 'ALL' : 'VENCIDA')}
          className={`bg-slate-900 border rounded-3xl p-5 shadow-lg cursor-pointer transition hover:border-rose-500/50 ${
            statusFilter === 'VENCIDA' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Vencidas</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-400">{licenseMetrics.expiredCount}</span>
            <span className="text-xs text-rose-300 font-extrabold uppercase">Inhabilitadas</span>
          </div>
          <p className="text-[11px] text-rose-300/80 mt-1 font-medium">
            Prohibida salida a ruta
          </p>
        </div>
      </div>

      {/* 4. Controls, Filters and Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Licencia, Nombre, Apellido, Departamento o Cédula..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Department Filter Dropdown */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition cursor-pointer"
            >
              <option value="ALL">Todos los Departamentos ({licenses.length})</option>
              {licenseMetrics.departments.map(dept => {
                const count = licenses.filter(l => l.department === dept).length;
                return (
                  <option key={dept} value={dept}>{dept} ({count})</option>
                );
              })}
            </select>

            {/* Sorting Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition cursor-pointer"
              >
                <option value="URGENCY">Ordenar: Más Urgentes Primero</option>
                <option value="NAME">Ordenar: Apellido (A - Z)</option>
                <option value="DEPARTMENT">Ordenar: Departamento</option>
                <option value="EXPIRY">Ordenar: Fecha Vencimiento</option>
                <option value="LICENSE_NUM">Ordenar: N° Licencia</option>
              </select>
            </div>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-bold flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Estatus:
          </span>

          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todas ({licenses.length})
          </button>

          <button
            onClick={() => setStatusFilter('VENCIDA')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'VENCIDA'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'bg-slate-950 text-rose-400 hover:bg-rose-950/30 border border-rose-900/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Vencidas ({licenseMetrics.expiredCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('POR_VENCER')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'POR_VENCER'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-950 text-amber-400 hover:bg-amber-950/30 border border-amber-900/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Por Vencer ≤30d ({licenseMetrics.expiringSoonCount})</span>
          </button>

          <button
            onClick={() => setStatusFilter('VIGENTE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              statusFilter === 'VIGENTE'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950 text-emerald-400 hover:bg-emerald-950/30 border border-emerald-900/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Vigentes ({licenseMetrics.validCount})</span>
          </button>

          <div className="ml-auto text-xs text-slate-400 font-semibold">
            Mostrando <b>{filteredLicenses.length}</b> de <b>{licenses.length}</b> registros
          </div>
        </div>
      </div>

      {/* 5. Main Licenses Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {filteredLicenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
              <IdCard className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white">No se encontraron licencias</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No hay registros que coincidan con los filtros aplicados. Puedes cambiar los filtros o registrar una nueva licencia.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-4 px-4 font-bold">Conductor</th>
                  <th className="py-4 px-4 font-bold">Cédula / ID</th>
                  <th className="py-4 px-4 font-bold">Tipo / Grado</th>
                  <th className="py-4 px-4 font-bold">Fecha Emisión</th>
                  <th className="py-4 px-4 font-bold">Fecha Vencimiento</th>
                  <th className="py-4 px-4 font-bold">Semáforo de Estatus</th>
                  <th className="py-4 px-4 font-bold">Unidad Habitual</th>
                  <th className="py-4 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLicenses.map(lic => {
                  const statusInfo = getLicenseStatusInfo(lic.expiryDate, selectedDate);
                  const isExpired = statusInfo.status === 'VENCIDA';
                  const isExpiringSoon = statusInfo.status === 'POR_VENCER';
                  const isVigente = statusInfo.status === 'VIGENTE';

                  return (
                    <tr 
                      key={lic.id} 
                      className={`transition ${
                        isExpired
                          ? 'bg-rose-950/20 hover:bg-rose-950/30'
                          : isExpiringSoon
                          ? 'bg-amber-950/15 hover:bg-amber-950/25'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* 1. Conductor (Nombre y Apellido) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isExpired
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : isExpiringSoon
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}>
                            {lic.firstName.charAt(0)}{lic.lastName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-xs">
                              {lic.firstName} {lic.lastName}
                            </div>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {lic.licenseNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Cédula / ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-200 text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 inline-block">
                          {lic.documentId || 'S/D'}
                        </span>
                      </td>

                      {/* 3. Tipo / Grado de Licencia */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-200 text-xs block">
                            {lic.category || '5to Grado Profesional'}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {lic.department}
                          </span>
                        </div>
                      </td>

                      {/* 4. Fecha de Emisión */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lic.issueDate ? formatDate(lic.issueDate) : '2023-01-15'}</span>
                        </div>
                      </td>

                      {/* 5. Fecha de Vencimiento */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        <div className="space-y-0.5">
                          <div className={`flex items-center gap-1.5 font-bold text-xs ${
                            isExpired ? 'text-rose-400' : isExpiringSoon ? 'text-amber-400' : 'text-slate-100'
                          }`}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatDate(lic.expiryDate)}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block">
                            {lic.expiryDate}
                          </span>
                        </div>
                      </td>

                      {/* 6. Semáforo Automático de Estatus */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {/* Gráfico Semáforo */}
                          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-full border border-slate-800 shadow-inner">
                            {/* Luz Roja */}
                            <span 
                              title="Rojo: Vencido" 
                              className={`w-2.5 h-2.5 rounded-full transition ${
                                isExpired ? 'bg-rose-500 shadow-sm shadow-rose-500 animate-pulse' : 'bg-rose-950/60 opacity-30'
                              }`} 
                            />
                            {/* Luz Amarilla */}
                            <span 
                              title="Amarillo: Próximo a vencer (1-30 días)" 
                              className={`w-2.5 h-2.5 rounded-full transition ${
                                isExpiringSoon ? 'bg-amber-400 shadow-sm shadow-amber-400 animate-pulse' : 'bg-amber-950/60 opacity-30'
                              }`} 
                            />
                            {/* Luz Verde */}
                            <span 
                              title="Verde: Vigente (>30 días)" 
                              className={`w-2.5 h-2.5 rounded-full transition ${
                                isVigente ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-emerald-950/60 opacity-30'
                              }`} 
                            />
                          </div>

                          {/* Etiqueta Semáforo */}
                          <div>
                            {isExpired && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                <span>Rojo • Vencida</span>
                              </span>
                            )}
                            {isExpiringSoon && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                <span>Amarillo • Por Vencer</span>
                              </span>
                            )}
                            {isVigente && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <span>Verde • Vigente</span>
                              </span>
                            )}
                            <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                              {statusInfo.formattedLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 7. Unidad Habitualmente Asignada */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                            <Bus className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs block">
                              {lic.assignedUnit || 'Sin Asignar'}
                            </span>
                            {lic.notes && (
                              <span className="text-[10px] text-slate-400 block max-w-[140px] truncate" title={lic.notes}>
                                {lic.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 8. Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Botón Renovar */}
                          <button
                            onClick={() => setRenewingLicense(lic)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition shadow-sm"
                            title="Renovar vigencia de la licencia"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Renovar</span>
                          </button>

                          {/* Botón Editar */}
                          <button
                            onClick={() => setEditingLicense(lic)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Editar datos"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            onClick={() => setDeletingLicense(lic)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Modals */}
      {/* Create Modal */}
      {showCreateModal && (
        <LicenseFormModal
          referenceDate={selectedDate}
          onClose={() => setShowCreateModal(false)}
          onSave={(data) => {
            addLicense(data);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingLicense && (
        <LicenseFormModal
          license={editingLicense}
          referenceDate={selectedDate}
          onClose={() => setEditingLicense(null)}
          onSave={(data) => {
            updateLicense(editingLicense.id, data);
            setEditingLicense(null);
          }}
        />
      )}

      {/* Renew Modal */}
      {renewingLicense && (
        <RenewLicenseModal
          license={renewingLicense}
          referenceDate={selectedDate}
          onClose={() => setRenewingLicense(null)}
          onRenew={(id, newExpiry, notes) => {
            renewLicense(id, newExpiry, notes);
            setRenewingLicense(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingLicense && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">¿Eliminar registro de licencia?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Estás a punto de eliminar la licencia <b className="font-mono text-white">{deletingLicense.licenseNumber}</b> perteneciente al conductor <b>{deletingLicense.firstName} {deletingLicense.lastName}</b> ({deletingLicense.department}). Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingLicense(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteLicense(deletingLicense.id);
                  setDeletingLicense(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-600/30"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
