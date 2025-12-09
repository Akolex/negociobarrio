import React, { useState, useEffect } from 'react';
import { Users, UserPlus, List, Phone, MapPin, ClipboardList, Package, AlertTriangle, Calendar, Save, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';

const API_DISTRIBUIDORES = 'http://localhost:5000/api/distribuidores';
const API_PRODUCTOS = 'http://localhost:5000/api/productos';
const API_PEDIDOS = 'http://localhost:5000/api/pedidos';

const Distributors = () => {
  const [activeTab, setActiveTab] = useState('form'); 
  
  const [distributors, setDistributors] = useState([]);
  const [products, setProducts] = useState([]); 
  const [orders, setOrders] = useState([]);
  const [selectedDistributor, setSelectedDistributor] = useState(''); 
  
  const [orderItems, setOrderItems] = useState([]); 
  const [deliveryDate, setDeliveryDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({ nombre: '', contacto: '', telefono: '' });

  const fetchData = async () => {
    try {
      const [resDist, resProd, resOrd] = await Promise.all([
        fetch(API_DISTRIBUIDORES),
        fetch(API_PRODUCTOS),
        fetch(API_PEDIDOS)
      ]);
      setDistributors(await resDist.json());
      setProducts(await resProd.json());
      setOrders(await resOrd.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdateStatus = async (id, nuevoEstado) => {
    if (!window.confirm(`¿Estás seguro de marcar este pedido como ${nuevoEstado}?`)) return;

    try {
      const res = await fetch(`${API_PEDIDOS}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      
      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchData();
      } else {
        alert("Error: " + data.message);
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  useEffect(() => {
    if (selectedDistributor) {
      const lowStockItems = products
        .filter(p => p.stock <= 5 && p.distribuidor === selectedDistributor)
        .map(p => ({ productoId: p._id, nombre: p.nombre, stockActual: p.stock, cantidadPedir: 10 }));
      setOrderItems(lowStockItems);
    } else {
      setOrderItems([]);
    }
  }, [selectedDistributor, products]);

  const handleQuantityChange = (id, val) => {
    setOrderItems(items => items.map(item => item.productoId === id ? { ...item, cantidadPedir: parseInt(val) || 0 } : item));
  };

  const handleSaveOrder = async () => {
    if (!deliveryDate) return alert("Selecciona fecha estimada.");
    if (orderItems.length === 0) return alert("Lista vacía.");

    const payload = {
      distribuidor: selectedDistributor,
      productos: orderItems.map(i => ({ productoId: i.productoId, nombre: i.nombre, cantidad: i.cantidadPedir })),
      fechaEntrega: deliveryDate
    };

    try {
      setLoading(true);
      const res = await fetch(API_PEDIDOS, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { alert("¡Pedido registrado!"); setSelectedDistributor(''); setDeliveryDate(''); fetchData(); setActiveTab('history'); } 
      else { alert("Error al guardar."); }
    } catch (e) { alert("Error de conexión"); } finally { setLoading(false); }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    if (!formData.nombre.trim()) { setError('Nombre obligatorio'); setLoading(false); return; }
    try {
      const res = await fetch(API_DISTRIBUIDORES, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error('Error al registrar');
      setSuccess(true); setFormData({ nombre: '', contacto: '', telefono: '' }); fetchData();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4 md:mb-0">
          <Users className="mr-2 text-blue-600" /> Gestión de Distribuidores
        </h2>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          <button onClick={() => setActiveTab('form')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'form' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><UserPlus size={16} className="mr-2" /> Registrar</button>
          <button onClick={() => setActiveTab('list')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><List size={16} className="mr-2" /> Ver Lista</button>
          <button onClick={() => setActiveTab('order')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'order' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><ClipboardList size={16} className="mr-2" /> Crear Pedido</button>
          <button onClick={() => setActiveTab('history')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Truck size={16} className="mr-2" /> Historial</button>
        </div>
      </div>

      {activeTab === 'form' && (
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-blue-500 animate-fade-in">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Registrar Nuevo Distribuidor</h3>
          {success && <div className="p-4 mb-6 text-green-700 bg-green-50 border border-green-200 rounded-lg">¡Registrado!</div>}
          {error && <div className="p-4 mb-6 text-red-700 bg-red-50 border border-red-200 rounded-lg">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label><input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="Ej: Andina" required /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Contacto</label><input type="text" name="contacto" value={formData.contacto} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="Ej: Juan Pérez" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label><input type="tel" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full border p-3 rounded-lg" placeholder="+56 9..." /></div>
            </div>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition">Guardar</button>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {distributors.map((dist) => (
            <div key={dist._id} className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
              <h4 className="text-lg font-bold text-gray-800 mb-2">{dist.nombre}</h4>
              <p className="text-sm text-gray-600"><MapPin size={14} className="inline mr-1"/> {dist.contacto}</p>
              <p className="text-sm text-gray-600"><Phone size={14} className="inline mr-1"/> {dist.telefono}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'order' && (
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-indigo-500 animate-fade-in">
          <div className="mb-8 border-b pb-4"><h3 className="text-xl font-bold text-gray-800 mb-2">Registrar Pedido</h3><p className="text-gray-500 text-sm">Selecciona una empresa para ver productos con bajo stock.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Distribuidor</label><select value={selectedDistributor} onChange={(e) => setSelectedDistributor(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3"><option value="">-- Seleccionar --</option>{distributors.map(d => <option key={d._id} value={d.nombre}>{d.nombre}</option>)}</select></div>
            <div><label className="block text-sm font-bold text-gray-700 mb-2">Fecha Estimada de Llegada</label><div className="relative"><Calendar className="absolute left-3 top-3 text-gray-400" size={18}/><input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full pl-10 border border-gray-300 rounded-lg p-3"/></div></div>
          </div>
          {selectedDistributor ? (
            orderItems.length > 0 ? (
              <div className="space-y-6">
                <div className="overflow-hidden border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200"><thead className="bg-indigo-50"><tr><th className="px-6 py-3 text-left">Producto</th><th className="px-6 py-3 text-center">Stock</th><th className="px-6 py-3 text-center">Cantidad a Pedir</th></tr></thead>
                    <tbody className="bg-white divide-y divide-gray-200">{orderItems.map(item => (<tr key={item.productoId}><td className="px-6 py-4 font-medium flex items-center"><Package size={16} className="mr-2 text-gray-400"/> {item.nombre}</td><td className="px-6 py-4 text-center text-red-600 font-bold">{item.stockActual}</td><td className="px-6 py-4 text-center"><input type="number" value={item.cantidadPedir} onChange={(e) => handleQuantityChange(item.productoId, e.target.value)} className="w-20 border border-indigo-200 rounded-md p-1 text-center font-bold" min="1"/></td></tr>))}</tbody>
                  </table>
                </div>
                <div className="flex justify-end"><button onClick={handleSaveOrder} disabled={loading} className="flex items-center bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg"><Save size={20} className="mr-2" /> Confirmar Pedido</button></div>
              </div>
            ) : <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">No hay productos con stock bajo (≤ 5).</div>
          ) : <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300"><Truck size={48} className="mx-auto mb-4 opacity-20"/><p>Selecciona un distribuidor.</p></div>}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-orange-500 animate-fade-in">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center"><Truck className="mr-2"/> Historial de Pedidos</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-orange-50 text-orange-900">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha Pedido</th>
                  <th className="px-4 py-3 text-left">Distribuidor</th>
                  <th className="px-4 py-3 text-left">Llegada Estimada</th>
                  <th className="px-4 py-3 text-center">Estado Actual</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-400">No hay pedidos registrados.</td></tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order._id} className="hover:bg-orange-50 transition">
                      <td className="px-4 py-3 text-gray-600">{new Date(order.fechaPedido).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{order.distribuidor}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(order.fechaEntrega).toLocaleDateString()}</td>
                      
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase
                          ${order.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                            order.estado === 'recibido' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {order.estado}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {order.estado === 'pendiente' ? (
                          <div className="flex justify-center space-x-2">
                            <button 
                              onClick={() => handleUpdateStatus(order._id, 'recibido')}
                              title="Marcar como Recibido"
                              className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200 transition"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(order._id, 'cancelado')}
                              title="Cancelar Pedido"
                              className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Finalizado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default Distributors;