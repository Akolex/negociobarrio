import React, { useState, useEffect } from 'react';
import { Search, PlusCircle, Trash2, XCircle, ShoppingCart } from 'lucide-react';

const API_URL_PRODUCTS = 'http://localhost:5000/api/productos';
const API_URL_SALES = 'http://localhost:5000/api/ventas';

const POS = () => {
  const [availableProducts, setAvailableProducts] = useState([]);
  const [saleItems, setSaleItems] = useState([]); 
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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

      alert('¡Venta realizada con éxito! Stock actualizado.');
      setSaleItems([]);
      setIsModalOpen(false);
      setPaymentMethod('efectivo');
      window.location.reload(); 
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  if (loading) return <div className="text-center p-10">Cargando...</div>;
  if (error) return <div className="p-4 bg-red-100 text-red-700">{error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h2 className="text-3xl font-bold text-gray-800">Registro de Venta</h2>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Productos Disponibles</h3>
          <p className="text-sm text-gray-500 mt-1">Busca y añade productos a la venta.</p>
          
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm uppercase">
              <tr>
                <th className="px-6 py-3 font-semibold">Producto</th>
                <th className="px-6 py-3 font-semibold">Precio</th>
                <th className="px-6 py-3 font-semibold text-center">Stock</th>
                <th className="px-6 py-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map((product) => (
                <tr key={product._id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{product.nombre}</td>
                  <td className="px-6 py-4 text-gray-600">${product.precioVenta.toFixed(2)}</td>
                  <td className={`px-6 py-4 text-center font-bold ${product.stock < 5 ? 'text-red-600' : 'text-gray-600'}`}>
                    {product.stock}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleAddItemToSale(product)}
                      disabled={product.stock <= 0}
                      className="inline-flex items-center px-3 py-1 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Añadir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-gray-400">No se encontraron productos.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-800">Productos en Venta</h3>
          <p className="text-sm text-gray-500 mt-1">Edita las cantidades de los productos seleccionados.</p>
        </div>

        {saleItems.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center">
            <ShoppingCart size={48} className="mb-4 opacity-20" />
            <p>No hay productos seleccionados. Añade algunos desde la lista superior.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-600 text-sm uppercase">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Producto</th>
                    <th className="px-6 py-3 font-semibold">Cantidad</th>
                    <th className="px-6 py-3 font-semibold">Precio Unitario</th>
                    <th className="px-6 py-3 font-semibold">Subtotal</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {saleItems.map((item) => (
                    <tr key={item._id}>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.nombre}</td>
                      <td className="px-6 py-4">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQuantity(item._id, e.target.value)}
                          className="w-20 border border-gray-300 rounded px-2 py-1 text-center"
                        />
                      </td>
                      <td className="px-6 py-4 text-gray-600">${item.precioVenta.toFixed(2)}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">${(item.precioVenta * item.quantity).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => removeFromCart(item._id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gray-50 p-6 border-t border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                
                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="debitoKlap">Débito Klap</option>
                    <option value="debitoCajaVecina">Débito Caja Vecina</option>
                  </select>

                  {isKlap && (
                    <div className="mt-3 text-sm bg-yellow-100 text-yellow-800 p-3 rounded border border-yellow-200">
                      <div className="flex justify-between"><span>Comisión (23%):</span> <span>-${commissionKlap.toFixed(2)}</span></div>
                      <div className="flex justify-between font-bold mt-1 pt-1 border-t border-yellow-200 text-green-700">
                        <span>Neto a Acreditar:</span> <span>${netoAcreditar.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-right w-full md:w-1/3">
                  <div className="text-sm text-gray-500 mb-1">Total General</div>
                  <div className="text-4xl font-extrabold text-blue-900 mb-4">${totalBruto.toFixed(2)}</div>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg"
                  >
                    Confirmar Venta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">Confirmar Transacción</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-gray-600">Método de Pago:</span>
                <span className="font-semibold capitalize">{paymentMethod.replace('debito', 'Débito ')}</span>
              </div>
              <div className="text-center py-4">
                <span className="block text-gray-500 text-sm">Monto Total a Pagar</span>
                <span className="block text-5xl font-extrabold text-blue-600 mt-2">${totalBruto.toFixed(2)}</span>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex gap-4">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-white font-medium">
                Cancelar
              </button>
              <button onClick={handleConfirmSale} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md">
                Finalizar Venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;