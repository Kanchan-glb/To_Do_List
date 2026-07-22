import { useState, useEffect, useCallback } from 'react';
import { loadLayout, saveLayout, clearLayout } from '../utils/layoutStorage';

export function usePersistentLayout(pageName, defaultLayout) {
  const [layout, setLayout] = useState(() => loadLayout(pageName, defaultLayout));

  useEffect(() => {
    saveLayout(pageName, layout);
  }, [layout, pageName]);

  // Handle re-loading if the user changes or if storage changes in another tab
  useEffect(() => {
    const handleStorageChange = () => {
      setLayout(loadLayout(pageName, defaultLayout));
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [pageName, defaultLayout]);

  const resetLayout = useCallback(() => {
    clearLayout(pageName);
    setLayout(defaultLayout);
  }, [pageName, defaultLayout]);

  return { layout, setLayout, resetLayout };
}
