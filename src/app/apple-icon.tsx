import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 80,
          background: 'linear-gradient(135deg, #0a0c14 0%, #111827 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          color: '#22c55e',
          textShadow: '0 0 20px #22c55e, 0 0 40px #22c55e50',
        }}
      >
        {'>_b'}
      </div>
    ),
    {
      ...size,
    }
  );
}
