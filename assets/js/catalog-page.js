if (!firebase.apps.length) firebase.initializeApp(window.AliFirebaseConfig);
        const db = firebase.database();
        let catalogItems = [];
        let systemCategories = [];
        let fullData = {};
        let activeCategoryFilter = "";
        let isGridRendered = false;
        let currentViewMode = 'table';
        let catalogBaselineJSON = null;
        let catalogLocalDirty = false;
        let catalogSavePromise = null;
        let catalogSaveRequested = false;

        function stableCatalogJSON(value) {
            const normalize = v => Array.isArray(v) ? v.map(normalize) : (v && typeof v === 'object' ? Object.keys(v).sort().reduce((o,k) => (o[k]=normalize(v[k]),o), {}) : (v === undefined ? null : v));
            return JSON.stringify(normalize(value));
        }

        async function saveCatalogData() {
            if (catalogSavePromise) { catalogSaveRequested = true; return catalogSavePromise; }
            catalogLocalDirty = true;
            catalogSavePromise = (async () => {
                try {
                    let allSaved = true;
                    do {
                        catalogSaveRequested = false;
                        const expected = catalogBaselineJSON;
                        let conflict = false;
                        const result = await db.ref('ali_saber_system_data').transaction(current => {
                            const remote = current || {};
                            const remoteCatalog = stableCatalogJSON({ catalogItems: remote.catalogItems ?? null, systemCategories: remote.systemCategories ?? null });
                            if (expected !== null && remoteCatalog !== expected) { conflict = true; return; }
                            return { ...remote, catalogItems, systemCategories, lastUpdated: new Date().toISOString() };
                        }, undefined, false);
                        if (!result.committed) {
                            alert(conflict ? 'لم يتم الحفظ لأن الكتالوج تغير من جهاز آخر. أعد تحميل الصفحة ثم راجع التعديلات.' : 'لم يتم اعتماد الحفظ. تحقق من اتصال Firebase وصلاحيات قاعدة البيانات.');
                            allSaved = false; break;
                        }
                        const saved = result.snapshot.val() || {};
                        catalogBaselineJSON = stableCatalogJSON({ catalogItems: saved.catalogItems ?? null, systemCategories: saved.systemCategories ?? null });
                    } while (catalogSaveRequested);
                    catalogLocalDirty = !allSaved;
                    return allSaved;
                } catch (error) {
                    console.error('Catalog save failed:', error);
                    alert('تعذر حفظ الكتالوج: ' + (error?.message || 'خطأ غير معروف'));
                    return false;
                } finally { catalogSavePromise = null; }
            })();
            return catalogSavePromise;
        }

        function initTheme() {
            const savedTheme = localStorage.getItem('ali_theme') || 'dark';
            if (savedTheme === 'light') {
                document.documentElement.classList.remove('dark');
                updateThemeUI('light');
            } else {
                document.documentElement.classList.add('dark');
                updateThemeUI('dark');
            }
        }

        function toggleTheme() {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('ali_theme', 'light');
                updateThemeUI('light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('ali_theme', 'dark');
                updateThemeUI('dark');
            }
        }

        function updateThemeUI(theme) {
            const textEl = document.getElementById('theme-text');
            if (textEl) textEl.innerText = theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري';
        }

        function setViewMode(mode) {
            currentViewMode = mode;
            const gridBtn = document.getElementById('view-mode-grid-btn');
            const tableBtn = document.getElementById('view-mode-table-btn');

            if (mode === 'grid') {
                gridBtn.className = "p-2 rounded-lg text-xs font-bold transition bg-blue-600 text-white shadow-sm flex items-center gap-1";
                tableBtn.className = "p-2 rounded-lg text-xs font-bold transition text-slate-600 dark:text-slate-400 hover:text-white flex items-center gap-1";
            } else {
                tableBtn.className = "p-2 rounded-lg text-xs font-bold transition bg-blue-600 text-white shadow-sm flex items-center gap-1";
                gridBtn.className = "p-2 rounded-lg text-xs font-bold transition text-slate-600 dark:text-slate-400 hover:text-white flex items-center gap-1";
            }

            if (isGridRendered) {
                renderCatalogList();
            }
        }

        db.ref('.info/connected').on('value', snapshot => {
            const connected = snapshot.val() === true;
            const statusText = document.getElementById('sync-status-text');
            if (statusText) statusText.innerText = connected ? 'الاتصال السحابي نشط' : 'الاتصال السحابي غير متاح';
        });

        db.ref('ali_saber_system_data').on('value', (snapshot) => {
            const incoming = snapshot.val() || {};
            const incomingJSON = stableCatalogJSON({ catalogItems: incoming.catalogItems ?? null, systemCategories: incoming.systemCategories ?? null });
            const localJSON = stableCatalogJSON({ catalogItems, systemCategories });
            if (catalogLocalDirty && catalogBaselineJSON !== null && incomingJSON !== catalogBaselineJSON && incomingJSON !== localJSON) {
                const statusText = document.getElementById('sync-status-text');
                if (statusText) statusText.innerText = 'تعارض تعديل من جهاز آخر — أعد تحميل الصفحة للمراجعة';
                return;
            }
            fullData = incoming;
            catalogBaselineJSON = incomingJSON;
            if (catalogLocalDirty && incomingJSON === localJSON) catalogLocalDirty = false;
            if (!catalogLocalDirty) catalogItems = Array.isArray(fullData.catalogItems) ? fullData.catalogItems : [];
            
            const rawCategories = fullData.systemCategories || ["الشاشات والاكسسوارات", "أجهزة الكمبيوتر", "الشبكات والراوترات", "الصيانة والقطع"];
            if (!catalogLocalDirty) systemCategories = rawCategories.map((c, idx) => {
                if (typeof c === 'string') {
                    return { name: c, order: idx + 1 };
                }
                return { name: c.name, order: c.order ?? (idx + 1) };
            }).sort((a, b) => a.order - b.order);

            const pill = document.getElementById('sync-status-pill');
            const dot = document.getElementById('sync-status-dot');
            const statusText = document.getElementById('sync-status-text');

            if (pill && dot && statusText) {
                pill.className = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5";
                dot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
                statusText.innerText = "متزامن سحابياً";
            }

            updateDashboardStats();
            populateCategorySelectOptions();
            renderCategoryFilterOptions();

            if (isGridRendered) {
                renderCatalogList();
            }
        });

        function updateDashboardStats() {
            document.getElementById('stat-total-items').innerText = `${catalogItems.length} صنف`;
            document.getElementById('stat-total-categories').innerText = `${systemCategories.length} قسم`;

            let totalCostValue = 0;
            let totalSellValue = 0;
            let totalProfitValue = 0;

            catalogItems.forEach(item => {
                const stock = parseInt(item.stockQuantity ?? 10);
                const costPrice = parseFloat(item.costPrice ?? 0);
                const sellPrice = parseFloat(item.price ?? 0);

                totalCostValue += (stock * costPrice);
                totalSellValue += (stock * sellPrice);
                totalProfitValue += (stock * (sellPrice - costPrice));
            });

            document.getElementById('stat-cost-value').innerText = `${totalCostValue.toLocaleString()} ج`;
            document.getElementById('stat-sell-value').innerText = `${totalSellValue.toLocaleString()} ج`;
            document.getElementById('stat-profit-value').innerText = `${totalProfitValue.toLocaleString()} ج`;
        }

        // 📂 نافذة فلترة وبحث الأقسام المنبثقة
        function openCategoryFilterModal() {
            document.getElementById('category-filter-modal').classList.remove('hidden');
            document.getElementById('category-search-input').value = '';
            renderCategoryFilterOptions('');
            setTimeout(() => document.getElementById('category-search-input').focus(), 100);
        }

        function closeCategoryFilterModal() {
            document.getElementById('category-filter-modal').classList.add('hidden');
        }

        function renderCategoryFilterOptions(searchQuery = '') {
            const listContainer = document.getElementById('category-filter-options-list');
            if (!listContainer) return;

            const q = searchQuery.toLowerCase().trim();
            const filteredCategories = systemCategories.filter(c => c.name.toLowerCase().includes(q));

            let html = `
                <div onclick="selectCategoryFilter('')" class="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${activeCategoryFilter === '' ? 'bg-blue-600 text-white font-black' : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'}">
                    <span class="text-xs">📂 كل الأقسام</span>
                    <span class="text-[10px] opacity-80 font-mono">(${catalogItems.length} صنف)</span>
                </div>
            `;

            html += filteredCategories.map(c => {
                const count = catalogItems.filter(i => i.category === c.name).length;
                const isSelected = activeCategoryFilter === c.name;
                return `
                    <div onclick="selectCategoryFilter('${c.name}')" class="flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition ${isSelected ? 'bg-blue-600 text-white font-black' : 'bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'}">
                        <span class="text-xs">📂 ${c.name}</span>
                        <span class="text-[10px] opacity-80 font-mono">(${count} صنف)</span>
                    </div>
                `;
            }).join('');

            if (filteredCategories.length === 0) {
                html = `<div class="p-4 text-center text-xs text-slate-400">لا توجد أقسام مطابقة للبحث</div>`;
            }

            listContainer.innerHTML = html;
        }

        function selectCategoryFilter(catName) {
            activeCategoryFilter = catName;
            
            // إظهار/إخفاء نقطة تمييز الفلتر النشط
            const indicator = document.getElementById('filter-active-indicator');
            if (indicator) {
                if (catName) indicator.classList.remove('hidden');
                else indicator.classList.add('hidden');
            }

            closeCategoryFilterModal();

            if (catName || document.getElementById('search-box').value.trim()) {
                forceRenderCatalogGrid();
            } else {
                hideCatalogGrid();
            }
        }

        function populateCategorySelectOptions() {
            const select = document.getElementById('new-item-category-select');
            const editSelect = document.getElementById('edit-item-category-select');
            const opts = systemCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
            if (select) select.innerHTML = opts;
            if (editSelect) editSelect.innerHTML = opts;
        }

        function handleSearchInput() {
            const searchVal = document.getElementById('search-box').value.trim();
            if (searchVal !== "" || activeCategoryFilter !== "") {
                forceRenderCatalogGrid();
            } else {
                hideCatalogGrid();
            }
        }

        function forceRenderCatalogGrid() {
            isGridRendered = true;
            document.getElementById('lazy-render-container').classList.add('hidden');
            document.getElementById('catalog-results-container').classList.remove('hidden');
            renderCatalogList();
        }

        function hideCatalogGrid() {
            isGridRendered = false;
            document.getElementById('lazy-render-container').classList.remove('hidden');
            document.getElementById('catalog-results-container').classList.add('hidden');
        }

        function convertImageToBase64(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('new-item-image-url').value = evt.target.result;
            };
            reader.readAsDataURL(file);
        }

        function openAddItemModal() {
            document.getElementById('add-item-modal').classList.remove('hidden');
        }

        function closeAddItemModal() {
            document.getElementById('add-item-modal').classList.add('hidden');
        }

        function openEditItemModal(idx) {
            const item = catalogItems[idx];
            if (!item) return;

            document.getElementById('edit-item-index').value = idx;
            document.getElementById('edit-item-name').value = item.name || '';
            document.getElementById('edit-item-code').value = item.code || '';
            document.getElementById('edit-item-cost').value = item.costPrice || 0;
            document.getElementById('edit-item-price').value = item.price || 0;
            document.getElementById('edit-item-stock').value = item.stockQuantity ?? 10;
            document.getElementById('edit-item-min-stock').value = item.minStockAlert ?? 3;
            document.getElementById('edit-item-image-url').value = item.image || '';

            populateCategorySelectOptions();
            const editSelect = document.getElementById('edit-item-category-select');
            if (editSelect) editSelect.value = item.category || (systemCategories[0] ? systemCategories[0].name : '');

            document.getElementById('edit-item-modal').classList.remove('hidden');
        }

        function closeEditItemModal() {
            document.getElementById('edit-item-modal').classList.add('hidden');
        }

        function handleSaveEditedItem(e) {
            e.preventDefault();
            const idx = parseInt(document.getElementById('edit-item-index').value);
            if (isNaN(idx) || !catalogItems[idx]) return;

            catalogItems[idx].name = document.getElementById('edit-item-name').value.trim();
            catalogItems[idx].code = document.getElementById('edit-item-code').value.trim();
            catalogItems[idx].category = document.getElementById('edit-item-category-select').value;
            catalogItems[idx].costPrice = parseFloat(document.getElementById('edit-item-cost').value) || 0;
            catalogItems[idx].price = parseFloat(document.getElementById('edit-item-price').value) || 0;
            catalogItems[idx].stockQuantity = parseInt(document.getElementById('edit-item-stock').value) || 0;
            catalogItems[idx].minStockAlert = parseInt(document.getElementById('edit-item-min-stock').value) || 3;
            catalogItems[idx].image = document.getElementById('edit-item-image-url').value.trim();

            fullData.catalogItems = catalogItems;
            saveCatalogData().then(saved => {
                if (!saved) return;
                alert("✨ تم حفظ التعديلات بنجاح!");
                closeEditItemModal();
                updateDashboardStats();
                renderCatalogList();
            });
        }

        function openCategoryManagerModal() {
            renderModalCategoriesList();
            document.getElementById('category-manager-modal').classList.remove('hidden');
        }

        function closeCategoryManagerModal() {
            document.getElementById('category-manager-modal').classList.add('hidden');
        }

        function renderModalCategoriesList() {
            const list = document.getElementById('categories-modal-list');
            if (!list) return;

            list.innerHTML = systemCategories.map((cat, idx) => {
                const count = catalogItems.filter(i => i.category === cat.name).length;
                return `
                    <div class="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 gap-2">
                        <div class="flex items-center gap-2 flex-1">
                            <span class="text-[10px] text-slate-400 font-bold">ترتيب:</span>
                            <input type="number" value="${cat.order}" onchange="updateCategoryData(${idx}, 'order', this.value)" class="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-1.5 rounded-lg text-center text-xs font-black text-blue-600 outline-none">
                            <input type="text" value="${cat.name}" onchange="updateCategoryData(${idx}, 'name', this.value)" class="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold text-slate-900 dark:text-white outline-none">
                        </div>
                        <div class="flex items-center gap-2 shrink-0">
                            <span class="text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-lg">${count} صنف</span>
                            <button onclick="deleteCategory(${idx})" class="text-rose-500 font-bold text-[11px] hover:underline px-1">حذف</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function updateCategoryData(idx, field, val) {
            const oldName = systemCategories[idx].name;
            if (field === 'order') {
                systemCategories[idx].order = parseInt(val) || 1;
            } else if (field === 'name') {
                const newName = val.trim();
                if (newName) {
                    systemCategories[idx].name = newName;
                    catalogItems.forEach(i => {
                        if (i.category === oldName) i.category = newName;
                    });
                }
            }
            systemCategories.sort((a, b) => a.order - b.order);
            saveCategoriesAndSync();
        }

        function handleAddNewCategorySubmit() {
            const input = document.getElementById('new-category-name-input');
            const val = input ? input.value.trim() : "";
            if (!val) return;

            if (!systemCategories.some(c => c.name === val)) {
                systemCategories.push({ name: val, order: systemCategories.length + 1 });
                saveCategoriesAndSync();
                input.value = "";
            }
        }

        function deleteCategory(idx) {
            if (confirm("أكيد عايز تحذف القسم ده؟")) {
                systemCategories.splice(idx, 1);
                saveCategoriesAndSync();
            }
        }

        function saveCategoriesAndSync() {
            fullData.systemCategories = systemCategories;
            fullData.catalogItems = catalogItems;
            saveCatalogData().then(saved => {
                if (!saved) return;
                populateCategorySelectOptions();
                renderCategoryFilterOptions();
                renderModalCategoriesList();
                updateDashboardStats();
            });
        }

        function handleAddNewItem(e) {
            e.preventDefault();
            const newItem = {
                code: document.getElementById('new-item-code').value.trim() || `ITEM-${Date.now()}`,
                name: document.getElementById('new-item-name').value.trim(),
                costPrice: parseFloat(document.getElementById('new-item-cost').value) || 0,
                price: parseFloat(document.getElementById('new-item-price').value) || 0,
                category: document.getElementById('new-item-category-select').value,
                subCategory: "بدون",
                stockQuantity: parseInt(document.getElementById('new-item-stock').value) || 0,
                minStockAlert: parseInt(document.getElementById('new-item-min-stock').value) || 3,
                defaultQty: 1,
                image: document.getElementById('new-item-image-url').value.trim() || ""
            };

            catalogItems.push(newItem);
            fullData.catalogItems = catalogItems;

            saveCatalogData().then(saved => {
                if (!saved) return;
                alert("✨ تم حفظ الصنف بنجاح!");
                document.getElementById('add-item-form').reset();
                closeAddItemModal();
                forceRenderCatalogGrid();
            }).catch(err => alert("خطأ في الحفظ: " + err.message));
        }

        function updateItemField(idx, field, val) {
            if (field === 'price' || field === 'costPrice' || field === 'stockQuantity' || field === 'minStockAlert') {
                catalogItems[idx][field] = parseFloat(val) || 0;
            } else {
                catalogItems[idx][field] = val;
            }
            fullData.catalogItems = catalogItems;
            saveCatalogData();
            updateDashboardStats();
        }

        function deleteItem(idx) {
            if (confirm(`أكيد عايز تحذف الصنف (${catalogItems[idx].name})؟`)) {
                catalogItems.splice(idx, 1);
                fullData.catalogItems = catalogItems;
                saveCatalogData();
            }
        }

        function renderCatalogList() {
            const container = document.getElementById('catalog-results-container');
            const q = document.getElementById('search-box').value.toLowerCase().trim();

            const filtered = catalogItems.map((item, originalIndex) => ({ item, originalIndex })).filter(({ item }) => {
                const matchesSearch = item.name.toLowerCase().includes(q) || 
                                     (item.code && item.code.toLowerCase().includes(q)) || 
                                     (item.category && item.category.toLowerCase().includes(q));
                const matchesCategory = !activeCategoryFilter || item.category === activeCategoryFilter;
                return matchesSearch && matchesCategory;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div class="p-8 text-center text-xs text-slate-400 font-bold bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">لا يوجد أصناف مطابقة للقسم أو كلمة البحث.</div>`;
                return;
            }

            if (currentViewMode === 'grid') {
                container.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
                container.innerHTML = filtered.map(({ item, originalIndex: idx }) => {
                    const stock = parseInt(item.stockQuantity ?? 10);
                    const minStock = parseInt(item.minStockAlert ?? 3);
                    
                    let stockBadge = `<span class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black">متوفر (${stock})</span>`;
                    if (stock <= 0) {
                        stockBadge = `<span class="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black animate-pulse">⚠️ نافد من المخزن</span>`;
                    } else if (stock <= minStock) {
                        stockBadge = `<span class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black">⚠️ مخزون منخفض (${stock})</span>`;
                    }

                    const categoryOptions = systemCategories.map(c => `<option value="${c.name}" ${item.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('');

                    return `
                        <div class="bg-white dark:bg-slate-900 p-4 rounded-2xl border ${stock <= minStock ? 'border-amber-500/50' : 'border-slate-200 dark:border-slate-800'} space-y-3 relative shadow-sm flex flex-col justify-between">
                            <div class="space-y-2">
                                <div class="h-32 bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800 relative group">
                                    ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover" alt="${item.name}">` : `<span class="text-3xl text-slate-400">🖼️</span>`}
                                    <div class="absolute top-2 right-2">${stockBadge}</div>
                                </div>

                                <div class="space-y-1">
                                    <label class="text-[10px] text-slate-400 font-bold block">اسم الصنف:</label>
                                    <input type="text" value="${item.name}" onchange="updateItemField(${idx}, 'name', this.value)" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl font-black text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500">
                                </div>

                                <div class="space-y-1">
                                    <label class="text-[10px] text-blue-500 font-bold block">القسم الرئيسي:</label>
                                    <select onchange="updateItemField(${idx}, 'category', this.value)" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none">
                                        ${categoryOptions}
                                    </select>
                                </div>

                                <div class="grid grid-cols-2 gap-2 text-xs font-bold">
                                    <div>
                                        <label class="text-[10px] text-slate-400 block mb-1">الشراء (جملة):</label>
                                        <input type="number" value="${item.costPrice || 0}" onchange="updateItemField(${idx}, 'costPrice', this.value)" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-slate-700 dark:text-slate-300 font-black text-center outline-none">
                                    </div>
                                    <div>
                                        <label class="text-[10px] text-emerald-600 dark:text-emerald-400 block mb-1">البيع (قطاعي):</label>
                                        <input type="number" value="${item.price || 0}" onchange="updateItemField(${idx}, 'price', this.value)" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-emerald-600 dark:text-emerald-400 font-black text-center outline-none">
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-2 text-xs font-bold bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                                    <div>
                                        <label class="text-[10px] text-amber-600 dark:text-amber-400 block mb-1">المخزون الحالي:</label>
                                        <input type="number" value="${stock}" onchange="updateItemField(${idx}, 'stockQuantity', this.value)" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-1.5 rounded-lg text-slate-900 dark:text-white font-black text-center outline-none">
                                    </div>
                                    <div>
                                        <label class="text-[10px] text-rose-600 dark:text-rose-400 block mb-1">حد التنبيه:</label>
                                        <input type="number" value="${minStock}" onchange="updateItemField(${idx}, 'minStockAlert', this.value)" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-1.5 rounded-lg text-rose-600 dark:text-rose-400 font-black text-center outline-none">
                                    </div>
                                </div>
                            </div>

                            <div class="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs font-bold">
                                <span class="text-slate-400 font-mono text-[10px]">كود: ${item.code || 'بدون كود'}</span>
                                <div class="flex items-center gap-1.5">
                                    <button onclick="openEditItemModal(${idx})" title="تعديل تفاصيل المنتج" class="text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-bold flex items-center gap-1">
                                        <i data-lucide="edit" class="w-3.5 h-3.5"></i> تعديل
                                    </button>
                                    <button onclick="deleteItem(${idx})" title="حذف المنتج" class="text-rose-500 hover:text-rose-400 text-[11px] font-bold flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20">
                                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                container.className = "overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm";
                const rows = filtered.map(({ item, originalIndex: idx }) => {
                    const stock = parseInt(item.stockQuantity ?? 10);
                    const categoryOptions = systemCategories.map(c => `<option value="${c.name}" ${item.category === c.name ? 'selected' : ''}>${c.name}</option>`).join('');

                    return `
                        <tr class="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50 transition">
                            <td class="p-3 text-center">
                                <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-950 overflow-hidden border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto">
                                    ${item.image ? `<img src="${item.image}" class="w-full h-full object-cover" alt="${item.name}">` : `<span class="text-xs text-slate-400">🖼️</span>`}
                                </div>
                            </td>
                            <td class="p-3 text-xs font-mono text-slate-400 whitespace-nowrap">${item.code || 'بدون'}</td>
                            <td class="p-3 min-w-[200px]">
                                <input type="text" value="${item.name}" onchange="updateItemField(${idx}, 'name', this.value)" class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl font-black text-xs text-slate-900 dark:text-white w-full outline-none focus:border-blue-500">
                            </td>
                            <td class="p-3 min-w-[160px]">
                                <select onchange="updateItemField(${idx}, 'category', this.value)" class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 outline-none w-full">
                                    ${categoryOptions}
                                </select>
                            </td>
                            <td class="p-3 text-center">
                                <input type="number" value="${item.costPrice || 0}" onchange="updateItemField(${idx}, 'costPrice', this.value)" class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 w-24 text-center outline-none">
                            </td>
                            <td class="p-3 text-center">
                                <input type="number" value="${item.price || 0}" onchange="updateItemField(${idx}, 'price', this.value)" class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-black text-emerald-600 dark:text-emerald-400 w-24 text-center outline-none">
                            </td>
                            <td class="p-3 text-center">
                                <input type="number" value="${stock}" onchange="updateItemField(${idx}, 'stockQuantity', this.value)" class="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-black text-slate-900 dark:text-white w-20 text-center outline-none">
                            </td>
                            <td class="p-3 text-center">
                                <div class="flex items-center justify-center gap-1.5 whitespace-nowrap">
                                    <button onclick="openEditItemModal(${idx})" title="تعديل كامل البيانات" class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 p-2 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-amber-500 hover:text-white transition">
                                        <i data-lucide="edit" class="w-4 h-4"></i>
                                    </button>
                                    <button onclick="deleteItem(${idx})" title="حذف الصنف" class="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 p-2 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-rose-500 hover:text-white transition">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

                container.innerHTML = `
                    <table class="w-full text-right border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                                <th class="p-3 text-center">الصورة</th>
                                <th class="p-3">الكود</th>
                                <th class="p-3">اسم الصنف</th>
                                <th class="p-3">القسم</th>
                                <th class="p-3 text-center">الشراء (جملة)</th>
                                <th class="p-3 text-center">البيع (قطاعي)</th>
                                <th class="p-3 text-center">المخزون</th>
                                <th class="p-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                `;
            }

            lucide.createIcons();
        }

        function exportSystemBackup() {
            const backupData = {
                version: "3.0",
                exportDate: new Date().toISOString(),
                catalogItems: catalogItems,
                systemCategories: systemCategories,
                clientsList: fullData.clientsList || []
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `AliSaber_System_Catalog_Backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        }

        function importSystemBackup(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    if (Array.isArray(data.catalogItems)) {
                        catalogItems = data.catalogItems;
                        if (Array.isArray(data.systemCategories)) systemCategories = data.systemCategories;
                        fullData.catalogItems = catalogItems;
                        fullData.systemCategories = systemCategories;
                        saveCatalogData().then(saved => {
                            if (!saved) return;
                            updateDashboardStats();
                            populateCategorySelectOptions();
                            renderCategoryFilterOptions();
                            renderCatalogList();
                            alert("تم رفع بيانات الكتالوج والأقسام بنجاح!");
                        });
                    } else {
                        alert("ملف النسخة الاحتياطية لا يحتوي على كتالوج صالح.");
                    }
                } catch(err) {
                    alert("حصل خطأ أثناء قراءة الملف!");
                }
            };
            reader.readAsText(file);
        }

        document.addEventListener('DOMContentLoaded', async () => {
            const allowed = await AuthModule.requireAccess();
            if (!allowed) return;
            initTheme();
            lucide.createIcons();
            const banner = document.getElementById('firebase-status-banner');
            if (banner && !document.getElementById('account-signout-btn')) {
                const button = document.createElement('button');
                button.id = 'account-signout-btn';
                button.type = 'button';
                button.className = 'mr-auto text-[10px] font-bold rounded-lg px-2 py-1 bg-slate-200 dark:bg-slate-800';
                button.textContent = 'تسجيل الخروج';
                button.onclick = () => AuthModule.signOut();
                banner.appendChild(button);
            }
        });
