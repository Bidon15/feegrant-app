import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 14,
          background: '#0a0c14',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          fontFamily: 'monospace',
          fontWeight: 'bold',
          color: '#22c55e',
          textShadow: '0 0 8px #22c55e',
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
