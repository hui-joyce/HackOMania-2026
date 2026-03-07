import { HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
        secondary: 'border border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100',
        destructive: 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
        outline: 'text-white border border-white',
        success: 'bg-green-100 text-green-700 hover:bg-green-200',
        warning: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
        urgent: 'bg-red-100 text-red-700 hover:bg-red-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };