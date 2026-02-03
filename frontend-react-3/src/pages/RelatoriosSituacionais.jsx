import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const RelatoriosSituacionais = () => {
  const [relatorios, setRelatorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRelatorios = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/ubs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRelatorios(response.data.items);
        setLoading(false);
      } catch (err) {
        setError('Erro ao carregar relatórios');
        setLoading(false);
      }
    };

    fetchRelatorios();
  }, []);

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <div className="container mx-auto mt-10">
        <h1 className="text-3xl font-bold mb-5">Relatórios Situacionais</h1>
        <div className="bg-white shadow-md rounded my-6">
          <table className="min-w-max w-full table-auto">
            <thead>
              <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Nome do Relatório</th>
                <th className="py-3 px-6 text-left">Nome da UBS</th>
                <th className="py-3 px-6 text-center">Status</th>
                <th className="py-3 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {relatorios.map(relatorio => (
                <tr key={relatorio.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left whitespace-nowrap">{relatorio.nome_relatorio}</td>
                  <td className="py-3 px-6 text-left">{relatorio.nome_ubs}</td>
                  <td className="py-3 px-6 text-center">
                    <span className={`bg-${relatorio.status === 'DRAFT' ? 'yellow' : 'green'}-200 text-gray-600 py-1 px-3 rounded-full text-xs`}>
                      {relatorio.status}
                    </span>
                  </td>
                  <td className="py-3 px-6 text-center">
                    <Link to={`/diagnostico/${relatorio.id}`} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                      Ver/Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosSituacionais;
