import { ReactNode } from 'react';

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<ContainerSize, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
};

interface ContainerProps {
  size?: ContainerSize;
  children: ReactNode;
  className?: string;
}

/**
 * Standardised max-width container with responsive horizontal padding.
 *
 * Sizes:
 *   sm  – 672 px  (compact forms, thank-you pages)
 *   md  – 768 px  (user dashboard, form submission)
 *   lg  – 1024 px (admin dashboard, form editor)
 *   xl  – 1280 px (summary workspace, wide grids)
 */
export default function Container({
  size = 'lg',
  children,
  className = '',
}: ContainerProps) {
  return (
    <div
      className={`${sizeClasses[size]} mx-auto w-full px-4 sm:px-6 lg:px-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
