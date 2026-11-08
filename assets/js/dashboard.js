const DashboardModule = {
    initChart(dailySalesData = [0,0,0,0,0,0,0], dateLabels = []) {
        const chartEl = document.getElementById('dailyWorkChart');
        if (!chartEl) return;
        const ctx = chartEl.getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        if (StateModule.dailyChartInstance) {
            StateModule.dailyChartInstance.data.datasets[0].data = dailySalesData;
            if (dateLabels.length) StateModule.dailyChartInstance.data.labels = dateLabels.map(d => d.slice(5));
            StateModule.dailyChartInstance.update();
            return;
        }

        StateModule.dailyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dateLabels.length ? dateLabels.map(d => d.slice(5)) : ['قبل 6 أيام', 'قبل 5 أيام', 'قبل 4 أيام', 'قبل 3 أيام', 'قبل يومين', 'أمس', 'اليوم'],
                datasets: [{
                    label: 'مبيعات الشغل المستلم (جنيه)',
                    data: dailySalesData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { color: isDark ? '#1e293b' : '#e2e8f0' }, ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Cairo' } } },
                    y: { grid: { color: isDark ? '#1e293b' : '#e2e8f0' }, ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { family: 'Cairo' } } }
                }
            }
        });
    },

    updateFinancialDashboard() {
        let globalDebts=0, globalAdvances=0, todaySalesDelivered=0, todayProfitDelivered=0;
        let monthlyOpsCount=0, monthlyOpsAmount=0, monthlyTransactionsList=[];
        let todayProfitIncomplete=false;
        const now=new Date();
        const today=FinanceModule.localDate(now);
        const monthPrefix=today.slice(0,7);
        const weeklySalesMap=Array(7).fill(0);
        const weeklyDates=Array.from({length:7},(_,offset)=>{
            const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(6-offset));
            return FinanceModule.localDate(d);
        });
        const weeklyIndex=new Map(weeklyDates.map((date,index)=>[date,index]));

        StateModule.clientsList.forEach(client=>{
            const clientTotals=FinanceModule.client(client,StateModule.catalogItems);
            globalDebts+=clientTotals.debt;
            globalAdvances+=clientTotals.advance;
            (Array.isArray(client.invoices)?client.invoices:[]).forEach(inv=>{
                const totals=FinanceModule.invoice(inv,StateModule.catalogItems);
                const date=String(inv.date||'');
                // Monthly operations include every invoice created this month, including work in progress.
                if(date.slice(0,7)===monthPrefix){
                    monthlyOpsCount++;
                    monthlyOpsAmount+=totals.net;
                    monthlyTransactionsList.push({clientName:client.name,date:inv.date,net:totals.net,itemsCount:(inv.items||[]).filter(item=>!item.isPayment).length,deliveryStatus:inv.deliveryStatus||'delivered'});
                }
                if(inv.deliveryStatus==='delivered'){
                    if(date===today){
                        todaySalesDelivered+=totals.net;
                        todayProfitDelivered+=totals.grossProfit;
                        if(totals.costEstimated)todayProfitIncomplete=true;
                    }
                    const dayIndex=weeklyIndex.get(date);
                    if(dayIndex!==undefined)weeklySalesMap[dayIndex]+=totals.net;
                }
            });
        });

        const display=(id,value)=>{const el=document.getElementById(id);if(el)el.innerText=`${FinanceModule.round(value).toLocaleString('ar-EG')} ج`;};
        display('total-debts',globalDebts);
        display('total-advances',globalAdvances);
        display('today-sales-delivered',todaySalesDelivered);
        display('today-profit-delivered',todayProfitDelivered);
        const clientsEl=document.getElementById('total-clients-count');if(clientsEl)clientsEl.innerText=`${StateModule.clientsList.length} عميل`;
        const countEl=document.getElementById('monthly-ops-count');if(countEl)countEl.innerText=`${monthlyOpsCount} عملية`;
        const amountEl=document.getElementById('monthly-ops-amount');if(amountEl)amountEl.innerText=`${FinanceModule.round(monthlyOpsAmount).toLocaleString('ar-EG')} ج`;
        const profitEl=document.getElementById('today-profit-delivered');
        if(profitEl){
            profitEl.title=todayProfitIncomplete?'تقدير تقريبي: بعض البنود لا تحتوي على سعر تكلفة تاريخي محفوظ، وقد تم استخدام تكلفة الكتالوج الحالية أو صفر عند تعذرها.':'تم حساب الربح من أسعار التكلفة المحفوظة في بنود الفواتير.';
            if(todayProfitIncomplete) profitEl.innerText=`≈ ${FinanceModule.round(todayProfitDelivered).toLocaleString('ar-EG')} ج`;
        }
        window._currentMonthlyTransactions=monthlyTransactionsList;
        this.initChart(weeklySalesMap,weeklyDates);
        this.applyCardsVisibility();
        this.injectSettingsGearButton();
    },

    openMonthlyOperationsModal() {
        let list = window._currentMonthlyTransactions || [];
        let modal = document.getElementById('monthly-ops-modal');
        if (modal) modal.remove();

        let totalAmountSum = list.reduce((acc, curr) => acc + curr.net, 0);

        modal = document.createElement('div');
        modal.id = 'monthly-ops-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]">
                <div class="bg-slate-50 dark:bg-slate-950 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h3 class="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">📊 سجل معاملات الشهر الحالي (من يوم 1)</h3>
                    <button onclick="document.getElementById('monthly-ops-modal').remove()" class="text-rose-500 font-black text-lg px-2">✕</button>
                </div>

                <div class="p-4 bg-blue-500/10 border-b border-blue-500/20 text-xs font-bold text-blue-600 dark:text-blue-400 flex justify-between items-center shrink-0">
                    <span>إجمالي العمليات: <strong>${list.length} عملية</strong></span>
                    <span>إجمالي القيمة: <strong>${totalAmountSum.toLocaleString()} ج</strong></span>
                </div>

                <div class="p-4 overflow-y-auto space-y-2.5 flex-1 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
                    ${list.length > 0 ? list.map(item => `
                        <div class="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
                            <div>
                                <h4 class="font-black text-slate-900 dark:text-white text-xs">👤 ${item.clientName}</h4>
                                <p class="text-[10px] text-slate-400 font-bold mt-0.5">📅 التاريخ: ${item.date} | عدد البنود: ${item.itemsCount}</p>
                            </div>
                            <span class="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs font-mono">${item.net.toLocaleString()} ج</span>
                        </div>
                    `).join('') : '<div class="p-6 text-center text-xs text-slate-400 font-bold">مفيش معاملات مسجلة في هذا الشهر حتى الآن.</div>'}
                </div>

                <div class="bg-slate-50 dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
                    <button onclick="document.getElementById('monthly-ops-modal').remove()" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-5 py-2 rounded-xl text-xs font-bold">إغلاق</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    injectSettingsGearButton() {
        let existingGear = document.getElementById('dashboard-settings-gear-btn');
        if (existingGear) return;

        const gearBtn = document.createElement('button');
        gearBtn.id = 'dashboard-settings-gear-btn';
        gearBtn.className = 'fixed bottom-5 right-5 z-40 bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center font-black transition hover:scale-110 active:scale-95 border border-slate-700 dark:border-slate-200';
        gearBtn.title = "تخصيص البطاقات وإظهار/إخفاء الواجهة";
        gearBtn.innerHTML = `⚙️`;
        gearBtn.onclick = () => DashboardModule.openCardSettingsModal();

        document.body.appendChild(gearBtn);
    },

    openCardSettingsModal() {
        let modal = document.getElementById('card-settings-modal');
        if (modal) modal.remove();

        let visibility = JSON.parse(localStorage.getItem('ali_cards_visibility') || '{}');
        
        // ترتيب البطاقات القابل للتخصيص المطابق للواجهة:
        const cardsConfig = [
            { id: 'monthly-ops-card-wrapper', name: '1️⃣ عمليات الشهر (من يوم 1)' },
            { id: 'debts-card', name: '2️⃣ إجمالي الديون (بره)' },
            { id: 'advances-card', name: '3️⃣ إجمالي المقدمات (عربون)' },
            { id: 'today-sales-card', name: '4️⃣ بيعت بكام النهاردا (مستلم)' },
            { id: 'today-profit-card', name: '5️⃣ كسبت كام النهاردا (ربحي)' },
            { id: 'clients-card', name: '6️⃣ إجمالي العملاء' }
        ];

        modal = document.createElement('div');
        modal.id = 'card-settings-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
                <div class="bg-slate-50 dark:bg-slate-950 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
                    <h3 class="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">⚙️ تخصيص بطاقات الصفحة الرئيسية</h3>
                    <button onclick="document.getElementById('card-settings-modal').remove()" class="text-rose-500 font-black text-lg px-2">✕</button>
                </div>

                <div class="p-5 space-y-3">
                    <p class="text-xs text-slate-500 dark:text-slate-400 font-bold">حدد البطاقات التي ترغب في إظهارها أو إخفائها:</p>
                    <div class="space-y-2">
                        ${cardsConfig.map(card => {
                            let isChecked = visibility[card.id] !== false;
                            return `
                                <label class="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-blue-500 transition">
                                    <span class="text-xs font-black text-slate-800 dark:text-slate-200">${card.name}</span>
                                    <input type="checkbox" data-card-id="${card.id}" ${isChecked ? 'checked' : ''} class="w-4 h-4 accent-blue-600 rounded cursor-pointer">
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-950 p-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                    <button onclick="document.getElementById('card-settings-modal').remove()" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold">إلغاء</button>
                    <button onclick="DashboardModule.saveCardSettings()" class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 transition">حفظ التفضيلات 💾</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    saveCardSettings() {
        const modal = document.getElementById('card-settings-modal');
        if (!modal) return;

        const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
        let visibility = {};

        checkboxes.forEach(cb => {
            let id = cb.getAttribute('data-card-id');
            visibility[id] = cb.checked;
        });

        localStorage.setItem('ali_cards_visibility', JSON.stringify(visibility));
        modal.remove();
        this.applyCardsVisibility();
        showCustomToast("✨ تم حفظ وتطبيق إعدادات عرض البطاقات بنجاح!");
    },

    applyCardsVisibility() {
        let visibility = JSON.parse(localStorage.getItem('ali_cards_visibility') || '{}');
        
        for (const [id, isVisible] of Object.entries(visibility)) {
            let el = document.getElementById(id);
            if (el) {
                if (isVisible) {
                    el.classList.remove('hidden');
                } else {
                    el.classList.add('hidden');
                }
            }
        }
    },

    openFilteredClientsModal(type) {
        let modal = document.getElementById('filtered-clients-modal');
        if (modal) modal.remove();

        let title = '';
        let filteredList = [];

        StateModule.clientsList.forEach((client, idx) => {
            const totals = InvoiceModule.calculateClientTotals(client);
            if (type === 'debts' && totals.debt > 0) {
                filteredList.push({ client, idx, amount: totals.debt });
            } else if (type === 'advances' && totals.advance > 0) {
                filteredList.push({ client, idx, amount: totals.advance });
            } else if (type === 'todaySales' || type === 'todayProfit') {
                let clientTodaySales = 0;
                let clientTodayProfit = 0;

                if (client.invoices) {
                    client.invoices.forEach(inv => {
                        if (inv.deliveryStatus === 'delivered') {
                            let invSell = 0;
                            let invCost = 0;
                            if (inv.items) {
                                inv.items.forEach(i => {
                                    if (!i.isPayment) {
                                        const qty = parseFloat(i.qty || 1);
                                        const sell = parseFloat(i.price || 0);
                                        const cat = StateModule.catalogItems.find(c => c.name === i.name || c.code === i.code);
                                        const cost = cat ? parseFloat(cat.costPrice || cat.cost || 0) : 0;
                                        invSell += (qty * sell);
                                        invCost += (qty * cost);
                                    }
                                });
                            }
                            const disc = inv.discount || 0;
                            const discCalc = (inv.discountType === 'PERCENT') ? (invSell * disc) / 100 : disc;
                            const net = Math.max(0, invSell - discCalc);
                            clientTodaySales += net;
                            clientTodayProfit += Math.max(0, net - invCost);
                        }
                    });
                }

                if (type === 'todaySales' && clientTodaySales > 0) {
                    filteredList.push({ client, idx, amount: clientTodaySales });
                } else if (type === 'todayProfit' && clientTodayProfit > 0) {
                    filteredList.push({ client, idx, amount: clientTodayProfit });
                }
            }
        });

        if (type === 'debts') title = '📋 العملاء اللى عليهم ديون (فلوس بره)';
        else if (type === 'advances') title = '💰 العملاء اللى دافعين عربون / مقدم';
        else if (type === 'todaySales') title = '🛍️ العملاء اللى اتبعلهم (مبيعات المستلم)';
        else if (type === 'todayProfit') title = '📈 العملاء اللى اتحقق منهم مكسب (الأرباح)';

        modal = document.createElement('div');
        modal.id = 'filtered-clients-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div class="bg-slate-50 dark:bg-slate-950 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h3 class="font-black text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">${title}</h3>
                    <button onclick="document.getElementById('filtered-clients-modal').remove()" class="text-rose-500 font-black text-lg px-2">✕</button>
                </div>
                <div class="p-4 overflow-y-auto space-y-2 flex-1 bg-slate-50 dark:bg-slate-950 custom-scrollbar">
                    ${filteredList.length > 0 ? filteredList.map(item => `
                        <div onclick="ClientModule.selectClientByIndex(${item.idx})" class="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center cursor-pointer hover:border-blue-500 transition text-xs shadow-sm">
                            <div>
                                <h4 class="font-black text-slate-900 dark:text-white text-sm">👤 ${item.client.name}</h4>
                                <p class="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">${item.client.village || 'عزب القصر'}</p>
                            </div>
                            <span class="font-extrabold ${type === 'debts' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'} text-sm">${item.amount.toLocaleString()} ج</span>
                        </div>
                    `).join('') : '<div class="p-4 text-center text-xs text-slate-400 font-bold">مفيش عملاء في القائمة دي حالياً.</div>'}
                </div>
                <div class="bg-slate-50 dark:bg-slate-950 p-3 border-t border-slate-200 dark:border-slate-800 flex justify-end shrink-0">
                    <button onclick="document.getElementById('filtered-clients-modal').remove()" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-5 py-2 rounded-xl text-xs font-bold">إغلاق</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
};
