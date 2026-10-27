import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AppDataProvider } from './context/AppDataContext';
import Navbar from './components/layout/Navbar';
import ToastContainer from './components/ui/ToastContainer';
import DataStatusBanner from './components/ui/DataStatusBanner';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import NewSale from './pages/NewSale';
import Inventory from './pages/Inventory';
import NewProduct from './pages/NewProduct';
import Suppliers from './pages/Suppliers';
import Statistics from './pages/Statistics';
import './styles/globals.css';

function AppLayout() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/ventas/nueva';

  return (
    <>
      {!hideNavbar && <Navbar />}
      <DataStatusBanner />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ventas" element={<Sales />} />
        <Route path="/ventas/nueva" element={<NewSale />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/inventario/nuevo" element={<NewProduct />} />
        <Route path="/proveedores" element={<Suppliers />} />
        <Route path="/estadistico" element={<Statistics />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <AppLayout />
      </AppDataProvider>
    </BrowserRouter>
  );
}
