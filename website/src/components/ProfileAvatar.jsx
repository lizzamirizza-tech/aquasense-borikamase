import { useState } from "react"
import { photoUrl } from "../services/api.js"

// Circular avatar. Fallback order: uploaded photo → default user icon.
// A photo that fails to load (deleted, network error) falls back as well,
// so a broken image is never shown.
function DefaultAvatar() {
  return (
    <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden="true">
      <rect width="40" height="40" fill="#22262c" />
      <circle cx="20" cy="15.5" r="7" fill="#5d6570" />
      <path d="M6.5 36.5c1.8-7 7-10.8 13.5-10.8s11.7 3.8 13.5 10.8" fill="#5d6570" />
    </svg>
  )
}

export default function ProfileAvatar({ user, src, size = 40, className = "" }) {
  const url = src ?? (user?.has_photo ? photoUrl(user.photo_version) : null)
  const [failedUrl, setFailedUrl] = useState(null)
  const showPhoto = url && failedUrl !== url
  const name = displayNameOf(user)

  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full border border-line bg-surface-alt ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Profile photo of ${name}`}
    >
      {showPhoto ? (
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailedUrl(url)} draggable={false} />
      ) : (
        <DefaultAvatar />
      )}
    </span>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function displayNameOf(user) {
  return user?.display_name?.trim() || "Unknown"
}

// eslint-disable-next-line react-refresh/only-export-components
export function usernameOf(user) {
  return user?.username?.trim() || "Unknown"
}
