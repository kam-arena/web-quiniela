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
 * Actualiza el estado del botón según el contenido del textarea
 */
function actualizarEstadoBotones() {
    const textarea = document.getElementById('textareaPartidos');
    const btnModificar = document.getElementById('btnModificarJornada');
    
    const tieneContenido = textarea.value.trim().length > 0;
    btnModificar.disabled = !tieneContenido;
}

/**
 * Resetea la jornada con partidos genéricos
 */
async function resetearJornada() {
    console.log('Reseteando jornada...');
    
    // Resetear datos
    quinielaData.fecha_inicio_quiniela = obtenerFechaActual();
    quinielaData.pronosticos = [];
    quinielaData.pronostico_definitivo = '';
    
    // Generar partidos genéricos (15 partidos)
    const partidosGenericos = [];
    for (let i = 1; i <= 15; i++) {
        const equipoLocal = i * 2 - 1;
        const equipoVisitante = i * 2;
        partidosGenericos.push(`Equipo${equipoLocal} vs Equipo${equipoVisitante}`);
    }
    quinielaData.partidos_jornada = partidosGenericos;
    
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
    console.log('Partidos genéricos creados:', partidosGenericos);
    
    // Guardar datos
    const exito = await saveData();
    
    if (exito) {
        console.log('Nueva jornada guardada correctamente');
        return true;
    } else {
        console.error('Error al guardar la nueva jornada');
        return false;
    }
}

/**
 * Procesa la modificación de equipos de la jornada actual
 */
async function modificarJornada() {
    console.log('Procesando modificación de equipos...');

    const textarea = document.getElementById('textareaPartidos');
    const partidosValidos = validarPartidos(textarea.value);

    if (!partidosValidos) {
        return;
    }

    // Actualizar solo partidos (NO resetea nada más)
    quinielaData.partidos_jornada = partidosValidos;
    console.log('Actualizando solo los equipos de la jornada actual...');

    // Cambiar texto del botón y deshabilitar
    const btnModificar = document.getElementById('btnModificarJornada');
    const textoOriginal = btnModificar.textContent;
    btnModificar.textContent = 'Guardando...';
    btnModificar.disabled = true;

    // Guardar datos
    const exito = await saveData();

    // Restaurar botón
    btnModificar.textContent = textoOriginal;
    actualizarEstadoBotones();

    if (exito) {
        alert('Equipos actualizados correctamente.');
        textarea.value = ''; // Limpiar textarea
        actualizarEstadoBotones();
    }
}

/**
 * Renderiza la lista de usuarios en la UI
 */
function renderizarListaUsuarios() {
    console.log('Renderizando lista de usuarios...');
    
    const listaUsuarios = document.getElementById('listaUsuarios');
    
    // Limpiar lista
    listaUsuarios.innerHTML = '';
    
    // Añadir usuarios
    if (quinielaData.usuarios && quinielaData.usuarios.length > 0) {
        quinielaData.usuarios.forEach(usuario => {
            // Crear elemento de lista con botón de eliminar
            const li = document.createElement('li');
            li.classList.add('usuario-item');
            
            // Contenedor con flexbox
            const spanNombre = document.createElement('span');
            spanNombre.classList.add('usuario-nombre');
            spanNombre.textContent = usuario;
            
            const btnEliminar = document.createElement('button');
            btnEliminar.classList.add('btn-eliminar-usuario');
            btnEliminar.textContent = '✕';
            btnEliminar.setAttribute('data-usuario', usuario);
            btnEliminar.setAttribute('title', `Eliminar usuario ${usuario}`);
            
            li.appendChild(spanNombre);
            li.appendChild(btnEliminar);
            listaUsuarios.appendChild(li);
        });
        console.log(`${quinielaData.usuarios.length} usuarios renderizados`);
    } else {
        const li = document.createElement('li');
        li.textContent = 'No hay usuarios registrados';
        li.style.fontStyle = 'italic';
        li.style.color = '#6c757d';
        listaUsuarios.appendChild(li);
        console.log('No hay usuarios para mostrar');
    }
    
    // Actualizar estado de botones
    actualizarEstadoBotonesUsuarios();
}

/**
 * Actualiza el estado de los botones de gestión de usuarios
 */
function actualizarEstadoBotonesUsuarios() {
    const inputNuevo = document.getElementById('inputNuevoUsuario');
    const btnAñadir = document.getElementById('btnAñadirUsuario');
    
    // Habilitar botón añadir solo si hay texto en el input
    btnAñadir.disabled = inputNuevo.value.trim().length === 0;
}

/**
 * Añade un nuevo usuario
 */
async function añadirUsuario() {
    const inputNuevo = document.getElementById('inputNuevoUsuario');
    const nombreUsuario = inputNuevo.value.trim();
    
    if (!nombreUsuario) {
        alert('Por favor, introduce un nombre de usuario.');
        return;
    }
    
    // Verificar si el usuario ya existe
    if (quinielaData.usuarios.includes(nombreUsuario)) {
        alert(`El usuario "${nombreUsuario}" ya existe.`);
        return;
    }
    
    console.log(`Añadiendo usuario: ${nombreUsuario}`);
    
    // Añadir usuario al array
    quinielaData.usuarios.push(nombreUsuario);
    
    // Cambiar texto del botón y deshabilitar
    const btnAñadir = document.getElementById('btnAñadirUsuario');
    const textoOriginal = btnAñadir.textContent;
    btnAñadir.textContent = 'Guardando...';
    btnAñadir.disabled = true;
    
    // Guardar datos
    const exito = await saveData();
    
    // Restaurar botón
    btnAñadir.textContent = textoOriginal;
    
    if (exito) {
        alert(`Usuario "${nombreUsuario}" añadido correctamente.`);
        inputNuevo.value = ''; // Limpiar input
        renderizarListaUsuarios(); // Re-renderizar lista
    } else {
        // Si falla, revertir el cambio
        quinielaData.usuarios = quinielaData.usuarios.filter(u => u !== nombreUsuario);
        actualizarEstadoBotonesUsuarios();
    }
}

/**
 * Elimina un usuario existente
 * @param {string} nombreUsuario - Nombre del usuario a eliminar
 */
async function eliminarUsuario(nombreUsuario) {
    if (!nombreUsuario) {
        alert('Por favor, selecciona un usuario para eliminar.');
        return;
    }
    
    // Confirmar eliminación
    const confirmacion = confirm(`¿Estás seguro de que quieres eliminar al usuario "${nombreUsuario}"?\n\nSe eliminarán también todos sus pronósticos y dobles.`);
    
    if (!confirmacion) {
        console.log('Eliminación de usuario cancelada');
        return;
    }
    
    console.log(`Eliminando usuario: ${nombreUsuario}`);
    
    // Eliminar usuario del array
    quinielaData.usuarios = quinielaData.usuarios.filter(u => u !== nombreUsuario);
    
    // Eliminar pronósticos del usuario
    if (quinielaData.pronosticos && Array.isArray(quinielaData.pronosticos)) {
        const pronosticosOriginales = quinielaData.pronosticos.length;
        quinielaData.pronosticos = quinielaData.pronosticos.filter(p => p.usuario !== nombreUsuario);
        const pronosticosEliminados = pronosticosOriginales - quinielaData.pronosticos.length;
        if (pronosticosEliminados > 0) {
            console.log(`${pronosticosEliminados} pronóstico(s) eliminado(s)`);
        }
    }
    
    // Eliminar dobles del usuario
    if (quinielaData.dobles && Array.isArray(quinielaData.dobles)) {
        const doblesOriginales = quinielaData.dobles.length;
        quinielaData.dobles = quinielaData.dobles.filter(d => d.usuario !== nombreUsuario);
        const doblesEliminados = doblesOriginales - quinielaData.dobles.length;
        if (doblesEliminados > 0) {
            console.log(`${doblesEliminados} doble(s) eliminado(s)`);
        }
    }
    
    // Guardar datos
    const exito = await saveData();
    
    if (exito) {
        alert(`Usuario "${nombreUsuario}" eliminado correctamente.`);
        renderizarListaUsuarios(); // Re-renderizar lista
    } else {
        // Si falla, se podría considerar revertir pero es complejo, mejor solo avisar
        alert('Error: No se pudo guardar la eliminación. Recarga la página.');
        actualizarEstadoBotonesUsuarios();
    }
}

/* ============================================ */
/* FUNCIONES DE RESULTADOS */
/* ============================================ */

/**
 * Valida el formato del resultado introducido
 * @param {string} resultado - Cadena de 16 caracteres
 * @returns {boolean} - true si es válido, false si no
 */
function validarFormatoResultados(resultado) {
    console.log('Validando formato de resultado:', resultado);
    
    // Verificar longitud
    if (resultado.length !== 16) {
        alert(`Error: El resultado debe tener exactamente 16 caracteres. Tiene ${resultado.length}.`);
        return false;
    }
    
    // Validar primeros 14 caracteres (partidos 1-14): deben ser 1, X o 2
    for (let i = 0; i < 14; i++) {
        const char = resultado[i];
        if (char !== '1' && char !== 'X' && char !== '2') {
            alert(`Error: El carácter en la posición ${i + 1} debe ser 1, X o 2. Encontrado: '${char}'`);
            return false;
        }
    }
    
    // Validar últimos 2 caracteres (partido 15): deben ser 0, 1, 2 o M
    for (let i = 14; i < 16; i++) {
        const char = resultado[i];
        if (char !== '0' && char !== '1' && char !== '2' && char !== 'M') {
            alert(`Error: El carácter en la posición ${i + 1} debe ser 0, 1, 2 o M. Encontrado: '${char}'`);
            return false;
        }
    }
    
    console.log('Formato de resultado válido');
    return true;
}

/**
 * Calcula los aciertos totales comparando con pronostico_definitivo
 * Considera dobles y partido 15
 * @param {string} resultado - Resultado introducido por el usuario
 * @returns {number} - Número de aciertos (0-15)
 */
function calcularAciertosDefinitivo(resultado) {
    console.log('Calculando aciertos del pronóstico definitivo...');
    const pronosticoDefinitivo = quinielaData.pronostico_definitivo;
    
    if (!pronosticoDefinitivo || pronosticoDefinitivo.length !== 16) {
        console.log('Pronóstico definitivo no disponible o inválido');
        return 0;
    }
    
    let aciertos = 0;
    
    // Comprobar partidos 1-14
    for (let i = 0; i < 14; i++) {
        const caracterResultado = resultado[i];
        let caracterDefinitivo = pronosticoDefinitivo[i];
        
        // Verificar si hay un doble para este partido
        let tieneDoble = false;
        for (const dobleEntry of quinielaData.dobles) {
            for (const pronosticoDoble of dobleEntry.pronosticos) {
                // El partido en dobles puede ser nombre o índice (0-based)
                const partidoIndex = parseInt(pronosticoDoble.partido);
                if (partidoIndex === i && pronosticoDoble.pronostico && pronosticoDoble.pronostico.length === 2) {
                    // Hay un doble para este partido
                    tieneDoble = true;
                    const char1 = pronosticoDoble.pronostico[0];
                    const char2 = pronosticoDoble.pronostico[1];
                    if (caracterResultado === char1 || caracterResultado === char2) {
                        aciertos++;
                        console.log(`Partido ${i + 1}: Acierto con doble (${char1}/${char2})`);
                    }
                    break;
                }
            }
            if (tieneDoble) break;
        }
        
        // Si no hay doble, comparar normalmente
        if (!tieneDoble) {
            if (caracterResultado === caracterDefinitivo) {
                aciertos++;
                console.log(`Partido ${i + 1}: Acierto`);
            }
        }
    }
    
    // Comprobar partido 15 (últimos 2 caracteres deben coincidir exactamente)
    const resultadoP15 = resultado.substring(14, 16);
    const definitivoP15 = pronosticoDefinitivo.substring(14, 16);
    if (resultadoP15 === definitivoP15) {
        aciertos++;
        console.log('Partido 15: Acierto');
    }
    
    console.log(`Total de aciertos del pronóstico definitivo: ${aciertos}`);
    return aciertos;
}

/**
 * Calcula los aciertos de cada usuario
 * @param {string} resultado - Resultado introducido
 * @returns {Object} - Objeto con {usuario: aciertos}
 */
function calcularAciertosPorUsuario(resultado) {
    console.log('Calculando aciertos por usuario...');
    const aciertosPorUsuario = {};
    
    for (const pronosticoEntry of quinielaData.pronosticos) {
        const usuario = pronosticoEntry.usuario;
        const pronosticoUsuario = pronosticoEntry.pronostico;
        
        if (!pronosticoUsuario || pronosticoUsuario.length !== 16) {
            console.log(`Usuario ${usuario}: pronóstico inválido o vacío`);
            aciertosPorUsuario[usuario] = 0;
            continue;
        }
        
        let aciertos = 0;
        
        // Comprobar partidos 1-14
        for (let i = 0; i < 14; i++) {
            if (resultado[i] === pronosticoUsuario[i]) {
                aciertos++;
            }
        }
        
        // Comprobar partido 15 (últimos 2 caracteres)
        if (resultado.substring(14, 16) === pronosticoUsuario.substring(14, 16)) {
            aciertos++;
        }
        
        aciertosPorUsuario[usuario] = aciertos;
        console.log(`Usuario ${usuario}: ${aciertos} aciertos`);
    }
    
    return aciertosPorUsuario;
}

/**
 * Asigna dobles según los aciertos
 * 1º: 2 dobles, 2º: 1 doble, 3º: 1 doble
 * En caso de empate, se decide aleatoriamente
 * @param {Object} aciertosPorUsuario - Objeto {usuario: aciertos}
 * @returns {Array} - Array con estructura de dobles
 */
function asignarDobles(aciertosPorUsuario) {
    console.log('Asignando dobles...');
    
    // Convertir a array y ordenar por aciertos
    const usuariosOrdenados = Object.entries(aciertosPorUsuario)
        .map(([usuario, aciertos]) => ({ usuario, aciertos }));
    
    // Agrupar usuarios por número de aciertos
    const gruposPorAciertos = {};
    for (const entry of usuariosOrdenados) {
        if (!gruposPorAciertos[entry.aciertos]) {
            gruposPorAciertos[entry.aciertos] = [];
        }
        gruposPorAciertos[entry.aciertos].push(entry.usuario);
    }
    
    // Ordenar grupos por aciertos descendente
    const aciertoUnicos = Object.keys(gruposPorAciertos)
        .map(Number)
        .sort((a, b) => b - a);
    
    // Crear lista ordenada con desempate aleatorio
    const usuariosFinales = [];
    for (const acierto of aciertoUnicos) {
        const grupo = gruposPorAciertos[acierto];
        // Mezclar aleatoriamente dentro del grupo
        const grupoMezclado = grupo.sort(() => Math.random() - 0.5);
        usuariosFinales.push(...grupoMezclado);
    }
    
    console.log('Orden final de usuarios:', usuariosFinales);
    
    // Asignar dobles: 1º = 2 dobles, 2º = 1 doble, 3º = 1 doble
    const doblesAsignados = [];
    
    if (usuariosFinales.length >= 1) {
        doblesAsignados.push({
            usuario: usuariosFinales[0],
            pronosticos: [
                { partido: '', pronostico: '' },
                { partido: '', pronostico: '' }
            ]
        });
        console.log(`${usuariosFinales[0]}: 2 dobles`);
    }
    
    if (usuariosFinales.length >= 2) {
        doblesAsignados.push({
            usuario: usuariosFinales[1],
            pronosticos: [
                { partido: '', pronostico: '' }
            ]
        });
        console.log(`${usuariosFinales[1]}: 1 doble`);
    }
    
    if (usuariosFinales.length >= 3) {
        doblesAsignados.push({
            usuario: usuariosFinales[2],
            pronosticos: [
                { partido: '', pronostico: '' }
            ]
        });
        console.log(`${usuariosFinales[2]}: 1 doble`);
    }
    
    return doblesAsignados;
}

/**
 * Muestra los resultados calculados en el DOM
 * @param {number} aciertosTotal - Aciertos del pronóstico definitivo
 * @param {Object} aciertosPorUsuario - Objeto {usuario: aciertos}
 * @param {Array} doblesAsignados - Array con dobles asignados
 */
function mostrarResultadosCalculados(aciertosTotal, aciertosPorUsuario, doblesAsignados) {
    console.log('Mostrando resultados calculados...');
    const displayResultados = document.getElementById('displayResultados');
    
    // Ordenar usuarios por aciertos (descendente)
    const usuariosOrdenados = Object.entries(aciertosPorUsuario)
        .sort(([, a], [, b]) => b - a);
    
    // Construir HTML con formato tabulado
    let html = '<div class="resultado-seccion">';
    html += '<div class="linea-resultado-admin">';
    html += '<span class="nombre-resultado">Aciertos</span>';
    html += '<span class="puntos-resultado"></span>';
    html += `<span class="valor-resultado-admin">${aciertosTotal}</span>`;
    html += '</div>';
    html += '</div>';
    
    html += '<div class="resultado-seccion">';
    html += '<div class="titulo-seccion-resultado">Aciertos por usuario:</div>';
    for (const [usuario, aciertos] of usuariosOrdenados) {
        html += '<div class="linea-resultado-admin linea-indentada">';
        html += `<span class="nombre-resultado">${usuario}</span>`;
        html += '<span class="puntos-resultado"></span>';
        html += `<span class="valor-resultado-admin">${aciertos}</span>`;
        html += '</div>';
    }
    html += '</div>';
    
    html += '<div class="resultado-seccion">';
    html += '<div class="titulo-seccion-resultado">Reparto de dobles:</div>';
    for (const dobleEntry of doblesAsignados) {
        const numDobles = dobleEntry.pronosticos.length;
        html += '<div class="linea-resultado-admin linea-indentada">';
        html += `<span class="nombre-resultado">${dobleEntry.usuario}</span>`;
        html += '<span class="puntos-resultado"></span>';
        html += `<span class="valor-resultado-admin">${numDobles}</span>`;
        html += '</div>';
    }
    html += '</div>';
    
    displayResultados.innerHTML = html;
    displayResultados.style.display = 'block';
}

/**
 * Procesa los resultados: valida, calcula y guarda
 */
async function procesarResultados() {
    console.log('Procesando resultados...');
    const inputResultados = document.getElementById('inputResultados');
    const btnCalcular = document.getElementById('btnCalcularResultados');
    const resultado = inputResultados.value.trim().toUpperCase();
    
    // Validar formato
    if (!validarFormatoResultados(resultado)) {
        return;
    }
    
    // Deshabilitar botón durante el proceso
    btnCalcular.disabled = true;
    
    try {
        // Calcular aciertos totales del pronóstico definitivo
        const aciertosTotal = calcularAciertosDefinitivo(resultado);
        
        // Calcular aciertos por usuario
        const aciertosPorUsuario = calcularAciertosPorUsuario(resultado);
        
        // Asignar dobles
        const doblesAsignados = asignarDobles(aciertosPorUsuario);
        
        // Actualizar quinielaData con los nuevos dobles
        quinielaData.dobles = doblesAsignados;
        console.log('Estructura de dobles actualizada:', quinielaData.dobles);
        
        // Guardar en JSONBin
        const guardadoExitoso = await saveData();
        
        if (guardadoExitoso) {
            // Mostrar resultados
            mostrarResultadosCalculados(aciertosTotal, aciertosPorUsuario, doblesAsignados);
            
            // Preguntar si quiere iniciar nueva jornada
            const confirmacion = confirm('Se iniciará una nueva jornada con partidos genéricos. ¿Deseas continuar?');
            
            if (confirmacion) {
                const reseteoExitoso = await resetearJornada();
                
                if (reseteoExitoso) {
                    alert('Nueva jornada iniciada correctamente con partidos genéricos.');
                    
                } else {
                    alert('Error al iniciar la nueva jornada.');
                }
            }
            else {
                // Ocultar resultados
                document.getElementById('displayResultados').style.display = 'none';
                // Limpiar input de resultados
                inputResultados.value = '';
            }
        } else {
            alert('Los resultados se calcularon pero hubo un error al guardar');
        }
        
    } catch (error) {
        console.error('Error al procesar resultados:', error);
        alert('Error al procesar los resultados. Verifica la consola.');
    } finally {
        // Rehabilitar botón
        btnCalcular.disabled = false;
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

    // Renderizar lista de usuarios
    renderizarListaUsuarios();

    // El textarea debe estar vacío al cargar (no mostrar partidos actuales)
    const textarea = document.getElementById('textareaPartidos');
    textarea.value = '';

    // Configurar event listener del botón de modificar partidos
    document.getElementById('btnModificarJornada').addEventListener('click', modificarJornada);

    // Configurar event listener del textarea para habilitar/deshabilitar botones
    textarea.addEventListener('input', actualizarEstadoBotones);

    // Estado inicial de botones de partidos (deshabilitados porque textarea está vacío)
    actualizarEstadoBotones();

    // Configurar event listener de la sección de resultados
    document.getElementById('btnCalcularResultados').addEventListener('click', procesarResultados);

    // Configurar event listeners de la sección de usuarios
    document.getElementById('btnAñadirUsuario').addEventListener('click', añadirUsuario);
    document.getElementById('inputNuevoUsuario').addEventListener('input', actualizarEstadoBotonesUsuarios);
    
    // Event delegado para botones de eliminar en la lista
    document.getElementById('listaUsuarios').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar-usuario')) {
            const nombreUsuario = e.target.getAttribute('data-usuario');
            eliminarUsuario(nombreUsuario);
        }
    });

    console.log('Panel de administración listo');
}

// Ejecutar inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializar);
