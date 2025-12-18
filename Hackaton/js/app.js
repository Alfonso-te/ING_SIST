// js/app.js

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

// --- GUARDAR CITA (AHORA CON HORARIO) ---
async function guardarCita(e) {
    e.preventDefault();
    const tipo = document.getElementById('tipo-cita').value;
    const fecha = document.getElementById('fecha-cita').value;
    const horario = document.getElementById('horario-cita').value; // NUEVO CAMPO
    
    let detalleAdmin = null, maestro = null, lugar = null;
    if (tipo === 'Administrativa') detalleAdmin = document.getElementById('detalle-admin').value;
    else { maestro = document.getElementById('nombre-maestro').value; lugar = document.getElementById('lugar-asesoria').value; }

    const { error } = await window.clienteSupabase.from('citas').insert({
        alumno_nombre: usuarioActual.nombre,
        alumno_matricula: usuarioActual.matricula,
        tipo, detalle_admin, maestro, lugar, fecha, horario, estado: 'Pendiente'
    });

    if (error) alert(error.message);
    else { alert('Cita agendada'); e.target.reset(); mostrarPantalla('pantalla-menu'); }
}

// --- GUARDAR RESERVA ---
async function guardarReserva(e) {
    e.preventDefault();
    const lugar = document.getElementById('lugar-reserva').value;
    const sala = document.getElementById('nombre-sala').value;
    const fecha = document.getElementById('fecha-reserva').value;
    const horario = document.getElementById('horario-reserva').value;

    const { error } = await window.clienteSupabase.from('reservas').insert({
        alumno_nombre: usuarioActual.nombre,
        alumno_matricula: usuarioActual.matricula,
        tipo_espacio: lugar, nombre_sala: sala, fecha, horario, estado: 'Pendiente'
    });

    if (error) alert(error.message);
    else { alert('Reserva creada'); e.target.reset(); mostrarPantalla('pantalla-menu'); }
}

// --- CARGAR DATOS (HISTORIAL Y ADMIN) ---
// Esta función sirve tanto para el Alumno (solo suyas) como para el Admin (todas)
async function cargarDatos(esAdmin = false) {
    const contenedor = document.getElementById(esAdmin ? 'admin-lista-contenedor' : 'lista-contenedor');
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    let queryCitas = window.clienteSupabase.from('citas').select('*');
    let queryReservas = window.clienteSupabase.from('reservas').select('*');

    // Si NO es admin, filtra solo las suyas
    if (!esAdmin) {
        queryCitas = queryCitas.eq('alumno_matricula', usuarioActual.matricula);
        queryReservas = queryReservas.eq('alumno_matricula', usuarioActual.matricula);
    }

    const [resCitas, resReservas] = await Promise.all([queryCitas, queryReservas]);
    const citas = resCitas.data || [];
    const reservas = resReservas.data || [];

    contenedor.innerHTML = '';
    
    if (citas.length === 0 && reservas.length === 0) {
        contenedor.innerHTML = '<p class="text-center text-muted">No hay registros.</p>';
        return;
    }

    // Renderizar CITAS
    citas.forEach(c => {
        let detalle = c.tipo === 'Administrativa' ? c.detalle_admin : `${c.maestro} (${c.lugar})`;
        // Botones Admin
        let acciones = '';
        if(esAdmin) {
            acciones = `
            <div class="mt-2 d-flex gap-2">
                <button class="btn btn-sm btn-success flex-grow-1" onclick="cambiarEstado('citas', ${c.id}, 'Aceptada')">Aceptar</button>
                <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="cambiarEstado('citas', ${c.id}, 'Rechazada')">Rechazar</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalEdicion('citas', '${c.id}', '${c.fecha}', '${c.horario}', '${detalle}')"><i class="bi bi-pencil"></i></button>
            </div>`;
        } else {
            // Botón Alumno (Solo editar)
            acciones = `<button class="btn btn-sm btn-link text-muted w-100" onclick="abrirModalEdicion('citas', '${c.id}', '${c.fecha}', '${c.horario}', '${detalle}')">Editar detalles</button>`;
        }

        contenedor.innerHTML += `
            <div class="card mb-3 shadow-sm border-start border-4 border-primary">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h6 class="text-primary fw-bold">Cita: ${c.tipo}</h6>
                        <span class="badge ${obtenerColorBadge(c.estado)}">${c.estado}</span>
                    </div>
                    <p class="mb-1 fw-bold">${detalle}</p>
                    <p class="small text-muted mb-0">📅 ${c.fecha} | ⏰ ${c.horario || 'Sin hora'}</p>
                    <p class="small text-muted mb-0">Alumno: ${c.alumno_nombre}</p>
                    ${acciones}
                </div>
            </div>`;
    });

    // Renderizar RESERVAS (Lógica similar)
    reservas.forEach(r => {
        let acciones = '';
        if(esAdmin) {
            acciones = `
            <div class="mt-2 d-flex gap-2">
                <button class="btn btn-sm btn-success flex-grow-1" onclick="cambiarEstado('reservas', ${r.id}, 'Aceptada')">Aceptar</button>
                <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="cambiarEstado('reservas', ${r.id}, 'Rechazada')">Rechazar</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="abrirModalEdicion('reservas', '${r.id}', '${r.fecha}', '${r.horario}', '${r.nombre_sala}')"><i class="bi bi-pencil"></i></button>
            </div>`;
        } else {
             acciones = `<button class="btn btn-sm btn-link text-muted w-100" onclick="abrirModalEdicion('reservas', '${r.id}', '${r.fecha}', '${r.horario}', '${r.nombre_sala}')">Editar detalles</button>`;
        }

        contenedor.innerHTML += `
            <div class="card mb-3 shadow-sm border-start border-4 border-success">
                <div class="card-body">
                    <div class="d-flex justify-content-between">
                        <h6 class="text-success fw-bold">Reserva: ${r.tipo_espacio}</h6>
                        <span class="badge ${obtenerColorBadge(r.estado)}">${r.estado}</span>
                    </div>
                    <p class="mb-1 fw-bold">${r.nombre_sala}</p>
                    <p class="small text-muted mb-0">📅 ${r.fecha} | ⏰ ${r.horario}</p>
                    <p class="small text-muted mb-0">Alumno: ${r.alumno_nombre}</p>
                    ${acciones}
                </div>
            </div>`;
    });
}

function obtenerColorBadge(estado) {
    if(estado === 'Aceptada') return 'bg-success';
    if(estado === 'Rechazada') return 'bg-danger';
    return 'bg-warning text-dark';
}

// --- EDICIÓN Y ESTADOS ---
let editData = {}; // Variable temporal para guardar qué estamos editando

function abrirModalEdicion(tabla, id, fecha, horario, extra) {
    editData = { tabla, id };
    document.getElementById('edit-fecha').value = fecha;
    document.getElementById('edit-horario').value = horario !== 'undefined' ? horario : '';
    // Podrías agregar un campo extra para editar sala/maestro si quisieras
    
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
        alert("Actualizado");
        // Recargar la lista correcta dependiendo de si soy admin o no
        const esAdmin = usuarioActual.rol === 'admin';
        cargarDatos(esAdmin);
        // Cerrar modal manualmente
        const modalEl = document.getElementById('modalEditar');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
    }
}

async function cambiarEstado(tabla, id, estado) {
    await window.clienteSupabase.from(tabla).update({ estado }).eq('id', id);
    cargarDatos(true); // Recargar como admin
}

// Wrapper para cargar panel admin
function cargarPanelAdmin() {
    cargarDatos(true);
}

function verHistorial() {
    cargarDatos(false);
    mostrarPantalla('pantalla-historial');
}