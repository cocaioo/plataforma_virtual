import { useState } from "react";

// Página de marcação de consultas (somente frontend por enquanto)
export function AgendamentoConsultas() {
  const [form, setForm] = useState({
    paciente: "",
    data: "",
    hora: "",
    tipo: "Consulta médica",
    observacoes: "",
  });
  const [agendamentos, setAgendamentos] = useState([]);

  const onChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!form.paciente || !form.data || !form.hora) return;

    const novo = {
      id: Date.now(),
      ...form,
    };
    setAgendamentos((prev) => [novo, ...prev]);
    setForm({ paciente: "", data: "", hora: "", tipo: "Consulta médica", observacoes: "" });
  };

  return (
    <main className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Gestão de consultas</p>
          <h1>Marcação de consultas</h1>
          <p className="muted">
            Registre consultas agendadas de forma simples. Nesta versão inicial, os dados ficam apenas na tela
            (sem salvar no servidor).
          </p>
        </div>
      </section>

      <section className="diagnostico-card" style={{ marginTop: 24 }}>
        <form className="form" onSubmit={onSubmit}>
          <div className="field-grid field-grid-3">
            <label className="form-field">
              <span className="field-label">Nome do paciente*</span>
              <input
                className="field-input"
                name="paciente"
                value={form.paciente}
                onChange={onChange}
                placeholder="Ex: Maria da Silva"
                required
              />
            </label>
            <label className="form-field">
              <span className="field-label">Data*</span>
              <input
                className="field-input"
                type="date"
                name="data"
                value={form.data}
                onChange={onChange}
                required
              />
            </label>
            <label className="form-field">
              <span className="field-label">Horário*</span>
              <input
                className="field-input"
                type="time"
                name="hora"
                value={form.hora}
                onChange={onChange}
                required
              />
            </label>
          </div>

          <div className="field-grid field-grid-2" style={{ marginTop: 16 }}>
            <label className="form-field">
              <span className="field-label">Tipo de atendimento</span>
              <select
                className="field-input"
                name="tipo"
                value={form.tipo}
                onChange={onChange}
              >
                <option>Consulta médica</option>
                <option>Consulta de enfermagem</option>
                <option>Visita domiciliar</option>
                <option>Retorno</option>
              </select>
            </label>
          </div>

          <div className="form-field full-width" style={{ marginTop: 16 }}>
            <label className="field-label">Observações (opcional)</label>
            <textarea
              className="field-input textarea"
              name="observacoes"
              value={form.observacoes}
              onChange={onChange}
              rows={3}
              placeholder="Informações adicionais sobre o motivo da consulta, necessidades específicas, etc."
            />
          </div>

          <div style={{ marginTop: 16, textAlign: "right" }}>
            <button className="btn btn-primary" type="submit">
              Salvar agendamento (local)
            </button>
          </div>
        </form>
      </section>

      {agendamentos.length > 0 && (
        <section className="card-grid" style={{ marginTop: 32 }}>
          {agendamentos.map((a) => (
            <article className="card" key={a.id}>
              <h3>{a.paciente}</h3>
              <p>
                {a.data} às {a.hora}
              </p>
              <p className="muted">{a.tipo}</p>
              {a.observacoes && <p>{a.observacoes}</p>}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
