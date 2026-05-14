import React from 'react';

interface NeumorphicPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const NeumorphicPanel: React.FC<NeumorphicPanelProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-[#E0F7FA] rounded-[20px] p-6 shadow-[5px_5px_10px_#b3c6c9,-5px_-5px_10px_#ffffff] ${className}`}>
      {children}
    </div>
  );
};
