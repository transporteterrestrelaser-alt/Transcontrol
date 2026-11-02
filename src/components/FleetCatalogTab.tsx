import React, { useState } from 'react';
import { 
  Bus, 
  Users, 
  PlusCircle, 
  Search, 
  Trash2, 
  Edit2, 
  AlertCircle, 
  CheckCircle2, 
  Fuel,
  Camera,
  Clock,
  FileText,
  Wrench,
  ArrowRight,
  Gauge
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { Vehicle, VehicleType } from '../types/fleet';
import { formatDate, calculateInoperativeDays, CATEGORY_LABELS } from '../utils/timeUtils';
import { VehiclePhotoModal } from './VehiclePhotoModal';
import { VehicleDossierModal } from './VehicleDossierModal';
import { getUnitDefaultPhoto } from '../utils/imageUtils';

interface FleetCatalogTabProps {
  onViewUnitDossier?: (unitId: string) => void;
}

export const FleetCatalogTab: React.FC<FleetCatalogTabProps> = ({
  onViewUnitDossier,
}) => {
  const { 
    vehicles, 
    addVehicle, 
    updateVehicle, 
    updateVehiclePhoto,
    deleteVehicle, 
    selectedDate,
    getUnitStatusForDate,
    getUnitLatestFailure,
  } = useFleet();

  const [search, setSearch] = useState('');
  const [photoModalVehicle, setPhotoModalVehicle] = useState<Vehicle | null>(null);
  const [selectedDossierVehicle, setSelectedDossierVehicle] = useState<Vehicle | null>(null);

  // Vehicle Modal
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [unitNumber, setUnitNumber] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehType, setVehType] = useState<VehicleType>('Autobús');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(2022);
  const [capacity, setCapacity] = useState<number>(40);
  const [mileage, setMileage] = useState<number>(100000);
  const [fuelType, setFuelType] = useState<'Diésel' | 'Gasolina' | 'Gas (GNV)' | 'Eléctrico'>('Diésel');
  const [vehNotes, setVehNotes] = useState('');

  // Filtered vehicles
  const filteredVehicles = vehicles.filter(v => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.unitNumber.toLowerCase().includes(q) ||
      v.licensePlate.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      v.type.toLowerCase().includes(q)
    );
  });

  const handleOpenNewVehicle = () => {
    setEditingVehicleId(null);
    setUnitNumber(`UN-${vehicles.length + 1}`);
    setLicensePlate('');
    setVehType('Autobús');
    setModel('');
    setYear(new Date().getFullYear());
    setCapacity(40);
    setMileage(0);
    setFuelType('Diésel');
    setVehNotes('');
    setShowVehicleModal(true);
  };

  const handleEditVehicle = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setUnitNumber(v.unitNumber);
    setLicensePlate(v.licensePlate);
    setVehType(v.type);
    setModel(v.model);
    setYear(v.year);
    setCapacity(v.capacity);
    setMileage(v.mileage);
    setFuelType(v.fuelType);
    setVehNotes(v.notes || '');
    setShowVehicleModal(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicleId) {
      updateVehicle(editingVehicleId, {
        unitNumber,
        licensePlate: licensePlate.toUpperCase(),
        type: vehType,
        model,
        year,
        capacity,
        mileage,
        fuelType,
        notes: vehNotes,
      });
    } else {
      addVehicle({
        unitNumber,
        licensePlate: licensePlate.toUpperCase(),
        type: vehType,
        model,
        year,
        capacity,
        mileage,
        fuelType,
        active: true,
        notes: vehNotes,
      });
    }
    setShowVehicleModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-amber-400 font-bold uppercase tracking-wider text-xs">
              Catálogo de Flota
            </span>
            <h2 className="text-xl font-bold text-white mt-1">
              Parque Automotor y Unidades de Transporte
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Administra las especificaciones técnicas, capacidad de pasajeros, fichas y estado de las unidades.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewVehicle}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Registrar Nueva Unidad</span>
            </button>
          </div>
        </div>

        {/* Search bar & Counts */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Bus className="w-4 h-4 text-amber-400" />
            <span>Total de Unidades Registradas: <b className="text-white font-bold">{vehicles.length}</b></span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">{vehicles.filter(v => v.active).length} activas</span>
          </div>

          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por unidad, placa, tipo o modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map(veh => {
          const st = getUnitStatusForDate(veh.id, selectedDate);
          const isInoperative = st.status === 'INOPERATIVA';
          const isObservation = st.status === 'EN_OBSERVACION';
          const inopCalc = calculateInoperativeDays(
            st.inoperativeSince || veh.inoperativeSince || st.reason || veh.notes,
            selectedDate
          );
          const latestFailure = getUnitLatestFailure(veh.id) || getUnitLatestFailure(veh.unitNumber);

          return (
            <div
              key={veh.id}
              className={`bg-slate-900 border rounded-2xl p-4 shadow-md flex flex-col justify-between text-xs space-y-4 hover:border-slate-700 transition ${
                isInoperative ? 'border-rose-900/60' : isObservation ? 'border-amber-900/60' : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPhotoModalVehicle(veh)}
                      className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0 hover:border-amber-400 transition"
                      title="Ver / cambiar foto"
                    >
                      <img
                        src={veh.photoUrl || getUnitDefaultPhoto(veh.unitNumber)}
                        alt={veh.unitNumber}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (onViewUnitDossier) {
                              onViewUnitDossier(veh.id);
                            } else {
                              setSelectedDossierVehicle(veh);
                            }
                          }}
                          className="font-black text-base text-white hover:text-amber-400 transition cursor-pointer text-left"
                          title="Abrir Ficha Técnica"
                        >
                          {veh.unitNumber}
                        </button>
                        <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 border border-slate-800">
                          {veh.licensePlate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">{veh.model}</p>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {veh.type} • Año {veh.year}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 ${
                    st.status === 'OPERATIVA'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : st.status === 'EN_OBSERVACION'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {st.status === 'OPERATIVA' ? 'Operativa' : st.status === 'EN_OBSERVACION' ? 'Con Condición' : 'En Taller'}
                  </span>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      <span>Capacidad:</span>
                    </span>
                    <b className="text-white">{veh.capacity} pax</b>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-amber-400" />
                      <span>Combustible:</span>
                    </span>
                    <b className="text-white">{veh.fuelType}</b>
                  </div>
                  <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800 col-span-2">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      <span>Odómetro:</span>
                    </span>
                    <b className="font-mono text-slate-200">{veh.mileage.toLocaleString()} km</b>
                  </div>
                </div>

                {/* Status & Latest failure summary */}
                <div className="mt-3">
                  {isInoperative ? (
                    <div className="bg-rose-950/30 border border-rose-900/40 rounded-xl p-2.5 text-[11px] text-rose-300">
                      <div className="flex items-center justify-between font-bold mb-1">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                          <span>Fuera de Servicio</span>
                        </span>
                        <span className="font-mono text-rose-200">{inopCalc.formatted}</span>
                      </div>
                      <p className="text-rose-200 italic line-clamp-1">
                        "{st.reason || 'En revisión en taller mecánico'}"
                      </p>
                    </div>
                  ) : latestFailure ? (
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-[11px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-400 flex items-center gap-1 font-bold">
                          <Wrench className="w-3 h-3 text-amber-400" />
                          <span>Falla Reciente ({CATEGORY_LABELS[latestFailure.category] || latestFailure.category}):</span>
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                          latestFailure.status === 'SOLUCIONADO' ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                        }`}>
                          {latestFailure.status}
                        </span>
                      </div>
                      <p className="text-slate-300 italic line-clamp-1">
                        "{latestFailure.description}"
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Sin fallas mecánicas registradas</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onViewUnitDossier) {
                        onViewUnitDossier(veh.id);
                      } else {
                        setSelectedDossierVehicle(veh);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
                    title="Abrir Ficha Técnica Completa y Hoja de Vida"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Ficha Técnica</span>
                  </button>

                  <button
                    onClick={() => setPhotoModalVehicle(veh)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 text-xs font-semibold transition border border-slate-700"
                    title="Ver o cambiar foto de la unidad"
                  >
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Foto</span>
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEditVehicle(veh)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                    title="Editar especificaciones de la unidad"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar la unidad ${veh.unitNumber}?`)) {
                        deleteVehicle(veh.id);
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                    title="Eliminar unidad"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredVehicles.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center col-span-full">
            <Bus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No se encontraron unidades</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Prueba con otro término de búsqueda o registra una nueva unidad de transporte.
            </p>
            <button
              onClick={handleOpenNewVehicle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Registrar Unidad</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Vehicle Create / Edit */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingVehicleId ? 'Editar Unidad de Flota' : 'Registrar Nueva Unidad de Transporte'}
              </h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVehicle} className="space-y-4 mt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Número de Unidad <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder="Ej: UN-101"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Placa / Matrícula <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="Ej: AB123CD"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Tipo de Vehículo
                  </label>
                  <select
                    value={vehType}
                    onChange={(e) => setVehType(e.target.value as VehicleType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="Autobús">Autobús</option>
                    <option value="Minibús">Minibús</option>
                    <option value="Van">Van</option>
                    <option value="Microbús">Microbús</option>
                    <option value="Camioneta">Camioneta</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Modelo / Fabricante <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="Ej: Mercedes-Benz Sprinter 515"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Año
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value) || 2022)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Capacidad (Pax)
                  </label>
                  <input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Combustible
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                  >
                    <option value="Diésel">Diésel</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Gas (GNV)">Gas (GNV)</option>
                    <option value="Eléctrico">Eléctrico</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Odómetro / Kilometraje
                </label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Observaciones Técnicas de Ficha
                </label>
                <textarea
                  rows={2}
                  value={vehNotes}
                  onChange={(e) => setVehNotes(e.target.value)}
                  placeholder="Detalles sobre motor, condiciones de carrocería o rutas habituales..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition shadow-lg shadow-amber-500/20"
                >
                  Guardar Unidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Photo Modal */}
      {photoModalVehicle && (
        <VehiclePhotoModal
          vehicle={photoModalVehicle}
          onClose={() => setPhotoModalVehicle(null)}
          onSavePhoto={(vehId, photoUrl) => {
            updateVehiclePhoto(vehId, photoUrl);
            setPhotoModalVehicle(null);
          }}
        />
      )}

      {/* Vehicle Dossier / Technical Sheet Modal (Ficha de la Unidad) */}
      {selectedDossierVehicle && (
        <VehicleDossierModal
          vehicle={selectedDossierVehicle}
          onClose={() => setSelectedDossierVehicle(null)}
          onOpenPhotoModal={(v) => {
            setSelectedDossierVehicle(null);
            setPhotoModalVehicle(v);
          }}
        />
      )}
    </div>
  );
};
