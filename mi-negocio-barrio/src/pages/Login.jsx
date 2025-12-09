import React, { useState } from 'react';
import { LogIn, User, Lock, Mail, ArrowLeft, Send } from 'lucide-react';

const API_LOGIN = 'http://localhost:5000/api/login';
const API_RECOVERY = 'http://localhost:5000/api/recuperar-password';

const Login = ({ onLogin }) => {
  const [view, setView] = useState('login'); 
  
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [recoveryEmail, setRecoveryEmail] = useState('');
  
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(API_LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();

      if (response.ok) {
        onLogin(data.usuario);
      } else {
        setMessageType('error');
        setMessage(data.message);
      }
    } catch (err) {
      setMessageType('error');
      setMessage("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(API_RECOVERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail })
      });
      
      const data = await response.json();
      
      setMessageType('success');
      setMessage(data.message);
      setRecoveryEmail('');

    } catch (err) {
      setMessageType('error');
      setMessage("Error al intentar enviar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-blue-600">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800">Mi Negocio</h1>
          <p className="text-gray-500 mt-2">
            {view === 'login' ? 'Sistema de Gestión de Inventario' : 'Recuperación de Cuenta'}
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 text-sm rounded-lg text-center ${messageType === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {message}
          </div>
        )}

        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="email" name="email" required
                  value={credentials.email} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="admin@minegocio.cl"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                <button 
                  type="button"
                  onClick={() => { setView('recovery'); setMessage(null); }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="password" name="password" required
                  value={credentials.password} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg disabled:opacity-50 flex justify-center items-center">
              {loading ? 'Entrando...' : <><LogIn className="mr-2" size={20} /> Iniciar Sesión</>}
            </button>
          </form>
        )}

        {view === 'recovery' && (
          <form onSubmit={handleRecoverySubmit} className="space-y-6 animate-fade-in">
            <p className="text-sm text-gray-600 text-center mb-4">
              Ingresa el correo electrónico asociado a tu cuenta para recibir un enlace de recuperación.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input 
                  type="email" required
                  value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ejemplo@correo.cl"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg disabled:opacity-50 flex justify-center items-center">
              {loading ? 'Enviando...' : <><Send className="mr-2" size={20} /> Enviar Enlace</>}
            </button>

            <button 
              type="button"
              onClick={() => { setView('login'); setMessage(null); }}
              className="w-full text-gray-600 py-2 font-medium hover:text-gray-900 flex justify-center items-center mt-4"
            >
              <ArrowLeft className="mr-2" size={18} /> Volver a Iniciar Sesión
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;