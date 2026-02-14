import React from 'react';
import CardGrid from '../components/CardGrid';

const Dashboard = () => {
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  return (
    <div className="container mx-auto p-8">
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">Bem-vindo à Plataforma UBS</h1>
        <p className="mt-2 text-gray-600">
          Você está autenticado como <strong className="capitalize">{user?.role?.toLowerCase() || 'Usuário'}</strong>.
        </p>
      </div>

      <CardGrid />
    </div>
  );
};

export default Dashboard;