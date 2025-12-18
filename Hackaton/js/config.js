

// 1. CONFIGURACIÓN SUPABASE
const SUPABASE_URL = 'https://ziooofzbcvkmyyrdgjqb.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_s1ieWIJ5-k_xz4Ryrmnakw_HCrtjpc4'; 

// Inicializar cliente globalmente
window.clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. CONFIGURACIÓN EMAILJS
window.EMAIL_CONFIG = {
    PUBLIC_KEY: "-O_jzYRRnElKLM8go", 
    SERVICE_ID: "service_2ey5ilj",         
    TEMPLATE_ID: "template_4kkbtiq"        
};

// Inicializar EmailJS
(function(){
    emailjs.init(window.EMAIL_CONFIG.PUBLIC_KEY);
})();

// --- LISTA DE PALABRAS PROHIBIDAS (Ejemplo básico, puedes agregar más) ---
const PALABRAS_PROHIBIDAS = ['tonto', 'idiota', 'estupido', 'groseria1', 'groseria2', 'xxx']; 

// --- OBJETO DE VALIDACIONES ---
window.VALIDATOR = {
    // 1. Validar Email (Formato correcto)
    esEmailValido: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    // 2. Validar Texto (Sin groserías)
    contieneGroserias: (texto) => {
        if (!texto) return false;
        const palabras = texto.toLowerCase().split(/\s+/);
        // Revisa si alguna palabra del texto está en la lista prohibida
        return palabras.some(p => PALABRAS_PROHIBIDAS.includes(p));
    },

    // 3. Validar Imagen (Solo JPG/PNG y máx 2MB)
    validarImagen: (archivo) => {
        if (!archivo) return { valido: true }; // Si no hay archivo, pasa
        
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg'];
        const tamanoMaximo = 2 * 1024 * 1024; // 2MB en bytes

        if (!tiposPermitidos.includes(archivo.type)) {
            return { valido: false, error: "Solo se permiten imágenes JPG o PNG." };
        }
        if (archivo.size > tamanoMaximo) {
            return { valido: false, error: "La imagen es muy pesada (Máx 2MB)." };
        }
        return { valido: true };
    }
};

console.log("✅ Configuración cargada");