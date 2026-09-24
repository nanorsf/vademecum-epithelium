# Vademecum Epithelium - App Interactiva

Una app web interactiva para consultar productos de Epithelium en el celular, con acceso controlado y funcionamiento offline.

## ¿Cómo funciona?

### 1. **ACCESO CONTROLADO**
- Requiere código de acceso único (ej: `EPITHE-001`)
- Cada usuario registra su acceso en su dispositivo
- Códigos se pueden crear/revocar desde el servidor
- El acceso se guarda localmente para funcionar sin internet

### 2. **FUNCIONALIDAD OFFLINE**
- Todos los datos de productos se guardan en el dispositivo
- Funciona sin conexión a internet después del primer acceso
- Los datos se actualizan cuando hay conexión

### 3. **FILTROS INTERACTIVOS**
- Buscar por nombre
- Filtrar por grupo de producto
- Filtrar por categoría
- Filtrar por forma farmacéutica
- Los filtros se aplican en tiempo real

### 4. **SEGURIDAD**
- No se puede compartir fácilmente (requiere código único)
- Los códigos están asociados al dispositivo
- Los datos no se pueden descargar directamente

## Estructura de archivos

```
vademecum-app/
├── index.html      # Estructura HTML
├── styles.css      # Estilos (responsive para móvil)
├── app.js          # Lógica y funcionalidad
├── data.json       # Datos de 382 productos
└── README.md       # Este archivo
```

## Códigos de acceso actuales

```
EPITHE-001  → Médico 1
EPITHE-002  → Médico 2
EPITHE-003  → Cliente
DEMO-TEST   → Pruebas
```

## Cómo cambiar códigos

1. Abre `app.js`
2. Ve a la línea de `CODIGOS_VALIDOS`
3. Añade o elimina códigos:

```javascript
const CODIGOS_VALIDOS = {
    'EPITHE-001': true,  // Válido
    'EPITHE-002': true,  // Válido
    // 'EPITHE-003': true,  // Inválido (comentado)
};
```

4. Guarda y sube a GitHub

## Cómo actualizar datos

1. Descarga el Excel más reciente
2. Convierte a JSON (Python):
```python
import pandas as pd
import json

df = pd.read_excel('Vademecum.xlsx', sheet_name='Sheet1')
df = df.fillna('')
productos = df.to_dict('records')

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(productos, f, ensure_ascii=False, indent=2)
```

3. Reemplaza `data.json` en el repositorio
4. Haz commit y push

## Despliegue

### Opción 1: GitHub Pages (Gratis)
1. Ve a Settings → Pages
2. Selecciona "Deploy from a branch"
3. Rama: `main`, carpeta: `root`
4. Listo - tu app está en `https://tu-usuario.github.io/vademecum-app`

### Opción 2: Vercel (Gratis)
1. Conecta tu repositorio en vercel.com
2. Deploy automático con cada push
3. URL más limpia y rápida

## Funcionalidades técnicas

- **Sin dependencias externas** - Solo HTML, CSS, JavaScript vanilla
- **Progressive Web App** - Se puede instalar en el inicio de pantalla
- **Offline First** - localStorage para persistencia
- **Responsive Design** - Optimizado para móvil (375px - 1920px)
- **Búsqueda en tiempo real** - Filtros instantáneos
- **Modal detalle** - Información completa de cada producto

## Seguridad

⚠️ **Nota importante**: Esta app almacena todos los datos en el navegador (localStorage). Para mayor seguridad:

- Los códigos deberían validarse con un servidor real
- Los datos sensibles deberían encriptarse
- Se podría agregar watermark invisible con el código del usuario
- Implementar 2FA (autenticación de dos factores)

## Próximos pasos

1. Subir a GitHub (repositorio)
2. Activar GitHub Pages o desplegar en Vercel
3. Generar códigos para tus usuarios
4. Compartir el link de la app
5. Monitorear uso desde Google Analytics

## Contacto

Para reportar errores o sugerencias, abre un issue en GitHub.
