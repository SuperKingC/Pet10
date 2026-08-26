import { Router } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from './authMiddleware.js'
import type { DiaryService } from '../services/diaryService.js'

function routeParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value
}

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const photoSchema = z.string().regex(/^data:image\/(png|jpeg|webp);base64,/).max(300_000)

const diaryInputSchema = z.object({
  day: daySchema,
  title: z.string().max(40).default(''),
  body: z.string().max(1000).default(''),
  location: z.string().max(40).default(''),
  photos: z.array(photoSchema).max(3).default([])
})
const diaryPatchSchema = diaryInputSchema.omit({ day: true }).partial()

export function createDiaryRoutes(service: DiaryService) {
  const router = Router()

  router.get('/', async (request: AuthenticatedRequest, response, next) => {
    try {
      const from = typeof request.query.from === 'string' && request.query.from
        ? request.query.from
        : new Date(new Date().getTime() - 31 * 86400000).toISOString().slice(0, 10)
      const to = typeof request.query.to === 'string' && request.query.to
        ? request.query.to
        : new Date().toISOString().slice(0, 10)
      response.json(await service.list(request.userId!, from, to))
    } catch (error) { next(error) }
  })

  router.post('/', async (request: AuthenticatedRequest, response, next) => {
    try {
      const input = diaryInputSchema.parse(request.body)
      response.status(201).json(await service.create(request.userId!, input))
    } catch (error) { next(error) }
  })

  router.put('/:diaryId', async (request: AuthenticatedRequest, response, next) => {
    try {
      const patch = diaryPatchSchema.parse(request.body)
      response.json(await service.update(request.userId!, routeParam(request.params.diaryId), patch))
    } catch (error) { next(error) }
  })

  router.delete('/:diaryId', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.remove(request.userId!, routeParam(request.params.diaryId))) } catch (error) { next(error) }
  })

  router.post('/:diaryId/like', async (request: AuthenticatedRequest, response, next) => {
    try { response.json(await service.toggleLike(request.userId!, routeParam(request.params.diaryId))) } catch (error) { next(error) }
  })

  return router
}
