import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Disponibilidad, Especialidad, Medico } from '../../Services/api';

@Component({
  selector: 'app-registrar-cita',
  imports: [CommonModule, FormsModule],
  templateUrl: './registrar-cita.html',
  styleUrls: ['./registrar-cita.css'],
})
export class RegistrarCita implements OnInit {
  @Input() pacienteCodigo: string | null = null;
  @Output() completed = new EventEmitter<string>();

  especialidades: Especialidad[] = [];
  medicos: Medico[] = [];
  disponibilidades: Disponibilidad[] = [];

  especialidadSeleccionada: Especialidad | null = null;
  medicoSeleccionado: Medico | null = null;
  disponibilidadSeleccionada: Disponibilidad | null = null;
  fechaFiltro = '';

  cargandoEspecialidades = false;
  cargandoMedicos = false;
  cargandoDisponibilidades = false;
  guardando = false;
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.cargarEspecialidades();
  }

  cargarEspecialidades(): void {
    this.error = '';
    this.cargandoEspecialidades = true;
    this.api.listarEspecialidades().subscribe({
      next: (data) => {
        this.especialidades = data;
        this.cargandoEspecialidades = false;
      },
      error: (err) => this.mostrarError(err, 'No se pudieron cargar las especialidades'),
    });
  }

  seleccionarEspecialidad(especialidad: Especialidad): void {
    this.especialidadSeleccionada = especialidad;
    this.medicoSeleccionado = null;
    this.disponibilidadSeleccionada = null;
    this.disponibilidades = [];
    this.cargandoMedicos = true;
    this.error = '';

    this.api.listarMedicos(especialidad.codEspe).subscribe({
      next: (data) => {
        this.medicos = data;
        this.cargandoMedicos = false;
      },
      error: (err) => this.mostrarError(err, 'No se pudieron cargar los medicos'),
    });
  }

  seleccionarMedico(medico: Medico): void {
    this.medicoSeleccionado = medico;
    this.disponibilidadSeleccionada = null;
    this.fechaFiltro = '';
    this.cargarDisponibilidades();
  }

  cargarDisponibilidades(): void {
    if (!this.medicoSeleccionado) return;
    this.cargandoDisponibilidades = true;
    this.disponibilidadSeleccionada = null;
    this.error = '';
    this.api
      .listarDisponibilidades({
        estado: 'DISPONIBLE',
        codMed: this.medicoSeleccionado.codMed,
        fecha: this.fechaFiltro || undefined,
      })
      .subscribe({
        next: (data) => {
          this.disponibilidades = this.ordenarDisponibilidades(data);
          this.cargandoDisponibilidades = false;
        },
        error: (err) => this.mostrarError(err, 'No se pudieron cargar los horarios disponibles'),
      });
  }

  limpiarFechaFiltro(): void {
    this.fechaFiltro = '';
    this.cargarDisponibilidades();
  }

  seleccionarDisponibilidad(disponibilidad: Disponibilidad): void {
    this.disponibilidadSeleccionada = disponibilidad;
  }

  registrar(): void {
    if (!this.pacienteCodigo || !this.disponibilidadSeleccionada) {
      this.error = 'Selecciona una cita disponible antes de registrar.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.api.registrarCita(this.pacienteCodigo, this.disponibilidadSeleccionada.codDis).subscribe({
      next: (cita) => {
        this.guardando = false;
        const notificacion = cita.notificacionEnviada ? 'Correo enviado' : 'Cita registrada';
        this.completed.emit(`${notificacion}. Codigo de cita: ${cita.codCita}`);
        this.reiniciar();
      },
      error: (err) => this.mostrarError(err, 'No se pudo registrar la cita'),
    });
  }

  volverAEspecialidades(): void {
    this.especialidadSeleccionada = null;
    this.medicoSeleccionado = null;
    this.disponibilidadSeleccionada = null;
    this.medicos = [];
    this.disponibilidades = [];
  }

  volverAMedicos(): void {
    this.medicoSeleccionado = null;
    this.disponibilidadSeleccionada = null;
    this.disponibilidades = [];
  }

  pasoActual(): number {
    if (this.disponibilidadSeleccionada) return 4;
    if (this.medicoSeleccionado) return 3;
    if (this.especialidadSeleccionada) return 2;
    return 1;
  }

  formatoHora(hora: string): string {
    return hora?.slice(0, 5) || '';
  }

  private reiniciar(): void {
    this.especialidadSeleccionada = null;
    this.medicoSeleccionado = null;
    this.disponibilidadSeleccionada = null;
    this.medicos = [];
    this.disponibilidades = [];
    this.cargarEspecialidades();
  }

  private ordenarDisponibilidades(data: Disponibilidad[]): Disponibilidad[] {
    return [...data].sort((a, b) => {
      const fechaA = `${a.horario.fecha} ${a.horaInicio}`;
      const fechaB = `${b.horario.fecha} ${b.horaInicio}`;
      return fechaA.localeCompare(fechaB);
    });
  }

  private mostrarError(err: any, fallback: string): void {
    this.cargandoEspecialidades = false;
    this.cargandoMedicos = false;
    this.cargandoDisponibilidades = false;
    this.guardando = false;
    this.error = err?.error?.error || err?.error?.message || fallback;
  }
}
