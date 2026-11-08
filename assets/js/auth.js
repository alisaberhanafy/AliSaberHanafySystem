/**
 * Firebase Authentication gate.
 * Public self-registration is intentionally disabled. Accounts are provisioned
 * in Firebase Console and assigned roles in the protected userRoles path.
 */
const AuthModule = {
    auth: null,
    currentUser: null,
    currentRole: null,
    _ready: null,

    init() {
        if (!window.firebase?.auth) throw new Error('Firebase Authentication SDK غير محمل');
        this.auth = firebase.auth();
        if (!this._ready) {
            this._ready = new Promise(resolve => {
                this.auth.onAuthStateChanged(async user => {
                    this.currentUser = user || null;
                    this.currentRole = null;
                    if (user) {
                        try {
                            const roleSnap = await firebase.database().ref(`userRoles/${user.uid}`).once('value');
                            const roleData = roleSnap.val() || {};
                            if (roleData.active === true && ['owner', 'admin', 'editor', 'viewer'].includes(roleData.role)) {
                                this.currentRole = roleData.role;
                            }
                        } catch (error) {
                            console.error('Unable to load user role:', error);
                        }
                    }
                    resolve({ user: this.currentUser, role: this.currentRole });
                    this.renderGate();
                });
            });
        }
        return this._ready;
    },

    async requireAccess() {
        const state = await this.init();
        if (!state.user) {
            this.renderGate();
            return false;
        }
        if (!state.role) {
            this.renderGate('حسابك غير مفعل داخل النظام. تواصل مع مالك النظام لتعيين صلاحية.');
            return false;
        }
        return true;
    },

    renderGate(message = '') {
        if (document.getElementById('firebase-auth-gate')) return;
        if (this.currentUser && this.currentRole) return;

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
            <div id="auth-message" class="text-xs font-bold text-rose-600 mb-3">${this.escape(message)}</div>
            <form id="firebase-login-form" class="space-y-3">
              <label class="block text-xs font-bold">البريد الإلكتروني
                <input id="auth-email" type="email" autocomplete="username" required class="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="name@example.com">
              </label>
              <label class="block text-xs font-bold">كلمة المرور
                <input id="auth-password" type="password" autocomplete="current-password" required minlength="6" class="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="كلمة المرور">
              </label>
              <button id="auth-submit" class="w-full rounded-xl bg-indigo-600 text-white p-3 font-black text-sm" type="submit">تسجيل الدخول</button>
            </form>
            <p class="text-[11px] text-slate-500 mt-4 text-center">إنشاء الحسابات يتم من لوحة Firebase بواسطة مالك النظام فقط.</p>
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
                await this.auth.signInWithEmailAndPassword(
                    gate.querySelector('#auth-email').value.trim(),
                    gate.querySelector('#auth-password').value
                );
                const roleSnap = await firebase.database().ref(`userRoles/${this.auth.currentUser.uid}`).once('value');
                const role = roleSnap.val() || {};
                if (role.active !== true || !['owner', 'admin', 'editor', 'viewer'].includes(role.role)) {
                    await this.auth.signOut();
                    msg.textContent = 'تم التحقق من الحساب، لكن لم يتم تفعيله أو تعيين صلاحية له.';
                    button.disabled = false;
                    button.textContent = 'تسجيل الدخول';
                    return;
                }
                this.currentUser = this.auth.currentUser;
                this.currentRole = role.role;
                gate.remove();
                location.reload();
            } catch (error) {
                console.error('Authentication failed:', error);
                msg.textContent = this.authError(error);
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

    authError(error) {
        const map = {
            'auth/invalid-email': 'صيغة البريد الإلكتروني غير صحيحة.',
            'auth/user-disabled': 'هذا الحساب معطل.',
            'auth/user-not-found': 'لا يوجد حساب بهذا البريد.',
            'auth/wrong-password': 'كلمة المرور غير صحيحة.',
            'auth/invalid-credential': 'بيانات الدخول غير صحيحة.',
            'auth/too-many-requests': 'محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.',
            'auth/network-request-failed': 'تعذر الاتصال بخدمة تسجيل الدخول.'
        };
        return map[error?.code] || 'تعذر تسجيل الدخول. راجع بيانات الحساب وإعدادات Firebase Authentication.';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try { AuthModule.init(); }
    catch (error) { console.error(error); }
});
