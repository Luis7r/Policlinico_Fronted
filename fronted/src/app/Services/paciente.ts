import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Paciente {
  numDoc: string;
  tipoDoc: string;
  nombre: string;
  apellido: string;
  sexo: string;
  direccion: string;
}

export interface RegistroPacienteRequest {
  numDoc: string;
  tipoDoc: string;
  nombre: string;
  apellido: string;
  sexo: string;
  direccion: string;
  correo: string;
  clave: string;
}

export interface RegistroPacienteResponse {
  numDoc: string;
  tipoDoc: string;
  nombre: string;
  apellido: string;
  sexo: string;
  direccion: string;
  correo: string;
  rol: string;
}

@Injectable({
  providedIn: 'root',
})
export class PacienteService {
  private apiUrl =  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ?'http://localhost:8080/api/pacientes'
    :'https://glistening-achievement-production-3321.up.railway.app/api/pacientes';

  constructor(private http: HttpClient) {}

  listarPacientes(): Observable<Paciente[]> {
    return this.http.get<Paciente[]>(this.apiUrl);
  }

  grabarPaciente(data: RegistroPacienteRequest): Observable<RegistroPacienteResponse> {
    return this.http.post<RegistroPacienteResponse>(this.apiUrl, data);
  }
}
