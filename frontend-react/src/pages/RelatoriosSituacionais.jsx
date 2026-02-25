import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDebounce } from '../hooks/useDebounce';
import { useNotifications } from '../components/ui/Notifications';
import { ubsService } from '../services/ubsService';
import { 
    PencilSquareIcon, 
    TrashIcon, 
    DocumentArrowDownIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

// --- COMPONENTES VISUAIS ---

const SectionCard = ({ title, subtitle, children, disabled, lockedMessage }) => (
    <div className={`bg-white shadow-md rounded-lg mb-8 transition-opacity duration-300 ${disabled ? 'opacity-60 relative' : ''}`}>
        {disabled && lockedMessage && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100 bg-opacity-50 rounded-lg">
                <div className="bg-white p-3 rounded shadow border border-gray-200 text-gray-600 font-medium text-sm text-center">
                    {lockedMessage}
                </div>
            </div>
        )}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 rounded-t-lg">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-6 ${disabled ? 'pointer-events-none' : ''}`}>
            {children}
        </div>
    </div>
);

const InputField = ({ label, name, value, onChange, type = 'text', helpText, placeholder, ...props }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
            {label} {props.required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            name={name}
            id={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            {...props}
        />
        {helpText && <p className="mt-2 text-xs text-gray-500 italic">{helpText}</p>}
    </div>
);

const TextAreaField = ({ label, name, value, onChange, helpText, placeholder, ...props }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">
            {label} {props.required && <span className="text-red-500">*</span>}
        </label>
        <textarea
            name={name}
            id={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            rows={props.rows || 4}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            {...props}
        />
        {helpText && <p className="mt-2 text-xs text-gray-500 italic">{helpText}</p>}
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
                    <div key={ind.id} className="p-4 border rounded bg-white shadow-sm border-blue-100 relative group">
                        <button 
                            onClick={() => handleDelete(ind.id)}
                            className="absolute top-2 right-2 p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                        <h4 className="font-bold text-gray-700 text-sm pr-6">{ind.nome_indicador}</h4>
                        <p className="text-xl font-bold text-blue-600 mt-1">{formatIndicatorValue(ind.valor, ind.tipo_valor)}</p>
                        <p className="text-xs text-gray-500 mt-1">Período: {ind.periodo_referencia || "-"}</p>
                        <p className="text-xs text-gray-500">Meta: {formatIndicatorValue(ind.meta, ind.tipo_valor)}</p>
                        <p className="text-xs text-gray-400">Tipo: {(valueTypeOptions.find(option => option.value === ind.tipo_valor) || valueTypeOptions[0]).label}</p>
                    </div>
                ))}
            </div>

            <div className="p-4 border rounded-md bg-green-50">
                <h4 className="font-bold text-green-900 mb-4 text-sm uppercase">Adicionar ou atualizar indicador</h4>
                <div className="mb-6 space-y-4">
                    {indicatorPresetGroups.map(group => (
                        <div key={group.title}>
                            <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">{group.title}</p>
                            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {group.items.map(item => (
                                    <div key={item.name} className="rounded-md border border-green-200 bg-white p-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, nome_indicador: item.name }))}
                                            className="text-xs font-semibold text-green-700 hover:text-green-900"
                                        >
                                            {item.name}
                                        </button>
                                        <p className="text-[11px] text-green-700/80 mt-1">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleAdd}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <InputField
                            label="Nome do indicador"
                            name="nome_indicador"
                            value={formData.nome_indicador}
                            onChange={e => setFormData(p => ({...p, nome_indicador: e.target.value}))}
                            required
                            placeholder="Ex: Hipertensao com PA aferida"
                            helpText="Dica: use os atalhos acima para preencher mais rapido."
                        />
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Tipo de valor *</label>
                            <select
                                value={formData.tipo_valor}
                                onChange={e => setFormData(p => ({...p, tipo_valor: e.target.value}))}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
                                required
                            >
                                {valueTypeOptions.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-500 italic">Escolha a unidade para valor e meta.</p>
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
                            <label className="block text-sm font-medium text-gray-700">Período (trimestre) *</label>
                            <select
                                value={formData.periodo_quadrimestre}
                                onChange={e => setFormData(p => ({...p, periodo_quadrimestre: e.target.value}))}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
                                required
                            >
                                <option value="">Selecionar</option>
                                <option value="Q1">Q1</option>
                                <option value="Q2">Q2</option>
                                <option value="Q3">Q3</option>
                                <option value="Q4">Q4</option>
                            </select>
                            <p className="mt-2 text-xs text-gray-500 italic">Use o trimestre do período analisado.</p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Ano *</label>
                            <select
                                value={formData.periodo_ano}
                                onChange={e => setFormData(p => ({...p, periodo_ano: e.target.value}))}
                                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm"
                                required
                            >
                                <option value="">Selecionar</option>
                                {yearOptions.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-500 italic">Exemplo: Q3/2025.</p>
                        </div>
                    </div>
                    <TextAreaField label="Observações (opcional)" name="observacoes" rows={2} value={formData.observacoes} onChange={e => setFormData(p => ({...p, observacoes: e.target.value}))} placeholder="Fonte dos dados, critérios, etc."/>
                    <div className="flex justify-end gap-2 mt-2">
                        <button type="button" onClick={() => setFormData({ nome_indicador: '', valor: '', meta: '', tipo_valor: 'PERCENTUAL', periodo_quadrimestre: '', periodo_ano: '', observacoes: '' })} className="text-sm font-medium text-gray-600 hover:underline">Limpar</button>
                        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 transition-colors">Salvar indicador</button>
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
                    <div key={prof.id} className="flex justify-between items-center p-3 border rounded bg-gray-50 relative group">
                        <div>
                            <p className="font-bold text-gray-800">{prof.cargo_funcao}</p>
                            <p className="text-xs text-gray-500">{prof.observacoes}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">Qtd: {prof.quantidade}</span>
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

            <div className="p-4 border rounded-md bg-indigo-50">
                <h4 className="font-bold text-indigo-900 mb-4 text-sm uppercase">Adicionar ou atualizar profissional</h4>
                <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InputField label="Cargo / função" name="cargo_funcao" value={formData.cargo_funcao} onChange={e => setFormData(p => ({...p, cargo_funcao: e.target.value}))} required placeholder="Ex: Enfermeiro da Família"/>
                    <InputField label="Quantidade" name="quantidade" type="number" value={formData.quantidade} onChange={e => setFormData(p => ({...p, quantidade: e.target.value}))} required placeholder="Ex: 2"/>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Tipo de vínculo *</label>
                        <select value={formData.tipo_vinculo} onChange={e => setFormData(p => ({...p, tipo_vinculo: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm" required>
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
                        <button type="button" onClick={() => setFormData({ cargo_funcao: '', quantidade: '', tipo_vinculo: '', observacoes: '' })} className="text-sm font-medium text-gray-600 hover:underline">Limpar</button>
                        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 transition-colors">Salvar profissional</button>
                    </div>
                </form>
            </div>
        </SectionCard>
    );
}

const AttachmentsSection = ({ ubsId, initialData, onUpdate }) => {
    const { notify, confirm } = useNotifications();
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState('');
    const [section, setSection] = useState('PROBLEMAS');
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            notify({ type: 'warning', message: 'Selecione um arquivo.' });
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('files', file);
        formData.append('description', description);
        formData.append('section', section);
        try {
            await axios.post(`/api/ubs/${ubsId}/attachments`, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setFile(null); setDescription(''); onUpdate(); 
        } catch(err) {
            notify({ type: 'error', message: 'Erro ao enviar anexo.' });
        }
        finally { setIsUploading(false); }
    }

    const handleDelete = async (attachmentId) => {
        const confirmed = await confirm({
            title: 'Remover anexo',
            message: 'Deseja remover este anexo?',
            confirmLabel: 'Remover',
            cancelLabel: 'Cancelar',
        });
        if (!confirmed) return;
        try {
            await axios.delete(`/api/ubs/attachments/${attachmentId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            onUpdate();
        } catch (err) {
            notify({ type: 'error', message: 'Erro ao remover o anexo.' });
        }
    };

    return (
        <SectionCard title="Anexos" subtitle="Envie fotos e arquivos relacionados (ex.: registros fotográficos)." disabled={!ubsId} lockedMessage="Salve o rascunho para habilitar os anexos.">
             <form onSubmit={handleUpload} className="p-4 border rounded-md bg-gray-50 mb-6 space-y-4">
                <input type="file" onChange={e => setFile(e.target.files[0])} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-blue-50 file:text-blue-700"/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700">Seção do PDF</label>
                        <select value={section} onChange={e => setSection(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm">
                            <option value="PROBLEMAS">Problemas identificados</option>
                            <option value="NEC_EQUIP_INSUMOS">Necessidades (equipamentos e insumos)</option>
                            <option value="NEC_INFRA">Necessidades (infraestrutura e manutenção)</option>
                            <option value="NEC_ACS">Necessidades (ACS)</option>
                            <option value="TERRITORIO">Território</option>
                            <option value="POTENCIALIDADES">Potencialidades</option>
                            <option value="RISCOS">Riscos e vulnerabilidades</option>
                            <option value="GERAL">Identificação</option>
                        </select>
                    </div>
                    <InputField label="Legenda/descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex.: Foto da janela quebrada"/>
                </div>
                <button type="submit" disabled={isUploading} className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {isUploading ? 'Enviando...' : 'Enviar anexos'}
                </button>
             </form>
             <h4 className="font-bold text-gray-700 mb-2">Anexos enviados</h4>
             <ul className="divide-y divide-gray-200">
                 {initialData && initialData.map(att => (
                     <li key={att.id} className="py-3 flex justify-between items-center text-sm">
                         <span>{att.original_filename} <span className="text-gray-500">({att.description || att.section})</span></span>
                         <div className="flex gap-3">
                            <a href={`/api/ubs/attachments/${att.id}/download`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Baixar</a>
                            <button
                                type="button"
                                onClick={() => handleDelete(att.id)}
                                className="text-red-600 hover:underline"
                            >
                                Remover
                            </button>
                         </div>
                     </li>
                 ))}
                 {(!initialData || initialData.length === 0) && <li className="text-center py-4 text-gray-500 italic">Nenhum anexo enviado.</li>}
             </ul>
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
        const nextId = reportId || ubsInfo?.id || null;
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
                attachments: response.data.attachments,
                indicators: response.data.indicators_latest
            };
            setReportData(full);
            setGeneralData({ ...full, isDirty: false });
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const preparePayload = (data) => {
        const { isDirty, id, created_at, updated_at, status, owner_user_id, tenant_id, submitted_at, professionals, territory, needs, attachments, indicators, ...cleaned } = data;
        const numericFields = ['numero_habitantes_ativos', 'numero_familias_cadastradas', 'numero_microareas', 'numero_domicilios', 'domicilios_rurais'];
        Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === "") cleaned[key] = numericFields.includes(key) ? 0 : null;
            else if (numericFields.includes(key) && cleaned[key] !== null) cleaned[key] = parseInt(cleaned[key], 10) || 0;
        });
        return cleaned;
    };

    useEffect(() => {
        if (id && debouncedGeneralData && !loading && debouncedGeneralData.isDirty) {
            const updateData = async () => {
                setSaveStatus('Salvando...');
                try {
                    const payload = preparePayload(debouncedGeneralData);
                    await axios.patch(`/api/ubs/${id}`, payload, { headers: { Authorization: `Bearer ${getToken()}` } });
                    setSaveStatus('Salvo');
                    setGeneralData(prev => ({...prev, isDirty: false}));
                    if(onRefresh) onRefresh();
                } catch (err) { setSaveStatus('Erro ao salvar'); }
            };
            updateData();
        }
    }, [debouncedGeneralData, id, loading]);

    const handleGeneralChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setGeneralData(prev => ({ ...prev, [name]: val, isDirty: true }));
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
            <div className="bg-gray-100 w-full max-w-7xl rounded-lg shadow-2xl flex flex-col max-h-[95vh]">
                
                {/* --- HEADER --- */}
                <div className="bg-white px-8 py-5 border-b flex justify-between items-center rounded-t-lg">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Diagnóstico Situacional da UBS</h2>
                        <p className="text-sm text-gray-500">Formulário para registro de dados do relatório situacional da Unidade Básica de Saúde</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`text-sm italic font-medium ${saveStatus === 'Erro ao salvar' ? 'text-red-600' : saveStatus === 'Salvando...' ? 'text-yellow-600' : 'text-green-600'}`}>{saveStatus}</span>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors text-3xl font-light">&times;</button>
                    </div>
                </div>

                {/* --- CORPO --- */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    {isLocked && (
                        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                            Configure a UBS primeiro para liberar o preenchimento do relatório.
                        </div>
                    )}

                    <div className={isLocked ? 'opacity-60 pointer-events-none' : ''}>
                    
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

                    <AttachmentsSection ubsId={id} initialData={reportData?.attachments} onUpdate={() => fetchFullData(id)} />

                    <SectionCard title="Informações gerais da UBS">
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

                    <SectionCard title="Serviços oferecidos pela UBS" subtitle="Marque os serviços que a UBS oferece diretamente à população.">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {availableServices.map(s => (
                                <label key={s} className="flex items-center space-x-2 text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 hover:bg-gray-100 transition-colors">
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
                                <button onClick={() => handleSectionPut('territory', reportData?.territory || { descricao_territorio: '', potencialidades_territorio: '', riscos_vulnerabilidades: '' })} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700">Salvar seção</button>
                            </div>
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
                                <button onClick={() => handleSectionPut('needs', reportData?.needs || { problemas_identificados: '', necessidades_equipamentos_insumos: '', necessidades_especificas_acs: '', necessidades_infraestrutura_manutencao: '' })} className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700">Salvar seção</button>
                            </div>
                        </div>
                    </SectionCard>

                    {!id && (
                        <div className="flex justify-center my-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="text-center">
                                <p className="mb-4 text-blue-800 font-medium">Preencha Nome da UBS, CNES e Área de atuação acima e clique abaixo para desbloquear as demais seções.</p>
                                <button onClick={handleCreateDraft} className="bg-blue-600 text-white px-10 py-4 rounded-lg font-bold text-xl shadow-lg hover:bg-blue-700 transition-all">Salvar rascunho</button>
                            </div>
                        </div>
                    )}

                    </div>
                </div>

                <div className="bg-white px-8 py-5 border-t flex justify-end gap-4 rounded-b-lg">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-500 text-white rounded font-bold hover:bg-gray-600 transition-colors">Fechar</button>
                    {id && (
                        <>
                            <button
                                onClick={() => notify({ type: 'info', message: 'Rascunho salvo automaticamente.' })}
                                className="px-6 py-2 bg-indigo-50 text-indigo-700 rounded font-bold border border-indigo-200"
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
    const { notify, confirm } = useNotifications();
    const [ubsInfo, setUbsInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(null);

  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const isUserRole = user?.role === 'USER';

  const fetchRelatorios = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Sessão expirada. Faça login.'); setLoading(false); return; }
            const data = await ubsService.getSingleUbs();
            setUbsInfo(data);
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
            setUbsInfo(null);
        } catch (err) {
            notify({ type: 'error', message: 'Erro ao excluir o relatório.' });
        }
  };

  const handleExport = (id) => {
    const token = localStorage.getItem('token');
    axios.get(`/api/ubs/${id}/export/pdf`, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' })
    .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a'); link.href = url;
        link.setAttribute('download', `relatorio_${id}.pdf`);
        document.body.appendChild(link); link.click();
        }).catch(() => notify({ type: 'error', message: 'Erro ao exportar o relatório.' }));
  };

  return (
    <>
      <FullReportModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        reportId={selectedReportId} 
        onRefresh={fetchRelatorios}
                ubsInfo={ubsInfo}
      />

            <div className="container mx-auto mt-10 p-6 bg-white rounded-xl shadow-lg rise-fade">
                <div className="flex justify-between items-center mb-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Relatórios Situacionais</h1>
            <p className="text-gray-500 mt-1">Gerencie os diagnósticos das Unidades Básicas de Saúde</p>
          </div>
                    {!isUserRole && !ubsInfo && (
                                                <button onClick={() => { setSelectedReportId(null); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 rise-fade stagger-2">
                            <PlusIcon className="w-5 h-5" />
                            Criar relatório
                        </button>
                    )}
                    {!isUserRole && ubsInfo && (
                                                <button onClick={() => { setSelectedReportId(ubsInfo.id); setModalOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 rise-fade stagger-2">
                            <PencilSquareIcon className="w-5 h-5" />
                            Editar relatório
                        </button>
                    )}
        </div>

                <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-blue-50 px-5 py-4 shadow-sm rise-fade stagger-3">
                    <div className="text-sm font-medium text-slate-600">
                        Salve o rascunho para destravar seções e anexos. Atualize indicadores antes de exportar o PDF.
                    </div>
                </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex justify-between items-center">
                <span>{error}</span>
                <button onClick={() => window.location.href = '/login'} className="underline font-bold">Ir para Login</button>
            </div>
        )}

                {loading ? (
                    <div className="p-8 rounded-2xl border border-gray-100 bg-gray-50">
                        <div className="h-6 w-40 rounded-full loading-shimmer mb-4" />
                        <div className="h-4 w-2/3 rounded-full loading-shimmer mb-3" />
                        <div className="h-4 w-1/2 rounded-full loading-shimmer" />
                    </div>
                ) : (
                    <div>
                        {!ubsInfo ? (
                            <div className="text-center py-12 text-gray-500">
                                Nenhum relatório encontrado. Configure a UBS para iniciar o diagnóstico.
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-gray-800">
                                            {ubsInfo.nome_relatorio || 'Diagnóstico situacional'}
                                        </h2>
                                        <p className="text-sm text-gray-500">UBS: {ubsInfo.nome_ubs || '-'}</p>
                                        <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${ubsInfo.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                {ubsInfo.status === 'DRAFT' ? 'RASCUNHO' : 'ENVIADO'}
                                            </span>
                                            <span>CNES: {ubsInfo.cnes || 'Nao informado'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {!isUserRole && (
                                            <button
                                                onClick={() => { setSelectedReportId(ubsInfo.id); setModalOpen(true); }}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                                                title="Editar Relatório"
                                            >
                                                <PencilSquareIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleExport(ubsInfo.id)}
                                            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                                            title="Exportar PDF"
                                        >
                                            <DocumentArrowDownIcon className="w-5 h-5" />
                                        </button>
                                        {!isUserRole && (
                                            <button
                                                onClick={() => handleDelete(ubsInfo.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                                                title="Excluir Relatório"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
      </div>
    </>
  );
};

export default RelatoriosSituacionais;
