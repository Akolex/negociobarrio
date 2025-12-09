import React, { useState, useEffect } from 'react';
import { FileText, PlusCircle, MinusCircle, DollarSign, ShoppingBag, Eye, X, Calendar, Wallet, CreditCard, TrendingUp, Download, BarChart2, Lock, AlertTriangle, Save } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_MOVIMIENTOS = 'http://localhost:5000/api/movimientos';
const API_VENTAS = 'http://localhost:5000/api/ventas';
const API_TOP_PRODUCTOS = 'http://localhost:5000/api/reportes/top-productos';
const API_PEDIDOS = 'http://localhost:5000/api/pedidos';
const API_PRODUCTOS = 'http://localhost:5000/api/productos';
const API_CIERRE = 'http://localhost:5000/api/cierre-caja';

const Finance = () => {
  const [activeTab, setActiveTab] = useState('movimientos'); 
  const [movements, setMovements] = useState([]);
  const [sales, setSales] = useState([]);
  const [topProducts, setTopProducts] = useState([]); 
  const [orders, setOrders] = useState([]); 
  const [products, setProducts] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [realCashInput, setRealCashInput] = useState('');
  const [isClosedToday, setIsClosedToday] = useState(false);

  const [dailyStats, setDailyStats] = useState({
    efectivoFisico: 0,
    porAcreditar: 0,
    totalVentas: 0,
    pedidosPendientesHoy: 0, 
    proyeccionCaja: 0        
  });

  const [formData, setFormData] = useState({ concepto: '', monto: '', tipo: 'ingreso' });

  const fetchData = async () => {
    try {
      const [resMov, resSales, resOrd, resProd, resCierre] = await Promise.all([
        fetch(API_MOVIMIENTOS),
        fetch(API_VENTAS),
        fetch(API_PEDIDOS),
        fetch(API_PRODUCTOS),
        fetch(`${API_CIERRE}/hoy`)
      ]);
      
      const dataMov = await resMov.json();
      const dataSales = await resSales.json();
      const dataOrd = await resOrd.json();
      const dataProd = await resProd.json();
      const dataCierre = await resCierre.json();
      
      setMovements(dataMov);
      setSales(dataSales);
      setOrders(dataOrd);
      setProducts(dataProd);
      setIsClosedToday(dataCierre.cerrado);

      calculateAllStats(dataMov, dataSales, dataOrd, dataProd);
      
      fetchTopProducts(filterDate);

    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  const fetchTopProducts = async (date) => {
    try {
      const url = date ? `${API_TOP_PRODUCTOS}?fecha=${date}` : API_TOP_PRODUCTOS;
      const response = await fetch(url);
      setTopProducts(await response.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (activeTab === 'top') fetchTopProducts(filterDate);
  }, [filterDate, activeTab]);

  useEffect(() => { fetchData(); }, []);

  const calculateAllStats = (movs, ventas, pedidos, productosDB) => {
    const todayStr = new Date().toLocaleDateString();

    const movsHoy = movs.filter(m => new Date(m.fecha).toLocaleDateString() === todayStr);
    const ventasHoy = ventas.filter(v => new Date(v.fecha).toLocaleDateString() === todayStr);

    const ventasEfectivo = ventasHoy.filter(v => v.metodoPago === 'efectivo').reduce((sum, v) => sum + v.total, 0);
    const ingresosManuales = movsHoy.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);
    const egresosManuales = movsHoy.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0);
    
    const efectivoFisico = (ventasEfectivo + ingresosManuales) - egresosManuales;

    let porAcreditar = 0;
    ventasHoy.forEach(v => {
      if (v.metodoPago === 'debitoKlap') porAcreditar += (v.total * (1 - 0.23));
      else if (v.metodoPago === 'debitoCajaVecina') porAcreditar += v.total;
    });

    const totalVentas = ventasHoy.reduce((sum, v) => sum + v.total, 0);

    const pedidosHoy = pedidos.filter(p => 
      p.estado === 'pendiente' && 
      new Date(p.fechaEntrega).toLocaleDateString() === todayStr
    );

    let costoPedidosHoy = 0;
    pedidosHoy.forEach(pedido => {
      pedido.productos.forEach(itemPedido => {
        const productoReal = productosDB.find(p => p._id === itemPedido.productoId);
        if (productoReal) {
          costoPedidosHoy += (productoReal.precioCosto * itemPedido.cantidad);
        }
      });
    });

    const proyeccion = efectivoFisico - costoPedidosHoy;

    setDailyStats({ 
      efectivoFisico, 
      porAcreditar, 
      totalVentas,
      pedidosPendientesHoy: costoPedidosHoy,
      proyeccionCaja: proyeccion
    });
  };

  const filteredSales = sales.filter(v => v.fecha.startsWith(filterDate));

  const generateDailyReport = () => {
    try {
      const doc = new jsPDF();
      if (filteredSales.length === 0) return alert(`No hay ventas para el ${filterDate}.`);

      doc.setFontSize(18); doc.text("Reporte de Ventas", 14, 20);
      doc.setFontSize(12); doc.text(`Fecha: ${filterDate}`, 14, 28);
      
      const totalGeneral = filteredSales.reduce((sum, v) => sum + v.total, 0);
      const summaryData = [['TOTAL VENTAS', `$${totalGeneral.toLocaleString()}`]];

      autoTable(doc, { startY: 35, head: [['Concepto', 'Monto']], body: summaryData, theme: 'grid' });

      const tableRows = filteredSales.map(s => [
        new Date(s.fecha).toLocaleTimeString(), s.metodoPago.replace('debito',''), s.productos.length, `$${s.total.toLocaleString()}`
      ]);

      autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [['Hora', 'Método', 'Items', 'Total']], body: tableRows });
      doc.save(`Ventas_${filterDate}.pdf`);
    } catch (e) { alert("Error PDF: " + e.message); }
  };

  const generateTopProductsPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text("Ranking Productos", 14, 20);
      doc.setFontSize(10); doc.text(`Fecha: ${filterDate}`, 14, 28);

      const tableRows = topProducts.map((p, index) => [
        index + 1, p.nombre, p.totalVendido, `$${p.totalIngresos.toLocaleString()}`
      ]);

      autoTable(doc, { startY: 35, head: [['#', 'Producto', 'U. Vendidas', 'Ingreso']], body: tableRows, theme: 'striped' });
      doc.save(`Ranking_${filterDate}.pdf`);
    } catch (e) { alert("Error PDF: " + e.message); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: name === 'monto' ? parseFloat(value) || 0 : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (!formData.concepto || !formData.monto) { alert("Completa campos"); setLoading(false); return; }
    try {
      const response = await fetch(API_MOVIMIENTOS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      if (response.ok) { setFormData({ concepto: '', monto: '', tipo: 'ingreso' }); fetchData(); alert("Registrado"); }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handleCloseDay = async () => {
    const realCash = parseFloat(realCashInput) || 0;
    const diferencia = realCash - dailyStats.efectivoFisico;
    if(!window.confirm("¿Confirmar cierre de caja?")) return;

    try {
      const response = await fetch(API_CIERRE, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalSistema: dailyStats.efectivoFisico, totalReal: realCash, diferencia, usuario: 'Admin' })
      });
      if (response.ok) { alert("Caja cerrada."); setIsClosingModalOpen(false); setIsClosedToday(true); }
    } catch (e) { alert("Error al cerrar."); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-10">
      
      <div className="flex justify-between items-center bg-gray-900 text-white p-6 rounded-xl shadow-lg">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><Wallet className="mr-2 text-green-400"/> Control de Caja</h2>
          <p className="text-gray-400 text-sm">Estado: {isClosedToday ? <span className="text-red-400 font-bold">CERRADO</span> : <span className="text-green-400 font-bold">ABIERTO</span>}</p>
        </div>
        <button 
          onClick={() => setIsClosingModalOpen(true)} disabled={isClosedToday}
          className={`px-6 py-3 rounded-lg font-bold flex items-center transition ${isClosedToday ? 'bg-gray-700 text-gray-500' : 'bg-red-600 hover:bg-red-700 text-white'}`}
        >
          {isClosedToday ? <><Lock size={20} className="mr-2"/> Cerrado</> : <><Lock size={20} className="mr-2"/> Realizar Cierre</>}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-gray-500 text-xs font-bold uppercase">Efectivo Físico</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">${dailyStats.efectivoFisico.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <p className="text-gray-500 text-xs font-bold uppercase">Por Acreditar</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">${dailyStats.porAcreditar.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
          <p className="text-gray-500 text-xs font-bold uppercase">A Pagar Hoy</p>
          <h3 className="text-2xl font-bold text-orange-600 mt-1">-${dailyStats.pedidosPendientesHoy.toLocaleString()}</h3>
        </div>
        <div className={`p-4 rounded-xl shadow-sm border-l-4 text-white ${dailyStats.proyeccionCaja >= 0 ? 'bg-indigo-600 border-indigo-800' : 'bg-red-600 border-red-800'}`}>
          <p className="text-indigo-100 text-xs font-bold uppercase">Proyección</p>
          <h3 className="text-2xl font-bold mt-1">${dailyStats.proyeccionCaja.toLocaleString()}</h3>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 px-4 py-2">Gestión Financiera</h2>
        <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          <button onClick={() => setActiveTab('movimientos')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'movimientos' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}><DollarSign size={16} className="mr-2" /> Movimientos</button>
          <button onClick={() => setActiveTab('ventas')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'ventas' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}><ShoppingBag size={16} className="mr-2" /> Ventas</button>
          <button onClick={() => setActiveTab('top')} className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'top' ? 'bg-white text-blue-600 shadow' : 'text-gray-500'}`}><BarChart2 size={16} className="mr-2" /> Ranking</button>
        </div>
      </div>

      {activeTab === 'movimientos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md border-t-4 border-gray-500 h-fit">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Movimiento</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label><input type="text" name="concepto" value={formData.concepto} onChange={handleChange} className="w-full border border-gray-300 rounded-lg p-2 outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Monto</label><input type="number" name="monto" value={formData.monto} onChange={handleChange} min="0" className="w-full border border-gray-300 rounded-lg p-2 outline-none" /></div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button type="button" onClick={() => setFormData({...formData, tipo: 'ingreso'})} className={`p-2 rounded border ${formData.tipo === 'ingreso' ? 'bg-green-50 border-green-500 text-green-700 font-bold' : ''}`}>Ingreso</button>
                <button type="button" onClick={() => setFormData({...formData, tipo: 'egreso'})} className={`p-2 rounded border ${formData.tipo === 'egreso' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : ''}`}>Egreso</button>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold mt-4 hover:bg-blue-700 disabled:opacity-50">Guardar</button>
            </form>
          </div>
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Historial de Movimientos</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500"><tr><th className="px-4 py-2 text-left">Fecha</th><th className="px-4 py-2 text-left">Concepto</th><th className="px-4 py-2 text-right">Monto</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {movements.map(m => (
                    <tr key={m._id}>
                      <td className="px-4 py-2 text-gray-500">{new Date(m.fecha).toLocaleDateString()}</td>
                      <td className="px-4 py-2 font-medium">{m.concepto}</td>
                      <td className={`px-4 py-2 text-right font-bold ${m.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>{m.tipo === 'ingreso' ? '+' : '-'}${m.monto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ventas' && (
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-indigo-500 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
             <div><h3 className="text-xl font-bold text-gray-800">Registro de Ventas</h3><p className="text-sm text-gray-500">Filtrando por: {filterDate}</p></div>
             <div className="flex items-center gap-3">
               <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="border p-2 rounded" />
               <button onClick={generateDailyReport} className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm"><Download size={18} className="mr-2" /> PDF</button>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-indigo-50 text-indigo-900">
                <tr><th className="px-4 py-2 text-left">Hora</th><th className="px-4 py-2 text-left">Pago</th><th className="px-4 py-2 text-right">Total</th><th className="px-4 py-2 text-center">Detalle</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.length === 0 ? <tr><td colSpan="4" className="p-8 text-center text-gray-400">Sin ventas en esta fecha.</td></tr> :
                  filteredSales.map(v => (
                    <tr key={v._id}>
                      <td className="px-4 py-2 text-gray-500">{new Date(v.fecha).toLocaleTimeString()}</td>
                      <td className="px-4 py-2 capitalize">{v.metodoPago.replace('debito','')}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-800">${v.total.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center"><button onClick={() => setSelectedSale(v)} className="text-indigo-600 hover:text-indigo-900"><Eye size={18}/></button></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'top' && (
        <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-yellow-500 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4 border-b border-gray-100 pb-4">
             <div><h3 className="text-xl font-bold text-gray-800 flex items-center"><TrendingUp className="mr-2 text-yellow-600"/> Ranking Productos</h3></div>
             <div className="flex items-center gap-3">
               <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="border p-2 rounded" />
               <button onClick={generateTopProductsPDF} className="flex items-center bg-yellow-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-yellow-700 transition shadow-sm text-sm"><Download size={16} className="mr-2" /> PDF</button>
             </div>
          </div>
          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-yellow-50 text-yellow-900"><tr><th className="px-6 py-3 text-center font-bold">#</th><th className="px-6 py-3 text-left font-bold">Producto</th><th className="px-6 py-3 text-center font-bold">U. Vendidas</th><th className="px-6 py-3 text-right font-bold">Ingresos</th></tr></thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {topProducts.length === 0 ? <tr><td colSpan="4" className="p-12 text-center text-gray-400">No hay datos.</td></tr> : 
                  topProducts.map((prod, index) => (
                    <tr key={prod._id} className="hover:bg-yellow-50 transition">
                      <td className="px-6 py-4 text-center"><span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${index === 0 ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500'}`}>{index + 1}</span></td>
                      <td className="px-6 py-4 font-bold text-gray-800">{prod.nombre}</td>
                      <td className="px-6 py-4 text-center text-lg font-medium text-blue-600">{prod.totalVendido}</td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">${prod.totalIngresos.toLocaleString()}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isClosingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-gray-900 text-white p-6 text-center"><h3 className="text-2xl font-bold">Cierre de Caja</h3><p className="text-gray-400 text-sm mt-1">{new Date().toLocaleDateString()}</p></div>
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-200 pb-4"><span className="text-gray-600 font-medium">Calculado por Sistema:</span><span className="text-xl font-bold text-blue-600">${dailyStats.efectivoFisico.toLocaleString()}</span></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-2">Efectivo Real (Contado)</label><input type="number" value={realCashInput} onChange={(e) => setRealCashInput(e.target.value)} className="w-full pl-4 pr-4 py-3 border-2 border-blue-100 rounded-lg text-xl font-bold text-gray-800 focus:border-blue-500 outline-none" placeholder="0" autoFocus /></div>
              <div className={`p-4 rounded-lg flex justify-between items-center ${(parseFloat(realCashInput || 0) - dailyStats.efectivoFisico) === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}><span className="font-bold text-sm">DIFERENCIA:</span><span className="font-extrabold text-lg">${(parseFloat(realCashInput || 0) - dailyStats.efectivoFisico).toLocaleString()}</span></div>
              <div className="flex gap-4 pt-2"><button onClick={() => setIsClosingModalOpen(false)} className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50">Cancelar</button><button onClick={handleCloseDay} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-lg flex justify-center items-center"><Lock size={18} className="mr-2"/> Cerrar</button></div>
            </div>
          </div>
        </div>
      )}

      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl relative overflow-hidden">
            <div className="bg-gray-800 text-white p-3 text-center flex justify-between items-center px-4"><span className="font-bold">COMPROBANTE</span><button onClick={() => setSelectedSale(null)}><X size={18}/></button></div>
            <div className="p-6 bg-yellow-50 font-mono text-xs space-y-2 text-gray-700">
              <p>Fecha: {new Date(selectedSale.fecha).toLocaleString()}</p>
              <div className="border-b border-gray-300 my-2"></div>
              {selectedSale.productos.map((p,i) => (<div key={i} className="flex justify-between"><span>{p.cantidad} x {p.nombre}</span><span>${(p.cantidad * p.precioUnitario).toFixed(0)}</span></div>))}
              <div className="border-b border-gray-300 my-2"></div>
              <div className="flex justify-between text-base font-bold text-black"><span>TOTAL</span><span>${selectedSale.total.toFixed(0)}</span></div>
              <p className="mt-2">Pago: {selectedSale.metodoPago}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;