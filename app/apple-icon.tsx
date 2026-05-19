import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 90,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <div style={{ flex: 1, background: '#009246', height: '100%' }} />
        <div style={{ flex: 1, background: '#FFFFFF', height: '100%' }} />
        <div style={{ flex: 1, background: '#CE2B37', height: '100%' }} />
      </div>
    ),
    size
  )
}
