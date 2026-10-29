import { NavLink } from 'react-router-dom';
import { UserCircle, Menu, X } from 'lucide-react';
import colibriLogo from '../../assets/colibri_logo.png';
import { useState } from 'react';
import './Navbar.css';

const navLinks = [
  { to: '/', label: 'Inicio' },
  { to: '/ventas', label: 'Ventas' },
  { to: '/inventario', label: 'Manejar inventario' },
  { to: '/produccion', label: 'Cultivo y Producción' },
  { to: '/proveedores', label: 'Proveedores' },
  { to: '/compras', label: 'Compras' },
  { to: '/estadistico', label: 'Estadístico' }
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="navbar" role="navigation" aria-label="Navegación principal">
      <div className="navbar-inner">
        <div className="navbar-brand">
          <img src={colibriLogo} alt="Vivero Colibrí" className="navbar-logo" />
          <span className="navbar-brand-text">VIVERO COLIBRÍ</span>
        </div>

        <button
          className="navbar-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`navbar-links ${mobileOpen ? 'open' : ''}`}>
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="navbar-user">
          <div className="navbar-user-pill">
            <UserCircle size={18} />
            <span>Administrador</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
