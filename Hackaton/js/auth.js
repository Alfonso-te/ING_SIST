// js/auth.js

let usuarioActual = null; 
let esModoRegistro = true; 

// DETECTAR SESIÓN
window.clienteSupabase.auth.onAuthStateChange((event, session) => {
    const btnAvatar = document.getElementById('btn-avatar-nav');

    if (session) {
        usuarioActual = session.user.user_metadata;
        actualizarInterfazUsuario(); // <--- ESTO PONE EL NOMBRE
        mostrarPantalla('pantalla-menu');
        
        if(btnAvatar) btnAvatar.classList.remove('d-none');

        // Lógica de botones Admin
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

    } else {
        usuarioActual = null;
        mostrarPantalla('pantalla-registro');
        if(btnAvatar) btnAvatar.classList.add('d-none');
    }
});

function actualizarInterfazUsuario() {
    // 1. Nombre en el menú (ESTO ES LO QUE FALLABA ANTES)
    const display = document.getElementById('nombre-alumno-display');
    if(display && usuarioActual) display.innerText = usuarioActual.nombre;
    
    // 2. Sidebar inputs
    const sideNombre = document.getElementById('side-nombre');
    const sideMatricula = document.getElementById('side-matricula');
    if(sideNombre) sideNombre.value = usuarioActual.nombre || '';
    if(sideMatricula) sideMatricula.value = usuarioActual.matricula || '';

    // 3. Fotos
    const avatarNavbar = document.getElementById('avatar-navbar');
    const avatarSidebar = document.getElementById('side-avatar-img'); 
    
    const fotoUrl = usuarioActual.foto || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
    const fotoConCache = fotoUrl + (usuarioActual.foto ? `?t=${Date.now()}` : '');

    if(avatarNavbar) avatarNavbar.src = fotoConCache;
    if(avatarSidebar) avatarSidebar.src = fotoConCache;
}

// LOGIN / REGISTRO
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
            const { error } = await window.clienteSupabase.auth.signUp({
                email, password,
                options: { data: { nombre, matricula, carrera, rol: 'estudiante', foto: '' } }
            });
            if (error) throw error;
            alert("Registro exitoso!");
        } else {
            const { error } = await window.clienteSupabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
        }
    } catch (error) {
        alert("Error: " + error.message);
        btn.disabled = false; btn.innerText = txtOriginal;
    }
}

// ACTUALIZAR PERFIL
async function actualizarPerfil(e) {
    e.preventDefault();
    const nuevoNombre = document.getElementById('side-nombre').value;
    const nuevaMatricula = document.getElementById('side-matricula').value;
    const archivoFoto = document.getElementById('side-foto-file').files[0];
    
    const btnGuardar = e.target.querySelector('button[type="submit"]');
    btnGuardar.innerText = "Guardando...";
    btnGuardar.disabled = true;

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

        // Sync tabla alumnos
        const { data: { user } } = await window.clienteSupabase.auth.getUser();
        await window.clienteSupabase.from('alumnos').update({ nombre: nuevoNombre, matricula: nuevaMatricula }).eq('id', user.id);

        alert("Perfil actualizado");
        usuarioActual = data.user.user_metadata;
        actualizarInterfazUsuario();
        
        // Cerrar panel
        const panelEl = document.getElementById('panelUsuario');
        if(panelEl) bootstrap.Offcanvas.getInstance(panelEl).hide();

    } catch (error) {
        alert(error.message);
    } finally {
        btnGuardar.innerText = "Guardar Cambios";
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