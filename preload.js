const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  selectLogoFile: () => ipcRenderer.invoke('select-logo-file'),

  // Products
  getProducts: (category) => ipcRenderer.invoke('get-products', category),
  addProduct: (category, data) => ipcRenderer.invoke('add-product', category, data),
  updateProduct: (category, id, data) => ipcRenderer.invoke('update-product', category, id, data),
  changeProductCategory: (oldCategory, newCategory, id, data) => ipcRenderer.invoke('change-product-category', oldCategory, newCategory, id, data),
  deleteProduct: (category, id) => ipcRenderer.invoke('delete-product', category, id),
  findProductByName: (name, excludeCategory, excludeId) => ipcRenderer.invoke('find-product-by-name', name, excludeCategory, excludeId),
  getCategoryLabels: () => ipcRenderer.invoke('get-category-labels'),
  getCategoryStats: () => ipcRenderer.invoke('get-category-stats'),
  updateCategoryLabel: (slug, label) => ipcRenderer.invoke('update-category-label', slug, label),
  addCategory: (label) => ipcRenderer.invoke('add-category', label),
  deleteCategory: (slug) => ipcRenderer.invoke('delete-category', slug),
  searchAllProducts: (query, companyId) => ipcRenderer.invoke('search-all-products', query, companyId),
  addProductStock: (data) => ipcRenderer.invoke('add-product-stock', data),
  getRateHistory: (category, productId) => ipcRenderer.invoke('get-rate-history', category, productId),
  deleteRateHistory: (id) => ipcRenderer.invoke('delete-rate-history', id),
  getAllRatesList: () => ipcRenderer.invoke('get-all-rates-list'),

  // Units
  getUnits: () => ipcRenderer.invoke('get-units'),
  addUnit: (name) => ipcRenderer.invoke('add-unit', name),
  updateUnit: (id, name) => ipcRenderer.invoke('update-unit', id, name),
  deleteUnit: (id) => ipcRenderer.invoke('delete-unit', id),

  // Proposals
  getProposals: () => ipcRenderer.invoke('get-proposals'),
  getProposal: (id) => ipcRenderer.invoke('get-proposal', id),
  getAllProposalItems: () => ipcRenderer.invoke('get-all-proposal-items'),
  saveProposal: (data) => ipcRenderer.invoke('save-proposal', data),
  deleteProposal: (id) => ipcRenderer.invoke('delete-proposal', id),
  updateProposalStatus: (id, status) => ipcRenderer.invoke('update-proposal-status', id, status),
  receivePayment: (id, amount, paymentMethod) => ipcRenderer.invoke('receive-payment', id, amount, paymentMethod),
  markProposalPaid: (idOrNumber) => ipcRenderer.invoke('mark-proposal-paid', idOrNumber),
  getNextProposalNumber: () => ipcRenderer.invoke('get-next-proposal-number'),
  getNextCustomerName: () => ipcRenderer.invoke('get-next-customer-name'),

  // Expenses
  getExpenses: (filters) => ipcRenderer.invoke('get-expenses', filters),
  saveExpense: (data) => ipcRenderer.invoke('save-expense', data),
  deleteExpense: (id) => ipcRenderer.invoke('delete-expense', id),
  getExpensesSummary: () => ipcRenderer.invoke('get-expenses-summary'),
  getExpenseCategories: () => ipcRenderer.invoke('get-expense-categories'),
  addExpenseCategory: (name) => ipcRenderer.invoke('add-expense-category', name),
  deleteExpenseCategory: (id) => ipcRenderer.invoke('delete-expense-category', id),

  // Employees
  getEmployees: (status) => ipcRenderer.invoke('get-employees', status),
  saveEmployee: (data) => ipcRenderer.invoke('save-employee', data),
  deleteEmployee: (id) => ipcRenderer.invoke('delete-employee', id),

  // Companies
  getCompanies: () => ipcRenderer.invoke('get-companies'),
  saveCompany: (data) => ipcRenderer.invoke('save-company', data),
  deleteCompany: (id) => ipcRenderer.invoke('delete-company', id),

  // Customers
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  saveCustomer: (data) => ipcRenderer.invoke('save-customer', data),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),

  // Shops
  getShops: () => ipcRenderer.invoke('get-shops'),
  getShop: (id) => ipcRenderer.invoke('get-shop', id),
  saveShop: (data) => ipcRenderer.invoke('save-shop', data),
  deleteShop: (id) => ipcRenderer.invoke('delete-shop', id),

  // Dashboard
  getDashboardStats: (period) => ipcRenderer.invoke('get-dashboard-stats', period),
  getItemSales: (section, period, targetDate) => ipcRenderer.invoke('get-item-sales', section, period, targetDate),
  getReportSummary: (filters) => ipcRenderer.invoke('get-report-summary', filters),
  toggleFavorite: (category, id) => ipcRenderer.invoke('toggle-favorite', category, id),
  getFavoriteProducts: () => ipcRenderer.invoke('get-favorite-products'),

  // Backup & Restore
  backupData: () => ipcRenderer.invoke('backup-data'),
  restoreData: () => ipcRenderer.invoke('restore-data'),
  clearAppData: () => ipcRenderer.invoke('clear-app-data'),
  generatePDF: (filename) => ipcRenderer.invoke('generate-pdf', filename),
  getBackupDirectory: () => ipcRenderer.invoke('get-backup-directory'),
  selectBackupDirectory: () => ipcRenderer.invoke('select-backup-directory'),
  openBackupDirectory: () => ipcRenderer.invoke('open-backup-directory'),

  // Storage Sync
  getAllKv: () => ipcRenderer.invoke('get-all-kv'),
  setKv: (key, value) => ipcRenderer.invoke('set-kv', key, value),
  saveAllKv: (data) => ipcRenderer.invoke('save-all-kv', data),

  // Thermal Printing
  printReceipt: (options) => ipcRenderer.invoke('print-receipt', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
});
