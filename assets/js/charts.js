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
