/**
 * نظام إدارة الورش والحسابات والمبيعات - عزب القصر
 * ملف الجافاسكريبت الرئيسي المحدث - حساب الـ 24 ساعة الفعلي وترتيب البطاقات
 */

// --- 1. إعدادات فايربيز (Firebase Config) ---
const firebaseConfig = {
    apiKey: "AIzaSyAZq7tcaSLqQ-zqmHigh9X3JZBERMLUN2I",
    authDomain: "alisabersystem.firebaseapp.com",
    databaseURL: "https://alisabersystem-default-rtdb.firebaseio.com/",
    projectId: "alisabersystem",
    storageBucket: "alisabersystem.firebasestorage.app",
    messagingSenderId: "940493762512",
    appId: "1:940493762512:web:4275b1d941b074c4d653d5"
};

let db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
} catch(e) {
    console.error("Firebase init error:", e);
}

// --- 2. دوال مساعدة عامة ---
function getCurrentFormattedDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function copyPhoneNumberToClipboard(phone) {
    if (!phone || phone === 'مش متسجل') {
        showCustomToast("⚠️ لا يوجد رقم تليفون مسجل لنسخه!");
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(phone).then(() => {
            showCustomToast(`📋 تم نسخ الرقم: ${phone}`);
        }).catch(() => {
            fallbackCopyText(phone);
        });
    } else {
        fallbackCopyText(phone);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCustomToast(`📋 تم نسخ الرقم: ${text}`);
        } else {
            showCustomToast(`❌ تعذر النسخ التلقائي`);
        }
    } catch (err) {
        showCustomToast(`❌ تعذر النسخ`);
    }
    document.body.removeChild(textArea);
}

function showCustomToast(message) {
    let oldToast = document.getElementById('custom-system-toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.id = 'custom-system-toast';
    toast.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-slate-900 px-6 py-3 rounded-2xl shadow-2xl z-50 text-xs font-black tracking-wide border border-slate-700/50 dark:border-slate-200/50 transition-all flex items-center gap-2';
    toast.innerHTML = `<span>${message}</span>`;
    
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast) toast.remove();
    }, 2500);
}

// --- 3. وحدة الحالة العامة (State Module) ---
const StateModule = {
    catalogItems: typeof defaultCatalogItems !== 'undefined' ? defaultCatalogItems : [],
    clientsList: [],
    currentSelectedClient: null,
    currentInvoiceIndex: 0,
    dailyChartInstance: null,
    isInitialLoaded: false,

    async initLoad() {
        if (!db) {
            this.fallbackLocalLoad();
            return;
        }

        const ref = db.ref('ali_saber_system_data');
        ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                if (data.catalogItems) this.catalogItems = data.catalogItems;
                if (data.clientsList) this.clientsList = data.clientsList;
                
                const banner = document.getElementById('firebase-status-banner');
                if (banner) {
                    banner.className = "bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-1.5 text-[11px] font-bold px-4 flex items-center justify-start gap-2";
                    const dot = document.getElementById('firebase-status-dot');
                    if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-500 shrink-0";
                    const txt = document.getElementById('firebase-status-text');
                    if (txt) txt.innerText = "متصل بقاعدة بيانات Firebase بنجاح (التحديثات سحابية وفورية)";
                }

                DashboardModule.updateFinancialDashboard();
                
                if (this.isInitialLoaded && StateModule.currentSelectedClient) {
                    const updatedIdx = StateModule.clientsList.findIndex(c => c.name === StateModule.currentSelectedClient.name);
                    if (updatedIdx >= 0) {
                        StateModule.currentSelectedClient = StateModule.clientsList[updatedIdx];
                        ClientModule.renderCardInfo(updatedIdx);
                    }
                }
                this.isInitialLoaded = true;
            } else {
                this.save();
                this.isInitialLoaded = true;
            }
        }, (error) => {
            console.error("Firebase sync error:", error);
            this.fallbackLocalLoad();
        });
    },

    fallbackLocalLoad() {
        const banner = document.getElementById('firebase-status-banner');
        if (banner) {
            banner.className = "bg-rose-500/10 border-b border-rose-500/20 text-rose-600 dark:text-rose-400 py-1.5 text-[11px] font-bold px-4 flex items-center justify-start gap-2";
            const txt = document.getElementById('firebase-status-text');
            if (txt) txt.innerText = "خطأ في الاتصال بفايربيز - تحقق من قواعد الصلاحيات (Database Rules).";
        }
        const localCat = localStorage.getItem('ali_catalog_items');
        const localCli = localStorage.getItem('ali_clients_list');
        if (localCat) this.catalogItems = JSON.parse(localCat);
        if (localCli) this.clientsList = JSON.parse(localCli);
    },

    save() {
        if (db) {
            db.ref('ali_saber_system_data').set({
                catalogItems: this.catalogItems,
                clientsList: this.clientsList,
                lastUpdated: new Date().toISOString()
            }).catch(err => console.error("Save error:", err));
        }
        localStorage.setItem('ali_catalog_items', JSON.stringify(this.catalogItems));
        localStorage.setItem('ali_clients_list', JSON.stringify(this.clientsList));
    }
};

const ThemeModule = {
    init() {
        const savedTheme = localStorage.getItem('ali_theme') || 'dark';
        if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
            this.updateUI('light');
        } else {
            document.documentElement.classList.add('dark');
            this.updateUI('dark');
        }
    },
    toggleTheme() {
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('ali_theme', 'light');
            this.updateUI('light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('ali_theme', 'dark');
            this.updateUI('dark');
        }
        if (StateModule.dailyChartInstance) {
            ChartModule.updateColors();
        }
    },
    updateUI(theme) {
        const textEl = document.getElementById('theme-text');
        if (textEl) {
            textEl.innerText = theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري';
        }
    }
};

const ClientModule = {
    selectClientByIndex(clientIndex) {
        const allClientsModal = document.getElementById('all-clients-manager-modal');
        if (allClientsModal) allClientsModal.remove();

        const filteredModal = document.getElementById('filtered-clients-modal');
        if (filteredModal) filteredModal.remove();

        if (!StateModule.clientsList || !StateModule.clientsList[clientIndex]) return;

        StateModule.currentSelectedClient = StateModule.clientsList[clientIndex];

        if (!StateModule.currentSelectedClient.invoices || StateModule.currentSelectedClient.invoices.length === 0) {
            StateModule.currentSelectedClient.invoices = [{ id: "INV-1", date: new Date().toISOString().split('T')[0], items: [], discount: 0, discountType: "EGP", advancePayment: 0, paid: 0, deliveryStatus: "delivered" }];
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
            invoices: [{ id: "INV-1", date: new Date().toISOString().split('T')[0], items: [], discount: 0, discountType: "EGP", advancePayment: 0, paid: 0, deliveryStatus: "delivered" }]
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
            label.innerText = `فاتورة #${StateModule.currentInvoiceIndex + 1} (${inv.date || 'بدون تاريخ'}) - الصافي: ${(inv.netTotal || 0).toLocaleString()} ج`;
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
            date: new Date().toISOString().split('T')[0],
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
        const val = parseFloat(valInput ? valInput.value : 0) || 0;

        const inv = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex];
        inv.discount = val;
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

    submitPaymentItemFromModal() {
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
            code: 'PAYMENT',
            name: paymentTitle,
            qty: 1,
            price: val,
            dateTime: getCurrentFormattedDateTime(),
            isPayment: true
        });

        const modal = document.getElementById('add-payment-item-modal');
        if (modal) modal.remove();

        this.renderInvoiceTable();
        this.saveAndAutoSync();
        showCustomToast(`✨ اتسجلت (${paymentTitle}) بقيمة ${val.toLocaleString()} ج وحفظت سحابياً!`);
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
        if (!StateModule.currentSelectedClient || !StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex]) return;

        const inv = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex];
        let itemsTotal = 0;
        let paymentsTotal = 0;
        
        if (inv.items) {
            inv.items.forEach(i => {
                if (i.isPayment) {
                    paymentsTotal += (i.qty * i.price);
                } else {
                    itemsTotal += (i.qty * i.price);
                }
            });
        }

        const rawDiscount = inv.discount || 0;
        const isPercent = inv.discountType === 'PERCENT';
        let discountCalculated = rawDiscount;

        if (isPercent) {
            discountCalculated = (itemsTotal * rawDiscount) / 100;
        }

        const netItemsTotal = Math.max(0, itemsTotal - discountCalculated);
        const statusEl = document.getElementById('delivery-status');

        inv.advancePayment = paymentsTotal;
        inv.paid = paymentsTotal;
        inv.deliveryStatus = statusEl ? statusEl.value : "delivered";
        inv.netTotal = netItemsTotal;

        const subTotalEl = document.getElementById('sub-total');
        if (subTotalEl) subTotalEl.innerText = `${itemsTotal.toLocaleString()} ج`;

        const paidDisplayEl = document.getElementById('total-paid-display');
        if (paidDisplayEl) paidDisplayEl.innerText = `${paymentsTotal.toLocaleString()} ج`;
        
        const remainingDue = Math.max(0, netItemsTotal - paymentsTotal);
        const netTotalEl = document.getElementById('net-total');
        if (netTotalEl) netTotalEl.innerText = `${remainingDue.toLocaleString()} ج`;

        const badge = document.getElementById('invoice-status-badge');
        if (badge) {
            const isDelivered = inv.deliveryStatus === 'delivered';

            if (isDelivered) {
                if (paymentsTotal < netItemsTotal) {
                    badge.innerText = `🔴 تسليم ناهي - عليه مديونية (متبقي: ${remainingDue.toLocaleString()} ج)`;
                    badge.className = "w-full text-center py-2 px-3 rounded-xl text-xs font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-sm";
                } else {
                    badge.innerText = `🟢 تسليم ناهي - خالص ومسدد بالكامل`;
                    badge.className = "w-full text-center py-2 px-3 rounded-xl text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm";
                }
            } else {
                badge.innerText = `🟡 لسه متسلمش - دافع عربون (${paymentsTotal.toLocaleString()} ج)`;
                badge.className = "w-full text-center py-2 px-3 rounded-xl text-xs font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm";
            }
        }

        const clientTotals = this.calculateClientTotals(StateModule.currentSelectedClient);
        const cardDebtEl = document.getElementById('client-card-debt');
        const cardAdvanceEl = document.getElementById('client-card-advance');
        if (cardDebtEl) cardDebtEl.innerText = `${clientTotals.debt.toLocaleString()} ج`;
        if (cardAdvanceEl) cardAdvanceEl.innerText = `${clientTotals.advance.toLocaleString()} ج`;
        
        this.renderClientInvoicesDropdown();
    },

    calculateClientTotals(client) {
        let totalDebt = 0;
        let totalAdvance = 0;

        if (client.invoices) {
            client.invoices.forEach(inv => {
                let sub = 0;
                let paid = 0;
                if (inv.items) {
                    inv.items.forEach(i => {
                        if (i.isPayment) paid += (i.qty * i.price);
                        else sub += (i.qty * i.price);
                    });
                }
                
                const rawDiscount = inv.discount || 0;
                const discountCalculated = (inv.discountType === 'PERCENT') ? (sub * rawDiscount) / 100 : rawDiscount;
                const net = Math.max(0, sub - discountCalculated);

                if (inv.deliveryStatus === 'delivered') {
                    if (paid < net) totalDebt += (net - paid);
                    else if (paid > net) totalAdvance += (paid - net);
                } else {
                    totalAdvance += paid;
                }
            });
        }

        return { debt: totalDebt, advance: totalAdvance };
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
        item.qty = parseFloat(val) || 0;
        this.saveAndAutoSync();
    },

    updateItemPrice(idx, val) {
        if (!StateModule.currentSelectedClient || !StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex]) return;
        const item = StateModule.currentSelectedClient.invoices[StateModule.currentInvoiceIndex].items[idx];
        item.price = parseFloat(val) || 0;
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
const InvoiceShareModule = {
    openCleanShareModal() {
        if (!StateModule.currentSelectedClient) {
            ClientModule.openAllClientsModal();
            return;
        }

        const client = StateModule.currentSelectedClient;
        const inv = client.invoices[StateModule.currentInvoiceIndex];
        if (!inv) return;

        let modal = document.getElementById('clean-invoice-preview-modal');
        if (modal) modal.remove();

        let itemsHtml = '';
        let subTotal = 0;

        if (inv.items && inv.items.length > 0) {
            inv.items.forEach((item, idx) => {
                const lineTot = item.qty * item.price;
                if (!item.isPayment) subTotal += lineTot;
                itemsHtml += `
                    <tr style="border-bottom: 1px solid #e2e8f0; text-align: right;">
                        <td style="padding: 8px; font-size: 12px;">${idx + 1}</td>
                        <td style="padding: 8px; font-size: 12px; font-weight: bold;">${item.name} ${item.isPayment ? '(دفعة/مقدم)' : ''}</td>
                        <td style="padding: 8px; font-size: 12px; text-align: center;">${item.qty}</td>
                        <td style="padding: 8px; font-size: 12px; text-align: center;">${item.price.toLocaleString()} ج</td>
                        <td style="padding: 8px; font-size: 12px; text-align: left; font-weight: bold;">${lineTot.toLocaleString()} ج</td>
                    </tr>
                `;
            });
        } else {
            itemsHtml = `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #64748b;">مفيش أصناف مسجلة في الفاتورة دي.</td></tr>`;
        }

        const rawDiscount = inv.discount || 0;
        const discountCalc = (inv.discountType === 'PERCENT') ? (subTotal * rawDiscount) / 100 : rawDiscount;
        const netAfterDisc = Math.max(0, subTotal - discountCalc);
        
        let totalPaid = 0;
        if (inv.items) {
            inv.items.forEach(i => {
                if (i.isPayment) totalPaid += (i.qty * i.price);
            });
        }
        const remainingDue = Math.max(0, netAfterDisc - totalPaid);

        modal = document.createElement('div');
        modal.id = 'clean-invoice-preview-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto';

        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[95vh]">
                <div class="bg-slate-50 dark:bg-slate-950 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h3 class="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">📄 معاينة وطباعة الفاتورة الاحترافية</h3>
                    <button onclick="document.getElementById('clean-invoice-preview-modal').remove()" class="text-rose-500 font-black text-lg px-2">✕</button>
                </div>

                <div id="printable-invoice-area" class="p-6 overflow-y-auto space-y-6 flex-1 bg-white text-slate-950 font-sans custom-scrollbar" dir="rtl">
                    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px;">
                        <h1 style="font-size: 20px; font-weight: 900; margin: 0; color: #0f172a;">ALI SABER SYSTEM</h1>
                        <p style="font-size: 11px; font-weight: bold; color: #475569; margin: 4px 0;">إدارة الورش والحسابات والمبيعات • عزب القصر</p>
                        <p style="font-size: 10px; color: #64748b; margin: 0;">تاريخ الفاتورة: ${inv.date || '---'} | فاتورة رقم: #${StateModule.currentInvoiceIndex + 1}</p>
                    </div>

                    <div style="display: flex; justify-content: space-between; font-size: 12px; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <div>
                            <strong>اسم العميل:</strong> ${client.name}<br>
                            <strong>التليفون:</strong> ${client.phone || 'مش متسجل'}
                        </div>
                        <div style="text-align: left;">
                            <strong>القرية:</strong> ${client.village || 'عزب القصر'}<br>
                            <strong>حالة التسليم:</strong> ${inv.deliveryStatus === 'delivered' ? '🟢 مسلّم' : '🟡 شغالين فيه'}
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background: #0f172a; color: white; text-align: right; font-size: 11px;">
                                <th style="padding: 8px; border-top-right-radius: 8px;">#</th>
                                <th style="padding: 8px;">اسم الصنف / البند</th>
                                <th style="padding: 8px; text-align: center;">الكمية</th>
                                <th style="padding: 8px; text-align: center;">السعر</th>
                                <th style="padding: 8px; text-align: left; border-top-left-radius: 8px;">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                            <span>حساب الأصناف الإجمالي:</span>
                            <strong>${subTotal.toLocaleString()} ج</strong>
                        </div>
                        ${rawDiscount > 0 ? `
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #e11d48;">
                            <span>الخصم (${rawDiscount}${inv.discountType === 'PERCENT' ? '%' : ' ج'}):</span>
                            <strong>- ${discountCalc.toLocaleString()} ج</strong>
                        </div>` : ''}
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-weight: bold;">
                            <span>الصافي المطلوب:</span>
                            <span>${netAfterDisc.toLocaleString()} ج</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #059669;">
                            <span>المبلغ المدفوع / العربون:</span>
                            <strong>${totalPaid.toLocaleString()} ج</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; font-weight: 900; background: #f1f5f9; padding: 8px 12px; border-radius: 8px; margin-top: 5px; color: ${remainingDue > 0 ? '#e11d48' : '#059669'};">
                            <span>المتبقي (الديون):</span>
                            <span>${remainingDue.toLocaleString()} ج</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                        شكراً لتعاملكم مع ALI SABER SYSTEM • عزب القصر
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2 shrink-0 flex-wrap">
                    <div class="flex items-center gap-2">
                        <button onclick="InvoiceShareModule.printInvoiceClean()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md">
                            <i data-lucide="printer" class="w-4 h-4"></i> طباعة الفاتورة 🖨️
                        </button>
                        <button onclick="InvoiceShareModule.shareInvoiceWhatsApp()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md">
                            <i data-lucide="message-circle" class="w-4 h-4"></i> مشاركة واتساب 💬
                        </button>
                    </div>
                    <button onclick="document.getElementById('clean-invoice-preview-modal').remove()" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold">إغلاق</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        lucide.createIcons();
    },

    printInvoiceClean() {
        const printContent = document.getElementById('printable-invoice-area').innerHTML;
        const originalContent = document.body.innerHTML;

        document.body.innerHTML = `<div dir="rtl" style="padding: 20px; font-family: 'Cairo', sans-serif;">${printContent}</div>`;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    },

    shareInvoiceWhatsApp() {
        if (!StateModule.currentSelectedClient) return;
        const client = StateModule.currentSelectedClient;
        const inv = client.invoices[StateModule.currentInvoiceIndex];
        
        let text = `*فاتورة حساب ومبيعات - ALI SABER SYSTEM* (عزب القصر)%0A`;
        text += `-----------------------------------%0A`;
        text += `👤 *العميل:* ${client.name}%0A`;
        text += `📅 *التاريخ:* ${inv.date || '---'}%0A`;
        text += `-----------------------------------%0A`;
        
        if (inv.items && inv.items.length > 0) {
            inv.items.forEach(i => {
                text += `• ${i.name} (${i.qty} × ${i.price}ج) = ${(i.qty * i.price).toLocaleString()}ج%0A`;
            });
        }
        
        let sub = inv.netTotal || 0;
        text += `-----------------------------------%0A`;
        text += `💰 *الصافي المطلوب:* ${sub.toLocaleString()} جنيه%0A`;
        text += `📞 للتواصل والاستفسار: ${client.phone || ''}%0A`;

        const rawPhone = (client.phone || '').replace(/\D/g, '');
        const waUrl = rawPhone ? `https://wa.me/2${rawPhone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, '_blank');
    }
};

const PaymentModule = {
    openPaymentModal() {
        alert("الدفع السريع متاح.");
    }
};

// --- 5. وحدة الداشبورد والتحليلات الجوهرية (DashboardModule) ---
const DashboardModule = {
    initChart(dailySalesData = [0,0,0,0,0,0,0]) {
        const chartEl = document.getElementById('dailyWorkChart');
        if (!chartEl) return;
        const ctx = chartEl.getContext('2d');
        const isDark = document.documentElement.classList.contains('dark');
        
        if (StateModule.dailyChartInstance) {
            StateModule.dailyChartInstance.data.datasets[0].data = dailySalesData;
            StateModule.dailyChartInstance.update();
            return;
        }

        StateModule.dailyChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
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
        let globalDebts = 0;
        let globalAdvances = 0;
        let todaySalesDelivered = 0;
        let todayProfitDelivered = 0;
        let monthlyOpsCount = 0;
        let monthlyOpsAmount = 0;
        let monthlyTransactionsList = [];

        const now = new Date();
        const currentTimeMs = now.getTime();
        const todayStr = now.toISOString().split('T')[0];
        const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

        const weeklySalesMap = [0, 0, 0, 0, 0, 0, 0];

        StateModule.clientsList.forEach(c => {
            const totals = InvoiceModule.calculateClientTotals(c);
            globalDebts += totals.debt;
            globalAdvances += totals.advance;

            if (c.invoices) {
                c.invoices.forEach(inv => {
                    const isDelivered = (inv.deliveryStatus === 'delivered');
                    
                    // الفحص الدقيق لآخر 24 ساعة فعلياً (بالساعة والدقيقة)
                    let isWithinLast24Hours = (inv.date === todayStr);

                    if (inv.items && inv.items.length > 0) {
                        inv.items.forEach(i => {
                            if (i.dateTime) {
                                try {
                                    const itemTimeMs = new Date(i.dateTime.replace(' ', 'T')).getTime();
                                    if (!isNaN(itemTimeMs)) {
                                        const diffHours = (currentTimeMs - itemTimeMs) / (1000 * 60 * 60);
                                        if (diffHours >= 0 && diffHours <= 24) {
                                            isWithinLast24Hours = true;
                                        }
                                    }
                                } catch(e) {}
                            }
                        });
                    }

                    // حساب عمليات الشهر الحالي (من يوم 1)
                    const isCurrentMonth = (inv.date && inv.date >= monthStartStr);
                    if (isCurrentMonth && isDelivered) {
                        let invItemsSell = 0;
                        if (inv.items) {
                            inv.items.forEach(i => {
                                if (!i.isPayment) {
                                    invItemsSell += (parseFloat(i.qty || 1) * parseFloat(i.price || 0));
                                }
                            });
                        }
                        const rawDisc = inv.discount || 0;
                        const discCalc = (inv.discountType === 'PERCENT') ? (invItemsSell * rawDisc) / 100 : rawDisc;
                        const netInv = Math.max(0, invItemsSell - discCalc);
                        
                        monthlyOpsCount++;
                        monthlyOpsAmount += netInv;
                        monthlyTransactionsList.push({
                            clientName: c.name,
                            date: inv.date,
                            net: netInv,
                            itemsCount: (inv.items || []).filter(i => !i.isPayment).length
                        });
                    }

                    if (isDelivered) {
                        let invItemsCost = 0;
                        let invItemsSell = 0;

                        if (inv.items) {
                            inv.items.forEach(i => {
                                if (!i.isPayment) {
                                    const qty = parseFloat(i.qty || 1);
                                    const sellPrice = parseFloat(i.price || 0);
                                    const catItem = StateModule.catalogItems.find(cat => cat.name === i.name || cat.code === i.code);
                                    const costPrice = catItem ? parseFloat(catItem.costPrice || catItem.cost || 0) : 0;

                                    invItemsSell += (qty * sellPrice);
                                    invItemsCost += (qty * costPrice);
                                }
                            });
                        }

                        const rawDiscount = inv.discount || 0;
                        const discountCalc = (inv.discountType === 'PERCENT') ? (invItemsSell * rawDiscount) / 100 : rawDiscount;
                        const netInvoiceSales = Math.max(0, invItemsSell - discountCalc);

                        if (isWithinLast24Hours) {
                            todaySalesDelivered += netInvoiceSales;
                            todayProfitDelivered += Math.max(0, netInvoiceSales - invItemsCost);
                        }

                        try {
                            const invDateObj = new Date(inv.date);
                            if (!isNaN(invDateObj.getTime())) {
                                const dayOfWeek = invDateObj.getDay();
                                weeklySalesMap[dayOfWeek] += netInvoiceSales;
                            }
                        } catch(e) {}
                    }
                });
            }
        });

        const debtsEl = document.getElementById('total-debts');
        if (debtsEl) debtsEl.innerText = `${globalDebts.toLocaleString()} ج`;

        const advancesEl = document.getElementById('total-advances');
        if (advancesEl) advancesEl.innerText = `${globalAdvances.toLocaleString()} ج`;

        const clientsEl = document.getElementById('total-clients-count');
        if (clientsEl) clientsEl.innerText = `${StateModule.clientsList.length} عميل`;

        const todaySalesEl = document.getElementById('today-sales-delivered');
        if (todaySalesEl) todaySalesEl.innerText = `${todaySalesDelivered.toLocaleString()} ج`;

        const todayProfitEl = document.getElementById('today-profit-delivered');
        if (todayProfitEl) todayProfitEl.innerText = `${todayProfitDelivered.toLocaleString()} ج`;

        const monthlyCountEl = document.getElementById('monthly-ops-count');
        if (monthlyCountEl) monthlyCountEl.innerText = `${monthlyOpsCount} عملية`;

        const monthlyAmountEl = document.getElementById('monthly-ops-amount');
        if (monthlyAmountEl) monthlyAmountEl.innerText = `${monthlyOpsAmount.toLocaleString()} ج`;

        window._currentMonthlyTransactions = monthlyTransactionsList;

        this.initChart(weeklySalesMap);
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

const ChartModule = {
    updateColors() {
        if (!StateModule.dailyChartInstance) return;
        const isDark = document.documentElement.classList.contains('dark');
        StateModule.dailyChartInstance.options.scales.x.grid.color = isDark ? '#1e293b' : '#e2e8f0';
        StateModule.dailyChartInstance.options.scales.x.ticks.color = isDark ? '#94a3b8' : '#64748b';
        StateModule.dailyChartInstance.options.scales.y.grid.color = isDark ? '#1e293b' : '#e2e8f0';
        StateModule.dailyChartInstance.options.scales.y.ticks.color = isDark ? '#94a3b8' : '#64748b';
        StateModule.dailyChartInstance.update();
    }
};

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function exportSystemBackup() {
    const backupData = {
        version: "3.0",
        exportDate: new Date().toISOString(),
        catalogItems: StateModule.catalogItems,
        clientsList: StateModule.clientsList
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `AliSaber_System_Firebase_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showCustomToast("تم تنزيل النسخة الاحتياطية بنجاح!");
}

function importSystemBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.catalogItems && data.clientsList) {
                StateModule.catalogItems = data.catalogItems;
                StateModule.clientsList = data.clientsList;
                StateModule.save();
                
                DashboardModule.updateFinancialDashboard();
                
                showCustomToast("تم رفع بيانات النسخة الاحتياطية على السحابة بنجاح!");
            } else {
                alert("الملف غير صالح.");
            }
        } catch(err) {
            alert("حدث خطأ أثناء قراءة الملف.");
        }
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', async () => {
    await StateModule.initLoad();
    ThemeModule.init();
    lucide.createIcons();
    DashboardModule.updateFinancialDashboard();
});