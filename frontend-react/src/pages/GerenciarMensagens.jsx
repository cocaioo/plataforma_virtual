import { useState, useEffect } from 'react';
import { useNotifications } from '../components/ui/Notifications';
import { suporteFeedbackService } from '../services/suporteFeedbackService';
import {
  InboxIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeOpenIcon,
} from '@heroicons/react/24/outline';

const ASSUNTO_LABELS = {
  duvida: 'Dúvida',
  sugestao: 'Sugestão',
  problema: 'Problema Técnico',
};

const GerenciarMensagens = () => {
  const { notify } = useNotifications();
  const [mensagens, setMensagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atualizandoId, setAtualizandoId] = useState(null);

  const carregarMensagens = async () => {
    try {
      setLoading(true);
      const data = await suporteFeedbackService.listarFeedbacks();
      setMensagens(Array.isArray(data) ? data : []);
    } catch (err) {
      notify({ type: 'error', message: 'Erro ao carregar mensagens.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarMensagens();
  }, []);

  const marcarComoLida = async (id) => {
    try {
      setAtualizandoId(id);
      const atualizado = await suporteFeedbackService.atualizarStatus(id, 'LIDA');
      setMensagens((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...atualizado } : m))
      );
      notify({ type: 'success', message: 'Mensagem marcada como lida.' });
    } catch (err) {
      notify({ type: 'error', message: 'Erro ao atualizar status.' });
    } finally {
      setAtualizandoId(null);
    }
  };

  const formatarData = (dataStr) => {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPendentes = mensagens.filter((m) => m.status === 'PENDENTE').length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Cabeçalho */}
      <div className="mb-8 rise-fade">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Gerenciar Mensagens
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Visualize e gerencie as mensagens enviadas pelos usuários via Suporte e Feedback.
        </p>
      </div>

      {/* Contador */}
      <div className="mb-6 rise-fade stagger-1">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 shadow-md rounded-lg border border-gray-200 dark:border-slate-700">
          <InboxIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
            {mensagens.length} mensagem(ns) no total
          </span>
          {totalPendentes > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
              {totalPendentes} pendente(s)
            </span>
          )}
        </div>
      </div>

      {/* Lista de mensagens */}
      <div className="space-y-4 rise-fade stagger-2">
        {loading ? (
          <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-12 text-center">
            <svg
              className="animate-spin h-8 w-8 mx-auto text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">Carregando mensagens...</p>
          </div>
        ) : mensagens.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 shadow-md rounded-lg p-12 text-center">
            <EnvelopeOpenIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-slate-600" />
            <p className="mt-3 text-sm text-gray-500 dark:text-slate-400">Nenhuma mensagem recebida.</p>
          </div>
        ) : (
          mensagens.map((msg) => (
            <div
              key={msg.id}
              className={`bg-white dark:bg-slate-900 shadow-md rounded-lg overflow-hidden border-l-4 ${
                msg.status === 'PENDENTE'
                  ? 'border-l-yellow-400'
                  : 'border-l-emerald-400'
              }`}
            >
              <div className="p-5">
                {/* Header do card */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          {(msg.nome_usuario || '?')[0].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {msg.nome_usuario || 'Usuário desconhecido'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {msg.email_usuario || ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Badge de assunto */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {ASSUNTO_LABELS[msg.assunto] || msg.assunto}
                    </span>
                    {/* Badge de status */}
                    {msg.status === 'PENDENTE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                        <ClockIcon className="h-3 w-3" />
                        Pendente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        <CheckCircleIcon className="h-3 w-3" />
                        Lida
                      </span>
                    )}
                  </div>
                </div>

                {/* Corpo da mensagem */}
                <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {msg.mensagem}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-slate-700">
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {formatarData(msg.created_at)}
                  </span>

                  {msg.status === 'PENDENTE' && (
                    <button
                      onClick={() => marcarComoLida(msg.id)}
                      disabled={atualizandoId === msg.id}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      {atualizandoId === msg.id ? 'Atualizando...' : 'Marcar como lida'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GerenciarMensagens;
