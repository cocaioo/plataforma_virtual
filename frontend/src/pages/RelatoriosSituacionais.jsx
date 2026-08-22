import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useDebounce } from '../hooks/useDebounce';
import { useNotifications } from '../components/ui/Notifications';
import { ubsService } from '../services/ubsService';
import RelatorioPublicoDashboard from '../components/RelatorioPublicoDashboard';
import {
    PencilSquareIcon,
    TrashIcon,
    DocumentArrowDownIcon,
    PlusIcon,
    ChartBarIcon,
    UserGroupIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';

// --- COMPONENTES VISUAIS ---

const SectionCard = ({ title, subtitle, children, disabled, lockedMessage }) => (
    <div className={`page-panel mb-8 transition-opacity duration-300 ${disabled ? 'opacity-60 relative' : ''}`}>
        {disabled && lockedMessage && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 dark:bg-slate-800 bg-opacity-50 rounded-lg">
                <div className="bg-white dark:bg-slate-900 p-3 rounded shadow border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 font-medium text-sm text-center">
                    {lockedMessage}
                </div>
            </div>
        )}
        <div className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-6 py-4 rounded-t-2xl">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-6 ${disabled ? 'pointer-events-none' : ''}`}>
            {children}
        </div>
    </div>
);

const InputField = ({ label, name, value, onChange, type = 'text', helpText, placeholder, ...props }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            {label} {props.required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            name={name}
            id={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-600 focus:border-cyan-600 sm:text-sm dark:text-white dark:placeholder-slate-500"
            {...props}
        />
        {helpText && <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 italic">{helpText}</p>}
    </div>
);

const TextAreaField = ({ label, name, value, onChange, helpText, placeholder, ...props }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-slate-300">
            {label} {props.required && <span className="text-red-500">*</span>}
        </label>
        <textarea
            name={name}
            id={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            rows={props.rows || 4}
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-cyan-600 focus:border-cyan-600 sm:text-sm dark:text-white dark:placeholder-slate-500"
            {...props}
        />
        {helpText && <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 italic">{helpText}</p>}
    </div>
);

// --- SEÇÕES DO FORMULÁRIO ---

const IndicatorsSection = ({ ubsId, initialData, onUpdate }) => {
    const { notify, confirm } = useNotifications();
    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear - 1, currentYear, currentYear + 1];
    const indicatorPresetGroups = [
        {
            title: "Bloco 1: eSF e eAP",
            items: [
                { name: "Mais acesso a APS - Proporção de atendimentos programados", desc: "Acompanha o acesso oportuno à agenda programada." },
                { name: "Cuidado da pessoa com diabetes - Cobertura de monitoramento", desc: "Monitora o acompanhamento regular de diabetes." },
                { name: "Cuidado da pessoa com hipertensão - Cobertura de aferições", desc: "Avalia o monitoramento de pessoas com hipertensão." },
                { name: "Cuidado da gestante e puerpério - Consultas adequadas", desc: "Verifica o pré-natal conforme o protocolo." },
                { name: "Cuidado da mulher - Citopatológico e mamografia", desc: "Avalia a cobertura de exames preventivos." },
                { name: "Cuidado da pessoa idosa - Avaliações", desc: "Acompanha avaliações periódicas de pessoas idosas." },
                { name: "Cuidado no desenvolvimento infantil - Acompanhamento", desc: "Monitora o acompanhamento de crianças." },
            ],
        },
        {
            title: "Bloco 2: eMulti",
            items: [
                { name: "Ações interprofissionais eMulti - Proporção de ações coletivas", desc: "Registra atividades interprofissionais." },
                { name: "Média de atendimentos por pessoa assistida pela eMulti", desc: "Mede consultas por usuário assistido." },
            ],
        },
        {
            title: "Bloco 3: eSB",
            items: [
                { name: "Escovação supervisionada (faixa escolar)", desc: "Cobertura em escolas." },
                { name: "Primeira consulta odontológica programada", desc: "Proporção de primeiras consultas." },
                { name: "Tratamento odontológico concluído", desc: "Relação entre iniciados e concluídos." },
                { name: "Tratamento restaurador atraumático", desc: "Cobertura de procedimentos minimamente invasivos." },
                { name: "Procedimentos odontológicos preventivos", desc: "Proporção de ações preventivas." },
                { name: "Taxa de exodontias realizadas", desc: "Taxa de extrações odontológicas." },
            ],
        },
    ];
    const valueTypeOptions = [
        { value: "PERCENTUAL", label: "Porcentagem (%)", help: "Use valores de 0 a 100.", suffix: "%" },
        { value: "ABSOLUTO", label: "Absoluto", help: "Use valores absolutos (ex.: total de atendimentos).", suffix: "" },
        { value: "POR_1000", label: "Por 1000 habitantes", help: "Use taxa por 1000 habitantes.", suffix: " / 1000 hab." },
    ];
    const [showPresets, setShowPresets] = useState(false);
    const [formData, setFormData] = useState({
        nome_indicador: '',
        valor: '',
        meta: '',
        tipo_valor: 'PERCENTUAL',
        periodo_quadrimestre: '',
        periodo_ano: '',
        observacoes: ''
    });
    const valueType = valueTypeOptions.find(option => option.value === formData.tipo_valor) || valueTypeOptions[0];
    const valueStep = formData.tipo_valor === 'ABSOLUTO' ? '1' : '0.01';

    const formatIndicatorValue = (rawValue, tipoValor) => {
        if (rawValue === null || rawValue === undefined || rawValue === '') return '-';
        const parsed = Number(rawValue);
        const formatted = Number.isFinite(parsed) ? parsed.toString() : rawValue;
        const type = valueTypeOptions.find(option => option.value === tipoValor) || valueTypeOptions[0];
        if (type.value === 'PERCENTUAL') return `${formatted}%`;
        if (type.value === 'POR_1000') return `${formatted} / 1000 hab.`;
        return `${formatted}`;
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                nome_indicador: formData.nome_indicador,
                observacoes: formData.observacoes,
                valor: parseFloat(formData.valor) || 0,
                meta: formData.meta !== '' ? parseFloat(formData.meta) || 0 : null,
                tipo_valor: formData.tipo_valor,
                periodo_referencia: `${formData.periodo_quadrimestre}/${formData.periodo_ano}`
            };
            // Nota: Se o backend ainda não tiver a rota /indicators, essa chamada falhará.
            // Vou assumir que ela existe ou será implementada.
            await axios.post(`/api/ubs/${ubsId}/indicators`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setFormData({ nome_indicador: '', valor: '', meta: '', tipo_valor: 'PERCENTUAL', periodo_quadrimestre: '', periodo_ano: '', observacoes: '' });
            onUpdate();
        } catch(err) {
            notify({ type: 'error', message: 'Erro ao salvar o indicador.' });
        }
    }

    const handleDelete = async (indicatorId) => {
        const confirmed = await confirm({
            title: 'Excluir indicador',
            message: 'Deseja excluir este indicador?',
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
        });
        if (!confirmed) return;
        try {
            await axios.delete(`/api/ubs/indicators/${indicatorId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            onUpdate();
        } catch(err) {
            notify({ type: 'error', message: 'Erro ao excluir o indicador.' });
        }
    }

    return (
        <SectionCard title="Indicadores epidemiológicos" subtitle="Preencha ou atualize os principais indicadores. Use os atalhos para acelerar." disabled={!ubsId} lockedMessage="Salve o rascunho para habilitar os indicadores">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {initialData && initialData.map(ind => (
                    <div key={ind.id} className="p-4 border rounded bg-white dark:bg-slate-800 shadow-sm border-blue-100 dark:border-slate-700 relative group">
                        <button
                            onClick={() => handleDelete(ind.id)}
                            className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                        <h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm pr-6">{ind.nome_indicador}</h4>
                        <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">{formatIndicatorValue(ind.valor, ind.tipo_valor)}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Período: {ind.periodo_referencia || "-"}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">Meta: {formatIndicatorValue(ind.meta, ind.tipo_valor)}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">Tipo: {(valueTypeOptions.find(option => option.value === ind.tipo_valor) || valueTypeOptions[0]).label}</p>
                    </div>
                ))}
            </div>

            <div className="p-4 border rounded-md bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-green-900 dark:text-green-300 text-sm uppercase">Adicionar ou atualizar indicador</h4>
                    <button
                        type="button"
                        onClick={() => setShowPresets(p => !p)}
                        className="text-xs text-green-700 dark:text-green-400 underline hover:no-underline"
                    >
                        {showPresets ? 'Ocultar atalhos' : 'Saiba mais: atalhos de indicadores'}
                    </button>
                </div>
                {showPresets && (
                    <div className="mb-6 space-y-4">
                        {indicatorPresetGroups.map(group => (
                            <div key={group.title}>
                                <p className="text-xs font-semibold text-green-800 dark:text-green-400 uppercase tracking-wide">{group.title}</p>
                                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {group.items.map(item => (
                                        <div key={item.name} className="rounded-md border border-green-200 dark:border-green-800 bg-white dark:bg-slate-800 p-2">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(p => ({ ...p, nome_indicador: item.name }))}
                                                className="text-xs font-semibold text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                                            >
                                                {item.name}
                                            </button>
                                            <p className="text-[11px] text-green-700/80 dark:text-green-500 mt-1">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <form onSubmit={handleAdd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InputField
                            label="Nome do indicador"
                            name="nome_indicador"
                            value={formData.nome_indicador}
                            onChange={e => setFormData(p => ({...p, nome_indicador: e.target.value}))}
                            required
                            placeholder="Ex: Hipertensão com PA aferida"
                            helpText="Dica: use os atalhos acima para preencher mais rapido."
                        />
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Tipo de valor *</label>
                            <select
                                value={formData.tipo_valor}
                                onChange={e => setFormData(p => ({...p, tipo_valor: e.target.value}))}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-white border border-gray-300 dark:border-slate-600 rounded-md text-sm"
                                required
                            >
                                {valueTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 italic">Escolha a unidade para valor e meta.</p>
                        </div>
                        <InputField
                            label={`Valor (${valueType.label})`}
                            name="valor"
                            type="number"
                            step={valueStep}
                            min="0"
                            value={formData.valor}
                            onChange={e => setFormData(p => ({...p, valor: e.target.value}))}
                            required
                            placeholder="Ex: 67"
                            helpText={valueType.help}
                        />
                        <InputField
                            label={`Meta (${valueType.label})`}
                            name="meta"
                            type="number"
                            step={valueStep}
                            min="0"
                            value={formData.meta}
                            onChange={e => setFormData(p => ({...p, meta: e.target.value}))}
                            placeholder="Ex: 90"
                            helpText="Opcional. Use para comparar com a meta da equipe."
                        />
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Período (trimestre) *</label>
                            <select
                                value={formData.periodo_quadrimestre}
                                onChange={e => setFormData(p => ({...p, periodo_quadrimestre: e.target.value}))}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-white border border-gray-300 dark:border-slate-600 rounded-md text-sm"
                                required
                            >
                                <option value="">Selecionar</option>
                                <option value="Q1">Q1</option>
                                <option value="Q2">Q2</option>
                                <option value="Q3">Q3</option>
                                <option value="Q4">Q4</option>
                            </select>
                            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 italic">Use o trimestre do período analisado.</p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Ano *</label>
                            <select
                                value={formData.periodo_ano}
                                onChange={e => setFormData(p => ({...p, periodo_ano: e.target.value}))}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-white border border-gray-300 dark:border-slate-600 rounded-md text-sm"
                                required
                            >
                                <option value="">Selecionar</option>
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400 italic">Exemplo: Q3/2025.</p>
                        </div>
                    </div>
                    <TextAreaField label="Observações (opcional)" name="observacoes" rows={2} value={formData.observacoes} onChange={e => setFormData(p => ({...p, observacoes: e.target.value}))} placeholder="Fonte dos dados, critérios, etc."/>
                    <div className="flex justify-end gap-2 mt-2">
                        <button type="button" onClick={() => setFormData({ nome_indicador: '', valor: '', meta: '', tipo_valor: 'PERCENTUAL', periodo_quadrimestre: '', periodo_ano: '', observacoes: '' })} className="text-sm font-medium text-gray-600 dark:text-slate-400 hover:underline">Limpar</button>
                        <button type="submit" className="bg-cyan-700 text-white px-6 py-2 rounded font-bold hover:bg-cyan-800 transition-colors">Salvar indicador</button>
                    </div>
                </form>
            </div>
        </SectionCard>
    );
}

const ProfessionalsSection = ({ ubsId, initialData, onUpdate }) => {
    const { notify, confirm } = useNotifications();
    const [formData, setFormData] = useState({ cargo_funcao: '', quantidade: '', tipo_vinculo: '', observacoes: '' });
    
    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                cargo_funcao: formData.cargo_funcao,
                quantidade: parseInt(formData.quantidade, 10) || 0,
                tipo_vinculo: formData.tipo_vinculo || null,
                observacoes: formData.observacoes || ""
            };
            await axios.post(`/api/ubs/${ubsId}/professionals`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setFormData({ cargo_funcao: '', quantidade: '', tipo_vinculo: '', observacoes: '' }); 
            onUpdate(); 
        } catch(err) { 
            console.error(err);
            const msg = err.response?.data?.detail;
            notify({
                type: 'error',
                message: `Erro ao adicionar profissional: ${Array.isArray(msg) ? 'Verifique os dados informados.' : msg || 'Erro desconhecido.'}`,
            });
        }
    }

    const handleDelete = async (profId) => {
        const confirmed = await confirm({
            title: 'Excluir profissional',
            message: 'Deseja excluir este profissional da equipe?',
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
        });
        if (!confirmed) return;
        try {
            await axios.delete(`/api/ubs/professionals/${profId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            onUpdate();
        } catch(err) {
            notify({ type: 'error', message: 'Erro ao excluir o profissional.' });
        }
    }

    return (
        <SectionCard title="Profissionais da equipe" subtitle="Consulte os profissionais já cadastrados e atualize conforme a composição da equipe da UBS." disabled={!ubsId} lockedMessage="Salve o rascunho para habilitar esta seção">
            <div className="mb-6 space-y-4">
                {initialData && initialData.map(prof => (
                    <div key={prof.id} className="flex justify-between items-center p-3 border dark:border-slate-700 rounded bg-gray-50 dark:bg-slate-800 relative group">
                        <div>
                            <p className="font-bold text-gray-800 dark:text-white">{prof.cargo_funcao}</p>
                            <p className="text-xs text-gray-500 dark:text-slate-400">{prof.observacoes}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">Qtd: {prof.quantidade}</span>
                            <button 
                                onClick={() => handleDelete(prof.id)}
                                className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Excluir"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-4 border rounded-md bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 mb-4 text-sm uppercase">Adicionar ou atualizar profissional</h4>
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField label="Cargo / função" name="cargo_funcao" value={formData.cargo_funcao} onChange={e => setFormData(p => ({...p, cargo_funcao: e.target.value}))} required placeholder="Ex: Enfermeiro da Família"/>
                    <InputField label="Quantidade" name="quantidade" type="number" value={formData.quantidade} onChange={e => setFormData(p => ({...p, quantidade: e.target.value}))} required placeholder="Ex: 2"/>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Tipo de vínculo *</label>
                        <select value={formData.tipo_vinculo} onChange={e => setFormData(p => ({...p, tipo_vinculo: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-white border border-gray-300 dark:border-slate-600 rounded-md text-sm" required>
                            <option value="">Selecionar</option>
                            <option value="concursado">Concursado</option>
                            <option value="contratado">Contratado</option>
                            <option value="residencia">Residência</option>
                            <option value="estagiario">Estagiário</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <TextAreaField label="Observações (opcional)" rows={2} value={formData.observacoes} onChange={e => setFormData(p => ({...p, observacoes: e.target.value}))} placeholder="Informe categoria profissional, carga horária, etc."/>
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2">
                        <button type="button" onClick={() => setFormData({ cargo_funcao: '', quantidade: '', tipo_vinculo: '', observacoes: '' })} className="text-sm font-medium text-gray-600 dark:text-slate-400 hover:underline">Limpar</button>
                        <button type="submit" className="bg-cyan-700 text-white px-4 py-2 rounded font-bold hover:bg-cyan-800 transition-colors">Salvar profissional</button>
                    </div>
                </form>
            </div>
        </SectionCard>
    );
}

const CronogramasSection = ({ ubsId, data, onFieldChange, onSave }) => {
    const [entryDrafts, setEntryDrafts] = useState({});
    const [entryTimes, setEntryTimes] = useState({});
    const [editorTarget, setEditorTarget] = useState(null);
    const days = [
        { key: 'seg', label: 'SEG' },
        { key: 'ter', label: 'TER' },
        { key: 'qua', label: 'QUA' },
        { key: 'qui', label: 'QUI' },
        { key: 'sex', label: 'SEX' },
    ];

    useEffect(() => {
        if (!editorTarget) return;
        const onEsc = (e) => {
            if (e.key === 'Escape') setEditorTarget(null);
        };
        window.addEventListener('keydown', onEsc);
        return () => window.removeEventListener('keydown', onEsc);
    }, [editorTarget]);

    const parseItems = (value) =>
        String(value || '')
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);

    const updateField = (name, value) => {
        onFieldChange({ target: { name, value, type: 'text' } });
    };

    const addItem = (fieldName, withTime = false) => {
        const draft = (entryDrafts[fieldName] || '').trim();
        if (!draft) return;
        const time = (entryTimes[fieldName] || '').trim();
        const itemText = withTime && time ? `[${time}] ${draft}` : draft;
        const items = parseItems(data?.[fieldName]);
        items.push(itemText);
        updateField(fieldName, items.join('\n'));
        setEntryDrafts((prev) => ({ ...prev, [fieldName]: '' }));
        if (withTime) {
            setEntryTimes((prev) => ({ ...prev, [fieldName]: '' }));
        }
    };

    const removeItem = (fieldName, index) => {
        const items = parseItems(data?.[fieldName]);
        const next = items.filter((_, idx) => idx !== index);
        updateField(fieldName, next.join('\n'));
    };

    const countActivities = (prefix) => {
        let total = 0;
        days.forEach((day) => {
            total += parseItems(data?.[`${prefix}_${day.key}_manha`]).length;
            total += parseItems(data?.[`${prefix}_${day.key}_tarde`]).length;
        });
        return total;
    };

    const scheduleBlock = (fieldName, colorClasses, label, withTime = false) => {
        const items = parseItems(data?.[fieldName]);
        return (
            <div className={`rounded-lg border p-3 ${colorClasses}`}>
                <label className="block text-sm font-semibold mb-2">{label}</label>
                <div className="space-y-2">
                    {withTime && (
                        <div>
                            <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">Horário (opcional)</label>
                            <input
                                type="text"
                                value={entryTimes[fieldName] || ''}
                                onChange={(e) => setEntryTimes((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-md dark:text-white"
                                placeholder="Ex.: 08:30 ou 14:00-15:30"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs mb-1 text-slate-600 dark:text-slate-300">Atividade</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={entryDrafts[fieldName] || ''}
                                onChange={(e) => setEntryDrafts((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addItem(fieldName, withTime);
                                    }
                                }}
                                className="w-full min-w-0 px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded-md dark:text-white"
                                placeholder="Digite atividade e pressione Enter"
                            />
                            <button
                                type="button"
                                onClick={() => addItem(fieldName, withTime)}
                                className="px-3 py-2 rounded-md bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
                <ul className="list-disc pl-5 mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300 max-h-40 overflow-y-auto pr-1">
                    {items.map((item, idx) => (
                        <li key={`${fieldName}-${idx}`} className="flex items-start gap-2 min-w-0">
                            <span className="min-w-0 flex-1 break-words leading-snug">{item}</span>
                            <button
                                type="button"
                                onClick={() => removeItem(fieldName, idx)}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold shrink-0"
                            >
                                remover
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    const renderGrid = (title, prefix, fullScreen = false) => (
        <div className={`rounded-2xl border border-gray-200 dark:border-slate-700 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 p-4 mb-6 shadow-sm ${fullScreen ? 'min-h-[60vh]' : ''}`}>
            <div className="flex items-center justify-between px-2 pb-3 border-b border-gray-200 dark:border-slate-700">
                <h4 className="font-bold text-emerald-800 dark:text-emerald-300">{title}</h4>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    SEG a SEX
                </span>
            </div>
            <div className={`grid grid-cols-1 ${fullScreen ? 'md:grid-cols-2 2xl:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-5'} gap-3 mt-4`}>
                {days.map((day) => (
                    <div key={day.key} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                        <div className="px-3 py-2 text-center text-xs font-semibold tracking-wide bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {day.label} 
                        </div>
                        <div className="p-3 space-y-2">
                            {scheduleBlock(
                                `${prefix}_${day.key}_manha`,
                                'border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
                                'Manhã',
                                prefix === 'cronograma_residentes'
                            )}
                            {scheduleBlock(
                                `${prefix}_${day.key}_tarde`,
                                'border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
                                'Tarde',
                                prefix === 'cronograma_residentes'
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {prefix === 'cronograma_residentes' && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Dica: preencha o campo de horario (opcional) para cada atividade, ex.: 08:30 ou 14:00-15:30.
                </p>
            )}
            <div className="mt-4">
                <TextAreaField
                    label="Observações do cronograma"
                    name={`${prefix}_observacoes`}
                    value={data?.[`${prefix}_observacoes`] || ''}
                    onChange={onFieldChange}
                    rows={3}
                    placeholder="Ex.: ressalvas, mudanças quinzenais, atividades extras e orientações gerais."
                />
            </div>
        </div>
    );

    return (
        <SectionCard
            title="Cronogramas para o Relatório"
            subtitle="Use o editor expandido para visualizar e personalizar o cronograma com mais espaço."
            disabled={!ubsId}
            lockedMessage="Salve o rascunho para habilitar esta seção"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-900/20 p-4">
                    <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Cronograma da UBS</h4>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                        {countActivities('cronograma_ubs')} atividades cadastradas
                    </p>
                    <button
                        type="button"
                        onClick={() => setEditorTarget('cronograma_ubs')}
                        className="mt-3 px-4 py-2 rounded-md bg-cyan-700 text-white text-sm font-semibold hover:bg-cyan-800"
                    >
                        Personalizar cronograma
                    </button>
                </div>
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/20 p-4">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300">Cronograma dos Residentes</h4>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                        {countActivities('cronograma_residentes')} atividades cadastradas
                    </p>
                    <button
                        type="button"
                        onClick={() => setEditorTarget('cronograma_residentes')}
                        className="mt-3 px-4 py-2 rounded-md bg-cyan-700 text-white text-sm font-semibold hover:bg-cyan-800"
                    >
                        Personalizar cronograma
                    </button>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={onSave}
                    className="bg-cyan-700 text-white px-6 py-2 rounded font-bold hover:bg-cyan-800"
                >
                    Salvar cronogramas (reutilizável)
                </button>
            </div>

            {editorTarget && (
                <div className="fixed inset-0 z-[70] bg-black/55 flex items-center justify-center p-4">
                    <div className="w-full max-w-[1400px] max-h-[92vh] overflow-hidden rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                    {editorTarget === 'cronograma_ubs' ? 'Editor: Cronograma da UBS' : 'Editor: Cronograma dos Residentes'}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Mais espaço para montar atividades por dia e turno.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditorTarget(null)}
                                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white text-2xl leading-none"
                                aria-label="Fechar editor"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto">
                            {editorTarget === 'cronograma_ubs'
                                ? renderGrid('Cronograma da UBS', 'cronograma_ubs', true)
                                : renderGrid('Cronograma dos Residentes', 'cronograma_residentes', true)}
                        </div>

                        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditorTarget(null)}
                                className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                            >
                                Voltar ao formulário
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await onSave();
                                    setEditorTarget(null);
                                }}
                                className="px-4 py-2 rounded-md bg-cyan-700 text-white font-semibold hover:bg-cyan-800"
                            >
                                Salvar e fechar editor
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </SectionCard>
    );
}

// --- MODAL DE RELATÓRIO COMPLETO ---

const FullReportModal = ({ isOpen, onClose, reportId, onRefresh, ubsInfo }) => {
    const { notify, confirm } = useNotifications();
    const [id, setId] = useState(reportId);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generalData, setGeneralData] = useState(null);
    const [saveStatus, setSaveStatus] = useState('');
    const isLocked = !ubsInfo;
    
    const availableServices = [
        "Programa Saúde da Família", "Atendimento médico", "Atendimento de enfermagem", 
        "Atendimento odontológico", "Atendimento de urgência / acolhimento", 
        "Procedimentos (curativos, inalação, etc.)", "Sala de vacina", 
        "Saúde da criança", "Saúde da mulher", "Saúde do homem", "Saúde do idoso",
        "Planejamento familiar", "Pré-natal", "Puericultura", 
        "Atendimento a condições crônicas (hipertensão, diabetes, etc.)",
        "Programa Saúde na Escola (PSE)", "Saúde mental", 
        "Atendimento multiprofissional (NASF ou equivalente)", "Testes rápidos de IST",
        "Vigilância epidemiológica", "Vigilância em saúde ambiental", "Visitas domiciliares",
        "Atividades coletivas e preventivas", "Grupos operativos (gestantes, tabagismo, etc.)"
    ];

    const debouncedGeneralData = useDebounce(generalData, 2000); 
    const getToken = () => localStorage.getItem('token');

    useEffect(() => {
        if (!isOpen) return;
        const nextId = reportId || null;
        setId(nextId);
        setReportData(null);
        setSaveStatus('');
        if (reportId) {
            fetchFullData(reportId);
            return;
        }
        setGeneralData({
            nome_relatorio: ubsInfo?.nome_relatorio || '',
            nome_ubs: ubsInfo?.nome_ubs || '',
            cnes: ubsInfo?.cnes || '',
            area_atuacao: ubsInfo?.area_atuacao || '',
            periodo_referencia: ubsInfo?.periodo_referencia || '',
            responsavel_nome: ubsInfo?.responsavel_nome || '',
            responsavel_cargo: ubsInfo?.responsavel_cargo || '',
            responsavel_contato: ubsInfo?.responsavel_contato || '',
            identificacao_equipe: ubsInfo?.identificacao_equipe || '',
            fluxo_agenda_acesso: '',
            descritivos_gerais: '',
            observacoes_gerais: '',
            cronograma_ubs_seg_manha: ubsInfo?.cronograma_ubs_seg_manha || '',
            cronograma_ubs_seg_tarde: ubsInfo?.cronograma_ubs_seg_tarde || '',
            cronograma_ubs_ter_manha: ubsInfo?.cronograma_ubs_ter_manha || '',
            cronograma_ubs_ter_tarde: ubsInfo?.cronograma_ubs_ter_tarde || '',
            cronograma_ubs_qua_manha: ubsInfo?.cronograma_ubs_qua_manha || '',
            cronograma_ubs_qua_tarde: ubsInfo?.cronograma_ubs_qua_tarde || '',
            cronograma_ubs_qui_manha: ubsInfo?.cronograma_ubs_qui_manha || '',
            cronograma_ubs_qui_tarde: ubsInfo?.cronograma_ubs_qui_tarde || '',
            cronograma_ubs_sex_manha: ubsInfo?.cronograma_ubs_sex_manha || '',
            cronograma_ubs_sex_tarde: ubsInfo?.cronograma_ubs_sex_tarde || '',
            cronograma_ubs_observacoes: ubsInfo?.cronograma_ubs_observacoes || '',
            cronograma_residentes_seg_manha: ubsInfo?.cronograma_residentes_seg_manha || '',
            cronograma_residentes_seg_tarde: ubsInfo?.cronograma_residentes_seg_tarde || '',
            cronograma_residentes_ter_manha: ubsInfo?.cronograma_residentes_ter_manha || '',
            cronograma_residentes_ter_tarde: ubsInfo?.cronograma_residentes_ter_tarde || '',
            cronograma_residentes_qua_manha: ubsInfo?.cronograma_residentes_qua_manha || '',
            cronograma_residentes_qua_tarde: ubsInfo?.cronograma_residentes_qua_tarde || '',
            cronograma_residentes_qui_manha: ubsInfo?.cronograma_residentes_qui_manha || '',
            cronograma_residentes_qui_tarde: ubsInfo?.cronograma_residentes_qui_tarde || '',
            cronograma_residentes_sex_manha: ubsInfo?.cronograma_residentes_sex_manha || '',
            cronograma_residentes_sex_tarde: ubsInfo?.cronograma_residentes_sex_tarde || '',
            cronograma_residentes_observacoes: ubsInfo?.cronograma_residentes_observacoes || '',
            numero_habitantes_ativos: ubsInfo?.numero_habitantes_ativos ?? '',
            numero_familias_cadastradas: ubsInfo?.numero_familias_cadastradas ?? '',
            numero_microareas: ubsInfo?.numero_microareas ?? '',
            numero_domicilios: ubsInfo?.numero_domicilios ?? '',
            domicilios_rurais: ubsInfo?.domicilios_rurais ?? '',
            data_inauguracao: ubsInfo?.data_inauguracao || '',
            data_ultima_reforma: ubsInfo?.data_ultima_reforma || '',
            outros_servicos: '',
            gestao_modelo_atencao: '',
            isDirty: false
        });
    }, [isOpen, reportId, ubsInfo]);

    const fetchFullData = async (targetId) => {
        setLoading(true);
        try {
            const token = getToken();
            const response = await axios.get(`/api/ubs/${targetId}/diagnosis`, { headers: { Authorization: `Bearer ${token}` } });
            const full = {
                ...response.data.ubs, 
                professionals: response.data.professional_groups, 
                territory: response.data.territory_profile, 
                needs: response.data.needs, 
                indicators: response.data.indicators_latest
            };
            setReportData(full);
            setGeneralData({ ...full, isDirty: false });
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const preparePayload = (data) => {
        const { isDirty, id, created_at, updated_at, status, owner_user_id, tenant_id, submitted_at, professionals, territory, needs, indicators, ...cleaned } = data;
        const numericFields = ['numero_habitantes_ativos', 'numero_familias_cadastradas', 'numero_microareas', 'numero_domicilios', 'domicilios_rurais'];
        Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === "") cleaned[key] = numericFields.includes(key) ? 0 : null;
            else if (numericFields.includes(key) && cleaned[key] !== null) cleaned[key] = parseInt(cleaned[key], 10) || 0;
        });
        return cleaned;
    };

    useEffect(() => {
        if (id && debouncedGeneralData && debouncedGeneralData.isDirty) {
            const updateData = async () => {
                setSaveStatus('Salvando...');
                try {
                    const payload = preparePayload(debouncedGeneralData);
                    await axios.patch(`/api/ubs/${id}`, payload, { headers: { Authorization: `Bearer ${getToken()}` } });
                    setSaveStatus('Salvo');
                    setGeneralData(prev => ({...prev, isDirty: false}));
                } catch (err) { setSaveStatus('Erro ao salvar'); }
            };
            updateData();
        }
    }, [debouncedGeneralData, id]);

    const handleGeneralChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setGeneralData(prev => ({ ...prev, [name]: val, isDirty: true }));
    };

    const handleSaveCronogramas = async () => {
        if (!id) {
            notify({ type: 'warning', message: 'Salve o rascunho antes de salvar os cronogramas.' });
            return;
        }
        try {
            const payload = {
                cronograma_ubs_seg_manha: generalData?.cronograma_ubs_seg_manha || null,
                cronograma_ubs_seg_tarde: generalData?.cronograma_ubs_seg_tarde || null,
                cronograma_ubs_ter_manha: generalData?.cronograma_ubs_ter_manha || null,
                cronograma_ubs_ter_tarde: generalData?.cronograma_ubs_ter_tarde || null,
                cronograma_ubs_qua_manha: generalData?.cronograma_ubs_qua_manha || null,
                cronograma_ubs_qua_tarde: generalData?.cronograma_ubs_qua_tarde || null,
                cronograma_ubs_qui_manha: generalData?.cronograma_ubs_qui_manha || null,
                cronograma_ubs_qui_tarde: generalData?.cronograma_ubs_qui_tarde || null,
                cronograma_ubs_sex_manha: generalData?.cronograma_ubs_sex_manha || null,
                cronograma_ubs_sex_tarde: generalData?.cronograma_ubs_sex_tarde || null,
                cronograma_ubs_observacoes: generalData?.cronograma_ubs_observacoes || null,
                cronograma_residentes_seg_manha: generalData?.cronograma_residentes_seg_manha || null,
                cronograma_residentes_seg_tarde: generalData?.cronograma_residentes_seg_tarde || null,
                cronograma_residentes_ter_manha: generalData?.cronograma_residentes_ter_manha || null,
                cronograma_residentes_ter_tarde: generalData?.cronograma_residentes_ter_tarde || null,
                cronograma_residentes_qua_manha: generalData?.cronograma_residentes_qua_manha || null,
                cronograma_residentes_qua_tarde: generalData?.cronograma_residentes_qua_tarde || null,
                cronograma_residentes_qui_manha: generalData?.cronograma_residentes_qui_manha || null,
                cronograma_residentes_qui_tarde: generalData?.cronograma_residentes_qui_tarde || null,
                cronograma_residentes_sex_manha: generalData?.cronograma_residentes_sex_manha || null,
                cronograma_residentes_sex_tarde: generalData?.cronograma_residentes_sex_tarde || null,
                cronograma_residentes_observacoes: generalData?.cronograma_residentes_observacoes || null,
            };
            await axios.patch(`/api/ubs/${id}`, payload, { headers: { Authorization: `Bearer ${getToken()}` } });
            notify({ type: 'success', message: 'Cronogramas salvos com sucesso.' });
            setGeneralData(prev => ({ ...prev, isDirty: false }));
            setSaveStatus('Salvo');
            if (onRefresh) onRefresh();
        } catch (err) {
            notify({ type: 'error', message: 'Erro ao salvar cronogramas.' });
        }
    };

    const handleCreateDraft = async () => {
        if (!ubsInfo) {
            notify({ type: 'warning', message: 'Configure a UBS antes de iniciar o relatório.' });
            return;
        }
        if (!generalData.nome_ubs || !generalData.cnes || !generalData.area_atuacao) {
            notify({ type: 'warning', message: 'Preencha os campos obrigatórios (*) para começar.' });
            return;
        }
        try {
            const payload = preparePayload(generalData);
            const response = await axios.post('/api/ubs', payload, { headers: { Authorization: `Bearer ${getToken()}` } });
            setId(response.data.id);
            fetchFullData(response.data.id);
            if(onRefresh) onRefresh();
        } catch (err) {
            notify({ type: 'error', message: 'Erro ao criar o rascunho.' });
        }
    };

    const handleSubmitFinal = async () => {
        const confirmed = await confirm({
            title: 'Concluir edição',
            message: 'Deseja concluir a edição?',
            confirmLabel: 'Concluir',
            cancelLabel: 'Cancelar',
        });
        if (!confirmed) return;
        try {
            await axios.post(`/api/ubs/${id}/submit`, { confirm: true }, { headers: { Authorization: `Bearer ${getToken()}` } });
            notify({ type: 'success', message: 'Enviado com sucesso.' });
            if(onRefresh) onRefresh();
            onClose();
        } catch (err) {
            const errors = err.response?.data?.detail?.errors;
            if (errors) {
                notify({
                    type: 'warning',
                    message: `Faltam itens obrigatórios: ${errors.map(e => e.message).join('; ')}`,
                    duration: 6000,
                });
            } else {
                notify({ type: 'error', message: 'Erro ao concluir.' });
            }
        }
    };

    const handleSectionPut = async (endpoint, data) => {
        try {
            const payload = { ...data };
            // Remove id and ubs_id from payload as they are part of the URL and not expected in body for PUT/PATCH
            if (payload.id) delete payload.id;
            if (payload.ubs_id) delete payload.ubs_id;
            await axios.put(`/api/ubs/${id}/${endpoint}`, payload, { headers: { Authorization: `Bearer ${getToken()}` } });
            setSaveStatus('Salvo');
            fetchFullData(id);
        } catch (err) { 
            console.error(err);
            const msg = err.response?.data?.detail?.errors?.[0]?.message || err.response?.data?.detail || "Erro desconhecido";
            notify({ type: 'error', message: `Erro ao salvar seção: ${msg}` });
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center overflow-hidden p-4">
            <div className="bg-gray-100 dark:bg-slate-950 w-full max-w-7xl rounded-lg shadow-2xl flex flex-col max-h-[95vh]">

                {/* --- HEADER --- */}
                <div className="bg-white dark:bg-slate-900 px-8 py-5 border-b dark:border-slate-700 flex justify-between items-center rounded-t-lg">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Diagnóstico Situacional da UBS</h2>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Formulário para registro de dados do relatório situacional da Unidade Básica de Saúde</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`text-sm italic font-medium ${saveStatus === 'Erro ao salvar' ? 'text-red-600' : saveStatus === 'Salvando...' ? 'text-yellow-600' : 'text-green-600'}`}>{saveStatus}</span>
                        <button onClick={onClose} className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300 transition-colors text-3xl font-light">&times;</button>
                    </div>
                </div>

                {/* --- CORPO --- */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    {isLocked && (
                        <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-amber-900 dark:text-amber-300">
                            Configure a UBS primeiro para liberar o preenchimento do relatório.
                        </div>
                    )}

                    <div className={isLocked ? 'opacity-60 pointer-events-none' : ''}>
                    
                    <SectionCard title="Informações gerais da UBS" subtitle="Preencha os dados da unidade. Nome, CNES e Área de atuação são obrigatórios para salvar o rascunho.">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <InputField label="Nome da UBS" name="nome_ubs" value={generalData?.nome_ubs} onChange={handleGeneralChange} required placeholder="ESF 18 – Adalto Pereira Saraçayo" />
                            <InputField label="CNES" name="cnes" value={generalData?.cnes} onChange={handleGeneralChange} required placeholder="0000000" />
                            <InputField label="Área de atuação (bairros/localidades)" name="area_atuacao" value={generalData?.area_atuacao} onChange={handleGeneralChange} required placeholder="Ex.: Alto São Pedro, Nova Alvorada, Centro" />
                            <InputField label="Número de habitantes ativos" name="numero_habitantes_ativos" type="number" value={generalData?.numero_habitantes_ativos} onChange={handleGeneralChange} required placeholder="Ex.: 4.800" />
                            <InputField label="Número de microáreas" name="numero_microareas" type="number" value={generalData?.numero_microareas} onChange={handleGeneralChange} required placeholder="Ex.: 8" />
                            <InputField label="Número de famílias cadastradas" name="numero_familias_cadastradas" type="number" value={generalData?.numero_familias_cadastradas} onChange={handleGeneralChange} required placeholder="Ex.: 1.000" />
                            <InputField label="Número de domicílios" name="numero_domicilios" type="number" value={generalData?.numero_domicilios} onChange={handleGeneralChange} required placeholder="Ex.: 2.000" />
                            <InputField label="Domicílios rurais" name="domicilios_rurais" type="number" value={generalData?.domicilios_rurais} onChange={handleGeneralChange} placeholder="Ex.: 15" />
                            <InputField label="Data de inauguração" name="data_inauguracao" type="date" value={generalData?.data_inauguracao} onChange={handleGeneralChange} />
                            <InputField label="Data da última reforma" name="data_ultima_reforma" type="date" value={generalData?.data_ultima_reforma} onChange={handleGeneralChange} />
                            <InputField label="Gestão / modelo de atenção" name="gestao_modelo_atencao" value={generalData?.gestao_modelo_atencao} onChange={handleGeneralChange} placeholder="Ex.: ESF, UBS tradicional, mista" />
                        </div>
                        <div className="mt-4">
                            <TextAreaField label="Descritivos gerais" name="descritivos_gerais" value={generalData?.descritivos_gerais} onChange={handleGeneralChange} placeholder="Perfil de referência – por exemplo, população prioritária, localização estratégica, entre outros." />
                            <TextAreaField label="Observações gerais" name="observacoes_gerais" value={generalData?.observacoes_gerais} onChange={handleGeneralChange} placeholder="Informações adicionais sobre a UBS, histórico, mudanças recentes na área de abrangência e projetos em andamento." />
                        </div>
                    </SectionCard>

                    <SectionCard title="Identificação do relatório" subtitle="Defina um nome para este relatório situacional, para facilitar a identificação na lista de rascunhos e relatórios finalizados.">
                        <InputField label="Nome do relatório" name="nome_relatorio" value={generalData?.nome_relatorio} onChange={handleGeneralChange} required placeholder="Ex.: Diagnóstico Situacional UBS Adalto Pereira Saraçayo - 2025" />
                    </SectionCard>

                    <SectionCard title="Metadados do relatório" subtitle="Campos para refletir o cabeçalho do relatório (período, equipe e responsável).">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputField label="Período de referência (mês/ano)" name="periodo_referencia" value={generalData?.periodo_referencia} onChange={handleGeneralChange} placeholder="Ex.: Março/2025" />
                            <InputField label="Identificação da equipe (ESF nº)" name="identificacao_equipe" value={generalData?.identificacao_equipe} onChange={handleGeneralChange} placeholder="Ex.: ESF 41" />
                            <InputField label="Responsável (nome)" name="responsavel_nome" value={generalData?.responsavel_nome} onChange={handleGeneralChange} placeholder="Ex.: Maria da Silva" />
                            <InputField label="Responsável (cargo)" name="responsavel_cargo" value={generalData?.responsavel_cargo} onChange={handleGeneralChange} placeholder="Ex.: Enfermeira / Gerente" />
                            <InputField label="Responsável (contato)" name="responsavel_contato" value={generalData?.responsavel_contato} onChange={handleGeneralChange} placeholder="Ex.: telefone/e-mail" />
                        </div>
                    </SectionCard>

                    <SectionCard title="Fluxo, agenda e acesso">
                        <TextAreaField label="Fluxo, agenda e acesso" name="fluxo_agenda_acesso" value={generalData?.fluxo_agenda_acesso} onChange={handleGeneralChange} placeholder="Descreva como funciona o acolhimento, o agendamento, a demanda espontânea, os gargalos e o acesso a exames/encaminhamentos, entre outros." />
                    </SectionCard>

                    <CronogramasSection
                        ubsId={id}
                        data={generalData}
                        onFieldChange={handleGeneralChange}
                        onSave={handleSaveCronogramas}
                    />

                    <SectionCard title="Serviços oferecidos pela UBS" subtitle="Marque os serviços que a UBS oferece diretamente à população.">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {availableServices.map(s => (
                                <label key={s} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                                    <input type="checkbox" className="rounded text-blue-600" />
                                    <span>{s}</span>
                                </label>
                            ))}
                        </div>
                        <div className="mt-4">
                            <InputField label="Outros serviços (especificar)" name="outros_servicos" value={generalData?.outros_servicos} onChange={handleGeneralChange} placeholder="Descreva outros serviços ofertados não listados acima." />
                        </div>
                    </SectionCard>

                    <IndicatorsSection ubsId={id} initialData={reportData?.indicators} onUpdate={() => fetchFullData(id)} />

                    <ProfessionalsSection ubsId={id} initialData={reportData?.professionals} onUpdate={() => fetchFullData(id)} />

                    <SectionCard title="Território e determinantes sociais" disabled={!id} lockedMessage="Salve o rascunho para habilitar">
                        <div className="space-y-4">
                            <TextAreaField 
                                label="Descrição do território *" 
                                value={reportData?.territory?.descricao_territorio} 
                                onChange={e => setReportData(p => ({...p, territory: {...p.territory, descricao_territorio: e.target.value}}))}
                                placeholder="Descreva as principais características do território: perfil socioeconômico, infraestrutura urbana, áreas de risco, entre outras." 
                            />
                            <TextAreaField 
                                label="Potencialidades do território" 
                                value={reportData?.territory?.potencialidades_territorio} 
                                onChange={e => setReportData(p => ({...p, territory: {...p.territory, potencialidades_territorio: e.target.value}}))}
                                placeholder="Registre parcerias existentes, lideranças comunitárias ativas e redes de apoio." 
                            />
                            <TextAreaField 
                                label="Riscos e vulnerabilidades" 
                                value={reportData?.territory?.riscos_vulnerabilidades} 
                                onChange={e => setReportData(p => ({...p, territory: {...p.territory, riscos_vulnerabilidades: e.target.value}}))}
                                placeholder="Informe situações de vulnerabilidade: alagamentos, violência, descarte irregular de lixo, entre outras." 
                            />
                            <div className="flex justify-end">
                                <button onClick={() => handleSectionPut('territory', reportData?.territory || { descricao_territorio: '', potencialidades_territorio: '', riscos_vulnerabilidades: '' })} className="bg-cyan-700 text-white px-6 py-2 rounded font-bold hover:bg-cyan-800">Salvar seção</button>
                            </div>
                        </div>
                    </SectionCard>

                    <SectionCard title="Fotos e registros de infraestrutura" subtitle="Registros fotográficos de problemas e condições da UBS, relacionados às vulnerabilidades identificadas acima." disabled={!id} lockedMessage="Salve o rascunho para habilitar">
                        <div className="flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                            <svg className="w-10 h-10 text-gray-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Upload de fotos em desenvolvimento</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-xs">Em breve será possível anexar fotos diretamente ao relatório. Por enquanto, descreva os problemas de infraestrutura na seção abaixo.</p>
                        </div>
                    </SectionCard>

                    <SectionCard title="Problemas e necessidades da UBS" disabled={!id} lockedMessage="Salve o rascunho para habilitar">
                        <div className="space-y-4">
                            <TextAreaField 
                                label="Problemas identificados *" 
                                value={reportData?.needs?.problemas_identificados} 
                                onChange={e => setReportData(p => ({...p, needs: {...p.needs, problemas_identificados: e.target.value}}))}
                                placeholder="Descreva detalhadamente: deficiência de espaço físico, sobrecarga, filas, rotatividade de profissionais, entre outros." 
                            />
                            <TextAreaField 
                                label="Necessidades de equipamentos e insumos" 
                                value={reportData?.needs?.necessidades_equipamentos_insumos} 
                                onChange={e => setReportData(p => ({...p, needs: {...p.needs, necessidades_equipamentos_insumos: e.target.value}}))}
                                placeholder="Liste computadores, mobiliários, balanças, oxímetros, materiais de limpeza e EPIs." 
                            />
                            <TextAreaField 
                                label="Necessidades específicas dos ACS" 
                                value={reportData?.needs?.necessidades_especificas_acs} 
                                onChange={e => setReportData(p => ({...p, needs: {...p.needs, necessidades_especificas_acs: e.target.value}}))}
                                placeholder="EPIs, materiais de campo (pranchetas, tablets), uniforme, crachá e capacitações." 
                            />
                            <TextAreaField 
                                label="Necessidades de infraestrutura e manutenção" 
                                value={reportData?.needs?.necessidades_infraestrutura_manutencao} 
                                onChange={e => setReportData(p => ({...p, needs: {...p.needs, necessidades_infraestrutura_manutencao: e.target.value}}))}
                                placeholder="Reforma de telhado, substituição de portas, acessibilidade, adequação elétrica e pintura." 
                            />
                            <div className="flex justify-end">
                                <button onClick={() => handleSectionPut('needs', reportData?.needs || { problemas_identificados: '', necessidades_equipamentos_insumos: '', necessidades_especificas_acs: '', necessidades_infraestrutura_manutencao: '' })} className="bg-cyan-700 text-white px-6 py-2 rounded font-bold hover:bg-cyan-800">Salvar seção</button>
                            </div>
                        </div>
                    </SectionCard>

                    {!id && (
                        <div className="flex justify-center my-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="text-center">
                                <p className="mb-4 text-blue-800 dark:text-blue-300 font-medium">Preencha Nome da UBS, CNES e Área de atuação acima e clique abaixo para desbloquear as demais seções.</p>
                                <button onClick={handleCreateDraft} className="bg-cyan-700 text-white px-10 py-4 rounded-lg font-bold text-xl shadow-lg hover:bg-cyan-800 transition-all">Salvar rascunho</button>
                            </div>
                        </div>
                    )}

                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 px-8 py-5 border-t dark:border-slate-700 flex justify-end gap-4 rounded-b-lg">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-500 dark:bg-slate-600 text-white rounded font-bold hover:bg-gray-600 dark:hover:bg-slate-500 transition-colors">Fechar</button>
                    {id && (
                        <>
                            <button
                                onClick={() => notify({ type: 'info', message: 'Rascunho salvo automaticamente.' })}
                                className="px-6 py-2 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300 rounded font-bold border border-cyan-200 dark:border-cyan-800"
                            >
                                Salvar rascunho
                            </button>
                            <button onClick={handleSubmitFinal} className="px-6 py-2 bg-green-600 text-white rounded font-bold shadow hover:bg-green-700 transition-colors">Enviar diagnóstico</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- PÁGINA DE LISTAGEM ---

const RelatoriosSituacionais = () => {
    const { notify, dismiss, confirm } = useNotifications();
    const [reports, setReports] = useState([]);
  const [exportingId, setExportingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [dashboardReportId, setDashboardReportId] = useState(null);

  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isUserRole = user?.role === 'USER';
    const selectedReport = reports.find((r) => r.id === selectedReportId) || null;

  const fetchRelatorios = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Sessão expirada. Faça login.'); setLoading(false); return; }
                        const data = await ubsService.getUbsReports(1, 50);
                        setReports(data);
      setError('');
    } catch (err) { 
        if(err.response?.status === 401) setError('Não autorizado. Faça login novamente.');
        else setError('Erro ao carregar os relatórios.'); 
    } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRelatorios(); }, []);
  
  const handleDelete = async (id) => {
        const confirmed = await confirm({
            title: 'Excluir relatório',
            message: 'Deseja excluir este relatório?',
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
        });
        if (!confirmed) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/ubs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchRelatorios();
        } catch (err) {
            notify({ type: 'error', message: 'Erro ao excluir o relatório.' });
        }
  };

  const handleExport = async (id) => {
    if (exportingId) return;
    setExportingId(id);
    const loadingToastId = notify({
      type: 'info',
      message: 'Gerando o PDF do relatório... isso pode levar alguns segundos.',
      duration: 0,
    });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/ubs/${id}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      notify({ type: 'success', message: 'PDF gerado. O download foi iniciado.' });
    } catch (err) {
      notify({ type: 'error', message: 'Erro ao exportar o relatório.' });
    } finally {
      dismiss(loadingToastId);
      setExportingId(null);
    }
  };

  return (
    <div className="page-shell pt-10">
      <FullReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        reportId={selectedReportId}
        onRefresh={fetchRelatorios}
        ubsInfo={selectedReportId ? selectedReport : (reports[0] || null)}
      />

      <RelatorioPublicoDashboard
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        reportId={dashboardReportId}
      />

                        <div className="page-panel p-6 rise-fade">
                <div className="flex justify-between items-center mb-5">
          <div>
                        <h1 className="page-title">Relatórios Situacionais</h1>
                        <p className="page-subtitle">{isUserRole ? 'Veja o que está acontecendo na sua UBS' : 'Gerencie os diagnósticos das Unidades Básicas de Saúde'}</p>
          </div>
                    {!isUserRole && (
                                                                                                <button onClick={() => { setSelectedReportId(null); setModalOpen(true); }} className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 rise-fade stagger-2">
                            <PlusIcon className="w-5 h-5" />
                            Criar relatório
                        </button>
                    )}
        </div>

                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 rise-fade stagger-3">
                    <Link
                        to="/mapa-problemas-intervencoes"
                        className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 shadow-sm hover:shadow-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-all group"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/50 transition-colors">
                            <ChartBarIcon className="h-6 w-6 text-cyan-700 dark:text-cyan-400" />
                        </div>
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-white text-sm">Mapa de Problemas e Intervenções</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Registre e acompanhe problemas da UBS</p>
                        </div>
                    </Link>

                    {['GESTOR', 'ADMIN', 'PROFISSIONAL'].includes(user?.role) || user?.cargo === 'Recepcionista' ? (
                        <Link
                            to="/gestao-equipes"
                            className="flex items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-4 shadow-sm hover:shadow-md hover:border-cyan-400 dark:hover:border-cyan-500 transition-all group"
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/50 transition-colors">
                                <UserGroupIcon className="h-6 w-6 text-cyan-700 dark:text-cyan-400" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800 dark:text-white text-sm">Gestão de Equipes e Microáreas</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gerencie equipes e áreas de cobertura</p>
                            </div>
                        </Link>
                    ) : null}
                </div>

                {!isUserRole && (
                  <div className="mb-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 via-white to-blue-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 px-5 py-4 shadow-sm rise-fade stagger-4">
                      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          Salve o rascunho para destravar as seções. Atualize indicadores antes de exportar o PDF.
                      </div>
                  </div>
                )}
                {isUserRole && (
                  <div className="mb-8 rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 px-5 py-4 shadow-sm rise-fade stagger-4">
                      <div className="text-sm text-cyan-800 dark:text-cyan-300">
                          Clique em <strong>Ver relatório</strong> para visualizar as informações da sua UBS de forma clara e visual.
                      </div>
                  </div>
                )}

        {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 flex justify-between items-center">
                <span>{error}</span>
                <button onClick={() => window.location.href = '/login'} className="underline font-bold">Ir para Login</button>
            </div>
        )}

                {loading ? (
                    <div className="p-8 rounded-2xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
                        <div className="h-6 w-40 rounded-full loading-shimmer mb-4" />
                        <div className="h-4 w-2/3 rounded-full loading-shimmer mb-3" />
                        <div className="h-4 w-1/2 rounded-full loading-shimmer" />
                    </div>
                ) : (
                    <div>
                        {reports.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                                {isUserRole
                                  ? 'Nenhum relatório publicado ainda. A equipe da UBS ainda está preparando as informações.'
                                  : 'Nenhum relatório encontrado. Configure a UBS para iniciar o diagnóstico.'}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {reports.map((report) => (
                                    <div
                                      key={report.id}
                                      className={`rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 p-6 transition-shadow ${isUserRole ? 'hover:shadow-md hover:border-cyan-300 dark:hover:border-cyan-700 cursor-pointer' : ''}`}
                                      onClick={isUserRole ? () => { setDashboardReportId(report.id); setDashboardOpen(true); } : undefined}
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                            <div>
                                                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                                    {report.nome_relatorio || 'Diagnóstico situacional'}
                                                </h2>
                                                <p className="text-sm text-gray-500 dark:text-slate-400">UBS: {report.nome_ubs || '-'}</p>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                                                    {!isUserRole && (
                                                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${report.status === 'DRAFT' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'}`}>
                                                          {report.status === 'DRAFT' ? 'RASCUNHO' : 'ENVIADO'}
                                                      </span>
                                                    )}
                                                    <span>CNES: {report.cnes || 'Não informado'}</span>
                                                    <span>Período: {report.periodo_referencia || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                                                {isUserRole ? (
                                                    <>
                                                        <button
                                                            onClick={() => { setDashboardReportId(report.id); setDashboardOpen(true); }}
                                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold transition-colors shadow-sm"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                            Ver relatório
                                                        </button>
                                                        <button
                                                            onClick={() => handleExport(report.id)}
                                                            disabled={exportingId !== null}
                                                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                                            title="Exportar PDF"
                                                        >
                                                            <DocumentArrowDownIcon className="w-4 h-4" />
                                                            {exportingId === report.id ? 'Gerando...' : 'PDF'}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => { setSelectedReportId(report.id); setModalOpen(true); }}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                            title="Editar Relatório"
                                                        >
                                                            <PencilSquareIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleExport(report.id)}
                                                            disabled={exportingId !== null}
                                                            className="p-2 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
                                                            title={exportingId === report.id ? 'Gerando PDF...' : 'Exportar PDF'}
                                                        >
                                                            <DocumentArrowDownIcon className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(report.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                            title="Excluir Relatório"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
      </div>
    </div>
  );
};

export default RelatoriosSituacionais;
