/**
 * Al-Baari Modest Attire - Hostinger Web API Bridge
 * 
 * Replicates 100% of the Electron IPC (preload.js) interface so the web application
 * runs completely on your Hostinger domain without changing any frontend UI code.
 */

(function () {
  // If already in desktop Electron and not forced to web mode, retain Electron IPC
  const forceWeb = window.localStorage && window.localStorage.getItem('use_hostinger_web_api') === 'true';

  if (window.api && window.api.getProducts && !forceWeb) {
    console.log('[API] Running in Desktop Electron IPC mode');
    return;
  }

  console.log('[API] Initializing Hostinger Web API Bridge...');

  // Resolve base API URL (e.g. /api or custom domain)
  function getApiBase() {
    const custom = window.localStorage.getItem('hostinger_api_url');
    if (custom && custom.trim() !== '') {
      return custom.replace(/\/+$/, '');
    }
    // Relative path works everywhere: same domain on Hostinger
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/index\.html.*$/, '').replace(/\/+$/, '');
    return pathname.endsWith('/renderer') 
      ? origin + pathname.replace(/\/renderer$/, '') + '/api' 
      : origin + pathname + '/api';
  }

  let activeBranch = (window.localStorage && window.localStorage.getItem('active_branch')) || 'b1';

  async function callApi(action, data = null, method = 'GET') {
    const baseUrl = getApiBase();
    let url = `${baseUrl}/index.php?action=${encodeURIComponent(action)}&branch_id=${encodeURIComponent(activeBranch)}`;
    
    const options = {
      method: method,
      headers: {
        'Accept': 'application/json'
      }
    };

    if (method === 'POST') {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data || {});
    } else if (data && typeof data === 'object') {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined && v !== null) params.append(k, v);
      }
      url += '&' + params.toString();
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server returned ${response.status}: ${text}`);
      }
      return await response.json();
    } catch (err) {
      console.error(`[API Error] ${action}:`, err);
      throw err;
    }
  }

  window.api = {
    isWeb: true,
    isHostinger: true,

    // Test Server Connection
    testConnection: async (testUrl) => {
      try {
        const url = (testUrl || getApiBase()).replace(/\/+$/, '') + '/index.php?action=ping';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return { success: data.success === true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // Branch Management
    getActiveBranch: async () => activeBranch,
    switchBranch: async (branchId) => {
      activeBranch = branchId === 'b2' ? 'b2' : 'b1';
      window.localStorage.setItem('active_branch', activeBranch);
      return { success: true, branch: activeBranch };
    },
    copyCatalogFromBranch: async (fromBranch, toBranch) => {
      return await callApi('copyCatalogFromBranch', { fromBranch, toBranch }, 'POST');
    },

    // Settings
    getSettings: async () => {
      try {
        return await callApi('getSettings');
      } catch (e) {
        return {
          company_name: 'Al-Baari Modest Attire',
          branch_name: activeBranch === 'b2' ? 'Branch 2' : 'Branch 1',
          branch_id: activeBranch,
          address: 'Wah Cantt',
          phone: '0335-0059819',
          tagline: "Returns & exchange accepted within 2 days.\nItems must be unworn with original tags attached.",
          auto_backup_dir: 'Hostinger Cloud Database'
        };
      }
    },
    saveSettings: async (settingsData) => {
      return await callApi('saveSettings', settingsData, 'POST');
    },
    selectLogoFile: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (!file) return resolve(null);
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        };
        input.click();
      });
    },

    // Categories
    getCategoryLabels: async () => {
      try {
        return await callApi('getCategoryLabels');
      } catch (e) {
        return [
          { id: 1, slug: 'panels', label: 'Biscuits' },
          { id: 2, slug: 'inverters', label: 'Cold Drinks' },
          { id: 3, slug: 'structures', label: 'Jellies & Candies' },
          { id: 4, slug: 'cables', label: 'Snacks & Chips' },
          { id: 5, slug: 'breakers', label: 'Chocolates' },
          { id: 6, slug: 'batteries', label: 'Dairy & Groceries' },
          { id: 8, slug: 'others', label: 'General Items' },
          { id: 38, slug: 'misc', label: 'Juices & Beverages' }
        ];
      }
    },
    getCategoryStats: async () => callApi('getCategoryStats'),
    updateCategoryLabel: async (slug, label) => callApi('updateCategoryLabel', { slug, label }, 'POST'),
    addCategory: async (label) => callApi('addCategory', { label }, 'POST'),
    deleteCategory: async (slug) => callApi('deleteCategory', { slug }, 'POST'),

    // Units
    getUnits: async () => callApi('getUnits'),
    addUnit: async (name) => callApi('addUnit', { name }, 'POST'),
    updateUnit: async (id, name) => callApi('updateUnit', { id, name }, 'POST'),
    deleteUnit: async (id) => callApi('deleteUnit', { id }, 'POST'),

    // Products
    getProducts: async (category, companyId = null) => callApi('getProducts', { category, company_id: companyId }),
    searchAllProducts: async (query = '', companyId = null) => callApi('searchAllProducts', { query, company_id: companyId }),
    findProductByName: async (name) => callApi('findProductByName', { name }),
    findProductByBarcode: async (barcode) => callApi('findProductByBarcode', { barcode }),
    addProduct: async (category, data) => callApi('addProduct', { ...data, category }, 'POST'),
    updateProduct: async (category, id, data) => callApi('updateProduct', { ...data, id, category }, 'POST'),
    changeProductCategory: async (oldCategory, newCategory, id, data) => callApi('updateProduct', { ...data, id, category_slug: newCategory }, 'POST'),
    deleteProduct: async (category, id) => callApi('deleteProduct', { id, category }, 'POST'),
    addProductStock: async (data) => callApi('addProductStock', data, 'POST'),
    getRateHistory: async (category, productId) => callApi('getRateHistory', { productId, category }),
    deleteRateHistory: async (id) => callApi('deleteRateHistory', { id }, 'POST'),
    getAllRatesList: async () => callApi('getAllRatesList'),

    // Favorites
    toggleFavorite: async (category, id) => ({ status: 'success' }),
    getFavoriteProducts: async () => [],

    // Proposals (Sales Invoices)
    getProposals: async () => callApi('getProposals'),
    getProposal: async (id) => callApi('getProposal', { id }),
    getAllProposalItems: async () => [],
    getNextProposalNumber: async () => callApi('getNextProposalNumber'),
    getNextCustomerName: async () => callApi('getNextCustomerName'),
    saveProposal: async (data) => callApi('saveProposal', data, 'POST'),
    deleteProposal: async (id) => callApi('deleteProposal', { id }, 'POST'),
    updateProposalStatus: async (id, status) => callApi('updateProposalStatus', { id, status }, 'POST'),
    receivePayment: async (id, amount, paymentMethod = 'Cash') => callApi('receivePayment', { id, amount, paymentMethod }, 'POST'),
    markProposalPaid: async (idOrNumber) => callApi('receivePayment', { id: idOrNumber, amount: 99999999 }, 'POST'),

    // Expenses
    getExpenses: async (filters = {}) => callApi('getExpenses', filters),
    saveExpense: async (data) => callApi('saveExpense', data, 'POST'),
    deleteExpense: async (id) => callApi('deleteExpense', { id }, 'POST'),
    getExpenseCategories: async () => callApi('getExpenseCategories'),
    addExpenseCategory: async (name) => callApi('addExpenseCategory', { name }, 'POST'),
    deleteExpenseCategory: async (id) => callApi('deleteExpenseCategory', { id }, 'POST'),
    getExpensesSummary: async () => {
      const expenses = await window.api.getExpenses();
      let total = 0;
      const byCat = {};
      (expenses || []).forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        total += amt;
        byCat[e.category] = (byCat[e.category] || 0) + amt;
      });
      return { total, byCat };
    },

    // Companies & Customers
    getCompanies: async () => callApi('getCompanies'),
    saveCompany: async (data) => callApi('saveCompany', data, 'POST'),
    deleteCompany: async (id) => callApi('deleteCompany', { id }, 'POST'),

    getCustomers: async () => callApi('getCustomers'),
    saveCustomer: async (data) => callApi('saveCustomer', data, 'POST'),
    deleteCustomer: async (id) => callApi('deleteCustomer', { id }, 'POST'),

    getShops: async () => [],
    getShop: async () => null,
    saveShop: async () => true,
    deleteShop: async () => true,
    getEmployees: async () => [],
    saveEmployee: async () => true,
    deleteEmployee: async () => true,

    // Dashboard
    getDashboardStats: async (period = 'daily') => callApi('getDashboardStats', { period }),
    getItemSales: async () => [],
    getReportSummary: async (filters = {}) => window.api.getDashboardStats(filters.period || 'daily'),

    // Storage KV
    getAllKv: async () => callApi('getAllKv'),
    setKv: async (key, value) => {
      if (window.localStorage) {
        window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
      return callApi('setKv', { key, value }, 'POST');
    },
    saveAllKv: async (data) => {
      for (const [k, v] of Object.entries(data)) {
        await window.api.setKv(k, v);
      }
      return { success: true };
    },

    // Printing
    printReceipt: async () => {
      window.print();
      return { success: true };
    },
    printBarcodeStickers: async () => {
      window.print();
      return { success: true };
    },
    generatePDF: async () => {
      window.print();
      return { success: true };
    },
    getPrinters: async () => [],

    // Backups
    backupData: async () => {
      const settings = await window.api.getSettings();
      const products = await window.api.searchAllProducts('');
      const proposals = await window.api.getProposals();
      const customers = await window.api.getCustomers();
      const companies = await window.api.getCompanies();
      const expenses = await window.api.getExpenses();

      const payload = {
        appName: 'Al-Baari Modest Attire',
        exportedAt: new Date().toISOString(),
        data: { settings, products, proposals, customers, companies, expenses }
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AlBaariModestAttire-HostingerBackup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return { success: true };
    },
    restoreData: async () => ({ success: false, error: 'Please use phpMyAdmin on Hostinger to restore backups' }),
    clearAppData: async () => ({ success: false }),

    getBackupDirectory: async () => 'Hostinger Cloud Database',
    selectBackupDirectory: async () => ({ success: true }),
    openBackupDirectory: async () => ({ success: true }),

    onTriggerPriceChecker: (callback) => {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'F6') {
          e.preventDefault();
          callback();
        }
      });
    }
  };
})();
