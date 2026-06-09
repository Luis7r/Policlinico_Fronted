import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Cita, Disponibilidad } from '../../Services/api';

@Component({
  selector: 'app-gestionar-citas',
  imports: [CommonModule, FormsModule],
  templateUrl: './gestionar-citas.html',
  styleUrls: ['./gestionar-citas.css'],
})
export class GestionarCitas implements OnChanges {
  @Input() pacienteCodigo: string | null = null;
  @Input() citas: Cita[] = [];
  @Output() changed = new EventEmitter<string>();

  disponibilidades: Disponibilidad[] = [];
  citaPostergar = 0;
  nuevaDisponibilidad = 0;
  cargandoDisponibilidades = false;
  procesando = false;
  error = '';
  modalCancelacionAbierto = false;
  citaCancelar: Cita | null = null;
  motivoCancelacion = '';

  constructor(private api: ApiService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['citas']) {
      this.citaPostergar = 0;
      this.nuevaDisponibilidad = 0;
    }
  }

  get citasOrdenadas(): Cita[] {
    return [...this.citas].sort((a, b) => `${b.fecha} ${b.horaInicio}`.localeCompare(`${a.fecha} ${a.horaInicio}`));
  }

  get citasActivas(): Cita[] {
    return this.citasOrdenadas.filter((c) => this.puedeModificar(c));
  }

  seleccionarCitaPostergar(): void {
    this.nuevaDisponibilidad = 0;
    this.error = '';
    if (this.citaPostergar) {
      this.cargarDisponibilidades();
    } else {
      this.disponibilidades = [];
    }
  }

  abrirModalCancelacion(cita: Cita): void {
    if (!this.puedeModificar(cita)) return;
    this.citaCancelar = cita;
    this.motivoCancelacion = '';
    this.modalCancelacionAbierto = true;
    this.error = '';
  }

  cerrarModalCancelacion(): void {
    if (this.procesando) return;
    this.modalCancelacionAbierto = false;
    this.citaCancelar = null;
    this.motivoCancelacion = '';
  }

  confirmarCancelacion(): void {
    if (!this.citaCancelar) return;

    this.procesando = true;
    this.error = '';
    this.api.cancelarCita(this.citaCancelar.codCita).subscribe({
      next: () => {
        this.procesando = false;
        this.cerrarModalCancelacion();
        this.changed.emit('Cita cancelada. Se envio notificacion al correo registrado.');
      },
      error: (err) => this.mostrarError(err, 'No se pudo cancelar la cita'),
    });
  }

  postergar(): void {
    if (!this.citaPostergar || !this.nuevaDisponibilidad) {
      this.error = 'Selecciona la cita y el nuevo horario.';
      return;
    }

    this.procesando = true;
    this.error = '';
    this.api.postergarCita(this.citaPostergar, this.nuevaDisponibilidad).subscribe({
      next: () => {
        this.procesando = false;
        this.citaPostergar = 0;
        this.nuevaDisponibilidad = 0;
        this.changed.emit('Cita postergada. Se envio notificacion al correo registrado.');
      },
      error: (err) => this.mostrarError(err, 'No se pudo postergar la cita'),
    });
  }

  puedeModificar(cita: Cita): boolean {
    return cita.estado === 'REGISTRADA' || cita.estado === 'POSTERGADA' || cita.estado === 'PENDIENTE';
  }

  estadoClase(cita: Cita): string {
    if (cita.estado === 'CANCELADA') return 'status cancelled';
    if (cita.estado === 'ATENDIDA') return 'status done';
    if (cita.estado === 'POSTERGADA') return 'status moved';
    return 'status active';
  }

  formatoHora(hora: string): string {
    return hora?.slice(0, 5) || '';
  }

  disponibilidadLabel(disponibilidad: Disponibilidad): string {
    const medico = `${disponibilidad.horario.medico.nombre} ${disponibilidad.horario.medico.apellido}`;
    return `${disponibilidad.horario.fecha} | ${this.formatoHora(disponibilidad.horaInicio)} - ${this.formatoHora(disponibilidad.horaFin)} | ${medico}`;
  }

  citaSeleccionadaParaPostergar(): Cita | undefined {
    return this.citasActivas.find((c) => c.codCita === this.citaPostergar);
  }

  private cargarDisponibilidades(): void {
    const cita = this.citaSeleccionadaParaPostergar();
    if (!cita) return;

    this.cargandoDisponibilidades = true;
    this.api.listarDisponibilidades({ estado: 'DISPONIBLE' }).subscribe({
      next: (data) => {
        this.disponibilidades = [...data]
          .filter((disponibilidad) => disponibilidad.horario.medico.especialidad.nombre === cita.especialidad)
          .sort((a, b) =>
            `${a.horario.fecha} ${a.horaInicio}`.localeCompare(`${b.horario.fecha} ${b.horaInicio}`),
          );
        this.cargandoDisponibilidades = false;
      },
      error: (err) => this.mostrarError(err, 'No se pudieron cargar los horarios disponibles'),
    });
  }

  private mostrarError(err: any, fallback: string): void {
    this.procesando = false;
    this.cargandoDisponibilidades = false;
    this.error = err?.error?.error || err?.error?.message || fallback;
  }
}
