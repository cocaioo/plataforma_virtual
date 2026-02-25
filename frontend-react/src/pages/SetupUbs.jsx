import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../components/ui/Notifications';
import { api } from '../services/api';
import { ubsService } from '../services/ubsService';

const InputField = ({ label, name, value, onChange, type = 'text', required, placeholder }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      name={name}
      id={name}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      required={required}
    />
  </div>
);

const TextAreaField = ({ label, name, value, onChange, placeholder }) => (
  <div className="mb-4">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <textarea
      name={name}
      id={name}
      value={value || ''}
      onChange={onChange}
      placeholder={placeholder}
      rows={4}
      className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    />
  </div>
);

const SetupUbs = () => {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingUbs, setExistingUbs] = useState(null);

  const [form, setForm] = useState({
    nome_ubs: '',
    nome_relatorio: '',
    cnes: '',
    area_atuacao: '',
    numero_habitantes_ativos: '',
    numero_microareas: '',
    numero_familias_cadastradas: '',
    numero_domicilios: '',
    domicilios_rurais: '',
    identificacao_equipe: '',
    responsavel_nome: '',
    responsavel_cargo: '',
    responsavel_contato: '',
    data_inauguracao: '',
    data_ultima_reforma: '',
  });

  useEffect(() => {
    let active = true;
    const loadExisting = async () => {
      try {
        const data = await ubsService.getSingleUbs();
        if (!active) return;
        setExistingUbs(data);
        if (data) {
          setForm({
            nome_ubs: data.nome_ubs || '',
            nome_relatorio: data.nome_relatorio || '',
            cnes: data.cnes || '',
            area_atuacao: data.area_atuacao || '',
            numero_habitantes_ativos: data.numero_habitantes_ativos ?? '',
            numero_microareas: data.numero_microareas ?? '',
            numero_familias_cadastradas: data.numero_familias_cadastradas ?? '',
            numero_domicilios: data.numero_domicilios ?? '',
            domicilios_rurais: data.domicilios_rurais ?? '',
            identificacao_equipe: data.identificacao_equipe || '',
            responsavel_nome: data.responsavel_nome || '',
            responsavel_cargo: data.responsavel_cargo || '',
            responsavel_contato: data.responsavel_contato || '',
            data_inauguracao: data.data_inauguracao || '',
            data_ultima_reforma: data.data_ultima_reforma || '',
          });
        }
      } catch (error) {
        if (active) setExistingUbs(null);
      } finally {
        if (active) setChecking(false);
      }
    };

    loadExisting();
    return () => { active = false; };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nome_ubs: form.nome_ubs.trim(),
        nome_relatorio: form.nome_relatorio || null,
        cnes: form.cnes.trim(),
        area_atuacao: form.area_atuacao.trim(),
        numero_habitantes_ativos: form.numero_habitantes_ativos ? Number(form.numero_habitantes_ativos) : 0,
        numero_microareas: form.numero_microareas ? Number(form.numero_microareas) : 0,
        numero_familias_cadastradas: form.numero_familias_cadastradas ? Number(form.numero_familias_cadastradas) : 0,
        numero_domicilios: form.numero_domicilios ? Number(form.numero_domicilios) : 0,
        domicilios_rurais: form.domicilios_rurais ? Number(form.domicilios_rurais) : null,
        identificacao_equipe: form.identificacao_equipe || null,
        responsavel_nome: form.responsavel_nome || null,
        responsavel_cargo: form.responsavel_cargo || null,
        responsavel_contato: form.responsavel_contato || null,
        data_inauguracao: form.data_inauguracao || null,
        data_ultima_reforma: form.data_ultima_reforma || null,
      };

      if (existingUbs?.id) {
        await api.request(`/ubs/${existingUbs.id}`, { method: 'PATCH', body: payload, requiresAuth: true });
        notify({ type: 'success', message: 'UBS atualizada com sucesso.' });
      } else {
        await api.request('/ubs', { method: 'POST', body: payload, requiresAuth: true });
        notify({ type: 'success', message: 'UBS configurada com sucesso.' });
      }
      navigate('/dashboard');
    } catch (error) {
      notify({ type: 'error', message: error.message || 'Erro ao salvar configuracao da UBS.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      {checking && (
        <div className="bg-white shadow-md rounded-lg p-6 mb-8">
          <p className="text-gray-600">Carregando configuracao da UBS...</p>
        </div>
      )}

      {!checking && (
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">
          {existingUbs ? 'Editar UBS' : 'Configuracao inicial da UBS'}
        </h1>
        <p className="mt-2 text-gray-600">
          {existingUbs
            ? 'Atualize as informacoes principais da unidade.'
            : 'Preencha os dados principais para ativar a plataforma.'}
        </p>
      </div>

      )}

      {!checking && (
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField label="Nome da UBS" name="nome_ubs" value={form.nome_ubs} onChange={handleChange} required />
          <InputField label="CNES" name="cnes" value={form.cnes} onChange={handleChange} required />
          <InputField label="Nome do relatorio" name="nome_relatorio" value={form.nome_relatorio} onChange={handleChange} />
          <InputField label="Area de atuacao" name="area_atuacao" value={form.area_atuacao} onChange={handleChange} required />
          <InputField label="Populacao adscrita" name="numero_habitantes_ativos" value={form.numero_habitantes_ativos} onChange={handleChange} type="number" />
          <InputField label="Numero de microareas" name="numero_microareas" value={form.numero_microareas} onChange={handleChange} type="number" />
          <InputField label="Familias cadastradas" name="numero_familias_cadastradas" value={form.numero_familias_cadastradas} onChange={handleChange} type="number" />
          <InputField label="Numero de domicilios" name="numero_domicilios" value={form.numero_domicilios} onChange={handleChange} type="number" />
          <InputField label="Domicilios rurais" name="domicilios_rurais" value={form.domicilios_rurais} onChange={handleChange} type="number" />
          <InputField label="Identificacao da equipe" name="identificacao_equipe" value={form.identificacao_equipe} onChange={handleChange} />
          <InputField label="Responsavel" name="responsavel_nome" value={form.responsavel_nome} onChange={handleChange} />
          <InputField label="Cargo do responsavel" name="responsavel_cargo" value={form.responsavel_cargo} onChange={handleChange} />
          <InputField label="Contato do responsavel" name="responsavel_contato" value={form.responsavel_contato} onChange={handleChange} />
          <InputField label="Data de inauguracao" name="data_inauguracao" value={form.data_inauguracao} onChange={handleChange} type="date" />
          <InputField label="Data da ultima reforma" name="data_ultima_reforma" value={form.data_ultima_reforma} onChange={handleChange} type="date" />
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow disabled:opacity-60"
          >
            {saving ? 'Salvando...' : existingUbs ? 'Salvar alteracoes' : 'Salvar configuracao'}
          </button>
        </div>
      </form>
      )}
    </div>
  );
};

export default SetupUbs;
