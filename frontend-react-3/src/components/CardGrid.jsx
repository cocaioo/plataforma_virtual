import React from 'react';
import Card from './Card';
import { 
  ClipboardDocumentListIcon, 
  DocumentPlusIcon, 
  ClockIcon, 
  BookOpenIcon, 
  LifebuoyIcon, 
  UsersIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';

const CardGrid = () => {
  const cards = [
    {
      title: 'Novo relatório situacional',
      to: '/diagnostico-ubs',
      icon: DocumentPlusIcon,
      inDevelopment: false,
    },
    {
      title: 'Gerenciar relatórios situacionais',
      to: '/relatorios-situacionais',
      icon: ClipboardDocumentListIcon,
      inDevelopment: false,
    },
    {
      title: 'Marcação de Consultas',
      to: '#',
      icon: ClockIcon,
      inDevelopment: true,
    },
    {
      title: 'Materiais Educativos',
      to: '#',
      icon: BookOpenIcon,
      inDevelopment: true,
    },
    {
      title: 'Suporte e Feedback',
      to: '#',
      icon: LifebuoyIcon,
      inDevelopment: true,
    },
    {
      title: 'Gestão de Equipes e Microáreas',
      to: '#',
      icon: UsersIcon,
      inDevelopment: true,
    },
    {
      title: 'Relatórios e Priorizações',
      to: '#',
      icon: ChartBarIcon,
      inDevelopment: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} {...card} />
      ))}
    </div>
  );
};

export default CardGrid;
