

let usuarioActual = null; 
let esModoRegistro = false; 

// --- DETECTAR SESIÓN AL INICIAR ---
window.clienteSupabase.auth.onAuthStateChange((event, session) => {
    const btnAvatar = document.getElementById('btn-avatar-nav');

    if (session) {
        // Cargo metadatos y aseguro tener el ID para las consultas a la tabla 'alumnos'
        usuarioActual = session.user.user_metadata;
        usuarioActual.id = session.user.id;
        usuarioActual.email = session.user.email; 
        
        actualizarInterfazUsuario();
        mostrarPantalla('pantalla-menu');
        
        if(btnAvatar) btnAvatar.classList.remove('d-none');

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

        if (typeof window.iniciarSistemaNotificaciones === 'function') {
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
    if(!usuarioActual) return;

    const display = document.getElementById('nombre-alumno-display');
    if(display) display.innerText = usuarioActual.nombre;
    
    const sideNombre = document.getElementById('side-nombre');
    const sideMatricula = document.getElementById('side-matricula');
    if(sideNombre) sideNombre.value = usuarioActual.nombre || '';
    if(sideMatricula) sideMatricula.value = usuarioActual.matricula || '';

    const avatarNavbar = document.getElementById('avatar-navbar');
    const avatarSidebar = document.getElementById('side-avatar-img'); 
    const fotoUrl = usuarioActual.foto || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    
    // Agrego un timestamp para romper el caché del navegador al actualizar la foto
    const urlFinal = fotoUrl.includes('supabase') ? `${fotoUrl}?t=${Date.now()}` : fotoUrl;

    if(avatarNavbar) avatarNavbar.src = urlFinal;
    if(avatarSidebar) avatarSidebar.src = urlFinal;
}

// --- ACTUALIZACIÓN DE MI PERFIL ---
async function actualizarPerfil(e) {
    e.preventDefault();
    
    // Obtengo los elementos de mi Sidebar
    const nuevoNombre = document.getElementById('side-nombre').value.trim();
    const inputArchivo = document.getElementById('side-foto-file');
    const archivoFoto = inputArchivo.files[0]; 
    const btnGuardar = e.target.querySelector('button[type="submit"]');
    
    if (window.VALIDATOR.contieneGroserias(nuevoNombre)) {
        alert("Nombre no permitido por las normas institucionales.");
        return;
    }

    btnGuardar.innerText = "Guardando..."; 
    btnGuardar.disabled = true;

    try {
        let nuevaFotoUrl = usuarioActual.foto;

        // 1. GESTIÓN DE FOTO EN EL BUCKET 'avatars'
        if (archivoFoto) {
            const check = window.VALIDATOR.validarImagen(archivoFoto);
            if (!check.valido) throw new Error(check.error);

            const extension = archivoFoto.name.split('.').pop();
            const nombreArchivo = `${usuarioActual.id}_${Date.now()}.${extension}`;
            
            // Subo el archivo al Storage
            const { error: errorSubida } = await window.clienteSupabase.storage
                .from('avatars')
                .upload(nombreArchivo, archivoFoto);
                
            if (errorSubida) throw errorSubida;
            
            // Obtengo la URL pública para guardarla en los metadatos
            const { data: dataUrl } = window.clienteSupabase.storage
                .from('avatars')
                .getPublicUrl(nombreArchivo);
                
            nuevaFotoUrl = dataUrl.publicUrl;
        }

        // 2. ACTUALIZACIÓN EN MI TABLA 'alumnos' 
        const { error: errorTabla } = await window.clienteSupabase
            .from('alumnos') 
            .update({ 
                nombre: nuevoNombre
                // No guardamos la foto en la tabla, solo se maneja vía metadatos de Auth para persistencia de sesión
            })
            .eq('id', usuarioActual.id); 

        if (errorTabla) throw new Error("Error en tabla alumnos: " + errorTabla.message);

        // 3. ACTUALIZACIÓN DE METADATOS DE SESIÓN (Auth)
        const { data: dataAuth, error: errorAuth } = await window.clienteSupabase.auth.updateUser({
            data: { nombre: nuevoNombre, foto: nuevaFotoUrl }
        });
        
        if (errorAuth) throw errorAuth;

        alert("✅ He actualizado tu perfil correctamente.");
        usuarioActual = dataAuth.user.user_metadata; 
        usuarioActual.id = dataAuth.user.id; 
        actualizarInterfazUsuario();
        
        // Cierro mi panel lateral automáticamente
        const panelEl = document.getElementById('panelUsuario');
        const instancia = bootstrap.Offcanvas.getInstance(panelEl);
        if(instancia) instancia.hide();

    } catch (error) {
        console.error("Error en mi perfil:", error);
        alert("No pude actualizar el perfil: " + error.message);
    } finally {
        btnGuardar.innerText = "Guardar Cambios"; 
        btnGuardar.disabled = false;
    }
}

// --- LÓGICA DE REGISTRO / LOGIN ---
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
            const carrera = document.getElementById('carrera').value;

            // Registro en Supabase Auth
            const { data: authData, error: authError } = await window.clienteSupabase.auth.signUp({
                email, password,
                options: { 
                    data: { nombre, matricula, carrera, rol: 'estudiante', foto: '' } 
                }
            });
            if (authError) throw authError;

            // Registro en mi tabla 'alumnos' para gestión de datos
           const { error: dbError } = await window.clienteSupabase
    .from('alumnos')
    .upsert({
        id: authData.user.id,
        nombre: nombre,
        matricula: matricula,
        carrera: carrera,
        email: email
    }, { onConflict: 'id' }); 

if (dbError) {
    console.warn("Aviso: El perfil ya existía o hubo un conflicto menor, continuando...");
}

            alert("✅ ¡Registro exitoso!.");
            toggleAuthMode();
        } else {
            const { error } = await window.clienteSupabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
   } catch (error) {
    // Si el error es de usuario ya registrado, simplemente loguealo o ignóralo
    if (error.message.includes("User already registered")) {
        console.log("El usuario ya existe en Auth, procediendo...");
        // Opcional: podrías llamar automáticamente a la función de login aquí
    } else {
        alert("Error: " + error.message);
    }
    btn.disabled = false; btn.innerText = txtOriginal;
}
}

async function cerrarSesion() {
    // Forzamos el cierre en Supabase
    await window.clienteSupabase.auth.signOut();
    // Limpiamos el rastro local para que no pueda entrar de nuevo si se borró de la BD
    localStorage.removeItem('usuario_lince');
    localStorage.clear(); // Limpieza total de seguridad
    location.reload();
}
function toggleAuthMode() {
    esModoRegistro = !esModoRegistro;
    const camposReg = document.getElementById('campos-registro');
    const titulo = document.getElementById('titulo-auth');
    const btnAction = document.getElementById('btn-auth-action');
    const linkBoton = document.querySelector('.text-center.mt-4 button');

    if (esModoRegistro) {
        // Modo para CREAR cuenta
        camposReg.classList.remove('d-none'); 
        titulo.innerText = "Crear Cuenta"; 
        btnAction.innerText = "Registrarse";
        linkBoton.innerHTML = '¿Ya tienes cuenta? <span class="text-primary">Inicia Sesión</span>';
    } else {
        // Modo para ENTRAR (Login)
        camposReg.classList.add('d-none'); 
        titulo.innerText = "Bienvenido"; 
        btnAction.innerText = "Iniciar Sesión";
        linkBoton.innerHTML = '¿No tienes cuenta? <span class="text-primary">Regístrate</span>';
    }
}

// Exporto mis funciones
window.manejarAuth = manejarAuth;
window.actualizarPerfil = actualizarPerfil;
window.cerrarSesion = cerrarSesion;
window.toggleAuthMode = toggleAuthMode;