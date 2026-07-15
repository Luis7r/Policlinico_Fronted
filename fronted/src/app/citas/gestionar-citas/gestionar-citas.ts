import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Cita, Disponibilidad } from '../../Services/api';
import {
  descargarComprobantePdf,
  formatoMoneda,
  precioPorEspecialidad,
} from '../../Services/comprobante';

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
  motivosCancelacion = [
    'Motivos personales',
    'No podre asistir en la fecha programada',
    'Deseo atenderme en otro establecimiento',
  ];
  vista: 'cancelar' | 'postergar' = 'postergar';
  modalPostergarAbierto = false;

citaSeleccionada: Cita | null = null;

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

  get citasCancelables(): Cita[] {
    return this.citasActivas;
  }

  abrirModalPostergar(cita: Cita): void {

    if (!this.puedeModificar(cita)) {
      return;
    }

    this.citaSeleccionada = cita;

    this.citaPostergar = cita.codCita;

    this.nuevaDisponibilidad = 0;

    this.modalPostergarAbierto = true;

    this.error = '';

    this.cargarDisponibilidades();

  }
  
  cerrarModalPostergar(): void {

    if (this.procesando) return;

    this.modalPostergarAbierto = false;

    this.citaSeleccionada = null;

    this.citaPostergar = 0;

    this.nuevaDisponibilidad = 0;

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
    const citaOriginal = this.citaCancelar;
    this.api.cancelarCita(citaOriginal.codCita, this.motivoCancelacion).subscribe({
      next: () => {
        this.procesando = false;
        this.descargarNotaCredito(citaOriginal, this.motivoCancelacion);
        this.cerrarModalCancelacion();
        this.changed.emit('Cita cancelada. Nota de credito descargada y notificacion enviada al correo registrado.');
      },
      error: (err) => this.mostrarError(err, 'No se pudo cancelar la cita'),
    });
  }

  postergar(): void {

    if (!this.citaSeleccionada) {

      this.error = 'Seleccione una cita.';

      return;

    }

    if (!this.nuevaDisponibilidad) {

      this.error = 'Seleccione un nuevo horario.';

      return;

    }

    this.procesando = true;

    this.error = '';

    this.api.postergarCita(

        this.citaSeleccionada.codCita,

        this.nuevaDisponibilidad

    ).subscribe({

        next: () => {

            this.procesando = false;

            this.modalPostergarAbierto = false;

            this.citaSeleccionada = null;

            this.citaPostergar = 0;

            this.nuevaDisponibilidad = 0;

            this.changed.emit(

                'Cita postergada. Se envió notificación al correo registrado.'

            );

        },

        error: (err) =>

            this.mostrarError(

                err,

                'No se pudo postergar la cita'

            )

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

  montoCita(cita: Cita | null): number {
    return precioPorEspecialidad(cita?.especialidad, cita?.precioEspecialidad);
  }

  montoCitaTexto(cita: Cita | null): string {
    return formatoMoneda(this.montoCita(cita));
  }




  private cargarDisponibilidades(): void {

    if (!this.citaSeleccionada) {

        return;

    }

    this.cargandoDisponibilidades = true;

    this.api.listarDisponibilidades({

        estado:'DISPONIBLE'

    }).subscribe({

        next:(data)=>{

            this.disponibilidades=[...data]

            .filter(d=>

                d.horario.medico.especialidad.nombre===

                this.citaSeleccionada!.especialidad

                && !this.chocaConOtraCitaActiva(d)

            )

            .sort((a,b)=>

                `${a.horario.fecha} ${a.horaInicio}`

                .localeCompare(

                `${b.horario.fecha} ${b.horaInicio}`)

            );

            this.cargandoDisponibilidades=false;

        },

        error:(err)=>

            this.mostrarError(

                err,

                'No se pudieron cargar los horarios disponibles'

            )

    });

  }

  private mostrarError(err: any, fallback: string): void {
    this.procesando = false;
    this.cargandoDisponibilidades = false;
    this.error = err?.error?.error || err?.error?.message || fallback;
  }

  private chocaConOtraCitaActiva(disponibilidad: Disponibilidad): boolean {
    return this.citas.some((cita) => {
      const activa = cita.estado === 'REGISTRADA' || cita.estado === 'POSTERGADA' || cita.estado === 'PENDIENTE';
      return (
        activa &&
        cita.codCita !== this.citaSeleccionada?.codCita &&
        cita.fecha === disponibilidad.horario.fecha &&
        disponibilidad.horaInicio < cita.horaFin &&
        disponibilidad.horaFin > cita.horaInicio
      );
    });
  }

  private descargarNotaCredito(cita: Cita, motivo: string): void {
    descargarComprobantePdf(
      'Nota de credito',
      `Devolucion por cita #${cita.codCita}`,
      [
        { label: 'Paciente', value: cita.paciente },
        { label: 'Especialidad', value: cita.especialidad },
        { label: 'Medico', value: cita.medico },
        { label: 'Fecha original', value: cita.fecha },
        { label: 'Hora original', value: `${this.formatoHora(cita.horaInicio)} - ${this.formatoHora(cita.horaFin)}` },
        { label: 'Consultorio', value: cita.consultorio || '-' },
        { label: 'Motivo de cancelacion', value: motivo },
        { label: 'Monto devuelto', value: this.montoCitaTexto(cita) },
      ],
      `nota-credito-cita-${cita.codCita}.pdf`
    );
  }
}
