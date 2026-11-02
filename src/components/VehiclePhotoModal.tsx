import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  X, 
  Check, 
  RotateCcw, 
  Trash2, 
  Image as ImageIcon,
  Loader2,
  Bus,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { Vehicle } from '../types/fleet';
import { 
  removeImageBackground, 
  getUnitDefaultPhoto, 
  OFFICIAL_UNIT_PHOTOS 
} from '../utils/imageUtils';
import { calculateInoperativeDays } from '../utils/timeUtils';

interface VehiclePhotoModalProps {
  vehicle: Vehicle;
  onClose: () => void;
  onSavePhoto: (vehicleId: string, photoUrl: string | undefined) => void;
  defaultSvgUrl?: string;
}

export const VehiclePhotoModal: React.FC<VehiclePhotoModalProps> = ({
  vehicle,
  onClose,
  onSavePhoto,
  defaultSvgUrl,
}) => {
  const officialDefault = defaultSvgUrl || getUnitDefaultPhoto(vehicle.unitNumber);
  const [currentPhoto, setCurrentPhoto] = useState<string | undefined>(
    vehicle.photoUrl || officialDefault
  );
  const [originalUploaded, setOriginalUploaded] = useState<string | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tolerance, setTolerance] = useState(35);
  const [tab, setTab] = useState<'PREVIEW' | 'GALLERY'>('PREVIEW');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setOriginalUploaded(dataUrl);
      setCurrentPhoto(dataUrl);
      setTab('PREVIEW');

      // Auto-trigger background removal for slide formats
      setIsProcessing(true);
      try {
        const cleaned = await removeImageBackground(dataUrl, tolerance);
        setCurrentPhoto(cleaned);
      } catch (err) {
        console.error('Error auto-cleaning image:', err);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleManualRemoveBackground = async () => {
    const src = originalUploaded || currentPhoto;
    if (!src) return;

    setIsProcessing(true);
    try {
      const cleaned = await removeImageBackground(src, tolerance);
      setCurrentPhoto(cleaned);
    } catch (err) {
      console.error('Error removing background:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreDefault = () => {
    setCurrentPhoto(officialDefault);
    setOriginalUploaded(undefined);
  };

  const handleSave = () => {
    onSavePhoto(vehicle.id, currentPhoto);
    onClose();
  };

  const inopInfo = calculateInoperativeDays(vehicle.inoperativeSince || vehicle.notes);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl relative my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Foto de {vehicle.unitNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {vehicle.licensePlate}
                  </span>
                </h3>
                {inopInfo.days > 0 && (
                  <span className="text-[10px] font-bold text-rose-300 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-800/60 font-mono">
                    {inopInfo.days} días inoperativa
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {vehicle.type} • {vehicle.capacity} pasajeros • Carga de foto y eliminación de fondo blanco
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch between preview / upload and gallery */}
        <div className="flex items-center gap-2 mt-4 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setTab('PREVIEW')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              tab === 'PREVIEW'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Vista y Edición de Foto</span>
          </button>
          <button
            onClick={() => setTab('GALLERY')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition flex items-center justify-center gap-1.5 ${
              tab === 'GALLERY'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bus className="w-4 h-4" />
            <span>Galería Oficial de Flota</span>
          </button>
        </div>

        {tab === 'PREVIEW' ? (
          <>
            {/* Photo Display Preview Box */}
            <div className="mt-4">
              <div className="relative w-full h-64 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/90 overflow-hidden flex items-center justify-center group shadow-inner">
                {/* Checkered pattern background to verify transparency */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: 'linear-gradient(45deg, #334155 25%, transparent 25%), linear-gradient(-45deg, #334155 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #334155 75%), linear-gradient(-45deg, transparent 75%, #334155 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                  }}
                />

                {isProcessing ? (
                  <div className="relative z-10 flex flex-col items-center gap-2 text-amber-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-xs font-bold text-slate-200">
                      Limpiando fondo blanco de diapositiva...
                    </span>
                  </div>
                ) : currentPhoto ? (
                  <img
                    src={currentPhoto}
                    alt={vehicle.unitNumber}
                    className="relative z-10 max-h-full max-w-full object-contain p-3 drop-shadow-2xl transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="relative z-10 flex flex-col items-center gap-2 text-slate-500">
                    <Bus className="w-12 h-12 stroke-[1.5]" />
                    <p className="text-xs font-medium text-slate-400">
                      Sin foto asignada para esta unidad
                    </p>
                  </div>
                )}

                {/* Quick Upload Hover Overlay */}
                <label
                  htmlFor="photoUploadInput"
                  className="absolute inset-0 z-20 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1.5 cursor-pointer backdrop-blur-xs text-xs font-bold text-white"
                >
                  <Upload className="w-6 h-6 text-amber-400" />
                  <span>Haz clic o arrastra para cargar archivo o diapositiva</span>
                </label>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              id="photoUploadInput"
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.JPG,.PNG"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Actions & Tools Bar */}
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Subir Foto / Diapositiva</span>
                </button>

                {/* Remove Background button */}
                {currentPhoto && (
                  <button
                    onClick={handleManualRemoveBackground}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold transition border border-purple-500/30 shadow-sm"
                    title="Elimina el fondo blanco de la diapositiva y recorta el vehículo"
                  >
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>Quitar Fondo Blanco</span>
                  </button>
                )}

                {/* Restore Default button */}
                <button
                  onClick={handleRestoreDefault}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-xs font-medium transition"
                  title="Restaurar ilustración oficial transparente"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restaurar Oficial</span>
                </button>

                {/* Clear Photo */}
                {currentPhoto && (
                  <button
                    onClick={() => setCurrentPhoto(undefined)}
                    className="p-2 rounded-xl bg-slate-800/60 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 text-xs transition"
                    title="Quitar foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tolerance Slider for Background Removal */}
              {originalUploaded && (
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span>Sensibilidad de blanco:</span>
                  </div>
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <input
                      type="range"
                      min="15"
                      max="65"
                      value={tolerance}
                      onChange={(e) => setTolerance(parseInt(e.target.value, 10))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <span className="font-mono text-slate-300 text-[11px] w-6">{tolerance}</span>
                  </div>
                  <button
                    onClick={handleManualRemoveBackground}
                    className="text-[11px] text-purple-400 hover:text-purple-300 font-bold underline"
                  >
                    Reaplicar
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Official Gallery Tab */
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-400">
              Selecciona una de las ilustraciones vectoriales oficiales de alta definición con fondo transparente:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {OFFICIAL_UNIT_PHOTOS.map((item) => {
                const isSelected = currentPhoto === item.url;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPhoto(item.url);
                      setOriginalUploaded(undefined);
                      setTab('PREVIEW');
                    }}
                    className={`p-2.5 rounded-xl border text-left flex flex-col items-center justify-between gap-2 transition ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-full h-20 flex items-center justify-center p-1">
                      <img src={item.url} alt={item.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="w-full text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-extrabold text-xs text-white">{item.name}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <span className="text-[10px] text-slate-400 block truncate">{item.type}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer Confirmation */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800">
          <div className="text-[11px] text-slate-500">
            Fondo transparente sin márgenes blancos
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Guardar Foto</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
