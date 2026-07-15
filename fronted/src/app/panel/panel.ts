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
import { descargarComprobantePdf } from '../Services/comprobante';
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
  estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
  fechaInicio: string;
  fechaFin: string;
  fechas: string[];
  horaInicio: string;
  horaFin: string;
};

type DiaAgenda = {
  fecha: string;
  etiqueta: string;
  dia: string;
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
  filtrosSolicitudes = {
    estado: 'PENDIENTE' as 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | '',
    codEspe: 0,
    codMed: '',
  };
  horariosSemanaMedico: Disponibilidad[] = [];
  fechaSemanaMedico = this.fechaLocal(new Date());
  fechaReportePendientes = '';
  citaDetalle: Cita | null = null;

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
  fechasSeleccionadasPorGrupo: Record<string, string[]> = {};

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
        solicitud.estado,
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
    if (tab === 'solicitudes') {
      this.cargarSolicitudesMedicas();
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
    this.cargarSolicitudesMedicas();
  }

  cargarSolicitudesMedicas(): void {
    this.api
      .listarSolicitudesMedicas({
        estado: this.filtrosSolicitudes.estado,
        codEspe: this.filtrosSolicitudes.codEspe || undefined,
        codMed: this.filtrosSolicitudes.codMed || undefined,
      })
      .subscribe({
        next: (data) => (this.solicitudesMedicas = data),
        error: (err) => this.mostrarError(err, 'No se pudieron cargar las solicitudes medicas'),
      });
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
      next: (data) => {
        this.citasPendientes = data;
        this.sincronizarFechaReportePendientes();
      },
      error: (err) => this.mostrarError(err, 'No se pudieron cargar las citas pendientes'),
    });
    this.api.historialMedico(this.user.codigo).subscribe({
      next: (data) => (this.historial = data),
      error: (err) => this.mostrarError(err, 'No se pudo cargar el historial'),
    });
    this.api.listarSolicitudesMedicas({ codMed: this.user.codigo }).subscribe({
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
        const ids = this.solicitudGrupoPreparada?.solicitudes.map((solicitud) => solicitud.idSolicitud) || [];
        if (ids.length > 0) {
          this.api.cambiarEstadoSolicitudesMedicas(ids, 'ACEPTADO').subscribe({
            next: () => {
              this.solicitudPreparada = null;
              this.solicitudGrupoPreparada = null;
              this.mostrarMensaje(`Se crearon ${disponibilidades.length} bloques y se aceptaron ${ids.length} solicitudes`);
              this.cargarCatalogos();
            },
            error: (err) => this.mostrarError(err, 'Se creo el horario, pero no se pudo aceptar la solicitud'),
          });
          return;
        }
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
    if (grupo.estado !== 'PENDIENTE') {
      this.mostrarError(null, 'Solo se pueden aceptar solicitudes pendientes');
      return;
    }
    const fechas = this.fechasParaAceptar(grupo);
    const solicitudes = this.solicitudesParaAceptar(grupo);
    this.solicitudPreparada = null;
    this.solicitudGrupoPreparada = {
      ...grupo,
      solicitudes,
      fechaInicio: fechas[0],
      fechaFin: fechas[fechas.length - 1],
      fechas,
    };
    this.nuevoHorario = {
      fechaInicio: fechas[0],
      fechaFin: fechas[fechas.length - 1],
      codMed: grupo.medico.codMed,
      codEncargado: '',
      consultorio: '',
      duracionMinutos: 30,
      mismaHora: true,
      horaInicio: this.formatoHora(grupo.horaInicio),
      horaFin: this.formatoHora(grupo.horaFin),
      dias: fechas.map((fecha) => ({
        fecha,
        horaInicio: this.formatoHora(grupo.horaInicio),
        horaFin: this.formatoHora(grupo.horaFin),
      })),
    };
    this.activeTab = 'horarios';
    this.mostrarMensaje(`Solicitud cargada con ${fechas.length} fechas. Completa consultorio y duracion para aceptar las fechas seleccionadas.`);
  }

  alternarFechaSolicitud(grupo: SolicitudMedicaGrupo, fecha: string): void {
    const seleccionadas = this.fechasSeleccionadasPorGrupo[grupo.clave] || [];
    this.fechasSeleccionadasPorGrupo[grupo.clave] = seleccionadas.includes(fecha)
      ? seleccionadas.filter((item) => item !== fecha)
      : [...seleccionadas, fecha].sort();
  }

  fechaSolicitudSeleccionada(grupo: SolicitudMedicaGrupo, fecha: string): boolean {
    return (this.fechasSeleccionadasPorGrupo[grupo.clave] || []).includes(fecha);
  }

  cantidadFechasSeleccionadas(grupo: SolicitudMedicaGrupo): number {
    return this.fechasParaAceptar(grupo).length;
  }

  limpiarSeleccionSolicitud(grupo: SolicitudMedicaGrupo): void {
    this.fechasSeleccionadasPorGrupo[grupo.clave] = [];
  }

  rechazarSolicitudGrupo(grupo: SolicitudMedicaGrupo): void {
    const ids = grupo.solicitudes.map((solicitud) => solicitud.idSolicitud);
    this.api.cambiarEstadoSolicitudesMedicas(ids, 'RECHAZADO').subscribe({
      next: () => {
        this.mostrarMensaje(`Se rechazaron ${ids.length} solicitudes`);
        this.cargarSolicitudesMedicas();
      },
      error: (err) => this.mostrarError(err, 'No se pudo rechazar la solicitud'),
    });
  }

  atenderCita(codCita: number): void {
    this.api.atenderCita(codCita).subscribe({
      next: () => {
        this.citaDetalle = null;
        this.mostrarMensaje('Cita marcada como atendida');
        this.cargarCitasMedico();
      },
      error: (err) => this.mostrarError(err, 'No se pudo atender la cita'),
    });
  }

  marcarAusente(codCita: number): void {
    this.api.marcarAusente(codCita).subscribe({
      next: () => {
        this.citaDetalle = null;
        this.mostrarMensaje('Cita marcada como ausente');
        this.cargarCitasMedico();
      },
      error: (err) => this.mostrarError(err, 'No se pudo marcar la cita como ausente'),
    });
  }

  abrirDetalleCita(cita: Cita): void {
    this.citaDetalle = cita;
  }

  cerrarDetalleCita(): void {
    this.citaDetalle = null;
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
    if (cita.estado === 'ATENDIDA') return 'badge success';
    if (cita.estado === 'AUSENTE') return 'badge absent';
    if (cita.estado === 'POSTERGADA') return 'badge warning';
    return 'badge pending';
  }

  estadoSolicitudClase(estado: string): string {
    if (estado === 'ACEPTADO') return 'badge success';
    if (estado === 'RECHAZADO') return 'badge danger';
    return 'badge pending';
  }

  formatoHora(hora: string): string {
    return hora?.slice(0, 5) || '';
  }

  fechasCitasPendientesMedico(): string[] {
    return [...new Set(this.citasPendientes.map((cita) => cita.fecha))].sort();
  }

  citasPendientesReporte(): Cita[] {
    if (!this.fechaReportePendientes) return [];
    return this.citasPendientes
      .filter((cita) => cita.fecha === this.fechaReportePendientes)
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }

  descargarReporteCitasPendientes(): void {
    const citas = this.citasPendientesReporte();
    if (!this.fechaReportePendientes || citas.length === 0) {
      this.mostrarError(null, 'Selecciona un dia con citas pendientes para generar el reporte');
      return;
    }

    descargarComprobantePdf(
      'Reporte de citas pendientes',
      `${this.nombreUsuario()} - ${this.fechaReportePendientes}`,
      [
        { label: 'Medico', value: this.nombreUsuario() },
        { label: 'Fecha de atencion', value: this.fechaReportePendientes },
        { label: 'Total de citas', value: citas.length },
        ...citas.map((cita) => ({
          label: `Cita #${cita.codCita}`,
          value: `${this.formatoHora(cita.horaInicio)} - ${this.formatoHora(cita.horaFin)} | ${cita.paciente} | ${cita.especialidad} | ${cita.consultorio || '-'}`,
        })),
      ],
      `reporte-citas-${this.fechaReportePendientes}.pdf`
    );
  }

  rangoSemanaMedico(): string {
    const inicio = this.inicioSemana(this.fechaSemanaMedico || this.fechaLocal(new Date()));
    return `${inicio} al ${this.sumarDias(inicio, 6)}`;
  }

  diasSemanaMedico(): DiaAgenda[] {
    const inicio = this.inicioSemana(this.fechaSemanaMedico || this.fechaLocal(new Date()));
    const nombres = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    return nombres.map((dia, index) => {
      const fecha = this.sumarDias(inicio, index);
      return {
        fecha,
        dia,
        etiqueta: fecha.slice(8, 10),
      };
    });
  }

  horasAgenda(): string[] {
    const horas: string[] = [];
    for (let hora = 7; hora < 22; hora++) {
      horas.push(`${String(hora).padStart(2, '0')}:00`);
    }
    return horas;
  }

  agendaGridRows(): string {
    return `44px repeat(${(22 - 7) * 6}, 14px)`;
  }

  estiloBloqueHorario(disponibilidad: Disponibilidad): Record<string, string> {
    const dias = this.diasSemanaMedico();
    const diaIndex = dias.findIndex((dia) => dia.fecha === disponibilidad.horario.fecha);
    const inicio = this.minutosDesdeInicio(disponibilidad.horaInicio);
    const fin = this.minutosDesdeInicio(disponibilidad.horaFin);
    const rowStart = Math.max(2, Math.floor(inicio / 10) + 2);
    const span = Math.max(2, Math.ceil((fin - inicio) / 10));
    return {
      'grid-column': `${diaIndex + 2} / span 1`,
      'grid-row': `${rowStart} / span ${span}`,
    };
  }

  estadoDisponibilidadClase(estado: string): string {
    if (estado === 'RESERVADO') return 'schedule-event reserved';
    if (estado === 'NO_DISPONIBLE') return 'schedule-event absent';
    return 'schedule-event available';
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
      estado: primera.estado,
      fechaInicio: primera.fecha,
      fechaFin: ultima.fecha,
      fechas: ordenadas.map((solicitud) => solicitud.fecha),
      horaInicio: primera.horaInicio,
      horaFin: primera.horaFin,
    };
  }

  private fechasParaAceptar(grupo: SolicitudMedicaGrupo): string[] {
    const seleccionadas = this.fechasSeleccionadasPorGrupo[grupo.clave] || [];
    return seleccionadas.length > 0 ? [...seleccionadas].sort() : grupo.fechas;
  }

  private solicitudesParaAceptar(grupo: SolicitudMedicaGrupo): SolicitudMedica[] {
    const fechas = new Set(this.fechasParaAceptar(grupo));
    return grupo.solicitudes.filter((solicitud) => fechas.has(solicitud.fecha));
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

  private sincronizarFechaReportePendientes(): void {
    const fechas = this.fechasCitasPendientesMedico();
    if (fechas.length === 0) {
      this.fechaReportePendientes = '';
      return;
    }
    if (!this.fechaReportePendientes || !fechas.includes(this.fechaReportePendientes)) {
      this.fechaReportePendientes = fechas[0];
    }
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

  private minutosDesdeInicio(hora: string): number {
    const [hh, mm] = this.formatoHora(hora).split(':').map(Number);
    return (hh - 7) * 60 + (mm || 0);
  }
}
