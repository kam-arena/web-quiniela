// Configuración API JSONBin
const JSONBIN_CONFIG = {
    token: '$2a$10$WUVYIohtiAvApiZw9Za60OYVOwyDtt8DqEG5OHLhAgIEdDz57GJOK',
    api: 'https://api.jsonbin.io/v3',
    binId: '6985ddb6d0ea881f40a577a1'
};

// Variable global para almacenar los datos de la quiniela
let quinielaData = {
    usuarios: [],
    partidos_jornada: [],
    pronosticos: [],
    dobles: []
};

// Variable global para almacenar las selecciones actuales (16 posiciones: 0-13 partidos 1-14, 14-15 para 15A/15B)
let seleccionesActuales = Array(16).fill('');

// Variable global para almacenar el usuario actual seleccionado
let usuarioActualSeleccionado = null;

/**
 * Verifica si todas las selecciones están completas
 * @returns {boolean} true si todas las 16 posiciones tienen un valor, false en caso contrario
 */
function todasLasSeleccionesCompletas() {
    return seleccionesActuales.every(seleccion => seleccion !== '');
}

/**
 * Actualiza la visibilidad del botón guardar según las condiciones:
 * - Solo se muestra si el usuario no tiene pronóstico guardado
 * - Y todas las selecciones están completas
 */
function actualizarVisibilidadBotonGuardar() {
    const btnGuardar = document.getElementById('btnGuardarPronostico');
    if (!btnGuardar) return;

    // Verificar si el usuario actual tiene pronóstico guardado
    const tienePronostico = usuarioActualSeleccionado && 
                           quinielaData.pronosticos.find(p => p.usuario === usuarioActualSeleccionado);

    // Mostrar botón solo si no tiene pronóstico Y todas las selecciones están completas
    if (!tienePronostico && todasLasSeleccionesCompletas()) {
        btnGuardar.style.display = 'block';
        console.log('Botón guardar mostrado - todas las selecciones completas');
    } else {
        btnGuardar.style.display = 'none';
    }
}

/**
 * Carga los datos desde JSONBin al iniciar la aplicación
 * @returns {Promise<boolean>} true si se cargó exitosamente, false en caso contrario
 */
async function loadData() {
    try {
        const response = await fetch(`${JSONBIN_CONFIG.api}/b/${JSONBIN_CONFIG.binId}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_CONFIG.token
            }
        });

        if (!response.ok) {
            throw new Error(`Error al cargar datos: ${response.statusText}`);
        }

        const data = await response.json();
        quinielaData = data.record || quinielaData;
        
        console.log('Datos cargados exitosamente:', quinielaData);
        return true;
    } catch (error) {
        console.error('Error al cargar datos desde JSONBin:', error);
        console.warn('Usando estructura vacía por defecto');
        return false;
    }
}

/**
 * Crea y muestra el selector de usuarios en el contenedor especificado
 */
function crearSelectUsuarios() {
    console.log('Creando selector de usuarios...');
    const container = document.getElementById('selectUsuarioContainer');
    
    if (!container) {
        console.error('No se encontró el contenedor #selectUsuarioContainer');
        return;
    }

    // Limpiar el contenedor
    container.innerHTML = '';

    // Crear label
    const label = document.createElement('label');
    label.setAttribute('for', 'selectUsuario');
    label.textContent = 'Selecciona tu usuario:';
    
    // Crear select
    const select = document.createElement('select');
    select.id = 'selectUsuario';
    select.name = 'usuario';

    // Opción por defecto
    const optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.textContent = '-- Selecciona un usuario --';
    optionDefault.disabled = true;
    optionDefault.selected = true;
    select.appendChild(optionDefault);

    // Agregar opciones de usuarios
    if (quinielaData.usuarios && quinielaData.usuarios.length > 0) {
        quinielaData.usuarios.forEach(usuario => {
            const option = document.createElement('option');
            option.value = usuario;
            option.textContent = usuario;
            select.appendChild(option);
        });
        console.log(`${quinielaData.usuarios.length} usuarios cargados en el selector`);
    } else {
        console.warn('No hay usuarios disponibles para mostrar');
    }

    // Agregar elementos al contenedor
    container.appendChild(label);
    container.appendChild(select);

    // Event listener para el select
    select.addEventListener('change', (e) => {
        const usuarioSeleccionado = e.target.value;
        console.log('Usuario seleccionado:', usuarioSeleccionado);
        
        if (usuarioSeleccionado) {
            // Mostrar tabla y botón cuando se selecciona usuario
            const quinielaContainer = document.getElementById('quinielaContainer');
            const btnGuardar = document.getElementById('btnGuardarPronostico');
            if (quinielaContainer) quinielaContainer.style.display = 'block';
            if (btnGuardar) btnGuardar.style.display = 'block';
            
            cargarPronosticosDelUsuario(usuarioSeleccionado);
        } else {
            // Ocultar tabla y botón si no hay usuario
            const quinielaContainer = document.getElementById('quinielaContainer');
            const btnGuardar = document.getElementById('btnGuardarPronostico');
            if (quinielaContainer) quinielaContainer.style.display = 'none';
            if (btnGuardar) btnGuardar.style.display = 'none';
        }
    });
}

/**
 * Guarda los datos en JSONBin
 * @returns {Promise<boolean>} true si se guardó exitosamente, false en caso contrario
 */
async function saveData() {
    try {
        const response = await fetch(`${JSONBIN_CONFIG.api}/b/${JSONBIN_CONFIG.binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_CONFIG.token
            },
            body: JSON.stringify(quinielaData)
        });

        if (!response.ok) {
            throw new Error(`Error al guardar datos: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Datos guardados exitosamente en JSONBin');
        return true;
    } catch (error) {
        console.error('Error al guardar datos en JSONBin:', error);
        return false;
    }
}

/**
 * Crea la tabla dinámica de partidos con buttons para seleccionar pronósticos
 */
function crearTablaPartidos() {
    console.log('Creando tabla de partidos...');
    const container = document.getElementById('quinielaContainer');
    
    if (!container) {
        console.error('No se encontró el contenedor #quinielaContainer');
        return;
    }

    // Limpiar el contenedor
    container.innerHTML = '';

    // Crear tabla
    const tabla = document.createElement('table');
    tabla.id = 'tablaPartidos';
    tabla.className = 'tabla-quiniela';

    // Crear filas para partidos 1-14
    for (let i = 1; i <= 14; i++) {
        const fila = document.createElement('tr');
        fila.className = 'fila-partido';
        fila.setAttribute('data-partido', i);

        // Columna 1: número del partido
        const celdaNumero = document.createElement('td');
        celdaNumero.className = 'celda-numero';
        celdaNumero.textContent = i;
        fila.appendChild(celdaNumero);

        // Columna 2: texto del partido
        const celdaTexto = document.createElement('td');
        celdaTexto.className = 'celda-texto';
        celdaTexto.textContent = quinielaData.partidos_jornada[i - 1] || `Partido ${i}`;
        fila.appendChild(celdaTexto);

        // Columnas 3-6: opciones (vacío, 1, X, 2)
        const opciones = ['', '1', 'X', '2'];
        opciones.forEach(opcion => {
            const celdaOpcion = document.createElement('td');
            celdaOpcion.className = 'celda-opcion';

            if (opcion != '')  {
                const button = document.createElement('button');
                button.className = 'btn-opcion';
                button.textContent = opcion || '—';
                button.setAttribute('data-partido', i);
                button.setAttribute('data-opcion', opcion);
                button.setAttribute('data-indice', i - 1);

                button.addEventListener('click', () => {
                    // Remover clase seleccionado de todos los buttons de esta fila
                    const botonesFila = fila.querySelectorAll('.btn-opcion');
                    botonesFila.forEach(btn => btn.classList.remove('seleccionado'));

                    // Agregar clase seleccionado al button clickeado
                    button.classList.add('seleccionado');

                    // Actualizar seleccionesActuales
                    seleccionesActuales[i - 1] = opcion;
                    console.log(`Selección partido ${i}: "${opcion || 'vacío'}"`, seleccionesActuales);
                    
                    // Verificar si todas las selecciones están completas
                    actualizarVisibilidadBotonGuardar();
                });

                celdaOpcion.appendChild(button);
            }
            
            fila.appendChild(celdaOpcion);
        });

        tabla.appendChild(fila);
    }

    // Crear filas para partido 15 (15A y 15B)
    const opciones15 = ['0', '1', '2', 'M'];

    // Fila 15A (Equipo local)
    const fila15A = document.createElement('tr');
    fila15A.className = 'fila-partido fila-partido-15';
    fila15A.setAttribute('data-partido', '15A');

    const celda15ANumero = document.createElement('td');
    celda15ANumero.className = 'celda-numero';
    celda15ANumero.setAttribute('rowspan', '2');
    celda15ANumero.textContent = '15';
    fila15A.appendChild(celda15ANumero);

    const celda15ATexto = document.createElement('td');
    celda15ATexto.className = 'celda-texto';
    const partido15 = quinielaData.partidos_jornada[14] || 'Partido 15';
    const equipos15 = partido15.split(' vs ');
    celda15ATexto.textContent = equipos15[0] || 'Eq. Local';
    fila15A.appendChild(celda15ATexto);

    opciones15.forEach(opcion => {
        const celda = document.createElement('td');
        celda.className = 'celda-opcion';

        const button = document.createElement('button');
        button.className = 'btn-opcion';
        button.textContent = opcion || '—';
        button.setAttribute('data-partido', '15A');
        button.setAttribute('data-opcion', opcion);
        button.setAttribute('data-indice', 14);

        button.addEventListener('click', () => {
            const botonesFila = fila15A.querySelectorAll('.btn-opcion');
            botonesFila.forEach(btn => btn.classList.remove('seleccionado'));
            button.classList.add('seleccionado');
            seleccionesActuales[14] = opcion;
            console.log(`Selección partido 15A: "${opcion || 'vacío'}"`, seleccionesActuales);
            
            // Verificar si todas las selecciones están completas
            actualizarVisibilidadBotonGuardar();
        });

        celda.appendChild(button);
        fila15A.appendChild(celda);
    });

    tabla.appendChild(fila15A);

    // Fila 15B (Equipo visitante)
    const fila15B = document.createElement('tr');
    fila15B.className = 'fila-partido fila-partido-15';
    fila15B.setAttribute('data-partido', '15B');

    const celda15BTexto = document.createElement('td');
    celda15BTexto.className = 'celda-texto';
    celda15BTexto.textContent = equipos15[1] || 'Eq. Visitante';
    fila15B.appendChild(celda15BTexto);

    opciones15.forEach(opcion => {
        const celda = document.createElement('td');
        celda.className = 'celda-opcion';

        const button = document.createElement('button');
        button.className = 'btn-opcion';
        button.textContent = opcion || '—';
        button.setAttribute('data-partido', '15B');
        button.setAttribute('data-opcion', opcion);
        button.setAttribute('data-indice', 15);

        button.addEventListener('click', () => {
            const botonesFila = fila15B.querySelectorAll('.btn-opcion');
            botonesFila.forEach(btn => btn.classList.remove('seleccionado'));
            button.classList.add('seleccionado');
            seleccionesActuales[15] = opcion;
            console.log(`Selección partido 15B: "${opcion || 'vacío'}"`, seleccionesActuales);
            
            // Verificar si todas las selecciones están completas
            actualizarVisibilidadBotonGuardar();
        });

        celda.appendChild(button);
        fila15B.appendChild(celda);
    });

    tabla.appendChild(fila15B);

    // Agregar tabla al contenedor
    container.appendChild(tabla);
    console.log('Tabla de partidos creada exitosamente');
}

/**
 * Carga los pronósticos del usuario seleccionado y actualiza la UI
 * @param {string} nombreUsuario - Nombre del usuario
 */
function cargarPronosticosDelUsuario(nombreUsuario) {
    console.log(`Cargando pronósticos para usuario: ${nombreUsuario}`);

    // Guardar usuario actual
    usuarioActualSeleccionado = nombreUsuario;

    // Resetear selecciones
    seleccionesActuales = Array(16).fill('');

    // Buscar pronóstico del usuario en los datos
    const pronosticoGuardado = quinielaData.pronosticos.find(p => p.usuario === nombreUsuario);

    if (pronosticoGuardado && pronosticoGuardado.pronostico) {
        console.log(`Pronóstico encontrado para ${nombreUsuario}:`, pronosticoGuardado.pronostico);

        // Desglosar el string de pronóstico
        const pronosticoString = pronosticoGuardado.pronostico;
        for (let i = 0; i < pronosticoString.length && i < 16; i++) {
            seleccionesActuales[i] = pronosticoString[i];
        }

        // Actualizar UI: marcar los buttons activos
        const tabla = document.getElementById('tablaPartidos');
        if (tabla) {
            const buttons = tabla.querySelectorAll('.btn-opcion');
            buttons.forEach(btn => {
                btn.classList.remove('seleccionado');

                const indice = parseInt(btn.getAttribute('data-indice'));
                const opcion = btn.getAttribute('data-opcion');

                if (indice < 16 && opcion === seleccionesActuales[indice]) {
                    btn.classList.add('seleccionado');
                }
            });
        }

        // Esconder botón guardar si el pronóstico ya existe
        const btnGuardar = document.getElementById('btnGuardarPronostico');
        if (btnGuardar) {
            btnGuardar.style.display = 'none';
        }
    } else {
        console.log(`No hay pronóstico guardado para ${nombreUsuario}`);
        // Limpiar tabla (remover todos los seleccionados)
        const tabla = document.getElementById('tablaPartidos');
        if (tabla) {
            const buttons = tabla.querySelectorAll('.btn-opcion');
            buttons.forEach(btn => btn.classList.remove('seleccionado'));
        }

        // Actualizar visibilidad del botón guardar (se mostrará solo si todas las selecciones están completas)
        actualizarVisibilidadBotonGuardar();
    }
}

/**
 * Guarda los pronósticos del usuario actual en JSONBin
 * @param {string} usuarioActual - Nombre del usuario actual
 */
async function guardarPronosticos(usuarioActual) {
    if (!usuarioActual) {
        console.warn('No hay usuario seleccionado para guardar pronósticos');
        return;
    }

    console.log(`Guardando pronósticos para usuario: ${usuarioActual}`);

    // Concatenar las selecciones en un string
    const pronosticoString = seleccionesActuales.join('');
    console.log(`Pronóstico a guardar: "${pronosticoString}"`);

    // Buscar si ya existe pronóstico para este usuario
    const indicePronostico = quinielaData.pronosticos.findIndex(p => p.usuario === usuarioActual);

    if (indicePronostico !== -1) {
        // Actualizar pronóstico existente
        quinielaData.pronosticos[indicePronostico].pronostico = pronosticoString;
        console.log(`Pronóstico actualizado para ${usuarioActual}`);
    } else {
        // Crear nuevo pronóstico
        quinielaData.pronosticos.push({
            usuario: usuarioActual,
            pronostico: pronosticoString
        });
        console.log(`Nuevo pronóstico creado para ${usuarioActual}`);
    }

    // Guardar en JSONBin
    const success = await saveData();
    if (success) {
        console.log(`Pronósticos guardados exitosamente para ${usuarioActual}: "${pronosticoString}"`);
        alert(`Pronósticos guardados para ${usuarioActual}`);

        // Esconder botón guardar después de guardar exitosamente
        const btnGuardar = document.getElementById('btnGuardarPronostico');
        if (btnGuardar) {
            btnGuardar.style.display = 'none';
        }
    } else {
        console.error('Error al guardar pronósticos en JSONBin');
        alert('Error al guardar pronósticos. Intenta de nuevo.');
    }
}

// Listeners
document.addEventListener('DOMContentLoaded', async () => {

    // Cargar datos al iniciar la aplicación
    console.log('Cargando datos de la quiniela...');
    const success = await loadData();
    if (success) {
        // Crear selector de usuarios con los datos cargados
        crearSelectUsuarios();
        // Crear tabla de partidos (oculta inicialmente)
        crearTablaPartidos();
        
        // Ocultar tabla y botón inicialmente
        const quinielaContainer = document.getElementById('quinielaContainer');
        const btnGuardar = document.getElementById('btnGuardarPronostico');
        if (quinielaContainer) quinielaContainer.style.display = 'none';
        if (btnGuardar) btnGuardar.style.display = 'none';
    }

    // Event listener para el botón guardar
    const btnGuardar = document.getElementById('btnGuardarPronostico');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', () => {
            const selectUsuario = document.getElementById('selectUsuario');
            const usuarioSeleccionado = selectUsuario ? selectUsuario.value : null;
            guardarPronosticos(usuarioSeleccionado);
        });
    }
    
});