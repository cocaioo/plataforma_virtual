import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useDebounce } from '../hooks/useDebounce';

// --- Componentes Reutilizáveis ---

const SectionCard = ({ title, children }) => (
    <div className="bg-white shadow-md rounded-lg mb-8">
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 rounded-t-lg">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-6">
            {children}
        </div>
    </div>
);

const InputField = ({ label, name, value, onChange, type = 'text', helpText, ...props }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <input
            type={type}
            name={name}
            id={name}
            value={value || ''}
            onChange={onChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            {...props}
        />
        {helpText && <p className="mt-2 text-xs text-gray-500">{helpText}</p>}
    </div>
);

const TextAreaField = ({ label, name, value, onChange, helpText, ...props }) => (
    <div className="mb-4">
        <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
        <textarea
            name={name}
            id={name}
            value={value || ''}
            onChange={onChange}
            rows={5}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            {...props}
        />
        {helpText && <p className="mt-2 text-xs text-gray-500">{helpText}</p>}
    </div>
);

// --- SEÇÕES COM LÓGICA PRÓPRIA ---

const NeedsSection = ({ ubsId, initialData }) => {
    const [data, setData] = useState(initialData || {});
    const [status, setStatus] = useState('idle');

    useEffect(() => { if(initialData) setData(initialData); }, [initialData]);

    const handleSave = async () => {
        setStatus('saving');
        try {
            await axios.put(`/api/ubs/${ubsId}/needs`, data, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setStatus('success'); setTimeout(() => setStatus('idle'), 2000);
        } catch(err) { setStatus('error'); }
    }

    return (
        <SectionCard title="Problemas e Necessidades da UBS">
            <div className="space-y-6">
                <TextAreaField label="Problemas Identificados" name="problemas_identificados" value={data.problemas_identificados} onChange={e => setData(p => ({...p, [e.target.name]: e.target.value}))} required helpText="Descreva os principais problemas da UBS: espaço físico, sobrecarga, filas, agendamento, etc."/>
                <TextAreaField label="Necessidades de Equipamentos e Insumos" name="necessidades_equipamentos_insumos" value={data.necessidades_equipamentos_insumos} onChange={e => setData(p => ({...p, [e.target.name]: e.target.value}))} />
                <TextAreaField label="Necessidades de Infraestrutura e Manutenção" name="necessidades_infraestrutura_manutencao" value={data.necessidades_infraestrutura_manutencao} onChange={e => setData(p => ({...p, [e.target.name]: e.target.value}))} />
                <TextAreaField label="Necessidades Específicas dos ACS" name="necessidades_especificas_acs" value={data.necessidades_especificas_acs} onChange={e => setData(p => ({...p, [e.target.name]: e.target.value}))} />
                
                <div className="text-right">
                    <button onClick={handleSave} disabled={status === 'saving'} className={`font-bold py-2 px-4 rounded-md shadow-sm text-white ${status === 'error' ? 'bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {status === 'saving' ? 'Salvando...' : (status === 'success' ? 'Salvo!' : 'Salvar Seção')}
                    </button>
                </div>
            </div>
        </SectionCard>
    );
}

const TerritorySection = ({ ubsId, initialData }) => {
    const [data, setData] = useState(initialData || {});
    const [status, setStatus] = useState('idle');

    useEffect(() => { if(initialData) setData(initialData); }, [initialData]);

    const handleSave = async () => {
        setStatus('saving');
        try {
            await axios.put(`/api/ubs/${ubsId}/territory`, data, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setStatus('success'); setTimeout(() => setStatus('idle'), 2000);
        } catch(err) { setStatus('error'); }
    }

    return (
        <SectionCard title="Território e Determinantes Sociais">
            <div className="space-y-6">
                 <TextAreaField label="Descrição do Território" name="descricao_territorio" value={data.descricao_territorio} onChange={e => setData(p => ({...p, [e.target.name]: e.target.value}))} required helpText="Inclua características geográficas, demográficas, sociais e econômicas." />
                 <TextAreaField label="Potencialidades do Território" name="potencialidades_territorio" value={data.potencialidades_territorio} onChange={e => setData(p => ({...p, [e.target.name]: e.target.value}))} helpText="Descreva os pontos fortes da comunidade, como redes de apoio, equipamentos sociais, etc." />
                 <TextAreaField label="Riscos e Vulnerabilidades" name="riscos_vulnerabilidades" value={data.riscos_vulnerabilidades} onChange={e => setData(p => ({...p, [e.target.name]: e.target.value}))} helpText="Mapeie áreas de risco, violência, saneamento precário, etc."/>
                <div className="text-right">
                    <button onClick={handleSave} disabled={status === 'saving'} className={`font-bold py-2 px-4 rounded-md shadow-sm text-white ${status === 'error' ? 'bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        {status === 'saving' ? 'Salvando...' : (status === 'success' ? 'Salvo!' : 'Salvar Seção')}
                    </button>
                </div>
            </div>
        </SectionCard>
    );
}

const ProfessionalsSection = ({ ubsId, initialData, onUpdate }) => {
    const [formData, setFormData] = useState({ cargo_funcao: '', quantidade: 1, tipo_vinculo: '' });
    
    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/ubs/${ubsId}/professionals`, formData, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            setFormData({ cargo_funcao: '', quantidade: 1, tipo_vinculo: '' }); 
            onUpdate(); 
        } catch(err) { alert("Erro ao adicionar profissional."); }
    }

    return (
        <SectionCard title="Profissionais da Equipe">
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-md bg-gray-50 mb-6">
                <InputField label="Cargo/Função" name="cargo_funcao" value={formData.cargo_funcao} onChange={e => setFormData(p => ({...p, cargo_funcao: e.target.value}))} required/>
                <InputField label="Quantidade" name="quantidade" type="number" value={formData.quantidade} onChange={e => setFormData(p => ({...p, quantidade: e.target.value}))} required/>
                <InputField label="Vínculo" name="tipo_vinculo" value={formData.tipo_vinculo} onChange={e => setFormData(p => ({...p, tipo_vinculo: e.target.value}))} required placeholder="Ex: Estatutário"/>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md shadow-sm h-fit mb-4">+ Adicionar</button>
            </form>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantidade</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vínculo</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {initialData && initialData.map(prof => (
                            <tr key={prof.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{prof.cargo_funcao}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{prof.quantidade}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{prof.tipo_vinculo}</td>
                            </tr>
                        ))}
                        {(!initialData || initialData.length === 0) && <tr><td colSpan="3" className="text-center py-4 text-gray-500">Nenhum profissional adicionado.</td></tr>}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
}

const AttachmentsSection = ({ ubsId, initialData, onUpdate }) => {
    const [file, setFile] = useState(null);
    const [description, setDescription] = useState('');
    const [section, setSection] = useState('GERAL');
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) { alert("Selecione um arquivo."); return; }
        
        setIsUploading(true);
        const formData = new FormData();
        formData.append('files', file);
        formData.append('description', description);
        formData.append('section', section);
        
        try {
            await axios.post(`/api/ubs/${ubsId}/attachments`, formData, { 
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${localStorage.getItem('token')}` } 
            });
            setFile(null); setDescription('');
            onUpdate(); 
        } catch(err) { alert("Erro ao enviar anexo."); }
        finally { setIsUploading(false); }
    }

    return (
        <SectionCard title="Anexos">
             <form onSubmit={handleUpload} className="p-4 border rounded-md bg-gray-50 mb-6 space-y-4">
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Arquivo</label>
                    <input type="file" onChange={e => setFile(e.target.files[0])} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                </div>
                <InputField label="Descrição" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Planta da UBS"/>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Seção do Relatório</label>
                    <select 
                        value={section} 
                        onChange={e => setSection(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                        <option value="GERAL">Geral / Identificação</option>
                        <option value="PROBLEMAS">Problemas Identificados</option>
                        <option value="TERRITORIO">Território</option>
                        <option value="EQUIPAMENTOS">Equipamentos e Insumos</option>
                        <option value="INFRAESTRUTURA">Infraestrutura</option>
                    </select>
                </div>
                <button type="submit" disabled={isUploading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md shadow-sm disabled:opacity-50">
                    {isUploading ? 'Enviando...' : '+ Adicionar Anexo'}
                </button>
             </form>
             
             <ul className="divide-y divide-gray-200">
                 {initialData && initialData.map(att => (
                     <li key={att.id} className="py-3 flex justify-between items-center">
                         <div className="text-sm">
                             <span className="font-medium text-gray-900">{att.original_filename}</span>
                             <span className="text-gray-500 ml-2">({att.description || 'Sem descrição'}) - {att.section}</span>
                         </div>
                         <a 
                             href={`/api/ubs/attachments/${att.id}/download`} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                         >
                             Baixar
                         </a>
                     </li>
                 ))}
                 {(!initialData || initialData.length === 0) && <li className="text-center py-4 text-gray-500">Nenhum anexo.</li>}
             </ul>
        </SectionCard>
    );
}

// --- Página Principal ---

const DiagnosticoUBS = () => {
    const { id } = useParams();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveStatus, setSaveStatus] = useState('Salvo');
    
    // Using a separate state for general data to avoid issues with nested objects in debounce
    const [generalData, setGeneralData] = useState(null);
    
    const debouncedGeneralData = useDebounce(generalData, 2000); 
    const getToken = () => localStorage.getItem('token');

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const response = await axios.get(`/api/ubs/${id}/diagnosis`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const fullData = {
                ...response.data.ubs,
                professionals: response.data.professional_groups,
                territory: response.data.territory_profile,
                needs: response.data.needs,
                attachments: response.data.attachments
            };
            setReportData(fullData);
            
            setGeneralData({
                nome_relatorio: fullData.nome_relatorio,
                periodo_referencia: fullData.periodo_referencia,
                responsavel_nome: fullData.responsavel_nome,
                responsavel_cargo: fullData.responsavel_cargo,
                responsavel_contato: fullData.responsavel_contato,
                identificacao_equipe: fullData.identificacao_equipe,
                nome_ubs: fullData.nome_ubs,
                cnes: fullData.cnes,
                area_atuacao: fullData.area_atuacao,
                data_inauguracao: fullData.data_inauguracao,
                data_ultima_reforma: fullData.data_ultima_reforma,
                numero_habitantes_ativos: fullData.numero_habitantes_ativos,
                numero_familias_cadastradas: fullData.numero_familias_cadastradas,
                numero_microareas: fullData.numero_microareas,
                numero_domicilios: fullData.numero_domicilios,
                domicilios_rurais: fullData.domicilios_rurais,
                
                // Novos campos adicionados
                fluxo_agenda_acesso: fullData.fluxo_agenda_acesso,
                descritivos_gerais: fullData.descritivos_gerais,
                observacoes_gerais: fullData.observacoes_gerais,
                outros_servicos: fullData.outros_servicos,
                
                isDirty: false 
            });

        } catch (err) {
            console.error(err);
            setError('Falha ao carregar os dados do relatório.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (debouncedGeneralData && !loading && debouncedGeneralData.isDirty) {
            const updateData = async () => {
                setSaveStatus('Salvando...');
                try {
                    const { isDirty, ...payload } = debouncedGeneralData;
                    await axios.patch(`/api/ubs/${id}`, payload, { headers: { Authorization: `Bearer ${getToken()}` } });
                    setSaveStatus('Salvo');
                    setGeneralData(prev => ({...prev, isDirty: false})); 
                } catch (err) {
                    console.error(err);
                    setSaveStatus('Erro ao salvar');
                }
            };
            updateData();
        }
    }, [debouncedGeneralData, id, loading]);

    const handleAutoSaveChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setGeneralData(prev => ({ ...prev, [name]: val, isDirty: true }));
    };

    const forceRefresh = () => fetchData();

    if (loading) return <div className="text-center p-10">Carregando diagnóstico...</div>;
    if (error) return <div className="bg-red-100 text-red-700 p-4 rounded-md text-center mt-10">{error}</div>;
    if (!reportData || !generalData) return null;

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto p-4 sm:p-8">
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Diagnóstico Situacional da UBS</h1>
                        <p className="text-gray-600">{generalData.nome_relatorio || generalData.nome_ubs}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`text-sm italic font-medium hidden md:inline ${saveStatus === 'Erro ao salvar' ? 'text-red-500' : 'text-gray-500'}`}>
                            {saveStatus}
                        </span>
                        <Link to="/relatorios-situacionais" className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md shadow-sm">
                            Voltar
                        </Link>
                    </div>
                </div>

                <SectionCard title="Identificação do Relatório">
                    <InputField label="Nome do relatório" name="nome_relatorio" value={generalData.nome_relatorio} onChange={handleAutoSaveChange} helpText="Um nome curto para fácil identificação." required/>
                </SectionCard>
                
                <SectionCard title="Metadados do Relatório">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <InputField label="Período de Referência" name="periodo_referencia" value={generalData.periodo_referencia} onChange={handleAutoSaveChange} helpText="Ex: Jan/2023 a Jun/2023" />
                        <InputField label="Responsável (nome)" name="responsavel_nome" value={generalData.responsavel_nome} onChange={handleAutoSaveChange}/>
                        <InputField label="Responsável (cargo)" name="responsavel_cargo" value={generalData.responsavel_cargo} onChange={handleAutoSaveChange}/>
                        <InputField label="Responsável (contato)" name="responsavel_contato" value={generalData.responsavel_contato} onChange={handleAutoSaveChange}/>
                        <InputField label="Identificação da Equipe" name="identificacao_equipe" value={generalData.identificacao_equipe} onChange={handleAutoSaveChange} helpText="ESF nº" />
                     </div>
                </SectionCard>

                <SectionCard title="Fluxo, Agenda e Acesso">
                    <TextAreaField label="Fluxo, agenda e acesso" name="fluxo_agenda_acesso" value={generalData.fluxo_agenda_acesso} onChange={handleAutoSaveChange} helpText="Descreva como funciona acolhimento, agendamento, demanda espontânea, etc."/>
                </SectionCard>

                <SectionCard title="Informações Gerais da UBS">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InputField label="Nome da UBS" name="nome_ubs" value={generalData.nome_ubs} onChange={handleAutoSaveChange} required/>
                        <InputField label="CNES" name="cnes" value={generalData.cnes} onChange={handleAutoSaveChange} required/>
                        <div className="md:col-span-2 lg:col-span-1">
                             <InputField label="Área de Atuação" name="area_atuacao" value={generalData.area_atuacao} onChange={handleAutoSaveChange} required/>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <InputField label="Data de Inauguração" name="data_inauguracao" type="date" value={generalData.data_inauguracao} onChange={handleAutoSaveChange}/>
                        <InputField label="Data da Última Reforma" name="data_ultima_reforma" type="date" value={generalData.data_ultima_reforma} onChange={handleAutoSaveChange}/>
                     </div>
                     <div className="mt-4">
                        <TextAreaField label="Descritivos gerais" name="descritivos_gerais" value={generalData.descritivos_gerais} onChange={handleAutoSaveChange} helpText="Perfil de referência, localização estratégica, etc."/>
                        <TextAreaField label="Observações gerais" name="observacoes_gerais" value={generalData.observacoes_gerais} onChange={handleAutoSaveChange} helpText="Histórico, mudanças recentes, projetos em andamento."/>
                     </div>
                </SectionCard>
                
                <SectionCard title="Serviços Oferecidos">
                    <p className="text-sm text-gray-500 mb-4">Marque os serviços (apenas visualização - funcionalidade completa em breve).</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
                        {["Programa Saúde da Família", "Atendimento médico", "Atendimento de enfermagem", "Atendimento odontológico", "Vacina", "Pré-natal"].map(s => (
                            <label key={s} className="flex items-center space-x-2 text-sm text-gray-700">
                                <input type="checkbox" className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50" />
                                <span>{s}</span>
                            </label>
                        ))}
                    </div>
                    <InputField label="Outros serviços (especificar)" name="outros_servicos" value={generalData.outros_servicos} onChange={handleAutoSaveChange} placeholder="Descreva outros serviços ofertados..."/>
                </SectionCard>

                <SectionCard title="Indicadores Epidemiológicos">
                    <div className="bg-yellow-50 p-4 rounded-md mb-4">
                        <p className="text-sm text-yellow-700">Funcionalidade em desenvolvimento. Abaixo, exemplos de indicadores.</p>
                    </div>
                    <div className="space-y-4 opacity-75">
                         <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                            <div>
                                <p className="font-medium">Hipertensos cadastrados</p>
                                <p className="text-xs text-gray-500">Último valor: 325 - Período: 2023 Q1</p>
                            </div>
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded">Número absoluto</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                            <div>
                                <p className="font-medium">Diabéticos cadastrados</p>
                                <p className="text-xs text-gray-500">Último valor: 180 - Período: 2023 Q1</p>
                            </div>
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded">Número absoluto</span>
                         </div>
                    </div>
                </SectionCard>

                <SectionCard title="Demografia e População">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <InputField label="Habitantes ativos" name="numero_habitantes_ativos" type="number" value={generalData.numero_habitantes_ativos} onChange={handleAutoSaveChange}/>
                        <InputField label="Microáreas" name="numero_microareas" type="number" value={generalData.numero_microareas} onChange={handleAutoSaveChange}/>
                        <InputField label="Famílias cadastradas" name="numero_familias_cadastradas" type="number" value={generalData.numero_familias_cadastradas} onChange={handleAutoSaveChange}/>
                        <InputField label="Domicílios" name="numero_domicilios" type="number" value={generalData.numero_domicilios} onChange={handleAutoSaveChange}/>
                        <InputField label="Domicílios rurais" name="domicilios_rurais" type="number" value={generalData.domicilios_rurais} onChange={handleAutoSaveChange}/>
                    </div>
                </SectionCard>
                
                <ProfessionalsSection ubsId={id} initialData={reportData.professionals} onUpdate={forceRefresh} />
                <TerritorySection ubsId={id} initialData={reportData.territory} />
                <NeedsSection ubsId={id} initialData={reportData.needs} />
                <AttachmentsSection ubsId={id} initialData={reportData.attachments} onUpdate={forceRefresh} />
                
            </div>
        </div>
    );
};

export default DiagnosticoUBS;
