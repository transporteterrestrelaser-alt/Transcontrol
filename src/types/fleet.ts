export type VehicleType = 'Autobús' | 'Minibús' | 'Van' | 'Microbús' | 'Camioneta';

export interface Vehicle {
  id: string;
  unitNumber: string; // e.g. "UN-101", "BUS-04"
  licensePlate: string;
  type: VehicleType;
  model: string;
  year: number;
  capacity: number; // Pasajeros sentados
  mileage: number; // Kilometraje
  fuelType: 'Diésel' | 'Gasolina' | 'Gas (GNV)' | 'Eléctrico';
  active: boolean;
  notes?: string;
  photoUrl?: string;
  inoperativeSince?: string; // e.g. "2026-09-26"
  inoperativeDays?: number; // e.g. 13
}

export type UnitOperationalStatus = 'OPERATIVA' | 'INOPERATIVA' | 'EN_OBSERVACION';

export interface DailyVehicleStatus {
  id: string;
  date: string; // YYYY-MM-DD
  unitId: string;
  unitNumber: string;
  status: UnitOperationalStatus;
  reason?: string; // Motivo de inoperatividad o falla
  inoperativeSince?: string; // Fecha de inicio de inoperatividad
  inoperativeDays?: number; // Días transcurridos fuera de servicio
  maintenanceReportId?: string; // ID del reporte de falla si aplica
  notes?: string;
  mileageStart?: number;
  operatorName?: string; // Chofer o responsable asignado para ese día
  driverId?: string;
  updatedAt: string;
}

export type FailureCategory = 
  | 'MECANICA'
  | 'ELECTRICA'
  | 'FRENOS'
  | 'MOTOR'
  | 'NEUMATICOS'
  | 'TRANSMISION'
  | 'CLIMATIZACION'
  | 'SUSPENSION'
  | 'CARROCERIA'
  | 'SISTEMA_COMBUSTIBLE'
  | 'PREVENTIVO'
  | 'OTRO';

export type FailurePriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

export type MaintenanceStatus = 'ABIERTA' | 'EN_TALLER' | 'ESPERA_REPUESTOS' | 'SOLUCIONADO';

export interface MaintenanceReport {
  id: string;
  unitId: string;
  unitNumber: string;
  licensePlate: string;
  reportDate: string; // YYYY-MM-DDTHH:mm (Fecha y hora de detección/reporte)
  reporterName: string; // Chofer o inspector que reporta
  category: FailureCategory;
  priority: FailurePriority;
  description: string;
  status: MaintenanceStatus;
  
  // Taller y Solución
  workshopEntryDate?: string; // YYYY-MM-DDTHH:mm (Ingreso a taller)
  mechanicAssigned?: string; // Taller mecánico / Técnico
  diagnosticNotes?: string; // Diagnóstico técnico
  solutionActions?: string; // Trabajos realizados y solución
  partsReplaced?: string; // Repuestos cambiados
  estimatedCost?: number; // Costo estimado / reparación
  solutionDate?: string; // YYYY-MM-DDTHH:mm (Fecha y hora de solución y entrega)
  
  // Tiempo fuera de servicio
  downtimeMinutes?: number; // Calculado
}

export interface Driver {
  id: string;
  fullName: string;
  documentId: string; // DNI / Cédula
  licenseNumber: string;
  licenseType: string; // e.g. "Cat. 5 / Profesional", "D"
  licenseExpiry: string; // YYYY-MM-DD
  phone: string;
  bloodType?: string;
  active: boolean;
  status: 'DISPONIBLE' | 'ASIGNADO' | 'DESCANSO' | 'VACACIONES' | 'MEDICO';
}

export type ShiftType = 'MANANA' | 'TARDE' | 'NOCHE' | 'COMPLETO' | 'ESPECIAL';

export interface DailyDriverAssignment {
  id: string;
  date: string; // YYYY-MM-DD
  unitId: string;
  unitNumber: string;
  driverId: string;
  driverName: string;
  shift: ShiftType;
  route: string; // e.g. "Ruta Norte - Turno 1 (Planta Central)"
  departureTime?: string; // e.g. "06:00"
  returnTime?: string; // e.g. "15:00"
  passengersEstimated?: number;
  driverPhone?: string;
  licenseNumber?: string;
  notes?: string;
  status?: 'PROGRAMADA' | 'EN_RUTA' | 'EN_CURSO' | 'COMPLETADA' | 'CANCELADA';
  assignedAt?: string;
}

export type LicenseStatus = 'VIGENTE' | 'POR_VENCER' | 'VENCIDA';

export interface DriverLicense {
  id: string;
  licenseNumber: string; // Número de Licencia
  issueDate?: string;     // Fecha de Emisión YYYY-MM-DD
  expiryDate: string;    // Fecha de Vencimiento YYYY-MM-DD
  department: string;    // Departamento (ej. Transporte Terrestre, Operaciones, Estación Maracay, etc.)
  firstName: string;     // Nombre
  lastName: string;      // Apellido
  documentId?: string;   // Cédula / DNI (ej. V-15.890.123)
  category?: string;     // Grado / Categoría (ej. 5to Grado Profesional, 4to Grado, etc.)
  phone?: string;        // Teléfono de contacto
  assignedUnit?: string; // Unidad asignada o habitual (ej. Unidad 23)
  notes?: string;        // Observaciones adicionales
  createdAt?: string;
  updatedAt?: string;
}
