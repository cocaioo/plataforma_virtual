import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

// Página do formulário "Diagnóstico Situacional da UBS"
export function DiagnosticoUBS() {
  const [ubsId, setUbsId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentSection, setAttachmentSection] = useState("PROBLEMAS");
  const [attachmentDescription, setAttachmentDescription] = useState("");

  const [form, setForm] = useState({
    nome_relatorio: "",
    periodo_referencia: "",
    identificacao_equipe: "",
    responsavel_nome: "",
    responsavel_cargo: "",
    responsavel_contato: "",
    nome_ubs: "",
    cnes: "",
    area_atuacao: "",
    numero_habitantes_ativos: "",
    numero_microareas: "",
    numero_familias_cadastradas: "",
    numero_domicilios: "",
    domicilios_rurais: "",
    data_inauguracao: "",
    data_ultima_reforma: "",
    gestao_modelo_atencao: "",
    descritivos_gerais: "",
    observacoes_gerais: "",
    fluxo_agenda_acesso: "",
    outros_servicos: "",
  });

  const [territory, setTerritory] = useState({
    descricao_territorio: "",
    potencialidades_territorio: "",
    riscos_vulnerabilidades: "",
  });

  const [needs, setNeeds] = useState({
    problemas_identificados: "",
    necessidades_equipamentos_insumos: "",
    necessidades_especificas_acs: "",
    necessidades_infraestrutura_manutencao: "",
  });

  const toIntOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const ubsPayload = useMemo(
    () => ({
      nome_relatorio: form.nome_relatorio || null,
      periodo_referencia: form.periodo_referencia || null,
      identificacao_equipe: form.identificacao_equipe || null,
      responsavel_nome: form.responsavel_nome || null,
      responsavel_cargo: form.responsavel_cargo || null,
      responsavel_contato: form.responsavel_contato || null,
      fluxo_agenda_acesso: form.fluxo_agenda_acesso || null,
      nome_ubs: form.nome_ubs,
      cnes: form.cnes,
      area_atuacao: form.area_atuacao,
      numero_habitantes_ativos: toIntOrNull(form.numero_habitantes_ativos),
      numero_microareas: toIntOrNull(form.numero_microareas),
      numero_familias_cadastradas: toIntOrNull(form.numero_familias_cadastradas),
      numero_domicilios: toIntOrNull(form.numero_domicilios),
      domicilios_rurais: toIntOrNull(form.domicilios_rurais),
      data_inauguracao: form.data_inauguracao || null,
      data_ultima_reforma: form.data_ultima_reforma || null,
      descritivos_gerais: form.descritivos_gerais || null,
      observacoes_gerais: form.observacoes_gerais || null,
      outros_servicos: form.outros_servicos || null,
    }),
    [form]
  );

  async function refreshAttachments(id = ubsId) {
    if (!id) return;
    try {
      const list = await api.listAttachments(id);
      setAttachments(Array.isArray(list) ? list : []);
    } catch {
      // silencioso (não bloqueia o usuário)
    }
  }

  useEffect(() => {
    if (!ubsId) return;
    refreshAttachments(ubsId);
  }, [ubsId]);

  async function handleUploadSelectedFiles(id = ubsId) {
    if (!id) {
      window.alert("Salve o rascunho antes de enviar anexos.");
      return;
    }
    if (!selectedFiles || selectedFiles.length === 0) return;
    if (isUploading || isSaving || isSubmitting) return;
    setIsUploading(true);
    try {
      await api.uploadAttachments(id, selectedFiles, {
        section: attachmentSection,
        description: attachmentDescription,
      });
      setSelectedFiles([]);
      setAttachmentDescription("");
      await refreshAttachments(id);
      window.alert("Anexo(s) enviados com sucesso.");
    } catch (err) {
      window.alert(err?.message || "Erro ao enviar anexos");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSaveDraft() {
    if (isSaving || isSubmitting) return;
    setIsSaving(true);
    try {
      let id = ubsId;
      if (!id) {
        // Backend exige esses campos na criação do rascunho
        if (!ubsPayload.nome_ubs || !ubsPayload.cnes || !ubsPayload.area_atuacao) {
          window.alert("Preencha Nome da UBS, CNES e Área de atuação para salvar o rascunho.");
          return;
        }
        const created = await api.createUbsDraft(ubsPayload);
        id = created.id;
        setUbsId(id);
      } else {
        await api.updateUbs(id, ubsPayload);
      }

      // Se o usuário já selecionou anexos, envia depois que o rascunho existe
      if (selectedFiles?.length) {
        await api.uploadAttachments(id, selectedFiles, {
          section: attachmentSection,
          description: attachmentDescription,
        });
        setSelectedFiles([]);
        setAttachmentDescription("");
        await refreshAttachments(id);
      }

      if (territory.descricao_territorio?.trim()) {
        await api.upsertTerritory(id, {
          descricao_territorio: territory.descricao_territorio,
          potencialidades_territorio: territory.potencialidades_territorio || null,
          riscos_vulnerabilidades: territory.riscos_vulnerabilidades || null,
        });
      }

      if (needs.problemas_identificados?.trim()) {
        await api.upsertNeeds(id, {
          problemas_identificados: needs.problemas_identificados,
          necessidades_equipamentos_insumos: needs.necessidades_equipamentos_insumos || null,
          necessidades_especificas_acs: needs.necessidades_especificas_acs || null,
          necessidades_infraestrutura_manutencao: needs.necessidades_infraestrutura_manutencao || null,
        });
      }

      window.alert(`Rascunho salvo${id ? ` (ID ${id})` : ""}.`);
    } catch (err) {
      window.alert(err?.message || "Erro ao salvar rascunho");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (isSubmitting || isSaving) return;
    setIsSubmitting(true);
    try {
      // Pré-validação mínima para evitar 400 do backend
      if (!territory.descricao_territorio?.trim()) {
        window.alert("Preencha a Descrição do território antes de enviar.");
        return;
      }
      if (!needs.problemas_identificados?.trim()) {
        window.alert("Preencha os Problemas identificados antes de enviar.");
        return;
      }

      // Garante que o rascunho existe e está atualizado
      if (!ubsId) {
        if (!ubsPayload.nome_ubs || !ubsPayload.cnes || !ubsPayload.area_atuacao) {
          window.alert("Preencha Nome da UBS, CNES e Área de atuação antes de enviar.");
          return;
        }
        const created = await api.createUbsDraft(ubsPayload);
        setUbsId(created.id);

        if (selectedFiles?.length) {
          await api.uploadAttachments(created.id, selectedFiles, {
            section: attachmentSection,
            description: attachmentDescription,
          });
          setSelectedFiles([]);
          setAttachmentDescription("");
          await refreshAttachments(created.id);
        }

        await api.upsertTerritory(created.id, {
          descricao_territorio: territory.descricao_territorio,
          potencialidades_territorio: territory.potencialidades_territorio || null,
          riscos_vulnerabilidades: territory.riscos_vulnerabilidades || null,
        });
        await api.upsertNeeds(created.id, {
          problemas_identificados: needs.problemas_identificados,
          necessidades_equipamentos_insumos: needs.necessidades_equipamentos_insumos || null,
          necessidades_especificas_acs: needs.necessidades_especificas_acs || null,
          necessidades_infraestrutura_manutencao: needs.necessidades_infraestrutura_manutencao || null,
        });
        await api.submitDiagnosis(created.id);
      } else {
        await api.updateUbs(ubsId, ubsPayload);

        if (selectedFiles?.length) {
          await api.uploadAttachments(ubsId, selectedFiles, {
            section: attachmentSection,
            description: attachmentDescription,
          });
          setSelectedFiles([]);
          setAttachmentDescription("");
          await refreshAttachments(ubsId);
        }

        await api.upsertTerritory(ubsId, {
          descricao_territorio: territory.descricao_territorio,
          potencialidades_territorio: territory.potencialidades_territorio || null,
          riscos_vulnerabilidades: territory.riscos_vulnerabilidades || null,
        });
        await api.upsertNeeds(ubsId, {
          problemas_identificados: needs.problemas_identificados,
          necessidades_equipamentos_insumos: needs.necessidades_equipamentos_insumos || null,
          necessidades_especificas_acs: needs.necessidades_especificas_acs || null,
          necessidades_infraestrutura_manutencao: needs.necessidades_infraestrutura_manutencao || null,
        });
        await api.submitDiagnosis(ubsId);
      }

      window.alert("Diagnóstico enviado com sucesso.");
    } catch (err) {
      window.alert(err?.message || "Erro ao enviar diagnóstico");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="diagnostico-page">
      <section className="diagnostico-card" aria-label="Formulário de diagnóstico situacional da UBS">
        {/* Faixa de cabeçalho */}
        <header className="diagnostico-header">
          <div className="diagnostico-header-content">
            <h1>Diagnóstico Situacional da UBS</h1>
            <p>
              Formulário para registro de dados do relatório situacional da Unidade Básica de Saúde
            </p>
          </div>
        </header>

        {/* Campo de nome do relatório */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Identificação do relatório</h2>
            <p className="section-subtitle">
              Defina um nome para este relatório situacional, para facilitar a identificação na lista de
              rascunhos e relatórios finalizados.
            </p>
          </div>

          <div className="form-field full-width">
            <label className="field-label">
              Nome do relatório<span className="required">*</span>
            </label>
            <input
              type="text"
              className="field-input"
              placeholder="Ex: Diagnóstico Situacional UBS Adalto Pereira Saraçayo - 2025"
              value={form.nome_relatorio}
              onChange={(e) => setForm((prev) => ({ ...prev, nome_relatorio: e.target.value }))}
            />
          </div>
        </section>

        {/* Metadados do relatório */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Metadados do relatório</h2>
            <p className="section-subtitle">
              Campos para refletir o cabeçalho do relatório (período, equipe e responsável).
            </p>
          </div>

          <div className="field-grid field-grid-3">
            <div className="form-field">
              <label className="field-label">Período de referência (mês/ano)</label>
              <input
                type="text"
                className="field-input"
                placeholder="Ex: Março/2025"
                value={form.periodo_referencia}
                onChange={(e) => setForm((prev) => ({ ...prev, periodo_referencia: e.target.value }))}
              />
            </div>

            <div className="form-field">
              <label className="field-label">Identificação da equipe (ESF nº)</label>
              <input
                type="text"
                className="field-input"
                placeholder="Ex: ESF 41"
                value={form.identificacao_equipe}
                onChange={(e) => setForm((prev) => ({ ...prev, identificacao_equipe: e.target.value }))}
              />
            </div>

            <div className="form-field">
              <label className="field-label">Responsável (nome)</label>
              <input
                type="text"
                className="field-input"
                placeholder="Ex: Maria da Silva"
                value={form.responsavel_nome}
                onChange={(e) => setForm((prev) => ({ ...prev, responsavel_nome: e.target.value }))}
              />
            </div>
          </div>

          <div className="field-grid field-grid-3">
            <div className="form-field">
              <label className="field-label">Responsável (cargo)</label>
              <input
                type="text"
                className="field-input"
                placeholder="Ex: Enfermeira / Gerente"
                value={form.responsavel_cargo}
                onChange={(e) => setForm((prev) => ({ ...prev, responsavel_cargo: e.target.value }))}
              />
            </div>

            <div className="form-field">
              <label className="field-label">Responsável (contato)</label>
              <input
                type="text"
                className="field-input"
                placeholder="Ex: telefone/email"
                value={form.responsavel_contato}
                onChange={(e) => setForm((prev) => ({ ...prev, responsavel_contato: e.target.value }))}
              />
            </div>
          </div>
        </section>

        {/* Fluxo/agenda/acesso */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Fluxo, agenda e acesso</h2>
          </div>

          <div className="form-field full-width">
            <label className="field-label">Fluxo/agenda/acesso</label>
            <textarea
              className="field-input textarea"
              rows={4}
              placeholder="Descreva como funciona acolhimento, agendamento, demanda espontânea, gargalos, acesso a exames/encaminhamentos, etc."
              value={form.fluxo_agenda_acesso}
              onChange={(e) => setForm((prev) => ({ ...prev, fluxo_agenda_acesso: e.target.value }))}
            />
          </div>
        </section>

        {/* Anexos */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Anexos</h2>
            <p className="section-subtitle">Envie fotos/arquivos relacionados (ex.: registros fotográficos).</p>
          </div>

          <div className="form-field full-width">
            <label className="field-label">Selecionar arquivo(s)</label>
            <input
              type="file"
              className="field-input"
              multiple
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            />

            <div className="field-grid field-grid-3" style={{ marginTop: 12 }}>
              <div className="form-field">
                <label className="field-label">Seção do PDF</label>
                <select
                  className="field-input"
                  value={attachmentSection}
                  onChange={(e) => setAttachmentSection(e.target.value)}
                >
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
              <div className="form-field field-span-2">
                <label className="field-label">Legenda/descrição (opcional)</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Ex: Foto da janela quebrada / sala sem ventilação"
                  value={attachmentDescription}
                  onChange={(e) => setAttachmentDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="subpanel-actions" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={!ubsId || isUploading || isSaving || isSubmitting || !selectedFiles.length}
                onClick={() => handleUploadSelectedFiles(ubsId)}
              >
                {isUploading ? "Enviando..." : "Enviar anexos"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={!ubsId}
                onClick={() => refreshAttachments(ubsId)}
              >
                Atualizar lista
              </button>
            </div>
          </div>

          <div className="subpanel" style={{ marginTop: 12 }}>
            <div className="subpanel-header">
              <h3>Anexos enviados</h3>
              <p className="section-subtitle small">
                {ubsId ? "Itens associados ao rascunho." : "Salve o rascunho para habilitar anexos."}
              </p>
            </div>

            {attachments.length === 0 ? (
              <div className="indicator-row">
                <div className="indicator-main">
                  <div className="indicator-title">Nenhum anexo</div>
                </div>
              </div>
            ) : (
              <div className="indicator-list">
                {attachments.map((a) => (
                  <div key={a.id} className="indicator-row">
                    <div className="indicator-main">
                      <div className="indicator-title">{a.original_filename}</div>
                      <div className="indicator-meta">
                        {(a.section || "-")} • {a.content_type || "-"} • {a.size_bytes || 0} bytes
                        {a.description ? ` • ${a.description}` : ""}
                      </div>
                    </div>
                    <div className="indicator-actions">
                      <button
                        type="button"
                        className="link-button subtle"
                        onClick={() => api.downloadAttachment(a.id, a.original_filename)}
                      >
                        Baixar
                      </button>
                      <button
                        type="button"
                        className="link-button subtle"
                        onClick={async () => {
                          if (!window.confirm("Excluir este anexo?")) return;
                          try {
                            await api.deleteAttachment(a.id);
                            await refreshAttachments(ubsId);
                          } catch (err) {
                            window.alert(err?.message || "Erro ao excluir anexo");
                          }
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SEÇÃO 1 – Informações gerais da UBS */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Informações gerais da UBS</h2>
          </div>

          {/* Linha 1 */}
          <div className="field-grid field-grid-3">
            <div className="form-field">
              <label className="field-label">
                Nome da UBS<span className="required">*</span>
              </label>
              <input
                type="text"
                className="field-input"
                placeholder="ESF 18 – Adalto Pereira Saraçayo"
                value={form.nome_ubs}
                onChange={(e) => setForm((prev) => ({ ...prev, nome_ubs: e.target.value }))}
              />
            </div>

            <div className="form-field">
              <label className="field-label">
                CNES<span className="required">*</span>
              </label>
              <input
                type="text"
                className="field-input"
                placeholder="0000000"
                value={form.cnes}
                onChange={(e) => setForm((prev) => ({ ...prev, cnes: e.target.value }))}
              />
            </div>

            <div className="form-field field-span-2-lg">
              <label className="field-label">
                Área de atuação (bairros/localidades)<span className="required">*</span>
              </label>
              <input
                type="text"
                className="field-input"
                placeholder="Ex: Alto São Pedro, Nova Alvorada, Centro"
                value={form.area_atuacao}
                onChange={(e) => setForm((prev) => ({ ...prev, area_atuacao: e.target.value }))}
              />
            </div>
          </div>

          {/* Linha 2 */}
          <div className="field-grid field-grid-5 compact-row">
            <div className="form-field">
              <label className="field-label">
                Número de habitantes ativos<span className="required">*</span>
              </label>
              <input
                type="number"
                className="field-input"
                placeholder="Ex: 4.800"
                value={form.numero_habitantes_ativos}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, numero_habitantes_ativos: e.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="field-label">
                Número de microáreas<span className="required">*</span>
              </label>
              <input
                type="number"
                className="field-input"
                placeholder="Ex: 8"
                value={form.numero_microareas}
                onChange={(e) => setForm((prev) => ({ ...prev, numero_microareas: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="field-label">
                Número de famílias cadastradas<span className="required">*</span>
              </label>
              <input
                type="number"
                className="field-input"
                placeholder="Ex: 1.000"
                value={form.numero_familias_cadastradas}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, numero_familias_cadastradas: e.target.value }))
                }
              />
            </div>
            <div className="form-field">
              <label className="field-label">
                Número de domicílios<span className="required">*</span>
              </label>
              <input
                type="number"
                className="field-input"
                placeholder="Ex: 2.000"
                value={form.numero_domicilios}
                onChange={(e) => setForm((prev) => ({ ...prev, numero_domicilios: e.target.value }))}
              />
            </div>
            <div className="form-field">
              <label className="field-label">Domicílios rurais</label>
              <input
                type="number"
                className="field-input"
                placeholder="Ex: 15"
                value={form.domicilios_rurais}
                onChange={(e) => setForm((prev) => ({ ...prev, domicilios_rurais: e.target.value }))}
              />
            </div>
          </div>

          {/* Linha 3 */}
          <div className="field-grid field-grid-3">
            <div className="form-field">
              <label className="field-label">Data de inauguração</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  className="field-input"
                  placeholder="dd/mm/aaaa"
                  value={form.data_inauguracao}
                  onChange={(e) => setForm((prev) => ({ ...prev, data_inauguracao: e.target.value }))}
                />
                <span className="date-icon" aria-hidden="true">
	                  📅
                </span>
              </div>
            </div>
            <div className="form-field">
              <label className="field-label">Data da última reforma</label>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  className="field-input"
                  placeholder="dd/mm/aaaa"
                  value={form.data_ultima_reforma}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, data_ultima_reforma: e.target.value }))
                  }
                />
                <span className="date-icon" aria-hidden="true">
	                  📅
                </span>
              </div>
            </div>
            <div className="form-field">
              <label className="field-label">Gestão / modelo de atenção</label>
              <input
                type="text"
                className="field-input"
                placeholder="Ex: ESF, UBS tradicional, mista"
                value={form.gestao_modelo_atencao}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, gestao_modelo_atencao: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Linha 4 */}
          <div className="form-field full-width">
            <label className="field-label">Descritivos gerais</label>
            <textarea
              className="field-input textarea"
              rows={3}
              placeholder="Perfil de referência – por exemplo, população prioritária, localização estratégica, etc."
              value={form.descritivos_gerais}
              onChange={(e) => setForm((prev) => ({ ...prev, descritivos_gerais: e.target.value }))}
            />
          </div>

          {/* Linha 5 */}
          <div className="form-field full-width">
            <label className="field-label">Observações gerais</label>
            <textarea
              className="field-input textarea"
              rows={4}
              placeholder="Informações adicionais sobre a UBS, histórico, mudanças recentes na área de abrangência, projetos em andamento…"
              value={form.observacoes_gerais}
              onChange={(e) => setForm((prev) => ({ ...prev, observacoes_gerais: e.target.value }))}
            />
          </div>
        </section>

        {/* SEÇÃO 2 – Serviços oferecidos pela UBS */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Serviços oferecidos pela UBS</h2>
            <p className="section-subtitle">
              Marque os serviços que a UBS oferece diretamente à população.
            </p>
          </div>

          <div className="services-grid">
            {[
              "Programa Saúde da Família",
              "Atendimento médico",
              "Atendimento de enfermagem",
              "Atendimento odontológico",
              "Atendimento de urgência / acolhimento",
              "Procedimentos (curativos, inalação, etc.)",
              "Sala de vacina",
              "Saúde da criança",
              "Saúde da mulher",
              "Saúde do homem",
              "Saúde do idoso",
              "Planejamento familiar",
              "Pré-natal",
              "Puericultura",
              "Atendimento a condições crônicas (hipertensão, diabetes, etc.)",
              "Programa Saúde na Escola (PSE)",
              "Saúde mental",
              "Atendimento multiprofissional (NASF ou equivalente)",
              "Testes rápidos de IST",
              "Vigilância epidemiológica",
              "Vigilância em saúde ambiental",
              "Visitas domiciliares",
              "Atividades coletivas e preventivas",
              "Grupos operativos (gestantes, tabagismo, etc.)",
            ].map((servico) => (
              <label key={servico} className="service-option">
                <input type="checkbox" />
                <span>{servico}</span>
              </label>
            ))}
          </div>

          <div className="form-field full-width" style={{ marginTop: 20 }}>
            <label className="field-label">Outros serviços (especificar)</label>
            <input
              type="text"
              className="field-input"
              placeholder="Descreva outros serviços ofertados não listados acima…"
              value={form.outros_servicos}
              onChange={(e) => setForm((prev) => ({ ...prev, outros_servicos: e.target.value }))}
            />
          </div>
        </section>

        {/* SEÇÃO 3 – Indicadores epidemiológicos */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Indicadores epidemiológicos</h2>
            <p className="section-subtitle">
              Preencha ou atualize os principais indicadores epidemiológicos da UBS. Todos os indicadores devem
              ser numéricos. Informe também o período de referência.
            </p>
          </div>

          <button type="button" className="link-button">
            Ver todos os indicadores cadastrados
          </button>

          <div className="indicator-list">
            <div className="indicator-row">
              <div className="indicator-main">
                <div className="indicator-title">Hipertensos cadastrados</div>
                <div className="indicator-meta">
                  Último valor: 325 – Período: 2023 Q1 – Fonte: Prontuário eletrônico
                </div>
              </div>
              <div className="indicator-actions">
                <span className="pill-badge">Tipo: Número absoluto</span>
                <button type="button" className="link-button subtle">
                  Editar
                </button>
              </div>
            </div>

            <div className="indicator-row">
              <div className="indicator-main">
                <div className="indicator-title">Diabéticos cadastrados</div>
                <div className="indicator-meta">
                  Último valor: 180 – Período: 2023 Q1 – Fonte: Prontuário eletrônico
                </div>
              </div>
              <div className="indicator-actions">
                <span className="pill-badge">Tipo: Número absoluto</span>
                <button type="button" className="link-button subtle">
                  Editar
                </button>
              </div>
            </div>

            <div className="indicator-row">
              <div className="indicator-main">
                <div className="indicator-title">Gestantes acompanhadas</div>
                <div className="indicator-meta">
                  Último valor: 42 – Período: 2023 Q1 – Fonte: e-SUS APS
                </div>
              </div>
              <div className="indicator-actions">
                <span className="pill-badge">Tipo: Taxa por 1.000 hab.</span>
                <button type="button" className="link-button subtle">
                  Editar
                </button>
              </div>
            </div>
          </div>

          <div className="subpanel">
            <div className="subpanel-header">
              <h3>Adicionar ou atualizar indicador</h3>
              <p className="section-subtitle small">
                Preencha os campos abaixo para cadastrar um novo indicador ou atualizar o valor de um indicador
                existente.
              </p>
            </div>

            <div className="field-grid field-grid-4">
              <div className="form-field field-span-2">
                <label className="field-label">
                  Nome do indicador<span className="required">*</span>
                </label>
                <input type="text" className="field-input" placeholder="Ex: Taxa de internação por AVC" />
              </div>

              <div className="form-field">
                <label className="field-label">
                  Tipo de dado<span className="required">*</span>
                </label>
                <select className="field-input">
                  <option value="">Selecionar</option>
                  <option value="absoluto">Número absoluto</option>
                  <option value="taxa">Taxa (%)</option>
                  <option value="taxa1000">Taxa por 1.000 hab.</option>
                </select>
              </div>

              <div className="form-field">
                <label className="field-label">
                  Grau de precisão do valor<span className="required">*</span>
                </label>
                <select className="field-input">
                  <option value="">Selecionar</option>
                  <option value="unidade">Unidade</option>
                  <option value="uma-casa">Uma casa decimal</option>
                  <option value="duas-casas">Duas casas decimais</option>
                </select>
              </div>

              <div className="form-field">
                <label className="field-label">
                  Valor<span className="required">*</span>
                </label>
                <input type="number" className="field-input" placeholder="Ex: 570 ou 79,5" />
              </div>

              <div className="form-field">
                <label className="field-label">
                  Período de referência<span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Ex: 2023, 1º trimestre de 2023, Março/2023"
                />
              </div>
            </div>

            <div className="form-field full-width" style={{ marginTop: 16 }}>
              <label className="field-label">Observações (opcional)</label>
              <textarea
                className="field-input textarea"
                rows={3}
                placeholder="Informe fonte dos dados (e-SUS, SIAB, planilha própria, etc.), critérios de cálculo, estimativas utilizadas, comentários sobre mudanças bruscas de valor…"
              />
            </div>

            <div className="subpanel-actions">
              <button type="button" className="btn btn-outline">
                Limpar
              </button>
              <button type="button" className="btn btn-primary">
                Salvar indicador
              </button>
            </div>
          </div>
        </section>

        {/* SEÇÃO 4 – Profissionais da equipe */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Profissionais da equipe</h2>
            <p className="section-subtitle">
              Consulte os profissionais já cadastrados e atualize conforme a composição da equipe da UBS.
            </p>
          </div>

          <div className="professional-list">
            <div className="professional-row">
              <div className="professional-main">
                <div className="professional-title">Agente Comunitário de Saúde (ACS)</div>
                <div className="professional-meta">Inclui ACS vinculados às microáreas da UBS.</div>
              </div>
              <div className="professional-actions">
                <span className="professional-qty">Quantidade: 8</span>
                <button type="button" className="link-button subtle">
                  Editar
                </button>
              </div>
            </div>

            <div className="professional-row">
              <div className="professional-main">
                <div className="professional-title">Enfermeiro da Família</div>
                <div className="professional-meta">
                  Profissional responsável pela coordenação da equipe.
                </div>
              </div>
              <div className="professional-actions">
                <span className="professional-qty">Quantidade: 1</span>
                <button type="button" className="link-button subtle">
                  Editar
                </button>
              </div>
            </div>

            <div className="professional-row">
              <div className="professional-main">
                <div className="professional-title">Médico da Estratégia de Saúde da Família</div>
                <div className="professional-meta">Profissional de referência para a população adstrita.</div>
              </div>
              <div className="professional-actions">
                <span className="professional-qty">Quantidade: 1</span>
                <button type="button" className="link-button subtle">
                  Editar
                </button>
              </div>
            </div>

            <div className="professional-row">
              <div className="professional-main">
                <div className="professional-title">Equipe de Referência (outros profissionais)</div>
                <div className="professional-meta">
                  Inclui outros profissionais vinculados à UBS (psicólogo, assistente social, farmacêutico, etc.).
                </div>
              </div>
              <div className="professional-actions">
                <span className="professional-qty">Quantidade: 4</span>
                <button type="button" className="link-button subtle">
                  Editar
                </button>
              </div>
            </div>
          </div>

          <button type="button" className="link-button" style={{ marginTop: 12 }}>
            Ver todos os profissionais cadastrados
          </button>

          <div className="subpanel" style={{ marginTop: 24 }}>
            <div className="subpanel-header">
              <h3>Adicionar ou atualizar profissional</h3>
              <p className="section-subtitle small">
                Informe o cargo/função, a quantidade de profissionais e o tipo de vínculo para adicionar um novo
                registro ou atualizar um já existente.
              </p>
            </div>

            <div className="field-grid field-grid-3">
              <div className="form-field field-span-2">
                <label className="field-label">
                  Cargo / função<span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="Enfermeiro da Família, ACS, Técnico de Enfermagem, Farmacêutico, Psicólogo…"
                />
              </div>

              <div className="form-field">
                <label className="field-label">
                  Quantidade<span className="required">*</span>
                </label>
                <input type="number" className="field-input" placeholder="Ex: 2" />
              </div>

              <div className="form-field">
                <label className="field-label">
                  Tipo de vínculo<span className="required">*</span>
                </label>
                <select className="field-input">
                  <option value="">Selecionar</option>
                  <option value="concursado">Concursado</option>
                  <option value="contratado">Contratado</option>
                  <option value="residencia">Residência</option>
                  <option value="estagiario">Estagiário</option>
                </select>
              </div>
            </div>

            <div className="form-field full-width" style={{ marginTop: 16 }}>
              <label className="field-label">Observações (opcional)</label>
              <textarea
                className="field-input textarea"
                rows={3}
                placeholder="Informe categoria profissional, carga horária, se há programa de residência, se o profissional atende em mais de uma unidade, etc."
              />
            </div>

            <div className="subpanel-actions">
              <button type="button" className="btn btn-outline">
                Limpar
              </button>
              <button type="button" className="btn btn-primary">
                Salvar profissional
              </button>
            </div>
          </div>
        </section>

        {/* SEÇÃO 5 – Território e determinantes sociais */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Território e determinantes sociais</h2>
          </div>

          <div className="form-field full-width">
            <label className="field-label">
              Descrição do território<span className="required">*</span>
            </label>
            <textarea
              className="field-input textarea"
              rows={4}
              placeholder="Descreva as principais características do território: perfil socioeconômico da população, presença de áreas urbanas e rurais, infraestrutura urbana (iluminação, pavimentação, saneamento), equipamentos sociais (escolas, CRAS, associações), áreas de risco, etc."
              value={territory.descricao_territorio}
              onChange={(e) =>
                setTerritory((prev) => ({ ...prev, descricao_territorio: e.target.value }))
              }
            />
          </div>

          <div className="form-field full-width">
            <label className="field-label">Potencialidades do território</label>
            <textarea
              className="field-input textarea"
              rows={4}
              placeholder="Registre parcerias existentes, lideranças comunitárias ativas, grupos organizados, empresas locais, programas sociais, projetos culturais, iniciativas de segurança, equipamentos de lazer, entre outros fatores positivos…"
              value={territory.potencialidades_territorio}
              onChange={(e) =>
                setTerritory((prev) => ({ ...prev, potencialidades_territorio: e.target.value }))
              }
            />
          </div>

          <div className="form-field full-width">
            <label className="field-label">Riscos e vulnerabilidades</label>
            <textarea
              className="field-input textarea"
              rows={4}
              placeholder="Informe situações de vulnerabilidade: áreas sujeitas a alagamentos, regiões com maior incidência de violência ou assaltos, terrenos baldios, pontos de descarte irregular de lixo, ausência de abastecimento de água, esgoto ou coleta regular, ocorrência de trabalho infantil, violência doméstica, população em situação de rua, doenças negligenciadas, etc."
              value={territory.riscos_vulnerabilidades}
              onChange={(e) =>
                setTerritory((prev) => ({ ...prev, riscos_vulnerabilidades: e.target.value }))
              }
            />
          </div>
        </section>

        {/* SEÇÃO 6 – Problemas e necessidades da UBS */}
        <section className="form-section">
          <div className="form-section-header">
            <h2>Problemas e necessidades da UBS</h2>
          </div>

          <div className="form-field full-width">
            <label className="field-label">
              Problemas identificados<span className="required">*</span>
            </label>
            <textarea
              className="field-input textarea"
              rows={4}
              placeholder="Descreva de forma detalhada os principais problemas identificados na UBS: deficiência ou má adequação do espaço físico (salas pequenas, falta de ventilação, barreiras arquitetônicas para pessoas com deficiência), sobrecarga de atendimentos, filas prolongadas, dificuldade de agendamento, ausência de protocolos definidos, alta rotatividade de profissionais, falta de integração entre equipes, fragilidade no acolhimento, dificuldades para realizar busca ativa, problemas de comunicação com a população, entre outros pontos críticos…"
              value={needs.problemas_identificados}
              onChange={(e) => setNeeds((prev) => ({ ...prev, problemas_identificados: e.target.value }))}
            />
          </div>

          <div className="form-field full-width">
            <label className="field-label">Necessidades de equipamentos e insumos</label>
            <textarea
              className="field-input textarea"
              rows={4}
              placeholder="Liste os equipamentos, mobiliários e insumos necessários para o adequado funcionamento da unidade: computadores e impressoras, acesso à internet, cadeiras adequadas para sala de espera, mesas e armários, balanças, esfigmomanômetros, oxímetros, materiais para atendimento odontológico, materiais de limpeza, EPIs, kits de curativo, medicamentos essenciais, testes rápidos, etc."
              value={needs.necessidades_equipamentos_insumos}
              onChange={(e) =>
                setNeeds((prev) => ({ ...prev, necessidades_equipamentos_insumos: e.target.value }))
              }
            />
          </div>

          <div className="form-field full-width">
            <label className="field-label">Necessidades específicas dos ACS</label>
            <textarea
              className="field-input textarea"
              rows={4}
              placeholder="Registre necessidades identificadas para o trabalho dos Agentes Comunitários de Saúde: EPIs (máscaras, luvas, protetor solar, capa de chuva), materiais de campo (pranchetas, fichas, tablets ou smartphones), uniforme, crachá, boné, mochila, bicicleta ou outro meio de transporte, capacitações específicas, suporte para registro e envio de informações, entre outras."
              value={needs.necessidades_especificas_acs}
              onChange={(e) => setNeeds((prev) => ({ ...prev, necessidades_especificas_acs: e.target.value }))}
            />
          </div>

          <div className="form-field full-width">
            <label className="field-label">Necessidades de infraestrutura e manutenção</label>
            <textarea
              className="field-input textarea"
              rows={4}
              placeholder="Descreva necessidades relacionadas à estrutura física e manutenção da UBS: reforma de telhado, substituição de portas e janelas, melhorias na acessibilidade (rampas, corrimãos, piso tátil), adequação elétrica e hidráulica, melhoria da ventilação ou climatização, ampliação de salas, pintura, paisagismo, poda de árvores no entorno, iluminação externa, sinalização interna, adequação de depósito de resíduos, entre outras."
              value={needs.necessidades_infraestrutura_manutencao}
              onChange={(e) =>
                setNeeds((prev) => ({ ...prev, necessidades_infraestrutura_manutencao: e.target.value }))
              }
            />
          </div>
        </section>

        {/* Barra de ações inferior */}
        <div className="bottom-action-bar">
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleSaveDraft}
            disabled={isSaving || isSubmitting}
          >
            Salvar rascunho
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSaving || isSubmitting}
          >
            Enviar diagnóstico
          </button>
        </div>
      </section>
    </main>
  );
}
