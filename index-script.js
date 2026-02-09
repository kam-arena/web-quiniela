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
        // Aquí podrás agregar lógica adicional cuando se seleccione un usuario
    });
}

// Listeners
document.addEventListener('DOMContentLoaded', async () => {

    // Cargar datos al iniciar la aplicación
    console.log('Cargando datos de la quiniela...');
    const success = await loadData();
    if (success) {
        // Crear selector de usuarios con los datos cargados
        crearSelectUsuarios();
    }
    
});