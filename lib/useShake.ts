import { useEffect } from 'react';
import { Accelerometer } from 'expo-sensors';

export function useShake(onShake: () => void, threshold = 2.5) {
  useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0;
    let lastTime = Date.now();

    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const now = Date.now();
      if (now - lastTime < 500) return;

      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);

      if (deltaX + deltaY + deltaZ > threshold) {
        lastTime = now;
        onShake();
      }

      lastX = x;
      lastY = y;
      lastZ = z;
    });

    return () => subscription.remove();
  }, [onShake]);
}