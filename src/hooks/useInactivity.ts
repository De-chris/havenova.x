import { useState, useEffect, useRef } from 'react';

export const useInactivity = (timeout: number = 5000) => {
  const [isInactive, setIsInactive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const resetTimer = () => {
      lastActivityRef.current = Date.now();
      setIsInactive(false);
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      timerRef.current = setTimeout(() => {
        setIsInactive(true);
      }, timeout);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });
    
    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeout]);

  return isInactive;
};

export default useInactivity;
