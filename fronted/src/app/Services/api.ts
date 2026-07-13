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
  rol: 'PACIENTE' | 'MEDICO' | 'ENCARGADO_CITAS' | 'ADMIN';
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
  consultorio?: string;
  notificacionEnviada: boolean | null;
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

  crearEspecialidad(nombre: string): Observable<Especialidad> {
    return this.http.post<Especialidad>(`${this.apiUrl}/especialidades`, { nombre });
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

  listarSolicitudesMedicas(codMed?: string): Observable<SolicitudMedica[]> {
    let params = new HttpParams();
    if (codMed) params = params.set('codMed', codMed);
    return this.http.get<SolicitudMedica[]>(`${this.apiUrl}/solicitudes-medicas`, { params });
  }

  crearSolicitudMedica(data: CrearSolicitudMedicaRequest): Observable<SolicitudMedica> {
    return this.http.post<SolicitudMedica>(`${this.apiUrl}/solicitudes-medicas`, data);
  }

  crearSolicitudesMedicasRango(data: CrearSolicitudMedicaRangoRequest): Observable<SolicitudMedica[]> {
    return this.http.post<SolicitudMedica[]>(`${this.apiUrl}/solicitudes-medicas/rango`, data);
  }

  listarCitasPaciente(numDoc: string): Observable<Cita[]> {
    return this.http.get<Cita[]>(`${this.apiUrl}/citas?numDoc=${encodeURIComponent(numDoc)}`);
  }

  registrarCita(numDoc: string, codDis: number): Observable<Cita> {
    return this.http.post<Cita>(`${this.apiUrl}/citas`, { numDoc, codDis });
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
}
