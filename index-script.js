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
    partidos_jornada: [],
    pronosticos: [],
    dobles: [],
    historico: []
};

// Configura los dobles que cada usuario puede rellenar según la semana pasada (ejemplo: 2 dobles para el primero, 1 para el segundo, 1 para el tercero)
let n_dobles_primero_semana_pasada = 2;
let n_dobles_segundo_semana_pasada = 1;
let n_dobles_tercero_semana_pasada = 1;

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
 * Verifica si todos los dobles están completos (2 opciones seleccionadas en cada uno)
 * @returns {boolean} true si todos los dobles están completos o no hay dobles, false en caso contrario
 */
function verificarDoblesCompletos() {
    const seccionDobles = document.getElementById('seccionDobles');
    
    // Si no hay sección de dobles, consideramos los dobles como completos
    if (!seccionDobles) {
        return true;
    }
    
    const filasDobles = seccionDobles.querySelectorAll('.fila-doble');
    
    // Si no hay filas de dobles, consideramos los dobles como completos
    if (filasDobles.length === 0) {
        return true;
    }
    
    // Verificar que cada doble tenga: partido seleccionado + exactamente 2 opciones seleccionadas
    for (let fila of filasDobles) {
        const selectPartido = fila.querySelector('.selector-partido-doble');
        const botoneSeleccionados = fila.querySelectorAll('.btn-doble.seleccionado');
        
        // Verificar que se haya seleccionado un partido
        if (!selectPartido || selectPartido.value === '') {
            console.log(`Doble incompleto: no hay partido seleccionado`);
            return false;
        }
        
        // Verificar que haya exactamente 2 opciones seleccionadas
        if (botoneSeleccionados.length !== 2) {
            console.log(`Doble incompleto: tiene ${botoneSeleccionados.length} opciones seleccionadas, se requieren 2`);
            return false;
        }
    }
    
    console.log('Todos los dobles están completos (partido + 2 opciones)');
    return true;
}

/**
 * Actualiza la visibilidad del botón guardar según las condiciones:
 * - Solo se muestra si el usuario no tiene pronóstico guardado
 * - Y todas las selecciones de pronósticos están completas (16)
 * - Y todos los dobles están completos (2 opciones por doble)
 */
function actualizarVisibilidadBotonGuardar() {
    const btnGuardar = document.getElementById('btnGuardarPronostico');
    if (!btnGuardar) return;

    // Verificar si el usuario actual tiene pronóstico guardado
    const tienePronostico = usuarioActualSeleccionado && 
                           quinielaData.pronosticos.find(p => p.usuario === usuarioActualSeleccionado);

    // Verificar si todas las selecciones están completas
    const seleccionesCompletas = todasLasSeleccionesCompletas();
    
    // Verificar si todos los dobles están completos
    const doblesCompletos = verificarDoblesCompletos();
    
    // Mostrar botón solo si: no tiene pronóstico Y selecciones completas Y dobles completos
    if (!tienePronostico && seleccionesCompletas && doblesCompletos) {
        btnGuardar.style.display = 'block';
        console.log('Botón guardar mostrado - selecciones y dobles completos');
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
    
    // Mostrar sección de dobles si el usuario puede hacerlos
    mostrarSeccionDobles(nombreUsuario);
    
    // Actualizar visibilidad del botón guardar después de mostrar dobles
    actualizarVisibilidadBotonGuardar();
}

/**
 * Obtiene el doble guardado para un partido específico
 * @param {string|number} numeroPartido - Número del partido (1-15)
 * @returns {string} String con los dos caracteres del doble, o vacío si no existe
 */
function obtenerDobleParaPartido(numeroPartido) {
    if (!quinielaData.dobles || quinielaData.dobles.length === 0) {
        return '';
    }
    
    const partidoStr = String(numeroPartido);
    
    // Buscar el primer doble que coincida con este partido
    for (let doble of quinielaData.dobles) {
        for (let p of doble.pronosticos) {
            if (p.partido === partidoStr && p.pronostico !== '') {
                console.log(`Doble encontrado para partido ${numeroPartido}: "${p.pronostico}"`);
                return p.pronostico; // Retorna los 2 caracteres del doble
            }
        }
    }
    
    return ''; // No hay doble para este partido
}

/**
 * Calcula el pronóstico definitivo basado en los votos de todos los usuarios
 * Para filas 1-14: selecciona el valor más repetido (si hay empate, elige aleatoriamente)
 * Para filas 15A/15B: convierte a números (M→3), calcula media aritmética redondeada, convierte de vuelta
 * @returns {string} String de 16 caracteres con el pronóstico definitivo
 */
function calcularPronosticoDefinitivo() {
    if (!quinielaData.pronosticos || quinielaData.pronosticos.length === 0) {
        console.log('No hay pronósticos para calcular')
        return '';
    }

    let pronosticoDefinitivo = '';

    // Procesar posiciones 0-13 (partidos 1-14)
    for (let posicion = 0; posicion < 14; posicion++) {
        const votos = {};

        // Contar votos para esta posición
        quinielaData.pronosticos.forEach(pronostico => {
            const valor = pronostico.pronostico[posicion];
            votos[valor] = (votos[valor] || 0) + 1;
        });

        // Encontrar el valor más repetido
        const maxVotos = Math.max(...Object.values(votos));
        const mascRepetidos = Object.keys(votos).filter(clave => votos[clave] === maxVotos);

        // Si hay empate, elegir aleatoriamente
        const valorSeleccionado = mascRepetidos[Math.floor(Math.random() * mascRepetidos.length)];
        
        pronosticoDefinitivo += valorSeleccionado;
        console.log(`Posición ${posicion + 1}: votos=${JSON.stringify(votos)}, ganador="${valorSeleccionado}"`);
    }

    // Procesar posiciones 14-15 (partido 15A y 15B)
    for (let posicion of [14, 15]) {
        const votos = {};
        const valoresNumericos = {};

        // Contar votos y mapear a números
        quinielaData.pronosticos.forEach(pronostico => {
            const valor = pronostico.pronostico[posicion];
            votos[valor] = (votos[valor] || 0) + 1;
            
            // Mapear a número (0→0, 1→1, 2→2, M→3)
            if (!valoresNumericos[valor]) {
                if (valor === 'M') {
                    valoresNumericos[valor] = 3;
                } else {
                    valoresNumericos[valor] = parseInt(valor);
                }
            }
        });

        // Calcular media aritmética ponderada
        let sumaValores = 0;
        let totalVotos = 0;

        Object.keys(votos).forEach(valor => {
            const cantidadVotos = votos[valor];
            const numeroValor = valoresNumericos[valor];
            sumaValores += numeroValor * cantidadVotos;
            totalVotos += cantidadVotos;
        });

        const promedio = Math.round(sumaValores / totalVotos);

        // Convertir de vuelta a valor (0→0, 1→1, 2→2, 3→M)
        const valorFinal = promedio === 3 ? 'M' : String(promedio);
        
        pronosticoDefinitivo += valorFinal;
        const posicionEtiqueta = posicion === 14 ? '15A' : '15B';
        console.log(`Posición ${posicionEtiqueta}: votos=${JSON.stringify(votos)}, promedio=${promedio}, valor="${valorFinal}"`);
    }

    console.log(`Pronóstico definitivo calculado: "${pronosticoDefinitivo}"`);
    return pronosticoDefinitivo;
}

/**
 * Muestra los resultados computados en el contenedor #resultados
 */
function mostrarResultados() {
    const contenedorResultados = document.getElementById('resultados');
    if (!contenedorResultados) {
        console.warn('No se encontró el contenedor #resultados');
        return;
    }

    // Si no hay pronóstico definitivo, ocultar todo el contenedor
    if (!quinielaData.pronostico_definitivo || quinielaData.pronostico_definitivo.length === 0) {
        contenedorResultados.style.display = 'none';
        console.log('Contenedor de resultados ocultado (sin pronósticos)');
        return;
    }

    // Mostrar contenedor si hay pronósticos
    contenedorResultados.style.display = 'block';

    // Remover lista anterior si existe
    const listaAnterior = contenedorResultados.querySelector('.lista-resultados');
    if (listaAnterior) {
        listaAnterior.remove();
    }

    // Crear contenedor para la lista
    const listaDiv = document.createElement('div');
    listaDiv.className = 'lista-resultados';

    // Crear líneas para partidos 1-14
    for (let i = 0; i < 14; i++) {
        const numeroPartido = i + 1;
        const nombrePartido = quinielaData.partidos_jornada[i] || `Partido ${numeroPartido}`;
        
        // Buscar si hay doble para este partido (prevalece sobre pronóstico definitivo)
        const doblePartido = obtenerDobleParaPartido(numeroPartido);
        const valor = doblePartido || quinielaData.pronostico_definitivo[i];

        const linea = document.createElement('div');
        linea.className = 'linea-resultado';
        linea.innerHTML = `<span class="num-partido">${numeroPartido}.</span> <span class="nombre-partido">${nombrePartido}</span> <span class="valor-resultado">${valor}</span>`;

        listaDiv.appendChild(linea);
    }

    // Crear líneas para partido 15
    const partido15 = quinielaData.partidos_jornada[14] || 'Partido 15';
    const equipos15 = partido15.split(' vs ');
    const equipoLocal = equipos15[0] || 'Eq. Local';
    const equipoVisitante = equipos15[1] || 'Eq. Visitante';
    
    // Buscar dobles para partido 15 (prevalecen sobre pronóstico definitivo)
    const doblePartido15 = obtenerDobleParaPartido(15);
    let valor15A, valor15B;
    
    if (doblePartido15) {
        // Si hay doble para partido 15, usarlo (2 caracteres)
        valor15A = doblePartido15[0];
        valor15B = doblePartido15[1];
    } else {
        // Si no hay doble, usar pronóstico definitivo
        valor15A = quinielaData.pronostico_definitivo[14];
        valor15B = quinielaData.pronostico_definitivo[15];
    }

    const linea15 = document.createElement('div');
    linea15.className = 'linea-resultado linea-resultado-15';
    linea15.innerHTML = `<span class="num-partido">15.</span> <span class="nombre-partido">${equipoLocal} - ${equipoVisitante}</span> <span class="valor-resultado">${valor15A}-${valor15B}</span>`;

    listaDiv.appendChild(linea15);

    // Agregar lista al contenedor
    contenedorResultados.appendChild(listaDiv);
    console.log('Resultados mostrados');
}

/**
 * Muestra el histórico de resultados de la última quiniela
 */
function mostrarHistorico() {
    const contenedorHistorico = document.getElementById('historicoResultados');
    if (!contenedorHistorico) {
        console.warn('No se encontró el contenedor #historicoResultados');
        return;
    }

    // Si no hay histórico o está vacío, ocultar el contenedor
    if (!quinielaData.historico || quinielaData.historico.length === 0) {
        contenedorHistorico.style.display = 'none';
        console.log('Contenedor de histórico ocultado (sin datos)');
        return;
    }

    // Obtener el último elemento del histórico
    const ultimoHistorico = quinielaData.historico[quinielaData.historico.length - 1];
    
    if (!ultimoHistorico || !ultimoHistorico.aciertos) {
        contenedorHistorico.style.display = 'none';
        console.log('Último histórico no contiene aciertos válidos');
        return;
    }

    // Mostrar contenedor
    contenedorHistorico.style.display = 'block';

    // Remover contenido anterior si existe
    const contenidoAnterior = contenedorHistorico.querySelector('.historico-contenido');
    if (contenidoAnterior) {
        contenidoAnterior.remove();
    }

    // Crear contenedor para el histórico
    const contenidoDiv = document.createElement('div');
    contenidoDiv.className = 'historico-contenido';

    // Extraer datos del último histórico
    const aciertos = ultimoHistorico.aciertos;
    let aciertosTotal = 0;
    const aciertosPorUsuario = {};

    // Procesar aciertos del histórico
    for (const acierto of aciertos) {
        if (acierto.nombre === 'totales') {
            aciertosTotal = acierto.cantidad;
        } else {
            aciertosPorUsuario[acierto.nombre] = acierto.cantidad;
        }
    }

    // CALCULAR dobles basándose en los aciertos del histórico
    // Convertir a array con {usuario, cantidad}
    const usuariosConAciertos = Object.entries(aciertosPorUsuario)
        .map(([usuario, cantidad]) => ({ usuario, cantidad }));
    
    // Agrupar por cantidad de aciertos
    const gruposPorAciertos = {};
    for (const entry of usuariosConAciertos) {
        if (!gruposPorAciertos[entry.cantidad]) {
            gruposPorAciertos[entry.cantidad] = [];
        }
        gruposPorAciertos[entry.cantidad].push(entry.usuario);
    }
    
    // Ordenar grupos por aciertos descendente
    const aciertoUnicos = Object.keys(gruposPorAciertos)
        .map(Number)
        .sort((a, b) => b - a);
    
    // Crear lista ordenada con desempate aleatorio dentro de cada grupo
    const usuariosFinales = [];
    for (const acierto of aciertoUnicos) {
        const grupo = gruposPorAciertos[acierto];
        const grupoMezclado = grupo.sort(() => Math.random() - 0.5);
        usuariosFinales.push(...grupoMezclado);
    }
    
    console.log('Orden final de usuarios para dobles (desde histórico):', usuariosFinales);
    
    // Asignar dobles: 1º = 2 dobles, 2º = 1 doble, 3º = 1 doble
    const doblesCalculados = {};
    if (usuariosFinales.length >= 1) {
        doblesCalculados[usuariosFinales[0]] = 2;
        console.log(`${usuariosFinales[0]}: 2 dobles`);
    }
    if (usuariosFinales.length >= 2) {
        doblesCalculados[usuariosFinales[1]] = 1;
        console.log(`${usuariosFinales[1]}: 1 doble`);
    }
    if (usuariosFinales.length >= 3) {
        doblesCalculados[usuariosFinales[2]] = 1;
        console.log(`${usuariosFinales[2]}: 1 doble`);
    }

    // Construir HTML con mismo formato que admin
    let html = '<div class="resultado-seccion">';
    html += '<div class="linea-resultado-admin">';
    html += '<span class="nombre-resultado">Aciertos</span>';
    html += '<span class="puntos-resultado"></span>';
    html += `<span class="valor-resultado-admin">${aciertosTotal}</span>`;
    html += '</div>';
    html += '</div>';

    // Aciertos por usuario (ordenados descendentemente)
    const usuariosOrdenados = Object.entries(aciertosPorUsuario)
        .sort(([, a], [, b]) => b - a);
    
    html += '<div class="resultado-seccion">';
    html += '<div class="titulo-seccion-resultado">Aciertos por usuario:</div>';
    for (const [usuario, cantidad] of usuariosOrdenados) {
        html += '<div class="linea-resultado-admin linea-indentada">';
        html += `<span class="nombre-resultado">${usuario}</span>`;
        html += '<span class="puntos-resultado"></span>';
        html += `<span class="valor-resultado-admin">${cantidad}</span>`;
        html += '</div>';
    }
    html += '</div>';

    // Reparto de dobles (calculado desde el histórico, no desde quinielaData.dobles)
    html += '<div class="resultado-seccion">';
    html += '<div class="titulo-seccion-resultado">Reparto de dobles:</div>';
    for (const [usuario, numDobles] of Object.entries(doblesCalculados)) {
        html += '<div class="linea-resultado-admin linea-indentada">';
        html += `<span class="nombre-resultado">${usuario}</span>`;
        html += '<span class="puntos-resultado"></span>';
        html += `<span class="valor-resultado-admin">${numDobles}</span>`;
        html += '</div>';
    }
    html += '</div>';

    contenidoDiv.innerHTML = html;
    contenedorHistorico.appendChild(contenidoDiv);
    console.log('Histórico mostrado desde último registro del histórico');
}

/**
 * Obtiene el objeto dobles del usuario si existe
 * @param {string} usuario - Nombre del usuario
 * @returns {Object|null} Objeto dobles del usuario o null
 */
function obtenerDobleDelUsuario(usuario) {
    if (!quinielaData.dobles || quinielaData.dobles.length === 0) {
        return null;
    }
    const doble = quinielaData.dobles.find(d => d.usuario === usuario);
    return doble || null;
}

/**
 * Obtiene todos los partidos seleccionados en dobles de OTROS usuarios
 * @param {string} usuarioActual - Nombre del usuario actual
 * @returns {Array} Array de números de partidos (string) seleccionados por otros usuarios
 */
function obtenerPartidosEnUsoDeOtrosUsuarios(usuarioActual) {
    if (!quinielaData.dobles || quinielaData.dobles.length === 0) return [];
    
    const partidosEnUso = [];
    
    quinielaData.dobles.forEach(doble => {
        // Solo incluir dobles de otros usuarios
        if (doble.usuario !== usuarioActual) {
            doble.pronosticos.forEach(p => {
                if (p.partido !== '') {
                    partidosEnUso.push(p.partido);
                }
            });
        }
    });
    
    console.log(`Partidos en uso de otros usuarios: ${JSON.stringify(partidosEnUso)}`);
    return partidosEnUso;
}

/**
 * Actualiza el estado de los selectores de partido (deshabilita según disponibilidad)
 * @param {string} usuario - Nombre del usuario
 */
function actualizarSelectoresDobles(usuario) {
    const seccionDobles = document.getElementById('seccionDobles');
    if (!seccionDobles) return;
    
    const selectoresDobles = seccionDobles.querySelectorAll('.selector-partido-doble');
    
    // Obtener partidos en uso de otros usuarios
    const partidosOtrosUsuarios = obtenerPartidosEnUsoDeOtrosUsuarios(usuario);
    
    // Obtener partidos seleccionados en este usuario
    const selectoresArray = Array.from(selectoresDobles);
    const partidosSeleccionadosEnEsteUsuario = selectoresArray
        .map(sel => sel.value)
        .filter(val => val !== '');
    
    // Actualizar cada selector
    selectoresArray.forEach((selector, indiceSelector) => {
        const options = selector.querySelectorAll('option');
        
        options.forEach(option => {
            if (option.value === '') {
                // Opción por defecto siempre habilitada
                option.disabled = false;
                return;
            }
            
            const partidoValue = option.value;
            const estadoEnOtros = partidosOtrosUsuarios.includes(partidoValue);
            
            // Verificar si está seleccionado en otro selector del mismo usuario
            const estadoEnEsteUsuario = partidosSeleccionadosEnEsteUsuario.includes(partidoValue) && 
                                        selector.value !== partidoValue;
            
            // Deshabilitar si: está en otros usuarios O está en otro selector del mismo usuario
            option.disabled = estadoEnOtros || estadoEnEsteUsuario;
        });
    });
    
    console.log('Selectores de dobles actualizados');
}

/**
 * Muestra la sección de dobles si el usuario puede hacer dobles
 * @param {string} usuario - Nombre del usuario
 */
function mostrarSeccionDobles(usuario) {
    console.log(`Mostrando sección de dobles para usuario: ${usuario}`);
    
    // Obtener el doble del usuario
    const dobleDelUsuario = obtenerDobleDelUsuario(usuario);
    
    // Si no existe, no mostrar sección
    if (!dobleDelUsuario) {
        console.log(`${usuario} no tiene dobles configurados`);
        // Remover sección si existe de un usuario anterior
        const seccionAnterior = document.getElementById('seccionDobles');
        if (seccionAnterior) {
            seccionAnterior.remove();
        }
        return;
    }
    
    const cantidadDobles = dobleDelUsuario.pronosticos.length;
    console.log(`${usuario} puede hacer ${cantidadDobles} doble(s)`);
    
    // Remover sección anterior si existe
    const seccionAnterior = document.getElementById('seccionDobles');
    if (seccionAnterior) {
        seccionAnterior.remove();
    }
    
    const container = document.getElementById('quinielaContainer');
    if (!container) {
        console.error('No se encontró el contenedor #quinielaContainer');
        return;
    }
    
    // Crear contenedor de dobles
    const seccionDobles = document.createElement('div');
    seccionDobles.id = 'seccionDobles';
    seccionDobles.className = 'seccion-dobles';
    
    // Crear label
    const label = document.createElement('p');
    label.className = 'label-dobles';
    label.textContent = `Tienes ${cantidadDobles} doble${cantidadDobles > 1 ? 's' : ''} a rellenar:`;
    seccionDobles.appendChild(label);
    
    // Obtener partidos en uso de otros usuarios
    const partidosOtrosUsuarios = obtenerPartidosEnUsoDeOtrosUsuarios(usuario);
    
    // Crear fila para cada doble
    for (let i = 0; i < cantidadDobles; i++) {
        const filaDoble = document.createElement('div');
        filaDoble.className = 'fila-doble';
        filaDoble.setAttribute('data-doble-indice', i);
        
        // Selector de partido
        const selectPartido = document.createElement('select');
        selectPartido.className = 'selector-partido-doble';
        selectPartido.setAttribute('data-doble-indice', i);
        
        const optionDefault = document.createElement('option');
        optionDefault.value = '';
        optionDefault.textContent = '-- Selecciona un partido --';
        optionDefault.disabled = false;
        optionDefault.selected = true;
        selectPartido.appendChild(optionDefault);
        
        // Agregar opciones de partidos (1-14)
        for (let p = 1; p <= 14; p++) {
            const option = document.createElement('option');
            option.value = String(p);
            option.textContent = `${p}. ${quinielaData.partidos_jornada[p - 1] || `Partido ${p}`}`;
            
            // Deshabilitar si está en uso por otros usuarios
            option.disabled = partidosOtrosUsuarios.includes(String(p));
            
            selectPartido.appendChild(option);
        }
        
        // Cargar partido anterior si existe
        if (dobleDelUsuario.pronosticos[i] && dobleDelUsuario.pronosticos[i].partido) {
            selectPartido.value = dobleDelUsuario.pronosticos[i].partido;
        }
        
        // Event listener para actualizar otros selectores cuando se cambia uno
        selectPartido.addEventListener('change', () => {
            actualizarSelectoresDobles(usuario);
            // Actualizar visibilidad del botón guardar cuando se cambia el partido
            actualizarVisibilidadBotonGuardar();
        });
        
        filaDoble.appendChild(selectPartido);
        
        // Contenedor de opciones (botones)
        const celdasOpciones = document.createElement('div');
        celdasOpciones.className = 'celdas-opciones-doble';
        
        // Crear botones para opciones (1, X, 2)
        const opciones = ['1', 'X', '2'];
        opciones.forEach(opcion => {
            const button = document.createElement('button');
            button.className = 'btn-doble';
            button.textContent = opcion;
            button.setAttribute('data-doble-indice', i);
            button.setAttribute('data-opcion', opcion);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Obtener botones seleccionados de este doble
                const botonesFila = filaDoble.querySelectorAll('.btn-doble.seleccionado');
                const cantidadSeleccionados = botonesFila.length;
                
                if (button.classList.contains('seleccionado')) {
                    // Deseleccionar si ya está seleccionado
                    button.classList.remove('seleccionado');
                } else {
                    // Si ya hay 2 seleccionados, deseleccionar el primero
                    if (cantidadSeleccionados >= 2) {
                        botonesFila[0].classList.remove('seleccionado');
                    }
                    // Seleccionar el nuevo
                    button.classList.add('seleccionado');
                }
                
                console.log(`Doble ${i}: opción "${opcion}" clickeada`);
                
                // Actualizar visibilidad del botón guardar
                actualizarVisibilidadBotonGuardar();
            });
            
            celdasOpciones.appendChild(button);
        });
        
        // Cargar selecciones anteriores si existen
        const pronosticoDoble = dobleDelUsuario.pronosticos[i];
        if (pronosticoDoble && pronosticoDoble.pronostico) {
            const chars = pronosticoDoble.pronostico.split('');
            chars.forEach(char => {
                const btn = celdasOpciones.querySelector(`button[data-opcion="${char}"]`);
                if (btn) {
                    btn.classList.add('seleccionado');
                }
            });
        }
        
        filaDoble.appendChild(celdasOpciones);
        seccionDobles.appendChild(filaDoble);
    }
    
    // Agregar sección al contenedor
    container.appendChild(seccionDobles);
    
    // Actualizar selectores (deshabilitar partidos duplicados en el mismo usuario)
    actualizarSelectoresDobles(usuario);
    
    console.log('Sección de dobles mostrada');
}

/**
 * Guarda los dobles del usuario en la estructura de datos
 * @param {string} usuarioActual - Nombre del usuario actual
 */
function guardarDobles(usuarioActual) {
    console.log(`Guardando dobles para usuario: ${usuarioActual}`);
    
    const dobleDelUsuario = obtenerDobleDelUsuario(usuarioActual);
    
    // Si no existe objeto dobles para este usuario, no guardar
    if (!dobleDelUsuario) {
        console.log(`${usuarioActual} no tiene dobles configurados, omitiendo guardado de dobles`);
        return;
    }
    
    const seccionDobles = document.getElementById('seccionDobles');
    if (!seccionDobles) {
        console.log('No hay sección de dobles en la página');
        return;
    }
    
    // Recopilar selecciones de dobles
    const filasDobles = seccionDobles.querySelectorAll('.fila-doble');
    const nuevosPronosticos = [];
    
    filasDobles.forEach((fila, indice) => {
        const selectPartido = fila.querySelector('.selector-partido-doble');
        const botoneSeleccionados = fila.querySelectorAll('.btn-doble.seleccionado');
        
        const partido = selectPartido.value;
        
        // Obtener opciones seleccionadas (máximo 2, en orden de selección)
        let pronostico = '';
        botoneSeleccionados.forEach(btn => {
            pronostico += btn.getAttribute('data-opcion');
        });
        
        nuevosPronosticos.push({
            partido: partido,
            pronostico: pronostico
        });
        
        console.log(`Doble ${indice}: partido="${partido}", pronostico="${pronostico}"`);
    });
    
    // Actualizar el objeto dobles del usuario
    const indiceDoble = quinielaData.dobles.findIndex(d => d.usuario === usuarioActual);
    if (indiceDoble !== -1) {
        quinielaData.dobles[indiceDoble].pronosticos = nuevosPronosticos;
        console.log(`Dobles actualizados para ${usuarioActual}`);
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

    // Guardar dobles antes de guardar en JSONBin
    guardarDobles(usuarioActual);
    
    // Guardar en JSONBin
    const success = await saveData();
    if (success) {
        console.log(`Pronósticos guardados exitosamente para ${usuarioActual}: "${pronosticoString}"`);
        
        // Calcular y actualizar pronóstico definitivo
        const pronosticoDefinitivoCalculado = calcularPronosticoDefinitivo();
        quinielaData.pronostico_definitivo = pronosticoDefinitivoCalculado;
        
        // Guardar pronóstico definitivo en JSONBin
        await saveData();
        
        // Mostrar resultados
        mostrarResultados();
        
        alert(`Pronósticos y dobles guardados para ${usuarioActual}`);

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

    // Cargar configuración primero
    const configLoaded = await loadConfig();
    if (!configLoaded) {
        console.error('No se pudo cargar la configuración');
        return;
    }

    // Cargar datos al iniciar la aplicación
    console.log('Cargando datos de la quiniela...');
    const success = await loadData();
    if (success) {
        // Crear selector de usuarios con los datos cargados
        crearSelectUsuarios();
        // Crear tabla de partidos (oculta inicialmente)
        crearTablaPartidos();
        
        // Mostrar resultados si existen pronósticos
        mostrarResultados();
        
        // Mostrar histórico si existe
        mostrarHistorico();
        
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