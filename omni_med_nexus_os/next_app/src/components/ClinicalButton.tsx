import React from 'react';

interface ClinicalButtonProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'alert' | 'success';
}

export const ClinicalButton: React.FC<ClinicalButtonProps> = ({ label, icon, onClick, variant = 'primary' }) => {
  let colorClass = 'bg-teal-500 hover:bg-teal-600';
  if (variant === 'alert') colorClass = 'bg-pulse-alertRed hover:bg-red-600';
  if (variant === 'success') colorClass = 'bg-pulse-alertGreen hover:bg-green-600 text-black';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold transition-colors ${colorClass}`}
    >
      {icon}
      {label}
    </button>
  );
};
