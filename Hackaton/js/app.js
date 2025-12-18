// js/app.js

// CONFIGURACIÓN DE HORARIOS
const HORARIO_INICIO = 8; // 8 AM
const HORARIO_FIN = 16;   // 4 PM (16:00)

// --- EXPORTAR FUNCIONES (Esto arregla el botón de "Mis Registros") ---
window.cambiarEstado = cambiarEstado;
window.abrirModalEdicion = abrirModalEdicion;
window.guardarCita = guardarCita;
window.guardarReserva = guardarReserva;
window.cambiarFiltroAdmin = cambiarFiltroAdmin;
window.cambiarFiltroAlumno = cambiarFiltroAlumno;
window.toggleCamposCita = toggleCamposCita;
window.cargarHorasDisponibles = cargarHorasDisponibles;
window.verHistorial = verHistorial; // <--- AQUÍ ESTABA EL ERROR DEL BOTÓN

// Variables globales filtros
let filtroAdminActual = 'Pendiente';
let filtroAlumnoActual = 'Pendiente';

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

// --- LÓGICA ANTI-DUPLICADOS (Horarios Dinámicos) ---
async function cargarHorasDisponibles(tipo) {
    const idFecha = tipo === 'cita' ? 'fecha-cita' : 'fecha-reserva';
    const idSelect = tipo === 'cita' ? 'horario-cita' : 'horario-reserva';
    
    const fechaSeleccionada = document.getElementById(idFecha).value;
    const selectHorario = document.getElementById(idSelect);
    
    selectHorario.innerHTML = '<option value="" disabled selected>Cargando...</option>';

    if (!fechaSeleccionada) return;

    const diaSemana = new Date(fechaSeleccionada).getUTCDay(); 
    if (diaSemana === 0 || diaSemana === 6) {
        selectHorario.innerHTML = '<option value="" disabled selected>No hay servicio en fines de semana</option>';
        return;
    }

    try {
        const { data: citas } = await window.clienteSupabase
            .from('citas')
            .select('horario')
            .eq('fecha', fechaSeleccionada)
            .neq('estado', 'Rechazada');
            
        const { data: reservas } = await window.clienteSupabase
            .from('reservas')
            .select('horario')
            .eq('fecha', fechaSeleccionada)
            .neq('estado', 'Rechazada');

        const horasOcupadas = new Set();
        if(citas) citas.forEach(c => horasOcupadas.add(c.horario));
        if(reservas) reservas.forEach(r => horasOcupadas.add(r.horario));

        selectHorario.innerHTML = '<option value="" disabled selected>Selecciona un horario</option>';
        let hayCupo = false;

        for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
            const horaStr = h.toString().padStart(2, '0') + ":00";
            const horaFinStr = (h + 1).toString().padStart(2, '0') + ":00";
            
            if (!horasOcupadas.has(horaStr)) {
                const option = document.createElement('option');
                option.value = horaStr;
                option.text = `${horaStr} - ${horaFinStr}`;
                selectHorario.appendChild(option);
                hayCupo = true;
            }
        }

        if (!hayCupo) {
            selectHorario.innerHTML = '<option value="" disabled selected>Día completo (Sin cupo)</option>';
        }

    } catch (error) {
        console.error(error);
        selectHorario.innerHTML = '<option value="" disabled selected>Error al cargar</option>';
    }
}


// --- GUARDAR CITA ---
async function guardarCita(e) {
    e.preventDefault();
    const tipo = document.getElementById('tipo-cita').value;
    const fecha = document.getElementById('fecha-cita').value;
    const horario = document.getElementById('horario-cita').value;
    const mensaje = document.getElementById('mensaje-cita').value; 
    
    if(!horario) { alert("Selecciona un horario válido"); return; }

    let detalle_admin = null, maestro = null, lugar = null;
    if (tipo === 'Administrativa') {
        detalle_admin = document.getElementById('detalle-admin').value;
    } else { 
        maestro = document.getElementById('nombre-maestro').value; 
        lugar = document.getElementById('lugar-asesoria').value; 
    }

    const { error } = await window.clienteSupabase.from('citas').insert({
        alumno_nombre: usuarioActual.nombre, alumno_matricula: usuarioActual.matricula,
        tipo, detalle_admin, maestro, lugar, fecha, horario, mensaje, estado: 'Pendiente'
    });

    if (error) alert("Error: " + error.message);
    else { 
        alert('✅ Cita agendada.'); 
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

    if(!horario) { alert("Selecciona un horario válido"); return; }

    const { error } = await window.clienteSupabase.from('reservas').insert({
        alumno_nombre: usuarioActual.nombre, alumno_matricula: usuarioActual.matricula,
        tipo_espacio: lugar, nombre_sala: sala, fecha, horario, mensaje, estado: 'Pendiente'
    });

    if (error) alert("Error: " + error.message);
    else { 
        alert('✅ Reserva creada.'); 
        e.target.reset(); 
        mostrarPantalla('pantalla-menu'); 
    }
}

// --- GESTIÓN DE FILTROS (ADMIN Y ALUMNO) ---
function cambiarFiltroAdmin(estado, btn) {
    filtroAdminActual = estado;
    document.querySelectorAll('.btn-tab-admin').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    cargarDatos(true);
}
function cambiarFiltroAlumno(estado, btn) {
    filtroAlumnoActual = estado;
    document.querySelectorAll('.btn-tab-alumno').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    cargarDatos(false);
}

// --- CARGAR LISTAS ---
async function cargarDatos(esAdmin = false) {
    const filtro = esAdmin ? filtroAdminActual : filtroAlumnoActual;
    const contenedor = document.getElementById(esAdmin ? 'admin-lista-contenedor' : 'lista-contenedor');
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    let queryCitas = window.clienteSupabase.from('citas').select('*');
    let queryReservas = window.clienteSupabase.from('reservas').select('*');

    if (!esAdmin) {
        queryCitas = queryCitas.eq('alumno_matricula', usuarioActual.matricula).eq('estado', filtro).order('id', {ascending:false});
        queryReservas = queryReservas.eq('alumno_matricula', usuarioActual.matricula).eq('estado', filtro).order('id', {ascending:false});
    } else {
        queryCitas = queryCitas.eq('estado', filtro).order('id', {ascending:true});
        queryReservas = queryReservas.eq('estado', filtro).order('id', {ascending:true});
    }

    const [resC, resR] = await Promise.all([queryCitas, queryReservas]);
    const items = [...(resC.data || []), ...(resR.data || [])]; 

    contenedor.innerHTML = '';
    if (items.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-muted mt-3">No hay registros en <b>${filtro}</b>.</p>`;
        return;
    }

    items.forEach(item => {
        const esCita = item.hasOwnProperty('tipo');
        const titulo = esCita ? `Cita: ${item.tipo}` : `Reserva: ${item.tipo_espacio}`;
        const tabla = esCita ? 'citas' : 'reservas';
        const color = esCita ? 'primary' : 'success';
        
        let botones = '';
        if (esAdmin && filtro === 'Pendiente') {
            botones = `<div class="mt-2 d-flex gap-2">
                <button class="btn btn-sm btn-success flex-grow-1" onclick="window.cambiarEstado('${tabla}', '${item.id}', 'Aceptada')">Aceptar</button>
                <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="window.cambiarEstado('${tabla}', '${item.id}', 'Rechazada')">Rechazar</button>
            </div>`;
        } else if (!esAdmin && filtro === 'Pendiente') {
            botones = `<button class="btn btn-sm btn-link text-muted w-100" onclick="window.abrirModalEdicion('${tabla}', '${item.id}', '${item.fecha}', '${item.horario}')">Editar fecha/hora</button>`;
        }

        contenedor.innerHTML += `
        <div class="card mb-2 border-start border-4 border-${color} shadow-sm">
            <div class="card-body py-2">
                <div class="d-flex justify-content-between">
                    <strong class="text-${color}">${titulo}</strong>
                    <span class="badge bg-secondary">${item.estado}</span>
                </div>
                <p class="small mb-1">📅 ${item.fecha} | ⏰ ${item.horario} | ${item.alumno_nombre}</p>
                ${item.mensaje ? `<div class="alert alert-light p-1 small mb-1 border">${item.mensaje}</div>` : ''}
                ${botones}
            </div>
        </div>`;
    });
}

async function cambiarEstado(tabla, id, nuevoEstado) {
    if(!confirm(`¿Confirmar ${nuevoEstado}?`)) return;
    await window.clienteSupabase.from(tabla).update({ estado: nuevoEstado }).eq('id', id);
    cargarDatos(true);
}

// Edición
let editData = {};
function abrirModalEdicion(tabla, id, fecha, horario) {
    editData = { tabla, id };
    document.getElementById('edit-fecha').value = fecha;
    document.getElementById('edit-horario').value = horario;
    new bootstrap.Modal(document.getElementById('modalEditar')).show();
}

async function guardarCambiosModal() {
    const nuevaFecha = document.getElementById('edit-fecha').value;
    const nuevoHorario = document.getElementById('edit-horario').value;
    await window.clienteSupabase.from(editData.tabla).update({ fecha: nuevaFecha, horario: nuevoHorario }).eq('id', editData.id);
    alert("Actualizado");
    location.reload(); 
}

// --- FUNCIÓN RECUPERADA ---
function verHistorial() {
    filtroAlumnoActual = 'Pendiente';
    mostrarPantalla('pantalla-historial');
    
    // Reset visual tabs
    document.querySelectorAll('.btn-tab-alumno').forEach(btn => btn.classList.remove('active'));
    const tabs = document.querySelectorAll('.btn-tab-alumno');
    if(tabs.length > 0) tabs[0].classList.add('active');

    cargarDatos(false);
}