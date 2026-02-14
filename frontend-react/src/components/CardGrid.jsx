import React from 'react';
import Card from './Card';
import { 
  ClipboardDocumentListIcon, 
  ClockIcon, 
  BookOpenIcon, 
  LifebuoyIcon, 
  UsersIcon, 
  ChartBarIcon
} from '@heroicons/react/24/outline';

const CardGrid = () => {
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const role = user?.role || 'USER';

  const allCards = [
    {
      title: 'Gerenciar Relatórios Situacionais',
      to: '/relatorios-situacionais',
      icon: ClipboardDocumentListIcon,
      inDevelopment: false,
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO']
    },
    {
      title: 'Marcação de Consultas',
      to: '/agendamento',
      icon: ClockIcon,
      inDevelopment: false,
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO']
    },
    {
      title: 'Materiais Educativos',
      to: '#',
      icon: BookOpenIcon,
      inDevelopment: true,
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR']
    },
    {
      title: 'Suporte e Feedback',
      to: '#',
      icon: LifebuoyIcon,
      inDevelopment: true,
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO']
    },
    {
      title: 'Mapa de problemas e Intervenções',
      to: '/mapa-problemas-intervencoes',
      icon: ChartBarIcon,
      inDevelopment: false,
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR']
    },
    {
      title: 'Gestão de Equipes e Microáreas',
      to: '#',
      icon: UsersIcon,
      inDevelopment: true,
      allowed: ['GESTOR', 'RECEPCAO'] // Bloqueado para USER e PROFISSIONAL
    },
  ];

  const filteredCards = allCards.filter(card => card.allowed.includes(role));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {filteredCards.map((card, index) => (
        <Card key={index} {...card} />
      ))}
    </div>
  );
};

export default CardGrid;