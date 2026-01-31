import * as React from 'react';

export function LegacyAppRedirect(props: { to: string }) {
  React.useEffect(() => {
    const to = props.to || '/app#/today';
    window.location.replace(to);
  }, [props.to]);

  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <div className="text-sm text-muted-foreground">Redirecting…</div>
    </div>
  );
}

