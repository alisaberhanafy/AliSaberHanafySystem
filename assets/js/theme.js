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
