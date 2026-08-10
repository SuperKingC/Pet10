import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ImageGenerationRoom } from './ImageGenerationRoom'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function setInputValue(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

function fileTransfer(file: File) {
  return {
    files: [file],
    items: [{ kind: 'file', type: file.type, getAsFile: () => file }],
    types: ['Files']
  }
}

describe('image generation room', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
      width: 128,
      height: 128,
      close: vi.fn()
    })))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn()
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,aGVsbG8=')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shows upstream error code, request ID, and generation duration', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: 'image_generation_unavailable',
      upstreamCode: 502,
      requestId: 'req_visible_error',
      durationMs: 18432
    }), { status: 503, headers: { 'content-type': 'application/json' } })))
    const host = document.createElement('div')
    const root = createRoot(host)

    await act(async () => root.render(<ImageGenerationRoom />))
    const inputs = host.querySelectorAll('input')
    const prompt = host.querySelector('textarea')!
    await act(async () => {
      setInputValue(inputs[0], 'friends-only')
      setInputValue(prompt, '一只小狗')
    })

    await act(async () => {
      (host.querySelector('.image-room__submit') as HTMLButtonElement).click()
    })

    expect(host.textContent).toContain('错误码 502')
    expect(host.textContent).toContain('18.4 秒')
    expect(host.textContent).toContain('req_visible_error')
    await act(async () => root.unmount())
  })

  it('adds a pasted image from the prompt textarea', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const file = new File(['image'], 'pasted.png', { type: 'image/png' })

    await act(async () => root.render(<ImageGenerationRoom />))
    const prompt = host.querySelector('textarea')!
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', { value: fileTransfer(file) })

    await act(async () => {
      prompt.dispatchEvent(event)
      await Promise.resolve()
    })

    expect(event.defaultPrevented).toBe(true)
    expect(host.querySelectorAll('.image-room__reference')).toHaveLength(1)
    expect(host.textContent).toContain('1/2')
    await act(async () => root.unmount())
  })

  it('does not block normal text paste', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)

    await act(async () => root.render(<ImageGenerationRoom />))
    const prompt = host.querySelector('textarea')!
    const event = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(event, 'clipboardData', {
      value: { files: [], items: [{ kind: 'string', type: 'text/plain' }], types: ['text/plain'] }
    })

    prompt.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(host.querySelectorAll('.image-room__reference')).toHaveLength(0)
    await act(async () => root.unmount())
  })

  it('highlights the reference area and adds a dropped image', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    const file = new File(['image'], 'dropped.webp', { type: 'image/webp' })

    await act(async () => root.render(<ImageGenerationRoom />))
    const dropZone = host.querySelector('.image-room__references')!
    const dragEnter = new Event('dragenter', { bubbles: true, cancelable: true })
    Object.defineProperty(dragEnter, 'dataTransfer', { value: fileTransfer(file) })

    await act(async () => dropZone.dispatchEvent(dragEnter))
    expect(dropZone.classList.contains('image-room__references--dragging')).toBe(true)

    const drop = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(drop, 'dataTransfer', { value: fileTransfer(file) })
    await act(async () => {
      dropZone.dispatchEvent(drop)
      await Promise.resolve()
    })

    expect(drop.defaultPrevented).toBe(true)
    expect(dropZone.classList.contains('image-room__references--dragging')).toBe(false)
    expect(host.querySelectorAll('.image-room__reference')).toHaveLength(1)
    await act(async () => root.unmount())
  })
})
