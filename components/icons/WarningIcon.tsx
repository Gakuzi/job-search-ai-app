import React from 'react';
import { ExclamationTriangleIcon as HeroWarningIcon } from '@heroicons/react/24/outline';

export const WarningIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    return <HeroWarningIcon {...props} />;
};
