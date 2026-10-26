import { afterEach, describe, expect, it, vi } from 'vitest'
import { uploadedImageKey, uploadsApi } from '../../../src/shared/api/uploads'
import { clients, httpStub } from '../../helpers/http'

const http = httpStub(clients.admin)
afterEach(() => vi.unstubAllGlobals())
describe('image upload API contracts', () => {
  it('sends the actual File in multipart form data', async () => {
    const file = new File(['image'], 'room.png', { type: 'image/png' })
    http.reply({ key: 'abcd.png', url: 'https://example.com/abcd.png' })
    expect(await uploadsApi.uploadImage(file)).toEqual({ key: 'abcd.png', url: 'https://example.com/abcd.png' })
    const request = http.last()
    expect(request).toMatchObject({ method: 'post', url: '/admin/uploads/images' })
    expect(request.body).toBeInstanceOf(FormData)
    if (!(request.body instanceof FormData)) throw new Error('Expected FormData')
    expect(request.body.get('image')).toBe(file)
  })
  it('encodes an uploaded file key when deleting', async () => {
    http.reply(null)
    await expect(uploadsApi.deleteImage('folder/a.png')).resolves.toBeNull()
    expect(http.last()).toMatchObject({ method: 'delete', url: '/admin/uploads/images/folder%2Fa.png' })
  })
  it('surfaces upload failures', async () => {
    http.raw({ success: false, data: null, message: 'File too large' })
    await expect(uploadsApi.uploadImage(new File(['x'], 'room.png'))).rejects.toThrow('File too large')
  })
  it.each([
    ['https://example.com/images/abcd-1234.png?version=1', 'abcd-1234.png'],
    ['/images/ABCD.JPG', 'ABCD.JPG'], ['/images/abcd.webp', 'abcd.webp'], ['/images/abcd.gif', 'abcd.gif'],
    ['/room-placeholder.svg', null], ['https://example.com/room.png', null],
    ['http://[', null], [undefined, null], ['', null],
  ])('recognizes the current key format in %s', (url, expected) => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost' } })
    expect(uploadedImageKey(url)).toBe(expected)
  })
})
