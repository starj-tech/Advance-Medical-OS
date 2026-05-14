import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 shadow-lg ${className}`}>
      {children}
    </div>
  );
};
