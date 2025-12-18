// js/auth.js

let usuarioActual = null; 
let esModoRegistro = true; 

// --- DETECTAR SESIÓN AL INICIAR ---
window.clienteSupabase.auth.onAuthStateChange((event, session) => {
    const btnAvatar = document.getElementById('btn-avatar-nav');

    if (session) {
        usuarioActual = session.user.user_metadata;
        // Guardamos el email real de la sesión por si no está en metadata
        usuarioActual.email = session.user.email; 
        
        actualizarInterfazUsuario();
        mostrarPantalla('pantalla-menu');
        
        if(btnAvatar) btnAvatar.classList.remove('d-none');

        // Lógica de botones según Rol
        const btnAdmin = document.getElementById('btn-ir-admin');
        const btnCitas = document.getElementById('btn-menu-citas');
        const btnReservas = document.getElementById('btn-menu-reservas');

        if(usuarioActual.rol === 'admin') {
            if(btnAdmin) btnAdmin.classList.remove('d-none');
            if(btnCitas) btnCitas.classList.add('d-none');
            if(btnReservas) btnReservas.classList.add('d-none');
        } else {
            if(btnAdmin) btnAdmin.classList.add('d-none');
            if(btnCitas) btnCitas.classList.remove('d-none');
            if(btnReservas) btnReservas.classList.remove('d-none');
        }

        // --- ACTIVAR EL "OÍDO" DE NOTIFICACIONES ---
        if (typeof window.iniciarSistemaNotificaciones === 'function') {
            console.log("🔊 Sistema de notificaciones activado");
            window.iniciarSistemaNotificaciones();
        }

    } else {
        usuarioActual = null;
        mostrarPantalla('pantalla-registro');
        if(btnAvatar) btnAvatar.classList.add('d-none');
    }
});

// --- UI HELPERS ---
function actualizarInterfazUsuario() {
    const display = document.getElementById('nombre-alumno-display');
    if(display && usuarioActual) display.innerText = usuarioActual.nombre;
    
    const sideNombre = document.getElementById('side-nombre');
    const sideMatricula = document.getElementById('side-matricula');
    if(sideNombre) sideNombre.value = usuarioActual.nombre || '';
    if(sideMatricula) sideMatricula.value = usuarioActual.matricula || '';

    const avatarNavbar = document.getElementById('avatar-navbar');
    const avatarSidebar = document.getElementById('side-avatar-img'); 
    const fotoUrl = usuarioActual.foto || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    const fotoConCache = fotoUrl + (usuarioActual.foto ? `?t=${Date.now()}` : '');

    if(avatarNavbar) avatarNavbar.src = fotoConCache;
    if(avatarSidebar) avatarSidebar.src = fotoConCache;
}

// --- LOGICA LOGIN/REGISTRO ---
async function manejarAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-auth-action');
    const txtOriginal = btn.innerText;
    
    btn.disabled = true; btn.innerText = "Procesando...";

    try {
        if (esModoRegistro) {
            const nombre = document.getElementById('nombre').value;
            const matricula = document.getElementById('matricula').value;
            // --- VALIDACIONES NUEVAS ---
            if (!window.VALIDATOR.esEmailValido(email)) {
                alert("Por favor, introduce un correo electrónico válido.");
                btn.disabled = false; btn.innerText = txtOriginal; return;
            }
            if (window.VALIDATOR.contieneGroserias(nombre)) {
                alert("El nombre contiene palabras no permitidas. Por favor, usa tu nombre real.");
                btn.disabled = false; btn.innerText = txtOriginal; return;
            }
            const carrera = document.getElementById('carrera').value;

            const { error } = await window.clienteSupabase.auth.signUp({
                email, password,
                options: { 
                    data: { nombre, matricula, carrera, rol: 'estudiante', foto: '' } 
                }
            });
            if (error) throw error;
            alert("✅ Registro exitoso! Ya puedes iniciar sesión.");
        } else {
            const { error } = await window.clienteSupabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
    } catch (error) {
        alert("Error: " + error.message);
        btn.disabled = false; btn.innerText = txtOriginal;
    }
}

async function actualizarPerfil(e) {
    e.preventDefault();
    const nuevoNombre = document.getElementById('side-nombre').value;
    const nuevaMatricula = document.getElementById('side-matricula').value;
    // --- VALIDACIONES NUEVAS ---
    if (window.VALIDATOR.contieneGroserias(nuevoNombre)) {
        alert("Nombre no permitido.");
        return;
    }

    if (archivoFoto) {
        const check = window.VALIDATOR.validarImagen(archivoFoto);
        if (!check.valido) {
            alert(check.error); // "Imagen muy pesada" o "Formato incorrecto"
            return;
        }
    }
    const archivoFoto = document.getElementById('side-foto-file').files[0];
    const btnGuardar = e.target.querySelector('button[type="submit"]');
    
    btnGuardar.innerText = "Guardando..."; btnGuardar.disabled = true;

    try {
        let nuevaFotoUrl = usuarioActual.foto;
        if (archivoFoto) {
            const nombreArchivo = `avatar_${Date.now()}_${archivoFoto.name}`;
            const { error: errorSubida } = await window.clienteSupabase.storage.from('avatars').upload(nombreArchivo, archivoFoto);
            if (errorSubida) throw new Error(errorSubida.message);
            const { data: dataUrl } = window.clienteSupabase.storage.from('avatars').getPublicUrl(nombreArchivo);
            nuevaFotoUrl = dataUrl.publicUrl;
        }

        const { data, error } = await window.clienteSupabase.auth.updateUser({
            data: { nombre: nuevoNombre, matricula: nuevaMatricula, foto: nuevaFotoUrl }
        });
        if (error) throw error;

        alert("Perfil actualizado correctamente.");
        usuarioActual = data.user.user_metadata; 
        actualizarInterfazUsuario();
        const panelEl = document.getElementById('panelUsuario');
        if(panelEl) bootstrap.Offcanvas.getInstance(panelEl).hide();

    } catch (error) {
        alert(error.message);
    } finally {
        btnGuardar.innerText = "Guardar Cambios"; btnGuardar.disabled = false;
    }
}

async function cerrarSesion() {
    await window.clienteSupabase.auth.signOut();
    location.reload();
}

function toggleAuthMode() {
    esModoRegistro = !esModoRegistro;
    const camposReg = document.getElementById('campos-registro');
    const titulo = document.getElementById('titulo-auth');
    const btn = document.getElementById('btn-auth-action');
    if(esModoRegistro) {
        camposReg.classList.remove('d-none'); titulo.innerText = "Bienvenido"; btn.innerText = "Registrarse";
    } else {
        camposReg.classList.add('d-none'); titulo.innerText = "Iniciar Sesión"; btn.innerText = "Ingresar";
    }
}