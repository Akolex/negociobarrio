import React, { useState, useEffect } from 'react';
import { ShoppingCart, AlertTriangle, Package, Plus, List, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/productos';
const API_URL_DISTRIBUTORS = 'http://localhost:5000/api/distribuidores';
const LOW_STOCK_LIMIT = 5;

const ProductRegister = () => {
  const [activeTab, setActiveTab] = useState('form'); 
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precioCosto: 0,
    precioVenta: 0,
    stock: 0,
    distribuidor: '',
  });

  const [products, setProducts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const fetchData = async () => {
    try {
      const resProd = await fetch(API_URL);
      const dataProd = await resProd.json();
      setProducts(dataProd);

      const resDist = await fetch(API_URL_DISTRIBUTORS);
      const dataDist = await resDist.json();
      setDistributors(dataDist);

    } catch (err) {
      console.error("Error cargando datos:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedProducts = [...products].sort((a, b) => {
    if (!sortConfig.key) return 0;
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-300 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp size={14} className="text-blue-600 ml-1" /> 
      : <ArrowDown size={14} className="text-blue-600 ml-1" />;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!formData.nombre.trim() || formData.precioVenta <= 0) {
      setError('Error: Nombre obligatorio y Precio de Venta > 0.');
      setLoading(false);
      return;
    }

    if (distributors.length > 0 && !formData.distribuidor) {
       setError('Por favor, selecciona un distribuidor de la lista.');
       setLoading(false);
       return;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 400 && data.message.includes('duplicate key')) {
           throw new Error('El nombre del producto ya existe.');
        }
        throw new Error(data.message || 'Error al guardar');
      }

      setSuccess(true);
      setFormData({
        nombre: '', descripcion: '', precioCosto: 0, precioVenta: 0, stock: 0, distribuidor: '',
      });
      fetchData(); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-4 md:mb-0">
          <ShoppingCart className="mr-2 text-blue-600" /> Gestión de Productos
        </h2>
        
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setActiveTab('form')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'form' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Plus size={16} className="mr-2" /> Nuevo Producto
          </button>
          <button onClick={() => setActiveTab('list')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <List size={16} className="mr-2" /> Ver Inventario
          </button>
        </div>
      </div>

      {activeTab === 'form' && (
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-blue-500">
          <h3 className="text-xl font-bold text-gray-800 mb-6">Registrar Nuevo Producto</h3>
          {success && <div className="p-4 mb-6 text-green-700 bg-green-50 border border-green-200 rounded-lg flex items-center"><Package className="mr-2"/> ¡Producto registrado exitosamente!</div>}
          {error && <div className="p-4 mb-6 text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-center"><AlertTriangle className="mr-2"/> {error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto</label>
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Coca Cola 3L" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distribuidor Asociado (RF-7)</label>
                <select 
                  name="distribuidor" 
                  value={formData.distribuidor} 
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="">-- Seleccionar Distribuidor --</option>
                  {distributors.length > 0 ? (
                    distributors.map(dist => (
                      <option key={dist._id} value={dist.nombre}>
                        {dist.nombre}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No hay distribuidores registrados</option>
                  )}
                </select>
                {distributors.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">
                    Nota: Registra distribuidores primero en el módulo "Distribuidores".
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="2" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Detalles del producto..."></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Costo</label>
                <input type="number" name="precioCosto" value={formData.precioCosto} onChange={handleChange} min="0" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio Venta</label>
                <input type="number" name="precioVenta" value={formData.precioVenta} onChange={handleChange} required min="1" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleChange} min="0" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar Producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-yellow-500 animate-fade-in">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Inventario Actual</h3>
              <p className="text-gray-500 text-sm mt-1">Haz clic en los encabezados para ordenar.</p>
            </div>
            <button onClick={fetchData} className="text-blue-600 text-sm hover:underline">Actualizar lista</button>
          </div>
          
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th onClick={() => requestSort('nombre')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition select-none group">
                    <div className="flex items-center">Producto {getSortIcon('nombre')}</div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Distribuidor
                  </th>
                  <th onClick={() => requestSort('precioVenta')} className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition select-none group">
                    <div className="flex items-center">Precio Venta {getSortIcon('precioVenta')}</div>
                  </th>
                  <th onClick={() => requestSort('stock')} className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition select-none group">
                    <div className="flex items-center justify-center">Stock {getSortIcon('stock')}</div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedProducts.map((product) => {
                  const isLowStock = product.stock <= LOW_STOCK_LIMIT;
                  return (
                    <tr key={product._id} className={`hover:bg-gray-50 transition ${isLowStock ? "bg-red-50" : ""}`}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{product.nombre}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">{product.distribuidor || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">${product.precioVenta}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-center font-bold ${isLowStock ? "text-red-600 text-lg" : "text-gray-700"}`}>
                        {product.stock}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {isLowStock ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle size={12} className="mr-1" /> Bajo Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products.length === 0 && <div className="p-8 text-center text-gray-400">No hay productos registrados aún.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductRegister;