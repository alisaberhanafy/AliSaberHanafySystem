/**
 * Workspace preferences: easy/advanced mode and per-account dashboard visibility.
 * Preferences are deliberately stored locally until tenant-scoped cloud settings
 * and their production security rules are deployed. They never write to shared data.
 */
const PreferencesModule = {
    defaults: {
        mode: 'easy',
        widgets: {
            monthlyOps: true, debts: true, advances: false,
            todaySales: true, todayProfit: false, clients: true, dailyChart: false
        }
    },
    current: null,
    storageKey() {
        const uid = window.AuthModule?.currentUser?.uid || 'guest';
        return `ali_saber_workspace_preferences_v1_${uid}`;
    },
    cloneDefaults() { return JSON.parse(JSON.stringify(this.defaults)); },
    load() {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(this.storageKey()) || 'null'); } catch (_) {}
        const base = this.cloneDefaults();
        if (saved && typeof saved === 'object') {
            if (saved.mode === 'easy' || saved.mode === 'advanced') base.mode = saved.mode;
            if (saved.widgets && typeof saved.widgets === 'object') {
                Object.keys(base.widgets).forEach(key => {
                    if (typeof saved.widgets[key] === 'boolean') base.widgets[key] = saved.widgets[key];
                });
            }
        }
        this.current = base;
        this.apply();
        return base;
    },
    init() {
        this.load();
        const modal = document.getElementById('display-settings-modal');
        if (modal) modal.addEventListener('click', event => {
            if (event.target === modal) this.closeSettings();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') this.closeSettings();
        });
    },
    apply() {
        if (!this.current) return;
        document.body.classList.toggle('easy-mode', this.current.mode === 'easy');
        document.body.classList.toggle('advanced-mode', this.current.mode === 'advanced');
        document.querySelectorAll('[data-dashboard-widget]').forEach(element => {
            const key = element.dataset.dashboardWidget;
            element.classList.toggle('widget-hidden', this.current.widgets[key] === false);
        });
        const label = document.getElementById('easy-mode-toggle-label');
        const button = document.getElementById('easy-mode-toggle');
        if (label) label.textContent = this.current.mode === 'easy' ? 'الوضع الاحترافي' : 'الوضع السهل';
        if (button) button.title = this.current.mode === 'easy' ? 'التبديل إلى الوضع الاحترافي' : 'التبديل إلى الوضع السهل';
    },
    toggleMode() {
        if (!this.current) this.load();
        this.current.mode = this.current.mode === 'easy' ? 'advanced' : 'easy';
        this.persist();
        this.apply();
        if (window.showCustomToast) showCustomToast(this.current.mode === 'easy' ? 'تم تفعيل الوضع السهل' : 'تم تفعيل الوضع الاحترافي');
    },
    openSettings() {
        if (!this.current) this.load();
        const modal = document.getElementById('display-settings-modal');
        if (!modal) return;
        const radio = modal.querySelector(`input[name="workspace-mode"][value="${this.current.mode}"]`);
        if (radio) radio.checked = true;
        modal.querySelectorAll('[data-widget-toggle]').forEach(input => {
            input.checked = this.current.widgets[input.dataset.widgetToggle] !== false;
        });
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },
    closeSettings() {
        const modal = document.getElementById('display-settings-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    },
    resetWidgets() {
        if (!this.current) this.load();
        this.current.widgets = { ...this.defaults.widgets };
        const modal = document.getElementById('display-settings-modal');
        modal?.querySelectorAll('[data-widget-toggle]').forEach(input => {
            input.checked = this.current.widgets[input.dataset.widgetToggle] !== false;
        });
    },
    saveSettings() {
        const modal = document.getElementById('display-settings-modal');
        if (!modal) return;
        const selectedMode = modal.querySelector('input[name="workspace-mode"]:checked');
        if (selectedMode) this.current.mode = selectedMode.value;
        modal.querySelectorAll('[data-widget-toggle]').forEach(input => {
            this.current.widgets[input.dataset.widgetToggle] = input.checked;
        });
        this.persist();
        this.apply();
        this.closeSettings();
        if (window.showCustomToast) showCustomToast('تم حفظ تخصيص لوحة التحكم لهذا الحساب على هذا الجهاز');
    },
    persist() {
        try { localStorage.setItem(this.storageKey(), JSON.stringify(this.current)); }
        catch (error) { console.warn('Unable to save workspace preferences:', error); }
    }
};
