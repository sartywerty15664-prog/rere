const DEFAULT_USD_TO_RUB = 90;
export function usdToRubRate(){const value=Number(process.env.USD_TO_RUB);return Number.isFinite(value)&&value>0?value:DEFAULT_USD_TO_RUB;}
export function rubAmount(usd){return Math.round(usd*usdToRubRate());}
export function formatRub(amount){return new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(amount);}
export function formatUsdWithRub(usd){return `$${usd} · ≈${formatRub(rubAmount(usd))} ₽`;}
export function billingFootnote(lang='en'){const rate=usdToRubRate();return lang==='ru'? `Оплата списывается в USD. Сумма в рублях указана ориентировочно по курсу ${rate} ₽/$. `:`Charges are billed in USD. The ruble amount is indicative, converted at ${rate} ₽/$. `;}
