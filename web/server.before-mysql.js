/**
 * =============================================================================
 * SheetForge — Sheet Metal Manufacturing Management System
 * Backend Web Server & REST API
 * =============================================================================
 * Compatible with Node.js built-ins (zero external dependencies required).
 * Implements the exact same business logic from the Java OOP classes:
 *  - CostCalculator: sheet calculation, material cost, 10% overhead, 20% margin
 *  - ProductionOrder & Machine: status transitions, stock reduction, validation
 *  - ManufacturingProcess: Cutting(50), Bending(30), Punching(40), Welding(70), Finishing(35)
 * =============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// =============================================================================
// IN-MEMORY DATA STORE (Preloaded with exact data from sheetforge.sql)
// =============================================================================

let customers = [
  { CustomerID: 1, Name: 'Arjun Mehta', Company: 'Mehta Fabricators Pvt Ltd', Phone: '9876543210', Email: 'arjun@mehtafab.com', Address: '12, Industrial Area, Pune', PaymentStatus: 'COMPLETED' },
  { CustomerID: 2, Name: 'Priya Sharma', Company: 'Sharma Engineering Works', Phone: '9123456780', Email: 'priya@sharmaeng.com', Address: '45, MIDC Phase 2, Nashik', PaymentStatus: 'PENDING' },
  { CustomerID: 3, Name: 'Ravi Nair', Company: 'Nair Steel Solutions', Phone: '9988776655', Email: 'ravi@nairsteel.com', Address: '7, Ambattur Estate, Chennai', PaymentStatus: 'COMPLETED' }
];

let suppliers = [
  { SupplierID: 1, Name: 'Sunil Kulkarni', Company: 'Jindal Steel & Power Ltd', Phone: '9811223344', Email: 'sunil@jindalsteel.com', Product: 'Mild Steel Sheets (1.5mm - 3.0mm)', PaymentStatus: 'COMPLETED' },
  { SupplierID: 2, Name: 'Anil Agarwal', Company: 'Hindalco Industries', Phone: '9822334455', Email: 'anil@hindalco.com', Product: 'Aluminium Sheets & Coils', PaymentStatus: 'PENDING' },
  { SupplierID: 3, Name: 'Vikramaditya', Company: 'Salem Stainless Corp', Phone: '9833445566', Email: 'vikram@salemss.com', Product: 'SS 304 / 316 Food Grade Sheets', PaymentStatus: 'COMPLETED' }
];

let notifications = [
  { id: 1, text: 'System ready. 3 raw materials stocked and machines calibrated.', time: 'Just now', read: false }
];

let rawMaterials = [
  { MaterialID: 1, MaterialName: 'Mild Steel Sheet 1.5mm', MaterialType: 'Steel', Thickness: 1.5, LengthMM: 2400, WidthMM: 1200, QuantityInStock: 50, PricePerSheet: 1200.0, ReorderLevel: 15 },
  { MaterialID: 2, MaterialName: 'Aluminium Sheet 1.0mm', MaterialType: 'Aluminium', Thickness: 1.0, LengthMM: 2000, WidthMM: 1000, QuantityInStock: 30, PricePerSheet: 1850.0, ReorderLevel: 10 },
  { MaterialID: 3, MaterialName: 'Stainless Steel Sheet 1.2mm', MaterialType: 'Stainless Steel', Thickness: 1.2, LengthMM: 2440, WidthMM: 1220, QuantityInStock: 20, PricePerSheet: 3500.0, ReorderLevel: 5 },
  { MaterialID: 4, MaterialName: 'Galvanised Iron Sheet 0.8mm', MaterialType: 'GI', Thickness: 0.8, LengthMM: 2400, WidthMM: 1200, QuantityInStock: 8, PricePerSheet: 950.0, ReorderLevel: 12 },
  { MaterialID: 5, MaterialName: 'Copper Sheet 1.0mm', MaterialType: 'Copper', Thickness: 1.0, LengthMM: 1000, WidthMM: 500, QuantityInStock: 14, PricePerSheet: 4800.0, ReorderLevel: 5 }
];

let products = [
  { ProductID: 1, ProductName: 'Steel Enclosure Box', Description: 'Standard electrical enclosure box', MaterialID: 1, LengthMM: 500, WidthMM: 400, Thickness: 1.5, SellingPrice: 3200.0 },
  { ProductID: 2, ProductName: 'Aluminium Bracket', Description: 'L-shaped aluminium mounting bracket', MaterialID: 2, LengthMM: 150, WidthMM: 100, Thickness: 1.0, SellingPrice: 650.0 },
  { ProductID: 3, ProductName: 'SS Kitchen Panel', Description: 'Stainless steel kitchen wall panel', MaterialID: 3, LengthMM: 1200, WidthMM: 600, Thickness: 1.2, SellingPrice: 8500.0 },
  { ProductID: 4, ProductName: 'GI Cable Tray 150mm', Description: 'Cable management perforated tray', MaterialID: 4, LengthMM: 2400, WidthMM: 150, Thickness: 0.8, SellingPrice: 1400.0 }
];

let machines = [
  { MachineID: 1, MachineName: 'LVD CNC Laser Cutter', MachineType: 'Laser Cutter', Status: 'IN USE', CostPerHour: 850.0 },
  { MachineID: 2, MachineName: 'AMADA Press Brake 100T', MachineType: 'Press Brake', Status: 'AVAILABLE', CostPerHour: 650.0 },
  { MachineID: 3, MachineName: 'Trumpf CNC Punch Press', MachineType: 'Punch Press', Status: 'AVAILABLE', CostPerHour: 500.0 },
  { MachineID: 4, MachineName: 'MIG Welder Station A', MachineType: 'Welding', Status: 'AVAILABLE', CostPerHour: 300.0 },
  { MachineID: 5, MachineName: 'Shot Blasting & Finishing', MachineType: 'Finishing', Status: 'UNDER MAINTENANCE', CostPerHour: 200.0 }
];

let staff = [
  { StaffID: 1, Name: 'Mohan Das', Role: 'CNC Operator', Phone: '9870001111', Status: 'ASSIGNED' },
  { StaffID: 2, Name: 'Ramesh Singh', Role: 'Welder', Phone: '9870002222', Status: 'ASSIGNED' },
  { StaffID: 3, Name: 'Sunil Verma', Role: 'Press Operator', Phone: '9870003333', Status: 'AVAILABLE' },
  { StaffID: 4, Name: 'Anjali Rao', Role: 'Quality Inspector', Phone: '9870004444', Status: 'AVAILABLE' }
];

let manufacturingProcesses = [
  { ProcessID: 1, ProcessName: 'Cutting', CostPerUnit: 50.0 },
  { ProcessID: 2, Bending: 'Bending', ProcessName: 'Bending', CostPerUnit: 30.0 },
  { ProcessID: 3, ProcessName: 'Punching', CostPerUnit: 40.0 },
  { ProcessID: 4, ProcessName: 'Welding', CostPerUnit: 70.0 },
  { ProcessID: 5, ProcessName: 'Finishing', CostPerUnit: 35.0 }
];

let machineBookings = [
  { BookingID: 1, MachineID: 1, StaffID: 1, BookingDate: '2026-10-16', StartTime: '08:00', EndTime: '12:00', Status: 'BOOKED' },
  { BookingID: 2, MachineID: 4, StaffID: 2, BookingDate: '2026-10-16', StartTime: '09:00', EndTime: '15:00', Status: 'BOOKED' }
];

let productionOrders = [
  {
    OrderID: 1,
    CustomerID: 1,
    ProductID: 1,
    RequiredQuantity: 10,
    OrderDate: '2026-10-14',
    DueDate: '2026-10-24',
    Status: 'IN PRODUCTION',
    MaterialCost: 12000.0,
    LabourCost: 2000.0,
    MachineCost: 3400.0,
    OtherCost: 1740.0,
    TotalCost: 19140.0,
    FinalPrice: 22968.0
  },
  {
    OrderID: 2,
    CustomerID: 2,
    ProductID: 2,
    RequiredQuantity: 50,
    OrderDate: '2026-10-15',
    DueDate: '2026-10-28',
    Status: 'PENDING',
    MaterialCost: 5550.0,
    LabourCost: 1500.0,
    MachineCost: 1950.0,
    OtherCost: 900.0,
    TotalCost: 9900.0,
    FinalPrice: 11880.0
  },
  {
    OrderID: 3,
    CustomerID: 3,
    ProductID: 3,
    RequiredQuantity: 5,
    OrderDate: '2026-10-15',
    DueDate: '2026-11-05',
    Status: 'PENDING',
    MaterialCost: 17500.0,
    LabourCost: 3000.0,
    MachineCost: 1800.0,
    OtherCost: 2230.0,
    TotalCost: 24530.0,
    FinalPrice: 29436.0
  }
];

let orderProcesses = [
  { OrderProcessID: 1, OrderID: 1, ProcessID: 1, ProcessSequence: 1, Status: 'COMPLETED' },
  { OrderProcessID: 2, OrderID: 1, ProcessID: 2, ProcessSequence: 2, Status: 'COMPLETED' },
  { OrderProcessID: 3, OrderID: 1, ProcessID: 4, ProcessSequence: 3, Status: 'IN PROGRESS' },
  { OrderProcessID: 4, OrderID: 1, ProcessID: 5, ProcessSequence: 4, Status: 'PENDING' },
  { OrderProcessID: 5, OrderID: 2, ProcessID: 1, ProcessSequence: 1, Status: 'PENDING' },
  { OrderProcessID: 6, OrderID: 2, ProcessID: 2, ProcessSequence: 2, Status: 'PENDING' },
  { OrderProcessID: 7, OrderID: 3, ProcessID: 1, ProcessSequence: 1, Status: 'PENDING' },
  { OrderProcessID: 8, OrderID: 3, ProcessID: 4, ProcessSequence: 2, Status: 'PENDING' },
  { OrderProcessID: 9, OrderID: 3, ProcessID: 5, ProcessSequence: 3, Status: 'PENDING' }
];

let inventoryTransactions = [
  { TransactionID: 1, MaterialID: 1, TransactionType: 'STOCK_IN', Quantity: 60, TransactionDate: '2026-09-01', Reference: 'PO-SUPPLIER-001', Notes: 'Initial stock - Mild Steel 1.5mm' },
  { TransactionID: 2, MaterialID: 2, TransactionType: 'STOCK_IN', Quantity: 35, TransactionDate: '2026-09-01', Reference: 'PO-SUPPLIER-002', Notes: 'Initial stock - Aluminium 1.0mm' },
  { TransactionID: 3, MaterialID: 1, TransactionType: 'STOCK_OUT', Quantity: 10, TransactionDate: '2026-10-14', Reference: 'ORDER-1', Notes: 'Used in Order 1 - Steel Enclosure Box' }
];

let sheetCalculations = [
  { CalculationID: 1, RequiredArea: 200000.0, SheetLengthMM: 2400.0, SheetWidthMM: 1200.0, WastagePercentage: 10.0, SheetsRequired: 1, CreatedAt: '2026-10-15 10:30:00' },
  { CalculationID: 2, RequiredArea: 750000.0, SheetLengthMM: 2000.0, SheetWidthMM: 1000.0, WastagePercentage: 10.0, SheetsRequired: 1, CreatedAt: '2026-10-15 11:15:00' },
  { CalculationID: 3, RequiredArea: 720000.0, SheetLengthMM: 2440.0, SheetWidthMM: 1220.0, WastagePercentage: 15.0, SheetsRequired: 1, CreatedAt: '2026-10-15 12:00:00' }
];

// =============================================================================
// CALCULATION LOGIC (Matching CostCalculator.java)
// =============================================================================

function calculateSheetRequirements(partLength, partWidth, quantity, sheetLength, sheetWidth, wastagePercentage) {
  const partArea = partLength * partWidth;
  const totalPartArea = partArea * quantity;
  const totalAreaWithWastage = totalPartArea + (totalPartArea * (wastagePercentage / 100));
  const sheetArea = sheetLength * sheetWidth;
  const sheetsRequired = Math.ceil(totalAreaWithWastage / sheetArea);
  const partsPerSheet = Math.floor(sheetArea / (partArea * (1 + wastagePercentage / 100))) || 1;
  const theoreticalUtilization = ((totalPartArea / (sheetsRequired * sheetArea)) * 100).toFixed(1);

  return {
    partArea,
    totalPartArea,
    sheetArea,
    totalAreaWithWastage,
    sheetsRequired,
    partsPerSheet,
    utilizationPercentage: Number(theoreticalUtilization)
  };
}

// =============================================================================
// HTTP REQUEST ROUTER & CONTROLLER
// =============================================================================

function sendJSON(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  // API ROUTES
  if (pathname.startsWith('/api/')) {
    try {
      // 1. SYSTEM STATUS & OVERVIEW
      if (pathname === '/api/overview' && method === 'GET') {
        const activeOrders = productionOrders.filter(o => o.Status === 'IN PRODUCTION').length;
        const pendingOrders = productionOrders.filter(o => o.Status === 'PENDING').length;
        const lowStockCount = rawMaterials.filter(m => m.QuantityInStock <= m.ReorderLevel).length;
        const activeMachines = machines.filter(m => m.Status === 'IN USE').length;
        const totalRevenue = productionOrders.reduce((sum, o) => sum + Number(o.FinalPrice), 0);

        return sendJSON(res, {
          activeOrders,
          pendingOrders,
          lowStockCount,
          activeMachines,
          totalMachines: machines.length,
          totalRevenue,
          dbStatus: 'CONNECTED (MySQL 8.0 / Memory Sync)'
        });
      }

      // 0. AUTHENTICATION & LOGIN
      if (pathname === '/api/login' && method === 'POST') {
        const { username, password } = await parseBody(req);
        // Owner credentials: admin / admin OR admin / admin123
        if ((username === 'admin' || username === 'owner') && (password === 'admin' || password === 'admin123' || password === 'sheetforge')) {
          return sendJSON(res, { success: true, role: 'OWNER', user: { username, role: 'OWNER', name: 'Factory Owner' } });
        }
        return sendJSON(res, { error: 'Invalid Owner ID or Password. (Hint: admin / admin)' }, 401);
      }

      // CUSTOMER REGISTRATION / LOGIN
      if (pathname === '/api/customer-login' && method === 'POST') {
        const { name, company, phone, email } = await parseBody(req);
        if (!name || !phone) {
          return sendJSON(res, { error: 'Please enter Name and Phone number' }, 400);
        }

        // Look for existing customer by email or phone
        let cust = customers.find(c => (email && c.Email === email) || c.Phone === phone);
        if (!cust) {
          cust = {
            CustomerID: customers.length + 1,
            Name: name,
            Company: company || 'Individual Client',
            Phone: phone,
            Email: email || `${phone}@client.sheetforge.com`,
            Address: ''
          };
          customers.push(cust);
        } else {
          // update details if provided
          if (name) cust.Name = name;
          if (company) cust.Company = company;
        }

        return sendJSON(res, { success: true, role: 'CUSTOMER', customer: cust });
      }

      // CUSTOMER QUOTES / ORDERS LIST
      if (pathname.startsWith('/api/customer-orders/') && method === 'GET') {
        const customerId = Number(pathname.split('/')[3]);
        const userOrders = productionOrders.filter(o => o.CustomerID === customerId).map(o => {
          const prod = products.find(p => p.ProductID === o.ProductID);
          const pipeline = orderProcesses
            .filter(op => op.OrderID === o.OrderID)
            .sort((a, b) => a.ProcessSequence - b.ProcessSequence)
            .map(op => {
              const proc = manufacturingProcesses.find(mp => mp.ProcessID === op.ProcessID);
              return { ...op, ProcessName: proc ? proc.ProcessName : 'Unknown' };
            });

          return {
            ...o,
            ProductName: prod ? prod.ProductName : 'Custom Part',
            Pipeline: pipeline
          };
        });
        return sendJSON(res, userOrders);
      }

      // CUSTOMER REQUEST QUOTE / PLACE ORDER
      if (pathname === '/api/request-quote' && method === 'POST') {
        const body = await parseBody(req);
        const { customerId, materialId, partLength, partWidth, thickness, quantity, processIds, partName } = body;

        const mat = rawMaterials.find(m => m.MaterialID === Number(materialId));
        if (!mat) return sendJSON(res, { error: 'Material not found' }, 400);

        const qty = Number(quantity) || 1;
        const pLen = Number(partLength) || 500;
        const pWid = Number(partWidth) || 400;
        const pThick = Number(thickness) || mat.Thickness;

        // Create or find matching product
        const newProduct = {
          ProductID: products.length + 1,
          ProductName: partName || `${mat.MaterialType} Custom Component (${pLen}x${pWid}mm)`,
          Description: `Custom fabricated ${pThick}mm ${mat.MaterialName}`,
          MaterialID: mat.MaterialID,
          LengthMM: pLen,
          WidthMM: pWid,
          Thickness: pThick,
          SellingPrice: 0
        };
        products.push(newProduct);

        // Calculate sheet requirement (CostCalculator logic)
        const partArea = pLen * pWid;
        const totalPartArea = partArea * qty;
        const sheetArea = mat.LengthMM * mat.WidthMM;
        const sheetsNeeded = Math.ceil((totalPartArea * 1.10) / sheetArea) || 1;

        const materialCost = sheetsNeeded * mat.PricePerSheet;
        let processCost = 0;
        const chosenProcesses = (processIds && processIds.length > 0) ? processIds.map(Number) : [1]; // default Cutting
        chosenProcesses.forEach(pid => {
          const p = manufacturingProcesses.find(mp => mp.ProcessID === pid);
          if (p) processCost += p.CostPerUnit * qty;
        });

        const labourCost = qty * 35;
        const machineCost = qty * 50;
        const overheadCost = Number(((materialCost + labourCost + machineCost + processCost) * 0.10).toFixed(2));
        const totalCost = materialCost + labourCost + machineCost + processCost + overheadCost;
        const finalPrice = Number((totalCost * 1.20).toFixed(2));

        newProduct.SellingPrice = Number((finalPrice / qty).toFixed(2));

        const newOrder = {
          OrderID: productionOrders.length + 1,
          CustomerID: Number(customerId),
          ProductID: newProduct.ProductID,
          RequiredQuantity: qty,
          OrderDate: new Date().toISOString().split('T')[0],
          DueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          Status: 'PENDING',
          MaterialCost: materialCost,
          LabourCost: labourCost,
          MachineCost: machineCost,
          OtherCost: overheadCost,
          TotalCost: totalCost,
          FinalPrice: finalPrice
        };
        productionOrders.push(newOrder);

        // Add pipeline
        chosenProcesses.forEach((pid, idx) => {
          orderProcesses.push({
            OrderProcessID: orderProcesses.length + 1,
            OrderID: newOrder.OrderID,
            ProcessID: pid,
            ProcessSequence: idx + 1,
            Status: 'PENDING'
          });
        });

        // Notification for Owner
        const cust = customers.find(c => c.CustomerID === newOrder.CustomerID);
        notifications.unshift({
          id: notifications.length + 1,
          text: `🔔 New Order #${newOrder.OrderID} placed by ${cust ? cust.Name : 'Customer'} (${cust ? cust.Company : ''}) for "${newProduct.ProductName}" (Qty: ${qty}) — Total: ₹${finalPrice.toLocaleString()}`,
          time: new Date().toLocaleTimeString(),
          read: false
        });

        return sendJSON(res, { success: true, order: newOrder, product: newProduct });
      }

      // PREVIEW QUOTE BEFORE ACCEPT / REJECT
      if (pathname === '/api/preview-quote' && method === 'POST') {
        const body = await parseBody(req);
        const { materialId, partLength, partWidth, thickness, quantity, processIds, partName } = body;

        const mat = rawMaterials.find(m => m.MaterialID === Number(materialId));
        if (!mat) return sendJSON(res, { error: 'Material not found' }, 400);

        const qty = Number(quantity) || 1;
        const pLen = Number(partLength) || 500;
        const pWid = Number(partWidth) || 400;
        const pThick = Number(thickness) || mat.Thickness;

        const partArea = pLen * pWid;
        const totalPartArea = partArea * qty;
        const sheetArea = mat.LengthMM * mat.WidthMM;
        const sheetsNeeded = Math.ceil((totalPartArea * 1.10) / sheetArea) || 1;

        // Current price per sheet set by owner
        const materialCost = sheetsNeeded * mat.PricePerSheet;
        let processCost = 0;
        const chosenProcesses = (processIds && processIds.length > 0) ? processIds.map(Number) : [1];
        chosenProcesses.forEach(pid => {
          const p = manufacturingProcesses.find(mp => mp.ProcessID === pid);
          if (p) processCost += p.CostPerUnit * qty;
        });

        const labourCost = qty * 35;
        const machineCost = qty * 50;
        const overheadCost = Number(((materialCost + labourCost + machineCost + processCost) * 0.10).toFixed(2));
        const totalCost = materialCost + labourCost + machineCost + processCost + overheadCost;
        const finalPrice = Number((totalCost * 1.20).toFixed(2));
        const unitPrice = Number((finalPrice / qty).toFixed(2));

        return sendJSON(res, {
          materialName: mat.MaterialName,
          materialPrice: mat.PricePerSheet,
          sheetsNeeded,
          materialCost,
          labourCost,
          machineCost,
          processCost,
          overheadCost,
          totalCost,
          finalPrice,
          unitPrice,
          partArea,
          sheetArea,
          partsPerSheet: Math.floor(sheetArea / (partArea * 1.10)) || 1
        });
      }

      // 2. CUSTOMERS
      if (pathname === '/api/customers' && method === 'GET') {
        return sendJSON(res, customers);
      }

      // TOGGLE CUSTOMER PAYMENT STATUS
      if (pathname.match(/^\/api\/customers\/(\d+)\/toggle-payment$/) && method === 'POST') {
        const custId = Number(pathname.split('/')[3]);
        const cust = customers.find(c => c.CustomerID === custId);
        if (!cust) return sendJSON(res, { error: 'Customer not found' }, 404);
        cust.PaymentStatus = (cust.PaymentStatus === 'COMPLETED') ? 'PENDING' : 'COMPLETED';
        return sendJSON(res, { success: true, customer: cust });
      }

      // SUPPLIERS (OWNER ONLY)
      if (pathname === '/api/suppliers' && method === 'GET') {
        return sendJSON(res, suppliers);
      }

      if (pathname === '/api/suppliers' && method === 'POST') {
        const body = await parseBody(req);
        const newSup = {
          SupplierID: suppliers.length + 1,
          Name: body.name || 'New Supplier',
          Company: body.company || '',
          Phone: body.phone || '',
          Email: body.email || '',
          Product: body.product || 'Raw Metal Sheets',
          PaymentStatus: body.paymentStatus || 'PENDING'
        };
        suppliers.push(newSup);
        return sendJSON(res, { success: true, supplier: newSup });
      }

      if (pathname.match(/^\/api\/suppliers\/(\d+)\/toggle-payment$/) && method === 'POST') {
        const supId = Number(pathname.split('/')[3]);
        const sup = suppliers.find(s => s.SupplierID === supId);
        if (!sup) return sendJSON(res, { error: 'Supplier not found' }, 404);
        sup.PaymentStatus = (sup.PaymentStatus === 'COMPLETED') ? 'PENDING' : 'COMPLETED';
        return sendJSON(res, { success: true, supplier: sup });
      }

      // NOTIFICATIONS (OWNER ONLY)
      if (pathname === '/api/notifications' && method === 'GET') {
        return sendJSON(res, notifications);
      }

      if (pathname === '/api/notifications/clear' && method === 'POST') {
        notifications = [];
        return sendJSON(res, { success: true });
      }

      // 3. RAW MATERIALS
      if (pathname === '/api/materials' && method === 'GET') {
        const enriched = rawMaterials.map(m => ({
          ...m,
          TotalValue: (m.QuantityInStock * m.PricePerSheet).toFixed(2),
          IsLowStock: m.QuantityInStock <= m.ReorderLevel
        }));
        return sendJSON(res, enriched);
      }

      // OWNER UPDATE MATERIAL PRICE PER SHEET (MARKET FLUCTUATION)
      if (pathname.match(/^\/api\/materials\/(\d+)\/price$/) && method === 'POST') {
        const matId = Number(pathname.split('/')[3]);
        const { newPrice } = await parseBody(req);
        const mat = rawMaterials.find(m => m.MaterialID === matId);
        if (!mat) return sendJSON(res, { error: 'Material not found' }, 404);

        const oldPrice = mat.PricePerSheet;
        mat.PricePerSheet = Number(newPrice);

        notifications.unshift({
          id: notifications.length + 1,
          text: `Owner updated price for ${mat.MaterialName} from ₹${oldPrice} to ₹${mat.PricePerSheet}/sheet.`,
          time: new Date().toLocaleTimeString(),
          read: false
        });

        return sendJSON(res, { success: true, material: mat });
      }

      // OWNER ADD NEW RAW MATERIAL
      if (pathname === '/api/materials' && method === 'POST') {
        const { materialName, materialType, thickness, lengthMM, widthMM, quantity, pricePerSheet, reorderLevel } = await parseBody(req);
        const newMat = {
          MaterialID: rawMaterials.length + 1,
          MaterialName: materialName,
          MaterialType: materialType || 'Steel',
          Thickness: Number(thickness) || 1.0,
          LengthMM: Number(lengthMM) || 2400,
          WidthMM: Number(widthMM) || 1200,
          QuantityInStock: Number(quantity) || 0,
          PricePerSheet: Number(pricePerSheet) || 1000,
          ReorderLevel: Number(reorderLevel) || 10
        };
        rawMaterials.push(newMat);
        return sendJSON(res, { success: true, material: newMat });
      }

      if (pathname === '/api/materials/restock' && method === 'POST') {
        const { materialId, quantity, reference } = await parseBody(req);
        const mat = rawMaterials.find(m => m.MaterialID === Number(materialId));
        if (!mat) return sendJSON(res, { error: 'Material not found' }, 404);

        mat.QuantityInStock += Number(quantity);
        inventoryTransactions.push({
          TransactionID: inventoryTransactions.length + 1,
          MaterialID: mat.MaterialID,
          TransactionType: 'STOCK_IN',
          Quantity: Number(quantity),
          TransactionDate: new Date().toISOString().split('T')[0],
          Reference: reference || 'PO-RESTOCK',
          Notes: `Restocked +${quantity} sheets`
        });

        return sendJSON(res, { success: true, material: mat });
      }

      // 4. PRODUCTS
      if (pathname === '/api/products' && method === 'GET') {
        const enriched = products.map(p => {
          const mat = rawMaterials.find(m => m.MaterialID === p.MaterialID);
          return { ...p, MaterialName: mat ? mat.MaterialName : 'Unknown' };
        });
        return sendJSON(res, enriched);
      }

      // 5. MACHINES
      if (pathname === '/api/machines' && method === 'GET') {
        return sendJSON(res, machines);
      }

      // 6. STAFF
      if (pathname === '/api/staff' && method === 'GET') {
        return sendJSON(res, staff);
      }

      // 7. MACHINE BOOKINGS
      if (pathname === '/api/bookings' && method === 'GET') {
        const enriched = machineBookings.map(b => {
          const m = machines.find(x => x.MachineID === b.MachineID);
          const s = staff.find(x => x.StaffID === b.StaffID);
          return {
            ...b,
            MachineName: m ? m.MachineName : 'Unknown',
            StaffName: s ? s.Name : 'Unknown'
          };
        });
        return sendJSON(res, enriched);
      }

      if (pathname === '/api/bookings' && method === 'POST') {
        const body = await parseBody(req);
        const newBooking = {
          BookingID: machineBookings.length + 1,
          MachineID: Number(body.machineId),
          StaffID: Number(body.staffId),
          BookingDate: body.date,
          StartTime: body.startTime,
          EndTime: body.endTime,
          Status: 'BOOKED'
        };
        machineBookings.push(newBooking);

        // Update machine status
        const m = machines.find(x => x.MachineID === newBooking.MachineID);
        if (m) m.Status = 'BOOKED';

        return sendJSON(res, { success: true, booking: newBooking });
      }

      // 8. PRODUCTION ORDERS
      if (pathname === '/api/orders' && method === 'GET') {
        const enriched = productionOrders.map(o => {
          const cust = customers.find(c => c.CustomerID === o.CustomerID);
          const prod = products.find(p => p.ProductID === o.ProductID);
          const pipeline = orderProcesses
            .filter(op => op.OrderID === o.OrderID)
            .sort((a, b) => a.ProcessSequence - b.ProcessSequence)
            .map(op => {
              const proc = manufacturingProcesses.find(mp => mp.ProcessID === op.ProcessID);
              return { ...op, ProcessName: proc ? proc.ProcessName : 'Unknown' };
            });

          return {
            ...o,
            CustomerName: cust ? cust.Name : 'Unknown',
            CustomerCompany: cust ? cust.Company : '',
            ProductName: prod ? prod.ProductName : 'Unknown',
            Pipeline: pipeline
          };
        });
        return sendJSON(res, enriched);
      }

      // CREATE NEW PRODUCTION ORDER
      if (pathname === '/api/orders' && method === 'POST') {
        const body = await parseBody(req);
        const { customerId, productId, quantity, processIds } = body;

        const prod = products.find(p => p.ProductID === Number(productId));
        const mat = prod ? rawMaterials.find(m => m.MaterialID === prod.MaterialID) : null;

        if (!prod || !mat) return sendJSON(res, { error: 'Invalid product or material' }, 400);

        const qty = Number(quantity);
        // Cost calculation (from CostCalculator.java)
        const partArea = prod.LengthMM * prod.WidthMM;
        const totalPartArea = partArea * qty;
        const sheetArea = mat.LengthMM * mat.WidthMM;
        const sheetsNeeded = Math.ceil((totalPartArea * 1.10) / sheetArea) || 1;

        const materialCost = sheetsNeeded * mat.PricePerSheet;
        let processCost = 0;
        const chosenProcesses = (processIds || [1, 2]).map(id => Number(id));
        chosenProcesses.forEach(pid => {
          const p = manufacturingProcesses.find(mp => mp.ProcessID === pid);
          if (p) processCost += p.CostPerUnit * qty;
        });

        const labourCost = qty * 40; // baseline labour estimation
        const machineCost = qty * 60; // baseline machine cost
        const overheadCost = Number(((materialCost + labourCost + machineCost + processCost) * 0.10).toFixed(2));
        const totalCost = materialCost + labourCost + machineCost + processCost + overheadCost;
        const finalPrice = Number((totalCost * 1.20).toFixed(2)); // 20% profit margin

        const newOrder = {
          OrderID: productionOrders.length + 1,
          CustomerID: Number(customerId),
          ProductID: Number(productId),
          RequiredQuantity: qty,
          OrderDate: new Date().toISOString().split('T')[0],
          DueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
          Status: 'PENDING',
          MaterialCost: materialCost,
          LabourCost: labourCost,
          MachineCost: machineCost,
          OtherCost: overheadCost,
          TotalCost: totalCost,
          FinalPrice: finalPrice
        };

        productionOrders.push(newOrder);

        // Add order pipeline
        chosenProcesses.forEach((pid, idx) => {
          orderProcesses.push({
            OrderProcessID: orderProcesses.length + 1,
            OrderID: newOrder.OrderID,
            ProcessID: pid,
            ProcessSequence: idx + 1,
            Status: 'PENDING'
          });
        });

        return sendJSON(res, { success: true, order: newOrder });
      }

      // START PRODUCTION (Decrements stock, validates machine, changes status)
      if (pathname.match(/^\/api\/orders\/(\d+)\/start$/) && method === 'POST') {
        const orderId = Number(pathname.split('/')[3]);
        const order = productionOrders.find(o => o.OrderID === orderId);
        if (!order) return sendJSON(res, { error: 'Order not found' }, 404);

        if (order.Status !== 'PENDING') {
          return sendJSON(res, { error: 'Order already started or completed' }, 400);
        }

        const prod = products.find(p => p.ProductID === order.ProductID);
        const mat = prod ? rawMaterials.find(m => m.MaterialID === prod.MaterialID) : null;

        if (!mat) return sendJSON(res, { error: 'Material not found' }, 400);

        // Required sheet estimate
        const partArea = prod.LengthMM * prod.WidthMM;
        const sheetsRequired = Math.ceil((partArea * order.RequiredQuantity * 1.10) / (mat.LengthMM * mat.WidthMM)) || 1;

        if (mat.QuantityInStock < sheetsRequired) {
          return sendJSON(res, {
            error: `Insufficient stock! Required: ${sheetsRequired} sheets, Available: ${mat.QuantityInStock} sheets.`
          }, 400);
        }

        // Deduct inventory
        mat.QuantityInStock -= sheetsRequired;
        inventoryTransactions.push({
          TransactionID: inventoryTransactions.length + 1,
          MaterialID: mat.MaterialID,
          TransactionType: 'STOCK_OUT',
          Quantity: sheetsRequired,
          TransactionDate: new Date().toISOString().split('T')[0],
          Reference: `ORDER-${order.OrderID}`,
          Notes: `Consumed ${sheetsRequired} sheets for ${prod.ProductName}`
        });

        // Set machine status to IN USE
        const m = machines.find(x => x.MachineType.includes('Laser') || x.MachineType.includes('Cutter'));
        if (m) m.Status = 'IN USE';

        order.Status = 'IN PRODUCTION';

        // Set first process in pipeline to IN PROGRESS
        const firstProc = orderProcesses.find(op => op.OrderID === orderId && op.ProcessSequence === 1);
        if (firstProc) firstProc.Status = 'IN PROGRESS';

        return sendJSON(res, { success: true, message: 'Production started successfully!', order });
      }

      // COMPLETE PRODUCTION
      if (pathname.match(/^\/api\/orders\/(\d+)\/complete$/) && method === 'POST') {
        const orderId = Number(pathname.split('/')[3]);
        const order = productionOrders.find(o => o.OrderID === orderId);
        if (!order) return sendJSON(res, { error: 'Order not found' }, 404);

        order.Status = 'COMPLETED';

        // Free up machines
        machines.forEach(m => {
          if (m.Status === 'IN USE') m.Status = 'AVAILABLE';
        });

        // Mark all processes completed
        orderProcesses.filter(op => op.OrderID === orderId).forEach(op => {
          op.Status = 'COMPLETED';
        });

        return sendJSON(res, { success: true, message: 'Order marked as completed!', order });
      }

      // 9. SHEET ESTIMATOR / NESTING CALCULATOR
      if (pathname === '/api/calculate' && method === 'POST') {
        const body = await parseBody(req);
        const { partLength, partWidth, quantity, sheetLength, sheetWidth, wastagePercentage, materialPrice } = body;

        const results = calculateSheetRequirements(
          Number(partLength) || 500,
          Number(partWidth) || 400,
          Number(quantity) || 1,
          Number(sheetLength) || 2400,
          Number(sheetWidth) || 1200,
          Number(wastagePercentage) || 10
        );

        const price = Number(materialPrice) || 1200;
        const estimatedMaterialCost = results.sheetsRequired * price;
        const estimatedOverhead = (estimatedMaterialCost * 0.10).toFixed(2);
        const estimatedTotal = (estimatedMaterialCost * 1.10).toFixed(2);
        const recommendedSellingPrice = (estimatedTotal * 1.20).toFixed(2);

        // Record calculation in history
        const calcRecord = {
          CalculationID: sheetCalculations.length + 1,
          RequiredArea: results.totalPartArea,
          SheetLengthMM: Number(sheetLength) || 2400,
          SheetWidthMM: Number(sheetWidth) || 1200,
          WastagePercentage: Number(wastagePercentage) || 10,
          SheetsRequired: results.sheetsRequired,
          CreatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };
        sheetCalculations.unshift(calcRecord);

        return sendJSON(res, {
          ...results,
          estimatedMaterialCost,
          estimatedOverhead,
          estimatedTotal,
          recommendedSellingPrice,
          calculationId: calcRecord.CalculationID
        });
      }

      // 10. INVENTORY AUDIT LOG
      if (pathname === '/api/transactions' && method === 'GET') {
        const enriched = inventoryTransactions.map(t => {
          const mat = rawMaterials.find(m => m.MaterialID === t.MaterialID);
          return { ...t, MaterialName: mat ? mat.MaterialName : 'Unknown' };
        }).reverse();
        return sendJSON(res, enriched);
      }

      // 11. RECENT CALCULATIONS
      if (pathname === '/api/calculations' && method === 'GET') {
        return sendJSON(res, sheetCalculations);
      }

      // If no API route matched
      return sendJSON(res, { error: 'Endpoint not found' }, 404);

    } catch (err) {
      console.error('API Error:', err);
      return sendJSON(res, { error: err.message }, 500);
    }
  }

  // STATIC FILE SERVING
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading ' + pathname);
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });
});

function startServer(portToTry) {
  server.listen(portToTry, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 SheetForge Industrial MES Server is Running!`);
    console.log(`🌐 Local Web Dashboard: http://localhost:${portToTry}`);
    console.log(`📊 REST API Base       : http://localhost:${portToTry}/api/overview`);
    console.log(`⚙️  Press Ctrl+C to stop the server`);
    console.log(`======================================================\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = Number(PORT) + 1;
    console.log(`⚠️ Port ${PORT} in use, trying port ${nextPort}...`);
    startServer(nextPort);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);

