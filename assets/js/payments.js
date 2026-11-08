const PaymentModule = {
  openPaymentModal() {
    if(!StateModule.clientsList.length){showCustomToast('لا يوجد عملاء مسجلون حالياً.');return;}
    document.getElementById('quick-payment-modal')?.remove();
    const options=StateModule.clientsList.map((c,i)=>`<option value="${i}">${this.escape(c.name||'عميل بدون اسم')} - ${this.escape(c.phone||'بدون هاتف')}</option>`).join('');
    const modal=document.createElement('div'); modal.id='quick-payment-modal'; modal.className='fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    modal.innerHTML=`<section class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800"><header class="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between"><h3 class="font-black">تسجيل دفعة سريعة</h3><button type="button" onclick="PaymentModule.close()" class="text-rose-500 text-xl" aria-label="إغلاق">×</button></header><div class="p-5 space-y-4"><label class="block text-xs font-bold">العميل<select id="quick-payment-client" onchange="PaymentModule.populateInvoices()" class="mt-2 w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 dark:border-slate-700">${options}</select></label><label class="block text-xs font-bold">الفاتورة<select id="quick-payment-invoice" class="mt-2 w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 dark:border-slate-700"></select></label><label class="block text-xs font-bold">مبلغ الدفعة (جنيه)<input id="quick-payment-amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00" class="mt-2 w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 dark:border-slate-700"></label><p class="text-[11px] text-slate-500">إذا تجاوزت الدفعة قيمة الفاتورة، يظهر الفرق رصيداً مقدماً للعميل وفق حالة التسليم.</p></div><footer class="p-4 border-t dark:border-slate-800 flex gap-2"><button id="quick-payment-submit" type="button" onclick="PaymentModule.submit()" class="flex-1 rounded-xl bg-emerald-600 text-white p-3 text-sm font-bold">حفظ الدفعة</button><button type="button" onclick="PaymentModule.close()" class="rounded-xl bg-slate-200 dark:bg-slate-700 px-4 text-sm font-bold">إلغاء</button></footer></section>`;
    document.body.appendChild(modal);
    const select=document.getElementById('quick-payment-client'); const current=StateModule.currentSelectedClient?StateModule.clientsList.indexOf(StateModule.currentSelectedClient):-1;
    if(current>=0) select.value=String(current);
    this.populateInvoices(); setTimeout(()=>document.getElementById('quick-payment-amount')?.focus(),50);
  },
  escape(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  populateInvoices(){
    const ci=Number(document.getElementById('quick-payment-client')?.value); const client=StateModule.clientsList[ci]; const select=document.getElementById('quick-payment-invoice'); if(!select)return;
    const invoices=Array.isArray(client?.invoices)?client.invoices:[];
    select.innerHTML=invoices.map((inv,i)=>`<option value="${i}">${this.escape(inv.id||`فاتورة ${i+1}`)} — ${this.escape(inv.date||'')}</option>`).join('');
    if(!invoices.length)select.innerHTML='<option value="">لا توجد فاتورة لهذا العميل</option>';
  },
  async submit(){
    const button=document.getElementById('quick-payment-submit'); if(!button||button.disabled)return;
    const ci=Number(document.getElementById('quick-payment-client')?.value), ii=Number(document.getElementById('quick-payment-invoice')?.value), amount=Number(document.getElementById('quick-payment-amount')?.value);
    const client=StateModule.clientsList[ci], invoice=client?.invoices?.[ii];
    if(!client||!invoice){showCustomToast('اختر عميلاً لديه فاتورة صالحة أولاً.');return;}
    if(!Number.isFinite(amount)||amount<=0){showCustomToast('أدخل مبلغاً صحيحاً أكبر من صفر.');return;}
    button.disabled=true;button.textContent='جارٍ الحفظ...';
    try{
      invoice.items=Array.isArray(invoice.items)?invoice.items:[];
      invoice.items.push({id:`PAY-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,code:'PAYMENT',name:'دفعة سداد (الدفع السريع)',qty:1,price:Math.round(amount*100)/100,dateTime:getCurrentFormattedDateTime(),isPayment:true});
      StateModule.currentSelectedClient=client;StateModule.currentInvoiceIndex=ii;
      const cloudSaved=await StateModule.save(); DashboardModule.updateFinancialDashboard();
      if(typeof ClientModule!=='undefined')ClientModule.renderCardInfo(ci);
      this.close();showCustomToast(cloudSaved?`تم تسجيل دفعة ${amount.toLocaleString('ar-EG')} جنيه ومزامنتها سحابياً.`:'تم تسجيل الدفعة محلياً، لكن تعذر تأكيد الحفظ السحابي.');
    }catch(error){console.error('Quick payment failed:',error);button.disabled=false;button.textContent='حفظ الدفعة';showCustomToast('تعذر تسجيل الدفعة. راجع الاتصال وحاول مرة أخرى.');}
  },
  close(){document.getElementById('quick-payment-modal')?.remove();}
};
