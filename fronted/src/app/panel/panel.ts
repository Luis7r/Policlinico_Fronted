import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ApiService,
  Cita,
  Disponibilidad,
  EncargadoCitas,
  Especialidad,
  Horario,
  LoginResponse,
  Medico,
  SolicitudMedica,
} from '../Services/api';
import { AuthService } from '../Services/auth';
import { GestionarCitas } from '../citas/gestionar-citas/gestionar-citas';
import { RegistrarCita } from '../citas/registrar-cita/registrar-cita';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-panel',
  imports: [CommonModule, FormsModule, Sidebar, RegistrarCita, GestionarCitas],
  templateUrl: './panel.html',
  styleUrls: ['./panel.css'],
})
export class Panel implements OnInit {
  user: LoginResponse | null = null;
  mensaje = '';
  error = '';
  activeTab = 'inicio';

  especialidades: Especialidad[] = [];
  medicos: Medico[] = [];
  encargados: EncargadoCitas[] = [];
  horarios: Horario[] = [];
  disponibilidades: Disponibilidad[] = [];
  citasPaciente: Cita[] = [];
  citasPendientes: Cita[] = [];
  historial: Cita[] = [];
  solicitudesMedicas: SolicitudMedica[] = [];

  nuevaEspecialidad = '';
  nuevoMedico = {
    numDoc: '',
    nombre: '',
    apellido: '',
    codEspe: 0,
    correo: '',
    clave: '',
  };
  nuevoEncargado = {
    numDoc: '',
    nombre: '',
    apellido: '',
    correo: '',
    clave: '',
  };
  nuevoHorario = {
    fecha: '',
    codMed: '',
    codEncargado: '',
  };
  nuevaDisponibilidad = {
    codHor: 0,
    horaInicio: '',
    horaFin: '',
  };
  nuevaSolicitud = {
    fecha: '',
    horaInicio: '',
    horaFin: '',
  };
  solicitudPreparada: SolicitudMedica | null = null;

  get menuItems() {
    const items = [{ label: 'Inicio', action: () => this.cambiarTab('inicio') }];

    if (this.esPaciente()) {
      items.push({ label: 'Registrar cita', action: () => this.cambiarTab('registrar') });
      items.push({ label: 'Gestionar citas', action: () => this.cambiarTab('citas') });
    }

    if (this.esMedico()) {
      items.push({ label: 'Solicitar disponibilidad', action: () => this.cambiarTab('solicitar') });
      items.push({ label: 'Citas pendientes', action: () => this.cambiarTab('pendientes') });
      items.push({ label: 'Historial', action: () => this.cambiarTab('historial') });
    }

    if (this.esEncargado()) {
      items.push({ label: 'Solicitudes medicas', action: () => this.cambiarTab('solicitudes') });
      items.push({ label: 'Especialidades', action: () => this.cambiarTab('especialidades') });
      items.push({ label: 'Medicos', action: () => this.cambiarTab('medicos') });
      items.push({ label: 'Jefes medicos', action: () => this.cambiarTab('encargados') });
      items.push({ label: 'Horarios', action: () => this.cambiarTab('horarios') });
      items.push({ label: 'Disponibilidades', action: () => this.cambiarTab('disponibilidades') });
    }

    return items;
  }

  constructor(private api: ApiService, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.auth.getUser();
    if (!this.user) {
      this.router.navigate(['/login']);
      return;
    }
    this.cargarDatosBase();
  }

  cambiarTab(tab: string): void {
    this.activeTab = tab;
    this.limpiarMensajes();
  }

  cargarDatosBase(): void {
    this.limpiarMensajes();

    if (this.esPaciente()) {
      this.cargarCitasPaciente();
      return;
    }

    if (this.esMedico()) {
      this.cargarCitasMedico();
      return;
    }

    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.api.listarEspecialidades().subscribe((data) => (this.especialidades = data));
    this.api.listarMedicos().subscribe((data) => (this.medicos = data));
    this.api.listarEncargados().subscribe((data) => (this.encargados = data));
    this.api.listarHorarios().subscribe((data) => (this.horarios = data));
    this.api.listarDisponibilidades().subscribe((data) => (this.disponibilidades = data));
    this.api.listarSolicitudesMedicas().subscribe((data) => (this.solicitudesMedicas = data));
  }

  cargarCitasPaciente(): void {
    if (!this.user?.codigo) return;
    this.api.listarCitasPaciente(this.user.codigo).subscribe({
      next: (data) => (this.citasPaciente = data),
      error: (err) => this.mostrarError(err, 'No se pudieron cargar las citas del paciente'),
    });
  }

  cargarCitasMedico(): void {
    if (!this.user?.codigo) return;
    this.api.citasPendientesMedico(this.user.codigo).subscribe({
      next: (data) => (this.citasPendientes = data),
      error: (err) => this.mostrarError(err, 'No se pudieron cargar las citas pendientes'),
    });
    this.api.historialMedico(this.user.codigo).subscribe({
      next: (data) => (this.historial = data),
      error: (err) => this.mostrarError(err, 'No se pudo cargar el historial'),
    });
    this.api.listarSolicitudesMedicas(this.user.codigo).subscribe({
      next: (data) => (this.solicitudesMedicas = data),
      error: (err) => this.mostrarError(err, 'No se pudieron cargar las solicitudes medicas'),
    });
  }

  crearSolicitudMedica(): void {
    if (!this.user?.codigo) return;
    this.api.crearSolicitudMedica({ codMed: this.user.codigo, ...this.nuevaSolicitud }).subscribe({
      next: () => {
        this.nuevaSolicitud = { fecha: '', horaInicio: '', horaFin: '' };
        this.mostrarMensaje('Solicitud enviada al jefe medico');
        this.cargarCitasMedico();
      },
      error: (err) => this.mostrarError(err, 'No se pudo registrar la solicitud'),
    });
  }

  crearEspecialidad(): void {
    if (!this.nuevaEspecialidad.trim()) return;
    this.api.crearEspecialidad(this.nuevaEspecialidad.trim()).subscribe({
      next: () => {
        this.nuevaEspecialidad = '';
        this.mostrarMensaje('Especialidad creada');
        this.cargarCatalogos();
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear la especialidad'),
    });
  }

  registrarMedico(): void {
    this.api.registrarMedico(this.nuevoMedico).subscribe({
      next: () => {
        this.nuevoMedico = { numDoc: '', nombre: '', apellido: '', codEspe: 0, correo: '', clave: '' };
        this.mostrarMensaje('Medico registrado');
        this.cargarCatalogos();
      },
      error: (err) => this.mostrarError(err, 'No se pudo registrar el medico'),
    });
  }

  registrarEncargado(): void {
    this.api.registrarEncargado(this.nuevoEncargado).subscribe({
      next: () => {
        this.nuevoEncargado = { numDoc: '', nombre: '', apellido: '', correo: '', clave: '' };
        this.mostrarMensaje('Encargado registrado');
        this.cargarCatalogos();
      },
      error: (err) => this.mostrarError(err, 'No se pudo registrar el encargado'),
    });
  }

  crearHorario(): void {
    this.api.crearHorario(this.nuevoHorario).subscribe({
      next: (horario) => {
        this.nuevoHorario = { fecha: '', codMed: '', codEncargado: '' };
        this.mostrarMensaje('Horario creado');
        this.cargarCatalogos();
        if (this.solicitudPreparada) {
          this.nuevaDisponibilidad = {
            codHor: horario.codHor,
            horaInicio: this.formatoHora(this.solicitudPreparada.horaInicio),
            horaFin: this.formatoHora(this.solicitudPreparada.horaFin),
          };
          this.activeTab = 'disponibilidades';
        }
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear el horario'),
    });
  }

  crearDisponibilidad(): void {
    this.api.crearDisponibilidadesRango(this.nuevaDisponibilidad).subscribe({
      next: (disponibilidades) => {
        this.nuevaDisponibilidad = { codHor: 0, horaInicio: '', horaFin: '' };
        this.solicitudPreparada = null;
        this.mostrarMensaje(`Se crearon ${disponibilidades.length} bloques de 30 minutos`);
        this.cargarCatalogos();
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear la disponibilidad'),
    });
  }

  prepararSolicitud(solicitud: SolicitudMedica): void {
    this.solicitudPreparada = solicitud;
    this.nuevoHorario = {
      fecha: solicitud.fecha,
      codMed: solicitud.medico.codMed,
      codEncargado: '',
    };
    this.nuevaDisponibilidad = {
      codHor: 0,
      horaInicio: this.formatoHora(solicitud.horaInicio),
      horaFin: this.formatoHora(solicitud.horaFin),
    };
    this.activeTab = 'horarios';
    this.mostrarMensaje('Solicitud cargada. Crea el horario y luego se completara el rango de disponibilidad.');
  }

  atenderCita(codCita: number): void {
    this.api.atenderCita(codCita).subscribe({
      next: () => {
        this.mostrarMensaje('Cita marcada como atendida');
        this.cargarCitasMedico();
      },
      error: (err) => this.mostrarError(err, 'No se pudo atender la cita'),
    });
  }

  citaPacienteActualizada(mensaje: string): void {
    this.activeTab = 'citas';
    this.mostrarMensaje(mensaje);
    this.cargarCitasPaciente();
  }

  handleLogout(): void {
    this.auth.logout();
  }

  esPaciente(): boolean {
    return this.user?.rol === 'PACIENTE';
  }

  esMedico(): boolean {
    return this.user?.rol === 'MEDICO';
  }

  esEncargado(): boolean {
    return this.user?.rol === 'ENCARGADO_CITAS' || this.user?.rol === 'ADMIN';
  }

  citasActivasPaciente(): number {
    return this.citasPaciente.filter((c) => c.estado === 'REGISTRADA' || c.estado === 'POSTERGADA' || c.estado === 'PENDIENTE').length;
  }

  citasCanceladasPaciente(): number {
    return this.citasPaciente.filter((c) => c.estado === 'CANCELADA').length;
  }

  estadoClase(cita: Cita): string {
    if (cita.estado === 'CANCELADA') return 'badge danger';
    if (cita.estado === 'ATENDIDA') return 'badge info';
    if (cita.estado === 'POSTERGADA') return 'badge warning';
    return 'badge success';
  }

  formatoHora(hora: string): string {
    return hora?.slice(0, 5) || '';
  }

  nombreUsuario(): string {
    if (this.user?.nombreCompleto) return this.user.nombreCompleto;
    if (this.user?.rol === 'ADMIN') return 'Administrador';
    return 'Usuario';
  }

  private limpiarMensajes(): void {
    this.mensaje = '';
    this.error = '';
  }

  private mostrarMensaje(mensaje: string): void {
    this.error = '';
    this.mensaje = mensaje;
  }

  private mostrarError(err: any, fallback: string): void {
    this.mensaje = '';
    this.error = err?.error?.error || err?.error?.message || fallback;
  }
}
