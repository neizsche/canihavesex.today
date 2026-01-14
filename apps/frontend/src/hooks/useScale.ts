import * as React from 'react';

type Scale = 'small' | 'medium' | 'large';

export function useScale() {
    const [scale, setScale] = React.useState<Scale>('medium');

    React.useEffect(() => {
        const updateScale = () => {
            const h = window.innerHeight;
            let nextScale: Scale = 'medium';

            if (h < 720) nextScale = 'small';
            else if (h > 950) nextScale = 'large';
            else nextScale = 'medium';

            setScale(nextScale);
            document.documentElement.setAttribute('data-scale', nextScale);
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, []);

    return scale;
}
