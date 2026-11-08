(() => {
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(window.AliFirebaseConfig);
  const auth = firebase.auth();
  const db = firebase.database();
  const $ = id => document.getElementById(id);
  const status = (message, error=false) => {
    $("status").textContent = message;
    $("status").className = `status${error ? " error" : (auth.currentUser ? " ok" : "")}`;
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
  function tenantState(directoryStatus, billingStatus) {
    if (directoryStatus === "closed" || billingStatus === "cancelled") return "closed";
    if (directoryStatus === "suspended" || billingStatus === "suspended") return "suspended";
    if (directoryStatus === "active" && billingStatus === "trial") return "trial";
    if (directoryStatus === "active" && billingStatus === "active") return "active";
    return "pending";
  }
  const stateMeta = {
    active: { label: "نشطة", badge: "state-active", action: "suspended", actionLabel: "إيقاف الورشة" },
    trial: { label: "نشطة · فترة تجريبية", badge: "state-trial", action: "suspended", actionLabel: "إيقاف الورشة" },
    suspended: { label: "موقوفة", badge: "state-suspended", action: "active", actionLabel: "تفعيل الورشة" },
    closed: { label: "مغلقة", badge: "state-closed", action: null, actionLabel: "مغلقة" },
    pending: { label: "تحتاج مراجعة", badge: "state-pending", action: "active", actionLabel: "تفعيل الورشة" }
  };
  let tenantCache = [];
  function renderTenants() {
    const query = ($("tenant-search")?.value || "").trim().toLocaleLowerCase();
    const filter = $("tenant-filter")?.value || "all";
    const filtered = tenantCache.filter(({id,t,state}) => {
      const haystack = [t.name,id,t.ownerUid].join(" ").toLocaleLowerCase();
      return (!query || haystack.includes(query)) && (filter === "all" || filter === state || (filter === "active" && state === "trial"));
    });
    const counts = tenantCache.reduce((acc,row) => {
      acc.total++;
      if (row.state === "active" || row.state === "trial") acc.active++;
      else if (row.state === "suspended") acc.suspended++;
      else acc.review++;
      return acc;
    }, {total:0,active:0,suspended:0,review:0});
    if ($("tenant-total")) $("tenant-total").textContent = counts.total;
    if ($("tenant-active")) $("tenant-active").textContent = counts.active;
    if ($("tenant-suspended")) $("tenant-suspended").textContent = counts.suspended;
    if ($("tenant-review")) $("tenant-review").textContent = counts.review;
    $("tenant-list").innerHTML = filtered.length ? filtered.map(({id,t,b,state}) => {
      const meta = stateMeta[state];
      const canChange = Boolean(meta.action);
      return `<article class="tenant-item" data-tenant-id="${esc(id)}">
        <div class="tenant-main">
          <div class="tenant-title-row"><div class="tenant-name">${esc(t.name || "ورشة بدون اسم")}</div><span class="state-badge ${meta.badge}">${meta.label}</span></div>
          <div class="tenant-meta" dir="ltr">${esc(id)} · ${esc(t.ownerUid || "UID غير مسجل")}</div>
          <div class="tenant-submeta">الباقة: ${esc(b.planId || "غير محددة")} · ${esc(b.billingModel || "غير محدد")}</div>
        </div>
        <div class="tenant-actions">
          ${canChange ? `<button data-id="${esc(id)}" data-status="${meta.action}" class="status-btn ${meta.action === "active" ? "action-enable" : "action-disable"}">${meta.actionLabel}</button>` : `<button class="status-btn" disabled>${meta.actionLabel}</button>`}
        </div></article>`;
    }).join("") : `<div class="empty"><b>${tenantCache.length ? "لا توجد نتائج مطابقة" : "لا توجد ورش مسجلة حتى الآن"}</b>${tenantCache.length ? "جرّب تغيير عبارة البحث أو فلتر الحالة." : "ابدأ بإضافة أول ورشة من النموذج المجاور."}</div>`;
    document.querySelectorAll(".status-btn[data-id]").forEach(btn => btn.addEventListener("click", async () => {
      const id = btn.dataset.id, nextStatus = btn.dataset.status;
      const row = tenantCache.find(item => item.id === id);
      if (!row) return;
      const currentMeta = stateMeta[row.state];
      if (currentMeta.action !== nextStatus) {
        status("تغيرت حالة الورشة في القائمة. حدّث البيانات قبل تنفيذ العملية.", true);
        await loadTenants();
        return;
      }
      const actionText = nextStatus === "active" ? "تفعيل" : "إيقاف";
      if (!window.confirm(`هل تريد ${actionText} ورشة «${row.t.name || id}»؟`)) return;
      btn.disabled = true;
      btn.textContent = "جارٍ الحفظ...";
      try {
        const updates = {};
        updates[`platform/tenantDirectory/${id}/status`] = nextStatus;
        updates[`platformBilling/${id}/status`] = nextStatus;
        if (row.t.ownerUid) {
          updates[`userTenantIndex/${row.t.ownerUid}/${id}/active`] = nextStatus === "active";
          updates[`userTenantIndex/${row.t.ownerUid}/${id}/tenantId`] = id;
        }
        updates[`platform/auditLog/${db.ref("platform/auditLog").push().key}`] = {
          action: "tenant.status.changed", tenantId: id, status: nextStatus,
          previousStatus: row.state, actorUid: auth.currentUser.uid, at: now
        };
        await db.ref().update(updates);
        status(`تم ${actionText} الورشة بنجاح. جارٍ تحديث القائمة...`);
        await loadTenants();
      } catch (e) {
        const message = e.code === "PERMISSION_DENIED" || /permission_denied/i.test(e.message || "")
          ? "رفض Firebase العملية. راجع صلاحية platformAdmin وقواعد قاعدة البيانات."
          : (e.message || `تعذر ${actionText} الورشة.`);
        status(message, true);
        await loadTenants();
      }
    }));
  }
  async function loadTenants() {
    $("tenant-list").textContent = "جارٍ تحميل الورش...";
    if ($("refresh")) $("refresh").disabled = true;
    try {
      const [directorySnap,billingSnap] = await Promise.all([
        db.ref("platform/tenantDirectory").get(),
        db.ref("platformBilling").get()
      ]);
      const directory = directorySnap.val() || {};
      const billing = billingSnap.val() || {};
      const rows = await Promise.all(Object.entries(directory).map(async ([id,t]) => {
        const b = billing[id] || {};
        let membership = {};
        if (t.ownerUid) {
          const memberSnap = await db.ref(`tenantMemberships/${id}/${t.ownerUid}`).get();
          membership = memberSnap.val() || {};
        }
        const state = tenantState(t.status,b.status);
        return {id,t,b,state,membership};
      }));
      tenantCache = rows;
      // Repair owner lookup entries for tenants created before this release.
      const indexRepairs = {};
      for (const row of rows) {
        if (!row.t.ownerUid) continue;
        const active = row.membership.active === true && (row.state === "active" || row.state === "trial");
        const role = row.membership.role || "owner";
        indexRepairs[`userTenantIndex/${row.t.ownerUid}/${row.id}`] = { tenantId: row.id, active, role };
      }
      if (Object.keys(indexRepairs).length) await db.ref().update(indexRepairs);
      renderTenants();
      status(`تم تحميل ${tenantCache.length} ورشة ومراجعة حالتها.`);
    } catch(e) {
      $("tenant-list").innerHTML = '<div class="empty"><b>تعذر تحميل قائمة الورش</b>تأكد من صلاحيات مدير المنصة وقواعد Firebase ثم أعد المحاولة.</div>';
      status(e.message || "تعذر تحميل الورش.", true);
    } finally {
      if ($("refresh")) $("refresh").disabled = false;
    }
  }
  $("login").addEventListener("click", async () => {
    try { await auth.signInWithEmailAndPassword($("email").value.trim(),$("password").value); }
    catch(e) { status(e.message || "فشل تسجيل الدخول.",true); }
  });
  $("logout").addEventListener("click", () => auth.signOut());
  $("refresh").addEventListener("click", loadTenants);
  $("tenant-search")?.addEventListener("input", renderTenants);
  $("tenant-filter")?.addEventListener("change", renderTenants);
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
      updates[`userTenantIndex/${ownerUid}/${tenantId}`]={tenantId,active:true,role:"owner"};
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