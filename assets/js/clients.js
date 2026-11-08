const ClientModule = {
    selectClientByIndex(clientIndex) {
        const allClientsModal = document.getElementById('all-clients-manager-modal');
        if (allClientsModal) allClientsModal.remove();

        const filteredModal = document.getElementById('filtered-clients-modal');
        if (filteredModal) filteredModal.remove();

        if (!StateModule.clientsList || !StateModule.clientsList[clientIndex]) return;

        StateModule.currentSelectedClient = StateModule.clientsList[clientIndex];

        if (!StateModule.currentSelectedClient.invoices || StateModule.currentSelectedClient.invoices.length === 0) {
            StateModule.currentSelectedClient.invoices = [{ id: "INV-1", date: FinanceModule.localDate(), items: [], discount: 0, discountType: "EGP", advancePayment: 0, paid: 0, deliveryStatus: "delivered" }];
        }

        StateModule.currentInvoiceIndex = StateModule.currentSelectedClient.invoices.length - 1;

        const noClientMsg = document.getElementById('no-client-selected-msg');
        if (noClientMsg) noClientMsg.classList.add('hidden');

        const catalogSec = document.getElementById('catalog-section');
        if (catalogSec) catalogSec.classList.remove('hidden');

        const invoiceSec = document.getElementById('invoice-main-section');
        if (invoiceSec) invoiceSec.classList.remove('hidden');

        this.renderCardInfo(clientIndex);
        scrollToSection('clients-section');
    },

    resetAndClearSelectedClient() {
        StateModule.currentSelectedClient = null;
        StateModule.currentInvoiceIndex = 0;

        const clientCard = document.getElementById('active-client-card');
        if (clientCard) clientCard.classList.add('hidden');

        const catalogSec = document.getElementById('catalog-section');
        if (catalogSec) catalogSec.classList.add('hidden');

        const invoiceSec = document.getElementById('invoice-main-section');
        if (invoiceSec) invoiceSec.classList.add('hidden');

        const noClientMsg = document.getElementById('no-client-selected-msg');
        if (noClientMsg) noClientMsg.classList.remove('hidden');

        const itemsContainer = document.getElementById('invoice-items-container');
        if (itemsContainer) itemsContainer.innerHTML = '';
    },

    renderCardInfo(clientIndex) {
        if (!StateModule.currentSelectedClient) return;
        const client = StateModule.currentSelectedClient;
        const totals = InvoiceModule.calculateClientTotals(client);
        const cardContainer = document.getElementById('active-client-card');
        const rawPhone = (client.phone || '').replace(/\D/g, '');

        cardContainer.className = "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 rounded-3xl space-y-4 shadow-xl transition-all w-full overflow-hidden";
        
        cardContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 text-center">
                <div class="flex flex-col items-center gap-2 w-full">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-lg shrink-0">
                        👤
                    </div>
                    <div>
                        <div class="flex items-center justify-center gap-2 flex-wrap">
                            <h3 class="font-black text-slate-900 dark:text-white text-base sm:text-lg tracking-wide">${client.name}</h3>
                            <span class="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-lg font-mono font-black">#${clientIndex + 1}</span>
                        </div>
                        <p class="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">بطاقة الحساب والمتابعة المباشرة</p>
                    </div>
                </div>

                <div class="flex items-center justify-center gap-2 flex-wrap w-full mt-1">
                    <a href="tel:${rawPhone}" title="اتصال هاتفي" class="w-9 h-9 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center shadow-md transition active:scale-95">
                        <i data-lucide="phone" class="w-4 h-4"></i>
                    </a>
                    <a href="https://wa.me/2${rawPhone}" target="_blank" title="محادثة واتساب" class="w-9 h-9 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center shadow-md transition active:scale-95">
                        <i data-lucide="message-circle" class="w-4 h-4"></i>
                    </a>
                    <button onclick="PaymentModule.openPaymentModal()" title="الدفع السريع" class="w-9 h-9 rounded-2xl bg-emerald-500/10 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-500/20 font-bold flex items-center justify-center transition active:scale-95">
                        <i data-lucide="banknote" class="w-4 h-4"></i>
                    </button>
                    <button onclick="ClientModule.editCurrentClient()" title="تعديل العميل" class="w-9 h-9 rounded-2xl bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white border border-amber-500/20 font-bold flex items-center justify-center transition active:scale-95">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="ClientModule.deleteCurrentClient()" title="حذف العميل" class="w-9 h-9 rounded-2xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 hover:text-white border border-rose-500/20 font-bold flex items-center justify-center transition active:scale-95">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="ClientModule.resetAndClearSelectedClient()" title="إغلاق البطاقة" class="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold flex items-center justify-center transition active:scale-95">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div onclick="copyPhoneNumberToClipboard('${client.phone || ''}')" title="اضغط لنسخ رقم التليفون" class="bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between cursor-pointer hover:border-blue-500 transition-all group shadow-sm active:scale-[0.99]">
                    <div class="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-black">
                        <div class="p-1.5 rounded-xl bg-blue-500/10"><i data-lucide="phone-call" class="w-3.5 h-3.5"></i></div>
                        <span>رقم التليفون:</span>
                    </div>
                    <div class="text-left">
                        <span class="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono group-hover:text-blue-600 transition block">${client.phone || 'مش متسجل'}</span>
                        <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold block">اضغط للنسخ 📋</span>
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-sm">
                    <div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-black">
                        <div class="p-1.5 rounded-xl bg-indigo-500/10"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i></div>
                        <span>القرية / البلدة:</span>
                    </div>
                    <div class="text-left">
                        <span class="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">${client.village || 'عزب القصر'}</span>
                        <span class="text-[9px] text-slate-400 dark:text-slate-500 font-bold block">الموقع المحتسب</span>
                    </div>
                </div>

                <div class="bg-rose-50/60 dark:bg-rose-950/20 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-rose-500/30 flex items-center justify-between shadow-sm">
                    <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-xs font-black">
                        <div class="p-1.5 rounded-xl bg-rose-500/10"><i data-lucide="trending-down" class="w-3.5 h-3.5"></i></div>
                        <span>الديون (عليــه):</span>
                    </div>
                    <div class="text-left">
                        <span id="client-card-debt" class="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 font-mono block">${totals.debt.toLocaleString()} ج</span>
                        <span class="text-[9px] text-rose-500/70 font-bold block">متبقي غير مسدد</span>
                    </div>
                </div>

                <div class="bg-emerald-50/60 dark:bg-emerald-950/20 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-emerald-500/30 flex items-center justify-between shadow-sm">
                    <div class="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                        <div class="p-1.5 rounded-xl bg-emerald-500/10"><i data-lucide="wallet" class="w-3.5 h-3.5"></i></div>
                        <span>دفع مقدم (رصيد):</span>
                    </div>
                    <div class="text-left">
                        <span id="client-card-advance" class="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono block">${totals.advance.toLocaleString()} ج</span>
                        <span class="text-[9px] text-emerald-500/70 font-bold block">رصيد عربيّن مدفوع</span>
                    </div>
                </div>
            </div>

            <div class="mt-2 p-4 bg-slate-50 dark:bg-slate-950/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-inner space-y-3.5">
                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <i data-lucide="folder-archive" class="w-4 h-4 text-blue-500"></i> أرشيف فواتير العميل:
                    </span>
                </div>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <button id="invoice-archive-trigger-btn" onclick="InvoiceModule.openInvoiceArchiveSearchModal()" class="w-full flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold hover:border-blue-500 transition flex items-center justify-between gap-2 shadow-sm truncate">
                        <span id="selected-invoice-label" class="truncate">🔍 اختر فاتورة...</span>
                        <i data-lucide="chevron-down" class="w-4 h-4 text-slate-400 shrink-0"></i>
                    </button>

                    <div class="flex items-center justify-center gap-1.5 shrink-0">
                        <button onclick="InvoiceModule.openNewInvoiceWizard()" title="افتح فاتورة جديدة" class="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center justify-center shadow-md active:scale-95">
                            <i data-lucide="file-plus" class="w-4 h-4"></i>
                        </button>

                        <button onclick="InvoiceShareModule.openCleanShareModal()" title="معاينة وطباعة الفاتورة" class="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition flex items-center justify-center shadow-md active:scale-95">
                            <i data-lucide="printer" class="w-4 h-4"></i>
                        </button>

                        <button onclick="InvoiceModule.deleteCurrentInvoice()" title="احذف الفاتورة" class="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold transition flex items-center justify-center active:scale-95">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs font-bold items-stretch">
                    <div class="flex">
                        <button onclick="InvoiceModule.openDiscountModal()" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3.5 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 font-black hover:border-rose-500 transition flex items-center justify-between shadow-sm">
                            <span id="discount-btn-label">🏷️ إضافة خصم (0 ج)</span>
                            <i data-lucide="edit-3" class="w-3.5 h-3.5 text-slate-400 shrink-0"></i>
                        </button>
                    </div>

                    <div class="flex">
                        <select id="delivery-status" onchange="InvoiceModule.onDeliveryStatusChange()" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3.5 py-2.5 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 shadow-sm cursor-pointer leading-none text-xs">
                            <option value="delivered">🟢 الشغل اتسلم للعميل خلاص</option>
                            <option value="pending">🟡 لسه متسلمش (شغالين فيه)</option>
                        </select>
                    </div>

                    <div class="flex">
                        <button onclick="InvoiceModule.openAddPaymentModal()" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-md active:scale-95">
                            <i data-lucide="plus-circle" class="w-3.5 h-3.5 shrink-0"></i>
                            <span id="payment-btn-text">💵 تنزيل دفعة سداد</span>
                        </button>
                    </div>
                </div>

                <div class="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 space-y-2">
                    <div class="grid grid-cols-2 gap-2 text-[11px] font-black">
                        <div class="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center shadow-sm">
                            <span class="text-slate-500 dark:text-slate-400">حساب الأصناف:</span>
                            <span id="sub-total" class="text-slate-900 dark:text-white font-mono">0 ج</span>
                        </div>
                        <div class="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center shadow-sm">
                            <span class="text-slate-500 dark:text-slate-400">المدفوع / العربون:</span>
                            <span id="total-paid-display" class="text-emerald-600 dark:text-emerald-400 font-mono">0 ج</span>
                        </div>
                    </div>

                    <div class="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center shadow-sm">
                        <span class="text-xs font-black text-rose-600 dark:text-rose-400">الصافي المتبقي للفاتورة:</span>
                        <strong id="net-total" class="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">0 ج</strong>
                    </div>
                </div>

                <div class="pt-1">
                    <div id="invoice-status-badge" class="w-full text-center py-2 px-3 rounded-xl text-xs font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                        غير محدد
                    </div>
                </div>
            </div>
        `;

        cardContainer.classList.remove('hidden');
        lucide.createIcons();
        InvoiceModule.renderClientInvoicesDropdown();
        InvoiceModule.loadCurrentInvoiceData();
    },

    openAddClientModal() {
        const name = prompt("اكتب اسم العميل الجديد:");
        if (!name) return -1;
        const phone = prompt("اكتب رقم التليفون:", "") || "";
        const village = prompt("اكتب البلد / القرية:", "عزب القصر") || "عزب القصر";

        const newClient = {
            name,
            phone,
            village,
            invoices: [{ id: "INV-1", date: FinanceModule.localDate(), items: [], discount: 0, discountType: "EGP", advancePayment: 0, paid: 0, deliveryStatus: "delivered" }]
        };

        StateModule.clientsList.push(newClient);
        StateModule.save();
        DashboardModule.updateFinancialDashboard();
        const newIdx = StateModule.clientsList.length - 1;
        this.selectClientByIndex(newIdx);
        showCustomToast(`✨ اتضاف العميل (${name}) وحفظ سحابياً!`);
        return newIdx;
    },

    editClientByIdx(idx) {
        if (idx < 0 || idx >= StateModule.clientsList.length) return;
        const client = StateModule.clientsList[idx];
        
        const newName = prompt("عدل اسم العميل:", client.name);
        if (newName === null) return;
        client.name = newName.trim() || client.name;
        client.phone = prompt("عدل رقم التليفون:", client.phone || "") || "";
        client.village = prompt("عدل البلد / القرية:", client.village || "عزب القصر") || "عزب القصر";

        StateModule.save();
        DashboardModule.updateFinancialDashboard();
        
        if (StateModule.currentSelectedClient === client) {
            this.renderCardInfo(idx);
        }
        
        const modal = document.getElementById('all-clients-manager-modal');
        if (modal) this.renderAllClientsList();
        showCustomToast("تم تحديث بيانات العميل سحابياً!");
    },

    deleteClientByIdx(idx) {
        if (idx < 0 || idx >= StateModule.clientsList.length) return;
        const client = StateModule.clientsList[idx];

        if (confirm(`أكيد عايز تحذف العميل (${client.name}) نهائياً بكل فواتيره؟`)) {
            const isSelected = (StateModule.currentSelectedClient === client);
            StateModule.clientsList.splice(idx, 1);
            StateModule.save();
            
            if (isSelected) {
                this.resetAndClearSelectedClient();
            }
            
            DashboardModule.updateFinancialDashboard();

            const modal = document.getElementById('all-clients-manager-modal');
            if (modal) this.renderAllClientsList();
            showCustomToast("تم الحذف والتحديث سحابياً!");
        }
    },

    editCurrentClient() {
        if (!StateModule.currentSelectedClient) return;
        const idx = StateModule.clientsList.indexOf(StateModule.currentSelectedClient);
        this.editClientByIdx(idx);
    },

    deleteCurrentClient() {
        if (!StateModule.currentSelectedClient) return;
        const idx = StateModule.clientsList.indexOf(StateModule.currentSelectedClient);
        this.deleteClientByIdx(idx);
    },

    openAllClientsModal() {
        let modal = document.getElementById('all-clients-manager-modal');
        if (modal) modal.remove();

        const regions = [...new Set(StateModule.clientsList.map(c => c.village).filter(Boolean))];
        const regionOptions = `<option value="">كل البلدان / القرى</option>` + regions.map(r => `<option value="${r}">${r}</option>`).join('');

        modal = document.createElement('div');
        modal.id = 'all-clients-manager-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div class="bg-slate-50 dark:bg-slate-950 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h3 class="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">🔍 البحث عن عميل وإدارة الحسابات (${StateModule.clientsList.length})</h3>
                    <button onclick="document.getElementById('all-clients-manager-modal').remove()" class="text-rose-500 font-black text-lg px-2">✕</button>
                </div>
                
                <div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col sm:flex-row gap-2.5 shrink-0">
                    <div class="relative flex-1">
                        <input type="text" id="all-clients-search-box" oninput="ClientModule.renderAllClientsList()" placeholder="اكتب اسم العميل أو رقم التليفون للبحث..." class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500">
                    </div>
                    <div class="w-full sm:w-48">
                        <select id="all-clients-region-filter" onchange="ClientModule.renderAllClientsList()" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-blue-500">
                            ${regionOptions}
                        </select>
                    </div>
                </div>

                <div class="p-4 overflow-y-auto space-y-2.5 flex-1 bg-slate-50 dark:bg-slate-950 custom-scrollbar" id="all-clients-modal-list"></div>

                <div class="bg-slate-50 dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
                    <button onclick="ClientModule.openAddClientModal(); document.getElementById('all-clients-manager-modal').remove();" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1">
                        + عميل جديد
                    </button>
                    <button onclick="document.getElementById('all-clients-manager-modal').remove()" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-5 py-2 rounded-xl text-xs font-bold">إغلاق</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.renderAllClientsList();
    },

    renderAllClientsList() {
        const container = document.getElementById('all-clients-modal-list');
        const searchInput = document.getElementById('all-clients-search-box');
        const regionSelect = document.getElementById('all-clients-region-filter');
        if (!container) return;

        const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const selectedRegion = regionSelect ? regionSelect.value : "";

        const filtered = StateModule.clientsList
            .map((client, idx) => ({ client, idx }))
            .filter(item => {
                const matchesQuery = item.client.name.toLowerCase().includes(q) || 
                                     (item.client.phone && item.client.phone.includes(q)) || 
                                     (item.client.village && item.client.village.toLowerCase().includes(q));
                const matchesRegion = !selectedRegion || item.client.village === selectedRegion;
                return matchesQuery && matchesRegion;
            });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold">مفيش عملاء ببيانات البحث دي.</div>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const totals = InvoiceModule.calculateClientTotals(item.client);
            const rawPhone = (item.client.phone || '').replace(/\D/g, '');
            return `
                <div class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-sm">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div class="cursor-pointer flex-1" onclick="ClientModule.selectClientByIndex(${item.idx})">
                            <h4 class="font-black text-slate-900 dark:text-white text-sm hover:text-blue-500 transition">👤 ${item.client.name}</h4>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">التليفون: ${item.client.phone || 'مش متسجل'} | القرية: ${item.client.village || 'عزب القصر'}</p>
                        </div>
                        <div class="text-left font-extrabold text-xs">
                            <span class="text-rose-600 dark:text-rose-400">ديون: ${totals.debt.toLocaleString()} ج</span>
                            <span class="text-emerald-600 dark:text-emerald-400 mr-2">مقدم: ${totals.advance.toLocaleString()} ج</span>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between gap-1.5 flex-wrap">
                        <div class="flex items-center gap-1.5">
                            <button onclick="ClientModule.selectClientByIndex(${item.idx})" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg font-bold text-[11px]">اختيار وتحديد 👈</button>
                            <a href="tel:${rawPhone}" class="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg font-bold text-[11px]">📞 اتصال</a>
                            <a href="https://wa.me/2${rawPhone}" target="_blank" class="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg font-bold text-[11px]">💬 واتساب</a>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button onclick="ClientModule.editClientByIdx(${item.idx})" class="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg font-bold text-[11px]">✏️ تعديل</button>
                            <button onclick="ClientModule.deleteClientByIdx(${item.idx})" class="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-lg font-bold text-[11px]">🗑️ حذف</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
};
