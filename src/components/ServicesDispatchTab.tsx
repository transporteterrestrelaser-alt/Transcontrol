import React, { useState, useMemo } from 'react';
import { 
  Route as RouteIcon, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Bus, 
  User, 
  CheckCircle2, 
  PlayCircle, 
  AlertCircle, 
  XCircle, 
  Phone, 
  Filter, 
  Edit3, 
  Trash2, 
  FileText, 
  Printer, 
  ChevronRight,
  ArrowRight,
  Sparkles,
  Users,
  Compass,
  X
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { DailyDriverAssignment, ShiftType } from '../types/fleet';
import { formatDate } from '../utils/timeUtils';

type ServiceStatusFilter = 'ALL' | 'PROGRAMADA' | 'EN_RUTA' | 'COMPLETADA' | 'CANCELADA';

export const ServicesDispatchTab: React.FC = () => {
  const { 
    vehicles, 
    drivers, 
    dailyAssignments, 
    addAssignment, 
    updateAssignment, 
    deleteAssignment,
    selectedDate: appDate,
    setSelectedDate: setAppDate 
  } = useFleet();

  const [filterDate, setFilterDate] = useState<string>(appDate);
  const [statusFilter, setStatusFilter] = useState<ServiceStatusFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showNewOrderModal, setShowNewOrderModal] = useState<boolean>(false);
  const [editingAssignment, setEditingAssignment] = useState<DailyDriverAssignment | null>(null);

  // Form state for New / Edit Service Order
  const [formData, setFormData] = useState({
    date: appDate,
    unitId: '',
    driverId: '',
    route: '',
    shift: 'COMPLETO' as ShiftType,
    departureTime: '06:00',
    returnTime: '15:00',
    passengersEstimated: 24,
    notes: '',
    status: 'PROGRAMADA' as 'PROGRAMADA' | 'EN_RUTA' | 'COMPLETADA' | 'CANCELADA',
  });

  const [formError, setFormError] = useState<string>('');

  // Synchronize filterDate with appDate if needed
  const handleDateChange = (date: string) => {
    setFilterDate(date);
    setAppDate(date);
  };

  // Filtered Services List
  const filteredServices = useMemo(() => {
    return dailyAssignments.filter(assignment => {
      // 1. Filter by Date
      if (filterDate && assignment.date !== filterDate) {
        return false;
      }

      // 2. Filter by Status
      if (statusFilter !== 'ALL') {
        const normalizedStatus = assignment.status === 'EN_CURSO' ? 'EN_RUTA' : (assignment.status || 'PROGRAMADA');
        if (normalizedStatus !== statusFilter) {
          return false;
        }
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchRoute = (assignment.route || '').toLowerCase().includes(q);
        const matchDriver = (assignment.driverName || '').toLowerCase().includes(q);
        const matchUnit = (assignment.unitNumber || '').toLowerCase().includes(q);
        const matchId = (assignment.id || '').toLowerCase().includes(q);
        const matchNotes = (assignment.notes || '').toLowerCase().includes(q);

        if (!matchRoute && !matchDriver && !matchUnit && !matchId && !matchNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort by departure time ascending
      const timeA = a.departureTime || '00:00';
      const timeB = b.departureTime || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [dailyAssignments, filterDate, statusFilter, searchTerm]);

  // Summary Metrics for the Selected Date
  const dateServices = useMemo(() => {
    return dailyAssignments.filter(a => a.date === filterDate);
  }, [dailyAssignments, filterDate]);

  const serviceMetrics = useMemo(() => {
    let programados = 0;
    let enRuta = 0;
    let completados = 0;
    let cancelados = 0;
    let totalPassengers = 0;

    dateServices.forEach(srv => {
      const st = srv.status === 'EN_CURSO' ? 'EN_RUTA' : (srv.status || 'PROGRAMADA');
      if (st === 'EN_RUTA') enRuta++;
      else if (st === 'COMPLETADA') completados++;
      else if (st === 'CANCELADA') cancelados++;
      else programados++;

      totalPassengers += (srv.passengersEstimated || 0);
    });

    return {
      total: dateServices.length,
      programados,
      enRuta,
      completados,
      cancelados,
      totalPassengers,
    };
  }, [dateServices]);

  // Open modal for new order
  const handleOpenNewOrder = () => {
    const defaultUnit = vehicles.find(v => v.active) || vehicles[0];
    const defaultDriver = drivers.find(d => d.active) || drivers[0];

    setFormData({
      date: filterDate,
      unitId: defaultUnit ? defaultUnit.id : '',
      driverId: defaultDriver ? defaultDriver.id : '',
      route: 'Ruta Transporte de Personal - Turno Principal',
      shift: 'COMPLETO',
      departureTime: '06:00',
      returnTime: '15:30',
      passengersEstimated: defaultUnit?.capacity || 24,
      notes: '',
      status: 'PROGRAMADA',
    });
    setFormError('');
    setEditingAssignment(null);
    setShowNewOrderModal(true);
  };

  // Open modal for editing order
  const handleOpenEdit = (assignment: DailyDriverAssignment) => {
    setEditingAssignment(assignment);
    const normalizedStatus = assignment.status === 'EN_CURSO' ? 'EN_RUTA' : (assignment.status || 'PROGRAMADA');
    setFormData({
      date: assignment.date,
      unitId: assignment.unitId,
      driverId: assignment.driverId,
      route: assignment.route,
      shift: assignment.shift,
      departureTime: assignment.departureTime || '06:00',
      returnTime: assignment.returnTime || '15:00',
      passengersEstimated: assignment.passengersEstimated || 20,
      notes: assignment.notes || '',
      status: normalizedStatus,
    });
    setFormError('');
    setShowNewOrderModal(true);
  };

  // Quick Status change from table
  const handleQuickStatusChange = (id: string, newStatus: 'PROGRAMADA' | 'EN_RUTA' | 'COMPLETADA' | 'CANCELADA') => {
    updateAssignment(id, { status: newStatus });
  };

  // Save order form
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.route.trim()) {
      setFormError('Por favor especifica la ruta o destino del traslado.');
      return;
    }

    const selectedVehicle = vehicles.find(v => v.id === formData.unitId);
    const selectedDriver = drivers.find(d => d.id === formData.driverId);

    const unitNumber = selectedVehicle ? selectedVehicle.unitNumber : 'Unidad S/N';
    const driverName = selectedDriver ? selectedDriver.fullName : 'Chofer Asignado';
    const driverPhone = selectedDriver?.phone;
    const licenseNumber = selectedDriver?.licenseNumber;

    if (editingAssignment) {
      updateAssignment(editingAssignment.id, {
        date: formData.date,
        unitId: formData.unitId,
        unitNumber,
        driverId: formData.driverId,
        driverName,
        shift: formData.shift,
        route: formData.route,
        departureTime: formData.departureTime,
        returnTime: formData.returnTime,
        passengersEstimated: Number(formData.passengersEstimated) || 0,
        driverPhone,
        licenseNumber,
        notes: formData.notes,
        status: formData.status,
      });
    } else {
      addAssignment({
        date: formData.date,
        unitId: formData.unitId,
        unitNumber,
        driverId: formData.driverId,
        driverName,
        shift: formData.shift,
        route: formData.route,
        departureTime: formData.departureTime,
        returnTime: formData.returnTime,
        passengersEstimated: Number(formData.passengersEstimated) || 0,
        driverPhone,
        licenseNumber,
        notes: formData.notes,
        status: formData.status,
        assignedAt: new Date().toISOString(),
      });
    }

    setShowNewOrderModal(false);
  };

  const getStatusBadge = (status?: string) => {
    const s = status === 'EN_CURSO' ? 'EN_RUTA' : (status || 'PROGRAMADA');
    switch (s) {
      case 'EN_RUTA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse shadow-sm shadow-emerald-950">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            En Ruta
          </span>
        );
      case 'COMPLETADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            Completado
          </span>
        );
      case 'CANCELADA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Cancelado
          </span>
        );
      case 'PROGRAMADA':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Programado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold uppercase tracking-wider mb-2">
              <RouteIcon className="w-3.5 h-3.5" />
              <span>Módulo 2 • Operaciones y Traslados</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              Gestiones y Servicios de Flota
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Programación, despacho y control operativo de rutas en tiempo real. Gestiona unidades vehiculares, operadores asignados y el estatus del recorrido.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-200 shadow-inner">
              <Calendar className="w-4 h-4 text-amber-400" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
              />
            </div>

            {/* New Order Button */}
            <button
              onClick={handleOpenNewOrder}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-lg shadow-amber-500/25 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Orden de Servicio</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Counters for the day */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`bg-slate-900 border rounded-2xl p-4 transition cursor-pointer hover:border-slate-700 ${
            statusFilter === 'ALL' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Total Servicios</span>
            <RouteIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{serviceMetrics.total}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">{formatDate(filterDate)}</p>
        </div>

        {/* En Ruta */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'EN_RUTA' ? 'ALL' : 'EN_RUTA')}
          className={`bg-slate-900 border rounded-2xl p-4 transition cursor-pointer hover:border-emerald-500/50 ${
            statusFilter === 'EN_RUTA' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-950/20' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs font-bold">
            <span>En Ruta (Activos)</span>
            <PlayCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{serviceMetrics.enRuta}</div>
          <p className="text-[11px] text-emerald-500/80 mt-0.5">Operando en este momento</p>
        </div>

        {/* Programados */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'PROGRAMADA' ? 'ALL' : 'PROGRAMADA')}
          className={`bg-slate-900 border rounded-2xl p-4 transition cursor-pointer hover:border-amber-500/50 ${
            statusFilter === 'PROGRAMADA' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-950/20' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-xs font-bold">
            <span>Programados</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">{serviceMetrics.programados}</div>
          <p className="text-[11px] text-amber-500/80 mt-0.5">Pendientes por iniciar</p>
        </div>

        {/* Completados */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'COMPLETADA' ? 'ALL' : 'COMPLETADA')}
          className={`bg-slate-900 border rounded-2xl p-4 transition cursor-pointer hover:border-blue-500/50 ${
            statusFilter === 'COMPLETADA' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-950/20' : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-blue-400 text-xs font-bold">
            <span>Completados</span>
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-400">{serviceMetrics.completados}</div>
          <p className="text-[11px] text-blue-500/80 mt-0.5">Rutas culminadas</p>
        </div>

        {/* Pasajeros Estimados */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
            <span>Pasajeros Total</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-indigo-400">{serviceMetrics.totalPassengers}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Demanda proyectada</p>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ID, ruta/destino, unidad o conductor..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({dateServices.length})
          </button>
          <button
            onClick={() => setStatusFilter('EN_RUTA')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'EN_RUTA'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-emerald-400 hover:bg-emerald-950/30 border border-emerald-900/40'
            }`}
          >
            En Ruta ({serviceMetrics.enRuta})
          </button>
          <button
            onClick={() => setStatusFilter('PROGRAMADA')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'PROGRAMADA'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-amber-400 hover:bg-amber-950/30 border border-amber-900/40'
            }`}
          >
            Programados ({serviceMetrics.programados})
          </button>
          <button
            onClick={() => setStatusFilter('COMPLETADA')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              statusFilter === 'COMPLETADA'
                ? 'bg-blue-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 text-blue-400 hover:bg-blue-950/30 border border-blue-900/40'
            }`}
          >
            Completados ({serviceMetrics.completados})
          </button>
        </div>
      </div>

      {/* 4. Services Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <RouteIcon className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white">No hay servicios programados para esta fecha</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No se encontraron traslados con los filtros seleccionados para el día {formatDate(filterDate)}.
            </p>
            <button
              onClick={handleOpenNewOrder}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Primera Orden</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                  <th className="py-4 px-4 font-bold">ID / Turno</th>
                  <th className="py-4 px-4 font-bold">Ruta / Destino</th>
                  <th className="py-4 px-4 font-bold">Unidad Vehicular</th>
                  <th className="py-4 px-4 font-bold">Conductor Asignado</th>
                  <th className="py-4 px-4 font-bold">Horario Programado</th>
                  <th className="py-4 px-4 font-bold">Estatus del Servicio</th>
                  <th className="py-4 px-4 font-bold">Observaciones / Novedades</th>
                  <th className="py-4 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredServices.map(srv => {
                  const normalizedStatus = srv.status === 'EN_CURSO' ? 'EN_RUTA' : (srv.status || 'PROGRAMADA');
                  const vehicle = vehicles.find(v => v.id === srv.unitId || v.unitNumber.toLowerCase() === srv.unitNumber.toLowerCase());

                  return (
                    <tr 
                      key={srv.id}
                      className="hover:bg-slate-800/40 transition group"
                    >
                      {/* ID / Turno */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-amber-400 text-xs block">
                            {srv.id.length > 15 ? srv.id.substring(0, 15) + '...' : srv.id}
                          </span>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-slate-300 border border-slate-700">
                            {srv.shift || 'COMPLETO'}
                          </span>
                        </div>
                      </td>

                      {/* Ruta / Destino */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-xs">
                          <div className="font-extrabold text-white text-xs flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="truncate">{srv.route}</span>
                          </div>
                          {srv.passengersEstimated && (
                            <span className="text-[11px] text-slate-400 block">
                              Cupos est.: <b>{srv.passengersEstimated} pasajeros</b>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Unidad Asignada */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shrink-0">
                            <Bus className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs block">{srv.unitNumber}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {vehicle ? `${vehicle.model} • ${vehicle.licensePlate}` : 'Flota Activa'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Conductor Asignado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white text-xs flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{srv.driverName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            {srv.driverPhone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="w-3 h-3 text-emerald-400" />
                                {srv.driverPhone}
                              </span>
                            )}
                            {srv.licenseNumber && (
                              <span className="font-mono text-slate-500">
                                Lic: {srv.licenseNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Horario Programado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>{srv.departureTime || '06:00'}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500" />
                            <span>{srv.returnTime || '15:30'}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            Salida y llegada estimada
                          </span>
                        </div>
                      </td>

                      {/* Estatus del Servicio con Selector Rápido */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div>{getStatusBadge(srv.status)}</div>
                          {/* Quick change dropdown */}
                          <select
                            value={normalizedStatus}
                            onChange={(e) => handleQuickStatusChange(srv.id, e.target.value as any)}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50 cursor-pointer"
                          >
                            <option value="PROGRAMADA">Programar</option>
                            <option value="EN_RUTA">Poner En Ruta</option>
                            <option value="COMPLETADA">Completar</option>
                            <option value="CANCELADA">Cancelar</option>
                          </select>
                        </div>
                      </td>

                      {/* Observaciones o Novedades */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-xs">
                          {srv.notes ? (
                            <p className="text-slate-300 text-xs italic bg-slate-950/50 p-2 rounded-xl border border-slate-800/80 line-clamp-2">
                              "{srv.notes}"
                            </p>
                          ) : (
                            <span className="text-slate-500 text-xs italic">Sin novedades registradas</span>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(srv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                            title="Editar Orden de Servicio"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Deseas eliminar la orden de servicio ${srv.id}?`)) {
                                deleteAssignment(srv.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                            title="Eliminar Orden"
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

      {/* 5. Modal: Nueva / Editar Orden de Servicio */}
      {showNewOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  <RouteIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingAssignment ? 'Modificar Orden de Servicio' : 'Nueva Orden de Servicio / Traslado'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Despacho operativo de ruta vehicular para {formatDate(formData.date)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewOrderModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveOrder} className="p-6 overflow-y-auto space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Fecha y Turno */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Fecha del Servicio *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Turno Operativo *
                  </label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as ShiftType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="MANANA">Turno Mañana</option>
                    <option value="TARDE">Turno Tarde</option>
                    <option value="NOCHE">Turno Noche</option>
                    <option value="COMPLETO">Turno Completo</option>
                    <option value="ESPECIAL">Servicio Especial</option>
                  </select>
                </div>
              </div>

              {/* Unidad y Conductor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Unidad Vehicular Asignada *
                  </label>
                  <select
                    value={formData.unitId}
                    onChange={(e) => {
                      const v = vehicles.find(veh => veh.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        unitId: e.target.value,
                        passengersEstimated: v?.capacity || formData.passengersEstimated 
                      });
                    }}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="">Selecciona una unidad...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.unitNumber} ({v.model} - {v.capacity} puestos - {v.licensePlate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Conductor / Chofer Asignado *
                  </label>
                  <select
                    value={formData.driverId}
                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="">Selecciona un chofer...</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.fullName} ({d.documentId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ruta / Destino */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Ruta / Destino Programado *
                </label>
                <input
                  type="text"
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  placeholder="ej. Ruta Norte - Turno 1 (Planta Central)"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">Rutas rápidas:</span>
                  {[
                    'Ruta Regular Transporte de Personal',
                    'Ruta Norte - Turno 1 (Planta)',
                    'Estación Maracay - Central',
                    'Ruta de Apoyo Operativo',
                    'Traslado Corporativo Especial',
                  ].map(r => (
                    <button
                      type="button"
                      key={r}
                      onClick={() => setFormData({ ...formData, route: r })}
                      className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700 transition"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Horarios & Pasajeros */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Hora Salida
                  </label>
                  <input
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Hora Retorno
                  </label>
                  <input
                    type="time"
                    value={formData.returnTime}
                    onChange={(e) => setFormData({ ...formData, returnTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Pasajeros Estimados
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.passengersEstimated}
                    onChange={(e) => setFormData({ ...formData, passengersEstimated: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>
              </div>

              {/* Estatus Inicial */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Estatus del Servicio
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'PROGRAMADA', label: 'Programado', color: 'border-amber-500/40 text-amber-300' },
                    { key: 'EN_RUTA', label: 'En Ruta', color: 'border-emerald-500/40 text-emerald-300' },
                    { key: 'COMPLETADA', label: 'Completado', color: 'border-blue-500/40 text-blue-300' },
                    { key: 'CANCELADA', label: 'Cancelado', color: 'border-rose-500/40 text-rose-300' },
                  ].map(st => (
                    <button
                      type="button"
                      key={st.key}
                      onClick={() => setFormData({ ...formData, status: st.key as any })}
                      className={`p-2 rounded-xl text-xs font-bold border transition text-center ${
                        formData.status === st.key
                          ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-md'
                          : `bg-slate-950 ${st.color} hover:bg-slate-800`
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Observaciones o Novedades */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Observaciones o Novedades de la Ruta
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ej. Relevo de turno, requerimiento de combustible previo, parada adicional autorizada..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition"
                >
                  {editingAssignment ? 'Guardar Cambios' : 'Despachar Orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
