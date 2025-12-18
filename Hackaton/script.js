
 //'sb_publishable_s1ieWIJ5-k_xz4Ryrmnakw_HCrtjpc4'; 

// --- CONFIGURACIÓN SUPABASE ---
const SUPABASE_URL = 'https://ziooofzbcvkmyyrdgjqb.supabase.co'; 
// 👇 PEGA AQUÍ TU LLAVE CORRECTA (LA QUE NO TIENE 'PUBLISHABLE')
const SUPABASE_KEY = 'sb_publishable_s1ieWIJ5-k_xz4Ryrmnakw_HCrtjpc4'; 

// Usamos nombre distinto para no chocar con la librería
const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// --- VARIABLES GLOBALES ---
let usuarioActual = null; 
let esModoRegistro = true; 

// --- GESTIÓN DE PANTALLAS ---
function mostrarPantalla(idPantalla) {
    const pantallas = document.querySelectorAll('.pantalla');
    pantallas.forEach(p => {
        p.classList.remove('activa');
        p.classList.add('d-none');
    });

    const pantallaMila = document.getElementById(idPantalla);
    if (pantallaMila) {
        pantallaMila.classList.remove('d-none');
        setTimeout(() => pantallaMila.classList.add('activa'), 10);
    }
}

// --- LOGICA DE LOGIN VS REGISTRO ---
function toggleAuthMode() {
    esModoRegistro = !esModoRegistro; 
    const camposReg = document.getElementById('campos-registro');
    const titulo = document.getElementById('titulo-auth');
    const btn = document.getElementById('btn-auth-action');
    const txtSwitch = document.getElementById('texto-switch');

    if (esModoRegistro) {
        camposReg.classList.remove('d-none');
        titulo.innerText = "Bienvenido";
        btn.innerText = "Registrarse";
        txtSwitch.innerHTML = '¿Ya tienes cuenta? <button type="button" class="btn btn-link p-0" onclick="toggleAuthMode()">Inicia Sesión aquí</button>';
        
        document.getElementById('nombre').required = true;
        document.getElementById('matricula').required = true;
    } else {
        camposReg.classList.add('d-none');
        titulo.innerText = "Iniciar Sesión";
        btn.innerText = "Ingresar";
        txtSwitch.innerHTML = '¿No tienes cuenta? <button type="button" class="btn btn-link p-0" onclick="toggleAuthMode()">Regístrate aquí</button>';
        
        document.getElementById('nombre').required = false;
        document.getElementById('matricula').required = false;
    }
}

// --- MANEJO DEL FORMULARIO DE AUTH ---
document.getElementById('form-auth').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-auth-action');

    btn.disabled = true;
    btn.innerText = "Procesando...";

    try {
        if (esModoRegistro) {
            // --- REGISTRO (SIEMPRE COMO ESTUDIANTE) ---
            const nombre = document.getElementById('nombre').value;
            const matricula = document.getElementById('matricula').value;
            const carrera = document.getElementById('carrera').value;

            const { data, error } = await clienteSupabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { // Guardamos datos extra en la nube
                        nombre: nombre,
                        matricula: matricula,
                        carrera: carrera,
                        rol: 'estudiante' // <--- ROL POR DEFECTO
                    }
                }
            });
            if (error) throw error;
            alert("¡Registro exitoso! Iniciando sesión...");
            
        } else {
            // --- LOGIN ---
            const { data, error } = await clienteSupabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            if (error) throw error;
        }
    } catch (error) {
        alert("Error: " + error.message);
        btn.disabled = false;
        btn.innerText = esModoRegistro ? "Registrarse" : "Ingresar";
    }
});

// --- EL CEREBRO DE LOS ROLES (DETECTA QUIÉN ERES) ---
clienteSupabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        usuarioActual = session.user.user_metadata;
        const rol = usuarioActual.rol || 'estudiante'; // Si no tiene rol, es estudiante

        if (rol === 'admin') {
            // SI ES ADMIN -> Al Panel Rojo
            alert("Bienvenido Director/Admin");
            cargarPanelAdmin();
            mostrarPantalla('pantalla-admin');
        } else {
            // SI ES ALUMNO -> Al Menú Azul
            const nombreDisplay = document.getElementById('nombre-alumno-display');
            if(nombreDisplay) nombreDisplay.innerText = usuarioActual.nombre;
            mostrarPantalla('pantalla-menu');
        }

    } else {
        usuarioActual = null;
        mostrarPantalla('pantalla-registro');
    }
});

// --- CERRAR SESIÓN ---
async function cerrarSesion() {
    await clienteSupabase.auth.signOut();
    location.reload();
}

// --- LÓGICA DE CITAS Y RESERVAS ---
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

document.getElementById('form-citas').addEventListener('submit', async function(e) {
    e.preventDefault();
    const tipo = document.getElementById('tipo-cita').value;
    const fecha = document.getElementById('fecha-cita').value;
    let detalleAdmin = null, maestro = null, lugar = null;

    if (tipo === 'Administrativa') detalleAdmin = document.getElementById('detalle-admin').value;
    else { maestro = document.getElementById('nombre-maestro').value; lugar = document.getElementById('lugar-asesoria').value; }

    const { error } = await clienteSupabase.from('citas').insert({
        alumno_nombre: usuarioActual.nombre,
        alumno_matricula: usuarioActual.matricula,
        tipo, detalle_admin: detalleAdmin, maestro, lugar, fecha, estado: 'Pendiente'
    });

    if (error) alert('Error: ' + error.message);
    else { alert('¡Cita guardada!'); e.target.reset(); mostrarPantalla('pantalla-menu'); }
});

document.getElementById('form-reservas').addEventListener('submit', async function(e) {
    e.preventDefault();
    const lugar = document.getElementById('lugar-reserva').value;
    const sala = document.getElementById('nombre-sala').value;
    const fecha = document.getElementById('fecha-reserva').value;
    const horario = document.getElementById('horario-reserva').value;

    const { error } = await clienteSupabase.from('reservas').insert({
        alumno_nombre: usuarioActual.nombre,
        alumno_matricula: usuarioActual.matricula,
        tipo_espacio: lugar, nombre_sala: sala, fecha, horario, estado: 'Pendiente'
    });

    if (error) alert('Error: ' + error.message);
    else { alert('¡Reserva exitosa!'); e.target.reset(); mostrarPantalla('pantalla-menu'); }
});

async function verHistorial() {
    const contenedor = document.getElementById('lista-contenedor');
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    const [citasRes, reservasRes] = await Promise.all([
        clienteSupabase.from('citas').select('*').eq('alumno_matricula', usuarioActual.matricula),
        clienteSupabase.from('reservas').select('*').eq('alumno_matricula', usuarioActual.matricula)
    ]);

    contenedor.innerHTML = '';
    const citas = citasRes.data || [];
    const reservas = reservasRes.data || [];

    if (citas.length === 0 && reservas.length === 0) {
        contenedor.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-inbox fs-1"></i><p>Sin registros.</p></div>';
        mostrarPantalla('pantalla-historial');
        return;
    }

    citas.forEach(c => {
        let det = c.tipo === 'Administrativa' ? `Dept: ${c.detalle_admin}` : `Con: ${c.maestro}`;
        contenedor.innerHTML += `
        <div class="card mb-3 shadow-sm item-historial borde-cita">
            <div class="card-body">
                <div class="d-flex justify-content-between"><h5 class="text-primary fw-bold">Cita: ${c.tipo}</h5><span class="badge badge-${c.estado.toLowerCase()}">${c.estado}</span></div>
                <p class="fw-bold mb-1">${det}</p><small class="text-muted">📅 ${c.fecha}</small>
            </div>
        </div>`;
    });

    reservas.forEach(r => {
        contenedor.innerHTML += `
        <div class="card mb-3 shadow-sm item-historial borde-reserva">
            <div class="card-body">
                <div class="d-flex justify-content-between"><h5 class="text-success fw-bold">Reserva: ${r.tipo_espacio}</h5><span class="badge badge-${r.estado.toLowerCase()}">${r.estado}</span></div>
                <p class="fw-bold mb-1">${r.nombre_sala}</p><small class="text-muted">📅 ${r.fecha} | ⏰ ${r.horario}</small>
            </div>
        </div>`;
    });
    mostrarPantalla('pantalla-historial');
}

// --- ADMIN PANEL (CARGA AUTOMÁTICA) ---
async function cargarPanelAdmin() {
    const cont = document.getElementById('admin-lista-contenedor');
    cont.innerHTML = '<div class="text-center"><div class="spinner-border text-danger"></div></div>';
    
    const [citasRes, reservasRes] = await Promise.all([
        clienteSupabase.from('citas').select('*'),
        clienteSupabase.from('reservas').select('*')
    ]);
    
    cont.innerHTML = '';
    const citas = citasRes.data || [];
    const reservas = reservasRes.data || [];

    citas.forEach(c => {
        const botones = c.estado === 'Pendiente' ? `<div class="d-flex gap-2 mt-2"><button class="btn btn-sm btn-success flex-grow-1" onclick="updEstado('citas',${c.id},'Aceptada')">Aceptar</button><button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="updEstado('citas',${c.id},'Rechazada')">Rechazar</button></div>` : '';
        cont.innerHTML += `<div class="card mb-3 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between"><h6 class="text-primary fw-bold">${c.tipo}</h6><span class="badge badge-${c.estado.toLowerCase()}">${c.estado}</span></div><p class="small mb-1">Alumno: ${c.alumno_nombre}</p>${botones}</div></div>`;
    });
    reservas.forEach(r => {
        const botones = r.estado === 'Pendiente' ? `<div class="d-flex gap-2 mt-2"><button class="btn btn-sm btn-success flex-grow-1" onclick="updEstado('reservas',${r.id},'Aceptada')">Aceptar</button><button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="updEstado('reservas',${r.id},'Rechazada')">Rechazar</button></div>` : '';
        cont.innerHTML += `<div class="card mb-3 shadow-sm"><div class="card-body"><div class="d-flex justify-content-between"><h6 class="text-success fw-bold">${r.tipo_espacio}</h6><span class="badge badge-${r.estado.toLowerCase()}">${r.estado}</span></div><p class="small mb-1">Alumno: ${r.alumno_nombre}</p>${botones}</div></div>`;
    });
}

async function updEstado(tabla, id, estado) {
    await clienteSupabase.from(tabla).update({ estado }).eq('id', id);
    cargarPanelAdmin();
}