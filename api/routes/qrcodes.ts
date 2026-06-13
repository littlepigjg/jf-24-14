import { Router, type Request, type Response } from 'express'
import { QrService } from '../services/QrService.js'
import { parseNlpQuery } from '../services/NlpQueryParser.js'
import type { CreateQrCodeRequest, UpdateQrCodeRequest } from '../../shared/types.js'

const router = Router()

router.get('/smart-search', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string || ''
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 10
    const parseResult = parseNlpQuery(q)
    const result = await QrService.advancedList(parseResult.query, page, pageSize)
    res.json({ success: true, data: { ...result, parseResult } })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/parse-query', async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string || ''
    const parseResult = parseNlpQuery(q)
    res.json({ success: true, data: parseResult })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1
    const pageSize = parseInt(req.query.pageSize as string, 10) || 20
    const keyword = req.query.keyword as string | undefined
    const type = req.query.type as 'static' | 'dynamic' | undefined
    const enabled = req.query.enabled !== undefined ? req.query.enabled === 'true' : undefined
    const scanCountMin = req.query.scanCountMin !== undefined ? parseInt(req.query.scanCountMin as string, 10) : undefined
    const scanCountMax = req.query.scanCountMax !== undefined ? parseInt(req.query.scanCountMax as string, 10) : undefined
    const dateFrom = req.query.dateFrom as string | undefined
    const dateTo = req.query.dateTo as string | undefined
    const sortBy = req.query.sortBy as 'createdAt' | 'scanCount' | 'name' | undefined
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined

    const query = {
      keyword,
      type,
      enabled,
      scanCountMin,
      scanCountMax,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    }
    const result = await QrService.advancedList(query, page, pageSize)
    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const qr = await QrService.getById(req.params.id)
    if (!qr) {
      res.status(404).json({ success: false, error: 'QrCode not found' })
      return
    }
    res.json({ success: true, data: qr })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.get('/:id/image.png', async (req: Request, res: Response): Promise<void> => {
  try {
    const qr = await QrService.getById(req.params.id)
    if (!qr) {
      res.status(404).json({ success: false, error: 'QrCode not found' })
      return
    }
    const buf = await QrService.generatePngBuffer(qr)
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(buf)
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as CreateQrCodeRequest
    if (!body.name || !body.targetUrl || !body.type) {
      res.status(400).json({ success: false, error: 'name, targetUrl, type are required' })
      return
    }
    const qr = await QrService.create(body)
    res.status(201).json({ success: true, data: qr })
  } catch (err) {
    const msg = (err as Error).message
    const status = msg === 'Short code already exists' ? 409 : 500
    res.status(status).json({ success: false, error: msg })
  }
})

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as UpdateQrCodeRequest
    const qr = await QrService.update(req.params.id, body)
    if (!qr) {
      res.status(404).json({ success: false, error: 'QrCode not found' })
      return
    }
    res.json({ success: true, data: qr })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.patch('/:id/enable', async (req: Request, res: Response): Promise<void> => {
  try {
    const qr = await QrService.setEnabled(req.params.id, true)
    if (!qr) {
      res.status(404).json({ success: false, error: 'QrCode not found' })
      return
    }
    res.json({ success: true, data: qr })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.patch('/:id/disable', async (req: Request, res: Response): Promise<void> => {
  try {
    const qr = await QrService.setEnabled(req.params.id, false)
    if (!qr) {
      res.status(404).json({ success: false, error: 'QrCode not found' })
      return
    }
    res.json({ success: true, data: qr })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const ok = await QrService.delete(req.params.id)
    if (!ok) {
      res.status(404).json({ success: false, error: 'QrCode not found' })
      return
    }
    res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message })
  }
})

export default router
