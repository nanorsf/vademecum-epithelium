// CONFIGURACIÓN
const CODIGOS_VALIDOS = {
    'EPITHE-001': true,
    'EPITHE-002': true,
    'EPITHE-003': true,
    'NANO': true
};

let productos = [];
let productosFiltrados = [];

// Inicializar app
document.addEventListener('DOMContentLoaded', async () => {
    await cargarDatos();
    verificarAcceso();
});

// CARGAR DATOS
async function cargarDatos() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/nanorsf/vademecum-epithelium/main/data.json');
        productos = await response.json();
        productos.forEach(p => {
            p['Categoría del Producto'] = (p['Categoría del Producto'] || '').replace(/^Magistral de Pedido\s*\/\s*/, '');
        });
        console.log(`✅ ${productos.length} productos cargados`);
    } catch (error) {
        console.error('Error cargando datos:', error);
        productos = [];
    }
}

// VERIFICAR ACCESO
function verificarAcceso() {
    const codigoGuardado = localStorage.getItem('vademecum_access');
    if (codigoGuardado && CODIGOS_VALIDOS[codigoGuardado]) {
        mostrarPantalla('mainScreen');
        inicializarFiltros();
        cargarTodos();
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
        mostrarPantalla('mainScreen');
        inicializarFiltros();
        cargarTodos();
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
    productosFiltrados = [...productos];
    mostrarResultados();
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
        return matchName && matchComponents && matchCategory && matchFormula;
    });
    mostrarResultados();
}

function mostrarResultados() {
    const container = document.getElementById('resultados');
    container.innerHTML = '';
    if (productosFiltrados.length === 0) {
        container.innerHTML = '<div class="no-results">No se encontraron productos</div>';
        return;
    }
    productosFiltrados.forEach(p => {
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.onclick = () => mostrarDetalle(p);
        card.innerHTML = `<h3>${p['Nombre']}</h3><p><strong>Componentes:</strong> ${p['Componentes']}</p><p><strong>Forma:</strong> ${p['Forma Farmacéutica']}</p><p><strong>Referencia:</strong> ${p['Referencia Interna']}</p><p><strong>Categoría:</strong> ${p['Categoría del Producto']}</p>${p['Indicación'] ? `<p style="font-size: 12px; color: #999; margin-top: 8px;">${p['Indicación'].substring(0, 100)}...</p>` : ''}`;
        container.appendChild(card);
    });
}

function mostrarDetalle(producto) {
    const modal = document.getElementById('modalDetail');
    const content = document.getElementById('detailContent');
    content.innerHTML = `<h2>${producto['Nombre']}</h2>${producto['Componentes'] ? `<strong>Componentes</strong><p>${producto['Componentes'].replace(/\n/g, '<br>')}</p>` : ''}<strong>Especificaciones</strong><p><strong>Forma:</strong> ${producto['Forma Farmacéutica']}<br><strong>Presentación:</strong> ${producto['Presentación Farmacéutica']}<br><strong>Tamaño:</strong> ${producto['Tamaño']} ${producto['Masa']}</p>${producto['Indicación'] ? `<strong>Indicación</strong><p>${producto['Indicación'].replace(/\n/g, '<br>')}</p>` : ''}${producto['Dosis Recomendada'] ? `<strong>Dosis Recomendada</strong><p>${producto['Dosis Recomendada'].replace(/\n/g, '<br>')}</p>` : ''}<strong>Referencia Interna</strong><p>${producto['Referencia Interna']}</p><strong>Categoría</strong><p>${producto['Categoría del Producto']}${producto['Etiquetas de producto'] ? ` <span class="producto-label">${producto['Etiquetas de producto']}</span>` : ''}</p>`;
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
