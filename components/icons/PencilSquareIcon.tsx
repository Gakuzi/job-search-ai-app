import React from 'react';
import { PencilSquareIcon as HeroPencilSquareIcon } from '@heroicons/react/24/outline';

/**
 * A wrapper component for the Heroicons PencilSquareIcon.
 * This allows for consistent styling and usage across the app.
 */
export const PencilSquareIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => {
    return <HeroPencilSquareIcon {...props} />;
};
