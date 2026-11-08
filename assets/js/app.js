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
    downloadAnchor.setAttribute("download", `AliSaber_System_Firebase_Backup_${FinanceModule.localDate()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showCustomToast("تم تنزيل النسخة الاحتياطية بنجاح!");
}

async function importSystemBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data.catalogItems) && Array.isArray(data.clientsList)) {
                if (!confirm('سيتم استبدال بيانات العملاء والكتالوج الحالية ببيانات النسخة الاحتياطية. هل أخذت نسخة من البيانات الحالية وتريد المتابعة؟')) return;
                StateModule.catalogItems = data.catalogItems;
                StateModule.clientsList = data.clientsList;
                const cloudSaved = await StateModule.save();
                DashboardModule.updateFinancialDashboard();
                showCustomToast(cloudSaved ? 'تم استرجاع النسخة الاحتياطية ومزامنتها سحابياً.' : 'تم تحميل البيانات محلياً، لكن تعذر تأكيد حفظها على Firebase.');
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
    const allowed = await AuthModule.requireAccess();
    if (!allowed) return;
    await StateModule.initLoad();
    ThemeModule.init();
    lucide.createIcons();
    DashboardModule.updateFinancialDashboard();
    addAccountMenu();
});


function addAccountMenu() {
    const banner = document.getElementById('firebase-status-banner');
    if (!banner || document.getElementById('account-signout-btn')) return;
    const button = document.createElement('button');
    button.id = 'account-signout-btn';
    button.type = 'button';
    button.className = 'mr-auto text-[10px] font-bold rounded-lg px-2 py-1 bg-slate-200 dark:bg-slate-800';
    button.textContent = 'تسجيل الخروج';
    button.title = 'إنهاء جلسة المستخدم';
    button.onclick = () => AuthModule.signOut();
    banner.appendChild(button);
}
