// js/auth.js
let usuarioActual = null; 
let esModoRegistro = true; 

// --- DETECTAR SESIÓN AL INICIAR ---
window.clienteSupabase.auth.onAuthStateChange((event, session) => {
    const btnAvatar = document.getElementById('btn-avatar-nav');

    if (session) {
        usuarioActual = session.user.user_metadata;
        actualizarInterfazUsuario();
        mostrarPantalla('pantalla-menu');
        
        // MOSTRAR AVATAR
        if(btnAvatar) btnAvatar.classList.remove('d-none');

        // --- GESTIÓN DE BOTONES DEL MENÚ SEGÚN ROL ---
        const btnAdmin = document.getElementById('btn-ir-admin');
        const btnCitas = document.getElementById('btn-menu-citas');
        const btnReservas = document.getElementById('btn-menu-reservas');

        if(usuarioActual.rol === 'admin') {
            // ES ADMIN: Oculta opciones de alumno, muestra panel admin
            if(btnAdmin) btnAdmin.classList.remove('d-none');
            if(btnCitas) btnCitas.classList.add('d-none');
            if(btnReservas) btnReservas.classList.add('d-none');
            
            // Precargar datos admin silenciosamente
            if(typeof cargarPanelAdmin === 'function') cargarPanelAdmin();
        } else {
            // ES ALUMNO: Muestra opciones de alumno, oculta panel admin
            if(btnAdmin) btnAdmin.classList.add('d-none');
            if(btnCitas) btnCitas.classList.remove('d-none');
            if(btnReservas) btnReservas.classList.remove('d-none');
        }

    } else {
        usuarioActual = null;
        mostrarPantalla('pantalla-registro');
        
        // OCULTAR AVATAR
        if(btnAvatar) btnAvatar.classList.add('d-none');
    }
});

function actualizarInterfazUsuario() {
    // 1. Nombre en el menú principal
    const display = document.getElementById('nombre-alumno-display');
    if(display) display.innerText = usuarioActual.nombre;
    
    // 2. Llenar los inputs del Panel Lateral
    const sideNombre = document.getElementById('side-nombre');
    const sideMatricula = document.getElementById('side-matricula');
    if(sideNombre) sideNombre.value = usuarioActual.nombre || '';
    if(sideMatricula) sideMatricula.value = usuarioActual.matricula || '';
    
    // 3. ACTUALIZAR IMÁGENES (Navbar y Sidebar)
    const avatarNavbar = document.getElementById('avatar-navbar');
    const avatarSidebar = document.getElementById('side-avatar-img'); 
    
    // Url de la foto o la de por defecto
    const fotoUrl = usuarioActual.foto || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    const fotoConCache = fotoUrl + (usuarioActual.foto ? `?t=${Date.now()}` : '');

    // Actualizamos ambas imágenes si existen en el HTML
    if(avatarNavbar) avatarNavbar.src = fotoConCache;
    if(avatarSidebar) avatarSidebar.src = fotoConCache;
}

// --- LOGIN / REGISTRO ---
async function manejarAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-auth-action');
    const txtOriginal = btn.innerText;
    
    btn.disabled = true; 
    btn.innerText = "Procesando...";

    try {
        if (esModoRegistro) {
            // --- REGISTRO ---
            const nombre = document.getElementById('nombre').value;
            const matricula = document.getElementById('matricula').value;
            const carrera = document.getElementById('carrera').value;

            const { error } = await window.clienteSupabase.auth.signUp({
                email, password,
                options: { 
                    data: { 
                        nombre, matricula, carrera, rol: 'estudiante', foto: '' 
                    } 
                }
            });
            if (error) throw error;
            alert("Registro exitoso! Ya puedes iniciar sesión (si desactivaste confirmar email) o revisa tu correo.");
        } else {
            // --- LOGIN ---
            const { error } = await window.clienteSupabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
    } catch (error) {
        alert("Error: " + error.message);
        btn.disabled = false; 
        btn.innerText = txtOriginal;
    }
}

// --- ACTUALIZAR PERFIL (METADATOS + TABLA ALUMNOS) ---
async function actualizarPerfil(e) {
    e.preventDefault();
    
    // Elementos del formulario
    const nuevoNombre = document.getElementById('side-nombre').value;
    const nuevaMatricula = document.getElementById('side-matricula').value;
    const archivoFoto = document.getElementById('side-foto-file').files[0];
    
    // Feedback visual en el botón
    const btnGuardar = e.target.querySelector('button[type="submit"]');
    const textoOriginal = btnGuardar.innerText;
    btnGuardar.innerText = "Guardando...";
    btnGuardar.disabled = true;

    try {
        let nuevaFotoUrl = usuarioActual.foto;

        // 1. SUBIR FOTO (Si el usuario seleccionó una nueva)
        if (archivoFoto) {
            const nombreArchivo = `avatar_${Date.now()}_${archivoFoto.name}`;
            
            // Subir a Storage Bucket 'avatars'
            const { error: errorSubida } = await window.clienteSupabase.storage
                .from('avatars')
                .upload(nombreArchivo, archivoFoto);

            if (errorSubida) throw new Error("Error al subir imagen: " + errorSubida.message);

            // Obtener URL Pública
            const { data: dataUrl } = window.clienteSupabase.storage
                .from('avatars')
                .getPublicUrl(nombreArchivo);
                
            nuevaFotoUrl = dataUrl.publicUrl;
        }

        // 2. OBTENER ID DEL USUARIO ACTUAL
        const { data: { user } } = await window.clienteSupabase.auth.getUser();
        if (!user) throw new Error("No hay sesión activa");

        // 3. ACTUALIZAR METADATOS (Sesión del navegador)
        const { data, error: errorMeta } = await window.clienteSupabase.auth.updateUser({
            data: { 
                nombre: nuevoNombre, 
                matricula: nuevaMatricula,
                foto: nuevaFotoUrl
            }
        });
        if (errorMeta) throw new Error("Error actualizando sesión: " + errorMeta.message);

        // 4. ACTUALIZAR TABLA 'ALUMNOS' (Base de Datos Real)
        const { error: errorTabla } = await window.clienteSupabase
            .from('alumnos')
            .update({ 
                nombre: nuevoNombre, 
                matricula: nuevaMatricula
            })
            .eq('id', user.id); 

        if (errorTabla) {
            console.error("Error SQL:", errorTabla); 
        }

        // 5. FINALIZAR CON ÉXITO
        alert("Perfil actualizado correctamente.");
        usuarioActual = data.user.user_metadata; 
        actualizarInterfazUsuario();
        
        // Cerrar panel lateral
        const panelEl = document.getElementById('panelUsuario');
        if(panelEl) {
            const panel = bootstrap.Offcanvas.getInstance(panelEl);
            if(panel) panel.hide();
        }

    } catch (error) {
        alert(error.message);
    } finally {
        // Restaurar botón
        btnGuardar.innerText = textoOriginal;
        btnGuardar.disabled = false;
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
        camposReg.classList.remove('d-none');
        titulo.innerText = "Bienvenido";
        btn.innerText = "Registrarse";
    } else {
        camposReg.classList.add('d-none');
        titulo.innerText = "Iniciar Sesión";
        btn.innerText = "Ingresar";
    }
}