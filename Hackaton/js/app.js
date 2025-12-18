// js/app.js

// --- 1. EXPORTAR FUNCIONES AL CONTEXTO GLOBAL ---
window.cambiarEstado = cambiarEstado;
window.abrirModalEdicion = abrirModalEdicion;
window.guardarCita = guardarCita;
window.guardarReserva = guardarReserva;
window.cambiarFiltroAdmin = cambiarFiltroAdmin;
window.cambiarFiltroAlumno = cambiarFiltroAlumno; // <--- NUEVA EXPORTACIÓN

// Variables globales para filtros
let filtroAdminActual = 'Pendiente';
let filtroAlumnoActual = 'Pendiente'; // <--- NUEVA VARIABLE

// --- NAVEGACIÓN ---
function mostrarPantalla(idPantalla) {
    document.querySelectorAll('.pantalla').forEach(p => {
        p.classList.remove('activa');
        p.classList.add('d-none');
    });
    const pantalla = document.getElementById(idPantalla);
    if (pantalla) {
        pantalla.classList.remove('d-none');
        setTimeout(() => pantalla.classList.add('activa'), 10);
    }
}

// --- VISUAL: MOSTRAR CAMPOS ---
function toggleCamposCita() {
    const tipo = document.getElementById('tipo-cita').value;
    const divAdmin = document.getElementById('campos-admin');
    const divAsesoria = document.getElementById('campos-asesoria');

    if (tipo === 'Administrativa') {
        divAdmin.classList.remove('d-none');
        divAsesoria.classList.add('d-none');
    } else {
        divAdmin.classList.add('d-none');
        divAsesoria.classList.remove('d-none');
    }
}

// --- GUARDAR CITA ---
async function guardarCita(e) {
    e.preventDefault();
    
    const tipo = document.getElementById('tipo-cita').value;
    const fecha = document.getElementById('fecha-cita').value;
    const horario = document.getElementById('horario-cita').value;
    const mensaje = document.getElementById('mensaje-cita').value; 
    
    let detalle_admin = null; 
    let maestro = null; 
    let lugar = null;

    if (tipo === 'Administrativa') {
        detalle_admin = document.getElementById('detalle-admin').value;
    } else { 
        maestro = document.getElementById('nombre-maestro').value; 
        lugar = document.getElementById('lugar-asesoria').value; 
    }

    const { error } = await window.clienteSupabase.from('citas').insert({
        alumno_nombre: usuarioActual.nombre,
        alumno_matricula: usuarioActual.matricula,
        tipo: tipo, 
        detalle_admin: detalle_admin, 
        maestro: maestro, 
        lugar: lugar, 
        fecha: fecha, 
        horario: horario, 
        mensaje: mensaje, 
        estado: 'Pendiente'
    });

    if (error) {
        console.error("Error SQL:", error);
        alert("Error al guardar: " + error.message);
    } else { 
        alert('✅ Cita agendada correctamente.'); 
        e.target.reset(); 
        toggleCamposCita();
        mostrarPantalla('pantalla-menu'); 
    }
}

// --- GUARDAR RESERVA ---
async function guardarReserva(e) {
    e.preventDefault();

    const lugar = document.getElementById('lugar-reserva').value;
    const sala = document.getElementById('nombre-sala').value;
    const fecha = document.getElementById('fecha-reserva').value;
    const horario = document.getElementById('horario-reserva').value;
    const mensaje = document.getElementById('mensaje-reserva').value;

    const { error } = await window.clienteSupabase.from('reservas').insert({
        alumno_nombre: usuarioActual.nombre,
        alumno_matricula: usuarioActual.matricula,
        tipo_espacio: lugar, 
        nombre_sala: sala, 
        fecha: fecha, 
        horario: horario, 
        mensaje: mensaje, 
        estado: 'Pendiente'
    });

    if (error) {
        console.error("Error SQL:", error);
        alert("Error al guardar reserva: " + error.message);
    } else { 
        alert('✅ Reserva creada correctamente.'); 
        e.target.reset(); 
        mostrarPantalla('pantalla-menu'); 
    }
}

// --- LÓGICA DE FILTROS ---
function cambiarFiltroAdmin(nuevoEstado, botonPresionado) {
    filtroAdminActual = nuevoEstado;
    document.querySelectorAll('.btn-tab-admin').forEach(btn => btn.classList.remove('active'));
    botonPresionado.classList.add('active');
    cargarDatos(true);
}

function cambiarFiltroAlumno(nuevoEstado, botonPresionado) {
    filtroAlumnoActual = nuevoEstado;
    document.querySelectorAll('.btn-tab-alumno').forEach(btn => btn.classList.remove('active'));
    botonPresionado.classList.add('active');
    cargarDatos(false);
}

// --- CARGAR DATOS (HISTORIAL Y ADMIN) ---
async function cargarDatos(esAdmin = false) {
    // Determinamos qué filtro usar dependiendo de quién pide los datos
    const filtro = esAdmin ? filtroAdminActual : filtroAlumnoActual;
    
    console.log("Cargando datos. Admin:", esAdmin, "Filtro:", filtro);
    
    const contenedor = document.getElementById(esAdmin ? 'admin-lista-contenedor' : 'lista-contenedor');
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Cargando...</p></div>';

    let queryCitas = window.clienteSupabase.from('citas').select('*');
    let queryReservas = window.clienteSupabase.from('reservas').select('*');

    if (!esAdmin) {
        // ALUMNO: Filtra por matricula Y por el ESTADO seleccionado en sus pestañas
        queryCitas = queryCitas.eq('alumno_matricula', usuarioActual.matricula).eq('estado', filtro).order('id', { ascending: false });
        queryReservas = queryReservas.eq('alumno_matricula', usuarioActual.matricula).eq('estado', filtro).order('id', { ascending: false });
    } else {
        // ADMIN: Filtra por el ESTADO seleccionado
        queryCitas = queryCitas.eq('estado', filtro).order('id', { ascending: true });
        queryReservas = queryReservas.eq('estado', filtro).order('id', { ascending: true });
    }

    const [resCitas, resReservas] = await Promise.all([queryCitas, queryReservas]);
    const citas = resCitas.data || [];
    const reservas = resReservas.data || [];

    contenedor.innerHTML = '';
    
    if (citas.length === 0 && reservas.length === 0) {
        const mensajeVacio = `No hay solicitudes en estado <b>"${filtro}"</b>.`; 
        contenedor.innerHTML = `<div class="text-center py-5 text-muted"><i class="bi bi-inbox fs-1"></i><p>${mensajeVacio}</p></div>`;
        return;
    }

    // --- RENDERIZAR CITAS ---
    citas.forEach(c => {
        let detalle = c.tipo === 'Administrativa' ? `Depto: ${c.detalle_admin}` : `Con: ${c.maestro}`;
        let msgDisplay = c.mensaje ? `<div class="alert alert-light border mt-2 mb-1 p-2 small text-truncate"><i class="bi bi-chat-left-text me-1"></i> ${c.mensaje}</div>` : '';

        // BOTONES
        let acciones = '';
        if(esAdmin) {
            // ADMIN
            if (filtro === 'Pendiente') {
                acciones = `
                <div class="mt-2 d-flex gap-2">
                    <button class="btn btn-sm btn-success flex-grow-1" onclick="window.cambiarEstado('citas', '${c.id}', 'Aceptada')">Aceptar</button>
                    <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="window.cambiarEstado('citas', '${c.id}', 'Rechazada')">Rechazar</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="window.abrirModalEdicion('citas', '${c.id}', '${c.fecha}', '${c.horario}')"><i class="bi bi-pencil"></i></button>
                </div>`;
            } else {
                 acciones = `<div class="mt-2 text-end"><small class="text-muted fst-italic">Archivada</small></div>`;
            }
        } else {
            // ALUMNO: Solo mostrar botón de editar si es PENDIENTE
            if(c.estado === 'Pendiente') {
                 acciones = `<button class="btn btn-sm btn-link text-muted w-100" onclick="window.abrirModalEdicion('citas', '${c.id}', '${c.fecha}', '${c.horario}')">Editar fecha/hora</button>`;
            } else {
                 acciones = `<div class="mt-2 text-end"><small class="text-muted fst-italic">Finalizada</small></div>`;
            }
        }

        contenedor.innerHTML += `
            <div class="card mb-3 shadow-sm border-start border-4 ${obtenerBorde(c.estado)}">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h6 class="text-primary fw-bold">Cita: ${c.tipo}</h6>
                        <span class="badge ${obtenerColorBadge(c.estado)}">${c.estado}</span>
                    </div>
                    <p class="mb-1 fw-bold">${detalle}</p>
                    <p class="small text-muted mb-1">📅 ${c.fecha} | ⏰ ${c.horario || '--:--'}</p>
                    ${msgDisplay}
                    <p class="small text-muted mb-0 mt-1">Alumno: ${c.alumno_nombre}</p>
                    ${acciones}
                </div>
            </div>`;
    });

    // --- RENDERIZAR RESERVAS ---
    reservas.forEach(r => {
        let msgDisplay = r.mensaje ? `<div class="alert alert-light border mt-2 mb-1 p-2 small text-truncate"><i class="bi bi-chat-left-text me-1"></i> ${r.mensaje}</div>` : '';

        let acciones = '';
        if(esAdmin) {
            // ADMIN
            if (filtro === 'Pendiente') {
                acciones = `
                <div class="mt-2 d-flex gap-2">
                    <button class="btn btn-sm btn-success flex-grow-1" onclick="window.cambiarEstado('reservas', '${r.id}', 'Aceptada')">Aceptar</button>
                    <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="window.cambiarEstado('reservas', '${r.id}', 'Rechazada')">Rechazar</button>
                    <button class="btn btn-sm btn-outline-secondary" onclick="window.abrirModalEdicion('reservas', '${r.id}', '${r.fecha}', '${r.horario}')"><i class="bi bi-pencil"></i></button>
                </div>`;
            } else {
                acciones = `<div class="mt-2 text-end"><small class="text-muted fst-italic">Archivada</small></div>`;
            }
        } else {
            // ALUMNO: Solo editar si es PENDIENTE
            if(r.estado === 'Pendiente') {
                acciones = `<button class="btn btn-sm btn-link text-muted w-100" onclick="window.abrirModalEdicion('reservas', '${r.id}', '${r.fecha}', '${r.horario}')">Editar fecha/hora</button>`;
            } else {
                acciones = `<div class="mt-2 text-end"><small class="text-muted fst-italic">Finalizada</small></div>`;
            }
        }

        contenedor.innerHTML += `
            <div class="card mb-3 shadow-sm border-start border-4 ${obtenerBorde(r.estado)}">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h6 class="text-success fw-bold">Reserva: ${r.tipo_espacio}</h6>
                        <span class="badge ${obtenerColorBadge(r.estado)}">${r.estado}</span>
                    </div>
                    <p class="mb-1 fw-bold">${r.nombre_sala}</p>
                    <p class="small text-muted mb-1">📅 ${r.fecha} | ⏰ ${r.horario}</p>
                    ${msgDisplay}
                    <p class="small text-muted mb-0 mt-1">Alumno: ${r.alumno_nombre}</p>
                    ${acciones}
                </div>
            </div>`;
    });
}

// --- ACTUALIZAR ESTADO ---
async function cambiarEstado(tabla, id, nuevoEstado) {
    const accion = nuevoEstado === 'Aceptada' ? 'ACEPTAR' : 'RECHAZAR';
    if (!confirm(`¿Estás seguro de ${accion} esta solicitud?`)) return;

    const { error } = await window.clienteSupabase
        .from(tabla)
        .update({ estado: nuevoEstado })
        .eq('id', id);

    if(error) {
        console.error("Error update:", error);
        alert("Error al actualizar: " + error.message);
    } else {
        cargarDatos(true); 
    }
}

// --- EDICIÓN ---
let editData = {}; 

function abrirModalEdicion(tabla, id, fecha, horario) {
    editData = { tabla, id };
    document.getElementById('edit-fecha').value = fecha;
    document.getElementById('edit-horario').value = horario !== 'undefined' ? horario : '';
    const modal = new bootstrap.Modal(document.getElementById('modalEditar'));
    modal.show();
}

async function guardarCambiosModal() {
    const nuevaFecha = document.getElementById('edit-fecha').value;
    const nuevoHorario = document.getElementById('edit-horario').value;

    const { error } = await window.clienteSupabase
        .from(editData.tabla)
        .update({ fecha: nuevaFecha, horario: nuevoHorario })
        .eq('id', editData.id);

    if(error) alert("Error: " + error.message);
    else {
        alert("Actualizado correctamente");
        const esAdmin = usuarioActual.rol === 'admin';
        // Recargar usando el filtro actual correcto
        cargarDatos(esAdmin);
        const modalEl = document.getElementById('modalEditar');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    }
}

// Helpers
function obtenerColorBadge(estado) {
    if(estado === 'Aceptada') return 'bg-success';
    if(estado === 'Rechazada') return 'bg-danger';
    return 'bg-warning text-dark';
}
function obtenerBorde(estado) {
    if(estado === 'Aceptada') return 'border-success';
    if(estado === 'Rechazada') return 'border-danger';
    return 'border-primary'; 
}
function cargarPanelAdmin() {
    // Al entrar, reseteamos a Pendientes
    filtroAdminActual = 'Pendiente';
    
    // Reset visual de tabs admin
    document.querySelectorAll('.btn-tab-admin').forEach(btn => btn.classList.remove('active'));
    // Seleccionar el primero si existe
    const tabs = document.querySelectorAll('.btn-tab-admin');
    if(tabs.length > 0) tabs[0].classList.add('active');
    
    cargarDatos(true);
}
function verHistorial() {
    // Al entrar, reseteamos a Pendientes
    filtroAlumnoActual = 'Pendiente';

    // Reset visual de tabs alumno
    document.querySelectorAll('.btn-tab-alumno').forEach(btn => btn.classList.remove('active'));
    const tabs = document.querySelectorAll('.btn-tab-alumno');
    if(tabs.length > 0) tabs[0].classList.add('active');

    cargarDatos(false);
    mostrarPantalla('pantalla-historial');
}