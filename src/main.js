// src/main.js
// ==================================================
// TraceAgro – SPA académica conectada al backend
// ==================================================
import './style.css'

import {
  registrarEventoCustodia,
  registrarPagoEnBlockchain,
  consultarHistorialPorLote, // por si luego lo usas
  registrarLoteEnBlockchain,
  registrarDocumentoOrigen,
} from './blockchainAdapter.js'

// ==================================================
// CONFIG BACKEND
// ==================================================

// Lista de posibles URLs donde puede estar el backend.
// Vite en StackBlitz / Replit puede usar el relativo "/api".
const POSIBLES_BACKENDS = [
  // tu Replit
  'https://d10f3e98-7982-42a1-81e4-c011d59fe3ae-00-3h9tn4octglgm.worf.replit.dev',
  'https://d10f3e98-7982-42a1-81e4-c011d59fe3ae-00-3h9tn4octglgm.worf.replit.dev/',
  // relativo (por si está proxyeado)
  '/api',
]

let backendURLActiva = null
let backendDisponible = false

// ID “fijo” de transportista en el piloto
const TRANSPORTISTA_ID_DEMO = 'T-001'

// ==================================================
// CATÁLOGO DE CULTIVOS
// ==================================================
const TRAZABILIDAD_POR_CULTIVO = {
  cafe_colombiano: {
    nombre: 'Café colombiano',
    descripcion:
      'Proceso típico de café lavado colombiano (recolección, despulpado, secado).',
    pasos: [
      'Recolección selectiva de cereza madura',
      'Flotación y descarte de fruta defectuosa',
      'Despulpado en húmedo el mismo día',
      'Fermentación controlada (12-18 horas)',
      'Lavado y repaso',
      'Secado (patio / marquesina)',
      'Clasificación por calidad',
      'Empaque y registro en blockchain',
    ],
  },
  cafe_pasilla: {
    nombre: 'Café pasilla',
    descripcion:
      'Café de subproducto o categoría baja. Lo trazamos igual para que haya transparencia.',
    pasos: [
      'Recolección de granos no estándar / subproducto',
      'Clasificación por tamaño y defecto',
      'Lavado básico',
      'Secado al sol hasta humedad adecuada',
      'Marcado como PASILLA',
      'Registro en blockchain con categoría',
    ],
  },
  cafe_especial: {
    nombre: 'Café especial',
    descripcion:
      'Para lotes premium. Importa el control de fermentación y la ficha sensorial.',
    pasos: [
      'Recolección 100% de cereza madura',
      'Flotación (descartar baja densidad)',
      'Fermentación controlada',
      'Lavado',
      'Secado lento bajo sombra',
      'Catación / ficha sensorial',
      'Empaque de alta barrera',
      'Registro en blockchain (lote premium)',
    ],
  },
  hortaliza_hoja: {
    nombre: 'Hortaliza de hoja',
    descripcion: 'Lechuga, espinaca, acelga. Hay que cuidar la higiene y el frío.',
    pasos: [
      'Cosecha en horas frescas',
      'Lavado con agua potable',
      'Selección de hojas sanas',
      'Desinfección ligera',
      'Empaque ventilado',
      'Transporte rápido',
      'Registro en blockchain',
    ],
  },
  hortaliza_fruto: {
    nombre: 'Hortaliza de fruto',
    descripcion: 'Tomate, pepino, pimentón. Se clasifica por tamaño y calidad.',
    pasos: [
      'Cosecha en punto de madurez comercial',
      'Limpieza superficial',
      'Clasificación por tamaño y calidad',
      'Empaque en canastillas limpias',
      'Transporte sin golpes',
      'Registro en blockchain',
    ],
  },
  aromatica: {
    nombre: 'Aromática / hierbabuena',
    descripcion:
      'Para plantas frescas que deben oler bien y llegar rápido al consumidor.',
    pasos: [
      'Corte en punto de mayor aroma',
      'Sacudido y limpieza de impurezas',
      'Secado ligero o hidratación controlada',
      'Empaque ventilado',
      'Transporte corto',
      'Registro en blockchain',
    ],
  },
  tuberculo: {
    nombre: 'Tubérculo',
    descripcion:
      'Papa, yuca, arracacha. Se hace curado y clasificación antes del envío.',
    pasos: [
      'Cosecha y curado inicial',
      'Clasificación por tamaño y sanidad',
      'Limpieza superficial (sin dañar cáscara)',
      'Empaque en costales/cajas',
      'Transporte',
      'Registro en blockchain',
    ],
  },
  grano: {
    nombre: 'Grano / leguminosa',
    descripcion: 'Fríjol, maíz. Se seca, se limpia y se clasifica.',
    pasos: [
      'Cosecha',
      'Secado al sol o en secadora',
      'Limpieza y selección de impurezas',
      'Clasificación por calibre',
      'Empaque en costal limpio',
      'Almacenamiento ventilado',
      'Registro en blockchain',
    ],
  },
  restringido: {
    nombre: 'Cultivo de uso restringido',
    descripcion:
      'Producto que requiere licencia o permiso. Se muestra como restringido al comprador.',
    pasos: [
      'Registrar solo datos permitidos',
      'Adjuntar soporte o autorización',
      'Registrar en blockchain los hashes',
      'Controlar quién puede ver el lote',
    ],
  },
}

// ==================================================
// PLANTILLAS DE ORIGEN (CU08)
// ==================================================
const ORIGIN_TEMPLATES = [
  {
    id: 'hortaliza-fruto',
    nombre: 'Hortaliza de fruto (tomate, pimentón, pepino)',
    texto:
      'Preparación del terreno → Siembra → Riego → Manejo integrado de plagas → Cosecha → Clasificación → Empaque → Despacho.',
  },
  {
    id: 'hortaliza-hoja',
    nombre: 'Hortaliza de hoja (lechuga, repollo, espinaca)',
    texto:
      'Preparación de camas → Trasplante → Riego → Control fitosanitario → Cosecha → Lavado y desinfección → Empaque → Envío.',
  },
  {
    id: 'tuberculo',
    nombre: 'Papa / tubérculo',
    texto:
      'Siembra en surcos → Fertilización → Control de malezas → Cosecha manual → Lavado → Clasificación → Empaque → Despacho.',
  },
  {
    id: 'grano',
    nombre: 'Grano / leguminosa (fríjol, maíz)',
    texto:
      'Cosecha → Secado → Limpieza → Clasificación → Empaque → Almacenamiento → Despacho.',
  },
  {
    id: 'cafe-estandar',
    nombre: 'Café colombiano lavado (estándar)',
    texto:
      'Recolección selectiva → Despulpado mismo día → Fermentación 12-18h → Lavado → Secado → Almacenamiento → Registro del lote.',
  },
  {
    id: 'cafe-especial',
    nombre: 'Café especial con registro sensorial',
    texto:
      'Recolección 100% madura → Fermentación controlada → Secado lento → Catación y ficha → Empaque de alta barrera → Registro del lote.',
  },
  {
    id: 'cafe-pasilla',
    nombre: 'Café pasilla / subproducto',
    texto:
      'Separación de pasilla → Secado independiente → Clasificación → Registro como producto de menor categoría → Empaque separado.',
  },
]

// ==================================================
// ESTADO DEL SPA
// ==================================================
const state = {
  view: 'home',
  rol: 'COMPRADOR', // COMPRADOR | AGRICULTOR | TRANSPORTISTA
  lotes: [
    // Lotes de ejemplo si no hay backend
    {
      id: 'L-001',
      nombre: 'Tomate chonto',
      finca: 'La Esperanza',
      fecha: '2025-10-30',
      cantidad: 120,
      unidad: 'kg',
      estado: 'DISPONIBLE',
      cultivo: 'hortaliza_fruto',
      precio: 1500,
      procesoOrigen: '',
    },
    {
      id: 'L-002',
      nombre: 'Papa criolla',
      finca: 'El Mirador',
      fecha: '2025-10-29',
      cantidad: 80,
      unidad: 'kg',
      estado: 'DISPONIBLE',
      cultivo: 'tuberculo',
      precio: 1200,
      procesoOrigen: '',
    },
  ],
  ordenActual: null, // se usa en la vista de pago
}

// Historial local (solo por si el backend se cae)
const historialSimulado = {}

// ==================================================
// HELPERS
// ==================================================

// Genera un ID local tipo L-003 cuando NO hay backend
function generarIdLocal() {
  const ids = state.lotes
    .filter((l) => typeof l.id === 'string' && l.id.startsWith('L-'))
    .map((l) => Number(l.id.split('-')[1]))
    .filter((n) => !isNaN(n))
  const max = ids.length ? Math.max(...ids) : 0
  const siguiente = max + 1
  return `L-${String(siguiente).padStart(3, '0')}`
}

// Guardar evento de historial en backend
async function guardarEventoHistorialEnAPI(loteId, texto) {
  if (!backendDisponible || !backendURLActiva) return false
  try {
    const res = await fetch(`${backendURLActiva}/historial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loteId,
        evento: texto,
      }),
    })
    const data = await res.json()
    return data && data.ok
  } catch (err) {
    console.warn('⚠️ No se pudo guardar el historial en backend')
    return false
  }
}

// ==================================================
// FUNCIONES PARA HABLAR CON EL BACKEND
// ==================================================

// Detectar backend y cargar lotes
async function cargarLotesDesdeAPI() {
  if (backendURLActiva) {
    try {
      const res = await fetch(`${backendURLActiva}/lotes`)
      if (!res.ok) throw new Error('no ok')
      const data = await res.json()
      state.lotes = data
      backendDisponible = true
      console.log('✅ Lotes cargados desde', backendURLActiva)
      return
    } catch (err) {
      console.warn('⚠️ La URL activa falló, probando todas…')
      backendURLActiva = null
    }
  }

  for (const url of POSIBLES_BACKENDS) {
    try {
      const res = await fetch(`${url}/lotes`)
      if (!res.ok) throw new Error('no ok')
      const data = await res.json()
      backendURLActiva = url
      backendDisponible = true
      state.lotes = data
      console.log('✅ Backend encontrado en:', url)
      return
    } catch (err) {
      console.log('❌ No respondió:', url)
    }
  }

  backendDisponible = false
  console.warn('⚠️ Ninguna URL de backend respondió. Uso los lotes de ejemplo.')
}

// Guardar nuevo lote en el backend (POST /lotes)
async function guardarLoteEnAPI(lote) {
  if (!backendDisponible || !backendURLActiva) return null
  try {
    const res = await fetch(`${backendURLActiva}/lotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lote),
    })
    const data = await res.json()
    if (data && data.ok && data.lote) {
      return data.lote // el backend ya trae el id generado
    }
    return null
  } catch (err) {
    console.warn('⚠️ No se pudo guardar en el backend (pero sí en memoria).')
    return null
  }
}

// Comprar parcial (minorista / mayorista)
// AHORA también envía municipioDestino al backend
async function comprarParcialEnAPI(idLote, cantidad, modoCompra, municipioDestino) {
  if (!backendDisponible || !backendURLActiva) {
    return { ok: false }
  }

  try {
    const res = await fetch(`${backendURLActiva}/lotes/${idLote}/comprar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad, modoCompra, municipioDestino }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.warn('⚠️ No se pudo comprar en backend')
    return { ok: false }
  }
}

// Leer mini-blockchain de un lote (GET /blockchain/:loteId)
async function cargarBlockchainDeLote(loteId) {
  if (!backendURLActiva) return []

  try {
    const res = await fetch(`${backendURLActiva}/blockchain/${loteId}`)
    if (!res.ok) throw new Error('no ok')
    const data = await res.json()
    if (!data.ok) return []
    return data.bloques || []
  } catch (err) {
    console.warn('⚠️ No se pudo leer blockchain del backend')
    return []
  }
}

// Ordenes para transportista (GET /ordenes)
async function cargarOrdenesDesdeAPI() {
  if (!backendDisponible || !backendURLActiva) return []
  try {
    const res = await fetch(`${backendURLActiva}/ordenes`)
    if (!res.ok) throw new Error('no ok')
    const data = await res.json()
    if (!data.ok) return []
    return data.ordenes || []
  } catch (err) {
    console.warn('⚠️ No se pudieron cargar órdenes')
    return []
  }
}

// Transportista toma orden (POST /ordenes/:id/tomar)
async function tomarOrdenEnAPI(ordenId) {
  if (!backendDisponible || !backendURLActiva) return { ok: false }
  try {
    const res = await fetch(`${backendURLActiva}/ordenes/${ordenId}/tomar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transportistaId: TRANSPORTISTA_ID_DEMO }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.warn('⚠️ No se pudo tomar la orden en backend')
    return { ok: false }
  }
}
// Crear viaje automático por municipio (POST /viajes)
async function crearViajeEnAPI(municipioDestino) {
  if (!backendDisponible || !backendURLActiva) return { ok: false }
  try {
    const res = await fetch(`${backendURLActiva}/viajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ municipioDestino }),
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.warn('⚠️ No se pudo crear viaje en backend')
    return { ok: false }
  }
}

// Listar viajes (GET /viajes)
async function cargarViajesDesdeAPI() {
  if (!backendDisponible || !backendURLActiva) return []
  try {
    const res = await fetch(`${backendURLActiva}/viajes`)
    if (!res.ok) throw new Error('no ok')
    const data = await res.json()
    if (!data.ok) return []
    return data.viajes || []
  } catch (err) {
    console.warn('⚠️ No se pudieron cargar viajes')
    return []
  }
}


// ==================================================
// RENDER PRINCIPAL
// ==================================================
const root = document.querySelector('#app')

function render() {
  switch (state.view) {
    case 'home':
      renderHome()
      break
    case 'list':
      renderListaParaComprador()
      break
    case 'crear-lote':
      renderCrearLote()
      break
    case 'doc-origen':
      renderDocOrigen()
      break
    case 'historial':
      renderHistorial()
      break
    case 'pago':
      renderPago()
      break
    case 'hitos-transporte':
      renderHitosTransporte()
      break
    case 'ordenes-transporte':
      renderOrdenesTransporte()
      break
    default:
      renderHome()
  }
}

// ==================================================
// UI: topbar + menú por rol
// ==================================================
function renderTopbar() {
  return `
    <div class="topbar">
      <div>
        <h1>TraceAgro</h1>
        <small>Prototipo de trazabilidad académica</small>
      </div>
      <div class="top-actions">
        <label for="select-rol" style="font-size:0.75rem;">Entrar como:</label>
        <select id="select-rol">
          <option value="COMPRADOR" ${
            state.rol === 'COMPRADOR' ? 'selected' : ''
          }>Comprador</option>
          <option value="AGRICULTOR" ${
            state.rol === 'AGRICULTOR' ? 'selected' : ''
          }>Agricultor</option>
          <option value="TRANSPORTISTA" ${
            state.rol === 'TRANSPORTISTA' ? 'selected' : ''
          }>Transportista</option>
        </select>
        <button id="btn-ir-home" class="btn secondary">Inicio</button>
      </div>
    </div>
  `
}

function renderMenuPorRol() {
  if (state.rol === 'AGRICULTOR') {
    return `
      <div class="menu-rol">
        <h2>Panel del Agricultor</h2>
        <p>Casos de uso: CU01, CU02, CU07 y CU08.</p>
        <div class="menu-grid">
          <button class="btn" id="btn-crear-lote">Registrar lote (CU01)</button>
          <button class="btn" id="btn-doc-origen">Documentar proceso (CU08)</button>
          <button class="btn" id="btn-historial">Ver historial (CU07)</button>
        </div>
      </div>
    `
  }

  if (state.rol === 'TRANSPORTISTA') {
    return `
      <div class="menu-rol">
        <h2>Panel del Transportista</h2>
        <p>Casos de uso: CU02, CU03 y órdenes.</p>
        <div class="menu-grid">
          <button class="btn" id="btn-ordenes-trans">Ver órdenes disponibles</button>
          <button class="btn" id="btn-hitos">Registrar hito de custodia (CU02)</button>
          <button class="btn" id="btn-historial">Ver historial (CU07)</button>
        </div>
      </div>
    `
  }

  // COMPRADOR
  return `
    <div class="menu-rol">
      <h2>Panel del Comprador</h2>
      <p>Casos de uso: CU04, CU05, CU06 y CU07.</p>
      <div class="menu-grid">
        <button class="btn" id="btn-lista">Ver / buscar lotes (CU04)</button>
        <button class="btn" id="btn-historial">Ver historial (CU07)</button>
      </div>
    </div>
  `
}

// ==================================================
// HOME
// ==================================================
function renderHome() {
  root.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      ${renderMenuPorRol()}
      <div class="card">
        <div class="section-header">
          <h2>Vista principal</h2>
          <p>Selecciona una opción del menú según tu rol.</p>
        </div>
      </div>
    </div>
  `

  document.querySelector('#btn-ir-home').onclick = () => {
    state.view = 'home'
    render()
  }
  document.querySelector('#select-rol').onchange = (e) => {
    state.rol = e.target.value
    state.view = 'home'
    render()
  }

  if (state.rol === 'COMPRADOR') {
    document.querySelector('#btn-lista').onclick = async () => {
      await cargarLotesDesdeAPI()
      state.view = 'list'
      render()
    }
  }

  if (state.rol === 'AGRICULTOR') {
    document.querySelector('#btn-crear-lote').onclick = () => {
      state.view = 'crear-lote'
      render()
    }
    document.querySelector('#btn-doc-origen').onclick = () => {
      state.view = 'doc-origen'
      render()
    }
  }

  if (state.rol === 'TRANSPORTISTA') {
    document.querySelector('#btn-hitos').onclick = () => {
      state.view = 'hitos-transporte'
      render()
    }
    document.querySelector('#btn-ordenes-trans').onclick = () => {
      state.view = 'ordenes-transporte'
      render()
    }
  }

  document.querySelector('#btn-historial').onclick = () => {
    state.view = 'historial'
    render()
  }
}

// ==================================================
// CREAR LOTE – CU01 (AGRICULTOR)
// ==================================================
function renderCrearLote() {
  root.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="card">
        <div class="section-header">
          <h2>Registrar lote (CU01)</h2>
          <p>Crear un lote y seleccionar el tipo de cultivo. La descripción sale sola.</p>
        </div>

        <form id="form-lote" class="form-grid">
          <div>
            <label>Nombre / producto</label>
            <input type="text" name="nombre" placeholder="Café, lechuga, hierbabuena..." required />
          </div>
          <div>
            <label>Finca / origen</label>
            <input type="text" name="finca" placeholder="Finca El Mirador" required />
          </div>
          <div>
            <label>Fecha de creación</label>
            <input type="date" name="fecha" required />
          </div>
          <div>
            <label>Cantidad</label>
            <input type="number" name="cantidad" min="1" value="50" required />
          </div>
          <div>
            <label>Unidad</label>
            <input type="text" name="unidad" value="kg" required />
          </div>
          <div>
            <label>Precio (COP / unidad)</label>
            <input type="number" name="precio" min="1" value="1000" required />
          </div>
          <div>
            <label>Tipo de cultivo</label>
            <select name="cultivo" id="sel-cultivo" class="form-control">
              <option value="cafe_colombiano">Café colombiano</option>
              <option value="cafe_pasilla">Café pasilla</option>
              <option value="cafe_especial">Café especial</option>
              <option value="hortaliza_hoja">Hortaliza de hoja</option>
              <option value="hortaliza_fruto">Hortaliza de fruto</option>
              <option value="aromatica">Aromática / hierbabuena</option>
              <option value="tuberculo">Tubérculo</option>
              <option value="grano">Grano / leguminosa</option>
              <option value="restringido">Cultivo de uso restringido</option>
            </select>
          </div>
        </form>

        <div class="info-cultivo" id="info-cultivo"></div>

        <button id="btn-guardar-lote" class="primary" style="margin-top:1rem;">Guardar lote</button>

        <div class="section-header" style="margin-top:1.5rem;">
          <h2>Lotes ya registrados</h2>
        </div>
        <div id="lista-lotes" class="lista-lotes"></div>
      </div>
    </div>
  `

  document.querySelector('#btn-ir-home').onclick = () => {
    state.view = 'home'
    render()
  }
  document.querySelector('#select-rol').onchange = (e) => {
    state.rol = e.target.value
    state.view = 'home'
    render()
  }

  const selCultivo = document.querySelector('#sel-cultivo')
  const infoBox = document.querySelector('#info-cultivo')

  function pintarDescripcion() {
    const tipo = selCultivo.value
    const info = TRAZABILIDAD_POR_CULTIVO[tipo]
    infoBox.innerHTML = `
      <h4>${info ? info.nombre : 'Cultivo seleccionado'}</h4>
      <p>${info ? info.descripcion : 'Sin descripción disponible.'}</p>
      <ul>
        ${
          info && info.pasos
            ? info.pasos.map((p) => `<li>${p}</li>`).join('')
            : '<li>Sin pasos definidos.</li>'
        }
      </ul>
    `
  }
  pintarDescripcion()
  selCultivo.onchange = pintarDescripcion

  document.querySelector('#btn-guardar-lote').onclick = async () => {
    const form = document.querySelector('#form-lote')
    const data = new FormData(form)
    const cultivo = data.get('cultivo')
    const info = TRAZABILIDAD_POR_CULTIVO[cultivo]

    const nuevo = {
      // NO mando id: el backend lo genera. Si no hay backend, lo genero local.
      nombre: data.get('nombre'),
      finca: data.get('finca'),
      fecha: data.get('fecha'),
      cantidad: Number(data.get('cantidad')),
      unidad: data.get('unidad'),
      estado: 'DISPONIBLE',
      cultivo,
      precio: Number(data.get('precio')) || 1000,
      trazabilidad: info?.pasos ? [...info.pasos] : [],
      procesoOrigen: '',
    }

    let loteFinal = null

    if (backendDisponible && backendURLActiva) {
      const creado = await guardarLoteEnAPI(nuevo)
      if (creado) {
        loteFinal = creado
        state.lotes.push(creado)
      } else {
        nuevo.id = generarIdLocal()
        loteFinal = nuevo
        state.lotes.push(nuevo)
      }
    } else {
      nuevo.id = generarIdLocal()
      loteFinal = nuevo
      state.lotes.push(nuevo)
    }

    // blockchain simulada en frontend
    registrarLoteEnBlockchain(loteFinal)

    alert('Lote guardado.')
    renderCrearLote()
  }

  renderListaLotes('lista-lotes')
}

// Lista simple de lotes (se usa en panel agricultor)
function renderListaLotes(idContenedor) {
  const cont = document.querySelector(`#${idContenedor}`)
  if (!cont) return
  cont.innerHTML =
    state.lotes
      .map(
        (l) => `
        <div class="lote-card">
          <strong>${l.id || '(sin id)'} – ${l.nombre}</strong>
          <small>${l.cantidad}${l.unidad} • ${l.finca}</small>
          <small>Tipo: ${
            TRAZABILIDAD_POR_CULTIVO[l.cultivo]?.nombre || l.cultivo
          }</small>
          <small><b>Precio:</b> ${
            l.precio ? `$${Number(l.precio).toLocaleString()} COP` : '—'
          }</small>
        </div>
      `,
      )
      .join('') || '<p>No hay lotes aún.</p>'
}

// ==================================================
// DOCUMENTAR ORIGEN – CU08 (AGRICULTOR)
// ==================================================
function renderDocOrigen() {
  root.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="card">
        <div class="section-header">
          <h2>Documentar proceso / origen del lote (CU08)</h2>
          <p>Selecciona el lote y la plantilla. El texto se llena solo.</p>
        </div>

        <label>Selecciona el lote</label>
        <select id="sel-lote">
          ${state.lotes
            .map((l) => `<option value="${l.id}">${l.id} – ${l.nombre}</option>`)
            .join('')}
        </select>

        <label>Usar plantilla (opcional)</label>
        <select id="sel-plantilla">
          <option value="">-- Seleccionar --</option>
          ${ORIGIN_TEMPLATES.map(
            (t) => `<option value="${t.id}">${t.nombre}</option>`,
          ).join('')}
        </select>

        <label>Proceso / descripción</label>
        <textarea id="txt-proceso" rows="6"></textarea>

        <div style="margin-top:1rem; display:flex; gap:.5rem;">
          <button id="btn-guardar" class="btn">Guardar</button>
          <button id="btn-cancelar" class="btn secondary">Cancelar</button>
        </div>
      </div>
    </div>
  `

  document.querySelector('#btn-ir-home').onclick = () => {
    state.view = 'home'
    render()
  }
  document.querySelector('#select-rol').onchange = (e) => {
    state.rol = e.target.value
    state.view = 'home'
    render()
  }

  document.querySelector('#sel-plantilla').onchange = (e) => {
    const val = e.target.value
    const plantilla = ORIGIN_TEMPLATES.find((p) => p.id === val)
    document.querySelector('#txt-proceso').value = plantilla ? plantilla.texto : ''
  }

  document.querySelector('#btn-guardar').onclick = async () => {
    const loteId = document.querySelector('#sel-lote').value
    const texto = document.querySelector('#txt-proceso').value.trim()
    const lote = state.lotes.find((l) => l.id === loteId)
    if (lote) {
      lote.procesoOrigen = texto
      await guardarEventoHistorialEnAPI(loteId, `DOC-ORIGEN: ${texto}`)
      registrarDocumentoOrigen({ loteId, texto })
      alert('Proceso guardado en backend y blockchain (simulado).')
    }
    state.view = 'home'
    render()
  }

  document.querySelector('#btn-cancelar').onclick = () => {
    state.view = 'home'
    render()
  }
}

// ==================================================
// LISTA PARA COMPRADOR – CU04 + compra parcial
// ==================================================
function renderListaParaComprador() {
  root.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="card">
        <div class="section-header">
          <h2>Buscar / comprar lotes (CU04, CU05)</h2>
          <p>Filtra por nombre o tipo de cultivo. El comprador puede comprar solo una parte.</p>
        </div>

        <div class="form-grid">
          <div>
            <label>Buscar por nombre</label>
            <input type="text" id="txt-buscar" placeholder="café, lechuga, papa..." />
          </div>
          <div>
            <label>Filtrar por cultivo</label>
            <select id="filtro-cultivo">
              <option value="">(Todos)</option>
              <option value="cafe_colombiano">Café colombiano</option>
              <option value="cafe_pasilla">Café pasilla</option>
              <option value="cafe_especial">Café especial</option>
              <option value="hortaliza_hoja">Hortaliza de hoja</option>
              <option value="hortaliza_fruto">Hortaliza de fruto</option>
              <option value="aromatica">Aromática / hierbabuena</option>
              <option value="tuberculo">Tubérculo</option>
              <option value="grano">Grano / leguminosa</option>
              <option value="restringido">Cultivo de uso restringido</option>
            </select>
          </div>
        </div>

        <div id="lista-lotes-comp" class="lista-lotes" style="margin-top:1rem;"></div>
      </div>
    </div>
  `

  document.querySelector('#btn-ir-home').onclick = () => {
    state.view = 'home'
    render()
  }
  document.querySelector('#select-rol').onchange = (e) => {
    state.rol = e.target.value
    state.view = 'home'
    render()
  }

  const input = document.querySelector('#txt-buscar')
  const filtro = document.querySelector('#filtro-cultivo')

  function pintarLista() {
    const texto = input.value.toLowerCase()
    const tipo = filtro.value
    const cont = document.querySelector('#lista-lotes-comp')

    // Solo mostrar lotes con stock (>0 y no AGOTADO)
    const filtrados = state.lotes.filter((l) => {
      const coincideNombre = l.nombre.toLowerCase().includes(texto)
      const coincideCultivo = tipo ? l.cultivo === tipo : true
      const tieneStock = Number(l.cantidad) > 0 && l.estado !== 'AGOTADO'
      return coincideNombre && coincideCultivo && tieneStock
    })

    cont.innerHTML =
      filtrados
        .map((l) => {
          const infoCult = TRAZABILIDAD_POR_CULTIVO[l.cultivo]
          const precio = l.precio ? Number(l.precio) : 0
          return `
            <div class="lote-card">
              <div class="lote-card-header">
                <strong>${l.nombre}</strong>
                <span class="badge">${l.estado}</span>
              </div>
              <small>${l.cantidad}${l.unidad} • ${l.finca}</small>
              <small>Tipo de cultivo: ${
                infoCult ? infoCult.nombre : l.cultivo
              }</small>
              <small style="display:block; margin-top:.35rem; font-size:.7rem;">
                ${infoCult ? infoCult.descripcion : 'Sin descripción.'}
              </small>
              <small style="display:block; margin-top:.35rem;">
                <strong>Precio:</strong> ${
                  precio ? `$${precio.toLocaleString()} COP / ${l.unidad}` : '—'
                }
              </small>

              <div style="margin-top:.6rem;">
                <label style="font-size:.7rem;">Tipo de compra:</label>
                <select id="modo-${l.id}">
                  <option value="minorista">Minorista</option>
                  <option value="mayorista">Mayorista</option>
                </select>
              </div>

              <div style="margin-top:.6rem;">
                <label style="font-size:.7rem;">Cantidad a comprar (${l.unidad}):</label>
                <input type="number" min="1" max="${l.cantidad}" value="1" id="cant-${l.id}" style="width:90px;" />
              </div>

              <div style="margin-top:.6rem;">
                <label style="font-size:.7rem;">Municipio destino:</label>
                <input type="text" id="mun-${l.id}" placeholder="Popayán, Yumbo..." />
              </div>

              <button class="primary" onclick="window.comprarParcial('${l.id}')">
                Comprar esta cantidad
              </button>
              <button onclick="window.verHistorialLote('${l.id}')">
                Ver trazabilidad (CU07)
              </button>
            </div>
          `
        })
        .join('') || '<p>No hay resultados.</p>'

    // Ajuste UI: si el usuario elige mayorista, mínimo 11 kg
    filtrados.forEach((l) => {
      const sel = document.querySelector(`#modo-${l.id}`)
      const inputCant = document.querySelector(`#cant-${l.id}`)
      if (!sel || !inputCant) return

      sel.onchange = () => {
        if (sel.value === 'mayorista') {
          inputCant.min = 11
          if (Number(inputCant.value) < 11) {
            inputCant.value = 11
          }
        } else {
          inputCant.min = 1
          if (Number(inputCant.value) < 1) {
            inputCant.value = 1
          }
        }
      }
    })
  }

  input.oninput = pintarLista
  filtro.onchange = pintarLista
  pintarLista()
}

// ==================================================
// HITOS DE TRANSPORTE – CU02 / CU03 (por viaje, en todos los lotes)
// ==================================================
async function renderHitosTransporte() {
  root.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="card">
        <div class="section-header">
          <h2>Registrar hito de transporte (CU02)</h2>
          <p>Selecciona el viaje y registra por dónde va el envío. El hito se replica en todos los lotes del viaje.</p>
        </div>

        <label>Viaje</label>
        <select id="sel-viaje-trans">
          <option value="">(Selecciona un viaje)</option>
        </select>

        <label style="margin-top:0.75rem;">Ciudad / municipio</label>
        <input type="text" id="txt-ciudad" placeholder="Yumbo, Popayán..." />

        <label>Departamento / región</label>
        <input type="text" id="txt-depto" placeholder="Valle del Cauca, Cauca..." />

        <label>Estado de ruta</label>
        <select id="sel-estado-ruta">
          <option value="EN_ORIGEN">En origen / bodega</option>
          <option value="EN_RUTA">En ruta</option>
          <option value="EN_CIUDAD_DESTINO">En ciudad de destino</option>
          <option value="ENTREGADO">Entregado al comprador</option>
        </select>

        <label>Mensaje al comprador</label>
        <textarea id="txt-msg" rows="3" placeholder="Ej: Pasó por Yumbo y va hacia Cali"></textarea>

        <div style="margin-top:1rem; display:flex; gap:.5rem;">
          <button id="btn-guardar-hito" class="btn">Guardar hito</button>
          <button id="btn-cancelar-hito" class="btn secondary">Cancelar</button>
        </div>
      </div>
    </div>
  `

  document.querySelector('#btn-ir-home').onclick = () => {
    state.view = 'home'
    render()
  }
  document.querySelector('#select-rol').onchange = (e) => {
    state.rol = e.target.value
    state.view = 'home'
    render()
  }

  const selViaje = document.querySelector('#sel-viaje-trans')

  // Cargar viajes para el selector (solo activos, no COMPLETADOS)
  const viajes = await cargarViajesDesdeAPI()
  const viajesActivos = (viajes || []).filter(
    (v) => v.estado !== 'COMPLETADO',
  )

  if (viajesActivos.length) {
    selViaje.innerHTML += viajesActivos
      .map(
        (v) =>
          `<option value="${v.id}">${v.id} – ${v.municipioDestino} – ${v.pesoTotal} kg</option>`,
      )
      .join('')
  }

  document.querySelector('#btn-guardar-hito').onclick = async () => {
    const viajeId = selViaje.value || null
    const ciudad = document.querySelector('#txt-ciudad').value.trim()
    const depto = document.querySelector('#txt-depto').value.trim()
    const estadoRuta = document.querySelector('#sel-estado-ruta').value

    const mensajeBase =
      estadoRuta === 'ENTREGADO'
        ? 'Entrega final al comprador'
        : 'Hito de transporte'

    const mensaje =
      document.querySelector('#txt-msg').value.trim() || mensajeBase

    if (!viajeId) {
      alert('Selecciona un viaje.')
      return
    }
    if (!ciudad) {
      alert('Escribe la ciudad o municipio.')
      return
    }

    // 1) Obtener todas las órdenes de este viaje
    const ordenes = await cargarOrdenesDesdeAPI()
    const ordenesDelViaje = (ordenes || []).filter(
      (o) => o.viajeId === viajeId,
    )

    if (!ordenesDelViaje.length) {
      alert(
        'No se encontraron órdenes asociadas a este viaje. Verifica que el viaje tenga órdenes asignadas.',
      )
      return
    }

    // 2) Extraer TODOS los loteId únicos del viaje
    const loteIds = Array.from(
      new Set(ordenesDelViaje.map((o) => o.loteId).filter(Boolean)),
    )
    if (!loteIds.length) {
      alert('No se pudieron determinar lotes del viaje para registrar el hito.')
      return
    }

    // 3) Registrar el mismo hito para cada lote del viaje
    for (const loteId of loteIds) {
      if (backendDisponible && backendURLActiva) {
        try {
          const res = await fetch(`${backendURLActiva}/historial`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              loteId,
              evento: `[TRANSPORTE][${viajeId}] ${mensaje} (${ciudad}, ${depto})`,
              meta: {
                rol: 'TRANSPORTISTA',
                ciudad,
                departamento: depto,
                estadoRuta,
                tipoHito: 'viaje',
                viajeId,
              },
            }),
          })
          const data = await res.json()
          if (!data.ok) {
            console.warn('No se pudo guardar hito en backend', data)
          }
        } catch (err) {
          console.warn('⚠️ Error hablando con backend para hito de transporte', err)
        }
      }

      // Blockchain simulada en frontend
      registrarEventoCustodia({
        loteId,
        descripcion: `${mensaje} (${ciudad}, ${depto})`,
        ciudad,
        departamento: depto,
        estadoRuta,
        tipoHito: 'viaje',
        viajeId,
      })

      // Historial local por lote
      if (!historialSimulado[loteId]) historialSimulado[loteId] = []
      historialSimulado[loteId].push({
        fecha: new Date().toISOString(),
        tipo: 'HITO_TRANSPORTE',
        desc: `${mensaje} (${ciudad}, ${depto}) [viaje ${viajeId}]`,
      })
    }

    alert('Hito de transporte registrado para todos los lotes del viaje.')
    // Mostrar historial del primer lote del viaje
    const primerLote = loteIds[0]
    state.view = 'historial'
    render()
    const sel = document.querySelector('#sel-lote-h')
    if (sel) {
      sel.value = primerLote
      mostrarHistorial(primerLote)
    }
  }

  document.querySelector('#btn-cancelar-hito').onclick = () => {
    state.view = 'home'
    render()
  }
}



// ==================================================
// LISTA DE ÓRDENES Y VIAJES PARA TRANSPORTISTA
// ==================================================
async function renderOrdenesTransporte() {
  root.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="card">
        <div class="section-header">
          <h2>Órdenes y viajes para transporte</h2>
          <p>El sistema agrupa automáticamente las órdenes por municipio cuando la suma es al menos 200 kg.</p>
        </div>

        <div class="form-grid">
          <div>
            <label>Municipio para crear viaje</label>
            <input type="text" id="txt-municipio-viaje" placeholder="Popayán, Yumbo..." />
          </div>
          <div>
            <label>&nbsp;</label>
            <button id="btn-crear-viaje" class="btn">Crear viaje por municipio</button>
          </div>
        </div>

        <div class="section-header" style="margin-top:1rem;">
          <h3>Viajes creados</h3>
        </div>
        <div id="lista-viajes" class="lista-lotes"></div>

        <div class="section-header" style="margin-top:1.5rem;">
          <h3>Órdenes pendientes (sin viaje)</h3>
        </div>
        <div id="lista-ordenes" class="lista-lotes"></div>
      </div>
    </div>
  `

  document.querySelector('#btn-ir-home').onclick = () => {
    state.view = 'home'
    render()
  }
  document.querySelector('#select-rol').onchange = (e) => {
    state.rol = e.target.value
    state.view = 'home'
    render()
  }

  const contViajes = document.querySelector('#lista-viajes')
  const contOrdenes = document.querySelector('#lista-ordenes')

  contViajes.innerHTML = '<p>Cargando viajes…</p>'
  contOrdenes.innerHTML = '<p>Cargando órdenes…</p>'

  // Cargar viajes y órdenes
  const [viajes, ordenes] = await Promise.all([
    cargarViajesDesdeAPI(),
    cargarOrdenesDesdeAPI(),
  ])

  // Pintar viajes
  // Solo mostrar viajes que no estén completados
  const viajesActivos = (viajes || []).filter((v) => v.estado !== 'COMPLETADO')

  if (!viajesActivos.length) {
    contViajes.innerHTML = '<p>No hay viajes activos (todos entregados o ninguno creado).</p>'
  } else {
    contViajes.innerHTML = viajesActivos
      .map(
        (v) => `
        <div class="lote-card">
          <strong>Viaje ${v.id}</strong>
          <small>Municipio: ${v.municipioDestino}</small>
          <small>Peso total: ${v.pesoTotal} kg</small>
          <small>Órdenes incluidas: ${v.ordenesIds.join(', ')}</small>
          <small>Estado: ${v.estado === 'COMPLETADO' ? 'ENTREGADO' : v.estado}</small>
        </div>
      `,
      )
      .join('')
  }


  // Órdenes que aún están pendientes de transporte (no asignadas ni en viaje)
  const pendientes = (ordenes || []).filter(
    (o) => o.estado === 'PENDIENTE_TRANSPORTE',
  )

  if (!pendientes.length) {
    contOrdenes.innerHTML =
      '<p>No hay órdenes pendientes de transporte en este momento.</p>'
  } else {
    contOrdenes.innerHTML = pendientes
      .map((o) => {
        return `
        <div class="lote-card">
          <strong>Orden ${o.id}</strong>
          <small>Lote: ${o.loteId}</small>
          <small>Cantidad: ${o.cantidad}</small>
          <small>Modo: ${o.modoCompra}</small>
          <small>Total: $${o.total} COP</small>
          <small>Municipio destino: ${o.municipioDestino || 'Sin definir'}</small>
          <small>Estado: ${o.estado}</small>
          <small>Transportista: ${o.transportistaId || '(sin asignar)'}</small>
        </div>
      `
      })
      .join('')
  }

  // Botón para crear viaje por municipio
  document.querySelector('#btn-crear-viaje').onclick = async () => {
    const mun = document
      .querySelector('#txt-municipio-viaje')
      .value.trim()
    if (!mun) {
      alert('Escribe el municipio para crear el viaje.')
      return
    }

    const resp = await crearViajeEnAPI(mun)
    if (!resp || !resp.ok) {
      alert(resp?.msg || 'No se pudo crear el viaje (verifica que haya al menos 200 kg en órdenes pendientes).')
      return
    }

    alert(
      `Viaje ${resp.viaje.id} creado para ${resp.viaje.municipioDestino} con ${resp.viaje.pesoTotal} kg.`,
    )
    // Recargar la vista para ver viajes y órdenes actualizados
    renderOrdenesTransporte()
  }
}


// Función global para el botón "Tomar esta orden"
window.tomarOrden = async function (ordenId) {
  const resp = await tomarOrdenEnAPI(ordenId)
  if (!resp || !resp.ok) {
    alert(resp?.msg || 'No se pudo tomar la orden (revisar mínimo de 200 kg).')
    return
  }

  alert(`Orden ${ordenId} asignada al transportista.`)
  // Volver a recargar la lista de órdenes
  renderOrdenesTransporte()
}

// ==================================================
// FUNCIONES GLOBALES PARA BOTONES (COMPRA / HISTORIAL)
// ==================================================
window.comprarParcial = async function (idLote) {
  const lote = state.lotes.find((l) => l.id === idLote)
  if (!lote) {
    alert('No encontré el lote.')
    return
  }

  const input = document.querySelector(`#cant-${idLote}`)
  const selectModo = document.querySelector(`#modo-${idLote}`)
  const inputMunicipio = document.querySelector(`#mun-${idLote}`)

  const cant = Number(input.value)
  const modoCompra = selectModo ? selectModo.value : 'minorista'
  const municipioDestino = inputMunicipio ? inputMunicipio.value.trim() : ''

  if (!cant || cant <= 0) {
    alert('Cantidad no válida.')
    return
  }
  if (cant > lote.cantidad) {
    alert('No hay suficiente cantidad.')
    return
  }
  if (!municipioDestino) {
    alert('Por favor escribe el municipio destino.')
    return
  }

  const resp = await comprarParcialEnAPI(idLote, cant, modoCompra, municipioDestino)

  if (resp && resp.ok) {
    const idx = state.lotes.findIndex((l) => l.id === idLote)
    if (idx >= 0) {
      state.lotes[idx] = resp.lote
    }

    const infoCompra = resp.compra
    if (resp.orden) {
      // Guardar última orden creada (para CU06 pago simulado)
      state.ordenActual = resp.orden
    }

    alert(
      `Compra ${infoCompra.modoCompra}\n` +
        `Cantidad: ${infoCompra.cantidad}${infoCompra.unidad}\n` +
        `Precio unitario: ${infoCompra.precioUnitarioFinal} COP\n` +
        `Total: ${infoCompra.total} COP`,
    )
  } else {
    // Modo offline (si backend falla)
    lote.cantidad = lote.cantidad - cant
    if (lote.cantidad === 0) {
      lote.estado = 'AGOTADO'
    }

    await guardarEventoHistorialEnAPI(
      idLote,
      `COMPRA PARCIAL (offline): se compró ${cant}${lote.unidad} (${modoCompra})`,
    )

    alert('Compra registrada en modo offline.')
  }

  // blockchain simulada en frontend
  registrarPagoEnBlockchain({
    loteId: idLote,
    monto: cant * (lote.precio || 1000),
    moneda: 'COP',
  })

  if (!historialSimulado[idLote]) historialSimulado[idLote] = []
  historialSimulado[idLote].push({
    fecha: new Date().toISOString(),
    tipo: 'COMPRA PARCIAL',
    desc: `Se compró ${cant}${lote.unidad} (${modoCompra})`,
  })

  state.view = 'list'
  render()
}

window.verHistorialLote = function (idLote) {
  state.view = 'historial'
  render()
  const sel = document.querySelector('#sel-lote-h')
  if (sel) {
    sel.value = idLote
    mostrarHistorial(idLote)
  }
}

// ==================================================
// HISTORIAL – CU07
// ==================================================
function renderHistorial() {
  root.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="card">
        <div class="section-header">
          <h2>Ver historial en blockchain / backend (CU07)</h2>
          <p>Selecciona el lote.</p>
        </div>

        <label for="sel-lote-h">Lote</label>
        <select id="sel-lote-h">
          ${state.lotes
            .map((l) => `<option value="${l.id}">${l.id} – ${l.nombre}</option>`)
            .join('')}
        </select>

        <div id="hist-contenido" style="margin-top:1rem;"></div>
      </div>
    </div>
  `

  document.querySelector('#btn-ir-home').onclick = () => {
    state.view = 'home'
    render()
  }
  document.querySelector('#select-rol').onchange = (e) => {
    state.rol = e.target.value
    state.view = 'home'
    render()
  }

  const sel = document.querySelector('#sel-lote-h')
  sel.onchange = () => {
    mostrarHistorial(sel.value)
  }
  mostrarHistorial(sel.value)
}

async function mostrarHistorial(loteId) {
  const cont = document.querySelector('#hist-contenido')
  if (!cont) return

  let eventosBack = []
  if (backendDisponible && backendURLActiva) {
    try {
      const res = await fetch(`${backendURLActiva}/historial/${loteId}`)
      if (res.ok) {
        eventosBack = await res.json()
      }
    } catch (err) {
      console.warn('⚠️ No se pudo leer historial del backend, uso local')
    }
  }

  const sim = historialSimulado[loteId] || []

  const todos = [
    ...eventosBack.map((e) => {
      const texto = e.evento || ''
      let tipo = 'REGISTRO'

      if (texto.startsWith('[TRANSPORTE]')) {
        tipo = 'TRANSPORTE'
        if (texto.includes('ENTREGADO') || texto.includes('entregado')) {
          tipo = 'ENTREGADO'
        }
      } else if (texto.startsWith('Compra ')) {
        tipo = 'COMPRA'
      }

      return {
        tipo,
        fecha: e.fecha,
        desc: texto,
      }
    }),
    ...sim,
  ]

  const bloques = await cargarBlockchainDeLote(loteId)

  if (!todos.length && !bloques.length) {
    cont.innerHTML = '<p class="small-muted">Sin eventos registrados.</p>'
    return
  }

  let html = ''

  if (todos.length) {
    html +=
      '<h3>Eventos de historial</h3>' +
      todos
        .map(
          (e) => `
        <div class="hist-item">
          <strong>${e.tipo || 'EVENTO'}</strong> – ${e.fecha}<br/>
          <span class="small-muted">${e.desc || ''}</span>
        </div>
      `,
        )
        .join('')
  }

  if (bloques.length) {
    html += '<h3>Bloques en blockchain (hashes)</h3>'
    html += bloques
      .map((b) => {
        const hashCorto = b.hash ? b.hash.slice(0, 16) + '…' : '(sin hash)'
        const prevCorto = b.prevHash ? b.prevHash.slice(0, 16) + '…' : '(GENESIS)'
        return `
          <div class="hist-item">
            <strong>${b.tipo}</strong> – ${b.timestamp}<br/>
            <span class="small-muted">
              Lote: ${b.loteId} | Hash: ${hashCorto} | Prev: ${prevCorto}
            </span>
          </div>
        `
      })
      .join('')
  }

  cont.innerHTML = html
}


// ==================================================
// PAGO (CU06) – simulado
// ==================================================
function renderPago() {
  const orden = state.ordenActual
  if (!orden) {
    state.view = 'home'
    render()
    return
  }

  root.innerHTML = `
    ${renderTopbar()}
    <div class="page">
      <div class="card">
        <div class="section-header">
          <h2>Pagar lote (CU06)</h2>
          <p>Simulación de pasarela de pagos.</p>
        </div>
        <p>Orden: <strong>${orden.id}</strong></p>
        <p>Lote: <strong>${orden.loteId}</strong></p>
        <p>Total: <strong>$${orden.total} COP</strong></p>

        <label>Método de pago</label>
        <select id="metodo">
          <option value="simulado">Pasarela simulada</option>
          <option value="pse">PSE (demo)</option>
          <option value="tarjeta">Tarjeta (demo)</option>
        </select>

        <button id="btn-pagar" class="btn" style="margin-top:1rem;">Pagar</button>
      </div>
    </div>
  `

  document.querySelector('#btn-ir-home').onclick = () => {
    state.view = 'home'
    render()
  }
  document.querySelector('#select-rol').onchange = (e) => {
    state.rol = e.target.value
    state.view = 'home'
    render()
  }

  document.querySelector('#btn-pagar').onclick = () => {
    registrarPagoEnBlockchain({
      loteId: orden.loteId,
      monto: orden.total,
      moneda: 'COP',
    })
    alert('Pago simulado y registrado en blockchain.')
    state.view = 'home'
    render()
  }
}

// ==================================================
// ARRANQUE
// ==================================================
cargarLotesDesdeAPI().finally(() => {
  render()
})
