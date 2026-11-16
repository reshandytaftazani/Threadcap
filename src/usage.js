(() => {
  'use strict';
  const readings = new Map(), busy = new Set(), attempted = new Map(), timers = [];
  const get = provider => readings.get(provider) || { status: 'unavailable', reason: 'No verified quota source is connected.', buckets: [] };
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const period = minutes => !minutes ? 'Window not reported' : minutes % 10080 === 0 ? `${minutes / 10080}w` : minutes % 1440 === 0 ? `${minutes / 1440}d` : minutes % 60 === 0 ? `${minutes / 60}h` : `${minutes}m`;
  const stale = data => data.status === 'stale' || (data.observedAt && Date.now() / 1000 - data.observedAt > 120);
  const age = data => `${Math.max(0, Math.floor((Date.now() / 1000 - data.observedAt) / 60))}m ago`;
  const amount = w => Number.isFinite(w.remainingPercent) ? `${Math.floor(w.remainingPercent)}%` : `${w.remainingAmount.toLocaleString()} units`;
  const changed = () => window.dispatchEvent(new Event('island-usage-change'));
  function accept(value) {
    const provider = value?.providerId || 'codex';
    if (!['codex','antigravity'].includes(provider) || !['fresh','stale','unavailable'].includes(value?.status) || !Number.isSafeInteger(value.revision) || value.revision < (get(provider).revision || 0)) return false;
    if (value.status !== 'unavailable' && (!Number.isFinite(value.observedAt) || value.observedAt <= 0 || value.observedAt > Date.now() / 1000 + 60 || !Array.isArray(value.buckets) || !value.buckets.length || value.buckets.length > 32)) return false;
    for (const bucket of value.buckets || []) {
      if (!Array.isArray(bucket.windows) || !bucket.windows.length || bucket.windows.length > 2) return false;
      for (const w of bucket.windows) {
        const percent = Number.isFinite(w.remainingPercent) && w.remainingPercent >= 0 && w.remainingPercent <= 100;
        const units = Number.isFinite(w.remainingAmount) && w.remainingAmount >= 0;
        if (!percent && !(provider === 'antigravity' && units)) return false;
        if (w.remainingPercent != null && !percent) return false;
        if (w.remainingAmount != null && !units) return false;
        if (provider === 'codex' && (!Number.isSafeInteger(w.windowMinutes) || w.windowMinutes <= 0)) return false;
        if (w.windowMinutes != null && (!Number.isSafeInteger(w.windowMinutes) || w.windowMinutes <= 0)) return false;
      }
    }
    readings.set(provider, structuredClone(value)); changed(); return true;
  }
  function summary(provider, mapped = false) {
    const data = get(provider);
    if (mapped && !data.sessionMapped) return 'Usage unavailable';
    if (busy.has(provider) && !data.observedAt) return 'Checking usage…';
    if (!data.buckets?.length || data.status === 'unavailable') return 'Usage unavailable';
    if (stale(data)) return `Updated ${age(data)}`;
    const bucket = data.buckets.find(b => b.id === 'codex') || (data.buckets.length === 1 ? data.buckets[0] : null);
    if (!bucket) return 'See account limits';
    return `${bucket.ordinaryUsageAllowed === false ? 'Blocked · ' : bucket.disabled ? 'Disabled · ' : ''}${bucket.windows.map(w => `${w.windowMinutes ? period(w.windowMinutes) + ' ' : ''}${amount(w)}`).join(' · ')} left`;
  }
  function detail(provider) {
    if (!['codex','antigravity'].includes(provider)) return '<p class="settings-note">Usage unavailable. A supported quota source has not been verified for this provider.</p>';
    const data = get(provider);
    if (busy.has(provider) && !data.observedAt) return '<p class="settings-note">Checking usage…</p>';
    const rows = data.status === 'unavailable' ? '' : (data.buckets || []).map(bucket => `<div class="quota-bucket"><strong>${esc(bucket.name)}</strong>${bucket.windows.map(w => `<p>${esc(period(w.windowMinutes))} <strong>${stale(data) ? 'Last known · ' : ''}${esc(amount(w))} remaining</strong>${w.resetsAt ? `<span>Resets ${esc(new Date(w.resetsAt * 1000).toLocaleString())}</span>` : ''}</p>`).join('')}${bucket.ordinaryUsageAllowed === false || bucket.disabled ? '<p>The provider reports this allowance as blocked or disabled. Reset times do not confirm recovery.</p>' : ''}</div>`).join('');
    return `${rows || '<p class="settings-note">Usage unavailable</p>'}<p class="settings-note">${esc(data.scope || 'Account mapping is unverified.')}</p><p class="settings-note">${esc(data.reason || '')}${data.observedAt ? ` ${stale(data) ? 'Last known reading. ' : ''}Updated ${age(data)}.` : ''}</p><p class="settings-note">Source: ${esc(data.source || (provider === 'codex' ? 'Codex app-server' : 'Antigravity CLI status line'))}. Values show remaining allowance.</p>`;
  }
  async function refresh(provider) {
    if (!provider) { await Promise.allSettled(['codex','antigravity'].map(refresh)); return; }
    const cooldown = provider === 'antigravity' ? 5000 : 60000;
    if (!window.IslandDesktop?.readUsage || busy.has(provider) || Date.now() - (attempted.get(provider) || 0) < cooldown) return;
    attempted.set(provider, Date.now()); busy.add(provider); changed();
    try {
      const value = await window.IslandDesktop.readUsage(provider);
      if ((value.providerId && value.providerId !== provider) || !accept({ ...value, providerId: provider })) throw new Error('Invalid usage snapshot');
    } catch {
      const data = get(provider);
      readings.set(provider, { ...data, status: data.observedAt ? 'stale' : 'unavailable', reason: 'Could not refresh quota. Check the provider connection and compatibility.', scope: 'Last known account reading; current account has not been revalidated.' });
    } finally { busy.delete(provider); changed(); }
  }
  window.IslandUsage = Object.freeze({ summary, detail, accept, refresh, snapshot: (provider = 'codex') => structuredClone(get(provider)), start: () => { void refresh(); timers.push(setInterval(() => { void refresh('codex'); changed(); }, 60000), setInterval(() => { void refresh('antigravity'); changed(); }, 5000)); } });
  addEventListener('pagehide', () => timers.forEach(clearInterval));
})();
