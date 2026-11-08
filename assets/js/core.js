/**
 * نظام إدارة الورش والحسابات والمبيعات - عزب القصر
 * ملف الجافاسكريبت الرئيسي المحدث - حساب الـ 24 ساعة الفعلي وترتيب البطاقات
 */

// --- Firebase initialization (shared configuration) ---
let db;
try {
    if (!window.firebase) throw new Error('Firebase SDK غير محمل');
    if (!firebase.apps.length) firebase.initializeApp(window.AliFirebaseConfig);
    db = firebase.database();
} catch (e) {
    console.error('Firebase init error:', e);
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
    _syncedRootJSON: null,
    _localDirty: false,
    _remoteConflict: false,
    _savePromise: null,
    _saveRequested: false,

    stableJSON(value) {
        const normalize = v => {
            if (Array.isArray(v)) return v.map(normalize);
            if (v && typeof v === 'object') return Object.keys(v).sort().reduce((o, k) => { o[k] = normalize(v[k]); return o; }, {});
            return v === undefined ? null : v;
        };
        return JSON.stringify(normalize(value));
    },

    async initLoad() {
        if (!db) {
            this.fallbackLocalLoad();
            return;
        }

        const ref = db.ref('ali_saber_system_data');
        db.ref('.info/connected').on('value', snapshot => {
            const connected = snapshot.val() === true;
            const banner = document.getElementById('firebase-status-banner');
            const text = document.getElementById('firebase-status-text');
            const dot = document.getElementById('firebase-status-dot');
            if (banner && text && dot) {
                banner.className = connected ? 'bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-600 dark:text-emerald-400 py-1.5 text-[11px] font-bold px-4 flex items-center justify-start gap-2' : 'bg-amber-500/10 border-b border-amber-500/20 text-amber-600 dark:text-amber-400 py-1.5 text-[11px] font-bold px-4 flex items-center justify-start gap-2';
                text.innerText = connected ? 'الاتصال السحابي نشط' : 'الاتصال السحابي غير متاح حالياً';
                dot.className = connected ? 'w-2 h-2 rounded-full bg-emerald-500 shrink-0' : 'w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0';
            }
        });
        ref.on('value', (snapshot) => {
            const data = snapshot.val() || {};
            const incomingOwned = this.stableJSON({ catalogItems: data.catalogItems ?? null, clientsList: data.clientsList ?? null });
            const localOwned = this.stableJSON({ catalogItems: this.catalogItems, clientsList: this.clientsList });

            // Do not silently replace unsaved local edits with a remote device's changes.
            if (this._localDirty && incomingOwned !== this._syncedRootJSON && incomingOwned !== localOwned) {
                this._remoteConflict = true;
                const status = document.getElementById('firebase-status-text');
                if (status) status.innerText = 'تعارض تعديل: تغيرت البيانات من جهاز آخر. احتفظنا بالتعديلات الحالية؛ أعد تحميل الصفحة بعد مراجعة التغييرات.';
                return;
            }

            this._syncedRootJSON = incomingOwned;
            if (this._localDirty && incomingOwned === localOwned) this._localDirty = false;
            if (!this._localDirty) {
                if (Array.isArray(data.catalogItems)) this.catalogItems = data.catalogItems;
                if (Array.isArray(data.clientsList)) this.clientsList = data.clientsList;
            }
            DashboardModule.updateFinancialDashboard();
            if (this.isInitialLoaded && StateModule.currentSelectedClient) {
                const updatedIdx = StateModule.clientsList.findIndex(c => c.id && StateModule.currentSelectedClient.id ? c.id === StateModule.currentSelectedClient.id : c.name === StateModule.currentSelectedClient.name);
                if (updatedIdx >= 0) {
                    StateModule.currentSelectedClient = StateModule.clientsList[updatedIdx];
                    ClientModule.renderCardInfo(updatedIdx);
                }
            }
            this.isInitialLoaded = true;
            if (!snapshot.exists() && !this._initializingEmptyDatabase) {
                this._initializingEmptyDatabase = true;
                this.save().finally(() => { this._initializingEmptyDatabase = false; });
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
        try { if (localCat) this.catalogItems = JSON.parse(localCat); } catch (e) { console.error('Local catalog snapshot is invalid', e); }
        try { if (localCli) this.clientsList = JSON.parse(localCli); } catch (e) { console.error('Local clients snapshot is invalid', e); }
    },

    async save() {
        // Local snapshots are recovery aids; Firebase remains the source of truth.
        try {
            localStorage.setItem('ali_catalog_items', JSON.stringify(this.catalogItems));
            localStorage.setItem('ali_clients_list', JSON.stringify(this.clientsList));
        } catch (storageError) {
            console.warn('Local snapshot could not be written:', storageError);
        }
        if (!db) return false;
        if (this._savePromise) { this._saveRequested = true; return this._savePromise; }

        this._localDirty = true;
        this._savePromise = (async () => {
            try {
                let allSaved = true;
                do {
                    this._saveRequested = false;
                    const expected = this._syncedRootJSON;
                    let conflictDetected = false;
                    const result = await db.ref('ali_saber_system_data').transaction(current => {
                        const remote = current || {};
                        const remoteOwned = this.stableJSON({ catalogItems: remote.catalogItems ?? null, clientsList: remote.clientsList ?? null });
                        if (expected !== null && remoteOwned !== expected) { conflictDetected = true; return; }
                        return { ...remote, catalogItems: this.catalogItems, clientsList: this.clientsList, lastUpdated: new Date().toISOString() };
                    }, undefined, false);
                    if (!result.committed) {
                        this._remoteConflict = conflictDetected;
                        const text = document.getElementById('firebase-status-text');
                        if (text) text.innerText = conflictDetected ? 'لم يتم الحفظ: البيانات تغيرت على جهاز آخر. أعد تحميل الصفحة لمزامنة آخر نسخة.' : 'لم يتم اعتماد الحفظ السحابي؛ تحقق من صلاحيات Firebase والاتصال.';
                        allSaved = false;
                        break;
                    }
                    const saved = result.snapshot.val() || {};
                    this._syncedRootJSON = this.stableJSON({ catalogItems: saved.catalogItems ?? null, clientsList: saved.clientsList ?? null });
                    this._remoteConflict = false;
                } while (this._saveRequested);
                this._localDirty = !allSaved;
                const text = document.getElementById('firebase-status-text');
                if (text && allSaved) text.innerText = 'تم حفظ التغييرات ومزامنتها سحابياً';
                return allSaved;
            } catch (err) {
                console.error('Firebase save error:', err);
                const text = document.getElementById('firebase-status-text');
                if (text) text.innerText = 'تعذر الحفظ السحابي؛ توجد نسخة محلية مؤقتة';
                return false;
            } finally { this._savePromise = null; }
        })();
        return this._savePromise;
    }
};
