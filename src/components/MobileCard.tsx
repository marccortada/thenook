import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className,
  title,
  description,
  icon,
  padding = 'md',
  hover = false
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2 sm:p-3',
    md: 'p-3 sm:p-4',
    lg: 'p-4 sm:p-6'
  };

  return (
    <Card className={cn(
      'w-full',
      hover && 'hover:shadow-md transition-shadow cursor-pointer',
      className
    )}>
      {(title || description) && (
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            {icon}
            <span>{title}</span>
          </CardTitle>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className={paddingClasses[padding]}>
        {children}
      </CardContent>
    </Card>
  );
};

export default MobileCard;