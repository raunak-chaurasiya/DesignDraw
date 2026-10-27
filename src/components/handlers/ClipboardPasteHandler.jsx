import { useEffect } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';

export default function ClipboardPasteHandler() {
  const insertImage = useCanvasStore((state) => state.insertImage);

  useEffect(() => {
    const handlePaste = (e) => {
      // If typing in input or textarea, let default paste proceed
      const activeTag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA'].includes(activeTag)) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              const dataUrl = evt.target.result;
              insertImage(dataUrl);
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [insertImage]);

  return null;
}
