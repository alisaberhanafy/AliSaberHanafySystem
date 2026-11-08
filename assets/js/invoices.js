const InvoiceModule = {
    openNewInvoiceWizard() {
        if (!StateModule.currentSelectedClient) {
            ClientModule.openAllClientsModal();
            return;
        }
        this.createNewInvoiceForCurrentClient();
    },

    renderClientInvoicesDropdown() {
        const label = document.getElementById('selected-invoice-label');
        if (!StateModule.currentSelectedClient || !label) return;

        const inv = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex];
        if (inv) {
            const invoiceNet = FinanceModule.invoice(inv, StateModule.catalogItems).net;
            label.innerText = `فاتورة #${StateModule.currentInvoiceIndex + 1} (${inv.date || 'بدون تاريخ'}) - الصافي: ${invoiceNet.toLocaleString()} ج`;
        } else {
            label.innerText = "🔍 اختر فاتورة...";
        }
    },

    openInvoiceArchiveSearchModal() {
        if (!StateModule.currentSelectedClient) return;

        let modal = document.getElementById('invoice-archive-search-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'invoice-archive-search-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
                <div class="bg-slate-50 dark:bg-slate-950 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h3 class="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">📂 أرشيف فواتير العميل (${StateModule.currentSelectedClient.invoices.length})</h3>
                    <button onclick="document.getElementById('invoice-archive-search-modal').remove()" class="text-rose-500 font-black text-lg px-2">✕</button>
                </div>

                <div class="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
                    <input type="text" id="archive-search-input" oninput="InvoiceModule.renderArchiveModalInvoicesList(this.value)" placeholder="ابحث برقم الفاتورة (مثال 1) أو التاريخ..." class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-3 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500">
                </div>

                <div class="p-4 overflow-y-auto space-y-2.5 flex-1 bg-slate-50 dark:bg-slate-950 custom-scrollbar" id="archive-modal-invoices-list"></div>

                <div class="bg-slate-50 dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
                    <button onclick="document.getElementById('invoice-archive-search-modal').remove()" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-5 py-2 rounded-xl text-xs font-bold">إغلاق</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.renderArchiveModalInvoicesList("");
    },

    renderArchiveModalInvoicesList(query = "") {
        const container = document.getElementById('archive-modal-invoices-list');
        if (!container || !StateModule.currentSelectedClient) return;

        const q = query.trim().toLowerCase();
        const client = StateModule.currentSelectedClient;

        const invoicesWithIdx = client.invoices
            .map((inv, originalIndex) => ({ inv, originalIndex }))
            .reverse();

        const filtered = invoicesWithIdx.filter(item => {
            const numStr = (item.originalIndex + 1).toString();
            const dateStr = item.inv.date || '';
            return numStr.includes(q) || dateStr.toLowerCase().includes(q) || `فاتورة #${numStr}`.includes(q);
        });

        if (filtered.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-xs text-slate-400 font-bold">مفيش فاتورة تطابق البحث.</div>`;
            return;
        }

        container.innerHTML = filtered.map(item => {
            const isSelected = item.originalIndex === StateModule.currentInvoiceIndex;
            return `
                <div onclick="InvoiceModule.switchClientInvoice(${item.originalIndex}); document.getElementById('invoice-archive-search-modal').remove();" class="p-3.5 rounded-2xl border transition cursor-pointer flex justify-between items-center ${isSelected ? 'bg-blue-600/10 border-blue-500/50 dark:bg-blue-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-400'} shadow-sm">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-black text-sm text-slate-900 dark:text-white">فاتورة #${item.originalIndex + 1}</span>
                            ${isSelected ? '<span class="text-[10px] bg-blue-600 text-white font-black px-2 py-0.5 rounded-md">المحددة حالياً</span>' : ''}
                        </div>
                        <span class="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1 block">📅 التاريخ: ${item.inv.date || 'بدون تاريخ'}</span>
                    </div>
                    <div class="text-left font-mono font-black text-xs">
                        <div class="text-blue-600 dark:text-blue-400 text-sm">${(item.inv.netTotal || 0).toLocaleString()} ج</div>
                        <div class="text-[10px] text-slate-400">إجمالي الصافي</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    switchClientInvoice(index) {
        StateModule.currentInvoiceIndex = parseInt(index) || 0;
        this.renderClientInvoicesDropdown();
        this.loadCurrentInvoiceData();
    },

    createNewInvoiceForCurrentClient() {
        if (!StateModule.currentSelectedClient) {
            ClientModule.openAllClientsModal();
            return;
        }

        const newInv = {
            id: `INV-${StateModule.currentSelectedClient.invoices.length + 1}`,
            date: FinanceModule.localDate(),
            items: [],
            discount: 0,
            discountType: "EGP",
            advancePayment: 0,
            paid: 0,
            deliveryStatus: "delivered",
            netTotal: 0
        };

        StateModule.currentSelectedClient.invoices.push(newInv);
        StateModule.currentInvoiceIndex = StateModule.currentSelectedClient.invoices.length - 1;
        
        this.saveAndAutoSync();
        this.renderClientInvoicesDropdown();
        this.loadCurrentInvoiceData();

        const catalogSec = document.getElementById('catalog-section');
        if (catalogSec) catalogSec.classList.remove('hidden');

        const invoiceSec = document.getElementById('invoice-main-section');
        if (invoiceSec) invoiceSec.classList.remove('hidden');

        showCustomToast("✨ تم إنشاء فاتورة جديدة فارغة وتحديدها!");
    },

    deleteCurrentInvoice() {
        if (!StateModule.currentSelectedClient) return;
        
        if (StateModule.currentSelectedClient.invoices.length <= 1) {
            alert("ما ينفعش تحذف الفاتورة الوحيدة للعميل!");
            return;
        }

        if (confirm(`أكيد عايز تحذف الفاتورة دي رقم #${StateModule.currentInvoiceIndex + 1}؟`)) {
            StateModule.currentSelectedClient.invoices.splice(StateModule.currentInvoiceIndex, 1);
            StateModule.currentInvoiceIndex = Math.max(0, StateModule.currentSelectedClient.invoices.length - 1);
            
            this.saveAndAutoSync();
            this.renderClientInvoicesDropdown();
            this.loadCurrentInvoiceData();
        }
    },

    loadCurrentInvoiceData() {
        if (!StateModule.currentSelectedClient || !StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex]) return;

        const inv = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex];

        const statusSelect = document.getElementById('delivery-status');
        if (statusSelect) statusSelect.value = inv.deliveryStatus || "delivered";

        this.updateDiscountButtonUI();
        
        const btnText = document.getElementById('payment-btn-text');
        if (btnText) {
            btnText.innerText = (inv.deliveryStatus === 'delivered') ? "💵 تنزيل دفعة سداد" : "💰 تنزيل عربون مقدم";
        }

        this.renderInvoiceTable();
    },

    openDiscountModal() {
        if (!StateModule.currentSelectedClient) return;

        const inv = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex];
        let modal = document.getElementById('discount-manager-modal');
        if (modal) modal.remove();

        const currentVal = inv.discount || 0;
        const currentType = inv.discountType || "EGP";

        modal = document.createElement('div');
        modal.id = 'discount-manager-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
                <div class="bg-slate-50 dark:bg-slate-950 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                    <h3 class="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">🏷️ تعديل الخصم على الفاتورة</h3>
                    <button onclick="document.getElementById('discount-manager-modal').remove()" class="text-rose-500 font-black text-lg px-2">✕</button>
                </div>

                <div class="p-5 space-y-4">
                    <div>
                        <label class="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1.5">نوع الخصم:</label>
                        <div class="grid grid-cols-2 gap-2">
                            <button type="button" id="discount-type-egp" onclick="InvoiceModule.setDiscountTypeInModal('EGP')" class="p-2.5 rounded-xl border text-xs font-black transition ${currentType === 'EGP' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'}">جنيه (EGP)</button>
                            <button type="button" id="discount-type-percent" onclick="InvoiceModule.setDiscountTypeInModal('PERCENT')" class="p-2.5 rounded-xl border text-xs font-black transition ${currentType === 'PERCENT' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'}">نسبة مئوية (%)</button>
                        </div>
                    </div>

                    <div>
                        <label id="discount-input-label" class="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">قيمة الخصم (${currentType === 'PERCENT' ? '%' : 'جنيه'}):</label>
                        <input type="number" id="discount-modal-value" value="${currentVal}" placeholder="0" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-3 rounded-xl text-sm font-black text-rose-600 dark:text-rose-400 outline-none">
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2">
                    <button onclick="InvoiceModule.applyDiscountFromModal()" class="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex-1">تطبيق الخصم وحفظ</button>
                    <button onclick="document.getElementById('discount-manager-modal').remove()" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold">إغلاق</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    setDiscountTypeInModal(type) {
        const egpBtn = document.getElementById('discount-type-egp');
        const percentBtn = document.getElementById('discount-type-percent');
        const label = document.getElementById('discount-input-label');

        if (type === 'EGP') {
            egpBtn.className = "p-2.5 rounded-xl border text-xs font-black transition bg-rose-600 text-white border-rose-600";
            percentBtn.className = "p-2.5 rounded-xl border text-xs font-black transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
            if (label) label.innerText = "قيمة الخصم (جنيه):";
            egpBtn.dataset.selected = "true";
            percentBtn.dataset.selected = "false";
        } else {
            percentBtn.className = "p-2.5 rounded-xl border text-xs font-black transition bg-rose-600 text-white border-rose-600";
            egpBtn.className = "p-2.5 rounded-xl border text-xs font-black transition bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700";
            if (label) label.innerText = "قيمة الخصم (نسبة %):";
            percentBtn.dataset.selected = "true";
            egpBtn.dataset.selected = "false";
        }
    },

    applyDiscountFromModal() {
        if (!StateModule.currentSelectedClient) return;

        const valInput = document.getElementById('discount-modal-value');
        const percentBtn = document.getElementById('discount-type-percent');
        
        const isPercent = percentBtn ? (percentBtn.dataset.selected === "true" || percentBtn.classList.contains('bg-rose-600')) : false;
        const val = Math.max(0, parseFloat(valInput ? valInput.value : 0) || 0);

        const inv = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex];
        inv.discount = isPercent ? Math.min(val, 100) : val;
        inv.discountType = isPercent ? "PERCENT" : "EGP";

        const modal = document.getElementById('discount-manager-modal');
        if (modal) modal.remove();

        this.updateDiscountButtonUI();
        this.saveAndAutoSync();
        showCustomToast(`🏷️ تم حفظ وتطبيق الخصم تلقائياً!`);
    },

    updateDiscountButtonUI() {
        const btnLabel = document.getElementById('discount-btn-label');
        if (!btnLabel || !StateModule.currentSelectedClient) return;

        const inv = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex];
        const val = inv ? (inv.discount || 0) : 0;
        const isPercent = inv ? (inv.discountType === "PERCENT") : false;

        if (val > 0) {
            btnLabel.innerText = `🏷️ الخصم: ${val.toLocaleString()} ${isPercent ? '%' : 'ج'}`;
        } else {
            btnLabel.innerText = `🏷️ إضافة خصم (0 ج)`;
        }
    },

    openAddPaymentModal() {
        if (!StateModule.currentSelectedClient) {
            ClientModule.openAllClientsModal();
            return;
        }

        const statusEl = document.getElementById('delivery-status');
        const isDelivered = statusEl ? statusEl.value === 'delivered' : true;

        let modal = document.getElementById('add-payment-item-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'add-payment-item-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';

        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
                <div class="bg-slate-50 dark:bg-slate-950 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                    <h3 class="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">💵 ${isDelivered ? 'تنزيل دفعة سداد' : 'تنزيل عربون مقدم'}</h3>
                    <button onclick="document.getElementById('add-payment-item-modal').remove()" class="text-rose-500 font-black text-lg px-2">✕</button>
                </div>

                <div class="p-5 space-y-4">
                    <div>
                        <label class="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-1">${isDelivered ? 'المبلغ المحصل (جنيه):' : 'مبلغ العربون (جنيه):'}</label>
                        <input type="number" id="payment-modal-amount" placeholder="اكتب المبلغ..." class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-3 rounded-xl text-sm font-black text-emerald-600 dark:text-emerald-400 outline-none">
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2">
                    <button onclick="InvoiceModule.submitPaymentItemFromModal()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex-1">إضافة وحفظ سحابي</button>
                    <button onclick="document.getElementById('add-payment-item-modal').remove()" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold">إغلاق</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    async submitPaymentItemFromModal() {
        const amountInput = document.getElementById('payment-modal-amount');
        const val = parseFloat(amountInput ? amountInput.value : 0) || 0;

        if (val <= 0) {
            alert("اكتب مبلغ أكبر من صفر!");
            return;
        }

        const inv = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex];
        if (!inv.items) inv.items = [];

        const statusEl = document.getElementById('delivery-status');
        const isDelivered = statusEl ? statusEl.value === 'delivered' : true;
        const paymentTitle = isDelivered ? `💵 دفعة سداد مالي` : `💰 عربون مدفوع (مقدم)`;

        inv.items.push({
            id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            code: 'PAYMENT',
            name: paymentTitle,
            qty: 1,
            price: Math.round(val * 100) / 100,
            dateTime: getCurrentFormattedDateTime(),
            isPayment: true
        });

        const modal = document.getElementById('add-payment-item-modal');
        if (modal) modal.remove();

        this.renderInvoiceTable();
        this.calculateInvoiceTotals();
        const cloudSaved = await StateModule.save();
        DashboardModule.updateFinancialDashboard();
        showCustomToast(cloudSaved ? `تم تسجيل (${paymentTitle}) بقيمة ${val.toLocaleString()} ج ومزامنتها سحابياً.` : 'تم تسجيل الدفعة محلياً، لكن تعذر تأكيد الحفظ السحابي.');
    },

    onDeliveryStatusChange() {
        const statusEl = document.getElementById('delivery-status');
        const btnText = document.getElementById('payment-btn-text');

        if (statusEl && btnText) {
            if (statusEl.value === 'delivered') {
                btnText.innerText = "💵 تنزيل دفعة سداد";
            } else {
                btnText.innerText = "💰 تنزيل عربون مقدم";
            }
        }
        this.saveAndAutoSync();
    },

    calculateInvoiceTotals() {
        if (!StateModule.currentSelectedClient || !StateModule.currentSelectedClient.invoices?.[StateModule.currentInvoiceIndex]) return;
        const inv = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex];
        const totals = FinanceModule.invoice(inv, StateModule.catalogItems);
        const statusEl = document.getElementById('delivery-status');
        inv.deliveryStatus = statusEl ? statusEl.value : (inv.deliveryStatus || 'delivered');
        inv.advancePayment = totals.paid;
        inv.paid = totals.paid;
        inv.netTotal = totals.net;
        const sub = document.getElementById('sub-total'); if (sub) sub.innerText = `${totals.itemsSubtotal.toLocaleString()} ج`;
        const paid = document.getElementById('total-paid-display'); if (paid) paid.innerText = `${totals.paid.toLocaleString()} ج`;
        const remaining = document.getElementById('net-total'); if (remaining) remaining.innerText = `${totals.remaining.toLocaleString()} ج`;
        const badge = document.getElementById('invoice-status-badge');
        if (badge) {
            if (inv.deliveryStatus === 'delivered' && totals.remaining > 0) {
                badge.innerText = `🔴 تم التسليم - متبقي ${totals.remaining.toLocaleString()} ج`;
                badge.className = 'w-full text-center py-2 px-3 rounded-xl text-xs font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-sm';
            } else if (inv.deliveryStatus === 'delivered') {
                badge.innerText = '🟢 تم التسليم - الحساب مسدد بالكامل';
                badge.className = 'w-full text-center py-2 px-3 rounded-xl text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm';
            } else {
                badge.innerText = `🟡 لم يتم التسليم - المقدم ${totals.paid.toLocaleString()} ج`;
                badge.className = 'w-full text-center py-2 px-3 rounded-xl text-xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm';
            }
        }
        const clientTotals = this.calculateClientTotals(StateModule.currentSelectedClient);
        const debtEl=document.getElementById('client-card-debt'); if(debtEl) debtEl.innerText=`${clientTotals.debt.toLocaleString()} ج`;
        const advanceEl=document.getElementById('client-card-advance'); if(advanceEl) advanceEl.innerText=`${clientTotals.advance.toLocaleString()} ج`;
        this.renderClientInvoicesDropdown();
    },

    calculateClientTotals(client) {
        return FinanceModule.client(client, StateModule.catalogItems);
    },

    saveAndAutoSync() {
        if (!StateModule.currentSelectedClient) return;
        this.calculateInvoiceTotals();
        StateModule.save();
        DashboardModule.updateFinancialDashboard();
    },

    renderInvoiceTable() {
        const container = document.getElementById('invoice-items-container');
        if (!container || !StateModule.currentSelectedClient || !StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex]) return;

        const items = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex].items || [];

        if (items.length === 0) {
            container.innerHTML = `<div class="p-6 text-center text-slate-400 dark:text-slate-500 font-bold border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">مفيش أصناف اتنزلت للفاتورة دي لسه.</div>`;
            this.calculateInvoiceTotals();
            return;
        }

        const reversedItemsWithIndex = items.map((item, originalIndex) => ({ item, originalIndex })).reverse();

        container.innerHTML = reversedItemsWithIndex.map(({ item, originalIndex: idx }) => {
            const isPay = item.isPayment;
            const itemTotal = (item.qty * item.price);
            return `
                <div class="${isPay ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/40' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'} p-4 rounded-xl border space-y-3 relative transition hover:border-blue-500/50">
                    <div class="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/80 pb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-black ${isPay ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}">بند #${idx + 1} ${isPay ? '(سداد/مقدم)' : ''}</span>
                            <span class="text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md">🕒 ${item.dateTime || getCurrentFormattedDateTime()}</span>
                        </div>
                        <button onclick="InvoiceModule.removeInvoiceItem(${idx})" class="text-rose-500 hover:text-rose-400 font-extrabold text-xs flex items-center gap-1">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> حذف
                        </button>
                    </div>
                    
                    <div>
                        <input type="text" value="${item.name}" onchange="InvoiceModule.updateItemName(${idx}, this.value)" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 rounded-xl font-black text-slate-900 dark:text-white text-xs outline-none focus:border-blue-500">
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-xs font-bold">
                        <div>
                            <label class="text-slate-400 block text-[10px] mb-1">الكمية:</label>
                            <input type="number" value="${item.qty}" ${isPay ? 'readonly' : ''} oninput="InvoiceModule.updateItemQty(${idx}, this.value)" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2 rounded-xl text-center text-slate-900 dark:text-white font-bold outline-none">
                        </div>
                        <div>
                            <label class="text-slate-400 block text-[10px] mb-1">${isPay ? 'المبلغ المسدد:' : 'السعر:'}</label>
                            <input type="number" value="${item.price}" oninput="InvoiceModule.updateItemPrice(${idx}, this.value)" class="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2 rounded-xl text-center text-emerald-600 dark:text-emerald-400 font-bold outline-none">
                        </div>
                    </div>

                    <div class="pt-1 flex justify-between items-center border-t border-slate-200 dark:border-slate-800/60 text-xs font-black">
                        <span class="text-slate-500 dark:text-slate-400">${isPay ? 'إجمالي المحصل:' : 'الإجمالي:'}</span>
                        <span id="item-line-total-${idx}" class="${isPay ? 'text-emerald-500' : 'text-emerald-600 dark:text-emerald-400'} text-sm">${itemTotal.toLocaleString()} جنيه</span>
                    </div>
                </div>
            `;
        }).join('');

        lucide.createIcons();
        this.calculateInvoiceTotals();
    },

    updateItemName(idx, val) {
        if (!StateModule.currentSelectedClient || !StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex]) return;
        StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex].items[idx].name = val;
        this.saveAndAutoSync();
    },

    updateItemQty(idx, val) {
        if (!StateModule.currentSelectedClient || !StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex]) return;
        const item = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex].items[idx];
        item.qty = Math.max(0, parseFloat(val) || 0);
        this.saveAndAutoSync();
    },

    updateItemPrice(idx, val) {
        if (!StateModule.currentSelectedClient || !StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex]) return;
        const item = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex].items[idx];
        item.price = Math.max(0, parseFloat(val) || 0);
        this.saveAndAutoSync();
    },

    removeInvoiceItem(idx) {
        if (!StateModule.currentSelectedClient || !StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex]) return;
        StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex].items.splice(idx, 1);
        this.renderInvoiceTable();
        this.saveAndAutoSync();
    },

    searchCatalogItemsForInvoice(query) {
        const dropdown = document.getElementById('catalog-dropdown');
        if (!dropdown) return;
        const q = query.trim().toLowerCase();

        if (!q) {
            dropdown.classList.add('hidden');
            return;
        }

        const matches = StateModule.catalogItems.filter(i => i.name.toLowerCase().includes(q) || (i.code && i.code.toLowerCase().includes(q)));
        if (matches.length > 0) {
            dropdown.innerHTML = matches.map(m => `
                <div onclick="InvoiceModule.addCatalogItemToInvoice('${m.name}')" class="p-3.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center font-bold text-slate-900 dark:text-white transition">
                    <div class="flex items-center gap-2">
                        <span class="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded text-[10px] font-mono">[${m.code || 'بدون كود'}]</span>
                        <span>${m.name}</span>
                    </div>
                    <span class="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">${m.price.toLocaleString()} ج</span>
                </div>
            `).join('');
            dropdown.classList.remove('hidden');
        } else {
            dropdown.innerHTML = `<div class="p-3 text-xs text-slate-400 text-center font-bold">ملقناش صنف بالاسم ده ف الكتالوج.</div>`;
            dropdown.classList.remove('hidden');
        }
    },

    addCatalogItemToInvoice(itemName) {
        if (!StateModule.currentSelectedClient) {
            ClientModule.openAllClientsModal();
            return;
        }

        const item = StateModule.catalogItems.find(i => i.name === itemName);
        if (!item) return;

        if (!StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex].items) {
            StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex].items = [];
        }

        StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex].items.push({
            code: item.code || '',
            name: item.name,
            qty: item.defaultQty || 1,
            price: item.price,
            costPrice: item.costPrice ?? item.cost ?? null,
            dateTime: getCurrentFormattedDateTime(),
            isPayment: false
        });

        const dropdown = document.getElementById('catalog-dropdown');
        if (dropdown) dropdown.classList.add('hidden');

        const codeInput = document.getElementById('item-code-input');
        if (codeInput) codeInput.value = "";

        this.renderInvoiceTable();
        this.saveAndAutoSync();
    }
};

// --- 4. وحدة الطباعة والمعاينة ---
// --- 4. وحدة الطباعة ومعاينة الفواتير والمشاركة ---
