/**
 * Supabase Online API Bridge for Al-Baari Modest Attire
 * 
 * Replicates 100% of the Electron IPC (preload.js) interface so the web application
 * runs completely in standard browsers and on Vercel without changing any frontend UI code.
 */

(function () {
  // If already in Electron and not forced to cloud mode, retain Electron IPC
  const forceCloud = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.forceCloudMode) ||
                     (window.localStorage && window.localStorage.getItem('use_cloud_supabase') === 'true');

  if (window.api && window.api.getProducts && !forceCloud) {
    console.log('[API] Running in Desktop Electron IPC mode');
    return;
  }

  console.log('[API] Initializing Supabase Online Cloud API...');

  let client = null;
  let activeBranch = (window.localStorage && window.localStorage.getItem('active_branch')) || 'b1';

  function getClient() {
    if (client) return client;
    const url = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || window.localStorage.getItem('supabase_url') || '';
    const key = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || window.localStorage.getItem('supabase_anon_key') || '';

    if (!url || !key) {
      return null;
    }

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      client = window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true }
      });
      return client;
    }
    return null;
  }

  // Helper for formatting current date
  function getLocalDateStr() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  window.api = {
    isCloud: true,

    // Test Supabase Connection
    testConnection: async (testUrl, testKey) => {
      try {
        const url = testUrl || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || window.localStorage.getItem('supabase_url');
        const key = testKey || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || window.localStorage.getItem('supabase_anon_key');
        if (!url || !key) return { success: false, error: 'Supabase URL or Key missing' };

        const testClient = window.supabase.createClient(url, key);
        const { data, error } = await testClient.from('settings').select('key').limit(1);
        if (error) throw error;
        return { success: true };
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
      const sb = getClient();
      if (!sb) return { success: false, count: 0 };
      const { data: sourceProducts } = await sb.from('products').select('*').eq('branch_id', fromBranch);
      if (!sourceProducts || sourceProducts.length === 0) return { success: true, count: 0 };

      const duplicates = sourceProducts.map(p => {
        const { id, created_at, ...rest } = p;
        return { ...rest, branch_id: toBranch, current_stock: 0 };
      });
      const { error } = await sb.from('products').insert(duplicates);
      if (error) console.error('copyCatalog error:', error);
      return { success: !error, count: duplicates.length };
    },

    // Settings
    getSettings: async () => {
      const defaultSettings = {
        company_name: 'Al-Baari Modest Attire',
        branch_name: activeBranch === 'b2' ? 'Branch 2' : 'Branch 1',
        branch_id: activeBranch,
        address: 'Wah Cantt',
        phone: '0335-0059819',
        tagline: 'Returns & exchange accepted within 2 days.\nItems must be unworn with original tags attached.',
        logo_path: '',
        website: '',
        auto_backup_dir: 'Cloud Storage (Supabase)'
      };

      const sb = getClient();
      if (!sb) return defaultSettings;

      try {
        const { data, error } = await sb.from('settings').select('key, value');
        if (error || !data) return defaultSettings;

        const result = { ...defaultSettings };
        data.forEach(row => {
          result[row.key] = row.value;
        });
        return result;
      } catch (e) {
        return defaultSettings;
      }
    },

    saveSettings: async (settingsData) => {
      const sb = getClient();
      if (!sb) return { success: false, error: 'Database not connected' };

      try {
        const entries = Object.entries(settingsData).map(([key, value]) => ({
          key,
          value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? ''),
          branch_id: activeBranch,
          updated_at: new Date().toISOString()
        }));

        const { error } = await sb.from('settings').upsert(entries, { onConflict: 'key' });
        if (error) throw error;
        return { success: true };
      } catch (e) {
        console.error('saveSettings error:', e);
        return { success: false, error: e.message };
      }
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
      const defaultCats = [
        { id: 1, slug: 'panels', label: 'Biscuits' },
        { id: 2, slug: 'inverters', label: 'Cold Drinks' },
        { id: 3, slug: 'structures', label: 'Jellies & Candies' },
        { id: 4, slug: 'cables', label: 'Snacks & Chips' },
        { id: 5, slug: 'breakers', label: 'Chocolates' },
        { id: 6, slug: 'batteries', label: 'Dairy & Groceries' },
        { id: 8, slug: 'others', label: 'General Items' },
        { id: 38, slug: 'misc', label: 'Juices & Beverages' }
      ];

      const sb = getClient();
      if (!sb) return defaultCats;

      try {
        const { data, error } = await sb.from('category_labels').select('*').order('id', { ascending: true });
        if (error || !data || data.length === 0) return defaultCats;
        return data;
      } catch (e) {
        return defaultCats;
      }
    },

    getCategoryStats: async () => {
      const labels = await window.api.getCategoryLabels();
      const sb = getClient();
      if (!sb) return labels.map(l => ({ ...l, count: 0 }));

      try {
        const { data } = await sb.from('products').select('category_slug').eq('branch_id', activeBranch);
        const counts = {};
        (data || []).forEach(p => {
          counts[p.category_slug] = (counts[p.category_slug] || 0) + 1;
        });
        return labels.map(l => ({ ...l, count: counts[l.slug] || 0 }));
      } catch (e) {
        return labels.map(l => ({ ...l, count: 0 }));
      }
    },

    updateCategoryLabel: async (slug, label) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('category_labels').update({ label }).eq('slug', slug);
      return { success: !error };
    },

    addCategory: async (label) => {
      const slug = label.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      const sb = getClient();
      if (!sb) return { error: 'Database not connected' };
      const { error } = await sb.from('category_labels').insert([{ slug, label }]);
      if (error) return { error: error.message };
      return { success: true, slug };
    },

    deleteCategory: async (slug) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('category_labels').delete().eq('slug', slug);
      return { success: !error };
    },

    // Units
    getUnits: async () => {
      const defaultUnits = [{ id: 1, name: 'CARTON' }, { id: 2, name: 'PCS' }, { id: 3, name: 'SET' }, { id: 4, name: 'PACK' }, { id: 5, name: 'BOX' }, { id: 6, name: 'BOTTLE' }];
      const sb = getClient();
      if (!sb) return defaultUnits;
      const { data, error } = await sb.from('product_units').select('*').order('name', { ascending: true });
      if (error || !data || data.length === 0) return defaultUnits;
      return data;
    },

    addUnit: async (name) => {
      const sb = getClient();
      if (!sb) return { error: 'No connection' };
      const { data, error } = await sb.from('product_units').insert([{ name }]).select('id').single();
      return error ? { error: error.message } : data.id;
    },

    updateUnit: async (id, name) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('product_units').update({ name }).eq('id', id);
      return { success: !error };
    },

    deleteUnit: async (id) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('product_units').delete().eq('id', id);
      return { success: !error };
    },

    // Products
    getProducts: async (category, companyId = null) => {
      if (!category || category === 'all') {
        return window.api.searchAllProducts('', companyId);
      }
      const sb = getClient();
      if (!sb) return [];

      try {
        let query = sb.from('products')
          .select('*, companies(name)')
          .eq('category_slug', category)
          .eq('branch_id', activeBranch);

        if (companyId) query = query.eq('company_id', companyId);
        query = query.order('id', { ascending: false });

        const { data, error } = await query;
        if (error || !data) return [];

        return data.map(p => ({
          ...p,
          company_name: p.companies?.name || '',
          slug: p.category_slug,
          is_favorite: false
        }));
      } catch (e) {
        console.error('getProducts error:', e);
        return [];
      }
    },

    searchAllProducts: async (searchQuery = '', companyId = null) => {
      const sb = getClient();
      if (!sb) return [];

      try {
        const labels = await window.api.getCategoryLabels();
        const labelMap = {};
        labels.forEach(l => { labelMap[l.slug] = l.label; });

        let query = sb.from('products')
          .select('*, companies(name)')
          .eq('branch_id', activeBranch);

        if (companyId) query = query.eq('company_id', companyId);

        const cleanQ = (searchQuery || '').trim();
        if (cleanQ) {
          query = query.or(`item_name.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%,barcode.ilike.%${cleanQ}%`);
        }

        query = query.order('item_name', { ascending: true });
        const { data, error } = await query;
        if (error || !data) return [];

        return data.map(p => ({
          ...p,
          company_name: p.companies?.name || '',
          slug: p.category_slug,
          category_label: labelMap[p.category_slug] || p.category_slug,
          is_favorite: false
        }));
      } catch (e) {
        console.error('searchAllProducts error:', e);
        return [];
      }
    },

    findProductByName: async (name, excludeCategory = null, excludeId = null) => {
      if (!name) return null;
      const sb = getClient();
      if (!sb) return null;

      try {
        let query = sb.from('products')
          .select('id, item_name, current_stock, category_slug')
          .ilike('item_name', name.trim())
          .eq('branch_id', activeBranch);

        if (excludeId) query = query.neq('id', excludeId);
        const { data } = await query.limit(1);
        if (data && data.length > 0) {
          return { ...data[0], slug: data[0].category_slug };
        }
        return null;
      } catch (e) { return null; }
    },

    findProductByBarcode: async (barcode, excludeCategory = null, excludeId = null) => {
      if (!barcode) return null;
      const sb = getClient();
      if (!sb) return null;

      try {
        let query = sb.from('products')
          .select('*, companies(name)')
          .eq('barcode', String(barcode).trim())
          .eq('branch_id', activeBranch);

        if (excludeId) query = query.neq('id', excludeId);
        const { data } = await query.limit(1);
        if (data && data.length > 0) {
          const item = data[0];
          return {
            ...item,
            slug: item.category_slug,
            company_name: item.companies?.name || ''
          };
        }
        return null;
      } catch (e) { return null; }
    },

    addProduct: async (category, data) => {
      const sb = getClient();
      if (!sb) return { error: 'Database not connected' };

      try {
        const payload = {
          category_slug: category,
          item_name: (data.item_name || data.description || '').trim(),
          description: data.description || '',
          current_stock: Number(data.current_stock || 0),
          unit: data.unit || 'pcs',
          cost_price: Number(data.cost_price || 0),
          retail_price: Number(data.retail_price || 0),
          wholesale_cost_price: Number(data.wholesale_cost_price || data.cost_price || 0),
          wholesale_price: Number(data.wholesale_price || data.retail_price || 0),
          company_id: data.company_id ? Number(data.company_id) : null,
          barcode: data.barcode ? String(data.barcode).trim() : null,
          pieces_per_carton: data.pieces_per_carton ? Number(data.pieces_per_carton) : 12,
          branch_id: activeBranch
        };

        const { data: inserted, error } = await sb.from('products').insert([payload]).select('id').single();
        if (error) throw error;
        return inserted.id;
      } catch (e) {
        console.error('addProduct error:', e);
        return { error: e.message };
      }
    },

    updateProduct: async (category, id, data) => {
      const sb = getClient();
      if (!sb) return { error: 'Database not connected' };

      try {
        const payload = { ...data };
        delete payload.id;
        delete payload.slug;
        delete payload.company_name;
        delete payload.is_favorite;

        const { error } = await sb.from('products').update(payload).or(`id.eq.${id},legacy_id.eq.${id}`);
        if (error) throw error;
        return { success: true };
      } catch (e) {
        return { error: e.message };
      }
    },

    changeProductCategory: async (oldCategory, newCategory, id, data) => {
      const sb = getClient();
      if (!sb) return { error: 'No connection' };
      const { error } = await sb.from('products')
        .update({ ...data, category_slug: newCategory })
        .or(`id.eq.${id},legacy_id.eq.${id}`);
      return { success: !error };
    },

    deleteProduct: async (category, id) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('products').delete().or(`id.eq.${id},legacy_id.eq.${id}`);
      return { success: !error };
    },

    addProductStock: async (data) => {
      const sb = getClient();
      if (!sb) return { error: 'No connection' };

      const {
        category,
        productId,
        addedQty = 0,
        purchasePrice = 0,
        retailPrice = null,
        wholesalePrice = null,
        source = 'Manual Stock Add',
        notes = ''
      } = data;

      try {
        const { data: current } = await sb.from('products')
          .select('*')
          .or(`id.eq.${productId},legacy_id.eq.${productId}`)
          .single();

        if (!current) throw new Error('Product not found');

        const oldStock = Number(current.current_stock) || 0;
        const oldCost = Number(current.cost_price) || 0;
        const inQty = Number(addedQty) || 0;
        const inPrice = Number(purchasePrice) || 0;

        // Direct cost price update (latest purchase price)
        const newCost = (inPrice > 0) ? inPrice : oldCost;
        const newStock = Math.round((Math.max(0, oldStock) + inQty) * 100) / 100;
        const newRetail = (retailPrice !== null && retailPrice !== undefined && retailPrice !== '') ? Number(retailPrice) : (current.retail_price || 0);
        const newWholesale = (wholesalePrice !== null && wholesalePrice !== undefined && wholesalePrice !== '') ? Number(wholesalePrice) : (current.wholesale_price || current.retail_price || 0);

        await sb.from('products').update({
          current_stock: newStock,
          cost_price: newCost,
          wholesale_cost_price: newCost,
          retail_price: newRetail,
          wholesale_price: newWholesale
        }).eq('id', current.id);

        await sb.from('product_rate_history').insert([{
          category_slug: category,
          product_id: current.id,
          item_name: current.item_name || 'Product #' + productId,
          old_stock: oldStock,
          added_qty: inQty,
          new_stock: newStock,
          old_cost_price: oldCost,
          purchase_price: inPrice,
          new_cost_price: newCost,
          retail_price: newRetail,
          wholesale_price: newWholesale,
          source,
          notes,
          branch_id: activeBranch
        }]);

        return { success: true };
      } catch (err) {
        console.error('addProductStock error:', err);
        return { error: err.message };
      }
    },

    getRateHistory: async (category, productId) => {
      const sb = getClient();
      if (!sb) return [];
      const { data } = await sb.from('product_rate_history')
        .select('*')
        .eq('product_id', productId)
        .order('id', { ascending: false });
      return data || [];
    },

    deleteRateHistory: async (id) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('product_rate_history').delete().eq('id', id);
      return { success: !error };
    },

    getAllRatesList: async () => {
      const sb = getClient();
      if (!sb) return [];
      const { data } = await sb.from('product_rate_history')
        .select('*')
        .order('id', { ascending: false })
        .limit(300);
      return data || [];
    },

    // Favorites
    toggleFavorite: async (category, id) => {
      const sb = getClient();
      if (!sb) return { status: 'removed' };
      const { data: existing } = await sb.from('favorites')
        .select('id')
        .eq('category_slug', category)
        .eq('product_id', id)
        .eq('branch_id', activeBranch)
        .single();

      if (existing) {
        await sb.from('favorites').delete().eq('id', existing.id);
        return { status: 'removed' };
      } else {
        await sb.from('favorites').insert([{ category_slug: category, product_id: id, branch_id: activeBranch }]);
        return { status: 'added' };
      }
    },

    getFavoriteProducts: async () => {
      const sb = getClient();
      if (!sb) return [];
      try {
        const { data: favs } = await sb.from('favorites').select('category_slug, product_id').eq('branch_id', activeBranch);
        if (!favs || favs.length === 0) return [];

        const prodIds = favs.map(f => f.product_id);
        const { data: prods } = await sb.from('products').select('*').in('id', prodIds);
        return (prods || []).map(p => ({ ...p, is_favorite: true, slug: p.category_slug }));
      } catch (e) { return []; }
    },

    // Proposals (Sales Invoices)
    getProposals: async () => {
      const sb = getClient();
      if (!sb) return [];
      try {
        const { data: props, error } = await sb.from('proposals')
          .select('*, proposal_items(*)')
          .eq('branch_id', activeBranch)
          .order('id', { ascending: false });

        if (error || !props) return [];
        return props.map(p => ({
          ...p,
          items: p.proposal_items || []
        }));
      } catch (e) {
        console.error('getProposals error:', e);
        return [];
      }
    },

    getProposal: async (id) => {
      const sb = getClient();
      if (!sb) return null;
      try {
        const { data, error } = await sb.from('proposals')
          .select('*, proposal_items(*)')
          .eq('id', id)
          .single();

        if (error || !data) return null;
        return { ...data, items: data.proposal_items || [] };
      } catch (e) { return null; }
    },

    getAllProposalItems: async () => {
      const sb = getClient();
      if (!sb) return [];
      const { data } = await sb.from('proposal_items').select('*').order('id', { ascending: false }).limit(500);
      return data || [];
    },

    getNextProposalNumber: async () => {
      const sb = getClient();
      if (!sb) return 'INV-1001';
      try {
        const { data } = await sb.from('proposals').select('id, proposal_number').order('id', { ascending: false }).limit(1);
        if (!data || data.length === 0) return 'INV-1001';
        const lastNum = data[0].proposal_number;
        const match = String(lastNum).match(/(\d+)$/);
        const nextVal = match ? (parseInt(match[1]) + 1) : (data[0].id + 1001);
        return `INV-${nextVal}`;
      } catch (e) { return 'INV-1001'; }
    },

    getNextCustomerName: async () => {
      const sb = getClient();
      if (!sb) return 'Customer-1';
      try {
        const { data } = await sb.from('customers').select('id').order('id', { ascending: false }).limit(1);
        const nextId = (data && data.length > 0) ? (data[0].id + 1) : 1;
        return `Customer-${nextId}`;
      } catch (e) { return 'Customer-1'; }
    },

    saveProposal: async (data) => {
      const sb = getClient();
      if (!sb) return { error: 'Database not connected' };

      const { items, ...proposalData } = data;
      proposalData.branch_id = activeBranch;

      try {
        let proposalId = proposalData.id;

        if (proposalId) {
          // Restore previous items to stock before editing
          const { data: oldItems } = await sb.from('proposal_items').select('*').eq('proposal_id', proposalId);
          if (oldItems && oldItems.length > 0) {
            for (const oldIt of oldItems) {
              if (oldIt.item_id) {
                const { data: curProd } = await sb.from('products').select('current_stock').eq('id', oldIt.item_id).single();
                if (curProd) {
                  await sb.from('products').update({
                    current_stock: Math.round(((curProd.current_stock || 0) + Number(oldIt.qty || 0)) * 100) / 100
                  }).eq('id', oldIt.item_id);
                }
              }
            }
          }

          // Update proposal record & clear old line items
          await sb.from('proposals').update(proposalData).eq('id', proposalId);
          await sb.from('proposal_items').delete().eq('proposal_id', proposalId);
        } else {
          // Insert new proposal
          if (!proposalData.proposal_number) {
            proposalData.proposal_number = await window.api.getNextProposalNumber();
          }
          if (!proposalData.date) {
            proposalData.date = getLocalDateStr();
          }
          const { data: inserted, error: propErr } = await sb.from('proposals').insert([proposalData]).select('id').single();
          if (propErr) throw propErr;
          proposalId = inserted.id;
        }

        // Insert new line items & deduct stock
        if (items && items.length > 0) {
          const lineItemsPayload = items.map(it => ({
            proposal_id: proposalId,
            item_id: it.item_id || null,
            section: it.section || '',
            description: it.description || '',
            qty: Number(it.qty || 0),
            unit: it.unit || 'pcs',
            unit_cost: Number(it.unit_cost || 0),
            unit_retail: Number(it.unit_retail || 0),
            unit_discounted: Number(it.unit_discounted !== undefined ? it.unit_discounted : it.unit_retail),
            line_cost: Number(it.line_cost || 0),
            line_retail: Number(it.line_retail || 0),
            line_profit: Number(it.line_profit || 0)
          }));

          await sb.from('proposal_items').insert(lineItemsPayload);

          // Deduct stock for each sold item
          for (const it of items) {
            if (it.item_id) {
              const { data: curProd } = await sb.from('products').select('current_stock').eq('id', it.item_id).single();
              if (curProd) {
                const updatedStock = Math.max(0, Math.round(((curProd.current_stock || 0) - Number(it.qty || 0)) * 100) / 100);
                await sb.from('products').update({ current_stock: updatedStock }).eq('id', it.item_id);
              }
            }
          }
        }

        return proposalId;
      } catch (err) {
        console.error('saveProposal error:', err);
        return { error: err.message };
      }
    },

    deleteProposal: async (id) => {
      const sb = getClient();
      if (!sb) return { success: false };

      try {
        // Restore stock
        const { data: items } = await sb.from('proposal_items').select('*').eq('proposal_id', id);
        if (items && items.length > 0) {
          for (const it of items) {
            if (it.item_id) {
              const { data: curProd } = await sb.from('products').select('current_stock').eq('id', it.item_id).single();
              if (curProd) {
                await sb.from('products').update({
                  current_stock: Math.round(((curProd.current_stock || 0) + Number(it.qty || 0)) * 100) / 100
                }).eq('id', it.item_id);
              }
            }
          }
        }

        await sb.from('proposals').delete().eq('id', id);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    updateProposalStatus: async (id, status) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('proposals').update({ status }).eq('id', id);
      return { success: !error };
    },

    receivePayment: async (idOrNumber, addedAmount, paymentMethod = 'Cash') => {
      const sb = getClient();
      if (!sb) return null;

      try {
        let query = sb.from('proposals').select('id, proposal_number, retail_total, received_amount');
        if (typeof idOrNumber === 'number' || /^\d+$/.test(idOrNumber)) {
          query = query.eq('id', Number(idOrNumber));
        } else {
          query = query.eq('proposal_number', String(idOrNumber).replace(/^#/, ''));
        }
        const { data: p } = await query.single();
        if (!p) return null;

        const newReceived = (Number(p.received_amount) || 0) + Number(addedAmount || 0);
        const status = newReceived >= (Number(p.retail_total) || 0) ? 'Paid' : 'Partial';

        await sb.from('proposals').update({
          received_amount: newReceived,
          status,
          payment_method: paymentMethod
        }).eq('id', p.id);

        return { newReceived, status, id: p.id, proposalNumber: p.proposal_number };
      } catch (e) { return null; }
    },

    markProposalPaid: async (idOrNumber) => {
      const sb = getClient();
      if (!sb) return { success: false };
      try {
        let query = sb.from('proposals').select('id, retail_total');
        if (typeof idOrNumber === 'number' || /^\d+$/.test(idOrNumber)) {
          query = query.eq('id', Number(idOrNumber));
        } else {
          query = query.eq('proposal_number', String(idOrNumber).replace(/^#/, ''));
        }
        const { data: p } = await query.single();
        if (!p) return { success: false };

        await sb.from('proposals').update({
          received_amount: p.retail_total,
          status: 'Paid'
        }).eq('id', p.id);
        return { success: true };
      } catch (e) { return { success: false }; }
    },

    // Expenses
    getExpenses: async (filters) => {
      const sb = getClient();
      if (!sb) return [];
      try {
        let query = sb.from('expenses').select('*').eq('branch_id', activeBranch);
        if (filters && filters.month !== undefined && filters.year !== undefined) {
          const monthStr = String(filters.month + 1).padStart(2, '0');
          query = query.ilike('date', `${filters.year}-${monthStr}-%`);
        }
        query = query.order('date', { ascending: false });
        const { data } = await query;
        return data || [];
      } catch (e) { return []; }
    },

    saveExpense: async (data) => {
      const sb = getClient();
      if (!sb) return { error: 'No connection' };
      data.branch_id = activeBranch;
      if (data.id) {
        const { id, ...updates } = data;
        const { error } = await sb.from('expenses').update(updates).eq('id', id);
        return { success: !error };
      } else {
        const { error } = await sb.from('expenses').insert([data]);
        return { success: !error };
      }
    },

    deleteExpense: async (id) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('expenses').delete().eq('id', id);
      return { success: !error };
    },

    getExpensesSummary: async () => {
      const expenses = await window.api.getExpenses();
      let total = 0;
      const byCat = {};
      expenses.forEach(e => {
        const amt = Number(e.amount) || 0;
        total += amt;
        byCat[e.category] = (byCat[e.category] || 0) + amt;
      });
      return { total, byCat };
    },

    getExpenseCategories: async () => {
      const defaultCats = [{ name: 'Office' }, { name: 'Transport' }, { name: 'Utilities' }, { name: 'Salaries' }, { name: 'Purchase' }, { name: 'Other' }];
      const sb = getClient();
      if (!sb) return defaultCats;
      const { data } = await sb.from('expense_categories').select('*').order('name', { ascending: true });
      return data || defaultCats;
    },

    addExpenseCategory: async (name) => {
      const sb = getClient();
      if (!sb) return { error: 'No connection' };
      const { data, error } = await sb.from('expense_categories').insert([{ name }]).select('id').single();
      return error ? { error: error.message } : data.id;
    },

    deleteExpenseCategory: async (id) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('expense_categories').delete().eq('id', id);
      return { success: !error };
    },

    // Employees
    getEmployees: async (status) => {
      const sb = getClient();
      if (!sb) return [];
      let query = sb.from('employees').select('*').eq('branch_id', activeBranch);
      if (status && status !== 'All') query = query.eq('status', status);
      query = query.order('id', { ascending: false });
      const { data } = await query;
      return data || [];
    },

    saveEmployee: async (data) => {
      const sb = getClient();
      if (!sb) return { error: 'No connection' };
      data.branch_id = activeBranch;
      if (data.id) {
        const { id, ...updates } = data;
        const { error } = await sb.from('employees').update(updates).eq('id', id);
        return { success: !error };
      } else {
        const { data: inserted, error } = await sb.from('employees').insert([data]).select('id').single();
        return error ? { error: error.message } : inserted.id;
      }
    },

    deleteEmployee: async (id) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('employees').delete().eq('id', id);
      return { success: !error };
    },

    // Companies & Customers
    getCompanies: async () => {
      const sb = getClient();
      if (!sb) return [];
      const { data } = await sb.from('companies').select('*').eq('branch_id', activeBranch).order('name', { ascending: true });
      return data || [];
    },

    saveCompany: async (data) => {
      const sb = getClient();
      if (!sb) return { error: 'No connection' };
      data.branch_id = activeBranch;
      if (data.id) {
        const { id, ...updates } = data;
        const { error } = await sb.from('companies').update(updates).eq('id', id);
        return error ? { error: error.message } : id;
      } else {
        const { data: inserted, error } = await sb.from('companies').insert([data]).select('id').single();
        return error ? { error: error.message } : inserted.id;
      }
    },

    deleteCompany: async (id) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('companies').delete().eq('id', id);
      return { success: !error };
    },

    getCustomers: async () => {
      const sb = getClient();
      if (!sb) return [];
      const { data } = await sb.from('customers').select('*').eq('branch_id', activeBranch).order('name', { ascending: true });
      return data || [];
    },

    saveCustomer: async (data) => {
      const sb = getClient();
      if (!sb) return { error: 'No connection' };
      data.branch_id = activeBranch;
      if (data.id) {
        const { id, ...updates } = data;
        const { error } = await sb.from('customers').update(updates).eq('id', id);
        return error ? { error: error.message } : id;
      } else {
        const { data: inserted, error } = await sb.from('customers').insert([data]).select('id').single();
        return error ? { error: error.message } : inserted.id;
      }
    },

    deleteCustomer: async (id) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('customers').delete().eq('id', id);
      return { success: !error };
    },

    getShops: async () => {
      const sb = getClient();
      if (!sb) return [];
      const { data } = await sb.from('shops').select('*').eq('branch_id', activeBranch).order('name', { ascending: true });
      return data || [];
    },

    getShop: async (id) => {
      const sb = getClient();
      if (!sb) return null;
      const { data } = await sb.from('shops').select('*').eq('id', id).single();
      return data || null;
    },

    saveShop: async (data) => {
      const sb = getClient();
      if (!sb) return { error: 'No connection' };
      data.branch_id = activeBranch;
      if (data.id) {
        const { id, ...updates } = data;
        const { error } = await sb.from('shops').update(updates).eq('id', id);
        return { success: !error };
      } else {
        const { data: inserted, error } = await sb.from('shops').insert([data]).select('id').single();
        return error ? { error: error.message } : inserted.id;
      }
    },

    deleteShop: async (id) => {
      const sb = getClient();
      if (!sb) return { success: false };
      const { error } = await sb.from('shops').delete().eq('id', id);
      return { success: !error };
    },

    // Dashboard & Reports
    getDashboardStats: async (filter = 'daily') => {
      const sb = getClient();
      if (!sb) {
        return {
          grossSales: 0,
          grossProfit: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalInvoices: 0,
          customerDue: 0,
          topSold: [],
          lowStock: 0
        };
      }

      try {
        const todayStr = getLocalDateStr();
        let propQuery = sb.from('proposals').select('retail_total, cost_total, profit, date, status').eq('branch_id', activeBranch);
        let expQuery = sb.from('expenses').select('amount, date').eq('branch_id', activeBranch);

        const period = typeof filter === 'string' ? filter : (filter.period || 'daily');
        if (period === 'daily') {
          const target = (typeof filter === 'object' && filter.targetDate) ? filter.targetDate : todayStr;
          propQuery = propQuery.eq('date', target);
          expQuery = expQuery.ilike('date', `${target}%`);
        } else if (period === 'monthly') {
          const monthPrefix = todayStr.substring(0, 7);
          propQuery = propQuery.ilike('date', `${monthPrefix}%`);
          expQuery = expQuery.ilike('date', `${monthPrefix}%`);
        } else if (period === 'annual') {
          const yearPrefix = todayStr.substring(0, 4);
          propQuery = propQuery.ilike('date', `${yearPrefix}%`);
          expQuery = expQuery.ilike('date', `${yearPrefix}%`);
        }

        const [{ data: props }, { data: exps }, { data: custs }, { data: lowStockProds }] = await Promise.all([
          propQuery,
          expQuery,
          sb.from('customers').select('amount').eq('branch_id', activeBranch),
          sb.from('products').select('id').eq('branch_id', activeBranch).lte('current_stock', 5)
        ]);

        let grossSales = 0, grossCost = 0, grossProfit = 0, totalInvoices = 0;
        (props || []).forEach(p => {
          grossSales += Number(p.retail_total) || 0;
          grossCost += Number(p.cost_total) || 0;
          grossProfit += Number(p.profit) || 0;
          totalInvoices++;
        });

        let totalExpenses = 0;
        (exps || []).forEach(e => {
          totalExpenses += Number(e.amount) || 0;
        });

        let customerDue = 0;
        (custs || []).forEach(c => {
          customerDue += Math.max(0, Number(c.amount) || 0);
        });

        // Top Sold Items
        const { data: topItems } = await sb.from('proposal_items')
          .select('description, qty, line_retail')
          .order('id', { ascending: false })
          .limit(100);

        const itemTotals = {};
        (topItems || []).forEach(it => {
          const name = it.description || 'Unknown';
          if (!itemTotals[name]) itemTotals[name] = { name, count: 0, total: 0 };
          itemTotals[name].count += Number(it.qty) || 0;
          itemTotals[name].total += Number(it.line_retail) || 0;
        });

        const topSold = Object.values(itemTotals).sort((a, b) => b.total - a.total).slice(0, 5);

        return {
          grossSales: Math.round(grossSales),
          grossProfit: Math.round(grossProfit),
          totalExpenses: Math.round(totalExpenses),
          netProfit: Math.round(grossProfit - totalExpenses),
          totalInvoices,
          customerDue: Math.round(customerDue),
          topSold,
          lowStock: (lowStockProds || []).length
        };
      } catch (err) {
        console.error('getDashboardStats error:', err);
        return {
          grossSales: 0, grossProfit: 0, totalExpenses: 0, netProfit: 0,
          totalInvoices: 0, customerDue: 0, topSold: [], lowStock: 0
        };
      }
    },

    getItemSales: async (section, period, targetDate) => {
      const sb = getClient();
      if (!sb) return [];
      try {
        let query = sb.from('proposal_items').select('description, qty, unit, line_retail');
        if (section && section !== 'all') query = query.eq('section', section);
        const { data } = await query.order('id', { ascending: false }).limit(200);
        return data || [];
      } catch (e) { return []; }
    },

    getReportSummary: async (filters = {}) => {
      return window.api.getDashboardStats(filters);
    },

    // Key-Value Store
    getAllKv: async () => {
      const sb = getClient();
      if (!sb) {
        return window.localStorage ? { ...window.localStorage } : {};
      }
      try {
        const { data } = await sb.from('app_kv_store').select('key, value');
        const kv = {};
        (data || []).forEach(r => { kv[r.key] = r.value; });
        return kv;
      } catch (e) { return {}; }
    },

    setKv: async (key, value) => {
      if (window.localStorage) {
        window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
      const sb = getClient();
      if (!sb) return { success: true };
      const valStr = typeof value === 'string' ? value : JSON.stringify(value);
      await sb.from('app_kv_store').upsert([{ key, value: valStr, branch_id: activeBranch, updated_at: new Date().toISOString() }]);
      return { success: true };
    },

    saveAllKv: async (data) => {
      const sb = getClient();
      if (!sb) return { success: true };
      const entries = Object.entries(data).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
        branch_id: activeBranch,
        updated_at: new Date().toISOString()
      }));
      await sb.from('app_kv_store').upsert(entries);
      return { success: true };
    },

    // Thermal Printing & Documents in Web Browser
    printReceipt: async (options = {}) => {
      console.log('[PRINT] Triggering browser print dialog for receipt...');
      try {
        window.print();
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    printBarcodeStickers: async (options = {}) => {
      console.log('[PRINT] Triggering barcode sticker print...');
      try {
        window.print();
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    generatePDF: async (filename) => {
      window.print();
      return { success: true };
    },

    getPrinters: async () => {
      return [];
    },

    // Cloud Backup & Restore
    backupData: async () => {
      const sb = getClient();
      if (!sb) return { success: false, error: 'Database not connected' };

      try {
        const [
          { data: products },
          { data: proposals },
          { data: items },
          { data: customers },
          { data: companies },
          { data: expenses },
          { data: settings }
        ] = await Promise.all([
          sb.from('products').select('*'),
          sb.from('proposals').select('*'),
          sb.from('proposal_items').select('*'),
          sb.from('customers').select('*'),
          sb.from('companies').select('*'),
          sb.from('expenses').select('*'),
          sb.from('settings').select('*')
        ]);

        const backupPayload = {
          version: '1.0',
          appName: 'Al-Baari Modest Attire',
          exportedAt: new Date().toISOString(),
          branch: activeBranch,
          data: {
            products: products || [],
            proposals: proposals || [],
            proposal_items: items || [],
            customers: customers || [],
            companies: companies || [],
            expenses: expenses || [],
            settings: settings || []
          }
        };

        const jsonStr = JSON.stringify(backupPayload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AlBaariModestAttire-CloudBackup-${getLocalDateStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    restoreData: async () => {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e) => {
          const file = e.target.files[0];
          if (!file) return resolve({ success: false, error: 'No file selected' });
          try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const sb = getClient();
            if (!sb) throw new Error('Database not connected');

            if (parsed.data) {
              if (parsed.data.customers) await sb.from('customers').upsert(parsed.data.customers);
              if (parsed.data.companies) await sb.from('companies').upsert(parsed.data.companies);
              if (parsed.data.products) await sb.from('products').upsert(parsed.data.products);
              if (parsed.data.proposals) await sb.from('proposals').upsert(parsed.data.proposals);
              if (parsed.data.proposal_items) await sb.from('proposal_items').upsert(parsed.data.proposal_items);
              if (parsed.data.expenses) await sb.from('expenses').upsert(parsed.data.expenses);
              if (parsed.data.settings) await sb.from('settings').upsert(parsed.data.settings);
            }
            alert('Cloud Backup restored successfully!');
            window.location.reload();
            resolve({ success: true });
          } catch (err) {
            alert('Restore failed: ' + err.message);
            resolve({ success: false, error: err.message });
          }
        };
        input.click();
      });
    },

    clearAppData: async () => {
      const sb = getClient();
      if (!sb) return { success: false };
      try {
        await Promise.all([
          sb.from('proposal_items').delete().neq('id', 0),
          sb.from('proposals').delete().neq('id', 0),
          sb.from('expenses').delete().neq('id', 0),
          sb.from('product_rate_history').delete().neq('id', 0)
        ]);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    getBackupDirectory: async () => 'Supabase Cloud Storage',
    selectBackupDirectory: async () => ({ success: true, path: 'Supabase Cloud Storage' }),
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
