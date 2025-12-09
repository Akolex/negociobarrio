import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Users, DollarSign, FileText, Settings, LogOut } from 'lucide-react';

import ProductRegister from './pages/ProductRegister';
import RegisterSale from './pages/RegisterSale';
import Distributors from './pages/Distributors';
import Finance from './pages/Finance';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Config from './pages/Config';


const Dashboard = () => <h2 className="text-2xl font-bold">Dashboard (Resumen)</h2>;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('usuario_sesion') ? true : false;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('usuario_sesion');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogin = (user) => {
    localStorage.setItem('usuario_sesion', JSON.stringify(user));
    
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('usuario_sesion');
    
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  return (
    <Router>
      <Routes>
        
        <Route path="/reset/:userId" element={<ResetPassword />} />

        <Route path="/*" element={
          !isAuthenticated ? (
            <Login onLogin={handleLogin} />
          ) : (
            <div className="flex h-screen bg-gray-100">
              <aside className="w-64 bg-white shadow-md flex flex-col justify-between">
                <div>
                  <div className="p-6 border-b">
                    <h1 className="text-2xl font-extrabold text-blue-600">Mi Negocio</h1>
                    <p className="text-xs text-gray-500 mt-1">Hola, {currentUser?.nombre}</p>
                  </div>
                  <nav className="p-4 space-y-2">
                    <Link to="/productos" className="flex items-center space-x-3 p-3 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-gray-700 transition"><ShoppingCart size={20} /><span>Productos</span></Link>
                    <Link to="/venta" className="flex items-center space-x-3 p-3 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-gray-700 transition"><DollarSign size={20} /><span>Registro de Venta</span></Link>
                    <Link to="/distribuidores" className="flex items-center space-x-3 p-3 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-gray-700 transition"><Users size={20} /><span>Distribuidores</span></Link>
                    <Link to="/finanzas" className="flex items-center space-x-3 p-3 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-gray-700 transition"><FileText size={20} /><span>Caja y Reportes</span></Link>
                    <Link to="/configuracion" className="flex items-center space-x-3 p-3 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-gray-700 transition"><Settings size={20} /><span>Configuración</span></Link>
                  </nav>
                </div>
                <div className="p-4 border-t">
                  <button onClick={handleLogout} className="flex items-center w-full space-x-3 p-3 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-600 transition"><LogOut size={20} /><span>Cerrar Sesión</span></button>
                </div>
              </aside>
              <main className="flex-1 p-8 overflow-y-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/productos" element={<ProductRegister />} />
                  <Route path="/venta" element={<RegisterSale />} />
                  <Route path="/distribuidores" element={<Distributors />} />
                  <Route path="/finanzas" element={<Finance />} />
                  <Route path="*" element={<Navigate to="/" />} />
                  <Route path="/configuracion" element={<Config />} />
                </Routes>
              </main>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;