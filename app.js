// CONFIGURACIÓN
const CODIGOS_VALIDOS = {
    'EPITHE-001': true,
    'EPITHE-002': true,
    'EPITHE-003': true,
    'NANO': true
};

const URL_DATOS = 'https://raw.githubusercontent.com/nanorsf/vademecum-epithelium/main/';

let productos = [];
let productosFiltrados = [];
let soloNuevos = false;
let materiasPrimas = [];
let materiasPrimasFiltradas = [];

// Inicializar app
document.addEventListener('DOMContentLoaded', async () => {
    await cargarDatos();
    verificarAcceso();
});

// CARGAR DATOS
// Primero se busca el archivo en el mismo sitio de la app; si falla, en GitHub
async function descargarJSON(archivo) {
    const fuentes = [archivo, URL_DATOS + archivo];
    for (const url of fuentes) {
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const datos = await response.json();
            if (Array.isArray(datos) && datos.length > 0) return datos;
        } catch (error) {
            console.warn(`No se pudo cargar ${url}:`, error);
        }
    }
    return [];
}

async function cargarDatos() {
    productos = await descargarJSON('data.json');
    productos.forEach(p => {
        p['Categoría del Producto'] = (p['Categoría del Producto'] || '').replace(/^Magistral de Pedido\s*\/\s*/, '');
    });
    console.log(`✅ ${productos.length} productos cargados`);
    materiasPrimas = await descargarJSON('materias-primas.json');
    console.log(`✅ ${materiasPrimas.length} materias primas cargadas`);
}

async function reintentarCarga() {
    await cargarDatos();
    entrarApp();
}

// VERIFICAR ACCESO
function verificarAcceso() {
    const codigoGuardado = localStorage.getItem('vademecum_access');
    if (codigoGuardado && CODIGOS_VALIDOS[codigoGuardado]) {
        entrarApp();
    } else {
        mostrarPantalla('loginScreen');
        localStorage.removeItem('vademecum_access');
    }
}

function verificarCodigo() {
    const codigo = document.getElementById('accessCode').value.trim().toUpperCase();
    const errorMsg = document.getElementById('errorMsg');
    if (!codigo) {
        errorMsg.textContent = 'Ingresa un código';
        return;
    }
    if (CODIGOS_VALIDOS[codigo]) {
        localStorage.setItem('vademecum_access', codigo);
        localStorage.setItem('vademecum_timestamp', new Date().toISOString());
        errorMsg.textContent = '';
        entrarApp();
    } else {
        errorMsg.textContent = '❌ Código inválido o expirado';
        document.getElementById('accessCode').value = '';
    }
}

function cerrarSesion() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('vademecum_access');
        localStorage.removeItem('vademecum_timestamp');
        mostrarPantalla('loginScreen');
        document.getElementById('accessCode').value = '';
        document.getElementById('errorMsg').textContent = '';
    }
}

function entrarApp() {
    inicializarFiltros();
    cargarTodos();
    inicializarFiltrosMP();
    filtrarMP();
    irInicio();
}

function irInicio() {
    mostrarPantalla('homeScreen');
}

function abrirProductos() {
    mostrarPantalla('mainScreen');
}

function abrirMateriasPrimas() {
    mostrarPantalla('mpScreen');
}

function mostrarPantalla(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function inicializarFiltros() {
    if (productos.length === 0) return;
    const categorias = [...new Set(productos.map(p => p['Categoría del Producto']).filter(p => p))];
    const formas = [...new Set(productos.map(p => p['Forma Farmacéutica']).filter(p => p))];
    const selectCategory = document.getElementById('filterCategory');
    const selectFormula = document.getElementById('filterFormula');
    selectCategory.length = 1;
    selectFormula.length = 1;
    categorias.forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = c;
        selectCategory.appendChild(option);
    });
    formas.forEach(f => {
        const option = document.createElement('option');
        option.value = f;
        option.textContent = f;
        selectFormula.appendChild(option);
    });
}

function cargarTodos() {
    filtrar();
}

function toggleNuevo() {
    soloNuevos = !soloNuevos;
    document.getElementById('btnNuevo').classList.toggle('active', soloNuevos);
    document.getElementById('mainScreen').classList.toggle('modo-nuevo', soloNuevos);
    filtrar();
}

function filtrar() {
    const searchName = document.getElementById('searchName').value.toLowerCase();
    const searchComponents = document.getElementById('searchComponents').value.toLowerCase();
    const filterCategory = document.getElementById('filterCategory').value;
    const filterFormula = document.getElementById('filterFormula').value;
    productosFiltrados = productos.filter(p => {
        const matchName = p['Nombre'].toLowerCase().includes(searchName);
        const matchComponents = !searchComponents || (p['Componentes'] && p['Componentes'].toLowerCase().includes(searchComponents));
        const matchCategory = !filterCategory || p['Categoría del Producto'] === filterCategory;
        const matchFormula = !filterFormula || p['Forma Farmacéutica'] === filterFormula;
        const matchNuevo = !soloNuevos || p['Etiquetas de producto'] === 'Nuevo';
        return matchName && matchComponents && matchCategory && matchFormula && matchNuevo;
    });
    mostrarResultados();
}

function mostrarResultados() {
    const container = document.getElementById('resultados');
    container.innerHTML = '';
    if (productos.length === 0) {
        container.innerHTML = '<div class="no-results">No se pudieron cargar los datos. Revisa tu conexión a internet.<br><button class="btn-nuevo" style="margin-top:15px" onclick="reintentarCarga()">Reintentar</button></div>';
        return;
    }
    if (productosFiltrados.length === 0) {
        container.innerHTML = '<div class="no-results">No se encontraron productos</div>';
        return;
    }
    if (soloNuevos) {
        container.innerHTML = `<div class="aviso-nuevo">✨ Estás viendo lo nuevo · ${productosFiltrados.length} ${productosFiltrados.length === 1 ? 'producto' : 'productos'}</div>`;
    }
    productosFiltrados.forEach(p => {
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.onclick = () => mostrarDetalle(p);
        card.innerHTML = `<h3>${p['Nombre']}${p['Etiquetas de producto'] === 'Nuevo' ? '<span class="badge-nuevo">NUEVO</span>' : ''}</h3><p><strong>Componentes:</strong> ${p['Componentes']}</p><p><strong>Forma:</strong> ${p['Forma Farmacéutica']}</p><p><strong>Categoría:</strong> ${p['Categoría del Producto']}</p>${p['Indicación'] ? `<p style="font-size: 12px; color: #999; margin-top: 8px;">${p['Indicación'].substring(0, 100)}...</p>` : ''}`;
        container.appendChild(card);
    });
}

function temaModal(tema) {
    const box = document.querySelector('#modalDetail .modal-content');
    box.classList.remove('theme-mp', 'theme-nuevo');
    if (tema) box.classList.add(tema);
}

function mostrarDetalle(producto) {
    temaModal(producto['Etiquetas de producto'] === 'Nuevo' ? 'theme-nuevo' : '');
    const modal = document.getElementById('modalDetail');
    const content = document.getElementById('detailContent');
    content.innerHTML = `<h2>${producto['Nombre']}</h2>${producto['Componentes'] ? `<strong>Componentes</strong><p>${producto['Componentes'].replace(/\n/g, '<br>')}</p>` : ''}<strong>Especificaciones</strong><p><strong>Categoría:</strong> ${producto['Categoría del Producto']}<br><strong>Forma:</strong> ${producto['Forma Farmacéutica']}<br><strong>Presentación:</strong> ${producto['Presentación Farmacéutica']}<br><strong>Tamaño:</strong> ${producto['Tamaño']} ${producto['Masa']}</p>${producto['Indicación'] ? `<strong>Indicación</strong><p>${producto['Indicación'].replace(/\n/g, '<br>')}</p>` : ''}${producto['Dosis Recomendada'] ? `<strong>Dosis Recomendada</strong><p>${producto['Dosis Recomendada'].replace(/\n/g, '<br>')}</p>` : ''}<strong>Referencia Interna</strong><p>${producto['Referencia Interna']}</p>${producto['Etiquetas de producto'] ? `<strong>Categorías</strong><p><span class="producto-label">${producto['Etiquetas de producto']}</span></p>` : ''}`;
    modal.classList.add('active');
}

// MATERIAS PRIMAS
function inicializarFiltrosMP() {
    const select = document.getElementById('mpFilterEtiqueta');
    select.length = 1;
    const etiquetas = [...new Set(materiasPrimas.map(m => m['Etiqueta de Materia Prima']).filter(e => e))].sort();
    etiquetas.forEach(e => {
        const option = document.createElement('option');
        option.value = e;
        option.textContent = e;
        select.appendChild(option);
    });
}

function filtrarMP() {
    const searchName = document.getElementById('mpSearchName').value.toLowerCase();
    const searchUso = document.getElementById('mpSearchUso').value.toLowerCase();
    const filterEtiqueta = document.getElementById('mpFilterEtiqueta').value;
    materiasPrimasFiltradas = materiasPrimas.filter(m => {
        const matchName = m['Nombre'].toLowerCase().includes(searchName);
        const textoUso = (m['Uso Terapéutico y Cosmético'] + ' ' + m['Identificación Técnica']).toLowerCase();
        const matchUso = !searchUso || textoUso.includes(searchUso);
        const matchEtiqueta = !filterEtiqueta || m['Etiqueta de Materia Prima'] === filterEtiqueta;
        return matchName && matchUso && matchEtiqueta;
    });
    mostrarResultadosMP();
}

function mostrarResultadosMP() {
    const container = document.getElementById('mpResultados');
    container.innerHTML = '';
    if (materiasPrimas.length === 0) {
        container.innerHTML = '<div class="no-results">No se pudieron cargar los datos. Revisa tu conexión a internet.<br><button class="btn-nuevo" style="margin-top:15px" onclick="reintentarCarga()">Reintentar</button></div>';
        return;
    }
    if (materiasPrimasFiltradas.length === 0) {
        container.innerHTML = '<div class="no-results">No se encontraron materias primas</div>';
        return;
    }
    materiasPrimasFiltradas.forEach(m => {
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.onclick = () => mostrarDetalleMP(m);
        const uso = m['Uso Terapéutico y Cosmético'];
        card.innerHTML = `<h3>${m['Nombre']}</h3><p><strong>Etiqueta:</strong> ${m['Etiqueta de Materia Prima']}</p>${m['Concentración de Uso'] ? `<p><strong>Concentración:</strong> ${m['Concentración de Uso'].split('\n')[0]}</p>` : ''}${uso ? `<p style="font-size: 12px; color: #999; margin-top: 8px;">${uso.length > 100 ? uso.substring(0, 100) + '...' : uso}</p>` : ''}`;
        container.appendChild(card);
    });
}

function mostrarDetalleMP(m) {
    temaModal('theme-mp');
    const modal = document.getElementById('modalDetail');
    const content = document.getElementById('detailContent');
    const bloque = (titulo, texto) => texto ? `<strong>${titulo}</strong><p>${texto.replace(/\n/g, '<br>')}</p>` : '';
    content.innerHTML = `<h2>${m['Nombre']}</h2>${bloque('Identificación Técnica', m['Identificación Técnica'])}${bloque('Uso Terapéutico y Cosmético', m['Uso Terapéutico y Cosmético'])}${bloque('Concentración de Uso', m['Concentración de Uso'])}${bloque('Referencia Interna', m['Referencia Interna'])}${m['Etiqueta de Materia Prima'] ? `<strong>Etiqueta</strong><p><span class="producto-label">${m['Etiqueta de Materia Prima']}</span></p>` : ''}`;
    modal.classList.add('active');
}

function cerrarModal() {
    document.getElementById('modalDetail').classList.remove('active');
}

window.onclick = function(event) {
    const modal = document.getElementById('modalDetail');
    if (event.target === modal) {
        modal.classList.remove('active');
    }
}
