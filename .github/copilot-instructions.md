# WebQuiniela

## Consideraciones Generales

- El proyecto es una Web para realizar quinielas de fútbol. Estará alojada en Github Pages.
- admin.html es un panel de administración oculto, no debe enlazarse desde index.html, solo se accede escribiendo la URL completa.
- El proyecto se desarrollará con un enfoque mobile-first, asegurando que la experiencia en dispositivos móviles sea óptima desde el inicio.
- Añadir logs de consola para ver las acciones que se estan ejecutando, evitando que se muestren secretos o datos sensibles.

## Estructura del Proyecto

### Tecnologías Base
- **HTML5**: Página web estática
- **CSS3**: Estilos y diseño responsivo
- **JavaScript**: Funcionalidad e interacción
- **Hosting**: GitHub Pages

### Estructura de Archivos
```
WebQuiniela/
├── index.html          # Página principal
├── admin.html          # Panel de administración
├── index-script.js     # Funcionalidad JavaScript de la página principal
├── styles.css          # Estilos personalizados 
└── .github/
    ├── copilot-instructions.md
    └── instructions/
        ├── html-css-style-color-guide.instructions.md
        ├── instructions.instructions.md
        └── markdown.instructions.md
```

## Guías de Estilo

### Tema y Colores
- **Paleta**: Colores frios (azules, grises, verdes suaves)
- **Personalizaciones**: Mínimas, solo ajustes funcionales (no de color)

### HTML/CSS
- Seguir las guías de color en html-css-style-color-guide.instructions.md

### Estructura HTML
- Usar HTML semántico (main, header, section, article, etc.)
- Incluir meta viewport para responsividad móvil
- Usar lang="es" en el html element

### CSS
- Mobile-first approach
- Cascadas lógicas y bien organizadas
