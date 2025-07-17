'use client';

import React, { useState, useEffect, ReactNode } from 'react';

export const useClientMount = (): boolean => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};

export const useClientMountWithLoader = (
  loadingComponent?: ReactNode
) => {
  const mounted = useClientMount();

  const defaultLoader = React.createElement('div', {
    className: "h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
  });

  return {
    mounted,
    loader: loadingComponent || defaultLoader,
  };
};