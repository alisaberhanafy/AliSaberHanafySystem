/** Shared and deterministic financial calculations. */
const FinanceModule = {
  number(value, fallback=0) { const n=Number(value); return Number.isFinite(n)?n:fallback; },
  nonNegative(value, fallback=0) { return Math.max(0,this.number(value,fallback)); },
  round(value) { return Math.round((this.number(value)+Number.EPSILON)*100)/100; },
  localDate(date=new Date()) { const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; },
  getCatalogItem(line, catalog=[]) { return catalog.find(x=>(line?.code&&x.code&&String(line.code)===String(x.code))||(line?.name&&x.name&&String(line.name)===String(x.name)))||null; },
  invoice(inv,catalog=[]) {
    let itemsSubtotal=0,paymentsTotal=0,costTotal=0,costIncomplete=false,costEstimated=false;
    for(const line of (Array.isArray(inv?.items)?inv.items:[])) {
      const qty=this.nonNegative(line?.qty,1), price=this.nonNegative(line?.price,0), total=this.round(qty*price);
      if(line?.isPayment){ paymentsTotal+=total; continue; }
      itemsSubtotal+=total;
      let cost;
      if(line?.costPrice!==undefined&&line.costPrice!==null&&line.costPrice!=='') cost=this.nonNegative(line.costPrice);
      else {
        costEstimated=true;
        const c=this.getCatalogItem(line,catalog);
        if(c&&(c.costPrice!==undefined||c.cost!==undefined)) cost=this.nonNegative(c.costPrice??c.cost);
        else {cost=0;costIncomplete=true;}
      }
      costTotal+=this.round(qty*cost);
    }
    itemsSubtotal=this.round(itemsSubtotal); paymentsTotal=this.round(paymentsTotal); costTotal=this.round(costTotal);
    const raw=this.nonNegative(inv?.discount,0);
    const requested=inv?.discountType==='PERCENT'?itemsSubtotal*Math.min(raw,100)/100:raw;
    const discount=this.round(Math.min(itemsSubtotal,requested));
    const net=this.round(Math.max(0,itemsSubtotal-discount));
    const paid=paymentsTotal;
    return {itemsSubtotal,discount,net,paid,remaining:this.round(Math.max(0,net-paid)),advance:this.round(Math.max(0,paid-net)),costTotal,costIncomplete,costEstimated:costEstimated||costIncomplete,grossProfit:this.round(net-costTotal)};
  },
  client(client,catalog=[]) {
    let total=0,paid=0,debt=0,advance=0;
    for(const inv of (Array.isArray(client?.invoices)?client.invoices:[])) {
      const t=this.invoice(inv,catalog); total+=t.net; paid+=t.paid;
      if(inv?.deliveryStatus==='delivered'){debt+=t.remaining;advance+=t.advance;} else advance+=t.paid;
    }
    return {total:this.round(total),paid:this.round(paid),debt:this.round(debt),advance:this.round(advance)};
  }
};
