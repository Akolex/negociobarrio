import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Save, CheckCircle, AlertTriangle } from 'lucide-react';

const ResetPassword = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [passwords, setPasswords] = useState({ newPass: '', confirmPass: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);
    setMessage('');

    if (passwords.newPass !== passwords.confirmPass) {
      setError(true);
      setMessage("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    if (passwords.newPass.length < 3) {
      setError(true);
      setMessage("La contraseña es muy corta.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/usuarios/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: passwords.newPass })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("¡Éxito! Redirigiendo al login...");
        setTimeout(() => navigate('/'), 2000);
      } else {
        setError(true);
        setMessage(data.message || "Error al actualizar.");
      }
    } catch (err) {
      setError(true);
      setMessage("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 border-t-4 border-indigo-600">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Restablecer Contraseña</h2>
          <p className="text-gray-500 text-sm mt-2">Ingresa tu nueva clave de acceso.</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {error ? <AlertTriangle size={20} className="mr-2"/> : <CheckCircle size={20} className="mr-2"/>}
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••"
              value={passwords.newPass}
              onChange={(e) => setPasswords({...passwords, newPass: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••"
              value={passwords.confirmPass}
              onChange={(e) => setPasswords({...passwords, confirmPass: e.target.value})}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition shadow-lg flex justify-center items-center disabled:opacity-50"
          >
            {loading ? 'Guardando...' : <><Save size={20} className="mr-2" /> Guardar Nueva Contraseña</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;