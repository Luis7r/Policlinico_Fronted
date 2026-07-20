import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, Cita, Disponibilidad, Especialidad, Medico } from '../../Services/api';
import {
  descargarComprobantePdf,
  formatoMoneda,
  precioPorEspecialidad,
} from '../../Services/comprobante';

@Component({
  selector: 'app-registrar-cita',
  imports: [CommonModule, FormsModule],
  templateUrl: './registrar-cita.html',
  styleUrls: ['./registrar-cita.css'],
})
export class RegistrarCita implements OnInit {
  @Input() pacienteCodigo: string | null = null;
  @Input() citas: Cita[] = [];
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
  metodoPago: 'tarjeta' | 'qr' = 'tarjeta';
  numeroTarjeta = '';
  pagoQrConfirmado = false;

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
          this.disponibilidades = this.ordenarDisponibilidades(data).filter(
            (disponibilidad) => !this.chocaConCitaActiva(disponibilidad)
          );
          this.cargandoDisponibilidades = false;
        },
        error: (err) => this.mostrarError(err, 'No se pudieron cargar los horarios disponibles'),
      });
  }

  limpiarFechaFiltro(): void {
    this.fechaFiltro = '';
    this.cargarDisponibilidades();
  }

  obtenerFechaMinima(): string {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const día = String(hoy.getDate()).padStart(2, '0');
    return `${año}-${mes}-${día}`;
  }

  seleccionarDisponibilidad(disponibilidad: Disponibilidad): void {
    this.disponibilidadSeleccionada = disponibilidad;
    this.limpiarPago();
  }

  registrar(): void {
    if (!this.pacienteCodigo || !this.disponibilidadSeleccionada) {
      this.error = 'Selecciona una cita disponible antes de registrar.';
      return;
    }
    if (!this.pagoValido()) {
      this.error = 'Completa la simulacion de pago antes de registrar.';
      return;
    }

    this.guardando = true;
    this.error = '';
    this.api.registrarCita(this.pacienteCodigo, this.disponibilidadSeleccionada.codDis, {
      metodoPago: this.metodoPago === 'tarjeta' ? 'TARJETA' : 'QR',
      numeroTarjeta: this.metodoPago === 'tarjeta' ? this.numeroTarjeta.trim() : undefined,
      referenciaPago: this.metodoPago === 'qr' ? 'QR_DEMO_CONFIRMADO' : undefined,
    }).subscribe({
      next: (cita) => {
        this.guardando = false;
        this.descargarComprobantePago(cita.codCita);
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

  montoCita(): number {
    return precioPorEspecialidad(this.especialidadSeleccionada?.nombre, this.especialidadSeleccionada?.precio);
  }

  montoCitaTexto(): string {
    return formatoMoneda(this.montoCita());
  }

  precioEspecialidadTexto(especialidad: Especialidad): string {
    return formatoMoneda(precioPorEspecialidad(especialidad.nombre, especialidad.precio));
  }

  pagoValido(): boolean {
    if (this.metodoPago === 'qr') {
      return this.pagoQrConfirmado;
    }
    return /^\d{16}$/.test(this.numeroTarjeta.trim());
  }

  tarjetaOculta(): string {
    const limpia = this.numeroTarjeta.replace(/\D/g, '');
    return limpia.length >= 4 ? `**** **** **** ${limpia.slice(-4)}` : '-';
  }

  private reiniciar(): void {
    this.especialidadSeleccionada = null;
    this.medicoSeleccionado = null;
    this.disponibilidadSeleccionada = null;
    this.medicos = [];
    this.disponibilidades = [];
    this.limpiarPago();
    this.cargarEspecialidades();
  }

  private limpiarPago(): void {
    this.metodoPago = 'tarjeta';
    this.numeroTarjeta = '';
    this.pagoQrConfirmado = false;
  }

  private descargarComprobantePago(codCita: number): void {
    if (!this.disponibilidadSeleccionada) return;
    descargarComprobantePdf(
      'Comprobante de pago',
      `Cita #${codCita}`,
      [
        { label: 'Paciente', value: this.pacienteCodigo },
        { label: 'Especialidad', value: this.especialidadSeleccionada?.nombre },
        { label: 'Medico', value: `${this.medicoSeleccionado?.nombre || ''} ${this.medicoSeleccionado?.apellido || ''}`.trim() },
        { label: 'Fecha', value: this.disponibilidadSeleccionada.horario.fecha },
        {
          label: 'Hora',
          value: `${this.formatoHora(this.disponibilidadSeleccionada.horaInicio)} - ${this.formatoHora(this.disponibilidadSeleccionada.horaFin)}`,
        },
        { label: 'Consultorio', value: this.disponibilidadSeleccionada.horario.consultorio || '-' },
        { label: 'Metodo de pago', value: this.metodoPago === 'tarjeta' ? `Tarjeta ${this.tarjetaOculta()}` : 'QR demo' },
        { label: 'Monto pagado', value: this.montoCitaTexto() },
      ],
      `comprobante-cita-${codCita}.pdf`
    );
  }

  private ordenarDisponibilidades(data: Disponibilidad[]): Disponibilidad[] {
    return [...data].sort((a, b) => {
      const fechaA = `${a.horario.fecha} ${a.horaInicio}`;
      const fechaB = `${b.horario.fecha} ${b.horaInicio}`;
      return fechaA.localeCompare(fechaB);
    });
  }

  private chocaConCitaActiva(disponibilidad: Disponibilidad): boolean {
    return this.citas.some((cita) => {
      const activa = cita.estado === 'REGISTRADA' || cita.estado === 'POSTERGADA' || cita.estado === 'PENDIENTE';
      return (
        activa &&
        cita.fecha === disponibilidad.horario.fecha &&
        disponibilidad.horaInicio < cita.horaFin &&
        disponibilidad.horaFin > cita.horaInicio
      );
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
