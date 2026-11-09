// Profile photo preparation: validate, then center-crop and resize to a
// 256×256 JPEG so the stored image stays small (typically 15–40 KB).
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const PHOTO_MAX_INPUT_BYTES = 5 * 1024 * 1024
const SIZE = 256

export function validatePhotoFile(file) {
  if (!file) return "Pilih file foto."
  if (!PHOTO_TYPES.includes(file.type)) return "Format foto harus JPG, PNG, atau WebP."
  if (file.size > PHOTO_MAX_INPUT_BYTES) return "Ukuran foto maksimal 5 MB."
  return null
}

export function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const side = Math.min(img.naturalWidth, img.naturalHeight)
      if (!side) return reject(new Error("Gambar tidak dapat dibaca."))
      const canvas = document.createElement("canvas")
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext("2d")
      ctx.fillStyle = "#ffffff" // transparent PNGs become white, not black
      ctx.fillRect(0, 0, SIZE, SIZE)
      ctx.imageSmoothingQuality = "high"
      ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, SIZE, SIZE)
      resolve(canvas.toDataURL("image/jpeg", 0.85))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("File bukan gambar yang valid."))
    }
    img.src = url
  })
}
