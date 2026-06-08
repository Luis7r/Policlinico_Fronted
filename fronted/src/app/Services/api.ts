import { HttpClient } from '@angular/common/http';
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
  codigo: string;
  numDoc: string;
  nombreCompleto: string;
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
}

export interface CrearHorarioRequest {
  fecha: string;
  codMed: string;
  codEncargado: string;
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
  notificacionEnviada: boolean | null;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'http://localhost:8080/api';

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

  listarMedicos(): Observable<Medico[]> {
    return this.http.get<Medico[]>(`${this.apiUrl}/medicos`);
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

  listarHorarios(): Observable<Horario[]> {
    return this.http.get<Horario[]>(`${this.apiUrl}/horarios`);
  }

  crearHorario(data: CrearHorarioRequest): Observable<Horario> {
    return this.http.post<Horario>(`${this.apiUrl}/horarios`, data);
  }

  listarDisponibilidades(): Observable<Disponibilidad[]> {
    return this.http.get<Disponibilidad[]>(`${this.apiUrl}/disponibilidades`);
  }

  crearDisponibilidad(data: CrearDisponibilidadRequest): Observable<Disponibilidad> {
    return this.http.post<Disponibilidad>(`${this.apiUrl}/disponibilidades`, data);
  }

  listarCitasPaciente(numDoc: string): Observable<Cita[]> {
    return this.http.get<Cita[]>(`${this.apiUrl}/citas?numDoc=${encodeURIComponent(numDoc)}`);
  }

  registrarCita(numDoc: string, codDis: number): Observable<Cita> {
    return this.http.post<Cita>(`${this.apiUrl}/citas`, { numDoc, codDis });
  }

  cancelarCita(codCita: number): Observable<Cita> {
    return this.http.put<Cita>(`${this.apiUrl}/citas/${codCita}/cancelar`, {});
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
