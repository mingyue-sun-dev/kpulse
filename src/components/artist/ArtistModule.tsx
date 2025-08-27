import { ReactNode } from 'react';
import Card from '@/components/ui/Card';

interface ArtistModuleProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function ArtistModule({ title, children, className = '' }: ArtistModuleProps) {
  return (
    <Card className={className}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {children}
    </Card>
  );
}