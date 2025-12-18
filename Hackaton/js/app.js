// js/app.js

// --- CONFIGURACIÓN ---
const HORARIO_INICIO = 8;
const HORARIO_FIN = 16;

// --- EXPORTAR FUNCIONES AL HTML ---
window.cambiarEstado = cambiarEstado;
window.abrirModalEdicion = abrirModalEdicion;
window.guardarCita = guardarCita;
window.guardarReserva = guardarReserva;
window.cambiarFiltroAdmin = cambiarFiltroAdmin;
window.cambiarFiltroAlumno = cambiarFiltroAlumno;
window.toggleCamposCita = toggleCamposCita;
window.cargarHorasDisponibles = cargarHorasDisponibles;
window.verHistorial = verHistorial;
window.iniciarSistemaNotificaciones = iniciarSistemaNotificaciones;
window.cargarPanelAdmin = cargarPanelAdmin;
window.abrirChat = abrirChat;
window.enviarMensaje = enviarMensaje;
window.editarMensaje = editarMensaje;
window.vaciarChat = vaciarChat;
window.guardarCambiosModal = guardarCambiosModal;

// --- VARIABLES GLOBALES ---
let filtroAdminActual = 'Pendiente';
let filtroAlumnoActual = 'Pendiente';
let chatActual = { tipo: null, id: null, nombre: '' };
let suscripcionChat = null;
let suscripcionGlobal = null;
let editData = {}; // Para el modal de edición

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    establecerFechaMinima();
});

// Función para bloquear fechas pasadas en los inputs
function establecerFechaMinima() {
    const hoy = new Date().toISOString().split('T')[0];
    const inputs = ['fecha-cita', 'fecha-reserva', 'edit-fecha'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.min = hoy;
    });
}

function validarFecha(fechaStr) {
    const seleccionada = new Date(fechaStr + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    return seleccionada >= hoy;
}

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
        establecerFechaMinima();
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

function cargarPanelAdmin() {
    filtroAdminActual = 'Pendiente';
    mostrarPantalla('pantalla-admin');
    document.querySelectorAll('.btn-tab-admin').forEach(btn => btn.classList.remove('active'));
    const tabs = document.querySelectorAll('.btn-tab-admin');
    if(tabs.length > 0) tabs[0].classList.add('active');
    cargarDatos(true); 
}

// --- SISTEMA DE NOTIFICACIONES (GLOBAL) ---
function iniciarSistemaNotificaciones() {
    if (suscripcionGlobal) window.clienteSupabase.removeChannel(suscripcionGlobal);

    suscripcionGlobal = window.clienteSupabase
        .channel('global_notificaciones')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' }, 
        async (payload) => {
            const msg = payload.new;
            const miRol = usuarioActual.rol === 'admin' ? 'admin' : 'estudiante';
            
            // Ignorar mis propios mensajes
            if (msg.sender_role === miRol) return;

            // Determinar si el mensaje es para mí
            let esParaMi = false;
            let titulo = "Nuevo mensaje";
            
            if (usuarioActual.rol === 'admin') {
                esParaMi = true; // Admin ve todo
                titulo = "Mensaje de Alumno";
            } else {
                // Verificar si la cita/reserva pertenece al alumno actual
                if (msg.cita_id) {
                    const { data } = await window.clienteSupabase.from('citas').select('id').eq('id', msg.cita_id).eq('alumno_matricula', usuarioActual.matricula).single();
                    if (data) esParaMi = true;
                } else if (msg.reserva_id) {
                    const { data } = await window.clienteSupabase.from('reservas').select('id').eq('id', msg.reserva_id).eq('alumno_matricula', usuarioActual.matricula).single();
                    if (data) esParaMi = true;
                }
                titulo = "Respuesta Admin";
            }

            if (!esParaMi) return;

            // Actualizar UI
            const tipoTabla = msg.cita_id ? 'citas' : 'reservas';
            const idRegistro = msg.cita_id || msg.reserva_id;
            const chatAbierto = (chatActual.tipo === tipoTabla && chatActual.id == idRegistro);

            if (!chatAbierto) {
                // Mostrar Toast y actualizar burbuja si el chat NO está abierto
                mostrarToast(titulo, msg.contenido);
                const btnId = `btn-chat-${tipoTabla}-${idRegistro}`;
                const btnElement = document.getElementById(btnId);
                
                if (btnElement) {
                    let badge = btnElement.querySelector('.badge-notificacion');
                    if (badge) {
                        let num = parseInt(badge.innerText) || 0;
                        badge.innerText = num + 1;
                    } else {
                        const nuevoBadge = `<span class="badge-notificacion position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light shadow-sm" style="font-size: 0.7em;">1</span>`;
                        btnElement.insertAdjacentHTML('beforeend', nuevoBadge);
                    }
                }
            }
        })
        .subscribe();
}

function mostrarToast(titulo, mensaje) {
    const contenedor = document.getElementById('toast-container');
    if(!contenedor) return;
    
    const idToast = 'toast_' + Date.now();
    const html = `
        <div id="${idToast}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header bg-primary text-white">
                <strong class="me-auto">${titulo}</strong>
                <small>Ahora</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
            </div>
            <div class="toast-body text-dark bg-white">
                ${mensaje}
            </div>
        </div>`;

    contenedor.insertAdjacentHTML('beforeend', html);
    const toastElement = document.getElementById(idToast);
    new bootstrap.Toast(toastElement).show();
    
    // Sonido suave
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(e=>{});
}

// --- SISTEMA DE EMAIL (EMAILJS) ---
function enviarCorreoCambioEstado(datos, nuevoEstado, tipoSolicitud, motivoRechazo = "") {
    if (!datos.alumno_email) {
        console.warn("⚠️ No se puede enviar correo: Alumno sin email registrado.");
        return;
    }

    let tituloEstado = nuevoEstado;
    let mensajeExtra = "";

    // Personalizar mensaje según el caso
    if (nuevoEstado === 'Pendiente') {
        tituloEstado = "Solicitud Recibida";
        mensajeExtra = "Hemos recibido tu solicitud correctamente. Será revisada por el equipo pronto.";
    } else if (nuevoEstado === 'Rechazada') {
        mensajeExtra = motivoRechazo ? `Motivo del rechazo: ${motivoRechazo}` : "Tu solicitud no pudo ser procesada.";
    }

    const templateParams = {
        to_email: datos.alumno_email,
        nombre_alumno: datos.alumno_nombre,
        nuevo_estado: tituloEstado,
        tipo_solicitud: tipoSolicitud,
        fecha: datos.fecha,
        horario: datos.horario,
        detalle: datos.mensaje || "Sin detalles",
        motivo_rechazo: mensajeExtra 
    };

    // --- CORRECCIÓN AQUÍ ---
    emailjs.send(
        window.EMAIL_CONFIG.SERVICE_ID, 
        window.EMAIL_CONFIG.TEMPLATE_ID, 
        templateParams,
        window.EMAIL_CONFIG.PUBLIC_KEY
    ) // <--- ESTE PARÉNTESIS CIERRA LA FUNCIÓN SEND
    .then(() => {
        mostrarToast("Notificación", "Correo enviado al alumno.");
    })
    .catch((e) => {
        console.error("Error EmailJS:", e);
        // Alert temporal para depuración si vuelve a fallar
        alert("Error enviando correo: " + (e.text || JSON.stringify(e))); 
    });
}

// --- CARGAR DATOS (CRUD) ---
async function cargarDatos(esAdmin = false) {
    const filtro = esAdmin ? filtroAdminActual : filtroAlumnoActual;
    const contenedor = document.getElementById(esAdmin ? 'admin-lista-contenedor' : 'lista-contenedor');
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';

    // 1. Consultar Citas y Reservas
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

    // 2. Consultar mensajes no leídos para las burbujas
    const rolRemitente = esAdmin ? 'estudiante' : 'admin';
    const { data: noLeidos } = await window.clienteSupabase
        .from('mensajes')
        .select('cita_id, reserva_id')
        .eq('leido', false)
        .eq('sender_role', rolRemitente);

    // Filtrar conteo solo para items visibles
    const idsCitasVisibles = new Set(resC.data?.map(i => i.id));
    const idsReservasVisibles = new Set(resR.data?.map(i => i.id));
    const conteo = {};
    
    if (noLeidos) {
        noLeidos.forEach(msg => {
            if (msg.cita_id && idsCitasVisibles.has(msg.cita_id)) {
                conteo[`citas_${msg.cita_id}`] = (conteo[`citas_${msg.cita_id}`] || 0) + 1;
            } else if (msg.reserva_id && idsReservasVisibles.has(msg.reserva_id)) {
                conteo[`reservas_${msg.reserva_id}`] = (conteo[`reservas_${msg.reserva_id}`] || 0) + 1;
            }
        });
    }

    // 3. Renderizar
    contenedor.innerHTML = '';
    if (items.length === 0) {
        contenedor.innerHTML = `<p class="text-center text-muted mt-3">No hay registros en <b>${filtro}</b>.</p>`;
        return;
    }

    items.forEach(item => {
        const esCita = item.hasOwnProperty('tipo');
        const tabla = esCita ? 'citas' : 'reservas';
        const color = esCita ? 'primary' : 'success';
        const titulo = esCita ? `Cita: ${item.tipo}` : `Reserva: ${item.tipo_espacio}`;
        
        // Burbuja
        const numMsg = conteo[`${tabla}_${item.id}`] || 0;
        const badgeHtml = numMsg > 0 
            ? `<span class="badge-notificacion position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light shadow-sm">${numMsg}</span>` 
            : '';

        // Botón Chat con ID único
        const nombreChat = esAdmin ? item.alumno_nombre : 'Administración';
        const btnId = `btn-chat-${tabla}-${item.id}`;
        
        // Pasamos el nombre con comillas simples escapadas si fuera necesario
        const btnChat = `
        <button id="${btnId}" class="btn btn-sm btn-outline-primary position-relative" onclick="abrirChat('${tabla}', '${item.id}', '${nombreChat}')">
            <i class="bi bi-chat-dots-fill"></i> Chat
            ${badgeHtml}
        </button>`;

        let botones = '';
        if (esAdmin && filtro === 'Pendiente') {
            botones = `<div class="mt-2 d-flex gap-2 align-items-center">
                <button class="btn btn-sm btn-success flex-grow-1" onclick="cambiarEstado('${tabla}', '${item.id}', 'Aceptada')">Aceptar</button>
                <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="cambiarEstado('${tabla}', '${item.id}', 'Rechazada')">Rechazar</button>
                ${btnChat}
            </div>`;
        } else if (!esAdmin && filtro === 'Pendiente') {
            botones = `<div class="mt-2 d-flex gap-2 align-items-center">
                <button class="btn btn-sm btn-link text-muted flex-grow-1" onclick="abrirModalEdicion('${tabla}', '${item.id}', '${item.fecha}', '${item.horario}')">Editar</button>
                ${btnChat}
            </div>`;
        } else {
            botones = `<div class="mt-2 text-end">${btnChat}</div>`;
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

// --- LÓGICA DEL CHAT ---
async function abrirChat(tipo, id, nombrePersona) {
    chatActual = { tipo, id, nombre: nombrePersona };
    
    // Eliminar burbuja visualmente
    const btn = document.getElementById(`btn-chat-${tipo}-${id}`);
    if(btn) {
        const badge = btn.querySelector('.badge-notificacion');
        if(badge) badge.remove();
    }
    
    // Configurar Modal
    document.getElementById('chat-titulo-nombre').innerText = nombrePersona;
    document.getElementById('chat-subtitulo').innerText = usuarioActual.rol === 'admin' ? 'Alumno' : 'Soporte';

    const modalEl = document.getElementById('modalChat');
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById('chat-body').innerHTML = '<div class="text-center p-3">Cargando...</div>';
    modal.show();

    // Marcar como leídos en BD
    const rolRemitente = usuarioActual.rol === 'admin' ? 'estudiante' : 'admin';
    const colId = tipo === 'citas' ? 'cita_id' : 'reserva_id';
    
    window.clienteSupabase.from('mensajes')
        .update({ leido: true })
        .eq(colId, id).eq('sender_role', rolRemitente).eq('leido', false)
        .then(); // Ejecutar en segundo plano

    // Evento al cerrar modal
    modalEl.addEventListener('hidden.bs.modal', function recargar() {
        if(suscripcionChat) window.clienteSupabase.removeChannel(suscripcionChat);
        const esAdmin = usuarioActual.rol === 'admin';
        cargarDatos(esAdmin); 
    }, { once: true });

    await cargarMensajes();
    suscribirseAChat();
}

async function cargarMensajes() {
    const colId = chatActual.tipo === 'citas' ? 'cita_id' : 'reserva_id';
    // Filtrar visibilidad (Soft Delete)
    const colVisibilidad = usuarioActual.rol === 'admin' ? 'visible_admin' : 'visible_estudiante';

    const { data } = await window.clienteSupabase
        .from('mensajes')
        .select('*')
        .eq(colId, chatActual.id)
        .eq(colVisibilidad, true)
        .order('created_at', {ascending: true});

    const body = document.getElementById('chat-body');
    body.innerHTML = '';

    if(!data || data.length === 0) {
        body.innerHTML = '<div class="text-center text-muted mt-5"><i class="bi bi-chat-square-text display-4 opacity-25"></i><p class="small mt-2">No hay mensajes. ¡Di hola!</p></div>';
    } else {
        data.forEach(m => renderizarBurbuja(m));
        body.scrollTop = body.scrollHeight;
    }
}

function renderizarBurbuja(msg) {
    const body = document.getElementById('chat-body');
    const soyAdmin = usuarioActual.rol === 'admin';
    const esMio = (soyAdmin && msg.sender_role === 'admin') || (!soyAdmin && msg.sender_role === 'estudiante');
    
    const alineacion = esMio ? 'align-self-end' : 'align-self-start';
    const clase = esMio ? 'chat-mio' : 'chat-otro';
    const hora = new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    const check = (esMio && msg.leido) ? '<i class="bi bi-check2-all text-info ms-1"></i>' : '';

    // Opción de Editar (Solo si es mío y < 60 segundos)
    let menuOpciones = '';
    if (esMio) {
        const ahora = new Date();
        const fechaMsg = new Date(msg.created_at);
        const segundosDif = (ahora - fechaMsg) / 1000;

        if (segundosDif < 60) {
            // Escapamos comillas simples para evitar errores JS
            const contenidoSafe = msg.contenido.replace(/'/g, "\\'");
            menuOpciones += `<a href="#" class="text-white ms-2 small" title="Editar (1 min)" onclick="editarMensaje(${msg.id}, '${contenidoSafe}')"><i class="bi bi-pencil-fill"></i></a>`;
        }
    }

    const idHtml = `msg-bubble-${msg.id}`;
    const existente = document.getElementById(idHtml);
    if(existente) existente.remove();

    const html = `
    <div id="${idHtml}" class="chat-burbuja ${clase} ${alineacion} mb-2 shadow-sm" style="min-width: 120px;">
        <div class="d-flex justify-content-between align-items-center mb-1">
            <small class="fw-bold" style="font-size:0.75rem">${msg.sender_role === 'admin' ? 'Admin' : 'Tú'}</small>
            <div>${menuOpciones}</div>
        </div>
        <div class="msg-texto">${msg.contenido}</div>
        <div class="chat-hora text-end mt-1">${hora} ${check}</div>
    </div>`;
    
    body.insertAdjacentHTML('beforeend', html);
}

// --- ACCIONES DE CHAT ---
async function enviarMensaje() {
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    if(!txt) return;

    // Validación de Groserías
    if (window.VALIDATOR.contieneGroserias(txt)) {
        alert("Mensaje no enviado: Lenguaje inapropiado.");
        input.value = "";
        return;
    }

    const colId = chatActual.tipo === 'citas' ? 'cita_id' : 'reserva_id';
    const rol = usuarioActual.rol === 'admin' ? 'admin' : 'estudiante';

    const { error } = await window.clienteSupabase.from('mensajes').insert({
        [colId]: chatActual.id,
        sender_role: rol,
        contenido: txt,
        visible_admin: true,       // Restaurar visibilidad para ambos
        visible_estudiante: true
    });

    if (error) alert("Error: " + error.message);
    else {
        input.value = '';
        input.focus();
    }
}

async function editarMensaje(idMsg, textoActual) {
    const nuevoTexto = prompt("Edita tu mensaje:", textoActual);
    if (nuevoTexto && nuevoTexto !== textoActual) {
        
        if (window.VALIDATOR.contieneGroserias(nuevoTexto)) {
            alert("Edición rechazada: Lenguaje inapropiado.");
            return;
        }

        const { error } = await window.clienteSupabase
            .from('mensajes')
            .update({ contenido: nuevoTexto })
            .eq('id', idMsg);
        
        if(error) alert("No se pudo editar (quizás pasó el tiempo límite).");
    }
}

async function vaciarChat() {
    if(!confirm("¿Borrar historial? Solo se borrará para ti (Soft Delete).")) return;
    
    const colId = chatActual.tipo === 'citas' ? 'cita_id' : 'reserva_id';
    const colAfectada = usuarioActual.rol === 'admin' ? 'visible_admin' : 'visible_estudiante';
    
    const { error } = await window.clienteSupabase
        .from('mensajes')
        .update({ [colAfectada]: false })
        .eq(colId, chatActual.id);

    if(error) alert("Error: " + error.message);
    else {
        document.getElementById('chat-body').innerHTML = '<div class="text-center text-muted mt-5">Chat vaciado.</div>';
    }
}

function suscribirseAChat() {
    if(suscripcionChat) window.clienteSupabase.removeChannel(suscripcionChat);
    const colId = chatActual.tipo === 'citas' ? 'cita_id' : 'reserva_id';

    suscripcionChat = window.clienteSupabase.channel('chat_room')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes', filter: `${colId}=eq.${chatActual.id}` }, 
        (payload) => {
            const colVis = usuarioActual.rol === 'admin' ? 'visible_admin' : 'visible_estudiante';
            
            // Si el mensaje se actualizó a invisible para mí (al vaciar chat)
            if (payload.eventType === 'UPDATE' && payload.new[colVis] === false) {
                cargarMensajes(); 
                return;
            }

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                if (payload.new[colVis] === true) {
                    renderizarBurbuja(payload.new);
                    document.getElementById('chat-body').scrollTop = document.getElementById('chat-body').scrollHeight;
                    
                    // Marcar leído automáticamente si es mensaje entrante
                    const soyAdmin = usuarioActual.rol === 'admin';
                    const esMio = (soyAdmin && payload.new.sender_role === 'admin') || (!soyAdmin && payload.new.sender_role === 'estudiante');
                    
                    if(!esMio && payload.eventType === 'INSERT') {
                        window.clienteSupabase.from('mensajes').update({leido: true}).eq('id', payload.new.id).then();
                    }
                }
            }
        })
        .subscribe();
}

// --- UTILIDADES ---
async function cargarHorasDisponibles(tipo) {
    const idF = tipo === 'cita' ? 'fecha-cita' : 'fecha-reserva';
    const idS = tipo === 'cita' ? 'horario-cita' : 'horario-reserva';
    const f = document.getElementById(idF).value;
    const s = document.getElementById(idS);
    
    s.innerHTML = '<option disabled selected>Cargando...</option>';
    
    if (!f) return;
    
    if (!validarFecha(f)) {
        s.innerHTML = '<option disabled selected>Fecha inválida (Pasada)</option>';
        return;
    }

    try {
        const { data: c } = await window.clienteSupabase.from('citas').select('horario').eq('fecha', f).neq('estado', 'Rechazada');
        const { data: r } = await window.clienteSupabase.from('reservas').select('horario').eq('fecha', f).neq('estado', 'Rechazada');
        
        const occ = new Set();
        if(c) c.forEach(x => occ.add(x.horario));
        if(r) r.forEach(x => occ.add(x.horario));
        
        s.innerHTML = '<option disabled selected>Selecciona</option>';
        let ok = false;
        
        for (let h = HORARIO_INICIO; h < HORARIO_FIN; h++) {
            const hs = h.toString().padStart(2, '0') + ":00";
            if (!occ.has(hs)) {
                const o = document.createElement('option');
                o.value = hs;
                o.text = `${hs} - ${(h+1).toString().padStart(2,'0')}:00`;
                s.appendChild(o);
                ok = true;
            }
        }
        if (!ok) s.innerHTML = '<option disabled selected>Sin cupo</option>';
    } catch (e) {
        console.error(e);
        s.innerHTML = '<option disabled>Error</option>';
    }
}

// --- GUARDAR CITA ---
async function guardarCita(e) {
    e.preventDefault();
    const tipo = document.getElementById('tipo-cita').value;
    const fecha = document.getElementById('fecha-cita').value;
    const horario = document.getElementById('horario-cita').value;
    const mensaje = document.getElementById('mensaje-cita').value;

    if (!validarFecha(fecha)) { alert("No puedes agendar en el pasado."); return; }
    if (!horario) { alert("Selecciona un horario válido"); return; }
    if (window.VALIDATOR.contieneGroserias(mensaje)) { alert("Lenguaje no permitido."); return; }

    let detalle_admin = null, maestro = null, lugar = null;
    if (tipo === 'Administrativa') {
        detalle_admin = document.getElementById('detalle-admin').value;
    } else {
        maestro = document.getElementById('nombre-maestro').value;
        lugar = document.getElementById('lugar-asesoria').value;
        if (window.VALIDATOR.contieneGroserias(maestro) || window.VALIDATOR.contieneGroserias(lugar)) {
            alert("Lenguaje no permitido en los campos."); return;
        }
    }

    const { data, error } = await window.clienteSupabase.from('citas').insert({
        alumno_nombre: usuarioActual.nombre,
        alumno_matricula: usuarioActual.matricula,
        alumno_email: usuarioActual.email,
        tipo, detalle_admin, maestro, lugar, fecha, horario, mensaje,
        estado: 'Pendiente'
    }).select().single();

    if (error) alert("Error: " + error.message);
    else {
        enviarCorreoCambioEstado(data, "Pendiente", "Cita");
        alert('✅ Cita agendada. Correo de confirmación enviado.');
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

    if (!validarFecha(fecha)) { alert("No puedes reservar en el pasado."); return; }
    if (!horario) { alert("Selecciona un horario válido"); return; }
    if (window.VALIDATOR.contieneGroserias(mensaje) || window.VALIDATOR.contieneGroserias(sala)) { 
        alert("Lenguaje no permitido."); return; 
    }

    const { data, error } = await window.clienteSupabase.from('reservas').insert({
        alumno_nombre: usuarioActual.nombre,
        alumno_matricula: usuarioActual.matricula,
        alumno_email: usuarioActual.email,
        tipo_espacio: lugar, nombre_sala: sala, fecha, horario, mensaje,
        estado: 'Pendiente'
    }).select().single();

    if (error) alert("Error: " + error.message);
    else {
        enviarCorreoCambioEstado(data, "Pendiente", "Reserva de Espacio");
        alert('✅ Reserva creada. Correo de confirmación enviado.');
        e.target.reset();
        mostrarPantalla('pantalla-menu');
    }
}

// --- CAMBIAR ESTADO ---
async function cambiarEstado(tabla, id, nuevoEstado) {
    let motivo = null;

    if (nuevoEstado === 'Rechazada') {
        motivo = prompt("Motivo del rechazo (para el alumno):");
        if (motivo === null) return;
        if (motivo.trim() === "") { alert("Debes indicar un motivo."); return; }
    } else {
        if(!confirm(`¿Confirmar cambio a "${nuevoEstado}"?`)) return;
    }
    
    const updateData = { estado: nuevoEstado };
    if (motivo) updateData.motivo_rechazo = motivo;

    const { data, error } = await window.clienteSupabase
        .from(tabla)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if(error) {
        alert("Error: " + error.message);
    } else {
        const tipoLabel = tabla === 'citas' ? 'Cita' : 'Reserva de Espacio';
        enviarCorreoCambioEstado(data, nuevoEstado, tipoLabel, motivo);
        cargarDatos(true); 
    }
}

// --- FILTROS Y OTROS ---
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

function abrirModalEdicion(t, i, f, h) {
    editData = { t, i };
    document.getElementById('edit-fecha').value = f;
    document.getElementById('edit-horario').value = h;
    new bootstrap.Modal(document.getElementById('modalEditar')).show();
}

async function guardarCambiosModal() {
    const f = document.getElementById('edit-fecha').value;
    const h = document.getElementById('edit-horario').value;
    
    if (!validarFecha(f)) { alert("Fecha no válida (pasada)"); return; }

    await window.clienteSupabase.from(editData.t).update({ fecha: f, horario: h }).eq('id', editData.i);
    alert("Actualizado");
    location.reload();
}

function verHistorial() {
    filtroAlumnoActual = 'Pendiente';
    mostrarPantalla('pantalla-historial');
    document.querySelectorAll('.btn-tab-alumno').forEach(btn => btn.classList.remove('active'));
    const tabs = document.querySelectorAll('.btn-tab-alumno');
    if(tabs.length > 0) tabs[0].classList.add('active');
    cargarDatos(false);
}