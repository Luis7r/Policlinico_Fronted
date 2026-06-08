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
} from '../Services/api';
import { AuthService } from '../Services/auth';
import { Sidebar } from '../sidebar/sidebar';

@Component({
  selector: 'app-panel',
  imports: [CommonModule, FormsModule, Sidebar],
  templateUrl: './panel.html',
  styleUrls: ['./panel.css'],
})
export class Panel implements OnInit {
  user: LoginResponse | null = null;
  mensaje = '';
  error = '';
  activeTab = 'citas';

  especialidades: Especialidad[] = [];
  medicos: Medico[] = [];
  encargados: EncargadoCitas[] = [];
  horarios: Horario[] = [];
  disponibilidades: Disponibilidad[] = [];
  citasPaciente: Cita[] = [];
  citasPendientes: Cita[] = [];
  historial: Cita[] = [];

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
  nuevaCita = {
    codDis: 0,
  };
  postergacion = {
    codCita: 0,
    nuevoCodDis: 0,
  };

  get menuItems() {
    const items = [
      { label: 'Inicio', action: () => (this.activeTab = 'inicio') },
    ];

    if (this.esPaciente()) {
      items.push({ label: 'Mis citas', action: () => (this.activeTab = 'citas') });
      items.push({ label: 'Registrar cita', action: () => (this.activeTab = 'registrar') });
    }

    if (this.esMedico()) {
      items.push({ label: 'Citas pendientes', action: () => (this.activeTab = 'pendientes') });
      items.push({ label: 'Historial', action: () => (this.activeTab = 'historial') });
    }

    if (this.esEncargado()) {
      items.push({ label: 'Especialidades', action: () => (this.activeTab = 'especialidades') });
      items.push({ label: 'Médicos', action: () => (this.activeTab = 'medicos') });
      items.push({ label: 'Encargados', action: () => (this.activeTab = 'encargados') });
      items.push({ label: 'Horarios', action: () => (this.activeTab = 'horarios') });
      items.push({ label: 'Disponibilidades', action: () => (this.activeTab = 'disponibilidades') });
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

  cargarDatosBase(): void {
    this.limpiarMensajes();
    this.api.listarEspecialidades().subscribe((data) => (this.especialidades = data));
    this.api.listarMedicos().subscribe((data) => (this.medicos = data));
    this.api.listarEncargados().subscribe((data) => (this.encargados = data));
    this.api.listarHorarios().subscribe((data) => (this.horarios = data));
    this.api.listarDisponibilidades().subscribe((data) => (this.disponibilidades = data));

    if (this.user?.rol === 'PACIENTE') {
      this.cargarCitasPaciente();
    }
    if (this.user?.rol === 'MEDICO') {
      this.cargarCitasMedico();
    }
  }

  cargarCitasPaciente(): void {
    if (!this.user) return;
    this.api.listarCitasPaciente(this.user.codigo).subscribe({
      next: (data) => (this.citasPaciente = data),
      error: (err) => this.mostrarError(err, 'No se pudieron cargar las citas del paciente'),
    });
  }

  cargarCitasMedico(): void {
    if (!this.user) return;
    this.api.citasPendientesMedico(this.user.codigo).subscribe({
      next: (data) => (this.citasPendientes = data),
      error: (err) => this.mostrarError(err, 'No se pudieron cargar las citas pendientes'),
    });
    this.api.historialMedico(this.user.codigo).subscribe({
      next: (data) => (this.historial = data),
      error: (err) => this.mostrarError(err, 'No se pudo cargar el historial'),
    });
  }

  crearEspecialidad(): void {
    this.api.crearEspecialidad(this.nuevaEspecialidad).subscribe({
      next: () => {
        this.nuevaEspecialidad = '';
        this.mensaje = 'Especialidad creada';
        this.cargarDatosBase();
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear la especialidad'),
    });
  }

  registrarMedico(): void {
    this.api.registrarMedico(this.nuevoMedico).subscribe({
      next: () => {
        this.mensaje = 'Medico registrado';
        this.nuevoMedico = { numDoc: '', nombre: '', apellido: '', codEspe: 0, correo: '', clave: '' };
        this.cargarDatosBase();
      },
      error: (err) => this.mostrarError(err, 'No se pudo registrar el medico'),
    });
  }

  registrarEncargado(): void {
    this.api.registrarEncargado(this.nuevoEncargado).subscribe({
      next: () => {
        this.mensaje = 'Encargado registrado';
        this.nuevoEncargado = { numDoc: '', nombre: '', apellido: '', correo: '', clave: '' };
        this.cargarDatosBase();
      },
      error: (err) => this.mostrarError(err, 'No se pudo registrar el encargado'),
    });
  }

  crearHorario(): void {
    this.api.crearHorario(this.nuevoHorario).subscribe({
      next: () => {
        this.mensaje = 'Horario creado';
        this.nuevoHorario = { fecha: '', codMed: '', codEncargado: '' };
        this.cargarDatosBase();
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear el horario'),
    });
  }

  crearDisponibilidad(): void {
    this.api.crearDisponibilidad({ ...this.nuevaDisponibilidad, estado: 'DISPONIBLE' }).subscribe({
      next: () => {
        this.mensaje = 'Disponibilidad creada';
        this.nuevaDisponibilidad = { codHor: 0, horaInicio: '', horaFin: '' };
        this.cargarDatosBase();
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear la disponibilidad'),
    });
  }

  registrarCita(): void {
    if (!this.user) return;
    this.api.registrarCita(this.user.codigo, this.nuevaCita.codDis).subscribe({
      next: (cita) => {
        this.mensaje = `Cita registrada. Notificacion enviada: ${cita.notificacionEnviada ? 'si' : 'no'}`;
        this.nuevaCita = { codDis: 0 };
        this.cargarDatosBase();
      },
      error: (err) => this.mostrarError(err, 'No se pudo registrar la cita'),
    });
  }

  cancelarCita(codCita: number): void {
    this.api.cancelarCita(codCita).subscribe({
      next: () => {
        this.mensaje = 'Cita cancelada';
        this.cargarDatosBase();
      },
      error: (err) => this.mostrarError(err, 'No se pudo cancelar la cita'),
    });
  }

  postergarCita(): void {
    this.api.postergarCita(this.postergacion.codCita, this.postergacion.nuevoCodDis).subscribe({
      next: () => {
        this.mensaje = 'Cita postergada';
        this.postergacion = { codCita: 0, nuevoCodDis: 0 };
        this.cargarDatosBase();
      },
      error: (err) => this.mostrarError(err, 'No se pudo postergar la cita'),
    });
  }

  atenderCita(codCita: number): void {
    this.api.atenderCita(codCita).subscribe({
      next: () => {
        this.mensaje = 'Cita marcada como atendida';
        this.cargarCitasMedico();
      },
      error: (err) => this.mostrarError(err, 'No se pudo atender la cita'),
    });
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

  disponibilidadesLibres(): Disponibilidad[] {
    return this.disponibilidades.filter((d) => d.estado === 'DISPONIBLE');
  }

  getPendientesCount(): number {
    return this.citasPaciente.filter((c) => c.estado === 'PENDIENTE').length;
  }

  getCanceladasCount(): number {
    return this.citasPaciente.filter((c) => c.estado === 'CANCELADA').length;
  }

  private limpiarMensajes(): void {
    this.mensaje = '';
    this.error = '';
  }

  private mostrarError(err: any, fallback: string): void {
    this.error = err?.error?.error || err?.error?.message || fallback;
  }
}
