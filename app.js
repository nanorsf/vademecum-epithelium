// CONFIGURACIÓN
const CODIGOS_VALIDOS = {
    'EPITHE-001': true,
    'EPITHE-002': true,
    'EPITHE-003': true,
    'NANO': true
};

const URL_DATOS = 'https://raw.githubusercontent.com/nanorsf/vademecum-epithelium/main/';

let productos = [];
let materiasPrimas = [];
let materiasPrimasFiltradas = [];
let portafolio = [];
let portafolioPropio = [];
let clienteNombre = '';

// Vademécum de productos: el general de Epithelium y el portafolio propio de cada cliente
const CATALOGOS = {
    prod: {
        pantalla: 'mainScreen', tema: '',
        ids: { nombre: 'searchName', componentes: 'searchComponents', categoria: 'filterCategory', forma: 'filterFormula', nuevo: 'btnNuevo', resultados: 'resultados' },
        datos: () => productos, filtrados: [], soloNuevos: false
    },
    port: {
        pantalla: 'portScreen', tema: 'theme-port',
        ids: { nombre: 'pfSearchName', componentes: 'pfSearchComponents', categoria: 'pfFilterCategory', forma: 'pfFilterFormula', nuevo: 'pfBtnNuevo', resultados: 'pfResultados' },
        datos: () => portafolio, filtrados: [], soloNuevos: false
    }
};

// Inicializar app
document.addEventListener('DOMContentLoaded', async () => {
    await cargarDatos();
    verificarAcceso();
});

// CARGAR DATOS
// Primero se busca el archivo en el mismo sitio de la app; si falla, en GitHub
async function descargarJSON(archivo, esValido = d => Array.isArray(d) && d.length > 0) {
    const fuentes = [archivo, URL_DATOS + archivo];
    for (const url of fuentes) {
        try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const datos = await response.json();
            if (esValido(datos)) return datos;
        } catch (error) {
            console.warn(`No se pudo cargar ${url}:`, error);
        }
    }
    return null;
}

async function cargarDatos() {
    productos = await descargarJSON('data.json') || [];
    productos.forEach(p => {
        p['Categoría del Producto'] = (p['Categoría del Producto'] || '').replace(/^Magistral de Pedido\s*\/\s*/, '');
    });
    productos.sort(compararProductos);
    console.log(`✅ ${productos.length} productos cargados`);
    materiasPrimas = await descargarJSON('materias-primas.json') || [];
    console.log(`✅ ${materiasPrimas.length} materias primas cargadas`);
}

async function reintentarCarga() {
    await cargarDatos();
    entrarApp();
}

// ACCESO
// Cada cliente entra con usuario + clave; su portafolio está en portafolios/<huella>.json
async function huellaCliente(usuario, clave) {
    const bytes = new TextEncoder().encode(`${usuario}:${clave}`);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
}

async function cargarPortafolio(huella) {
    const datos = await descargarJSON(`portafolios/${huella}.json`, d => d && Array.isArray(d.productos));
    if (!datos) return false;
    clienteNombre = datos.cliente;
    portafolioPropio = datos.productos;
    return true;
}

async function verificarAcceso() {
    const codigoGuardado = localStorage.getItem('vademecum_access');
    const clienteGuardado = localStorage.getItem('vademecum_cliente');
    if (codigoGuardado && CODIGOS_VALIDOS[codigoGuardado]) {
        entrarApp();
    } else if (clienteGuardado && await cargarPortafolio(clienteGuardado)) {
        entrarApp();
    } else {
        mostrarPantalla('loginScreen');
        localStorage.removeItem('vademecum_access');
        localStorage.removeItem('vademecum_cliente');
    }
}

async function verificarCodigo() {
    const usuario = document.getElementById('accessUser').value.trim().toLowerCase();
    const clave = document.getElementById('accessCode').value.trim();
    const errorMsg = document.getElementById('errorMsg');
    if (!usuario && !clave) {
        errorMsg.textContent = 'Ingresa tu usuario y clave';
        return;
    }
    // Equipo Epithelium: su código de siempre (en la clave o en el usuario)
    const codigo = (clave || usuario).toUpperCase();
    if (CODIGOS_VALIDOS[codigo] && (!usuario || !clave || usuario === 'epithelium')) {
        localStorage.setItem('vademecum_access', codigo);
        localStorage.setItem('vademecum_timestamp', new Date().toISOString());
        errorMsg.textContent = '';
        entrarApp();
        return;
    }
    // Clientes: usuario + clave de dos dígitos
    if (usuario && /^\d{2}$/.test(clave)) {
        errorMsg.textContent = 'Verificando...';
        const huella = await huellaCliente(usuario, clave);
        if (await cargarPortafolio(huella)) {
            localStorage.setItem('vademecum_cliente', huella);
            localStorage.setItem('vademecum_timestamp', new Date().toISOString());
            errorMsg.textContent = '';
            entrarApp();
            return;
        }
    }
    errorMsg.textContent = '❌ Usuario o clave incorrectos';
    document.getElementById('accessCode').value = '';
}

function cerrarSesion() {
    if (confirm('¿Cerrar sesión?')) {
        localStorage.removeItem('vademecum_access');
        localStorage.removeItem('vademecum_cliente');
        localStorage.removeItem('vademecum_timestamp');
        portafolio = [];
        portafolioPropio = [];
        clienteNombre = '';
        mostrarPantalla('loginScreen');
        document.getElementById('accessUser').value = '';
        document.getElementById('accessCode').value = '';
        document.getElementById('errorMsg').textContent = '';
    }
}

// Búsqueda sin distinguir mayúsculas ni tildes
const normalizar = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// Opciones únicas (sin repetir por mayúsculas/tildes) y en orden alfabético
function opcionesUnicas(textos) {
    const mapa = new Map();
    textos.forEach(t => {
        const limpio = t.replace(/\s+/g, ' ').trim();
        if (limpio.length > 1 && !mapa.has(normalizar(limpio))) mapa.set(normalizar(limpio), limpio);
    });
    return [...mapa.values()].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
}

function llenarDatalist(id, valores) {
    const lista = document.getElementById(id);
    lista.innerHTML = '';
    valores.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        lista.appendChild(option);
    });
}

// "Acido Glicolico 12%" -> "Acido Glicolico"
const componentesDe = p => String(p['Componentes'] || '').split(/\+|\n/)
    .map(c => c.replace(/\s+\d[\d.,]*\s*(%|mg|ui)?(\s.*)?$/i, '').trim());

// Usos cortos a partir del texto de "Uso Terapéutico y Cosmético"
const usosDe = m => String(m['Uso Terapéutico y Cosmético'] || '').split(/[,;\n]|\s\/\s/)
    .map(u => u.replace(/\(.*$/, '').replace(/^Función cosmética:\s*/i, '').replace(/[.:]+$/, '').trim())
    .filter(u => u.length > 2 && u.length <= 45)
    .map(u => u.charAt(0).toUpperCase() + u.slice(1));

// Orden alfabético; si el nombre es el mismo (sin el "x 30 ml"), primero el menor volumen
const nombreBase = p => p['Nombre'].replace(/\s+x\s+[\d.,]+\s*[a-zA-Z]*/i, '').trim();
const volumen = p => parseFloat(String(p['Tamaño']).replace(',', '.')) || 0;
function compararProductos(a, b) {
    return nombreBase(a).localeCompare(nombreBase(b), 'es', { sensitivity: 'base', numeric: true })
        || volumen(a) - volumen(b)
        || a['Nombre'].localeCompare(b['Nombre'], 'es', { sensitivity: 'base' });
}

// Mi Portafolio = productos propios del cliente + los nuevos de Epithelium (si ya tiene uno con el mismo nombre, no se repite)
function armarPortafolio() {
    const nombre = p => p['Nombre'].trim().toLowerCase();
    // Nombre del mismo producto (misma referencia) en el vademécum de Epithelium
    const nombreGeneral = new Map(productos.map(p => [p['Referencia Interna'], p['Nombre']]));
    portafolioPropio.forEach(p => {
        const general = nombreGeneral.get(p['Referencia Interna']);
        p.nombreEpithelium = general && general.trim().toLowerCase() !== nombre(p) ? general : '';
    });
    const propios = new Set(portafolioPropio.map(nombre));
    const nuevosEpithelium = productos
        .filter(p => p['Etiquetas de producto'] === 'Nuevo' && !propios.has(nombre(p)))
        .map(p => ({ ...p, nuevoEpithelium: true }));
    // Primero los productos propios del cliente y al final los nuevos de Epithelium, cada grupo en orden
    portafolio = [...[...portafolioPropio].sort(compararProductos), ...nuevosEpithelium.sort(compararProductos)];
}

function entrarApp() {
    armarPortafolio();
    Object.keys(CATALOGOS).forEach(k => {
        const cat = CATALOGOS[k];
        cat.soloNuevos = false;
        document.getElementById(cat.ids.nuevo).classList.remove('active');
        document.getElementById(cat.pantalla).classList.remove('modo-nuevo');
        inicializarFiltros(k);
        filtrar(k);
    });
    inicializarFiltrosMP();
    filtrarMP();
    const esCliente = portafolioPropio.length > 0;
    const totalNuevos = productos.filter(p => p['Etiquetas de producto'] === 'Nuevo').length;
    document.getElementById('loNuevoTexto').textContent = `${totalNuevos} productos nuevos de Epithelium`;
    document.getElementById('btnPortafolio').style.display = esCliente ? '' : 'none';
    const intro = document.getElementById('homeIntro');
    intro.textContent = '¿Qué quieres consultar?';
    if (esCliente) {
        const saludo = document.createElement('span');
        saludo.className = 'home-saludo';
        saludo.textContent = `Hola, ${clienteNombre}`;
        intro.prepend(saludo);
    }
    irInicio();
}

function irInicio() {
    mostrarPantalla('homeScreen');
}

function abrirProductos() {
    ponerNuevo('prod', false);
    mostrarPantalla('mainScreen');
}

function abrirLoNuevo() {
    ponerNuevo('prod', true);
    mostrarPantalla('mainScreen');
}

function abrirPortafolio() {
    mostrarPantalla('portScreen');
}

function abrirMateriasPrimas() {
    mostrarPantalla('mpScreen');
}

function mostrarPantalla(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function llenarSelect(select, valores) {
    select.length = 1;
    valores.forEach(v => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = v;
        select.appendChild(option);
    });
}

function inicializarFiltros(k = 'prod') {
    const cat = CATALOGOS[k];
    const datos = cat.datos();
    const categorias = [...new Set(datos.map(p => p['Categoría del Producto']).filter(p => p))];
    const formas = [...new Set(datos.map(p => p['Forma Farmacéutica']).filter(p => p))];
    if (k === 'port') {
        categorias.sort();
        formas.sort();
    }
    llenarSelect(document.getElementById(cat.ids.categoria), categorias);
    llenarDatalist(k === 'port' ? 'pfDlComponentes' : 'dlComponentes', opcionesUnicas(datos.flatMap(componentesDe)));
    llenarSelect(document.getElementById(cat.ids.forma), formas);
}

function ponerNuevo(k, activo) {
    const cat = CATALOGOS[k];
    cat.soloNuevos = activo;
    document.getElementById(cat.ids.nuevo).classList.toggle('active', activo);
    document.getElementById(cat.pantalla).classList.toggle('modo-nuevo', activo);
    filtrar(k);
}

function toggleNuevo(k = 'prod') {
    ponerNuevo(k, !CATALOGOS[k].soloNuevos);
}

function filtrar(k = 'prod') {
    const cat = CATALOGOS[k];
    const valor = campo => document.getElementById(cat.ids[campo]).value;
    const searchName = normalizar(valor('nombre'));
    const searchComponents = normalizar(valor('componentes'));
    const filterCategory = valor('categoria');
    const filterFormula = valor('forma');
    cat.filtrados = cat.datos().filter(p => {
        const matchName = normalizar(p['Nombre']).includes(searchName) || normalizar(p.nombreEpithelium).includes(searchName);
        const matchComponents = !searchComponents || normalizar(p['Componentes']).includes(searchComponents);
        const matchCategory = !filterCategory || p['Categoría del Producto'] === filterCategory;
        const matchFormula = !filterFormula || p['Forma Farmacéutica'] === filterFormula;
        const matchNuevo = !cat.soloNuevos || p['Etiquetas de producto'] === 'Nuevo';
        return matchName && matchComponents && matchCategory && matchFormula && matchNuevo;
    });
    mostrarResultados(k);
}

// Nombre del mismo producto en Epithelium, marcado con el símbolo del logo
const lineaEpithelium = nombre => `<p class="nombre-epithelium" title="Nombre Epithelium"><img src="logo-simbolo.png" alt="Epithelium"><span>${nombre}</span></p>`;

function mostrarResultados(k = 'prod') {
    const cat = CATALOGOS[k];
    const lista = cat.filtrados;
    const container = document.getElementById(cat.ids.resultados);
    container.innerHTML = '';
    if (cat.datos().length === 0) {
        container.innerHTML = '<div class="no-results">No se pudieron cargar los datos. Revisa tu conexión a internet.<br><button class="btn-nuevo" style="margin-top:15px" onclick="reintentarCarga()">Reintentar</button></div>';
        return;
    }
    if (lista.length === 0) {
        container.innerHTML = '<div class="no-results">No se encontraron productos</div>';
        return;
    }
    if (cat.soloNuevos) {
        container.innerHTML = `<div class="aviso-nuevo">✨ Estás viendo lo nuevo · ${lista.length} ${lista.length === 1 ? 'producto' : 'productos'}</div>`;
    }
    lista.forEach(p => {
        const esNuevo = p['Etiquetas de producto'] === 'Nuevo';
        const card = document.createElement('div');
        card.className = esNuevo ? 'producto-card es-nuevo' : 'producto-card';
        card.onclick = () => mostrarDetalle(p, cat.tema);
        const badge = p.nuevoEpithelium ? '<span class="badge-nuevo">NUEVO EPITHELIUM</span>' : (esNuevo ? '<span class="badge-nuevo">NUEVO</span>' : '');
        card.innerHTML = `<h3>${p['Nombre']}${badge}</h3>${p.nombreEpithelium ? lineaEpithelium(p.nombreEpithelium) : ''}<p><strong>Componentes:</strong> ${p['Componentes']}</p><p><strong>Forma:</strong> ${p['Forma Farmacéutica']}</p>${p['Categoría del Producto'] ? `<p><strong>Categoría:</strong> ${p['Categoría del Producto']}</p>` : ''}${p['Indicación'] ? `<p style="font-size: 12px; color: #999; margin-top: 8px;">${p['Indicación'].substring(0, 100)}...</p>` : ''}`;
        container.appendChild(card);
    });
}

function temaModal(tema) {
    const box = document.querySelector('#modalDetail .modal-content');
    box.classList.remove('theme-mp', 'theme-nuevo', 'theme-port');
    if (tema) box.classList.add(tema);
}

function mostrarDetalle(producto, tema = '') {
    temaModal(producto['Etiquetas de producto'] === 'Nuevo' ? 'theme-nuevo' : tema);
    const modal = document.getElementById('modalDetail');
    const content = document.getElementById('detailContent');
    content.innerHTML = `<h2>${producto['Nombre']}</h2>${producto.nombreEpithelium ? lineaEpithelium(producto.nombreEpithelium) : ''}${producto['Componentes'] ? `<strong>Componentes</strong><p>${producto['Componentes'].replace(/\n/g, '<br>')}</p>` : ''}<strong>Especificaciones</strong><p>${producto['Categoría del Producto'] ? `<strong>Categoría:</strong> ${producto['Categoría del Producto']}<br>` : ''}<strong>Forma:</strong> ${producto['Forma Farmacéutica']}<br><strong>Presentación:</strong> ${producto['Presentación Farmacéutica']}<br><strong>Tamaño:</strong> ${producto['Tamaño']} ${producto['Masa']}</p>${producto['Indicación'] ? `<strong>Indicación</strong><p>${producto['Indicación'].replace(/\n/g, '<br>')}</p>` : ''}${producto['Dosis Recomendada'] ? `<strong>Dosis Recomendada</strong><p>${producto['Dosis Recomendada'].replace(/\n/g, '<br>')}</p>` : ''}<strong>Referencia Interna</strong><p>${producto['Referencia Interna']}</p>${producto['Etiquetas de producto'] ? `<strong>Categorías</strong><p><span class="producto-label">${producto.nuevoEpithelium ? 'Nuevo Epithelium' : producto['Etiquetas de producto']}</span></p>` : ''}`;
    modal.classList.add('active');
}

// MATERIAS PRIMAS
function inicializarFiltrosMP() {
    const select = document.getElementById('mpFilterEtiqueta');
    select.length = 1;
    const etiquetas = [...new Set(materiasPrimas.map(m => m['Etiqueta de Materia Prima']).filter(e => e))].sort();
    llenarDatalist('dlUsos', opcionesUnicas(materiasPrimas.flatMap(usosDe)));
    etiquetas.forEach(e => {
        const option = document.createElement('option');
        option.value = e;
        option.textContent = e;
        select.appendChild(option);
    });
}

function filtrarMP() {
    const searchName = normalizar(document.getElementById('mpSearchName').value);
    const searchUso = normalizar(document.getElementById('mpSearchUso').value);
    const filterEtiqueta = document.getElementById('mpFilterEtiqueta').value;
    materiasPrimasFiltradas = materiasPrimas.filter(m => {
        const matchName = normalizar(m['Nombre']).includes(searchName);
        const textoUso = normalizar(m['Uso Terapéutico y Cosmético'] + ' ' + m['Identificación Técnica']);
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
        card.innerHTML = `<h3>${m['Nombre']}</h3><p><strong>Categoría:</strong> ${m['Etiqueta de Materia Prima']}</p>${m['Concentración de Uso'] ? `<p><strong>Concentración:</strong> ${m['Concentración de Uso'].split('\n')[0]}</p>` : ''}${uso ? `<p style="font-size: 12px; color: #999; margin-top: 8px;">${uso.length > 100 ? uso.substring(0, 100) + '...' : uso}</p>` : ''}`;
        container.appendChild(card);
    });
}

function mostrarDetalleMP(m) {
    temaModal('theme-mp');
    const modal = document.getElementById('modalDetail');
    const content = document.getElementById('detailContent');
    const bloque = (titulo, texto) => texto ? `<strong>${titulo}</strong><p>${texto.replace(/\n/g, '<br>')}</p>` : '';
    content.innerHTML = `<h2>${m['Nombre']}</h2>${bloque('Identificación Técnica', m['Identificación Técnica'])}${bloque('Uso Terapéutico y Cosmético', m['Uso Terapéutico y Cosmético'])}${bloque('Concentración de Uso', m['Concentración de Uso'])}${bloque('Referencia Interna', m['Referencia Interna'])}${m['Etiqueta de Materia Prima'] ? `<strong>Categoría</strong><p><span class="producto-label">${m['Etiqueta de Materia Prima']}</span></p>` : ''}`;
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
