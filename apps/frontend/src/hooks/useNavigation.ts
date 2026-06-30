import * as React from 'react';

export function useNavigation() {
  const navigate = React.useCallback((path: string) => {
    const formattedPath = path.startsWith('/') ? path : `/${path}`;
    window.location.hash = `#${formattedPath}`;
  }, []);

  const back = React.useCallback(() => {
    window.history.back();
  }, []);

  return { navigate, back };
}
