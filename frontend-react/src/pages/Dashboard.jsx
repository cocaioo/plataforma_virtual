import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CardGrid from '../components/CardGrid';
import { ubsService } from '../services/ubsService';

const Dashboard = () => {
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const role = (user?.role || 'USER').toUpperCase();
  const canSetupUbs = ['PROFISSIONAL', 'GESTOR'].includes(role);
  const [hasUbs, setHasUbs] = useState(null);

  useEffect(() => {
    let active = true;
    const loadUbs = async () => {
      if (!canSetupUbs) return;
      try {
        const data = await ubsService.getSingleUbs();
        if (active) setHasUbs(Boolean(data));
      } catch (error) {
        if (active) setHasUbs(false);
      }
    };

    loadUbs();
    return () => { active = false; };
  }, [canSetupUbs]);

  const quickLinks = [
    {
      label: 'Dashboard',
      to: '/dashboard',
      tone: 'border-slate-200 bg-slate-50 text-slate-700',
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO'],
    },
    {
      label: 'Gerenciar Relatórios Situacionais',
      to: '/relatorios-situacionais',
      tone: 'border-blue-100 bg-blue-50 text-blue-700',
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO'],
    },
    {
      label: 'Marcação de Consultas',
      to: '/agendamento',
      tone: 'border-sky-100 bg-sky-50 text-sky-700',
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO'],
    },
    {
      label: 'Suporte e Feedback',
      to: '/suporte-feedback',
      tone: 'border-amber-100 bg-amber-50 text-amber-700',
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR', 'RECEPCAO'],
    },
    {
      label: 'Mapa de problemas e Intervenções',
      to: '/mapa-problemas-intervencoes',
      tone: 'border-orange-100 bg-orange-50 text-orange-700',
      allowed: ['USER', 'PROFISSIONAL', 'GESTOR'],
    },
    {
      label: 'Gerenciar agentes e microáreas',
      to: '/gestao-equipes',
      tone: 'border-indigo-100 bg-indigo-50 text-indigo-700',
      allowed: ['GESTOR', 'RECEPCAO'],
    },
    {
      label: 'Materiais',
      to: '/materiais-educativos',
      tone: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      allowed: ['PROFISSIONAL', 'GESTOR'],
    },
    {
      label: 'Cronograma',
      to: '/cronograma',
      tone: 'border-teal-100 bg-teal-50 text-teal-700',
      allowed: ['PROFISSIONAL', 'GESTOR'],
    },
    {
      label: hasUbs ? 'Editar UBS' : 'Configurar UBS',
      to: '/setup-ubs',
      tone: 'border-violet-100 bg-violet-50 text-violet-700',
      allowed: ['PROFISSIONAL', 'GESTOR'],
    },
    {
      label: 'Notificações',
      to: '/notificacoes',
      tone: 'border-rose-100 bg-rose-50 text-rose-700',
      allowed: ['GESTOR', 'RECEPCAO'],
    },
    {
      label: 'Mensagens',
      to: '/gerenciar-mensagens',
      tone: 'border-fuchsia-100 bg-fuchsia-50 text-fuchsia-700',
      allowed: ['RECEPCAO'],
    },
  ];

  return (
    <div className="container mx-auto p-8">
      <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-6 mb-6 rise-fade">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Bem-vindo à Plataforma UBS</h1>
        <p className="mt-2 text-gray-600 dark:text-slate-300">
          Você está autenticado como <strong className="capitalize">{user?.role?.toLowerCase() || 'Usuário'}</strong>.
        </p>
      </div>

      <CardGrid />
    </div>
  );
};

export default Dashboard;