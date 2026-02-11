// Configuración API JSONBin (se carga desde config.json)
let JSONBIN_CONFIG = null;

/**
 * Carga la configuración desde config.json
 */
async function loadConfig() {
    try {
        console.log('Cargando configuración...');
        const response = await fetch('config.json');
        if (!response.ok) {
            throw new Error(`Error al cargar config.json: ${response.status}`);
        }
        const config = await response.json();
        const env = config.environment || 'DEV';
        JSONBIN_CONFIG = {
            token: config.token,
            api: config.api,
            binId: config.environments[env].binId
        };
        console.log(`Configuración cargada - Entorno: ${env}`);
        return true;
    } catch (error) {
        console.error('Error al cargar configuración:', error);
        alert('Error al cargar la configuración. Verifica que config.json existe.');
        return false;
    }
}

// Variable global para almacenar los datos de la quiniela
let quinielaData = {
    usuarios: [],
    fecha_inicio_quiniela: '',
    partidos_jornada: [],
    pronosticos: [],
    dobles: [],
    pronostico_definitivo: ''
};

/**
 * Carga los datos desde JSONBin
 */
async function loadData() {
    try {
        console.log('Cargando datos de JSONBin...');
        const response = await fetch(`${JSONBIN_CONFIG.api}/b/${JSONBIN_CONFIG.binId}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_CONFIG.token
            }
        });

        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.status}`);
        }

        const data = await response.json();
        quinielaData = data.record || quinielaData;
        console.log('Datos cargados correctamente');
        console.log('Partidos actuales:', quinielaData.partidos_jornada.length);
        return true;
    } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('Error al cargar los datos. Verifica tu conexión.');
        return false;
    }
}

/**
 * Guarda los datos en JSONBin
 */
async function saveData() {
    try {
        console.log('Guardando datos en JSONBin...');
        const response = await fetch(`${JSONBIN_CONFIG.api}/b/${JSONBIN_CONFIG.binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_CONFIG.token
            },
            body: JSON.stringify(quinielaData)
        });

        if (!response.ok) {
            throw new Error(`Error en la respuesta: ${response.status}`);
        }

        console.log('Datos guardados correctamente');
        return true;
    } catch (error) {
        console.error('Error al guardar datos:', error);
        alert('Error al guardar los datos. Verifica tu conexión.');
        return false;
    }
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
function obtenerFechaActual() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Valida que el textarea tenga exactamente 15 líneas no vacías
 */
function validarPartidos(texto) {
    const lineas = texto.split('\n')
        .map(linea => linea.trim())
        .filter(linea => linea.length > 0);

    if (lineas.length !== 15) {
        alert(`Error: Debes proporcionar exactamente 15 partidos. Se encontraron ${lineas.length}.`);
        return false;
    }

    return lineas;
}

/**
 * Actualiza el estado de los botones según el contenido del textarea
 */
function actualizarEstadoBotones() {
    const textarea = document.getElementById('textareaPartidos');
    const btnIniciar = document.getElementById('btnIniciarNuevaJornada');
    const btnModificar = document.getElementById('btnModificarJornada');
    
    const tieneContenido = textarea.value.trim().length > 0;
    btnIniciar.disabled = !tieneContenido;
    btnModificar.disabled = !tieneContenido;
}

/**
 * Procesa la nueva jornada
 */
async function iniciarNuevaJornada() {
    const confirmacion = confirm('Se va a empezar una nueva jornada. Los pronósticos de la actual se borrarán.');
    
    if (!confirmacion) {
        console.log('Nueva jornada cancelada por el usuario');
        return;
    }

    console.log('Procesando nueva jornada...');

    const textarea = document.getElementById('textareaPartidos');
    const partidosValidos = validarPartidos(textarea.value);

    if (!partidosValidos) {
        return;
    }

    // Actualizar partidos
    quinielaData.partidos_jornada = partidosValidos;

    // Resetear datos
    console.log('Iniciando nueva jornada...');
    quinielaData.fecha_inicio_quiniela = obtenerFechaActual();
    quinielaData.pronosticos = [];
    quinielaData.pronostico_definitivo = '';

    // Resetear dobles manteniendo la estructura
    if (quinielaData.dobles && Array.isArray(quinielaData.dobles)) {
        quinielaData.dobles.forEach(doble => {
            if (Array.isArray(doble.pronosticos)) {
                doble.pronosticos.forEach(pred => {
                    pred.partido = '';
                    pred.pronostico = '';
                });
            }
        });
    }

    console.log(`Nueva fecha establecida: ${quinielaData.fecha_inicio_quiniela}`);

    // Cambiar texto del botón y deshabilitar ambos
    const btnIniciar = document.getElementById('btnIniciarNuevaJornada');
    const btnModificar = document.getElementById('btnModificarJornada');
    const textoOriginal = btnIniciar.textContent;
    btnIniciar.textContent = 'Guardando...';
    btnIniciar.disabled = true;
    btnModificar.disabled = true;

    // Guardar datos
    const exito = await saveData();

    // Restaurar botones
    btnIniciar.textContent = textoOriginal;
    actualizarEstadoBotones();

    if (exito) {
        alert('Nueva jornada guardada correctamente.');
        textarea.value = ''; // Limpiar textarea
        actualizarEstadoBotones();
    }
}

/**
 * Procesa la modificación de jornada actual
 */
async function modificarJornada() {
    console.log('Procesando modificación de jornada actual...');

    const textarea = document.getElementById('textareaPartidos');
    const partidosValidos = validarPartidos(textarea.value);

    if (!partidosValidos) {
        return;
    }

    // Actualizar solo partidos
    quinielaData.partidos_jornada = partidosValidos;
    console.log('Actualizando partidos de la jornada actual...');

    // Cambiar texto del botón y deshabilitar ambos
    const btnIniciar = document.getElementById('btnIniciarNuevaJornada');
    const btnModificar = document.getElementById('btnModificarJornada');
    const textoOriginal = btnModificar.textContent;
    btnModificar.textContent = 'Guardando...';
    btnIniciar.disabled = true;
    btnModificar.disabled = true;

    // Guardar datos
    const exito = await saveData();

    // Restaurar botones
    btnModificar.textContent = textoOriginal;
    actualizarEstadoBotones();

    if (exito) {
        alert('Jornada modificada correctamente.');
        textarea.value = ''; // Limpiar textarea
        actualizarEstadoBotones();
    }
}

/**
 * Inicializa la página y configura los event listeners
 */
async function inicializar() {
    console.log('Inicializando panel de administración...');

    // Cargar configuración primero
    const configLoaded = await loadConfig();
    if (!configLoaded) {
        console.error('No se pudo cargar la configuración');
        return;
    }

    // Cargar datos iniciales
    await loadData();

    // El textarea debe estar vacío al cargar (no mostrar partidos actuales)
    const textarea = document.getElementById('textareaPartidos');
    textarea.value = '';

    // Configurar event listeners de los botones
    document.getElementById('btnIniciarNuevaJornada').addEventListener('click', iniciarNuevaJornada);
    document.getElementById('btnModificarJornada').addEventListener('click', modificarJornada);

    // Configurar event listener del textarea para habilitar/deshabilitar botones
    textarea.addEventListener('input', actualizarEstadoBotones);

    // Estado inicial de botones (deshabilitados porque textarea está vacío)
    actualizarEstadoBotones();

    console.log('Panel de administración listo');
}

// Ejecutar inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializar);
