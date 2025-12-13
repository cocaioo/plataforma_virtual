import { Link } from "react-router-dom";

export function NavBar() {
  return (
    <header className="navbar">
      <div className="brand">Plataforma UBS</div>
      <nav className="nav-links">
        <Link to="/">Início</Link>
        <Link to="/register">Cadastro</Link>
        <a href="#">Ajuda</a>
      </nav>
    </header>
  );
}
