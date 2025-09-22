import React from 'react';
import { StarIcon as HeroStarIcon } from '@heroicons/react/24/outline';

export const StarIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    return <HeroStarIcon {...props} />;
};
