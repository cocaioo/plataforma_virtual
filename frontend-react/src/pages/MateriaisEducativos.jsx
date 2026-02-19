import { useEffect, useState, useCallback } from 'react';
import { api } from '../services/api';
import { useNotifications } from '../components/ui/Notifications';

const BASE_API = import.meta.env.PROD
  ? ''
  : import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const PUBLICO_ALVO_OPTIONS = [
  'Profissionais',
  'Usuarios',
];

const buildDownloadUrl = (fileId) => {
  const token = api.getToken();
  if (!token) return `/api/materiais/files/${fileId}/download`;
  return `/api/materiais/files/${fileId}/download?token=${encodeURIComponent(token)}`;
};

const MOCK_UBS_ADALTO = {
  id: 3,
  nome_ubs: 'ESF 41 - Adalto Parentes Sampaio',
  cnes: '0000000',
  area_atuacao: 'Baixa do Aragao, Parnaiba - PI',
  status: 'DRAFT',
};

const MateriaisEducativos = () => {
  const { notify, confirm } = useNotifications();
  const [ubsOptions, setUbsOptions] = useState([]);
  const [selectedUbs, setSelectedUbs] = useState('');
  const [materials, setMaterials] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingId, setUploadingId] = useState(null);
  const [fileInputs, setFileInputs] = useState({});
  const [createFile, setCreateFile] = useState(null);

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria: '',
    publico_alvo: '',
    ativo: true,
  });

  const loadUbs = useCallback(async () => {
    try {
      const data = await api.request('/ubs?page=1&page_size=100', { requiresAuth: true });
      const items = data?.items || [];
      const hasAdalto = items.some((u) => u.id === MOCK_UBS_ADALTO.id);
      const merged = hasAdalto ? items : [MOCK_UBS_ADALTO, ...items];
      setUbsOptions(merged);
      if (!selectedUbs && merged.length > 0) {
        setSelectedUbs(String(merged[0].id));
      }
    } catch (error) {
      setUbsOptions([MOCK_UBS_ADALTO]);
      if (!selectedUbs) setSelectedUbs(String(MOCK_UBS_ADALTO.id));
      notify({ type: 'error', message: 'Erro ao carregar UBS.' });
    }
  }, [notify, selectedUbs]);

  const loadMaterials = useCallback(async (ubsId) => {
    if (!ubsId) return;
    setIsLoading(true);
    try {
      const data = await api.request(`/materiais?ubs_id=${ubsId}`, { requiresAuth: true });
      setMaterials(data || []);
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao carregar materiais.' });
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadUbs();
  }, [loadUbs]);

  useEffect(() => {
    loadMaterials(selectedUbs);
  }, [loadMaterials, selectedUbs]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!selectedUbs) {
      notify({ type: 'warning', message: 'Selecione uma UBS.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('ubs_id', selectedUbs);
      formData.append('titulo', form.titulo);
      formData.append('descricao', form.descricao || '');
      formData.append('categoria', form.categoria || '');
      formData.append('publico_alvo', form.publico_alvo || '');
      formData.append('ativo', form.ativo ? 'true' : 'false');
      if (createFile) {
        if (createFile.size > MAX_FILE_SIZE_BYTES) {
          notify({ type: 'warning', message: 'Arquivo excede o limite de 20MB.' });
          setIsSubmitting(false);
          return;
        }
        formData.append('file', createFile);
      }

      const response = await fetch(`${BASE_API}/materiais`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${api.getToken() || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha ao criar material');
      }

      setForm({ titulo: '', descricao: '', categoria: '', publico_alvo: '', ativo: true });
      setCreateFile(null);
      await loadMaterials(selectedUbs);
      notify({ type: 'success', message: 'Material criado com sucesso.' });
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao criar material.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (materialId) => {
    const confirmed = await confirm({
      title: 'Remover material',
      message: 'Deseja remover este material e seus arquivos?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await api.request(`/materiais/${materialId}`, { method: 'DELETE', requiresAuth: true });
      await loadMaterials(selectedUbs);
      notify({ type: 'success', message: 'Material removido.' });
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao remover material.' });
    }
  };

  const handleUpload = async (materialId) => {
    const file = fileInputs[materialId];
    if (!file) {
      notify({ type: 'warning', message: 'Selecione um arquivo.' });
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      notify({ type: 'warning', message: 'Arquivo excede o limite de 20MB.' });
      return;
    }

    setUploadingId(materialId);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BASE_API}/materiais/${materialId}/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${api.getToken() || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Falha no upload');
      }

      setFileInputs((prev) => ({ ...prev, [materialId]: null }));
      await loadMaterials(selectedUbs);
      notify({ type: 'success', message: 'Arquivo enviado.' });
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao enviar arquivo.' });
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteFile = async (fileId) => {
    const confirmed = await confirm({
      title: 'Remover arquivo',
      message: 'Deseja remover este arquivo?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await api.request(`/materiais/files/${fileId}`, { method: 'DELETE', requiresAuth: true });
      await loadMaterials(selectedUbs);
      notify({ type: 'success', message: 'Arquivo removido.' });
    } catch (error) {
      notify({ type: 'error', message: 'Erro ao remover arquivo.' });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-6 mb-8">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Materiais Educativos</h1>
        <p className="text-gray-600 dark:text-slate-300 mt-2">
          Centralize orientacoes, documentos oficiais e anexos por UBS.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Novo material</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">UBS</label>
            <select
              value={selectedUbs}
              onChange={(e) => setSelectedUbs(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            >
              {ubsOptions.map((ubs) => (
                <option key={ubs.id} value={ubs.id}>
                  {ubs.nome_ubs}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Titulo</label>
            <input
              value={form.titulo}
              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Categoria</label>
            <input
              value={form.categoria}
              onChange={(e) => setForm((prev) => ({ ...prev, categoria: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
              placeholder="Ex.: PNAB, e-SUS"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Publico-alvo</label>
            <select
              value={form.publico_alvo}
              onChange={(e) => setForm((prev) => ({ ...prev, publico_alvo: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
            >
              <option value="">Selecione...</option>
              {PUBLICO_ALVO_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Descricao</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-gray-900 dark:text-slate-100"
              rows={3}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Arquivo inicial (opcional)</label>
            <input
              type="file"
              onChange={(e) => {
                const nextFile = e.target.files[0];
                if (nextFile && nextFile.size > MAX_FILE_SIZE_BYTES) {
                  notify({ type: 'warning', message: 'Arquivo excede o limite de 20MB.' });
                  e.target.value = '';
                  setCreateFile(null);
                  return;
                }
                setCreateFile(nextFile || null);
              }}
              className="mt-1 block w-full text-sm text-gray-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-slate-200 dark:hover:file:bg-slate-700"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm((prev) => ({ ...prev, ativo: e.target.checked }))}
            />
            Material ativo
          </label>
          <div className="md:col-span-2 text-right">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar material'}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-6">
        {isLoading && <p className="text-gray-500 dark:text-slate-400">Carregando materiais...</p>}
        {!isLoading && materials.length === 0 && (
          <p className="text-gray-500 dark:text-slate-400">Nenhum material cadastrado.</p>
        )}
        {materials.map((material) => (
          <div key={material.id} className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{material.titulo}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">{material.categoria || 'Sem categoria'}</p>
                {material.descricao && <p className="mt-2 text-gray-600 dark:text-slate-300">{material.descricao}</p>}
                <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  Publico-alvo: {material.publico_alvo || 'Nao informado'}
                </p>
              </div>
              <button
                onClick={() => handleDelete(material.id)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Remover
              </button>
            </div>

            <div className="mt-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <input
                  type="file"
                  onChange={(e) => {
                    const nextFile = e.target.files[0];
                    if (nextFile && nextFile.size > MAX_FILE_SIZE_BYTES) {
                      notify({ type: 'warning', message: 'Arquivo excede o limite de 20MB.' });
                      e.target.value = '';
                      setFileInputs((prev) => ({ ...prev, [material.id]: null }));
                      return;
                    }
                    setFileInputs((prev) => ({ ...prev, [material.id]: nextFile }));
                  }}
                  className="text-sm text-gray-600 dark:text-slate-400"
                />
                <button
                  onClick={() => handleUpload(material.id)}
                  disabled={uploadingId === material.id}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-3 py-1.5 rounded-md"
                >
                  {uploadingId === material.id ? 'Enviando...' : 'Enviar arquivo'}
                </button>
              </div>

              <ul className="mt-4 divide-y divide-gray-200">
                {material.files.map((file) => (
                  <li key={file.id} className="py-2 flex items-center justify-between">
                    <a
                      href={buildDownloadUrl(file.id)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      {file.original_filename}
                    </a>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Remover
                    </button>
                  </li>
                ))}
                {material.files.length === 0 && (
                  <li className="py-2 text-sm text-gray-500 dark:text-slate-400">Nenhum arquivo anexado.</li>
                )}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MateriaisEducativos;
