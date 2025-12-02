// server.js
// API REST simple para TraceAgro
// 1) guarda lotes
// 2) lista lotes
// 3) actualiza cantidad (para compra parcial)

import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

// "BD" en memoria (luego la cambiamos a Mongo/Cloudant)
let lotes = [
  {
    id: 'L-001',
    nombre: 'Tomate chonto',
    finca: 'La Esperanza',
    fecha: '2025-10-30',
    cantidad: 120,
    unidad: 'kg',
    estado: 'DISPONIBLE',
    cultivo: 'hortaliza_fruto',
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
    procesoOrigen: '',
  },
]

// GET /lotes  → la SPA pide los lotes
app.get('/lotes', (req, res) => {
  res.json(lotes)
})

// POST /lotes  → el agricultor crea uno nuevo
app.post('/lotes', (req, res) => {
  const nuevo = req.body
  if (!nuevo?.id) {
    return res.status(400).json({ error: 'Falta id' })
  }
  // lo meto
  lotes.push(nuevo)
  return res.status(201).json(nuevo)
})

// PATCH /lotes/:id  → para compra parcial o cambiar estado
app.patch('/lotes/:id', (req, res) => {
  const { id } = req.params
  const cambios = req.body
  const idx = lotes.findIndex((l) => l.id === id)
  if (idx === -1) return res.status(404).json({ error: 'No existe' })

  lotes[idx] = { ...lotes[idx], ...cambios }
  return res.json(lotes[idx])
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('API TraceAgro escuchando en puerto', PORT)
})
