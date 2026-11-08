/**
 * Tenant-aware Firebase Authentication gate.
 * Resolves the signed-in user through userTenantIndex + tenantMemberships.
 * No legacy userRoles fallback is allowed: it could bypass tenant isolation.
 */
const AuthModule = {
    auth: null,
    currentUser: null,
    currentRole: null,
    tenantId: null,
    membership: null,
    _ready: null,

    init() {
        if (!window.firebase?.auth || !window.firebase?.database) {
            throw new Error('Firebase Authentication / Realtime Database SDK غير محمل');
        }
        if (!firebase.apps.length) firebase.initializeApp(window.AliFirebaseConfig);
        this.auth = firebase.auth();
        if (!this._ready) {
            this._ready = new Promise(resolve => {
                const unsubscribe = this.auth.onAuthStateChanged(async user => {
                    this.currentUser = user || null;
                    this._accessError = '';
                    this.currentRole = null;
                    this.tenantId = null;
                    this.membership = null;
                    if (user) {
                        try { await this.resolveTenantAccess(user); }
                        catch (error) { this._accessError = error.message || 'تعذر التحقق من عضوية الورشة.'; console.error('Tenant access resolution failed:', error); }
                    }
                    this.renderGate(this._accessError || '');
                    resolve(this.state());
                    unsubscribe?.();
                });
            });
        }
        return this._ready;
    },

    state() {
        return { user: this.currentUser, role: this.currentRole, tenantId: this.tenantId, membership: this.membership };
    },

    async resolveTenantAccess(user) {
        const db = firebase.database();
        const indexSnap = await db.ref(`userTenantIndex/${user.uid}`).once('value');
        const index = indexSnap.val() || {};
        const allowedRoles = ['owner', 'admin', 'editor', 'viewer'];

        // Support both index formats already found in Staging:
        // 1) legacy: userTenantIndex/{uid}/{tenantId} = "{tenantId}"
        // 2) current: userTenantIndex/{uid}/{tenantId} = { tenantId, active, role }
        // The membership record remains authoritative for active state and role.
        const indexedEntries = Object.entries(index).filter(([tenantId, item]) => {
            if (typeof item === 'string') return item === tenantId;
            return Boolean(item && typeof item === 'object' &&
                item.tenantId === tenantId && item.active === true &&
                allowedRoles.includes(item.role));
        });

        if (indexedEntries.length === 0) {
            throw new Error('الحساب مسجل، لكن لا توجد له إحالة صحيحة إلى ورشة. اطلب من مدير المنصة مراجعة userTenantIndex وعضوية الورشة.');
        }
        if (indexedEntries.length > 1) {
            throw new Error('هذا الحساب مرتبط بأكثر من ورشة. يلزم اختيار الورشة قبل الدخول؛ لم يتم فتح أي بيانات تلقائياً.');
        }

        const [tenantId, indexValue] = indexedEntries[0];
        const [membershipSnap, profileSnap] = await Promise.all([
            db.ref(`tenantMemberships/${tenantId}/${user.uid}`).once('value'),
            db.ref(`tenants/${tenantId}/profile`).once('value')
        ]);
        const membership = membershipSnap.val();
        if (!membership || membership.active !== true || !allowedRoles.includes(membership.role)) {
            throw new Error('تم العثور على إحالة الورشة، لكن سجل tenantMemberships غير نشط أو يحتوي على دور غير صالح.');
        }
        if (indexValue && typeof indexValue === 'object' && indexValue.role !== membership.role) {
            throw new Error('دور المستخدم في userTenantIndex لا يطابق tenantMemberships. شغّل أداة فحص وإصلاح Firebase.');
        }
        if (!profileSnap.exists()) {
            throw new Error('تم العثور على العضوية، لكن ملف الورشة غير متاح. راجع حالة الورشة وإعدادات قاعدة البيانات.');
        }

        this.tenantId = tenantId;
        this.membership = membership;
        this.currentRole = membership.role;
        return this.state();
    },

    dataRef() {
        if (!this.tenantId || !this.currentUser || !this.currentRole) {
            throw new Error('لم يتم تحديد ورشة نشطة لهذا الحساب.');
        }
        return firebase.database().ref(`tenants/${this.tenantId}/workshopData`);
    },

    async requireAccess() {
        await this.init();
        if (!this.currentUser) {
            this.renderGate();
            return false;
        }
        if (!this.currentRole || !this.tenantId) {
            this.renderGate(this._accessError || 'الحساب غير مرتبط بورشة نشطة. تواصل مع مدير المنصة.');
            return false;
        }
        return true;
    },

    renderGate(message = '') {
        const existing = document.getElementById('firebase-auth-gate');
        if (existing) {
            const msg = existing.querySelector('#auth-message');
            if (msg && message) msg.textContent = message;
            return;
        }
        if (this.currentUser && this.currentRole && this.tenantId) return;

        const gate = document.createElement('div');
        gate.id = 'firebase-auth-gate';
        gate.className = 'fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/95';
        gate.innerHTML = `
          <section dir="rtl" class="w-full max-w-md rounded-3xl bg-white text-slate-900 p-6 shadow-2xl">
            <div class="text-center mb-6">
              <div class="mx-auto mb-3 w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl">🔐</div>
              <h1 class="text-xl font-black">Ali Saber System</h1>
              <p class="text-sm text-slate-500 mt-1">تسجيل الدخول الآمن إلى نظام الورشة</p>
            </div>
            <div id="auth-message" role="alert" class="text-xs font-bold text-rose-600 mb-3">${this.escape(message)}</div>
            <form id="firebase-login-form" class="space-y-3">
              <label class="block text-xs font-bold">البريد الإلكتروني
                <input id="auth-email" type="email" autocomplete="username" required class="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="name@example.com">
              </label>
              <label class="block text-xs font-bold">كلمة المرور
                <input id="auth-password" type="password" autocomplete="current-password" required minlength="6" class="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="كلمة المرور">
              </label>
              <button id="auth-submit" class="w-full rounded-xl bg-indigo-600 text-white p-3 font-black text-sm" type="submit">تسجيل الدخول</button>
            </form>
            <p class="text-[11px] text-slate-500 mt-4 text-center">يتم التحقق من عضوية الورشة وحالتها قبل تحميل أي بيانات.</p><p class="text-[10px] text-slate-400 mt-2 text-center" dir="ltr">Firebase: ${this.escape(window.AliFirebaseConfig?.projectId || "unknown")}</p>
          </section>`;
        document.body.appendChild(gate);
        gate.querySelector('#firebase-login-form').addEventListener('submit', async event => {
            event.preventDefault();
            const button = gate.querySelector('#auth-submit');
            const msg = gate.querySelector('#auth-message');
            button.disabled = true;
            button.textContent = 'جارٍ التحقق...';
            msg.textContent = '';
            try {
                const credential = await this.auth.signInWithEmailAndPassword(
                    gate.querySelector('#auth-email').value.trim(),
                    gate.querySelector('#auth-password').value
                );
                await this.resolveTenantAccess(credential.user);
                gate.remove();
                location.reload();
            } catch (error) {
                console.error('Authentication / membership check failed:', error);
                this._accessError = error.message;
                msg.textContent = this.describeLoginFailure(error);
                msg.dataset.errorCode = error.code || 'application/unknown';
                if (this.auth.currentUser && !this.tenantId) await this.auth.signOut();
                button.disabled = false;
                button.textContent = 'تسجيل الدخول';
            }
        });
    },

    async signOut() {
        if (this.auth) await this.auth.signOut();
        location.reload();
    },

    canWrite() {
        return ['owner', 'admin', 'editor'].includes(this.currentRole);
    },

    escape(value) {
        return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    },

    describeLoginFailure(error) {
        const code = String(error?.code || '');
        const map = {
            'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
            'auth/user-disabled': 'حساب Firebase هذا معطّل. راجع المستخدمين في Authentication.',
            'auth/user-not-found': 'هذا البريد غير مسجل في مشروع Firebase الحالي (Staging).',
            'auth/wrong-password': 'كلمة المرور غير صحيحة لهذا الحساب.',
            'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة، أو أن الحساب غير موجود في مشروع Staging.',
            'auth/invalid-login-credentials': 'بيانات الدخول غير صحيحة. تأكد أن الحساب أُنشئ في مشروع Staging نفسه.',
            'auth/too-many-requests': 'تم إيقاف المحاولات مؤقتاً لكثرتها. انتظر ثم حاول مجدداً.',
            'auth/network-request-failed': 'تعذر الاتصال بخدمة Firebase Authentication. تحقق من الإنترنت.',
            'auth/operation-not-allowed': 'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في Firebase Authentication.',
            'auth/invalid-api-key': 'مفتاح Firebase API غير صالح أو لا يخص المشروع المحدد.',
            'auth/app-not-authorized': 'هذا النطاق غير مصرح له في Firebase Authentication. أضف نطاق GitHub Pages إلى Authorized domains.',
            'auth/unauthorized-domain': 'نطاق الموقع غير مضاف إلى Firebase Authentication > Settings > Authorized domains.',
            'auth/email-not-verified': 'يجب تأكيد البريد الإلكتروني قبل تسجيل الدخول.',
            'PERMISSION_DENIED': 'تم تسجيل الدخول، لكن Firebase رفض قراءة سجل عضوية الورشة. راجع نشر قواعد Realtime Database.',
            'permission_denied': 'تم تسجيل الدخول، لكن Firebase رفض قراءة سجل عضوية الورشة. راجع نشر قواعد Realtime Database.'
        };
        if (map[code]) return map[code];
        if (error?.message) return `تعذر إكمال الدخول: ${error.message}`;
        return `تعذر إكمال الدخول (رمز الخطأ: ${code || 'غير متاح'}). مشروع Firebase: ${window.AliFirebaseConfig?.projectId || 'غير معروف'}. افتح Console لمعرفة التفاصيل.`;
    },

    authError(error) {
        return this.describeLoginFailure(error);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try { AuthModule.init().catch(error => console.error('Auth initialization failed:', error)); }
    catch (error) { console.error(error); }
});
