import { Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar.jsx";
import { Home } from "./pages/Home.jsx";
import { Register } from "./pages/Register.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </div>
  );
}
