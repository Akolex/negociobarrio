import React, { useState, useEffect } from 'react';
import { Settings, Save, Percent, AlertTriangle, Calendar, CheckCircle, Trash2, ShieldAlert } from 'lucide-react';

const API_CONFIG = 'http://localhost:5000/api/configuracion';
const API_RESET = 'http://localhost:5000/api/database/reset';

const Config = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [formData, setFormData] = useState({
    comisionKlap: 23,
    limiteStockBajo: 5,
    diasPrestamo: 30
  });

  useEffect(() => {
    fetch(API_CONFIG)
      .then(res => res.json())
      .then(data => {
        setFormData({
          comisionKlap: data.comisionKlap,
          limiteStockBajo: data.limiteStockBajo,
          diasPrestamo: data.diasPrestamo
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(API_CONFIG, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Parámetros guardados correctamente.' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("⚠️ ¿ESTÁS SEGURO?\n\nEsto borrará PERMANENTEMENTE:\n- Todos los Productos\n- Ventas\n- Distribuidores\n- Movimientos de Caja\n\nEsta acción no se puede deshacer.")) {
      return;
    }

    if (!window.confirm("¿Confirmar nuevamente?\n\nAl hacer clic en Aceptar, la base de datos quedará vacía.")) {
      return;
    }

    setResetting(true);
    try {
      const response = await fetch(API_RESET, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        alert("✅ " + data.message);
        window.location.reload();
      } else {
        alert("❌ Error: " + data.message);
      }
    } catch (error) {
      alert("❌ Error de conexión con el servidor.");
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in space-y-8">
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center">
          <Settings className="text-gray-700 mr-3" size={24} />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
            <p className="text-sm text-gray-500">Ajusta los parámetros globales.</p>
          </div>
        </div>

        <div className="p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'success' ? <CheckCircle size={20} className="mr-2"/> : <AlertTriangle size={20} className="mr-2"/>}
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="md:col-span-2">
                <label className="flex items-center text-lg font-semibold text-gray-800 mb-1"><Percent className="mr-2 text-blue-600" size={20}/> Comisión Klap</label>
                <p className="text-sm text-gray-500">Porcentaje que cobra la plataforma.</p>
              </div>
              <div><div className="relative"><input type="number" name="comisionKlap" value={formData.comisionKlap} onChange={handleChange} className="w-full pl-4 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right font-bold text-lg"/><span className="absolute right-4 top-3.5 text-gray-400 font-bold">%</span></div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="md:col-span-2">
                <label className="flex items-center text-lg font-semibold text-gray-800 mb-1"><AlertTriangle className="mr-2 text-yellow-600" size={20}/> Límite de Stock Bajo</label>
                <p className="text-sm text-gray-500">Cantidad mínima para alertas rojas.</p>
              </div>
              <div><input type="number" name="limiteStockBajo" value={formData.limiteStockBajo} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none text-right font-bold text-lg"/></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="md:col-span-2">
                <label className="flex items-center text-lg font-semibold text-gray-800 mb-1"><Calendar className="mr-2 text-purple-600" size={20}/> Días Máximo Préstamo</label>
                <p className="text-sm text-gray-500">Plazo máximo para créditos.</p>
              </div>
              <div><div className="relative"><input type="number" name="diasPrestamo" value={formData.diasPrestamo} onChange={handleChange} className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-right font-bold text-lg"/><span className="absolute right-4 top-3.5 text-gray-400 text-sm font-medium">días</span></div></div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button type="submit" disabled={saving} className="flex items-center px-8 py-3 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition shadow-lg disabled:opacity-50">
                {saving ? 'Guardando...' : <><Save className="mr-2" size={20}/> Guardar Cambios</>}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div className="bg-red-50 rounded-xl shadow-md border border-red-200 overflow-hidden">
        <div className="p-6 border-b border-red-100 flex items-center">
          <ShieldAlert className="text-red-600 mr-3" size={24} />
          <div>
            <h2 className="text-xl font-bold text-red-700">Zona de Peligro</h2>
            <p className="text-sm text-red-500">Acciones destructivas e irreversibles.</p>
          </div>
        </div>
        
        <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-gray-700">
            <p className="font-medium mb-1">Eliminar toda la información de la base de datos</p>
            <p className="text-sm text-gray-500">Se borrarán productos, ventas, clientes, movimientos y pedidos. <br/><strong>El usuario administrador y la configuración se mantendrán.</strong></p>
          </div>
          
          <button 
            onClick={handleResetDatabase}
            disabled={resetting}
            className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-md disabled:opacity-50 whitespace-nowrap"
          >
            {resetting ? 'Eliminando...' : <><Trash2 className="mr-2" size={20}/> Resetear Todo</>}
          </button>
        </div>
      </div>

    </div>
  );
};

export default Config;