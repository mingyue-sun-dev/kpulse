'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = true }: CardProps) {
  const hoverClass = hover ? 'hover:shadow-lg hover:-translate-y-1 transition-all duration-300' : '';
  
  return (
    <div className={`bg-white rounded-xl shadow-md p-6 ${hoverClass} ${className}`}>
      {children}
    </div>
  );
}