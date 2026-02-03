import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const DiagnosticoUBS = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(id !== 'novo');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nome_relatorio: '',
    nome_ubs: '',
    infraestrutura_adequada: 'sim',
    equipamentos_suficientes: 'sim',
    equipe_completa: 'sim',
    medicamentos_disponiveis: 'sim',
    acesso_comunidade: '',
    observacoes: '',
    status: 'DRAFT'
  });

  useEffect(() => {
    if (id !== 'novo') {
      const fetchDiagnostico = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(`/api/ubs/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setFormData(response.data);
          setLoading(false);
        } catch (err) {
          setError('Erro ao carregar diagnóstico');
          setLoading(false);
        }
      };

      fetchDiagnostico();
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = id === 'novo' ? '/api/ubs' : `/api/ubs/${id}`;
      const method = id === 'novo' ? 'post' : 'put';
      
      await axios[method](url, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate('/relatorios');
    } catch (err) {
      setError('Erro ao salvar diagnóstico');
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      <div className="container mx-auto mt-10 max-w-2xl">
        <h1 className="text-3xl font-bold mb-5">{id === 'novo' ? 'Novo Diagnóstico Situacional' : 'Editar Diagnóstico'}</h1>
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome_relatorio">
              Nome do Relatório
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="nome_relatorio"
              type="text"
              name="nome_relatorio"
              value={formData.nome_relatorio}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome_ubs">
              Nome da UBS
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="nome_ubs"
              type="text"
              name="nome_ubs"
              value={formData.nome_ubs}
              onChange={handleChange}
              required
            />
          </div>

          {/* A estrutura do formulário em si, com todas as questões, será adicionada aqui */}

          <div className="flex items-center justify-between mt-6">
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Salvar Diagnóstico
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DiagnosticoUBS;
