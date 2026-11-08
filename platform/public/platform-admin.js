(() => {
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.AliFirebaseConfig);
  const auth = firebase.auth();
  const db = firebase.database();
  const $ = id => document.getElementById(id);
  const status = (message, error=false) => {
    $("status").textContent = message;
    $("status").className = `rounded-xl p-4 text-sm shadow-sm ${error ? "bg-rose-50 text-rose-700" : "bg-white text-slate-700"}`;
  };
  const now = firebase.database.ServerValue.TIMESTAMP;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const makeId = () => "ws_" + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g,"").slice(0,18) : (Date.now().toString(36)+Math.random().toString(36).slice(2,10)));
  async function verify() {
    const user = auth.currentUser;
    if (!user) {
      $("login-panel").classList.remove("hidden");
      $("workspace").classList.add("hidden");
      $("logout").classList.add("hidden");
      status("سجّل الدخول بحساب مدير المنصة.");
      return;
    }
    const token = await user.getIdTokenResult(true);
    if (token.claims.platformAdmin !== true) {
      $("login-panel").classList.add("hidden");
      $("workspace").classList.add("hidden");
      $("logout").classList.remove("hidden");
      status("الحساب لا يحمل صلاحية platformAdmin. تأكد من تسجيل الخروج والدخول مجدداً بالحساب الصحيح.", true);
      return;
    }
    $("login-panel").classList.add("hidden");
    $("workspace").classList.remove("hidden");
    $("logout").classList.remove("hidden");
    status(`تم التحقق من مدير المنصة: ${user.email || user.uid}`);
    await loadTenants();
  }
  async function loadTenants() {
    $("tenant-list").textContent = "جارٍ تحميل الورش...";
    try {
      const [directorySnap,billingSnap] = await Promise.all([
        db.ref("platform/tenantDirectory").get(),
        db.ref("platformBilling").get()
      ]);
      const directory = directorySnap.val() || {};
      const billing = billingSnap.val() || {};
      const rows = Object.entries(directory);
      $("tenant-list").innerHTML = rows.length ? rows.map(([id,t]) => {
        const b = billing[id] || {};
        return `<article class="border rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
          <div><strong>${esc(t.name)}</strong><div class="text-xs text-slate-500 mt-1" dir="ltr">${esc(id)} · ${esc(t.ownerUid)} · ${esc(b.status || "غير محدد")}</div></div>
          <div class="flex gap-2">
            <button data-id="${esc(id)}" data-status="active" class="status-btn bg-emerald-100 text-emerald-800 rounded-lg px-3 py-2 text-xs">تفعيل</button>
            <button data-id="${esc(id)}" data-status="suspended" class="status-btn bg-rose-100 text-rose-800 rounded-lg px-3 py-2 text-xs">إيقاف</button>
          </div></article>`;
      }).join("") : '<p class="text-slate-500">لا توجد ورش مسجلة.</p>';
      document.querySelectorAll(".status-btn").forEach(btn => btn.addEventListener("click", async () => {
        try {
          const id=btn.dataset.id, st=btn.dataset.status;
          const updates={};
          updates[`platform/tenantDirectory/${id}/status`]=st;
          updates[`platformBilling/${id}/status`]=st === "active" ? "active" : "suspended";
          updates[`platform/auditLog/${db.ref("platform/auditLog").push().key}`]={action:"tenant.status.changed",tenantId:id,status:st,actorUid:auth.currentUser.uid,at:now};
          await db.ref().update(updates);
          status(`تم تحديث حالة الورشة إلى ${st === "active" ? "نشطة" : "موقوفة"}.`);
          await loadTenants();
        } catch(e) { status(e.message || "تعذر تحديث الحالة.",true); }
      }));
    } catch(e) { $("tenant-list").textContent=e.message || "تعذر تحميل الورش."; }
  }
  $("login").addEventListener("click", async () => {
    try { await auth.signInWithEmailAndPassword($("email").value.trim(),$("password").value); }
    catch(e) { status(e.message || "فشل تسجيل الدخول.",true); }
  });
  $("logout").addEventListener("click", () => auth.signOut());
  $("refresh").addEventListener("click", loadTenants);
  $("create-form").addEventListener("submit", async e => {
    e.preventDefault();
    const btn=$("create-btn"); btn.disabled=true; btn.textContent="جارٍ الإنشاء...";
    try {
      const name=$("workshop-name").value.trim();
      const ownerUid=$("owner-uid").value.trim();
      if(!/^[A-Za-z0-9_-]{10,128}$/.test(ownerUid)) throw new Error("UID صاحب الورشة غير صالح.");
      const tenantId=makeId(), stamp=now;
      const updates={};
      updates[`platform/tenantDirectory/${tenantId}`]={tenantId,name,mode:"saas",status:"active",ownerUid,createdAt:stamp};
      updates[`platformBilling/${tenantId}`]={mode:"saas",billingModel:$("billing").value,planId:$("plan").value,status:"trial",startsAt:stamp,currentPeriodEndsAt:null,providerReference:null,createdAt:stamp};
      updates[`tenantMemberships/${tenantId}/${ownerUid}`]={active:true,role:"owner",joinedAt:stamp,invitedBy:auth.currentUser.uid};
      updates[`tenants/${tenantId}/profile`]={workshopName:name,createdAt:stamp,createdBy:auth.currentUser.uid};
      updates[`tenants/${tenantId}/settings`]={currency:"EGP",timezone:"Africa/Cairo",invoicePrefix:"INV"};
      updates[`platform/auditLog/${db.ref("platform/auditLog").push().key}`]={action:"tenant.created",tenantId,ownerUid,actorUid:auth.currentUser.uid,at:stamp};
      await db.ref().update(updates);
      status(`تم إنشاء الورشة ${tenantId} وربط UID المالك ${ownerUid}.`);
      $("create-form").reset();
      await loadTenants();
    } catch(err) { status(err.message || "تعذر إنشاء الورشة.",true); }
    finally { btn.disabled=false; btn.textContent="إنشاء الورشة وربط المالك"; }
  });
  auth.onAuthStateChanged(() => verify().catch(e=>status(e.message,true)));
})();