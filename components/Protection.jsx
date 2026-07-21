'use client';

import { useEffect } from 'react';

function downloadBlob(filename, content) {
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateDllContent(seed) {
  const bytes = new Uint8Array(2048);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (seed * (i + 1) * 7 + i * 13) & 0xff;
  }
  return bytes;
}

export default function Protection() {
  useEffect(() => {
    function handleKeyDown(e) {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 's') {
        e.preventDefault();
        e.stopPropagation();

        downloadBlob('s63guard.dll', generateDllContent(42));
        setTimeout(() => downloadBlob('s63category/stupxd.dll', generateDllContent(17)), 200);
        setTimeout(() => downloadBlob('s63category/yeban.dll', generateDllContent(99)), 400);

        return false;
      }

      if (e.key === 'F12') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (ctrl && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (ctrl && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (ctrl && (e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }

    function handleContextMenu(e) {
      e.preventDefault();
      return false;
    }

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, []);

  return null;
}
