import { apiRequest } from './httpClient'

interface UploadTicket {
  uploadUrl: string
  publicUrl: string
  objectKey: string
  expiresInSeconds: number
  headers: {
    'content-type': string
  }
}

export async function uploadImageToOss(roomId: string, file: File) {
  const ticket = await apiRequest<UploadTicket>(`/api/uploads/${roomId}/image`, {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      size: file.size
    })
  })
  const uploadResponse = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: ticket.headers,
    body: file
  })
  if (!uploadResponse.ok) throw new Error('oss_upload_failed')
  return ticket.publicUrl
}
