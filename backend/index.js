require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB'))
  .catch((err) => console.error('❌ Error de conexión:', err));

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  descripcion: String,
  precioCosto: Number,
  precioVenta: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  distribuidor: String,
  activo: { type: Boolean, default: true }
});

const Producto = mongoose.model('Producto', productoSchema);
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/productos', async (req, res) => {
  try {
    const nuevoProducto = new Producto(req.body);
    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

const ventaSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  productos: [{
    productoId: String,
    nombre: String,
    cantidad: Number,
    precioUnitario: Number
  }],
  total: Number,
  metodoPago: String
});

const Venta = mongoose.model('Venta', ventaSchema);

app.post('/api/ventas', async (req, res) => {
  const { productos, total, metodoPago } = req.body;

  try {
    for (const item of productos) {
      const productoDB = await Producto.findById(item.productoId);
      
      if (!productoDB) {
        return res.status(404).json({ message: `Producto no encontrado: ${item.nombre}` });
      }

      if (productoDB.stock < item.cantidad) {
        return res.status(400).json({ 
          message: `Stock insuficiente para '${productoDB.nombre}'. Disponible: ${productoDB.stock}, Solicitado: ${item.cantidad}` 
        });
      }
    }
    for (const item of productos) {
      const productoDB = await Producto.findById(item.productoId);
      productoDB.stock -= item.cantidad;
      await productoDB.save();
    }
    const nuevaVenta = new Venta({ productos, total, metodoPago });
    await nuevaVenta.save();

    res.status(201).json({ message: 'Venta registrada y stock actualizado correctamente.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error en el servidor al procesar la venta.' });
  }
});


// Modelo de Distribuidor (RF-6)
const distribuidorSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  contacto: String,
  telefono: String
});

const Distribuidor = mongoose.model('Distribuidor', distribuidorSchema);



// Registrar nuevo distribuidor
app.post('/api/distribuidores', async (req, res) => {
  try {
    const nuevoDistribuidor = new Distribuidor(req.body);
    await nuevoDistribuidor.save();
    res.status(201).json(nuevoDistribuidor);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'El nombre del distribuidor ya existe.' });
    }
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/distribuidores', async (req, res) => {
  try {
    const distribuidores = await Distribuidor.find();
    res.json(distribuidores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------------

// Modelo de Movimiento de Caja (RF-9)
const movimientoSchema = new mongoose.Schema({
  concepto: { type: String, required: true }, // Ej: "Pago de luz"
  monto: { type: Number, required: true },
  tipo: { type: String, enum: ['ingreso', 'egreso'], required: true }, // RF-9
  fecha: { type: Date, default: Date.now }
});

const Movimiento = mongoose.model('Movimiento', movimientoSchema);

app.post('/api/movimientos', async (req, res) => {
  try {
    const nuevoMovimiento = new Movimiento(req.body);
    await nuevoMovimiento.save();
    res.status(201).json(nuevoMovimiento);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/movimientos', async (req, res) => {
  try {
    const movimientos = await Movimiento.find().sort({ fecha: -1 });
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------------

// RF-12: Reporte de Productos Más Vendidos
app.get('/api/reportes/top-productos', async (req, res) => {
  try {
    const topProducts = await Venta.aggregate([
      { $unwind: "$productos" },
      {
        $group: {
          _id: "$productos.productoId",
          nombre: { $first: "$productos.nombre" },
          totalVendido: { $sum: "$productos.cantidad" },
          totalIngresos: { $sum: { $multiply: ["$productos.cantidad", "$productos.precioUnitario"] } }
        }
      },
      { $sort: { totalVendido: -1 } },
      { $limit: 20 }
    ]);

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------------

// Login de usuario (RF-13)
  const usuarioSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nombre: String,
  activo: { type: Boolean, default: true }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);
const crearAdminPorDefecto = async () => {
  try {
    const adminExiste = await Usuario.findOne({ email: 'admin@minegocio.cl' });
    if (!adminExiste) {
      const nuevoAdmin = new Usuario({
        email: 'admin@minegocio.cl',
        password: '123', // Contraseña simple para pruebas
        nombre: 'Administrador',
        activo: true
      });
      await nuevoAdmin.save();
      console.log('✅ Usuario Admin creado: admin@minegocio.cl / 123');
    }
  } catch (error) {
    console.error('Error creando admin:', error);
  }
};
// Ejecutar al iniciar
crearAdminPorDefecto();

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }
    if (usuario.password !== password) {
      return res.status(401).json({ message: 'Contraseña incorrecta.' });
    }
    if (!usuario.activo) {
      return res.status(403).json({ message: 'Acceso denegado. Usuario inactivo.' });
    }

    // 3. Login Exitoso
    res.json({ 
      message: 'Login exitoso', 
      usuario: { nombre: usuario.nombre, email: usuario.email } 
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------------

// RF-14: Recuperar Contraseña (Simulado)
app.post('/api/recuperar-password', async (req, res) => {
  const { email } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });
    if (usuario) {
      console.log(`=============================================`);
      console.log(`📧 SIMULACIÓN DE CORREO PARA: ${email}`);
      console.log(`🔗 Link de recuperación: http://localhost:5173/reset/${usuario._id}`);
      console.log(`=============================================`);
    }
    res.json({ 
      message: 'Si el correo existe, recibirás un enlace de recuperación en breves momentos.' 
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar contraseña
app.put('/api/usuarios/:id/password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  try {
    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizamos la contraseña
    usuario.password = newPassword; 
    await usuario.save();

    res.json({ message: '¡Contraseña actualizada exitosamente!' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------------

// Modelo de Pedido (RF-15)
const pedidoSchema = new mongoose.Schema({
  distribuidor: { type: String, required: true },
  productos: [{
    productoId: String,
    nombre: String,
    cantidad: Number
  }],
  fechaPedido: { type: Date, default: Date.now }, // Fecha actual
  fechaEntrega: { type: Date, required: true },   // Fecha estimada (RF-15)
  estado: { type: String, default: 'pendiente' }  // pendiente, recibido, cancelado (RF-16)
});

const Pedido = mongoose.model('Pedido', pedidoSchema);



// 1. Registrar Pedido (RF-15)
app.post('/api/pedidos', async (req, res) => {
  try {
    const nuevoPedido = new Pedido(req.body);
    await nuevoPedido.save();
    res.status(201).json(nuevoPedido);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 2. Listar Pedidos
app.get('/api/pedidos', async (req, res) => {
  try {
    const pedidos = await Pedido.find().sort({ fechaPedido: -1 });
    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------------

// RF-16: Actualizar estado de pedido
app.put('/api/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const pedido = await Pedido.findById(id);
    if (!pedido) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }
    if (estado === 'cancelado' && pedido.estado !== 'pendiente') {
      return res.status(400).json({ message: 'Restricción: Solo se pueden cancelar pedidos pendientes.' });
    }
    if (estado === 'recibido' && pedido.estado !== 'recibido') {
      for (const item of pedido.productos) {
        const producto = await Producto.findById(item.productoId);
        if (producto) {
          producto.stock += item.cantidad;
          await producto.save();
        }
      }
    }
    pedido.estado = estado;
    await pedido.save();

    res.json({ message: `Pedido actualizado a ${estado}`, pedido });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------------

// Obtener historial de ventas (RF-18)
app.get('/api/ventas', async (req, res) => {
  try {
    const ventas = await Venta.find().sort({ fecha: -1 });
    res.json(ventas);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------------

// Modelo de Configuración Global (RF-19)
const configSchema = new mongoose.Schema({
  comisionKlap: { type: Number, default: 23 },
  limiteStockBajo: { type: Number, default: 5 },
  diasPrestamo: { type: Number, default: 30 }
});

const Config = mongoose.model('Config', configSchema);

app.get('/api/configuracion', async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) {
      config = new Config();
      await config.save();
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Actualizar parámetros 
app.put('/api/configuracion', async (req, res) => {
  try {
    let config = await Config.findOne();
    if (!config) config = new Config();
    config.comisionKlap = req.body.comisionKlap;
    config.limiteStockBajo = req.body.limiteStockBajo;
    config.diasPrestamo = req.body.diasPrestamo;
    
    await config.save();
    res.json({ message: 'Parámetros actualizados correctamente', config });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ----------------------------------------------------------

// Modelo de Cierre de Caja (RF-20)
const cierreSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  totalSistema: Number,
  totalReal: Number,
  diferencia: Number,
  usuario: String
});

const CierreCaja = mongoose.model('CierreCaja', cierreSchema);


// Registrar Cierre (RF-20)
app.post('/api/cierre-caja', async (req, res) => {
  try {
    const nuevoCierre = new CierreCaja(req.body);
    await nuevoCierre.save();
    res.status(201).json({ message: 'Caja cerrada correctamente.', cierre: nuevoCierre });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/cierre-caja/hoy', async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0,0,0,0);
    const end = new Date();
    end.setHours(23,59,59,999);
    
    const cierreHoy = await CierreCaja.findOne({ fecha: { $gte: start, $lte: end } });
    res.json({ cerrado: !!cierreHoy });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


//Resetear Base de Datos
app.delete('/api/database/reset', async (req, res) => {
  try {
    await Promise.all([
      Producto.deleteMany({}), 
      Venta.deleteMany({}),
      Distribuidor.deleteMany({}),
      Movimiento.deleteMany({}),
      Pedido.deleteMany({}),
      CierreCaja.deleteMany({})
    ]);

    res.json({ message: '✅ Base de datos reseteada correctamente. Tablas limpias.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al resetear la base de datos.' });
  }
});


// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});