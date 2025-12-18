// js/config.js
console.log("Cargando configuración...");

const SUPABASE_URL = 'https://ziooofzbcvkmyyrdgjqb.supabase.co'; 

const SUPABASE_KEY = 'sb_publishable_s1ieWIJ5-k_xz4Ryrmnakw_HCrtjpc4'; 

const clienteSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
window.clienteSupabase = clienteSupabase; // Hacemos la variable global