import React from 'react';

const AppointmentList = ({ appointments, onCancel, onReschedule, showActions = true }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'AGENDADO': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300';
      case 'CANCELADO': return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
      case 'REALIZADO': return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
      case 'REAGENDADO': return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300';
      default: return 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-300';
    }
  };

  if (!appointments?.length) {
    return <p className="text-gray-500 dark:text-slate-400 text-center py-4">Nenhum agendamento encontrado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-sm rounded-lg">
        <thead className="bg-gray-50 dark:bg-slate-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Data/Hora</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Profissional</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Observações</th>
            {showActions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
          {appointments.map((apt) => (
            <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {new Date(apt.data_hora).toLocaleString('pt-BR')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">
                <div className="font-medium">{apt.nome_profissional || 'N/A'}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{apt.cargo_profissional}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(apt.status)}`}>
                  {apt.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400 max-w-xs truncate">
                {apt.observacoes || '-'}
              </td>
              {showActions && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {['AGENDADO', 'REAGENDADO'].includes(apt.status) && (
                    <>
                      <button
                        onClick={() => onReschedule(apt)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4"
                      >
                        Reagendar
                      </button>
                      <button
                        onClick={() => onCancel(apt.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AppointmentList;
