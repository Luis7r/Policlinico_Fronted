import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PacienteService, RegistroPacienteRequest } from '../Services/paciente';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-registro',
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './registro.html',
  styleUrls: ['./registro.css'],
})
export class Registro {
  paciente: RegistroPacienteRequest = {
    numDoc: '',
    tipoDoc: '',
    nombre: '',
    apellido: '',
    sexo: '',
    direccion: '',
    correo: '',
    clave: '',
  };

  mensaje = '';
  error = '';

  constructor(private pacienteService: PacienteService) {}

  guardar() {
    this.mensaje = '';
    this.error = '';

    this.pacienteService.grabarPaciente(this.paciente).subscribe({
      next: (respuesta) => {
        this.mensaje = `Paciente registrado correctamente: ${respuesta.nombre} ${respuesta.apellido}`;
        this.paciente = {
          numDoc: '',
          tipoDoc: '',
          nombre: '',
          apellido: '',
          sexo: '',
          direccion: '',
          correo: '',
          clave: '',
        };
      },
      error: (err) => {
        this.error = err?.error?.error || 'No se pudo registrar el paciente';
      }
    });
  }
}

