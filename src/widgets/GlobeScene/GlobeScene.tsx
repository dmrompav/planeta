import { useEffect, useRef } from 'react';
import { generateGlobe } from './lib/generateGlobe';

export const GlobeScene = () => {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      generateGlobe(ref.current);
    }
  }, []);

  return (
    <canvas ref={ref} id="canvas__globe-scene" className="w-screen h-screen" />
  );
};
