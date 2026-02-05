import React from 'react';

const AppointmentList = ({ appointments, onCancel, onReschedule, showActions = true }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'AGENDADO': return 'bg-blue-100 text-blue-800';
      case 'CANCELADO': return 'bg-red-100 text-red-800';
      case 'REALIZADO': return 'bg-green-100 text-green-800';
      case 'REAGENDADO': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!appointments?.length) {
    return <p className="text-gray-500 text-center py-4">Nenhum agendamento encontrado.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profissional</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Observações</th>
            {showActions && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {appointments.map((apt) => (
            <tr key={apt.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(apt.data_hora).toLocaleString('pt-BR')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                <div className="font-medium">{apt.nome_profissional || 'N/A'}</div>
                <div className="text-xs text-gray-500">{apt.cargo_profissional}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(apt.status)}`}>
                  {apt.status}
                </span>
              </td>
              <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                {apt.observacoes || '-'}
              </td>
              {showActions && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {apt.status === 'AGENDADO' && (
                    <>
                      <button 
                        onClick={() => onReschedule(apt)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Reagendar
                      </button>
                      <button 
                        onClick={() => onCancel(apt.id)}
                        className="text-red-600 hover:text-red-900"
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
