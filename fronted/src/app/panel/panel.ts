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

type RangoDiaForm = {
  fecha: string;
  horaInicio: string;
  horaFin: string;
};

type SolicitudMedicaGrupo = {
  clave: string;
  solicitudes: SolicitudMedica[];
  medico: Medico;
  fechaInicio: string;
  fechaFin: string;
  fechas: string[];
  horaInicio: string;
  horaFin: string;
};

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
  horariosSemanaMedico: Disponibilidad[] = [];
  fechaSemanaMedico = this.fechaLocal(new Date());

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
    fechaInicio: '',
    fechaFin: '',
    codMed: '',
    codEncargado: '',
    consultorio: '',
    duracionMinutos: 30,
    mismaHora: true,
    horaInicio: '',
    horaFin: '',
    dias: [] as RangoDiaForm[],
  };
  nuevaDisponibilidad = {
    codHor: 0,
    horaInicio: '',
    horaFin: '',
    duracionMinutos: 30,
  };
  nuevaSolicitud = {
    fechaInicio: '',
    fechaFin: '',
    mismaHora: true,
    horaInicio: '',
    horaFin: '',
    dias: [] as RangoDiaForm[],
  };
  solicitudPreparada: SolicitudMedica | null = null;
  solicitudGrupoPreparada: SolicitudMedicaGrupo | null = null;

  get menuItems() {
    const items = [{ label: 'Inicio', action: () => this.cambiarTab('inicio') }];

    if (this.esPaciente()) {
      items.push({ label: 'Registrar cita', action: () => this.cambiarTab('registrar') });
      items.push({ label: 'Gestionar citas', action: () => this.cambiarTab('citas') });
    }

    if (this.esMedico()) {
      items.push({ label: 'Solicitar disponibilidad', action: () => this.cambiarTab('solicitar') });
      items.push({ label: 'Horarios semana', action: () => this.cambiarTab('horarios-medico') });
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

  get solicitudesAgrupadas(): SolicitudMedicaGrupo[] {
    const gruposPorClave = new Map<string, SolicitudMedica[]>();

    this.solicitudesMedicas.forEach((solicitud) => {
      const clave = [
        solicitud.medico.codMed,
        this.formatoHora(solicitud.horaInicio),
        this.formatoHora(solicitud.horaFin),
      ].join('|');
      gruposPorClave.set(clave, [...(gruposPorClave.get(clave) || []), solicitud]);
    });

    const grupos: SolicitudMedicaGrupo[] = [];

    gruposPorClave.forEach((solicitudes, claveBase) => {
      const ordenadas = [...solicitudes].sort((a, b) => a.fecha.localeCompare(b.fecha));
      let bloque: SolicitudMedica[] = [];

      ordenadas.forEach((solicitud) => {
        const anterior = bloque[bloque.length - 1];
        if (!anterior || this.diasEntre(anterior.fecha, solicitud.fecha) <= 1) {
          bloque.push(solicitud);
          return;
        }
        grupos.push(this.crearGrupoSolicitud(`${claveBase}|${grupos.length}`, bloque));
        bloque = [solicitud];
      });

      if (bloque.length > 0) {
        grupos.push(this.crearGrupoSolicitud(`${claveBase}|${grupos.length}`, bloque));
      }
    });

    return grupos.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
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
    if (tab === 'horarios-medico') {
      this.cargarHorariosSemanaMedico();
    }
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
    this.cargarHorariosSemanaMedico();
  }

  cargarHorariosSemanaMedico(): void {
    if (!this.user?.codigo) return;
    const inicio = this.inicioSemana(this.fechaSemanaMedico || this.fechaLocal(new Date()));
    const fin = this.sumarDias(inicio, 6);
    this.api
      .listarDisponibilidades({
        codMed: this.user.codigo,
        fechaInicio: inicio,
        fechaFin: fin,
        incluirPasadas: true,
      })
      .subscribe({
        next: (data) => (this.horariosSemanaMedico = this.ordenarDisponibilidades(data)),
        error: (err) => this.mostrarError(err, 'No se pudieron cargar los horarios de la semana'),
      });
  }

  crearSolicitudMedica(): void {
    if (!this.user?.codigo) return;
    const payload = this.payloadSolicitudMedica();
    this.api.crearSolicitudesMedicasRango({ codMed: this.user.codigo, ...payload }).subscribe({
      next: (solicitudes) => {
        this.nuevaSolicitud = {
          fechaInicio: '',
          fechaFin: '',
          mismaHora: true,
          horaInicio: '',
          horaFin: '',
          dias: [],
        };
        this.mostrarMensaje(`Se enviaron ${solicitudes.length} solicitudes al jefe medico`);
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
    const payload = this.payloadHorarioMasivo();
    this.api.crearDisponibilidadesMasivas(payload).subscribe({
      next: (disponibilidades) => {
        this.nuevoHorario = {
          fechaInicio: '',
          fechaFin: '',
          codMed: '',
          codEncargado: '',
          consultorio: '',
          duracionMinutos: 30,
          mismaHora: true,
          horaInicio: '',
          horaFin: '',
          dias: [],
        };
        this.solicitudPreparada = null;
        this.solicitudGrupoPreparada = null;
        this.mostrarMensaje(`Se crearon ${disponibilidades.length} bloques de disponibilidad`);
        this.cargarCatalogos();
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear el horario masivo'),
    });
  }

  crearDisponibilidad(): void {
    this.api.crearDisponibilidadesRango(this.nuevaDisponibilidad).subscribe({
      next: (disponibilidades) => {
        this.nuevaDisponibilidad = { codHor: 0, horaInicio: '', horaFin: '', duracionMinutos: 30 };
        this.solicitudPreparada = null;
        this.solicitudGrupoPreparada = null;
        this.mostrarMensaje(`Se crearon ${disponibilidades.length} bloques de disponibilidad`);
        this.cargarCatalogos();
      },
      error: (err) => this.mostrarError(err, 'No se pudo crear la disponibilidad'),
    });
  }

  prepararSolicitud(solicitud: SolicitudMedica): void {
    this.solicitudPreparada = solicitud;
    this.solicitudGrupoPreparada = null;
    this.nuevoHorario = {
      fechaInicio: solicitud.fecha,
      fechaFin: solicitud.fecha,
      codMed: solicitud.medico.codMed,
      codEncargado: '',
      consultorio: '',
      duracionMinutos: 30,
      mismaHora: true,
      horaInicio: this.formatoHora(solicitud.horaInicio),
      horaFin: this.formatoHora(solicitud.horaFin),
      dias: [],
    };
    this.nuevaDisponibilidad = {
      codHor: 0,
      horaInicio: this.formatoHora(solicitud.horaInicio),
      horaFin: this.formatoHora(solicitud.horaFin),
      duracionMinutos: 30,
    };
    this.activeTab = 'horarios';
    this.mostrarMensaje('Solicitud cargada. Al crear el horario se generaran los bloques de 30 minutos.');
  }

  prepararSolicitudGrupo(grupo: SolicitudMedicaGrupo): void {
    this.solicitudPreparada = null;
    this.solicitudGrupoPreparada = grupo;
    this.nuevoHorario = {
      fechaInicio: grupo.fechaInicio,
      fechaFin: grupo.fechaFin,
      codMed: grupo.medico.codMed,
      codEncargado: '',
      consultorio: '',
      duracionMinutos: 30,
      mismaHora: true,
      horaInicio: this.formatoHora(grupo.horaInicio),
      horaFin: this.formatoHora(grupo.horaFin),
      dias: grupo.fechas.map((fecha) => ({
        fecha,
        horaInicio: this.formatoHora(grupo.horaInicio),
        horaFin: this.formatoHora(grupo.horaFin),
      })),
    };
    this.activeTab = 'horarios';
    this.mostrarMensaje(`Solicitud cargada con ${grupo.fechas.length} fechas. Completa consultorio y duracion para aceptar todas a la vez.`);
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

  rangoSemanaMedico(): string {
    const inicio = this.inicioSemana(this.fechaSemanaMedico || this.fechaLocal(new Date()));
    return `${inicio} al ${this.sumarDias(inicio, 6)}`;
  }

  sincronizarDiasSolicitud(): void {
    this.nuevaSolicitud.dias = this.sincronizarDias(
      this.nuevaSolicitud.fechaInicio,
      this.nuevaSolicitud.fechaFin,
      this.nuevaSolicitud.dias
    );
  }

  sincronizarDiasHorario(): void {
    this.nuevoHorario.dias = this.sincronizarDias(
      this.nuevoHorario.fechaInicio,
      this.nuevoHorario.fechaFin,
      this.nuevoHorario.dias
    );
  }

  payloadSolicitudMedica() {
    const fechaFin = this.nuevaSolicitud.fechaFin || this.nuevaSolicitud.fechaInicio;
    if (!this.nuevaSolicitud.mismaHora) {
      this.sincronizarDiasSolicitud();
    }
    return {
      fechaInicio: this.nuevaSolicitud.fechaInicio,
      fechaFin,
      mismaHora: this.nuevaSolicitud.mismaHora,
      horaInicio: this.nuevaSolicitud.mismaHora ? this.nuevaSolicitud.horaInicio : undefined,
      horaFin: this.nuevaSolicitud.mismaHora ? this.nuevaSolicitud.horaFin : undefined,
      dias: this.nuevaSolicitud.mismaHora ? [] : this.nuevaSolicitud.dias,
    };
  }

  payloadHorarioMasivo() {
    const fechaFin = this.nuevoHorario.fechaFin || this.nuevoHorario.fechaInicio;
    if (!this.nuevoHorario.mismaHora) {
      this.sincronizarDiasHorario();
    }
    return {
      codMed: this.nuevoHorario.codMed,
      codEncargado: this.nuevoHorario.codEncargado || undefined,
      consultorio: this.nuevoHorario.consultorio || undefined,
      fechaInicio: this.nuevoHorario.fechaInicio,
      fechaFin,
      mismaHora: this.nuevoHorario.mismaHora,
      horaInicio: this.nuevoHorario.mismaHora ? this.nuevoHorario.horaInicio : undefined,
      horaFin: this.nuevoHorario.mismaHora ? this.nuevoHorario.horaFin : undefined,
      duracionMinutos: this.nuevoHorario.duracionMinutos || 30,
      dias: this.nuevoHorario.mismaHora ? [] : this.nuevoHorario.dias,
    };
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

  private crearGrupoSolicitud(clave: string, solicitudes: SolicitudMedica[]): SolicitudMedicaGrupo {
    const ordenadas = [...solicitudes].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const primera = ordenadas[0];
    const ultima = ordenadas[ordenadas.length - 1];
    return {
      clave,
      solicitudes: ordenadas,
      medico: primera.medico,
      fechaInicio: primera.fecha,
      fechaFin: ultima.fecha,
      fechas: ordenadas.map((solicitud) => solicitud.fecha),
      horaInicio: primera.horaInicio,
      horaFin: primera.horaFin,
    };
  }

  private diasEntre(fechaA: string, fechaB: string): number {
    const a = new Date(`${fechaA}T00:00:00`).getTime();
    const b = new Date(`${fechaB}T00:00:00`).getTime();
    return Math.round((b - a) / 86400000);
  }

  private ordenarDisponibilidades(data: Disponibilidad[]): Disponibilidad[] {
    return [...data].sort((a, b) => {
      const fechaA = `${a.horario.fecha} ${a.horaInicio}`;
      const fechaB = `${b.horario.fecha} ${b.horaInicio}`;
      return fechaA.localeCompare(fechaB);
    });
  }

  private sincronizarDias(fechaInicio: string, fechaFin: string, actuales: RangoDiaForm[]): RangoDiaForm[] {
    if (!fechaInicio) return [];
    const fin = fechaFin || fechaInicio;
    if (fechaInicio > fin) return [];

    const actualesPorFecha = new Map(actuales.map((dia) => [dia.fecha, dia]));
    const dias: RangoDiaForm[] = [];

    for (let fecha = fechaInicio; fecha <= fin; fecha = this.siguienteFecha(fecha)) {
      const existente = actualesPorFecha.get(fecha);
      dias.push({
        fecha,
        horaInicio: existente?.horaInicio || '',
        horaFin: existente?.horaFin || '',
      });
    }

    return dias;
  }

  private siguienteFecha(fecha: string): string {
    const date = new Date(`${fecha}T00:00:00`);
    date.setDate(date.getDate() + 1);
    return this.fechaLocal(date);
  }

  private inicioSemana(fecha: string): string {
    const date = new Date(`${fecha}T00:00:00`);
    const dia = date.getDay() || 7;
    date.setDate(date.getDate() - dia + 1);
    return this.fechaLocal(date);
  }

  private sumarDias(fecha: string, dias: number): string {
    const date = new Date(`${fecha}T00:00:00`);
    date.setDate(date.getDate() + dias);
    return this.fechaLocal(date);
  }

  private fechaLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
