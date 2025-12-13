export function CardGrid() {
  const cards = [
    {
      title: "Relatório Situacional",
      desc: "Crie ou atualize o relatório da sua UBS.",
      cta: "Acessar",
    },
    {
      title: "Indicadores",
      desc: "Visualize e envie indicadores epidemiológicos.",
      cta: "Ver indicadores",
    },
    {
      title: "Equipe",
      desc: "Consulte profissionais cadastrados (área do gestor).",
      cta: "Ver equipe",
    },
    {
      title: "Suporte",
      desc: "Precisa de ajuda? Fale conosco.",
      cta: "Entrar em contato",
    },
  ];

  return (
    <section className="card-grid">
      {cards.map((card) => (
        <article className="card" key={card.title}>
          <h3>{card.title}</h3>
          <p>{card.desc}</p>
          <button className="btn btn-primary" type="button">
            {card.cta}
          </button>
        </article>
      ))}
    </section>
  );
}
