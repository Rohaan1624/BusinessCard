import { supabase } from './supabase'

// Downscale client-side so business-card images stay small and fast.
async function downscale(file, maxDim = 1024) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
  return blob || file
}

export async function uploadCardImage(userId, cardId, kind, file) {
  const blob = await downscale(file)
  const path = `${userId}/${cardId}/${kind}-${Date.now()}.webp`
  const { error } = await supabase.storage
    .from('card-assets')
    .upload(path, blob, { contentType: 'image/webp', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('card-assets').getPublicUrl(path)
  return data.publicUrl
}
