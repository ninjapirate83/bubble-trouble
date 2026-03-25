import { useEffect } from 'react';

const CONTROL_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", " "];

export function useKeyboard(keysRef) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (CONTROL_KEYS.includes(e.key)) e.preventDefault();
      keysRef.current[e.key] = true;
    };
    const onKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [keysRef]);
}
