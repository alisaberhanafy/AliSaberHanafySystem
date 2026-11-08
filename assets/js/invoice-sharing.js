const InvoiceShareModule = {
    openCleanShareModal() {
        if (!StateModule.currentSelectedClient) {
            ClientModule.openAllClientsModal();
            return;
        }

        const client = StateModule.currentSelectedClient;
        const inv = client.invoices[StateModule.currentInvoiceIndex];
        if (!inv) return;

        let modal = document.getElementById('clean-invoice-preview-modal');
        if (modal) modal.remove();

        let itemsHtml = '';
        let subTotal = 0;

        if (inv.items && inv.items.length > 0) {
            inv.items.forEach((item, idx) => {
                const lineTot = item.qty * item.price;
                if (!item.isPayment) subTotal += lineTot;
                itemsHtml += `
                    <tr style="border-bottom: 1px solid #e2e8f0; text-align: right;">
                        <td style="padding: 8px; font-size: 12px;">${idx + 1}</td>
                        <td style="padding: 8px; font-size: 12px; font-weight: bold;">${item.name} ${item.isPayment ? '(دفعة/مقدم)' : ''}</td>
                        <td style="padding: 8px; font-size: 12px; text-align: center;">${item.qty}</td>
                        <td style="padding: 8px; font-size: 12px; text-align: center;">${item.price.toLocaleString()} ج</td>
                        <td style="padding: 8px; font-size: 12px; text-align: left; font-weight: bold;">${lineTot.toLocaleString()} ج</td>
                    </tr>
                `;
            });
        } else {
            itemsHtml = `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #64748b;">مفيش أصناف مسجلة في الفاتورة دي.</td></tr>`;
        }

        const rawDiscount = inv.discount || 0;
        const discountCalc = (inv.discountType === 'PERCENT') ? (subTotal * rawDiscount) / 100 : rawDiscount;
        const netAfterDisc = Math.max(0, subTotal - discountCalc);
        
        let totalPaid = 0;
        if (inv.items) {
            inv.items.forEach(i => {
                if (i.isPayment) totalPaid += (i.qty * i.price);
            });
        }
        const remainingDue = Math.max(0, netAfterDisc - totalPaid);

        modal = document.createElement('div');
        modal.id = 'clean-invoice-preview-modal';
        modal.className = 'fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto';

        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col my-auto max-h-[95vh]">
                <div class="bg-slate-50 dark:bg-slate-950 p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h3 class="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">📄 معاينة وطباعة الفاتورة الاحترافية</h3>
                    <button onclick="document.getElementById('clean-invoice-preview-modal').remove()" class="text-rose-500 font-black text-lg px-2">✕</button>
                </div>

                <div id="printable-invoice-area" class="p-6 overflow-y-auto space-y-6 flex-1 bg-white text-slate-950 font-sans custom-scrollbar" dir="rtl">
                    <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 15px;">
                        <h1 style="font-size: 20px; font-weight: 900; margin: 0; color: #0f172a;">ALI SABER SYSTEM</h1>
                        <p style="font-size: 11px; font-weight: bold; color: #475569; margin: 4px 0;">إدارة الورش والحسابات والمبيعات • عزب القصر</p>
                        <p style="font-size: 10px; color: #64748b; margin: 0;">تاريخ الفاتورة: ${inv.date || '---'} | فاتورة رقم: #${StateModule.currentInvoiceIndex + 1}</p>
                    </div>

                    <div style="display: flex; justify-content: space-between; font-size: 12px; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
                        <div>
                            <strong>اسم العميل:</strong> ${client.name}<br>
                            <strong>التليفون:</strong> ${client.phone || 'مش متسجل'}
                        </div>
                        <div style="text-align: left;">
                            <strong>القرية:</strong> ${client.village || 'عزب القصر'}<br>
                            <strong>حالة التسليم:</strong> ${inv.deliveryStatus === 'delivered' ? '🟢 مسلّم' : '🟡 شغالين فيه'}
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <thead>
                            <tr style="background: #0f172a; color: white; text-align: right; font-size: 11px;">
                                <th style="padding: 8px; border-top-right-radius: 8px;">#</th>
                                <th style="padding: 8px;">اسم الصنف / البند</th>
                                <th style="padding: 8px; text-align: center;">الكمية</th>
                                <th style="padding: 8px; text-align: center;">السعر</th>
                                <th style="padding: 8px; text-align: left; border-top-left-radius: 8px;">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 4px 0;">
                            <span>حساب الأصناف الإجمالي:</span>
                            <strong>${subTotal.toLocaleString()} ج</strong>
                        </div>
                        ${rawDiscount > 0 ? `
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #e11d48;">
                            <span>الخصم (${rawDiscount}${inv.discountType === 'PERCENT' ? '%' : ' ج'}):</span>
                            <strong>- ${discountCalc.toLocaleString()} ج</strong>
                        </div>` : ''}
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; font-weight: bold;">
                            <span>الصافي المطلوب:</span>
                            <span>${netAfterDisc.toLocaleString()} ج</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #059669;">
                            <span>المبلغ المدفوع / العربون:</span>
                            <strong>${totalPaid.toLocaleString()} ج</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; font-weight: 900; background: #f1f5f9; padding: 8px 12px; border-radius: 8px; margin-top: 5px; color: ${remainingDue > 0 ? '#e11d48' : '#059669'};">
                            <span>المتبقي (الديون):</span>
                            <span>${remainingDue.toLocaleString()} ج</span>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 20px; font-size: 10px; color: #94a3b8; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
                        شكراً لتعاملكم مع ALI SABER SYSTEM • عزب القصر
                    </div>
                </div>

                <div class="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center gap-2 shrink-0 flex-wrap">
                    <div class="flex items-center gap-2">
                        <button onclick="InvoiceShareModule.printInvoiceClean()" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md">
                            <i data-lucide="printer" class="w-4 h-4"></i> طباعة الفاتورة 🖨️
                        </button>
                        <button onclick="InvoiceShareModule.shareInvoiceWhatsApp()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md">
                            <i data-lucide="message-circle" class="w-4 h-4"></i> مشاركة واتساب 💬
                        </button>
                    </div>
                    <button onclick="document.getElementById('clean-invoice-preview-modal').remove()" class="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2.5 rounded-xl text-xs font-bold">إغلاق</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        lucide.createIcons();
    },

    printInvoiceClean() {
        const printContent = document.getElementById('printable-invoice-area').innerHTML;
        const originalContent = document.body.innerHTML;

        document.body.innerHTML = `<div dir="rtl" style="padding: 20px; font-family: 'Cairo', sans-serif;">${printContent}</div>`;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload();
    },

    shareInvoiceWhatsApp() {
        if (!StateModule.currentSelectedClient) return;
        const client = StateModule.currentSelectedClient;
        const inv = client.invoices[StateModule.currentInvoiceIndex];
        
        let text = `*فاتورة حساب ومبيعات - ALI SABER SYSTEM* (عزب القصر)%0A`;
        text += `-----------------------------------%0A`;
        text += `👤 *العميل:* ${client.name}%0A`;
        text += `📅 *التاريخ:* ${inv.date || '---'}%0A`;
        text += `-----------------------------------%0A`;
        
        if (inv.items && inv.items.length > 0) {
            inv.items.forEach(i => {
                text += `• ${i.name} (${i.qty} × ${i.price}ج) = ${(i.qty * i.price).toLocaleString()}ج%0A`;
            });
        }
        
        let sub = inv.netTotal || 0;
        text += `-----------------------------------%0A`;
        text += `💰 *الصافي المطلوب:* ${sub.toLocaleString()} جنيه%0A`;
        text += `📞 للتواصل والاستفسار: ${client.phone || ''}%0A`;

        const rawPhone = (client.phone || '').replace(/\D/g, '');
        const waUrl = rawPhone ? `https://wa.me/2${rawPhone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, '_blank');
    }
};
