'use client';

import { useEffect, useState } from 'react';

const DURATION_MS = 5 * 60 * 60 * 1000;

function formatTime(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function CountdownTimer() {
  const [remaining, setRemaining] = useState(DURATION_MS);

  useEffect(() => {
    let endTime = Date.now() + DURATION_MS;

    const interval = setInterval(() => {
      const diff = endTime - Date.now();

      if (diff <= 0) {
        endTime = Date.now() + DURATION_MS;
        setRemaining(DURATION_MS);
      } else {
        setRemaining(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="font-mono font-bold text-sm sm:text-base text-white tabular-nums bg-black/15 px-3 py-1.5 rounded-lg">
      {formatTime(remaining)}
    </span>
  );
}
