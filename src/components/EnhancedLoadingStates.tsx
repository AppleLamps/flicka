import React from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './SkeletonLoader';

interface LoadingDotsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ 
  className, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  };

  return (
    <div className={cn('loading-dots', className)}>
      <span className={cn('bg-current rounded-full', sizeClasses[size])} />
      <span className={cn('bg-current rounded-full', sizeClasses[size])} />
      <span className={cn('bg-current rounded-full', sizeClasses[size])} />
    </div>
  );
};

interface LoadingWaveProps {
  className?: string;
  height?: string;
}

export const LoadingWave: React.FC<LoadingWaveProps> = ({ 
  className, 
  height = 'h-2' 
}) => {
  return (
    <div className={cn(
      'loading-wave rounded-full bg-muted',
      height,
      className
    )} />
  );
};

interface LoadingPulseProps {
  children: React.ReactNode;
  className?: string;
}

export const LoadingPulse: React.FC<LoadingPulseProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn('loading-pulse', className)}>
      {children}
    </div>
  );
};

interface ProgressBarProps {
  progress: number;
  className?: string;
  showText?: boolean;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'error';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className,
  showText = false,
  variant = 'default'
}) => {
  const variantClasses = {
    default: 'bg-primary',
    accent: 'bg-accent',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500'
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn('relative', className)}>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantClasses[variant]
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-foreground">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
};

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  animate?: boolean;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className,
  animate = true
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'h-4 bg-muted rounded',
            animate && 'animate-pulse',
            // Vary width for more realistic skeleton
            index === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
};

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showText?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 40,
  strokeWidth = 4,
  className,
  showText = false
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-accent transition-all duration-300 ease-out"
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
};