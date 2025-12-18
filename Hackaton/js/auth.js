// js/auth.js
let usuarioActual = null; 
let esModoRegistro = true; 

// --- DETECTAR SESIÓN AL INICIAR ---
window.clienteSupabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        usuarioActual = session.user.user_metadata;
        actualizarInterfazUsuario();
        mostrarPantalla('pantalla-menu');
        
        // Si es admin, cargar panel admin automáticamente
        if(usuarioActual.rol === 'admin') {
            cargarPanelAdmin(); // Función que estará en app.js
            document.getElementById('btn-ir-admin').classList.remove('d-none');
        }
    } else {
        usuarioActual = null;
        mostrarPantalla('pantalla-registro');
    }
});

function actualizarInterfazUsuario() {
    // Nombre en el menú
    document.getElementById('nombre-alumno-display').innerText = usuarioActual.nombre;
    
    // Llenar el Panel Lateral
    document.getElementById('side-nombre').value = usuarioActual.nombre || '';
    document.getElementById('side-matricula').value = usuarioActual.matricula || '';
    document.getElementById('side-foto').value = usuarioActual.foto || ''; // URL de la foto
    
    // Actualizar Avatar en Navbar
    const avatarImg = document.getElementById('avatar-navbar');
    if(usuarioActual.foto) {
        avatarImg.src = usuarioActual.foto;
    } else {
        avatarImg.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; // Avatar default
    }
}

// --- LOGIN / REGISTRO ---
async function manejarAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-auth-action');
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
        btn.disabled = false; btn.innerText = esModoRegistro ? "Registrarse" : "Ingresar";
    }
}

// --- ACTUALIZAR PERFIL (PANEL LATERAL) ---
async function actualizarPerfil(e) {
    e.preventDefault();
    const nuevoNombre = document.getElementById('side-nombre').value;
    const nuevaMatricula = document.getElementById('side-matricula').value;
    const nuevaFoto = document.getElementById('side-foto').value;

    const { data, error } = await window.clienteSupabase.auth.updateUser({
        data: { 
            nombre: nuevoNombre, 
            matricula: nuevaMatricula,
            foto: nuevaFoto
        }
    });

    if (error) {
        alert("Error al actualizar: " + error.message);
    } else {
        alert("Perfil actualizado correctamente");
        usuarioActual = data.user.user_metadata; // Refrescar local
        actualizarInterfazUsuario(); // Refrescar visual
    }
}

async function cerrarSesion() {
    await window.clienteSupabase.auth.signOut();
    location.reload();
}

// Funciones auxiliares de UI
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