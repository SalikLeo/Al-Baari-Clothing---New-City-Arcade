const LOCKABLE_TABS = [
  { key: 'proposal-form', name: 'New Sale' },
  { key: 'proposals', name: 'Sales History' },
  { key: 'customers', name: 'Customers' },
  { key: 'master-db', name: 'Stock' },
  { key: 'expenses', name: 'Expenses' },
  { key: 'reports', name: 'Reports' },
  { key: 'companies', name: 'Purchases' },
  { key: 'dashboard', name: 'Dashboard' },
  { key: 'settings', name: 'Settings' }
];

const Settings = {
  originalLogo: '',

  async render(container) {
    container.innerHTML = `
      <div class="flex justify-between items-center mb-6 flex-wrap gap-4 no-print">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <i data-lucide="settings" class="w-5 h-5"></i>
          </div>
          <h2 class="text-3xl font-bold text-slate-800">Settings</h2>
        </div>
        <div>
          <button type="submit" form="settings-form" id="btn-save-profile" class="h-10 px-5 bg-accent hover:bg-amber-500 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-2 shadow-sm hover:shadow transition-all active:scale-95 border border-amber-400/50 cursor-pointer">
            <i data-lucide="save" class="w-4 h-4 stroke-[2.5]"></i> Save Profile
          </button>
        </div>
      </div>

      <!-- General Settings -->
      <div id="settings-view-general" class="overflow-y-auto pr-2 custom-scrollbar" style="max-height: calc(100vh - 180px);">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pb-8">
          <!-- Company Profile -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50">
              <h3 class="font-bold text-lg text-slate-700">Company Profile</h3>
            </div>
            
            <form id="settings-form" class="p-4 space-y-3" onsubmit="Settings.saveSettings(event)">
              
              <!-- Logo Section -->
              <div class="flex items-start gap-4 pb-2 border-b border-slate-100">
                <div class="shrink-0">
                  <div class="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                    <img id="settings-logo-preview" src="" class="w-full h-full object-cover object-center hidden rounded-xl">
                    <div id="settings-logo-placeholder" class="text-slate-400 flex flex-col items-center">
                      <i data-lucide="image" class="w-8 h-8 mb-2"></i>
                      <span class="text-[10px] font-medium">No Logo</span>
                    </div>
                    <div class="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer" onclick="Settings.selectLogo()">
                      <span class="text-white text-[10px] font-bold"><i data-lucide="upload" class="w-4 h-4 mb-1 mx-auto"></i> Change</span>
                    </div>
                  </div>
                  <input type="hidden" id="set-logo-path">
                </div>
                <div class="flex-1 pt-2">
                  <h4 class="font-medium text-slate-700 mb-2">Company UI Logo</h4>
                  <div class="flex gap-2">
                    <button type="button" onclick="Settings.selectLogo()" class="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50">Choose</button>
                    <button type="button" onclick="Settings.removeLogo()" class="px-3 py-1.5 text-red-600 hover:bg-red-50 text-xs font-medium rounded-lg">Remove</button>
                  </div>
                </div>
              </div>

              <!-- Fields -->
              <div class="grid grid-cols-1 gap-4">
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Company Name *</label>
                  <input type="text" id="set-name" disabled class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm opacity-70 cursor-not-allowed outline-none">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Website</label>
                  <input type="text" id="set-web" class="w-full border border-slate-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-accent outline-none">
                </div>
                <div>
                  <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Company Address</label>
                  <textarea id="set-address" rows="2" disabled class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm opacity-70 cursor-not-allowed outline-none" placeholder="Wah Cantt"></textarea>
                </div>
              </div>
            </form>
          </div>

          <!-- Screen Scale & Display Size -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
                  <i data-lucide="laptop" class="w-4 h-4"></i>
                </div>
                <div>
                  <h3 class="font-bold text-base text-slate-800">Screen Scale & Display Size</h3>
                  <p class="text-[11px] text-slate-400">Scale the app UI to comfortably fit laptop or desktop screens</p>
                </div>
              </div>
              <span id="settings-zoom-display" class="px-2.5 py-1 bg-amber-50 text-amber-700 font-mono font-black text-xs rounded-lg border border-amber-200">
                88%
              </span>
            </div>
            <div class="p-4 space-y-4">
              <p class="text-xs text-slate-600 leading-relaxed">
                Adjusts the overall interface scale so all tabs, POS billing, tables, and dialogs fit comfortably without unnecessary vertical scrolling on smaller laptop displays.
              </p>

              <!-- Quick Presets -->
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Display Scale Presets</label>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button type="button" onclick="app.setZoom(0.80)" data-zoom="0.80" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer">
                    80% <span class="block text-[9.5px] font-normal opacity-80">(Compact)</span>
                  </button>
                  <button type="button" onclick="app.setZoom(0.85)" data-zoom="0.85" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer">
                    85% <span class="block text-[9.5px] font-normal opacity-80">(15% Smaller)</span>
                  </button>
                  <button type="button" onclick="app.setZoom(0.88)" data-zoom="0.88" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer">
                    88% <span class="block text-[9.5px] font-normal opacity-80">(Laptop Ideal)</span>
                  </button>
                  <button type="button" onclick="app.setZoom(0.90)" data-zoom="0.90" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer">
                    90% <span class="block text-[9.5px] font-normal opacity-80">(Medium)</span>
                  </button>
                  <button type="button" onclick="app.setZoom(1.00)" data-zoom="1.00" class="zoom-preset-btn px-2.5 py-2 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer sm:col-span-2">
                    100% <span class="block text-[9.5px] font-normal opacity-80">(Full Size Desktop Monitor)</span>
                  </button>
                </div>
              </div>

              <!-- Fine Tuning Stepper -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-100">
                <span class="text-xs text-slate-500 font-medium">Fine adjust (- / +):</span>
                <div class="flex items-center gap-1.5">
                  <button type="button" onclick="app.adjustZoom(-0.05)" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg text-sm cursor-pointer transition-colors">-</button>
                  <button type="button" onclick="app.adjustZoom(0.05)" class="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-lg text-sm cursor-pointer transition-colors">+</button>
                </div>
              </div>

              <!-- Safe Receipts Notice -->
              <div class="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs">
                <i data-lucide="printer" class="w-4 h-4 shrink-0 text-emerald-600"></i>
                <span><b>Receipts Protected:</b> Thermal receipts and PDF exports always print at 100% physical size.</span>
              </div>
            </div>
          </div>

          <!-- Security Settings -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100">
            <div class="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <h3 class="font-bold text-lg text-slate-700">Tab Access Security</h3>
            </div>
            <div class="p-4 space-y-4">
              <div class="flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <i data-lucide="lock" class="w-5 h-5"></i>
                 </div>
                 <div class="flex-1">
                    <h4 class="font-bold text-slate-800 text-sm">Security Password</h4>
                    <p class="text-xs text-slate-500 mb-3">Set a password to restrict access to selected tabs. Leave blank to disable protection.</p>
                    
                     <div class="mb-3">
                       <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Security Password</label>
                       <div class="flex items-center gap-2">
                         <div class="relative flex-1">
                           <input type="password" id="set-stock-password" placeholder="Enter password (leave blank for none)" class="w-full border border-slate-200 rounded-lg p-2 pr-9 text-sm focus:ring-1 focus:ring-accent outline-none">
                           <button type="button" onclick="Settings.togglePasswordVisibility('set-stock-password', this)" class="password-visibility-toggle absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1">
                             <i data-lucide="eye" class="w-4 h-4"></i>
                           </button>
                         </div>
                         <button type="button" id="btn-remove-stock-pass" onclick="Settings.removeStockPassword()" class="hidden px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0" title="Delete current password">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete Password
                         </button>
                       </div>
                     </div>

                     <!-- Dropdown of Lockable Tabs with Checkmarks -->
                     <div class="pt-3 border-t border-slate-100">
                       <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Locked Tabs Selection</label>
                       <div class="relative">
                         <button type="button" onclick="Settings.toggleTabDropdown(event)" id="locked-tabs-btn" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold hover:bg-white border-slate-200 transition-all flex items-center justify-between">
                            <span id="locked-tabs-text">No Tabs Locked</span>
                            <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400"></i>
                         </button>
                         <div id="locked-tabs-menu" class="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 hidden max-h-60 overflow-y-auto">
                            <!-- Injected dynamically -->
                         </div>
                       </div>
                     </div>
                  </div>
              </div>
            </div>
          </div>

          <!-- Cloud Sync & Multi-Laptop Restore Card -->
          <div class="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
            <div class="p-4 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/80 via-slate-50 to-white flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <i data-lucide="cloud" class="w-4 h-4"></i>
                </div>
                <div>
                  <h3 class="font-bold text-base text-slate-800">Cloud Sync & Restore</h3>
                  <p class="text-[11px] text-slate-500">Sync data between laptops or restore everything onto a new laptop with one click</p>
                </div>
              </div>
              <span id="cloud-sync-status-badge" class="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1.5 shadow-2xs">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Checking...
              </span>
            </div>

            <div class="p-4 space-y-4">
              <!-- Sync / Restore Action Row -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <!-- Backup / Upload to Cloud -->
                <div class="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <div class="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <i data-lucide="cloud-upload" class="w-3.5 h-3.5"></i>
                      </div>
                      <h4 class="font-bold text-slate-800 text-sm">Upload to Cloud</h4>
                    </div>
                    <p class="text-[11px] text-slate-500 leading-relaxed">
                      Upload this laptop's complete stock, sales, invoices, and settings to the cloud.
                    </p>
                  </div>
                  <div class="pt-1">
                    <button type="button" id="btn-cloud-upload" onclick="Settings.executeCloudUpload()" class="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold py-2.5 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                      <i data-lucide="cloud-upload" class="w-4 h-4"></i>
                      <span>Sync to Cloud Now</span>
                    </button>
                    <span id="cloud-last-upload-label" class="text-[10px] text-slate-400 text-center block mt-1.5">Last upload: Never from this laptop</span>
                  </div>
                </div>

                <!-- Restore from Cloud -->
                <div class="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 flex flex-col justify-between space-y-3">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <div class="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <i data-lucide="cloud-download" class="w-3.5 h-3.5"></i>
                      </div>
                      <h4 class="font-bold text-slate-800 text-sm">Restore from Cloud</h4>
                    </div>
                    <p class="text-[11px] text-slate-500 leading-relaxed">
                      Download and restore the latest cloud backup onto this laptop. <span class="text-emerald-700 font-semibold">Perfect for new laptop setups!</span>
                    </p>
                  </div>
                  <div class="pt-1">
                    <button type="button" id="btn-cloud-restore" onclick="Settings.executeCloudRestore()" class="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-2.5 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                      <i data-lucide="cloud-download" class="w-4 h-4"></i>
                      <span>Restore from Cloud</span>
                    </button>
                    <span id="cloud-last-backup-found" class="text-[10px] text-slate-500 text-center block mt-1.5">Checking cloud backup...</span>
                  </div>
                </div>
              </div>

              <!-- Options -->
              <div class="pt-2.5 border-t border-slate-100 flex items-center justify-between">
                <label class="flex items-center gap-2.5 cursor-pointer text-xs text-slate-700 font-medium">
                  <input type="checkbox" id="chk-auto-cloud-sync" onchange="Settings.toggleAutoCloudSync(this.checked)" class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer">
                  <span>Automatically sync database to cloud whenever closing the application</span>
                </label>
                <button type="button" onclick="Settings.refreshCloudStatus()" class="text-slate-400 hover:text-slate-600 text-xs flex items-center gap-1 cursor-pointer">
                  <i data-lucide="refresh-cw" class="w-3 h-3"></i> Refresh Status
                </button>
              </div>
            </div>
          </div>

          <!-- Backup & Restore -->
          <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div class="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 class="font-bold text-lg text-slate-700">Backup & Data</h3>
              <span class="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Auto Backup Active
              </span>
            </div>
            <div class="p-4 space-y-4">
              <!-- Automatic Backup on Exit (Directory Selection) -->
              <div class="flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <i data-lucide="shield-check" class="w-5 h-5"></i>
                 </div>
                 <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 text-sm">Automatic Backup on Exit</h4>
                    <p class="text-xs text-slate-500 mb-2.5">Your latest data is automatically backed up to this folder every time you close the app.</p>
                    
                    <div class="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div class="flex-1 min-w-[200px] flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700 truncate shadow-2xs">
                        <i data-lucide="folder" class="w-4 h-4 text-slate-400 shrink-0"></i>
                        <span id="auto-backup-dir-display" class="truncate" title="Backup folder">Loading...</span>
                      </div>
                      <button type="button" onclick="Settings.selectBackupDirectory()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer">
                        <i data-lucide="folder-open" class="w-3.5 h-3.5"></i>
                        Select Directory
                      </button>
                      <button type="button" onclick="Settings.openBackupDirectory()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5 shrink-0 shadow-2xs cursor-pointer" title="Open folder in File Explorer">
                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                        Open Folder
                      </button>
                    </div>
                 </div>
              </div>

              <!-- Manual Backup -->
              <div class="pt-3 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <i data-lucide="download" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Backup Data Locally</h4>
                    <p class="text-xs text-slate-500 mb-3">Backup all proposals, expenses, products, and logs into a single file at any time.</p>
                    <button onclick="Settings.backupData()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm">
                      Backup App Data
                    </button>
                 </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Restore from Backup</h4>
                    <p class="text-xs text-slate-500 mb-3">Restore your entire system from a previous backup file. <span class="text-red-500 font-bold">This will replace current data.</span></p>
                    <button onclick="Settings.restoreData()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm">
                      Restore Data
                    </button>
                 </div>
              </div>

              <div class="pt-2 border-t border-slate-100 flex items-start gap-4">
                 <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                 </div>
                 <div>
                    <h4 class="font-bold text-slate-800 text-sm">Clear All App Data</h4>
                    <p class="text-xs text-slate-500 mb-3">Permanently delete all data and reset the application to its original state. <span class="text-red-600 font-bold underline">This action cannot be undone.</span></p>
                    <button onclick="Settings.clearAppData()" class="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 shadow-sm">
                      Clear All Data
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    try {
      await this.reloadSettings();
      if (window.lucide) lucide.createIcons();
    } catch(e) {
      console.error(e);
    }
  },


  async refreshPrinters() {
    const select = document.getElementById('set-label-printer');
    if (!select) return;

    select.innerHTML = '<option value="">Detecting printers...</option>';
    let printers = [];
    try {
      if (window.api && window.api.getPrinters) {
        printers = await window.api.getPrinters() || [];
      }
    } catch (e) {
      console.warn('Failed to get printers:', e);
    }

    if (!printers || printers.length === 0) {
      select.innerHTML = '<option value="">Default Windows Printer (Auto)</option>';
      return;
    }

    const savedPrinter = window.storage ? window.storage.get('label_printer_name') || '' : '';

    printers.sort((a, b) => {
      const isPosA = /pos|speed|label|sticker|barcode|thermal|xp-|80/i.test(a.name);
      const isPosB = /pos|speed|label|sticker|barcode|thermal|xp-|80/i.test(b.name);
      if (isPosA && !isPosB) return -1;
      if (!isPosA && isPosB) return 1;
      return a.name.localeCompare(b.name);
    });

    select.innerHTML = printers.map(p => {
      const isSpeedOrPos = /pos|speed|label|sticker|barcode|thermal|xp-|80/i.test(p.name);
      const label = p.name + (isSpeedOrPos ? ' ★ (Speed-X / Thermal Ready)' : '') + (p.isDefault ? ' [Default]' : '');
      return '<option value="' + p.name + '">' + label + '</option>';
    }).join('');

    if (savedPrinter && printers.some(p => p.name === savedPrinter)) {
      select.value = savedPrinter;
    } else {
      const best = printers.find(p => /speed|sp-|650|label|sticker|barcode/i.test(p.name)) ||
                   printers.find(p => /pos|thermal|xp-|80/i.test(p.name)) ||
                   printers.find(p => p.isDefault) || printers[0];
      if (best) select.value = best.name;
    }
  },

  savePrinterSettings() {
    if (!window.storage) return;
    const printer = document.getElementById('set-label-printer')?.value || '';
    const size = document.getElementById('set-label-size')?.value || '38x28';
    const mode = document.getElementById('set-print-mode')?.value || 'silent';
    const store = (document.getElementById('set-sticker-store-name')?.value || '').trim();

    window.storage.set('label_printer_name', printer);
    window.storage.set('label_sticker_size', size);
    window.storage.set('label_print_mode', mode);
    if (store) window.storage.set('label_store_name', store);

    if (window.app && app.barcodeStickerState) {
      app.barcodeStickerState.selectedPrinter = printer;
      app.barcodeStickerState.sizePreset = size;
      if (store) app.barcodeStickerState.storeName = store;
    }
  },

  testStickerPrint() {
    this.savePrinterSettings();
    if (window.app && typeof app.openBarcodeStickerModal === 'function') {
      app.openBarcodeStickerModal();
      setTimeout(() => {
        if (typeof app.testPrintBarcodeSticker === 'function') {
          app.testPrintBarcodeSticker();
        }
      }, 300);
    }
  },

  async reloadSettings() {
    const s = await window.api.getSettings();
    if (document.getElementById('set-name')) document.getElementById('set-name').value = s.company_name || 'Al-Baari Modest Attire';
    if (document.getElementById('set-web')) document.getElementById('set-web').value = s.website || '';
    if (document.getElementById('set-address')) document.getElementById('set-address').value = s.address || 'Wah Cantt';
    if (document.getElementById('set-phone')) document.getElementById('set-phone').value = s.phone || '0335-0059819';
    this.originalLogo = s.logo_path || '';
    this.updateLogoPreview(this.originalLogo);

    // Populate Barcode Sticker Printer settings
    await this.refreshPrinters();
    const savedSize = window.storage ? window.storage.get('label_sticker_size') || '38x28' : '38x28';
    const savedMode = window.storage ? window.storage.get('label_print_mode') || 'silent' : 'silent';
    const savedStore = window.storage ? window.storage.get('label_store_name') : null;
    const sizeSelect = document.getElementById('set-label-size');
    const modeSelect = document.getElementById('set-print-mode');
    const storeInput = document.getElementById('set-sticker-store-name');

    if (sizeSelect) sizeSelect.value = savedSize;
    if (modeSelect) modeSelect.value = savedMode;
    if (storeInput) storeInput.value = savedStore !== null ? savedStore : (s.company_name || 'AL-BAARI MODEST ATTIRE');


    const stockPassword = window.storage.get('stock_password') || '';
    const passInput = document.getElementById('set-stock-password');
    if (passInput) {
        passInput.value = stockPassword;
        passInput.disabled = false;
        passInput.classList.remove('opacity-50', 'bg-slate-50', 'cursor-not-allowed');
    }
    
    const removeBtn = document.getElementById('btn-remove-stock-pass');
    if (removeBtn) {
        if (stockPassword) removeBtn.classList.remove('hidden');
        else removeBtn.classList.add('hidden');
    }
    if (window.lucide) lucide.createIcons();

    if (window.app && app.updateZoomUI) app.updateZoomUI(app.currentZoom || 0.88);
    this.renderTabDropdown();

    if (window.api && window.api.getBackupDirectory) {
      try {
        const backupDir = await window.api.getBackupDirectory();
        const dirDisplay = document.getElementById('auto-backup-dir-display');
        if (dirDisplay) {
          dirDisplay.textContent = backupDir || 'Not configured';
          dirDisplay.title = backupDir || '';
        }
      } catch (e) {
        console.error('Error loading backup directory:', e);
      }
    }
  },

  removeStockPassword() {
    window.storage.set('stock_password', '');
    window.storage.set('locked_tabs', []);
    app.isStockUnlocked = false;
    app.unlockedTabs = {};
    const passInput = document.getElementById('set-stock-password');
    if (passInput) passInput.value = '';
    const removeBtn = document.getElementById('btn-remove-stock-pass');
    if (removeBtn) removeBtn.classList.add('hidden');
    this.renderTabDropdown();
    app.showAlert({
      title: 'Password Deleted',
      message: 'Security password has been removed and tab access protection disabled.',
      buttonText: 'OK'
    });
  },

  updateLogoPreview(path) {
    document.getElementById('set-logo-path').value = path;
    const preview = document.getElementById('settings-logo-preview');
    const ph = document.getElementById('settings-logo-placeholder');
    
    if (path) {
      preview.src = 'file://' + path;
      preview.classList.remove('hidden');
      ph.classList.add('hidden');
    } else {
      preview.src = '';
      preview.classList.add('hidden');
      ph.classList.remove('hidden');
    }
  },

  async selectLogo() {
    const path = await window.api.selectLogoFile();
    if (path) {
      this.updateLogoPreview(path);
    }
  },

  removeLogo() {
    this.updateLogoPreview('');
  },



  async saveSettings(e) {
    if (e) e.preventDefault();
    app.showLoading();
    try {
      const currentSettings = (await window.api.getSettings()) || {};
      const data = {
        company_name: document.getElementById('set-name')?.value || currentSettings.company_name || 'Al-Baari Modest Attire',
        website: document.getElementById('set-web')?.value || '',
        address: document.getElementById('set-address')?.value || currentSettings.address || 'Wah Cantt',
        phone: document.getElementById('set-phone')?.value || currentSettings.phone || '0335-0059819',
        logo_path: document.getElementById('set-logo-path')?.value || '',
        qr_path: '',
        qr_text: ''
      };
      await window.api.saveSettings(data);
      
      // Save Stock Password
      const passInput = document.getElementById('set-stock-password');
      const stockPass = passInput ? passInput.value.trim() : '';

      window.storage.set('stock_password', stockPass);
      app.isStockUnlocked = false; // Require re-entry with new password
      if (!stockPass) {
        window.storage.set('locked_tabs', []);
        app.unlockedTabs = {};
      } else {
        const currentLocked = window.storage.get('locked_tabs');
        if (currentLocked === null || currentLocked === undefined) {
          window.storage.set('locked_tabs', []);
        }
      }

      // Update app state
      await app.loadSettings();
      await this.reloadSettings();

      app.showAlert({
        title: 'Settings Saved',
        message: 'Your settings and security password have been saved successfully.',
        buttonText: 'OK'
      });

    } catch (err) {
      console.error(err);
      app.showAlert('Error saving settings: ' + err.message);
    } finally {
      app.hideLoading();
    }
  },

  async selectBackupDirectory() {
    if (!window.api || !window.api.selectBackupDirectory) return;
    try {
      const res = await window.api.selectBackupDirectory();
      if (res && res.success && res.path) {
        const dirDisplay = document.getElementById('auto-backup-dir-display');
        if (dirDisplay) {
          dirDisplay.textContent = res.path;
          dirDisplay.title = res.path;
        }
        app.showToast('Auto-backup directory updated successfully', 'success');
      }
    } catch (err) {
      console.error(err);
      app.showAlert('Failed to select directory: ' + err.message);
    }
  },

  async openBackupDirectory() {
    if (!window.api || !window.api.openBackupDirectory) return;
    try {
      await window.api.openBackupDirectory();
    } catch (err) {
      console.error(err);
      app.showAlert('Failed to open directory: ' + err.message);
    }
  },

  async backupData() {
    return this.handleBackup();
  },

  async restoreData() {
    return this.handleRestore();
  },

  async handleBackup() {
    app.showLoading();
    try {
      // 1. Sync all current localStorage items into SQLite
      const allKv = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          allKv[key] = localStorage.getItem(key);
        }
      }
      if (window.api && window.api.saveAllKv) {
        await window.api.saveAllKv(allKv);
      }

      // 2. Perform backup
      const res = await window.api.backupData();
      if (res && res.success) {
        app.showAlert({
          title: 'Backup Successful',
          message: `Database backup created successfully at:<br><b class="text-slate-800 break-all text-xs">${res.path}</b>`,
          buttonText: 'Done'
        });
      } else if (res && res.error && res.error !== 'Cancelled') {
        app.showAlert('Backup failed: ' + res.error);
      }
    } catch (err) {
      console.error(err);
      app.showAlert('Failed to create backup: ' + err.message);
    } finally {
      app.hideLoading();
    }
  },

  async handleRestore() {
    app.verifyPassword({
      title: 'Security Verification',
      message: 'Enter security password to authorize restoring database:',
      onVerified: () => {
        app.showConfirm({
          title: 'Restore Database',
          message: 'Restoring a database will replace all current data with the selected backup file. The app will restart automatically upon completion. Are you sure you want to proceed?',
          confirmText: 'Select Backup File',
          confirmColor: 'orange',
          onConfirm: async () => {
            app.showLoading();
            try {
              // Clear local and session storage so restored DB rehydrates cleanly
              localStorage.clear();
              sessionStorage.clear();
              const res = await window.api.restoreData();
              if (res && !res.success && res.error !== 'Cancelled') {
                app.showAlert('Restore failed: ' + res.error);
              }
            } catch (err) {
              console.error(err);
              app.showAlert('Failed to restore database: ' + err.message);
            } finally {
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  async clearAppData() {
    app.verifyPassword({
      title: 'Security Verification',
      message: 'Enter password to authorize clearing all app data:',
      onVerified: () => {
        app.showConfirm({
          title: 'Clear All App Data',
          message: 'Are you sure you want to delete EVERYTHING? This will permanently delete all stock items, rate lists, sales invoices, companies, customers, expenses, and transaction logs. The app will be reset to a clean slate. This action CANNOT be undone!',
          confirmText: 'Yes, Delete Everything',
          confirmColor: 'red',
          onConfirm: async () => {
            app.showLoading();
            try {
              localStorage.clear();
              sessionStorage.clear();
              const res = await window.api.clearAppData();
              if (res && res.success) {
                app.hideLoading();
                app.showAlert({
                  title: 'All Data Cleared',
                  message: 'All stock items, sales, rate history, companies, customers, expenses, and transactions have been permanently cleared.',
                  buttonText: 'Reset Application',
                  onConfirm: () => {
                    window.location.reload();
                  }
                });
              } else {
                app.showAlert('Clear data failed: ' + (res ? res.error : 'Unknown error'));
              }
            } catch (err) {
              console.error(err);
              app.showAlert('Failed to clear data: ' + err.message);
            } finally {
              app.hideLoading();
            }
          }
        });
      }
    });
  },

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
    }
    if (window.lucide) lucide.createIcons();
  },

  toggleTabDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('locked-tabs-menu');
    if (!menu) return;
    const isHidden = menu.classList.contains('hidden');
    
    if (isHidden) {
      menu.classList.remove('hidden');
      const closeMenu = (e) => {
        if (!menu.contains(e.target)) {
          menu.classList.add('hidden');
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    } else {
      menu.classList.add('hidden');
    }
  },

  renderTabDropdown() {
    const lockedTabs = window.storage.get('locked_tabs') || [];
    const menu = document.getElementById('locked-tabs-menu');
    const btnText = document.getElementById('locked-tabs-text');
    if (!menu || !btnText) return;

    if (lockedTabs.length === 0) {
      btnText.textContent = "No Tabs Locked";
    } else {
      const names = LOCKABLE_TABS.filter(t => lockedTabs.includes(t.key)).map(t => t.name);
      btnText.textContent = names.join(', ');
    }

    menu.innerHTML = LOCKABLE_TABS.map(tab => {
      const isLocked = lockedTabs.includes(tab.key);
      return `
        <div onclick="Settings.toggleTabLock('${tab.key}', event)" class="px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer select-none">
          <span class="text-xs font-bold text-slate-700">${tab.name}</span>
          <div class="w-4 h-4 border border-slate-300 rounded flex items-center justify-center transition-colors ${isLocked ? 'bg-accent border-accent text-slate-900' : 'bg-white'}">
            ${isLocked ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  },

  async toggleTabLock(key, event) {
    if (event) event.stopPropagation();

    const password = window.storage.get('stock_password') || '';
    if (!password) {
      return app.showAlert({
        title: 'Security Required',
        message: 'Please set and save a Security Password first to lock/unlock tabs.',
        buttonText: 'OK'
      });
    }

    app.showPrompt({
      title: 'Password Required',
      message: `Enter password to lock/unlock this tab:`,
      type: 'password',
      onConfirm: (input) => {
        if (input === password) {
          let lockedTabs = window.storage.get('locked_tabs') || [];
          if (lockedTabs.includes(key)) {
            lockedTabs = lockedTabs.filter(t => t !== key);
          } else {
            lockedTabs.push(key);
          }
          window.storage.set('locked_tabs', lockedTabs);
          
          if (app.unlockedTabs) {
            delete app.unlockedTabs[key];
          }

          app.showAlert({
            title: 'Success',
            message: 'Tab security updated successfully.',
            buttonText: 'OK'
          });
          this.renderTabDropdown();
    this.refreshCloudStatus();
        } else {
          app.showAlert({
            title: 'Error',
            message: 'Incorrect password. Tab security unchanged.',
            buttonText: 'Try Again'
          });
        }
      }
    });
  }
,

  async refreshCloudStatus() {
    const badge = document.getElementById('cloud-sync-status-badge');
    const uploadLabel = document.getElementById('cloud-last-upload-label');
    const backupFoundLabel = document.getElementById('cloud-last-backup-found');
    const chkAuto = document.getElementById('chk-auto-cloud-sync');

    if (chkAuto) {
      const autoSync = window.localStorage.getItem('auto_cloud_sync') === 'true';
      chkAuto.checked = autoSync;
    }

    if (!window.api || !window.api.cloudSyncGetStatus) return;

    try {
      const status = await window.api.cloudSyncGetStatus();
      if (badge) {
        if (status.connected) {
          badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5 shadow-2xs';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Connected to Cloud';
        } else {
          badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5 shadow-2xs';
          badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Offline (No Internet)';
        }
      }

      if (uploadLabel) {
        const syncTime = status.localSyncTime || window.localStorage.getItem('last_cloud_sync_time');
        if (syncTime) {
          const d = new Date(syncTime);
          uploadLabel.textContent = 'Last upload: ' + d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (status.cloudMeta && status.cloudMeta.timestamp) {
          const d = new Date(status.cloudMeta.timestamp);
          uploadLabel.textContent = 'Last upload: ' + d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
          uploadLabel.textContent = 'Last upload: Never from this laptop';
        }
      }

      if (backupFoundLabel) {
        if (status.cloudMeta && status.cloudMeta.timestamp) {
          const d = new Date(status.cloudMeta.timestamp);
          const dev = status.cloudMeta.device ? ' (' + status.cloudMeta.device + ')' : '';
          const pCount = (status.cloudMeta.counts && status.cloudMeta.counts.products) ? status.cloudMeta.counts.products : 0;
          const iCount = (status.cloudMeta.counts && status.cloudMeta.counts.proposals) ? status.cloudMeta.counts.proposals : 0;
          backupFoundLabel.innerHTML = '<span class="text-emerald-700 font-semibold">Latest Cloud Backup:</span> ' + d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + dev + ' • <span class="font-mono">' + pCount + ' products, ' + iCount + ' invoices</span>';
        } else {
          backupFoundLabel.textContent = 'No cloud backup found on Supabase yet. Click "Sync to Cloud Now" to create one.';
        }
      }
    } catch (err) {
      console.warn('Error checking cloud status:', err);
      if (badge) {
        badge.className = 'text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1.5';
        badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Check failed';
      }
    }
  },

  async toggleAutoCloudSync(enabled) {
    window.localStorage.setItem('auto_cloud_sync', enabled ? 'true' : 'false');
    if (window.api && window.api.setKv) {
      await window.api.setKv('auto_cloud_sync', enabled ? 'true' : 'false');
    }
    app.showNotification?.({
      title: enabled ? 'Auto Cloud Sync Enabled' : 'Auto Cloud Sync Disabled',
      message: enabled ? 'Your database will automatically backup to the cloud whenever you close the app.' : 'Automatic cloud backup on exit turned off.',
      type: 'info'
    });
  },

  async executeCloudUpload() {
    if (!window.api || !window.api.cloudSyncUpload) {
      return app.showAlert({
        title: 'Feature Unavailable',
        message: 'Cloud Sync is only available in Desktop Electron mode.'
      });
    }

    const btn = document.getElementById('btn-cloud-upload');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-70', 'cursor-wait');
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Uploading to Cloud...';
      if (window.lucide) lucide.createIcons();
    }

    try {
      const res = await window.api.cloudSyncUpload();
      if (!res.success) throw new Error(res.error || 'Failed to upload snapshot');

      if (res.timestamp) {
        window.localStorage.setItem('last_cloud_sync_time', res.timestamp);
      }

      await this.refreshCloudStatus();

      const pCount = (res.counts && res.counts.products) ? res.counts.products : 0;
      const iCount = (res.counts && res.counts.proposals) ? res.counts.proposals : 0;
      const cCount = (res.counts && res.counts.customers) ? res.counts.customers : 0;

      app.showAlert({
        title: 'Cloud Sync Complete!',
        message: 'Your entire store database has been securely backed up to the cloud!\n\n• Products: ' + pCount + '\n• Invoices: ' + iCount + '\n• Customers: ' + cCount + '\n\nYou can now open any other laptop and click "Restore from Cloud" to download this exact data!',
        buttonText: 'Awesome'
      });
    } catch (err) {
      console.error('Cloud upload failed:', err);
      app.showAlert({
        title: 'Cloud Sync Failed',
        message: 'Could not upload backup to Supabase:\n' + err.message + '\n\nPlease check your internet connection.',
        buttonText: 'OK'
      });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('opacity-70', 'cursor-wait');
        btn.innerHTML = origHtml;
        if (window.lucide) lucide.createIcons();
      }
    }
  },

  async executeCloudRestore() {
    if (!window.api || !window.api.cloudSyncRestore) {
      return app.showAlert({
        title: 'Feature Unavailable',
        message: 'Cloud Restore is only available in Desktop Electron mode.'
      });
    }

    app.showConfirm({
      title: 'Restore Database from Cloud?',
      message: 'This will replace the current local database with the latest snapshot from the cloud.\n\n(A local safety backup of this laptop will be automatically created on disk before restoring).\n\nDo you want to proceed?',
      confirmText: 'Yes, Restore Now',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: async () => {
        const btn = document.getElementById('btn-cloud-restore');
        const origHtml = btn ? btn.innerHTML : '';
        if (btn) {
          btn.disabled = true;
          btn.classList.add('opacity-70', 'cursor-wait');
          btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Restoring Data...';
          if (window.lucide) lucide.createIcons();
        }

        try {
          const res = await window.api.cloudSyncRestore();
          if (!res.success) throw new Error(res.error || 'Failed to restore snapshot');

          await this.refreshCloudStatus();

          const pCount = (res.counts && res.counts.products) ? res.counts.products : 0;
          const iCount = (res.counts && res.counts.proposals) ? res.counts.proposals : 0;
          const cCount = (res.counts && res.counts.customers) ? res.counts.customers : 0;

          app.showAlert({
            title: 'Cloud Restore Successful!',
            message: 'All store data was successfully downloaded and applied!\n\n• Restored Products: ' + pCount + '\n• Restored Invoices: ' + iCount + '\n• Restored Customers: ' + cCount + '\n\nThe application will now refresh to display the restored data.',
            buttonText: 'Refresh App',
            onConfirm: () => {
              window.location.reload();
            }
          });
        } catch (err) {
          console.error('Cloud restore failed:', err);
          app.showAlert({
            title: 'Cloud Restore Failed',
            message: 'Could not download cloud backup:\n' + err.message,
            buttonText: 'OK'
          });
        } finally {
          if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-70', 'cursor-wait');
            btn.innerHTML = origHtml;
            if (window.lucide) lucide.createIcons();
          }
        }
      }
    });
  }

};
