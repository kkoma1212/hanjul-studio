(() => {
  'use strict';

  const plans = [
    { name: 'Free', tier: 'free', price: 0, daily: 3, quota: 0, storage: 5 },
    { name: 'Plus', tier: 'plus', price: 6900, daily: 6, quota: 40, storage: 10 },
    { name: 'Pro 100', tier: 'pro', price: 24900, daily: 12, quota: 100, storage: 25 },
    { name: 'Pro 200', tier: 'pro', price: 34900, daily: 12, quota: 200, storage: 35 },
    { name: 'Pro 400', tier: 'pro', price: 49900, daily: 12, quota: 400, storage: 50 },
    { name: 'Team', tier: 'team', price: 79000, daily: 15, quota: 400, storage: 250 },
  ];
  const tiers = ['free', 'plus', 'pro', 'team'];
  const bundleSize = 5;
  const bundlePrice = 1500;
  const format = new Intl.NumberFormat('ko-KR');
  const count = value => format.format(value) + '편';
  const won = value => format.format(value) + '원';
  const byId = id => document.getElementById(id);

  function showPro(quota) {
    const plan = plans.find(item => item.tier === 'pro' && item.quota === Number(quota));
    if (!plan) return;
    const values = { price: won(plan.price), extra: count(plan.quota), storage: plan.storage + ' GB', retention: '90일' };
    for (const [key, value] of Object.entries(values)) {
      const cardField = byId('pro-' + key);
      if (cardField) cardField.textContent = value;
      for (const cell of document.querySelectorAll('[data-pro-cell="' + key + '"]')) cell.textContent = value;
    }
    for (const button of document.querySelectorAll('[data-pro]')) {
      button.setAttribute('aria-pressed', String(button.dataset.pro === String(plan.quota)));
    }
  }

  function quote(plan, days, perDay, prepaid) {
    const dailyUsed = Math.min(perDay, plan.daily) * days;
    const need = days * perDay - dailyUsed;
    const monthlyUsed = Math.min(need, plan.quota);
    const prepaidUsed = Math.min(need - monthlyUsed, prepaid);
    const deficit = need - monthlyUsed - prepaidUsed;
    const bundles = Math.ceil(deficit / bundleSize);
    const topup = bundles * bundlePrice;
    return { plan, dailyUsed, monthlyUsed, prepaidUsed, deficit, bundles, topup, total: plan.price + topup,
      monthlyLeft: plan.quota - monthlyUsed, prepaidLeft: prepaid - prepaidUsed + bundles * bundleSize - deficit };
  }

  function remaining(result) {
    const balances = [];
    if (result.monthlyLeft) balances.push('월 추가 ' + count(result.monthlyLeft));
    if (result.prepaidLeft) balances.push('충전권 ' + count(result.prepaidLeft));
    return balances.join('과 ');
  }

  function readCount(field, min, max) {
    const value = field.valueAsNumber;
    const valid = field.value !== '' && field.validity.valid && Number.isSafeInteger(value) && min <= value && value <= max;
    field.setAttribute('aria-invalid', String(!valid));
    return valid ? value : null;
  }

  function refresh() {
    const days = readCount(byId('days'), 1, 31);
    const perDay = readCount(byId('per-day'), 0, 1000);
    const prepaid = readCount(byId('prepaid'), 0, 99999);
    const required = tiers.indexOf(byId('needs').value);
    const storage = Number(byId('storage').value);
    const tie = byId('quote-tie');
    if (tie) { tie.textContent = ''; tie.hidden = true; }
    if (days === null || perDay === null || prepaid === null || required < 0 || !plans.some(plan => plan.storage === storage)) {
      byId('quote-plan').textContent = '입력 확인이 필요합니다';
      byId('quote-total').textContent = '—';
      byId('quote-usage').textContent = '';
      const problems = [];
      if (days === null) problems.push('제작일은 1~31일');
      if (perDay === null) problems.push('하루 제작량은 0~1,000편');
      if (prepaid === null) problems.push('보유 충전권은 0~99,999편');
      byId('quote-detail').textContent = problems.length ? problems.join(', ') + ' 범위에서 정수로 입력할 수 있습니다.'
        : '필요한 기능과 저장 공간을 선택하면 요금을 계산할 수 있습니다.';
      return;
    }

    const totalJobs = perDay * days;
    const candidates = plans
      .filter(p => tiers.indexOf(p.tier) >= required && p.storage >= storage)
      .map(p => quote(p, days, perDay, prepaid))
      .sort((a, b) => a.total - b.total || b.plan.quota - a.plan.quota || b.plan.daily - a.plan.daily);
    const [best] = candidates;
    byId('quote-plan').textContent = best.plan.name;
    byId('quote-total').textContent = won(best.total);
    const scope = best.plan.tier === 'team' ? '팀원 전체가 ' : '';
    const usage = ['하루 기본 편수로 ' + count(best.dailyUsed)];
    if (best.monthlyUsed) usage.push('월 추가 편수로 ' + count(best.monthlyUsed));
    if (best.prepaidUsed) usage.push('보유 충전권으로 ' + count(best.prepaidUsed));
    if (best.deficit) usage.push('새로 구매한 충전권으로 ' + count(best.deficit));
    byId('quote-usage').textContent = totalJobs ? days + '일 동안 ' + scope + '총 ' + count(totalJobs) +
      '을 만듭니다. ' + usage.join(', ') + '을 사용합니다.' : '이번 달에 새로 만들 영상은 0편입니다.';
    const left = remaining(best);
    let detail = left ? '별도 충전 없이 ' + left + '이 남습니다.' : '별도 충전 없이 이용할 수 있습니다.';
    if (best.bundles) {
      const purchase = '충전권 ' + format.format(best.bundles) + '묶음';
      detail = best.plan.price ? '월 요금 ' + won(best.plan.price) + '에 ' + purchase + ' 비용 ' + won(best.topup) + '이 더해집니다.'
        : purchase + '을 구매하는 데 ' + won(best.topup) + '이 듭니다.';
      if (left) detail += ' 사용 후 ' + left + '이 남습니다.';
    }
    byId('quote-detail').textContent = detail;
    const others = candidates.slice(1).filter(item => item.total === best.total);
    if (others.length) {
      const alternatives = others.map(item => {
        const left = remaining(item);
        const option = item.plan.name + ' 요금제' + (item.bundles ? '에 충전권 ' + item.bundles + '묶음을 더해도' : '를 선택해도');
        return option + ' ' + won(item.total) + '으로 같습니다.' + (left ? ' 이 경우 ' + left + '이 남습니다.' : '');
      });
      const message = alternatives.join(' ') + ' 같은 금액이면 제공 편수가 더 많은 요금제를 추천합니다.';
      if (tie) { tie.textContent = message; tie.hidden = false; }
      else byId('quote-detail').textContent += ' ' + message;
    }
  }

  function initProDemos() {
    const apply = byId('pro-demo-apply');
    const status = byId('pro-demo-status');
    const spellings = [...document.querySelectorAll('[data-demo-spelling]')];
    if (apply && status && spellings.length === 2) {
      const originalLabel = apply.textContent;
      const originals = spellings.map(spelling => spelling.textContent);
      let corrected = false;
      apply.addEventListener('click', () => {
        corrected = !corrected;
        spellings.forEach((spelling, index) => {
          spelling.textContent = corrected ? '해오름길' : originals[index];
        });
        apply.textContent = corrected ? '되돌리기' : originalLabel;
        status.textContent = corrected ? '두 줄의 표기를 ‘해오름길’로 바꿨습니다.' : '두 줄의 표기를 원래대로 되돌렸습니다.';
      });
    }

    const pick = byId('clip-demo-pick');
    const line = byId('clip-demo-line');
    const range = byId('clip-demo-range');
    if (pick && line && range) {
      function showClip() {
        const option = pick.options[pick.selectedIndex];
        if (!option?.dataset.line || !option.dataset.range) return;
        line.textContent = option.dataset.line;
        range.textContent = option.dataset.range;
      }
      pick.addEventListener('change', showClip);
      window.addEventListener('pageshow', showClip);
      showClip();
    }
  }

  function initUsageDemo() {
    const controls = byId('usage-demo-controls');
    if (!controls) return;
    const sources = [
      { field: byId('usage-demo-free'), method: '하루 기본 편수로' },
      { field: byId('usage-demo-month'), method: '월 추가 편수로' },
      { field: byId('usage-demo-prepaid'), method: '충전권으로' },
    ];
    const status = byId('usage-demo-status');
    const plus = plans.find(plan => plan.tier === 'plus');
    function reset() {
      for (const source of sources) {
        source.left = 1;
        source.field.textContent = count(source.left);
      }
      status.textContent = '새 작업을 시작하면 하루 기본 편수부터 사용합니다.';
    }
    byId('usage-demo-use').addEventListener('click', () => {
      const source = sources.find(item => item.left > 0);
      if (!source) {
        status.textContent = '예시 잔액을 모두 사용했습니다. 한국시간 자정에 하루 기본 ' + count(plus.daily) +
          '이 다시 제공됩니다. 더 필요하면 ' + count(bundleSize) + ' 충전권을 ' + won(bundlePrice) + '에 직접 구매할 수 있습니다.';
        return;
      }
      source.left -= 1;
      source.field.textContent = count(source.left);
      status.textContent = source.method + ' 새 작업 1편을 만들었습니다.';
    });
    byId('usage-demo-reset').addEventListener('click', reset);
    reset();
    controls.hidden = false;
  }

  function init() {
    document.documentElement?.classList.add('has-js');
    initProDemos();
    initUsageDemo();
    const toggle = byId('caption-toggle');
    const caption = byId('sample-caption');
    if (toggle && caption) {
      toggle.hidden = false;
      toggle.setAttribute('aria-pressed', String(!caption.hidden));
      toggle.addEventListener('click', () => {
        caption.hidden = !caption.hidden;
        toggle.setAttribute('aria-pressed', String(!caption.hidden));
      });
    }
    const proButtons = [...document.querySelectorAll('[data-pro]')];
    for (const button of proButtons) button.addEventListener('click', () => showPro(button.dataset.pro));
    if (proButtons.length) showPro((proButtons.find(b => b.getAttribute('aria-pressed') === 'true') || proButtons[0]).dataset.pro);
    const form = byId('usage-form');
    if (!form) return;
    form.addEventListener('input', refresh);
    form.addEventListener('change', refresh);
    form.addEventListener('submit', event => { event.preventDefault(); refresh(); });
    form.addEventListener('reset', () => setTimeout(refresh, 0));
    window.addEventListener('pageshow', refresh);
    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
