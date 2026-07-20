import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface LoginRequest {
  correo: string;
  clave: string;
}

export interface LoginResponse {
  idUser: number;
  correo: string;
  rol: 'PACIENTE' | 'MEDICO' | 'ENCARGADO_CITAS' | 'APROBADOR_DEVOLUCIONES' | 'CAJERO' | 'ADMIN';
  codigo: string | null;
  numDoc: string | null;
  nombreCompleto: string | null;
}

export interface Paciente {
  numDoc: string;
  tipoDoc: string;
  nombre: string;
  apellido: string;
  sexo: string;
  direccion: string;
}

export interface RegistroPacienteRequest extends Paciente {
  correo: string;
  clave: string;
}

export interface Especialidad {
  codEspe: number;
  nombre: string;
  precio?: number;
}

export interface Medico {
  codMed: string;
  nombre: string;
  apellido: string;
  especialidad: Especialidad;
}

export interface RegistroMedicoRequest {
  numDoc: string;
  nombre: string;
  apellido: string;
  codEspe: number;
  correo: string;
  clave: string;
}

export interface EncargadoCitas {
  codEncargado: string;
  numDoc: string;
  nombre: string;
  apellido: string;
}

export interface RegistroEncargadoRequest {
  numDoc: string;
  nombre: string;
  apellido: string;
  correo: string;
  clave: string;
}

export interface Empleado {
  codEmpleado: string;
  nombre: string;
  apellido: string;
  sexo?: string;
  tipoEmpleado: 'APROBADOR_DEVOLUCIONES' | 'CAJERO' | string;
  area: string;
}

export interface RegistroEmpleadoRequest extends Empleado {
  correo: string;
  clave: string;
}

export interface Horario {
  codHor: number;
  fecha: string;
  medico: Medico;
  encargadoCitas?: EncargadoCitas;
  consultorio?: string;
}

export interface CrearHorarioRequest {
  fecha: string;
  codMed: string;
  codEncargado?: string;
  consultorio?: string;
}

export interface Disponibilidad {
  codDis: number;
  horario: Horario;
  horaInicio: string;
  horaFin: string;
  estado: 'DISPONIBLE' | 'RESERVADO' | 'NO_DISPONIBLE';
}

export interface CrearDisponibilidadRequest {
  codHor: number;
  horaInicio: string;
  horaFin: string;
  estado?: string;
}

export interface CrearDisponibilidadRangoRequest {
  codHor: number;
  horaInicio: string;
  horaFin: string;
  duracionMinutos?: number;
}

export interface RangoDiaRequest {
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export interface CrearDisponibilidadMasivaRequest {
  codMed: string;
  codEncargado?: string;
  consultorio?: string;
  fechaInicio: string;
  fechaFin: string;
  mismaHora: boolean;
  horaInicio?: string;
  horaFin?: string;
  duracionMinutos?: number;
  dias?: RangoDiaRequest[];
}

export interface SolicitudMedica {
  idSolicitud: number;
  medico: Medico;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
}

export interface CrearSolicitudMedicaRequest {
  codMed: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

export interface CrearSolicitudMedicaRangoRequest {
  codMed: string;
  fechaInicio: string;
  fechaFin: string;
  mismaHora: boolean;
  horaInicio?: string;
  horaFin?: string;
  dias?: RangoDiaRequest[];
}

export interface Cita {
  codCita: number;
  estado: string;
  numDoc: string;
  paciente: string;
  correo: string;
  codDis: number;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  codMed: string;
  medico: string;
  especialidad: string;
  precioEspecialidad?: number;
  consultorio?: string;
  notificacionEnviada: boolean | null;
}

export interface ReasignarHorarioMedicoRequest {
  codMedOrigen: string;
  codMedDestino: string;
  fechas: string[];
}

export interface ReasignarHorarioMedicoResponse {
  bloquesReasignados: number;
  citasReasignadas: number;
  citas: Cita[];
}

export interface Pago {
  idPago: number;
  codCita: number;
  monto: number;
  metodoPago: string;
  numeroTarjeta?: string;
  referenciaPago?: string;
  estado: string;
  fechaPago: string;
}

export interface Devolucion {
  idSolicitud: number;
  codCita: number;
  idPago: number;
  paciente: string;
  medico: string;
  codMed: string;
  especialidad: string;
  codEspe: number;
  fechaCita: string;
  monto: number;
  metodoPago: string;
  numeroTarjetaPago?: string;
  numeroTarjetaDestino?: string;
  motivo?: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'DEVUELTA' | string;
  fechaSolicitud: string;
  fechaAprobacion?: string;
  fechaDevolucion?: string;
  aprobador?: string;
  cajero?: string;
  observacion?: string;
}

export interface FinanzasDashboard {
  ingresos: number;
  cancelaciones: number;
  devolucionesRealizadas: number;
  pagosRegistrados: number;
  solicitudesPendientes: number;
  solicitudesAprobadas: number;
  solicitudesDevueltas: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8080/api'
    : 'https://glistening-achievement-production-3321.up.railway.app/api';

  constructor(private http: HttpClient) {}

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, data);
  }

  registrarPaciente(data: RegistroPacienteRequest): Observable<Paciente> {
    return this.http.post<Paciente>(`${this.apiUrl}/pacientes`, data);
  }

  listarPacientes(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(`${this.apiUrl}/pacientes`);
  }

  listarEspecialidades(): Observable<Especialidad[]> {
    return this.http.get<Especialidad[]>(`${this.apiUrl}/especialidades`);
  }

  crearEspecialidad(nombre: string, precio?: number): Observable<Especialidad> {
    return this.http.post<Especialidad>(`${this.apiUrl}/especialidades`, { nombre, precio });
  }

  listarMedicos(codEspe?: number): Observable<Medico[]> {
    let params = new HttpParams();
    if (codEspe) {
      params = params.set('codEspe', codEspe);
    }
    return this.http.get<Medico[]>(`${this.apiUrl}/medicos`, { params });
  }

  registrarMedico(data: RegistroMedicoRequest): Observable<Medico> {
    return this.http.post<Medico>(`${this.apiUrl}/medicos`, data);
  }

  listarEncargados(): Observable<EncargadoCitas[]> {
    return this.http.get<EncargadoCitas[]>(`${this.apiUrl}/encargados-citas`);
  }

  registrarEncargado(data: RegistroEncargadoRequest): Observable<EncargadoCitas> {
    return this.http.post<EncargadoCitas>(`${this.apiUrl}/encargados-citas`, data);
  }

  listarEmpleados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.apiUrl}/empleados`);
  }

  registrarEmpleado(data: RegistroEmpleadoRequest): Observable<Empleado> {
    return this.http.post<Empleado>(`${this.apiUrl}/empleados`, data);
  }

  listarHorarios(filtros?: { fecha?: string; codMed?: string; codEncargado?: string }): Observable<Horario[]> {
    let params = new HttpParams();
    if (filtros?.fecha) params = params.set('fecha', filtros.fecha);
    if (filtros?.codMed) params = params.set('codMed', filtros.codMed);
    if (filtros?.codEncargado) params = params.set('codEncargado', filtros.codEncargado);
    return this.http.get<Horario[]>(`${this.apiUrl}/horarios`, { params });
  }

  crearHorario(data: CrearHorarioRequest): Observable<Horario> {
    return this.http.post<Horario>(`${this.apiUrl}/horarios`, data);
  }

  listarDisponibilidades(filtros?: {
    estado?: string;
    fecha?: string;
    fechaInicio?: string;
    fechaFin?: string;
    incluirPasadas?: boolean;
    codMed?: string;
  }): Observable<Disponibilidad[]> {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.fecha) params = params.set('fecha', filtros.fecha);
    if (filtros?.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
    if (filtros?.incluirPasadas !== undefined) params = params.set('incluirPasadas', filtros.incluirPasadas);
    if (filtros?.codMed) params = params.set('codMed', filtros.codMed);
    return this.http.get<Disponibilidad[]>(`${this.apiUrl}/disponibilidades`, { params });
  }

  crearDisponibilidad(data: CrearDisponibilidadRequest): Observable<Disponibilidad> {
    return this.http.post<Disponibilidad>(`${this.apiUrl}/disponibilidades`, data);
  }

  crearDisponibilidadesRango(data: CrearDisponibilidadRangoRequest): Observable<Disponibilidad[]> {
    return this.http.post<Disponibilidad[]>(`${this.apiUrl}/disponibilidades/rango`, data);
  }

  crearDisponibilidadesMasivas(data: CrearDisponibilidadMasivaRequest): Observable<Disponibilidad[]> {
    return this.http.post<Disponibilidad[]>(`${this.apiUrl}/disponibilidades/masivo`, data);
  }

  listarSolicitudesMedicas(filtros?: {
    codMed?: string;
    codEspe?: number;
    estado?: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | '';
  }): Observable<SolicitudMedica[]> {
    let params = new HttpParams();
    if (filtros?.codMed) params = params.set('codMed', filtros.codMed);
    if (filtros?.codEspe) params = params.set('codEspe', filtros.codEspe);
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    return this.http.get<SolicitudMedica[]>(`${this.apiUrl}/solicitudes-medicas`, { params });
  }

  crearSolicitudMedica(data: CrearSolicitudMedicaRequest): Observable<SolicitudMedica> {
    return this.http.post<SolicitudMedica>(`${this.apiUrl}/solicitudes-medicas`, data);
  }

  crearSolicitudesMedicasRango(data: CrearSolicitudMedicaRangoRequest): Observable<SolicitudMedica[]> {
    return this.http.post<SolicitudMedica[]>(`${this.apiUrl}/solicitudes-medicas/rango`, data);
  }

  cambiarEstadoSolicitudesMedicas(
    ids: number[],
    estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO'
  ): Observable<SolicitudMedica[]> {
    return this.http.put<SolicitudMedica[]>(`${this.apiUrl}/solicitudes-medicas/estado`, { ids, estado });
  }

  listarCitasPaciente(numDoc: string): Observable<Cita[]> {
    return this.http.get<Cita[]>(`${this.apiUrl}/citas?numDoc=${encodeURIComponent(numDoc)}`);
  }

  registrarCita(numDoc: string, codDis: number, pago?: { metodoPago?: string; numeroTarjeta?: string; referenciaPago?: string }): Observable<Cita> {
    return this.http.post<Cita>(`${this.apiUrl}/citas`, { numDoc, codDis, ...pago });
  }

  reasignarHorarioMedico(data: ReasignarHorarioMedicoRequest): Observable<ReasignarHorarioMedicoResponse> {
    return this.http.post<ReasignarHorarioMedicoResponse>(`${this.apiUrl}/citas/reasignar-medico`, data);
  }

  cancelarCita(codCita: number, motivo?: string): Observable<Cita> {
    return this.http.put<Cita>(`${this.apiUrl}/citas/${codCita}/cancelar`, { motivo });
  }

  postergarCita(codCita: number, nuevoCodDis: number): Observable<Cita> {
    return this.http.put<Cita>(`${this.apiUrl}/citas/${codCita}/postergar`, { nuevoCodDis });
  }

  citasPendientesMedico(codMed: string): Observable<Cita[]> {
    return this.http.get<Cita[]>(`${this.apiUrl}/citas/medico/${codMed}/pendientes`);
  }

  historialMedico(codMed: string): Observable<Cita[]> {
    return this.http.get<Cita[]>(`${this.apiUrl}/citas/medico/${codMed}/historial`);
  }

  atenderCita(codCita: number): Observable<Cita> {
    return this.http.put<Cita>(`${this.apiUrl}/citas/${codCita}/atender`, {});
  }

  marcarAusente(codCita: number): Observable<Cita> {
    return this.http.put<Cita>(`${this.apiUrl}/citas/${codCita}/ausente`, {});
  }

  listarPagos(filtros?: { fechaInicio?: string; fechaFin?: string }): Observable<Pago[]> {
    let params = new HttpParams();
    if (filtros?.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
    return this.http.get<Pago[]>(`${this.apiUrl}/finanzas/pagos`, { params });
  }

  listarDevoluciones(filtros?: {
    estado?: string;
    fechaInicio?: string;
    fechaFin?: string;
    codEspe?: number;
    codMed?: string;
  }): Observable<Devolucion[]> {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
    if (filtros?.codEspe) params = params.set('codEspe', filtros.codEspe);
    if (filtros?.codMed) params = params.set('codMed', filtros.codMed);
    return this.http.get<Devolucion[]>(`${this.apiUrl}/finanzas/devoluciones`, { params });
  }

  aprobarDevolucion(idSolicitud: number, codEmpleado: string, observacion?: string): Observable<Devolucion> {
    return this.http.put<Devolucion>(`${this.apiUrl}/finanzas/devoluciones/${idSolicitud}/aprobar`, { codEmpleado, observacion });
  }

  rechazarDevolucion(idSolicitud: number, codEmpleado: string, observacion?: string): Observable<Devolucion> {
    return this.http.put<Devolucion>(`${this.apiUrl}/finanzas/devoluciones/${idSolicitud}/rechazar`, { codEmpleado, observacion });
  }

  ejecutarDevolucion(idSolicitud: number, codEmpleado: string, numeroTarjetaDestino?: string, observacion?: string): Observable<Devolucion> {
    return this.http.put<Devolucion>(`${this.apiUrl}/finanzas/devoluciones/${idSolicitud}/devolver`, {
      codEmpleado,
      numeroTarjetaDestino,
      observacion,
    });
  }

  dashboardFinanzas(filtros?: { fechaInicio?: string; fechaFin?: string }): Observable<FinanzasDashboard> {
    let params = new HttpParams();
    if (filtros?.fechaInicio) params = params.set('fechaInicio', filtros.fechaInicio);
    if (filtros?.fechaFin) params = params.set('fechaFin', filtros.fechaFin);
    return this.http.get<FinanzasDashboard>(`${this.apiUrl}/finanzas/dashboard`, { params });
  }
}
