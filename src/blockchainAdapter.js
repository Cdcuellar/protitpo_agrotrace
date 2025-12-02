// src/blockchainAdapter.js
// Este archivo simula la blockchain.
// En lugar de conectarnos a Hyperledger/IBM, guardamos los eventos en memoria.
// Así podemos probar CU01, CU02, CU06, CU07 y CU08 sin instalar nada.

const _blockchainEvents = [] // aquí se van guardando los "bloques" o eventos

// Se llama cuando el agricultor crea un lote (CU01)
export function registrarLoteEnBlockchain(lote) {
  // Armamos una fecha con un diseño más agradable para mostrar
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  _blockchainEvents.push({
    tipo: 'CREACION_LOTE',
    loteId: lote.id,
    fecha: now,
    desc: `Lote creado por agricultor. Cantidad: ${lote.cantidad}`,
    data: lote,
  })
}

// Se llama cuando transportista o agricultor registran un movimiento/entrega (CU02 / CU03)
export function registrarEventoCustodia(evento) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  _blockchainEvents.push({
    tipo: 'HITO_CUSTODIA',
    loteId: evento.loteId,
    fecha: now,
    desc: evento.descripcion || 'Evento de custodia',
    data: evento,
  })
}

// Se llama cuando la pasarela (simulada) confirma un pago (CU06)
export function registrarPagoEnBlockchain(pago) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  _blockchainEvents.push({
    tipo: 'PAGO',
    loteId: pago.loteId,
    fecha: now,
    desc: `Pago recibido por ${pago.monto} ${pago.moneda}`,
    data: pago,
  })
}

// CU08 – cuando el agricultor documenta la trazabilidad hacia atrás (proceso/origen)
export function registrarDocumentoOrigen(evento) {
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ')
  _blockchainEvents.push({
    tipo: 'DOC_ORIGEN',
    loteId: evento.loteId,
    fecha: now,
    desc: 'Se documentó el origen/proceso del lote',
    data: evento,
  })
}

// CU07 – mostrar todo lo que ha pasado con un lote
export function consultarHistorialPorLote(loteId) {
  return _blockchainEvents.filter((e) => e.loteId === loteId)
}
