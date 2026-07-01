export function formatCurrency(value: number) {
    try {
        return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
    } catch {
        return `R ${Number(value || 0).toFixed(2)}`;
    }
}

export function getInvoiceChipColor(status: string) {
    if (status === 'PAID') return 'success';
    if (status === 'OVERDUE') return 'error';
    if (status === 'VOID') return 'default';
    return 'warning';
}

export const ASSET_CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];
