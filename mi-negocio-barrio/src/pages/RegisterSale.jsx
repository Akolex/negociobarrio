import React, { useState, useEffect } from 'react';
import { Search, PlusCircle, Trash2, XCircle, ShoppingCart, CreditCard, ChevronRight, X } from 'lucide-react';

const API_URL_PRODUCTS = 'http://localhost:5000/api/productos';
const API_URL_SALES = 'http://localhost:5000/api/ventas';

const RegisterSale = () => {
  const [availableProducts, setAvailableProducts] = useState([]);
  const [saleItems, setSaleItems] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(API_URL_PRODUCTS);
        if (!response.ok) throw new Error('Error al cargar inventario.');
        const products = await response.json();
        setAvailableProducts(products);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = availableProducts.filter(p =>
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItemToSale = (product) => {
    const existingItem = saleItems.find(item => item._id === product._id);
    
    if (saleItems.length === 0) setIsCartOpen(true);

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      if (newQuantity <= product.stock) {
        setSaleItems(saleItems.map(item =>
          item._id === product._id ? { ...item, quantity: newQuantity } : item
        ));
      } else {
        alert(`Stock insuficiente. Máximo: ${product.stock}`);
      }
    } else {
      if (product.stock > 0) {
        setSaleItems([...saleItems, { ...product, quantity: 1 }]);
      } else {
        alert('Este producto no tiene stock disponible.');
      }
    }
  };

  const handleUpdateQuantity = (productId, newQuantity) => {
    const newQty = parseInt(newQuantity);
    if (isNaN(newQty) || newQty < 0) return;
    setSaleItems(saleItems.map(item => {
      if (item._id === productId) {
        if (newQty <= item.stock) return { ...item, quantity: newQty };
        else {
          alert(`Stock insuficiente. Máximo: ${item.stock}`);
          return item;
        }
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id) => {
    setSaleItems(saleItems.filter(item => item._id !== id));
  };

  const totalBruto = saleItems.reduce((acc, item) => acc + (item.precioVenta * item.quantity), 0);
  const isKlap = paymentMethod === 'debitoKlap';
  const commissionKlap = isKlap ? totalBruto * 0.23 : 0;
  const netoAcreditar = isKlap ? totalBruto - commissionKlap : 0;

  const handleConfirmSale = async () => {
    if (saleItems.length === 0) return alert("El carrito está vacío");
    if (!window.confirm(`¿Confirmar venta por $${totalBruto.toFixed(2)}?`)) return;

    const saleData = {
      productos: saleItems.map(item => ({
        productoId: item._id,
        nombre: item.nombre,
        cantidad: item.quantity,
        precioUnitario: item.precioVenta
      })),
      total: totalBruto,
      metodoPago: paymentMethod
    };

    try {
      const response = await fetch(API_URL_SALES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al procesar venta');

      alert('¡Venta realizada con éxito!');
      setSaleItems([]);
      setIsCartOpen(false);
      setPaymentMethod('efectivo');
      window.location.reload(); 
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) return <div className="text-center p-10">Cargando...</div>;
  if (error) return <div className="p-4 bg-red-100 text-red-700">{error}</div>;

  return (
    <div className="relative h-screen flex flex-col bg-gray-50 overflow-hidden">
      
      <div className="flex-1 overflow-y-auto p-6 pb-24"> 
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Punto de Venta</h2>
            <div className="relative w-96">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-sm">
                <tr>
                  <th className="px-6 py-4 font-semibold">Producto</th>
                  <th className="px-6 py-4 font-semibold">Precio</th>
                  <th className="px-6 py-4 font-semibold text-center">Stock</th>
                  <th className="px-6 py-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="px-6 py-4 font-medium text-gray-900">{product.nombre}</td>
                    <td className="px-6 py-4 text-gray-600">${product.precioVenta.toFixed(2)}</td>
                    <td className={`px-6 py-4 text-center font-bold ${product.stock < 5 ? 'text-red-600' : 'text-gray-600'}`}>
                      {product.stock}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleAddItemToSale(product)}
                        disabled={product.stock <= 0}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition shadow-sm font-medium"
                      >
                        <PlusCircle size={18} className="mr-2" /> Agregar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && <div className="p-10 text-center text-gray-400">No se encontraron productos.</div>}
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsCartOpen(true)}
        className="fixed bottom-8 right-8 bg-gray-900 text-white p-4 rounded-full shadow-2xl hover:bg-black transition-all transform hover:scale-105 z-40 flex items-center gap-3 pr-6"
      >
        <div className="relative">
          <ShoppingCart size={28} />
          {saleItems.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-gray-900">
              {saleItems.length}
            </span>
          )}
        </div>
        <div className="text-left hidden md:block">
          <p className="text-xs text-gray-400 font-medium uppercase">Total Actual</p>
          <p className="text-lg font-bold">${totalBruto.toFixed(0)}</p>
        </div>
      </button>

      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity backdrop-blur-sm"
          onClick={() => setIsCartOpen(false)}
        ></div>
      )}

      <div className={`fixed inset-y-0 right-0 w-full md:w-[450px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        <div className="p-6 bg-gray-900 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <ShoppingCart size={24} className="text-blue-400" />
            <h2 className="text-xl font-bold">Carrito de Compras</h2>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-white transition">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
          {saleItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <ShoppingCart size={64} className="mb-4" />
              <p className="text-lg font-medium">El carrito está vacío</p>
              <p className="text-sm">Agrega productos desde el catálogo</p>
            </div>
          ) : (
            saleItems.map((item) => (
              <div key={item._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center group">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-800">{item.nombre}</h4>
                  <p className="text-sm text-blue-600 font-medium">${item.precioVenta.toFixed(0)} c/u</p>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleUpdateQuantity(item._id, e.target.value)}
                    className="w-16 text-center border border-gray-300 rounded-lg p-1 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <div className="text-right w-20">
                    <p className="font-bold text-gray-800">${(item.precioVenta * item.quantity).toFixed(0)}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item._id)} 
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
              <CreditCard size={16} className="mr-2"/> Método de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              <option value="efectivo">💵 Efectivo</option>
              <option value="debitoKlap">💳 Débito Klap</option>
              <option value="debitoCajaVecina">🏧 Caja Vecina</option>
            </select>

            {isKlap && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm space-y-1">
                <div className="flex justify-between text-blue-800"><span>Comisión (23%):</span><span>-${commissionKlap.toFixed(0)}</span></div>
                <div className="flex justify-between font-bold text-green-700 border-t border-blue-200 pt-1"><span>Acreditar:</span><span>${netoAcreditar.toFixed(0)}</span></div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-end mb-6">
            <span className="text-gray-500 font-medium">Total a Pagar</span>
            <span className="text-4xl font-extrabold text-gray-900">${totalBruto.toFixed(0)}</span>
          </div>

          <button
            onClick={handleConfirmSale}
            disabled={saleItems.length === 0}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition transform active:scale-95 flex justify-center items-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Confirmar Pago <ChevronRight size={20} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default RegisterSale;