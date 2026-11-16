(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const avatar = window.IslandAvatars;
  const preview = location.protocol === 'file:' || new URLSearchParams(location.search).get('preview') === '1';
  const PIXEL_ICONS = {
    settings: 'M6 0h4v2h2v2h2v2h2v4h-2v2h-2v2h-2v2H6v-2H4v-2H2v-2H0V6h2V4h2V2h2zM6 6v4h4V6z',
    back: 'M6 2h3v3H6v2h9v2H6v2h3v3H6v-3H3V9H1V7h2V5h3z',
    chevronDown: 'M2 5h3v2h2v2h2V7h2V5h3v3h-3v3H9v2H7v-2H5V8H2z',
    chevronUp: 'M7 3h2v2h2v3h3v3h-3V9H9V7H7v2H5v2H2V8h3V5h2z',
    jump: 'M9 1h6v6h-2V5h-2v2H9v2H7V7h2V5h2V3H9zM1 4h6v2H3v7h9V9h2v6H1z',
    close: 'M2 2h3v3h2v2h2V5h2V2h3v3h-3v2H9v2h2v2h3v3h-3v-3H9V9H7v2H5v3H2v-3h3V9h2V7H5V5H2z',
    check: 'M12 2h3v3h-3v3h-3v3H6v3H3v-3H1V8h3v3h2V8h3V5h3z',
    question: 'M4 1h8v2h2v5h-3v2H9v2H6V8h3V6h2V4H5v2H2V3h2zM6 14h3v2H6z',
    permission: 'M7 0h2v2h4v2h2v6h-2v3h-3v2H6v-2H3v-3H1V4h2V2h4zM7 4v5h2V4zM7 11v2h2v-2z',
    error: 'M4 0h8v2h2v2h2v8h-2v2h-2v2H4v-2H2v-2H0V4h2V2h2zM7 3v6h2V3zM7 11v2h2v-2z',
    offline: 'M1 1h3v3h2v2h2v2h2v2h2v2h3v3h-3v-3h-2v-2H8V8H6V6H4V4H1zM7 1h8v8h-2V3H7zM1 7h2v6h6v2H1z',
    copy: 'M5 1h10v10h-2V3H7v2H5zM1 5h10v10H1zM3 7v6h6V7z',
    send: 'M6 1h4v2h2v2h2v3h-3V6H9v9H7V6H5v2H2V5h2V3h2z',
    sound: 'M7 2h3v12H7v-2H4v-2H1V6h3V4h3zM12 4h2v2h2v4h-2v2h-2V9h2V7h-2z',
    muted: 'M7 2h3v12H7v-2H4v-2H1V6h3V4h3zM12 5h2v2h2v2h-2v2h-2V9h2V7h-2z',
    replay: 'M5 1h7v2h2v2h2v7h-2v2h-3v2H5v-2h6v-2h2V5h-2V3H5v3h3v2H0V0h2v4h3z',
    motion: 'M0 3h7v2H0zM0 7h5v2H0zM0 11h7v2H0zM9 3h5v2h2v6h-2v2H9v-2H7V5h2zM9 5v6h5V5z',
    dock: 'M0 1h16v14H0zM2 6v7h12V6zM2 3v1h12V3z',
    spinner: 'M4 0h8v2h2v3h2v7h-3V5h-2V3H5v2H3v6h2v2h4v3H4v-2H1V4h3z',
    play: 'M3 1h3v2h3v2h3v2h3v2h-3v2H9v2H6v2H3z',
    stop: 'M2 2h12v12H2z'
  };
  const icon = (name, extra = '') => `<svg class="icon ${extra}" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill-rule="evenodd" d="${PIXEL_ICONS[name] || PIXEL_ICONS.question}"/></svg>`;
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COLORS = { running: 'var(--blue)', waiting_input: 'var(--amber)', waiting_approval: 'var(--amber)', completed: 'var(--green)', failed: 'var(--red)', disconnected: 'var(--muted)', idle: 'var(--muted)', checking: 'var(--secondary)' };
  function glyph(state) {
    if (state === 'running') return '<span class="activity-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
    return icon(({ waiting_input: 'question', waiting_approval: 'permission', completed: 'check', failed: 'error', disconnected: 'offline', idle: 'motion', checking: 'replay' })[state] || 'motion');
  }
  const FIXTURES = [
    { sessionId: 'sess-opencode-1', agentId: 'opencode', projectName: 'website', taskTitle: 'Update authentication flow', prompt: 'Refactor passwordless auth and verify with unit tests.', status: 'waiting_approval', activity: 'npm test', command: 'npm test', workingDirectory: 'C:\\Projects\\website', terminalName: 'Windows Terminal', elapsed: '48s', requestId: 'preview-approval-1', capabilities: { canApprove: true, canJump: true } },
    { sessionId: 'sess-codex-1', agentId: 'codex', projectName: 'backend', taskTitle: 'Fix token validation logic', prompt: 'Fix token validation in JWT verification middleware.', status: 'running', activity: 'Reading src/auth.ts', workingDirectory: 'D:\\backend-api', terminalName: 'Visual Studio Code', elapsed: '2m', capabilities: { canJump: true } },
    { sessionId: 'sess-antigravity-1', agentId: 'antigravity', projectName: 'desktop', taskTitle: 'Refine settings drawer', prompt: 'Configure local storage persistence for app settings.', status: 'waiting_input', activity: 'Choosing a storage engine', question: 'Which database should store the app settings?', options: ['SQLite', 'PostgreSQL'], workingDirectory: 'C:\\Projects\\desktop', terminalName: 'Antigravity IDE', elapsed: '4m', requestId: 'preview-question-1', capabilities: { canAnswer: true, canJump: true } },
    { sessionId: 'sess-codex-2', agentId: 'codex', projectName: 'vibe-island', taskTitle: 'Ship session routing update', prompt: 'Create a PR for multi-session routing.', status: 'completed', activity: '3 files updated', result: 'Shipped the session routing update. PR #42 created.', terminalName: 'Windows Terminal', elapsed: '42s', capabilities: { canJump: true } }
  ];
  let sessions = preview ? structuredClone(FIXTURES) : [];
  let selected = null, expanded = false, focused = false, labAgent = 'codex', offline = !preview, bezel = true, audio = false;
  let motionOverride = null, toastTimer, geometryTimer, source, audioContext, reconnectTimer;
  let tourTimers = [];
  let labFocused = false;
  let peek = false, peekSession = null, peekEnter, peekExit, peekGeometryTimer, pageGeometryTimer, pointerInside = false;
  let settingsOpen = false, settingsPage = 'agents', providerPage = null, savedSessionView = null;
  const settingsScroll = new Map();
  let usageSignature = '';
  let lastProvider = null;
  let terminalPickerSession = null, terminalChoices = [], terminalBusy = false, terminalEpoch = 0;
  const nativeOrca = s => !preview && Boolean(s && window.IslandDesktop?.orcaTerminal);
  const terminalAction = s => Boolean(preview || s.capabilities?.canJump || nativeOrca(s));
  const preferences = {};
  try { Object.assign(preferences, JSON.parse(localStorage.getItem('island.preferences') || '{}')); } catch {}
  const drafts = new Map(), delivery = new Map();
  const sessionModel = new window.IslandSessionModel();
  const presentation = new window.IslandPresentation.PresentationPolicy();
  const silentPoses = new Set();
  let retained = [], autoOpen = preferences.autoOpen !== false, cooldownTimer;
  let pendingArchiveDelete = null, archiveDeleting = false, archiveDeleteEpoch = 0, archiveDeleteScroll = 0;
  const providerSetups = new Map();
  let providerSetupBusy = false;
  const rowMap = new Map();
  const avatarVisibility = new IntersectionObserver((entries) => {
    entries.forEach((entry) => entry.target.classList.toggle('is-offscreen', !entry.isIntersecting));
  });
  function setAvatars(slot, markup) {
    slot.querySelectorAll('.agent-avatar').forEach((el) => avatarVisibility.unobserve(el));
    slot.innerHTML = markup;
    slot.querySelectorAll('.agent-avatar').forEach((el) => avatarVisibility.observe(el));
  }
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => motionOverride === null ? motionQuery.matches : motionOverride;
  const disconnected = (s) => offline || Boolean(s.connectionStatus && s.connectionStatus !== 'connected');
  const displayState = (s) => preview ? (disconnected(s) ? 'disconnected' : s.status) : presentation.compactState(s, offline);
  const requestKey = (s) => `${s.sessionId}:${s.requestId || ''}`;
  const isPending = (s) => s.status === 'waiting_input' || s.status === 'waiting_approval';

  function paintIcons(root = document) { root.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); if (el.dataset.tip) el.title = el.dataset.tip; }); }
  function notify(message) {
    $('announcer').textContent = message;
    $('toast').textContent = message; $('toast').classList.add('is-visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('is-visible'), 2600);
  }
  function playCue(kind) {
    if (!audio || document.hidden || !audioContext) return;
    audioContext.resume().then(() => {
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(kind === 'completed' ? 660 : 520, now);
      oscillator.frequency.setValueAtTime(kind === 'completed' ? 880 : 650, now + .08);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.035, now + .012);
      gain.gain.exponentialRampToValueAtTime(.001, now + .2);
      oscillator.connect(gain); gain.connect(audioContext.destination);
      oscillator.start(now); oscillator.stop(now + .22);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    }).catch(() => {});
  }
  function setMotion(value) {
    motionOverride = value;
    document.body.classList.toggle('reduced-motion', reduced());
    document.body.classList.toggle('motion-allowed', motionOverride === false);
    $('motion-button').setAttribute('aria-pressed', String(reduced()));
    $('motion-button').setAttribute('aria-label', reduced() ? 'Enable motion' : 'Reduce motion');
    $('motion-button').title = reduced() ? 'Enable motion' : 'Reduce motion';
    $('setting-motion').checked = reduced();
  }
  motionQuery.addEventListener('change', () => { if (motionOverride === null) setMotion(null); });

  function representative() {
    if (!expanded && peekSession) return sessions.find(s => s.sessionId === peekSession) || null;
    if (preview && labFocused) return sessions.find((s) => s.agentId === labAgent);
    const pending = presentation.pending(sessions)[0];
    if (pending) return pending;
    const live = sessions.filter(s => !disconnected(s));
    return live.find(s => s.status === 'failed') || live.find(s => s.status === 'running') || live.find(s => s.status === 'completed') || live[0] || sessions[0];
  }
  function renderCompact() {
    const s = representative(), pending = preview && labFocused ? Number(Boolean(s && isPending(s))) : sessions.filter(isPending).length;
    const multiple = sessions.length > 1 && !pending && !(preview && labFocused);
    const counts = window.IslandPresentation.counts(sessions, offline);
    const visibleStates = sessions.map(s => presentation.compactState(s, offline));
    const workingCount = visibleStates.filter((state) => state === 'running').length;
    const failedCount = visibleStates.filter((state) => state === 'failed').length;
    const state = multiple
      ? failedCount ? 'failed' : workingCount ? 'running' : !counts.live ? visibleStates.every(value => value === 'disconnected') ? 'disconnected' : 'checking' : visibleStates.every((value) => value === 'completed') ? 'completed' : 'idle'
      : s ? presentation.compactState(s, offline) : 'idle';
    const compactAvatar = multiple
      ? [...new Set(sessions.map((item) => item.agentId))].slice(0, 3).map((id) => {
        const rows = sessions.filter(item => item.agentId === id);
        const priority = ['waiting_approval','waiting_input','failed','running','completed','idle','checking','disconnected'];
        const pose = priority.find(value => rows.some(row => presentation.compactState(row,offline) === value)) || 'idle';
        return avatar.render(id, pose, false, !preview && rows.every(row => silentPoses.has(`${row.sessionId}:${row.status}`)));
      }).join('')
      : s ? avatar.render(s.agentId, state, false, !preview && silentPoses.has(`${s.sessionId}:${s.status}`)) : '<span class="application-mark" aria-hidden="true"></span>';
    // Avoid restarting sprite loops for unrelated updates.
    if ($('compact-avatars').dataset.signature !== compactAvatar) {
      setAvatars($('compact-avatars'), compactAvatar); $('compact-avatars').dataset.signature = compactAvatar;
    }
    $('compact-title').textContent = s ? !pending && (!counts.live || multiple) ? counts.live ? `${counts.live} live` : `${counts.saved} saved` : state === 'idle' && s.status === 'completed' ? 'Idle' : s.taskTitle : 'Idle';
    const provider = s?.agentId || lastProvider;
    $('compact-usage').textContent = provider ? `${avatar.names[provider]} account · ${window.IslandUsage.summary(provider)}` : 'Connect an agent';
    $('compact-status').style.setProperty('--state-color', COLORS[state]);
    const summary = multiple ? failedCount ? `${failedCount} failed` : workingCount ? `${workingCount} working` : '' : pending ? String(pending) : state === 'idle' || state === 'disconnected' ? '' : s?.elapsed || '';
    const statusMarkup = `<span class="state-glyph">${glyph(state)}</span>${summary ? `<span>${esc(summary)}</span>` : ''}`;
    if ($('compact-status').dataset.signature !== statusMarkup) {
      $('compact-status').innerHTML = statusMarkup;
      $('compact-status').dataset.signature = statusMarkup;
    }
    const description = offline ? 'Connection lost. Showing saved context; live status is unverified.' : `${counts.live} live, ${counts.saved} saved, ${counts.working} working${failedCount ? `, ${failedCount} failed` : ''}`;
    if (multiple || (s && !counts.live)) $('compact-usage').textContent = `${description} · ${$('compact-usage').textContent}`;
    $('compact-status').title = description;
    $('compact-view').setAttribute('aria-label', `Expand ${description}${peek ? `. ${$('compact-usage').textContent}` : ''}`);
    $('compact-avatars').classList.toggle('is-group', multiple);
    return !s ? 186 : pending ? 352 : !counts.live ? 208 : multiple ? 248 : 312;
  }
  function targetHeight() {
    if (settingsOpen) {
      const active = $(`settings-${settingsPage}`);
      const preferenceError = $('preferences-note').offsetHeight;
      return Math.min($('expanded-view').querySelector('header').offsetHeight + $('settings-view').querySelector('nav').offsetHeight + active.scrollHeight + (preferenceError ? preferenceError + 24 : 0) + 40, 560, innerHeight - 16);
    }
    const header = $('expanded-view').querySelector('header').offsetHeight;
    const footer = $('expanded-view').querySelector('footer').offsetHeight;
    let height = 4;
    if (!sessions.length) height = $('sessions-list').scrollHeight;
    for (const s of sessions) {
      const row = rowMap.get(s.sessionId);
      if (!row || row.hidden) continue;
      height += row.querySelector('.session-heading').offsetHeight + 2;
      if (selected === s.sessionId) height += row.querySelector('.detail-content').getBoundingClientRect().height;
    }
    return Math.min(header + footer + $('usage-band').offsetHeight + height + 2, 560, innerHeight - (bezel ? 16 : 24));
  }
  function fitSurface() {
    const surface = $('island-surface');
    const compactWidth = renderCompact();
    surface.style.width = `${Math.min(expanded ? 560 : peek ? Math.max(compactWidth, 440) : compactWidth, innerWidth - 32)}px`;
    surface.style.height = `${expanded ? targetHeight() : 42}px`;
    surface.style.borderRadius = bezel ? expanded ? '0 0 24px 24px' : '0 0 18px 18px' : expanded ? '16px 16px 24px 24px' : '23px';
    const headerFooter = $('expanded-view').querySelector('header').offsetHeight + $('expanded-view').querySelector('footer').offsetHeight + $('usage-band').offsetHeight;
    $('sessions-list').style.maxHeight = `${Math.max(80, Math.min(560, innerHeight - 16) - headerFooter - 6)}px`;
    $('settings-scroll').style.maxHeight = `${Math.max(80, Math.min(560, innerHeight - 16) - $('expanded-view').querySelector('header').offsetHeight - $('settings-view').querySelector('nav').offsetHeight - 40)}px`;
  }
  const motionTime = name => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;
  function setPeek(value) {
    if (expanded) value = false;
    if (peek === value) return;
    if (value) peekSession = representative()?.sessionId || null;
    else peekSession = null;
    peek = value;
    $('island-surface').dataset.peek = String(value);
    $('island-surface').classList.add('is-peeking');
    fitSurface();
    clearTimeout(peekGeometryTimer);
    peekGeometryTimer = setTimeout(() => $('island-surface').classList.remove('is-peeking'), reduced() ? 0 : motionTime('--peek-width') + 20);
  }
  function enterPeek() {
    clearTimeout(peekExit); clearTimeout(peekEnter);
    if (!expanded) peekEnter = setTimeout(() => setPeek(true), motionTime('--hover-intent'));
  }
  function leavePeek() {
    clearTimeout(peekEnter); clearTimeout(peekExit);
    if (!$('island-surface').contains(document.activeElement)) peekExit = setTimeout(() => setPeek(false), motionTime('--hover-exit'));
  }
  function setExpanded(value, focus = false) {
    const surface = $('island-surface');
    // Commit the current interpolated geometry before retargeting a rapid toggle.
    surface.getBoundingClientRect();
    if (!value && terminalBusy) terminalEpoch++;
    clearTimeout(peekEnter); clearTimeout(peekExit);
    peek = false; peekSession = null; surface.dataset.peek = 'false';
    surface.classList.remove('is-peeking', 'is-page-changing');
    if (!value && settingsOpen) leaveSettings(false);
    expanded = value;
    surface.classList.toggle('is-opening', value); surface.classList.toggle('is-closing', !value);
    surface.dataset.expanded = String(value);
    $('compact-view').inert = value; $('expanded-view').inert = !value;
    $('compact-view').setAttribute('aria-expanded', String(value));
    window.dispatchEvent(new Event('island-presentation-change'));
    $('compact-view').tabIndex = value ? -1 : 0;
    $('view-button').textContent = value ? 'Expanded' : 'Compact';
    $('view-button').setAttribute('aria-pressed', String(value));
    renderCompact(); fitSurface();
    if (value) void window.IslandUsage.refresh();
    clearTimeout(geometryTimer);
    geometryTimer = setTimeout(() => surface.classList.remove('is-opening', 'is-closing'), reduced() ? 0 : 340);
    if (focus) (value ? $('collapse-button') : $('compact-view')).focus({ preventScroll: true });
  }
  function setSelected(id) {
    if (id) lastProvider = sessions.find(s => s.sessionId === id)?.agentId || lastProvider;
    if (focused && selected === id) { showOverview(); return; }
    selected = selected === id ? null : id;
    syncRowPresentation();
    fitSurface();
  }
  function syncRowPresentation() {
    $('island-surface').dataset.focused = String(focused);
    for (const [key, row] of rowMap) {
      const open = selected === key;
      row.hidden = focused && !open;
      row.classList.toggle('is-selected', open);
      row.querySelector('.session-toggle').setAttribute('aria-expanded', String(open));
      row.querySelector('.detail-shell').inert = !open;
    }
    $('all-sessions-button').hidden = !focused;
    $('all-sessions-button').textContent = `Show all ${sessions.length} sessions`;
    if (!settingsOpen) { $('settings-back').hidden = !focused; $('back-destination').textContent = 'Sessions'; }
    renderUsage();
  }
  function changeViewContent() {
    if (reduced()) return;
    const views = settingsOpen ? [$('settings-scroll')] : [$('sessions-list'), $('usage-band')];
    for (const view of views) {
      view.getAnimations().filter(animation => animation.id === 'view-content').forEach(animation => animation.cancel());
      const animation = view.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: motionTime('--content'), delay: 100, fill: 'backwards', easing: 'cubic-bezier(.2,0,0,1)' });
      animation.id = 'view-content';
    }
  }
  function showOverview() {
    if (settingsOpen) leaveSettings(false);
    focused = false; selected = null; syncRowPresentation();
    setExpanded(true); changeViewContent();
  }
  function showFocused(id, focus = false) {
    if (!sessions.some((s) => s.sessionId === id)) return;
    lastProvider = sessions.find(s => s.sessionId === id).agentId;
    if (settingsOpen) leaveSettings(false);
    focused = true; selected = id; syncRowPresentation();
    setExpanded(true, focus); changeViewContent();
  }
  function openFromCompact() {
    if (settingsOpen) leaveSettings(false);
    const s = representative();
    if (s && (isPending(s) || s.status === 'completed')) showFocused(s.sessionId, true);
    else { focused = false; selected = null; syncRowPresentation(); setExpanded(true, true); }
  }
  function stopTour() {
    tourTimers.forEach(clearTimeout); tourTimers = [];
    $('follow-button').setAttribute('aria-pressed', 'false');
    $('follow-button').setAttribute('aria-label', 'Play reference-inspired preview sequence');
    $('follow-button').innerHTML = icon('play');
  }
  function playTour() {
    if (!preview) return;
    if (tourTimers.length) { stopTour(); return; }
    $('follow-button').setAttribute('aria-pressed', 'true');
    $('follow-button').setAttribute('aria-label', 'Stop preview sequence');
    $('follow-button').innerHTML = icon('stop');
    const schedule = (delay, action) => tourTimers.push(setTimeout(action, delay));
    const id = () => sessions.find((s) => s.agentId === labAgent).sessionId;
    setLabAgent('codex'); setLabState('running'); setExpanded(false);
    schedule(1800, () => { setLabState('waiting_input'); });
    schedule(2600, () => showFocused(id()));
    schedule(4700, () => { setLabAgent('opencode'); setLabState('waiting_approval'); showFocused(id()); });
    schedule(7000, () => { setExpanded(false); setLabState('running'); });
    schedule(8500, () => { setLabAgent('antigravity'); setLabState('completed'); });
    schedule(9300, () => showFocused(id()));
    schedule(11400, showOverview);
    schedule(13700, () => { setExpanded(false); stopTour(); });
  }
  function button(text, action, className = '') {
    return `<button class="text-button ${className}" data-action="${action}">${text}</button>`;
  }
  function detailMarkup(s) {
    const state = displayState(s), caps = s.capabilities || {};
    const meta = [avatar.names[s.agentId] || s.agentName || 'Agent', s.terminalName, s.modelName].filter(Boolean);
    let content = '';
    if (s.status === 'waiting_approval') {
      content = `<div class="request-surface"><div class="command-line"><pre class="command">${esc(s.command || s.question || 'Permission requested')}</pre><button class="icon-button" data-action="copy" aria-label="Copy command" title="Copy command">${icon('copy')}</button></div>${s.workingDirectory ? `<span class="path">${esc(s.workingDirectory)}</span>` : ''}</div><div class="request-actions"><span class="scope">${caps.canApprove ? 'Applies to this request only.' : 'Monitoring only. Respond in your terminal.'}</span><div class="decision-buttons" role="group" aria-label="Permission decision">${caps.canApprove && s.requestId ? button('Deny', 'deny') + button('Allow Once', 'allow', 'primary') : terminalAction(s) ? button('Open terminal', 'jump') : ''}</div></div><p class="delivery-note" hidden></p>`;
    } else if (s.status === 'waiting_input') {
      content = `<div class="request-surface"><p class="question">${esc(s.question || s.prompt || 'Reply in your terminal.')}</p>${caps.canAnswer && s.requestId ? `<div class="option-list">${(s.options || []).map((option, i) => `<button class="text-button option-button" data-action="option" data-option="${i}">${esc(typeof option === 'string' ? option : option.label)}${i === 0 && preview ? '<small>Recommended</small>' : ''}</button>`).join('')}</div><form class="reply-form"><label for="reply-${esc(s.sessionId)}" class="sr-only">Reply to ${esc(avatar.names[s.agentId])}</label><textarea id="reply-${esc(s.sessionId)}" class="reply-input" rows="1" placeholder="Or write a reply...">${esc(drafts.get(requestKey(s)) || '')}</textarea><button class="icon-button" data-action="send" type="submit" aria-label="Send reply" title="Send reply · Ctrl+Enter">${icon('send')}</button></form>` : terminalAction(s) ? button('Open terminal', 'jump') : '<p class="scope">Monitoring only. Respond in your terminal.</p>'}<p class="delivery-note" hidden></p></div>`;
    } else {
      const message = state === 'disconnected' ? 'Terminal closure verified. Last known session data is preserved.' : s.result || (state === 'checking' ? `Verifying the terminal and observer. Last known activity: ${s.activity || avatar.states[s.status] || s.status}.` : state === 'failed' ? s.error || 'The process exited with an error. Open the terminal for details.' : s.activity || 'Waiting for activity.');
      content = `<p class="result-note" style="--state-color:${COLORS[state]}">${glyph(state)}<span>${esc(message)}</span></p>`;
    }
    const archive = window.IslandDesktop?.archiveSession && (s.terminalStatus === 'closed' || (!isPending(s) && (s.status !== 'running' || s.endedAt))) ? `<div class="detail-tools">${button('Archive session', 'archive')}</div>` : '';
    return `<div class="detail-meta">${meta.map((part, i) => `${i ? '<span class="meta-separator">/</span>' : ''}<${i === 0 ? 'strong' : 'span'}>${esc(part)}</${i === 0 ? 'strong' : 'span'}>`).join('')}</div>${s.prompt ? `<p class="prompt">${esc(s.prompt)}</p>` : ''}${content}${archive}`;
  }
  function createRow(s) {
    const row = document.createElement('article'); row.className = 'session'; row.setAttribute('role', 'listitem'); row.dataset.session = s.sessionId;
    row.innerHTML = `<div class="session-heading"><button class="session-toggle" aria-expanded="false"><span class="avatar-slot"></span><span class="session-copy"><span class="task-line"></span><span class="activity-line"><span class="state-glyph"></span><span class="activity-text"></span></span></span></button><time class="elapsed"></time><button class="icon-button jump-button" data-action="jump">${icon('jump')}</button></div><div class="detail-shell" inert><div class="detail-clip"><div class="detail-content"></div></div></div>`;
    row.querySelector('.session-toggle').addEventListener('click', () => setSelected(s.sessionId));
    row.addEventListener('click', (event) => {
      const control = event.target.closest('[data-action]');
      if (!control) return;
      const current = sessions.find((item) => item.sessionId === s.sessionId);
      if (!current) return;
      const action = control.dataset.action;
      if (action === 'jump') jump(current);
      else if (action === 'archive') void archiveSession(current, true, control);
      else if (action === 'copy') copy(current.command || '');
      else if (action === 'allow' || action === 'deny') sendResponse(current, action);
      else if (action === 'option') {
        const option = current.options[Number(control.dataset.option)];
        sendResponse(current, 'answer', typeof option === 'string' ? option : option.value || option.label);
      }
    });
    row.addEventListener('input', (event) => {
      if (event.target.matches('.reply-input')) {
        const current = sessions.find((item) => item.sessionId === s.sessionId);
        drafts.set(requestKey(current), event.target.value);
      }
    });
    row.addEventListener('submit', (event) => {
      event.preventDefault();
      const current = sessions.find((item) => item.sessionId === s.sessionId);
      sendResponse(current, 'answer', row.querySelector('.reply-input').value);
    });
    return row;
  }
  function updateRow(row, s, replay = false) {
    const state = displayState(s), avatarState = delivery.get(requestKey(s)) === 'sending' ? 'sending' : state;
    const signature = `${s.agentId}:${avatarState}`;
    if (row.dataset.avatar !== signature || replay) {
      setAvatars(row.querySelector('.avatar-slot'), avatar.render(s.agentId, avatarState, false, !preview && silentPoses.has(`${s.sessionId}:${s.status}`))); row.dataset.avatar = signature;
    }
    row.style.setProperty('--state-color', COLORS[state]);
    row.querySelector('.task-line').innerHTML = `<span class="project-name">${esc(s.projectName || 'Session')}</span><span class="task-separator">/</span>${esc(s.taskTitle || 'Untitled task')}`;
    const activity = row.querySelector('.activity-text');
    const text = state === 'disconnected' ? 'Offline · terminal closed' : state === 'checking' ? `Checking · last known: ${avatar.states[s.status] || s.status}` : state === 'idle' ? 'Idle · ready for the next task' : s.activity || avatar.states[state] || 'Idle';
    if (activity.textContent !== text) {
      activity.textContent = text;
      if (!reduced()) activity.animate([{ opacity: .15, transform: 'translateY(2px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' });
    }
    const glyphEl = row.querySelector('.state-glyph');
    if (glyphEl.dataset.state !== state) { glyphEl.innerHTML = glyph(state); glyphEl.dataset.state = state; }
    glyphEl.title = avatar.states[state];
    row.querySelector('.elapsed').textContent = s.elapsed || '';
    const jumpButton = row.querySelector('.jump-button');
    jumpButton.disabled = !terminalAction(s) || terminalBusy;
    jumpButton.title = preview ? `Preview: open ${s.terminalName || 'terminal'}` : nativeOrca(s) ? terminalBusy ? 'Checking Orca terminal…' : 'Open or link source terminal in Orca' : s.capabilities?.canJump ? `Open ${s.terminalName || 'session terminal'}` : 'Terminal navigation is unavailable for this integration';
    jumpButton.setAttribute('aria-label', jumpButton.title);
    // Stable detail DOM preserves caret and draft on unrelated progress updates.
    const detailSignature = JSON.stringify([s.requestId, s.status, !isPending(s) && state, s.prompt, s.question, s.options, s.command, s.result, s.error, s.capabilities, s.terminalName, s.modelName]);
    if (row.dataset.detail !== detailSignature) {
      row.querySelector('.detail-content').innerHTML = detailMarkup(s); row.dataset.detail = detailSignature;
    }
    row.classList.toggle('is-selected', selected === s.sessionId);
    row.querySelector('.session-toggle').setAttribute('aria-expanded', String(selected === s.sessionId));
    row.querySelector('.detail-shell').inert = selected !== s.sessionId;
    updateDeliveryUI(s);
  }
  function renderSessions(replayId) {
    const container = $('sessions-list');
    for (const [id, row] of rowMap) if (!sessions.some((s) => s.sessionId === id)) {
      row.querySelectorAll('.agent-avatar').forEach((el) => avatarVisibility.unobserve(el));
      row.remove(); rowMap.delete(id);
    }
    if (!sessions.length) {
      container.innerHTML = `<div class="empty-state"><p>No active sessions.<br>Connect an agent to follow its work here.</p><button class="text-button" id="connect-button">Connect</button></div>`;
      $('connect-button').addEventListener('click', openSettings);
    } else {
      container.querySelector('.empty-state')?.remove();
      sessions.forEach((s) => {
        if (!rowMap.has(s.sessionId)) { const row = createRow(s); rowMap.set(s.sessionId, row); container.append(row); }
        updateRow(rowMap.get(s.sessionId), s, replayId === s.sessionId);
      });
    }
    $('session-count').textContent = String(sessions.length);
    $('session-count').title = `${sessions.length} sessions`;
    $('session-count').setAttribute('aria-label', `${sessions.length} sessions`);
    const totals = window.IslandPresentation.counts(sessions, offline);
    $('session-count').textContent = offline ? `${sessions.length} saved` : `${totals.live} live${totals.saved ? ` · ${totals.saved} saved` : ''}`;
    $('session-count').title = $('session-count').textContent;
    $('session-count').setAttribute('aria-label', $('session-count').textContent);
    const unique = [...new Set(sessions.map((s) => s.agentId))];
    const headerSignature = unique.join(',');
    if ($('header-avatars').dataset.signature !== headerSignature) {
      $('header-avatars').innerHTML = unique.map((id) => avatar.render(id, 'idle', true)).join(''); $('header-avatars').dataset.signature = headerSignature;
    }
    const pending = sessions.filter(isPending).length;
    $('attention-count').hidden = !pending;
    $('attention-count').innerHTML = `${icon('permission')}<span>${pending}</span>`;
    $('attention-count').title = `${pending} pending requests`;
    $('attention-count').setAttribute('aria-label', `${pending} pending requests`);
    $('settings-attention').hidden = !settingsOpen || !pending;
    $('settings-attention').textContent = pending > 1 ? `View requests · ${pending}` : 'View request';
    syncRowPresentation();
    renderUsage();
    renderCompact(); requestAnimationFrame(fitSurface);
    updateTerminalBusy();
  }
  function updateDeliveryUI(s) {
    const row = rowMap.get(s.sessionId); if (!row) return;
    const status = delivery.get(requestKey(s));
    const blocked = status === 'sending' || status === 'acknowledged' || disconnected(s);
    row.querySelectorAll('.detail-content button:not([data-action="copy"]):not([data-action="jump"]):not([data-action="archive"])').forEach((el) => { el.disabled = Boolean(blocked); });
    // Read-only retains textarea focus and selection while delivery is unavailable.
    const input = row.querySelector('.reply-input');
    if (input) input.readOnly = Boolean(blocked);
    const note = row.querySelector('.delivery-note');
    if (note) {
      note.hidden = !status && !disconnected(s);
      note.dataset.error = String(status === 'error');
      note.textContent = status === 'sending' ? 'Sending...' : status === 'acknowledged' ? preview ? 'Preview response received.' : 'Response received. Waiting for agent.' : status === 'error' ? 'Could not deliver. Try again.' : disconnected(s) ? 'Last known request. Fresh observer activity is required before responding.' : '';
    }
  }
  async function sendResponse(s, action, value) {
    if (!s || !s.requestId || !isPending(s) || disconnected(s) || (action === 'answer' ? !s.capabilities?.canAnswer : !s.capabilities?.canApprove)) return;
    if (action === 'answer' && !String(value || '').trim()) return;
    const key = requestKey(s);
    if (delivery.get(key) === 'sending' || delivery.get(key) === 'acknowledged') return;
    delivery.set(key, 'sending'); updateRow(rowMap.get(s.sessionId), s); fitSurface();
    try {
      if (preview) await new Promise((resolve) => setTimeout(resolve, reduced() ? 120 : 600));
      else {
        const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, session: s.sessionId, sessionId: s.sessionId, requestId: s.requestId, value }), signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error('Request failed');
        const result = await response.json();
        if (result.requestId !== s.requestId || result.acknowledged !== true) throw new Error('No adapter acknowledgment');
      }
      // An expired request or disconnected transport invalidates a late response.
      const current = sessions.find((item) => item.sessionId === s.sessionId);
      if (!current || requestKey(current) !== key || !isPending(current) || disconnected(current)) {
        delivery.delete(key); if (current) updateDeliveryUI(current); return;
      }
      delivery.set(key, 'acknowledged'); updateRow(rowMap.get(current.sessionId), current);
      notify(preview ? `Preview: ${action === 'answer' ? 'reply sent' : action === 'allow' ? 'allowed' : 'denied'}` : 'Response received by adapter');
      if (preview) setTimeout(() => {
        if (!sessions.includes(current) || requestKey(current) !== key || !isPending(current) || delivery.get(key) !== 'acknowledged') return;
        current.status = action === 'deny' ? 'idle' : 'running';
        current.activity = action === 'deny' ? 'Action declined · waiting for next step' : action === 'answer' ? `Using ${String(value).slice(0, 60)}` : 'Running npm test';
        renderSessions();
      }, 700);
    } catch {
      delivery.set(key, 'error'); updateRow(rowMap.get(s.sessionId), s); fitSurface(); notify('Response was not delivered. Try again.');
    }
  }
  async function copy(value) {
    try { await navigator.clipboard.writeText(value); notify('Command copied'); } catch { notify('Clipboard unavailable. Select the command to copy.'); }
  }
  async function jump(s) {
    if (preview) { notify(`Preview: open ${s.terminalName || 'terminal'}`); return; }
    if (nativeOrca(s)) { await navigateOrca(s.sessionId, 'open'); return; }
    if (!s.capabilities?.canJump) return;
    try {
      const response = await fetch('/api/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'jump', sessionId: s.sessionId, target: s.terminalTarget || s.terminalName }), signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('Target unavailable');
      notify('Terminal focus requested');
    } catch { notify('Terminal not found. Check that it is still open.'); }
  }
  function setLabState(state, replay = false) {
    if (!preview || !Object.hasOwn(avatar.states, state)) return;
    const s = sessions.find((item) => item.agentId === labAgent);
    if (!s) return;
    const same = s.status === state && s.connectionStatus !== 'disconnected';
    delivery.delete(requestKey(s));
    s.status = state === 'disconnected' ? 'running' : state;
    s.connectionStatus = state === 'disconnected' ? 'disconnected' : 'connected';
    s.requestId = `preview-${state}-${Date.now()}`;
    s.capabilities = { canJump: true, canAnswer: state === 'waiting_input', canApprove: state === 'waiting_approval' };
    s.question = 'Which database should store the app settings?'; s.options = ['SQLite', 'PostgreSQL']; s.command = 'npm test';
    s.activity = ({ running: 'Reading src/auth.ts', idle: 'Ready for the next task', waiting_input: 'Choosing a storage engine', waiting_approval: 'npm test', completed: '3 files updated', failed: 'Tests failed · exit code 1', disconnected: 'Last seen reading src/auth.ts' })[state];
    s.result = state === 'completed' ? 'Task complete. 3 files updated.' : undefined;
    s.error = state === 'failed' ? 'Tests failed with exit code 1. Open the terminal to inspect the output.' : undefined;
    $('state-picker').value = state;
    labFocused = true;
    if (!same && !replay && ['waiting_input', 'waiting_approval', 'completed'].includes(state)) playCue(state);
    renderSessions(replay || same ? s.sessionId : undefined);
    if (selected === s.sessionId) fitSurface();
  }
  function setLabAgent(id) {
    if (!Object.hasOwn(avatar.names, id) || !sessions.some((s) => s.agentId === id)) return;
    labAgent = id;
    labFocused = true;
    document.querySelectorAll('.agent-picker button').forEach((el) => el.setAttribute('aria-pressed', String(el.dataset.agent === id)));
    const s = sessions.find((item) => item.agentId === id);
    $('state-picker').value = displayState(s);
    renderCompact(); fitSurface();
  }
  function setBezel(value) {
    bezel = Boolean(value);
    document.body.classList.toggle('bezel', bezel);
    $('bezel-button').setAttribute('aria-pressed', String(bezel));
    const label = bezel ? 'Switch to floating island' : 'Attach to top edge';
    $('bezel-button').setAttribute('aria-label', label);
    $('bezel-button').title = label;
    $('setting-bezel').checked = bezel;
    fitSurface();
  }
  let codexSetup = null, codexSetupBusy = false, codexSetupError = '';
  let setupStep = 0, setupReviewed = false, setupStartedAt = Date.now(), setupGuideStarted = false;
  function renderSetupGuide() {
    const guide = $('codex-guide');
    guide.hidden = providerPage !== 'codex' || Boolean(terminalPickerSession) || preview || !window.IslandDesktop?.codexIntegration;
    if (guide.hidden) return;
    const verified = setupReviewed && !offline && sessions.some(s => s.agentId === 'codex' && s.connectionStatus === 'connected' && s.eventKind !== 'recovery' && s.lastSeenAt > setupStartedAt);
    const titles = ['Find Codex CLI', 'Register monitoring hooks', 'Review trust in Codex', verified ? 'Activity verified' : 'Waiting for fresh activity'];
    const notes = ['Check the installed CLI before changing configuration.', 'Connect preserves other hooks and creates a configuration backup.', 'Restart Codex, run /hooks, and review the Threadcap observer (legacy vibe-island tag). Trust stays under your control.', verified ? 'A fresh Codex event arrived during this setup. Approvals and replies remain in Codex.' : 'Send a prompt from your Codex terminal. Registration and quota readings do not verify activity.'];
    $('setup-step-title').textContent = titles[setupStep];
    $('setup-step-note').textContent = codexSetupError || notes[setupStep];
    document.querySelectorAll('[data-setup-stage]').forEach(el => {
      const index = Number(el.dataset.setupStage);
      el.classList.toggle('is-complete', index < setupStep || (index === 3 && verified));
      if (index === setupStep) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
    });
    const actions = { 'setup-detect': setupStep === 0, 'setup-connect': setupStep === 1, 'setup-copy': setupStep === 2, 'setup-reviewed': setupStep === 2, 'setup-verify': setupStep === 3 && !verified, 'setup-back': setupStep > 0 };
    for (const [id, visible] of Object.entries(actions)) { $(id).hidden = !visible; $(id).disabled = codexSetupBusy; }
    $('setup-connect').textContent = codexSetup?.registered ? 'Reconnect' : 'Connect';
  }
  async function advanceSetup(action) {
    if (codexSetupBusy) return;
    if (action === 'detect') {
      await checkCodexSetup('status');
      if (!codexSetupError && codexSetup?.cliAvailable) setupStep = 1;
      else if (!codexSetupError) codexSetupError = 'Codex CLI is unavailable. Install it, then retry detection.';
    } else if (action === 'connect') {
      setupStartedAt = Date.now(); setupReviewed = false;
      await checkCodexSetup('connect');
      if (!codexSetupError && codexSetup?.registered) setupStep = 2;
    } else if (action === 'reviewed') { setupReviewed = true; setupStep = 3; }
    else if (action === 'back') setupStep = Math.max(0, setupStep - 1);
    else if (action === 'verify') await checkCodexSetup('status');
    renderSetupGuide(); changeViewContent(); fitSurface();
    if (settingsOpen && providerPage === 'codex') $('codex-guide').querySelector('button:not([hidden]):not(:disabled)')?.focus({ preventScroll: true });
  }
  function updateCodexSetup() {
    const button = $('connect-codex'), status = $('codex-integration-status'), note = $('codex-setup-note');
    if (!button) return;
    const linked = !offline && sessions.some((s) => s.agentId === 'codex' && s.connectionStatus === 'connected');
    button.disabled = codexSetupBusy;
    button.textContent = codexSetupBusy ? 'Checking…' : codexSetup?.registered ? 'Reconnect' : 'Connect';
    button.setAttribute('aria-label', codexSetup?.registered ? 'Reconnect Codex CLI' : 'Connect Codex CLI');
    button.setAttribute('aria-busy', String(codexSetupBusy));
    status.textContent = linked ? 'Monitor' : codexSetupBusy ? 'Checking…' : codexSetup?.registered ? 'Registered' : 'Not connected';
    note.classList.toggle('is-error', Boolean(codexSetupError));
    const message = codexSetupError || (linked
      ? 'Codex activity is connected. Approve and reply in Codex.'
      : codexSetup?.registered
        ? 'Restart Codex, open /hooks, and review the Threadcap observer (legacy vibe-island tag). Then send a prompt. Approval stays in Codex.'
        : 'Connect registers monitoring hooks and backs up existing configuration. Codex will ask you to review them in /hooks.');
    if (note.textContent !== message) note.textContent = message;
    renderSetupGuide();
    window.IslandDesktop?.scheduleGeometry();
    if (settingsOpen) fitSurface();
  }
  async function checkCodexSetup(action) {
    if (preview || !window.IslandDesktop?.codexIntegration || codexSetupBusy) return;
    const trigger = $('connect-codex'), restoreFocus = document.activeElement === trigger;
    codexSetupBusy = true; codexSetupError = ''; updateCodexSetup();
    try {
      codexSetup = await window.IslandDesktop.codexIntegration(action);
      codexSetupError = codexSetup.error || '';
    } catch (error) { codexSetupError = String(error); }
    finally {
      codexSetupBusy = false; updateCodexSetup();
      if (restoreFocus && settingsOpen && !providerPage && settingsPage === 'agents' && $('connect-codex') === trigger && document.activeElement === document.body) trigger.focus({ preventScroll: true });
    }
  }
  function openSettings() {
    if (terminalBusy) terminalEpoch++;
    if (!settingsOpen) savedSessionView = { focused, selected, scroll: $('sessions-list').scrollTop, focus: document.activeElement, start: document.activeElement?.selectionStart, end: document.activeElement?.selectionEnd };
    const nativeSetup = !preview && Boolean(window.IslandDesktop?.codexIntegration);
    if (!$('settings-integrations').children.length) $('settings-integrations').innerHTML = ['codex', 'antigravity', 'opencode'].map((id) => {
      const linked = !offline && sessions.some((s) => s.agentId === id && s.connectionStatus === 'connected');
      const setup = nativeSetup && id === 'codex';
      return `<div class="integration-row"><button class="integration-identity" data-provider="${id}" aria-label="${avatar.names[id]} connection and quota">${avatar.render(id, 'idle', true)}<span>${avatar.names[id]} CLI</span></button><span class="integration-controls"><span class="integration-mode" data-provider-status="${id}" ${setup ? 'id="codex-integration-status"' : ''}>${preview ? 'Preview' : linked ? 'Monitor' : 'Not connected'}</span>${setup ? '<button id="connect-codex" class="text-button" aria-describedby="codex-setup-note">Connect</button>' : nativeSetup && window.IslandDesktop?.providerIntegration ? `<button class="text-button" data-provider="${id}">Connect</button>` : ''}</span></div>${setup ? '<p id="codex-setup-note" class="settings-note codex-setup-note" role="status" aria-live="polite" aria-atomic="true"></p>' : ''}`;
    }).join('');
    $('settings-note').textContent = preview ? 'Simulated sessions. Preview controls never send actions to real agents.' : 'Monitoring depends on the local adapter. Interactive controls appear only when explicitly supported.';
    settingsOpen = true;
    $('island-surface').dataset.settings = 'true';
    $('settings-view').hidden = false; $('settings-title').hidden = false; $('settings-back').hidden = false;
    $('sessions-list').inert = true;
    setExpanded(true);
    setSettingsPage(settingsPage, false);
    const pending = sessions.filter(isPending).length;
    $('settings-attention').hidden = !pending;
    $('settings-attention').textContent = pending > 1 ? `View requests · ${pending}` : 'View request';
    $('settings-back').focus({ preventScroll: true });
    if (nativeSetup) {
      $('connect-codex').onclick = () => checkCodexSetup('connect');
      updateCodexSetup();
      void checkCodexSetup('status');
    }
  }
  function setSettingsPage(page, restore = true) {
    if (!['agents','appearance','behavior','archive'].includes(page)) return;
    if (page !== settingsPage) closeArchiveConfirmation(false);
    settingsScroll.set(settingsPage, $('settings-scroll').scrollTop);
    settingsPage = page;
    $('settings-title').textContent = page === 'archive' ? 'Archive' : 'Settings';
    $('settings-view').querySelector('nav').hidden = page === 'archive';
    $('archive-button').hidden = settingsOpen;
    document.querySelectorAll('[data-settings-page]').forEach(el => {
      if (el.dataset.settingsPage === page) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    document.querySelectorAll('.settings-page').forEach(el => { el.hidden = el.id !== `settings-${page}`; });
    $('agents-overview').hidden = Boolean(providerPage);
    $('provider-detail').hidden = !providerPage;
    $('settings-back').setAttribute('aria-label', providerPage && page === 'agents' ? 'Back to agents' : 'Back to sessions');
    $('back-destination').textContent = providerPage && page === 'agents' ? 'Agents' : 'Sessions';
    if (providerPage) updateProviderDetail();
    $('settings-scroll').scrollTop = restore ? settingsScroll.get(page) || 0 : 0;
    $('island-surface').classList.add('is-page-changing');
    changeViewContent(); fitSurface();
    clearTimeout(pageGeometryTimer);
    pageGeometryTimer = setTimeout(() => $('island-surface').classList.remove('is-page-changing'), reduced() ? 0 : motionTime('--page') + 20);
  }
  function openProvider(id) {
    if (id === 'codex' && !setupGuideStarted) { setupStartedAt = Date.now(); setupGuideStarted = true; }
    lastProvider = id;
    openSettings(); providerPage = id; setSettingsPage('agents');
  }
  function updateProviderDetail() {
    if (!providerPage) return;
    $('terminal-picker').hidden = !terminalPickerSession;
    $('provider-usage-detail').hidden = Boolean(terminalPickerSession);
    $('provider-diagnostics').hidden = Boolean(terminalPickerSession);
    renderSetupGuide();
    renderProviderSetup();
    if (terminalPickerSession) {
      $('provider-title').textContent = 'Choose source terminal';
      const s = sessions.find(item => item.sessionId === terminalPickerSession);
      $('terminal-session-context').textContent = s ? `${s.taskTitle || 'Codex session'}${s.workingDirectory ? ` · ${s.workingDirectory}` : ''}` : 'Session no longer available.';
      return;
    }
    $('provider-title').textContent = `${avatar.names[providerPage]} CLI`;
    $('provider-usage-detail').innerHTML = window.IslandUsage.detail(providerPage);
    $('provider-diagnostics').textContent = providerPage === 'codex' ? codexSetupError || (codexSetup?.registered ? 'Hooks registered. Review trust in Codex using /hooks. Approval and replies remain in Codex.' : 'Return to Agents and use Connect to register monitoring hooks.') : 'Monitoring only. Approvals and answers remain in the provider terminal. Account quota availability is shown below. Link the source terminal explicitly when needed.';
  }
  function renderProviderSetup() {
    const visible = !preview && providerPage && providerPage !== 'codex' && !terminalPickerSession && Boolean(window.IslandDesktop?.providerIntegration);
    $('provider-connect-guide').hidden = !visible;
    if (!visible) return;
    const setup = providerSetups.get(providerPage) || {};
    const verified = setup.reviewed && !offline && retained.some(s => s.agentId === providerPage && s.connectionStatus === 'connected' && s.eventKind !== 'recovery' && s.lastSeenAt > setup.started);
    const review = providerPage === 'antigravity' ? 'Restart Antigravity, open /hooks, and review threadcap-monitor. Then send a prompt in your terminal.' : 'Review the installed Threadcap plugin. Restart OpenCode CLI to enable terminal-close detection, then open a session.';
    $('provider-connect-note').textContent = providerSetupBusy ? 'Checking integration…' : setup.error || (verified ? 'Fresh activity verified. Monitoring is connected.' : setup.registered ? `${setup.version || ''} · Registered. ${review} Registration alone does not verify live activity.` : setup.version ? `${setup.version} · ${setup.supported ? 'Compatible CLI detected. Connect installs only the Threadcap observer.' : 'This version is not supported; existing configuration is preserved.'}` : 'Detect the installed CLI, connect its observer, review it, then verify fresh activity. No task is launched automatically.');
    for (const id of ['provider-detect','provider-connect','provider-reviewed','provider-verify']) $(id).disabled = providerSetupBusy;
    $('provider-connect').disabled = providerSetupBusy || setup.supported !== true;
    $('provider-reviewed').hidden = !setup.registered || setup.reviewed;
    $('provider-verify').hidden = !setup.reviewed;
    const stage = verified ? 3 : setup.reviewed ? 3 : setup.registered ? 2 : setup.version ? 1 : 0;
    $('provider-connect-guide').querySelectorAll('li').forEach((el,index) => { el.dataset.current = String(index === stage); el.dataset.complete = String(index < stage); });
  }
  async function providerSetup(action) {
    const id = providerPage;
    if (providerSetupBusy || !id || id === 'codex' || !window.IslandDesktop?.providerIntegration) return;
    const previous = providerSetups.get(id) || { started: Date.now() };
    if (action === 'review') { providerSetups.set(id,{ ...previous, reviewed: true }); renderProviderSetup(); fitSurface(); return; }
    providerSetupBusy = true; renderProviderSetup();
    try { const result = await window.IslandDesktop.providerIntegration(id,action); providerSetups.set(id,{ ...previous, ...result, error: '', ...(action === 'connect' ? { reviewed: false, started: Date.now() } : {}) }); }
    catch (error) { providerSetups.set(id,{ ...previous, error: String(error) }); }
    finally { providerSetupBusy = false; if (settingsOpen && providerPage === id) { renderProviderSetup(); fitSurface(); } }
  }
  function leaveSettings(restore) {
    if (!settingsOpen) return;
    closeArchiveConfirmation(false);
    if (terminalBusy) terminalEpoch++;
    terminalPickerSession = null;
    settingsScroll.set(settingsPage, $('settings-scroll').scrollTop);
    settingsOpen = false;
    $('archive-button').hidden = false;
    $('island-surface').dataset.settings = 'false';
    $('settings-view').hidden = true; $('settings-title').hidden = true; $('settings-back').hidden = true; $('settings-attention').hidden = true;
    $('sessions-list').inert = false;
    if (restore && savedSessionView) {
      selected = sessions.some(s => s.sessionId === savedSessionView.selected) ? savedSessionView.selected : null;
      focused = Boolean(selected && savedSessionView.focused); syncRowPresentation();
      renderUsage(); fitSurface(); changeViewContent();
      $('sessions-list').scrollTop = savedSessionView.scroll;
      const target = savedSessionView.focus;
      if (target?.isConnected && !target.closest('[hidden]')) {
        target.focus({ preventScroll: true });
        if (typeof savedSessionView.start === 'number' && target.setSelectionRange) target.setSelectionRange(savedSessionView.start, savedSessionView.end);
      } else $('settings-button').focus({ preventScroll: true });
    }
  }
  function backFromSettings() {
    if (!settingsOpen) { showOverview(); $('settings-button').focus({ preventScroll: true }); return; }
    if (pendingArchiveDelete) { closeArchiveConfirmation(true); return; }
    if (settingsPage === 'agents' && providerPage) { if (terminalBusy) terminalEpoch++; terminalPickerSession = null; providerPage = null; setSettingsPage('agents'); $('settings-integrations').querySelector('button')?.focus(); }
    else leaveSettings(true);
  }
  function renderUsage() {
    const providers = [...new Set(sessions.map(s => s.agentId))];
    const shown = focused ? [sessions.find(s => s.sessionId === selected)?.agentId].filter(Boolean) : providers.length ? providers : ['codex'];
    const markup = shown.map(id => `<button class="usage-row" data-usage-provider="${esc(id)}" aria-label="${esc(avatar.names[id])} account quota details">${avatar.render(id, 'idle', true)}<span>${esc(avatar.names[id])}</span><span class="usage-scope">${focused ? 'Session account unverified' : 'Account'}</span><span class="usage-value">${esc(window.IslandUsage.summary(id, focused))}</span></button>`).join('');
    if (markup !== usageSignature) {
      const focusProvider = document.activeElement?.dataset.usageProvider;
      $('usage-band').innerHTML = markup; usageSignature = markup;
      if (focusProvider && !settingsOpen) $('usage-band').querySelector(`[data-usage-provider="${CSS.escape(focusProvider)}"]`)?.focus({ preventScroll: true });
    }
    if (settingsOpen) updateProviderDetail();
    renderArchive();
  }
  function savePreferences() {
    try { localStorage.setItem('island.preferences', JSON.stringify({ motion: motionOverride, bezel, audio, autoOpen })); $('preferences-note').textContent = ''; }
    catch { $('preferences-note').textContent = 'Could not save preferences. Changes apply only for this run.'; }
    if (settingsOpen) fitSurface();
  }
  function updateTerminalBusy() {
    $('terminal-refresh').disabled = terminalBusy;
    $('terminal-picker').setAttribute('aria-busy', String(terminalBusy));
    $('terminal-choices').querySelectorAll('button').forEach(button => { button.disabled = terminalBusy; });
    for (const s of sessions) {
      const row = rowMap.get(s.sessionId); if (!row) continue;
      row.querySelectorAll('[data-action="jump"]').forEach(button => { button.disabled = terminalBusy || !terminalAction(s); button.setAttribute('aria-busy', String(terminalBusy)); });
    }
  }
  async function navigateOrca(sessionId, action, choice = null) {
    if (terminalBusy || !sessions.some(s => s.sessionId === sessionId && nativeOrca(s))) return;
    const epoch = ++terminalEpoch;
    terminalBusy = true; updateTerminalBusy();
    let result, error;
    try { result = await window.IslandDesktop.orcaTerminal(sessionId, action, choice); }
    catch (failure) { error = String(failure); }
    finally { terminalBusy = false; updateTerminalBusy(); }
    if (epoch !== terminalEpoch) return;
    if (result?.sessionId === sessionId && result.state === 'opened' && result.acknowledged === true) {
      leaveSettings(false); setExpanded(false); $('announcer').textContent = 'Orca opened the selected terminal.'; return;
    }
    if (result && (result.sessionId !== sessionId || result.state !== 'choose')) { error = 'Orca did not return a valid navigation result.'; result = null; }
    terminalChoices = Array.isArray(result?.terminals) ? result.terminals : [];
    terminalPickerSession = sessionId;
    const provider = sessions.find(s => s.sessionId === sessionId)?.agentId || 'codex';
    if (!settingsOpen || providerPage !== provider) openProvider(provider);
    else setSettingsPage('agents');
    $('terminal-picker-note').dataset.error = String(Boolean(error));
    $('terminal-picker-note').textContent = error || `${result?.message || 'Choose the source terminal to link and open.'}${!terminalChoices.length ? ' No verified local terminals are available. Open one in Orca, then refresh.' : ''}${result?.truncated ? ' The list is incomplete; missing rows are not proof of closure.' : ''}`;
    $('terminal-choices').innerHTML = terminalChoices.map((terminal, i) => `<button class="terminal-choice" data-terminal-index="${i}"><strong>${esc(terminal.label || 'Codex terminal')}</strong><span>${esc(terminal.path || terminal.binding?.worktree || '')}</span><span>Link and open · ${esc(terminal.choice?.handle || '')}</span></button>`).join('');
    fitSurface(); $('terminal-refresh').focus({ preventScroll: true });
  }
  function markDisconnected() {
    sessionModel.disconnect();
    offline = true;
    if (settingsOpen) updateCodexSetup();
    $('connection-label').innerHTML = '<span class="connection-dot"></span>Reconnecting';
    renderSessions();
  }
  function resynchronize() {
    source?.close();
    source = null;
    markDisconnected();
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectBridge, 500);
  }
  function applyEvent(data) {
    if (preview) return;
    const result = sessionModel.ingest(data);
    if (result.needsSync) { resynchronize(); return; }
    if (!result.accepted) return;
    if (result.removed) {
      for (const id of result.removed) {
        for (const key of drafts.keys()) if (key.startsWith(id + ':')) drafts.delete(key);
        for (const key of delivery.keys()) if (key.startsWith(id + ':')) delivery.delete(key);
        for (const state of ['completed','failed']) silentPoses.delete(`${id}:${state}`);
      }
    }
    sessions = sessionModel.sessions;
    retained = sessions;
    sessions = retained.filter(s => !s.archived);
    offline = sessionModel.connectionState !== 'connected';
    if (settingsOpen) updateCodexSetup();
    $('connection-label').innerHTML = '<span class="connection-dot" style="background:var(--green)"></span>Local';
    const reveal = presentation.ingest({ ...result, sessions: retained });
    if (result.snapshot) retained.filter(s => ['completed','failed'].includes(s.status)).forEach(s => silentPoses.add(`${s.sessionId}:${s.status}`));
    else if (result.session && result.session.status !== result.previous?.status) silentPoses.delete(`${result.session.sessionId}:${result.session.status}`);
    // A reconnect snapshot restores context silently; it is not a new request.
    if (!result.snapshot && result.session) {
      const next = result.session, previous = result.previous;
      const changedRequest = next.requestId !== previous?.requestId;
      if (!disconnected(next) && (next.status !== previous?.status || changedRequest)) {
        if (isPending(next) || next.status === 'completed') playCue(next.status);
        if (isPending(next)) $('announcer').textContent = `${avatar.names[next.agentId]} needs ${next.status === 'waiting_input' ? 'input' : 'approval'}`;
      }
    }
    if (!sessions.some((s) => s.sessionId === selected)) { selected = null; focused = false; }
    renderSessions();
    if (reveal && autoOpen && !expanded && !settingsOpen && !document.activeElement?.matches('input,textarea,[contenteditable="true"]')) showFocused(reveal, false);
    clearTimeout(cooldownTimer);
    const deadlines = [...presentation.completions.values()].filter(time => time > Date.now());
    if (deadlines.length) cooldownTimer = setTimeout(() => { renderSessions(); scheduleCooldown(); }, Math.min(...deadlines) - Date.now() + 20);
  }
  function scheduleCooldown() {
    clearTimeout(cooldownTimer);
    const deadlines = [...presentation.completions.values()].filter(time => time > Date.now());
    if (deadlines.length) cooldownTimer = setTimeout(() => { renderSessions(); scheduleCooldown(); }, Math.min(...deadlines) - Date.now() + 20);
  }
  function renderArchive() {
    const archived = retained.filter(s => s.archived);
    const protectedContext = s => isPending(s) || (s.status === 'running' && !s.endedAt);
    const hasProtected = archived.some(protectedContext);
    $('archive-protection-note').hidden = !hasProtected;
    $('archive-protection-note').textContent = hasProtected ? 'Unresolved requests and unfinished work keep protected context. Restore them to review. Delete all is unavailable while protected context remains.' : '';
    $('archive-count').textContent = String(archived.length);
    $('show-archived').textContent = archived.length ? `View archive · ${archived.length}` : 'View archive';
    const container = $('archive-list');
    $('clear-archive').hidden = container.hidden || !archived.length || !window.IslandDesktop?.deleteArchived;
    $('clear-archive').disabled = archiveDeleting || Boolean(pendingArchiveDelete) || hasProtected;
    container.querySelectorAll('button').forEach(el => {
      const session = archived.find(s => s.sessionId === el.closest('[data-session-id]')?.dataset.sessionId);
      el.disabled = archiveDeleting || Boolean(pendingArchiveDelete) || (el.classList.contains('archive-remove') && session && protectedContext(session));
    });
    const signature = archived.map(s => `${s.sessionId}:${s.revision}`).join('|');
    if (container.dataset.signature === signature) return;
    container.dataset.signature = signature;
    for (const row of [...container.children]) if (!archived.some(s => s.sessionId === row.dataset.sessionId)) {
      const hadFocus = row.contains(document.activeElement); row.remove();
      if (hadFocus && settingsOpen && settingsPage === 'archive') $('settings-back').focus({ preventScroll: true });
    }
    if (!archived.length) container.textContent = 'No archived sessions.';
    else if (!container.children.length) container.textContent = '';
    for (const s of archived) {
      let row = [...container.children].find(row => row.dataset.sessionId === s.sessionId);
      if (!row) {
        row = document.createElement('div'); row.className = 'settings-row'; row.dataset.sessionId = s.sessionId;
        row.innerHTML = '<span class="archive-title"></span><span class="archive-controls"><button class="text-button archive-restore">Restore</button><button class="text-button destructive-action archive-remove">Delete</button></span>';
        container.append(row);
      }
      const title = row.querySelector('.archive-title'); title.textContent = s.taskTitle || s.projectName || 'Session';
      const restore = row.querySelector('.archive-restore');
      restore.onclick = () => void archiveSession(s, false, restore);
      const remove = row.querySelector('.archive-remove');
      remove.hidden = !window.IslandDesktop?.deleteArchived;
      remove.setAttribute('aria-label', `Delete archived session: ${title.textContent}`);
      remove.onclick = () => beginArchiveDelete([s]);
      restore.disabled = remove.disabled = archiveDeleting || Boolean(pendingArchiveDelete);
      if (protectedContext(s)) { remove.disabled = true; remove.title = 'Unresolved requests and unfinished work retain protected context. Restore to inspect.'; }
    }
  }
  function beginArchiveDelete(rows) {
    if (archiveDeleting || !rows.length || !window.IslandDesktop?.deleteArchived) return;
    archiveDeleteScroll = $('settings-scroll').scrollTop;
    pendingArchiveDelete = rows.map(s => ({ sessionId: s.sessionId, revision: s.revision }));
    archiveDeleteEpoch++;
    $('archive-delete-note').textContent = '';
    $('archive-confirm-title').textContent = rows.length === 1 ? 'Delete archived session?' : `Delete ${rows.length} archived sessions?`;
    $('archive-confirm-context').textContent = rows.length === 1 ? rows[0].taskTitle || rows[0].projectName || 'Saved session' : `Only these ${rows.length} currently archived sessions will be deleted. Newly archived sessions are excluded.`;
    $('archive-delete-confirm').textContent = rows.length === 1 ? 'Delete' : `Delete ${rows.length} sessions`;
    $('archive-delete-confirm').disabled = false;
    $('archive-confirm').hidden = false;
    $('archive-browser').hidden = true;
    $('back-destination').textContent = 'Archive';
    $('settings-back').setAttribute('aria-label','Back to archive');
    renderArchive(); changeViewContent(); fitSurface();
    $('archive-delete-cancel').focus({ preventScroll: true });
    $('archive-confirm').scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
  function closeArchiveConfirmation(restoreFocus) {
    pendingArchiveDelete = null; archiveDeleteEpoch++;
    $('archive-confirm').hidden = true;
    $('archive-browser').hidden = false;
    $('back-destination').textContent = 'Sessions';
    $('settings-back').setAttribute('aria-label','Back to sessions');
    renderArchive();
    if (restoreFocus) { fitSurface(); $('settings-scroll').scrollTop = archiveDeleteScroll; ($('archive-list').querySelector('button') || $('settings-back')).focus({ preventScroll: true }); }
  }
  async function confirmArchiveDelete() {
    if (archiveDeleting || !pendingArchiveDelete) return;
    const targets = pendingArchiveDelete, epoch = archiveDeleteEpoch;
    archiveDeleting = true; $('archive-delete-confirm').disabled = true;
    $('archive-delete-cancel').disabled = true;
    $('archive-delete-confirm').setAttribute('aria-busy','true'); renderArchive();
    try {
      const result = await window.IslandDesktop.deleteArchived(targets);
      const expected = targets.map(t => t.sessionId);
      if (!Array.isArray(result.deleted) || result.deleted.length !== expected.length || new Set(result.deleted).size !== expected.length || !result.deleted.every(id => expected.includes(id))) throw Error('Deletion could not be verified. Refresh the archive before trying again.');
      $('archive-delete-note').textContent = result.cleanupIncomplete ? 'Deleted from the archive. Some local cached context could not be cleared; old cache remains blocked from restoring it.' : `${result.deleted.length} archived ${result.deleted.length === 1 ? 'session deleted' : 'sessions deleted'}.`;
      if (epoch === archiveDeleteEpoch) closeArchiveConfirmation(settingsOpen && settingsPage === 'archive');
    } catch (error) { $('archive-delete-note').textContent = String(error); }
    finally {
      archiveDeleting = false; $('archive-delete-confirm').disabled = false;
      $('archive-delete-cancel').disabled = false;
      $('archive-delete-confirm').setAttribute('aria-busy','false'); renderArchive();
      if (settingsOpen) fitSurface();
    }
  }
  async function archiveSession(s, archived, trigger) {
    if (!window.IslandDesktop?.archiveSession) { notify('Archiving requires the native desktop application.'); return; }
    trigger.disabled = true;
    try { await window.IslandDesktop.archiveSession(s.sessionId, archived); notify(archived ? 'Session archived. Open Archive to restore it.' : 'Session restored. Find it in Sessions.'); }
    catch (error) { notify(String(error)); }
    finally {
      if (trigger.isConnected) trigger.disabled = false;
      else if (expanded && document.activeElement === document.body) (settingsOpen ? $('settings-back') : $('settings-button')).focus({ preventScroll: true });
    }
  }
  function connectBridge() {
    if (preview) return;
    clearTimeout(reconnectTimer);
    source?.close();
    const connection = window.IslandDesktop ? window.IslandDesktop.createSource() : new EventSource('/api/events');
    source = connection;
    connection.onmessage = (event) => {
      if (source !== connection) return;
      try { applyEvent(JSON.parse(event.data)); }
      catch { resynchronize(); }
    };
    connection.onerror = () => {
      if (source === connection) markDisconnected();
    };
  }

  document.body.classList.toggle('is-preview', preview);
  $('preview-tools').hidden = !preview; $('preview-label').hidden = !preview;
  if (preview) $('connection-label').innerHTML = '<span class="connection-dot"></span>Simulated sessions';
  paintIcons(); setMotion(typeof preferences.motion === 'boolean' ? preferences.motion : null); setBezel(typeof preferences.bezel === 'boolean' ? preferences.bezel : true);
  document.querySelectorAll('.agent-picker button').forEach((el) => {
    el.innerHTML = avatar.render(el.dataset.agent, 'idle', true);
    el.addEventListener('click', () => setLabAgent(el.dataset.agent));
  });
  $('state-picker').addEventListener('change', (event) => setLabState(event.target.value));
  $('replay-button').addEventListener('click', () => setLabState($('state-picker').value, true));
  $('compact-view').addEventListener('click', openFromCompact);
  $('collapse-button').addEventListener('click', () => setExpanded(false, true));
  $('view-button').addEventListener('click', () => { stopTour(); if (expanded) setExpanded(false); else showOverview(); });
  $('all-sessions-button').addEventListener('click', () => { showOverview(); $('collapse-button').focus({ preventScroll: true }); });
  $('follow-button').addEventListener('click', playTour);
  $('motion-button').addEventListener('click', () => setMotion(!reduced()));
  $('setting-motion').addEventListener('change', (event) => { setMotion(event.target.checked); savePreferences(); });
  $('bezel-button').addEventListener('click', () => setBezel(!bezel));
  $('setting-bezel').addEventListener('change', (event) => { setBezel(event.target.checked); savePreferences(); });
  $('settings-button').addEventListener('click', openSettings);
  $('settings-back').addEventListener('click', backFromSettings);
  document.querySelectorAll('[data-settings-page]').forEach(el => el.addEventListener('click', () => setSettingsPage(el.dataset.settingsPage)));
  $('settings-integrations').addEventListener('click', event => { const button = event.target.closest('[data-provider]'); if (button) openProvider(button.dataset.provider); });
  $('usage-band').addEventListener('click', event => { const button = event.target.closest('[data-usage-provider]'); if (button) openProvider(button.dataset.usageProvider); });
  $('settings-attention').addEventListener('click', () => { const s = presentation.pending(sessions)[0]; if (s) { leaveSettings(false); showFocused(s.sessionId, true); } });
  $('terminal-refresh').addEventListener('click', () => { if (terminalPickerSession) void navigateOrca(terminalPickerSession, 'list'); });
  $('setup-detect').addEventListener('click', () => void advanceSetup('detect'));
  $('setup-connect').addEventListener('click', () => void advanceSetup('connect'));
  $('setup-copy').addEventListener('click', () => void copy('/hooks'));
  $('setup-reviewed').addEventListener('click', () => void advanceSetup('reviewed'));
  $('setup-verify').addEventListener('click', () => void advanceSetup('verify'));
  $('setup-back').addEventListener('click', () => void advanceSetup('back'));
  $('provider-detect').addEventListener('click', () => void providerSetup('status'));
  $('provider-connect').addEventListener('click', () => void providerSetup('connect'));
  $('provider-reviewed').addEventListener('click', () => void providerSetup('review'));
  $('provider-verify').addEventListener('click', () => void providerSetup('status'));
  $('terminal-choices').addEventListener('click', event => { const button = event.target.closest('[data-terminal-index]'); const terminal = button && terminalChoices[Number(button.dataset.terminalIndex)]; if (terminal && terminalPickerSession) void navigateOrca(terminalPickerSession, 'choose', terminal.choice); });
  function toggleSound() {
    if (!audio) {
      try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); }
      catch { notify('Sound is unavailable in this browser.'); return; }
    }
    audio = !audio; $('sound-button').innerHTML = icon(audio ? 'sound' : 'muted');
    $('sound-button').setAttribute('aria-pressed', String(audio));
    $('sound-button').setAttribute('aria-label', audio ? 'Mute alerts' : 'Unmute alerts');
    $('sound-button').title = audio ? 'Mute alerts' : 'Unmute alerts';
    $('setting-sound').checked = audio;
    savePreferences();
  }
  $('sound-button').addEventListener('click', toggleSound);
  $('setting-sound').addEventListener('change', toggleSound);
  $('setting-auto-open').checked = autoOpen;
  $('setting-auto-open').addEventListener('change', event => { autoOpen = event.target.checked; savePreferences(); });
  function openArchive() { openSettings(); providerPage = null; setSettingsPage('archive'); renderArchive(); fitSurface(); }
  $('show-archived').addEventListener('click', openArchive);
  $('archive-button').addEventListener('click', openArchive);
  $('clear-archive').addEventListener('click', () => beginArchiveDelete(retained.filter(s => s.archived)));
  $('archive-delete-cancel').addEventListener('click', () => closeArchiveConfirmation(true));
  $('archive-delete-confirm').addEventListener('click', () => void confirmArchiveDelete());
  $('setting-auto-archive').addEventListener('change', async event => {
    const input = event.target, next = input.checked; input.disabled = true;
    try { input.checked = await window.IslandDesktop.retentionSettings(next); }
    catch (error) { input.checked = !next; notify(String(error)); }
    finally { input.disabled = false; }
  });
  if (window.IslandDesktop?.retentionSettings) window.IslandDesktop.retentionSettings(null).then(enabled => { $('setting-auto-archive').checked = enabled; $('setting-auto-archive').disabled = false; }).catch(error => { $('preferences-note').textContent = `Archive settings unavailable: ${error}`; });
  const archiveDelay = $('setting-archive-delay');
  if (window.IslandDesktop?.archiveDelay) window.IslandDesktop.archiveDelay().then(minutes => { archiveDelay.value = minutes; archiveDelay.disabled = false; }).catch(error => notify(String(error)));
  archiveDelay.addEventListener('change', async () => {
    if (!archiveDelay.reportValidity()) return;
    archiveDelay.disabled = true;
    try { archiveDelay.value = await window.IslandDesktop.archiveDelay(Number(archiveDelay.value)); }
    catch (error) { notify(String(error)); archiveDelay.value = await window.IslandDesktop.archiveDelay(); }
    finally { archiveDelay.disabled = false; }
  });
  if (preferences.audio === true) toggleSound();
  $('island-surface').addEventListener('pointerenter', event => { if (event.pointerType === 'touch') return; pointerInside = true; enterPeek(); });
  $('island-surface').addEventListener('pointerleave', () => { pointerInside = false; leavePeek(); });
  $('compact-view').addEventListener('focus', enterPeek);
  $('island-surface').addEventListener('focusout', () => queueMicrotask(() => { if (!pointerInside) leavePeek(); }));
  addEventListener('island-usage-change', () => { renderCompact(); renderUsage(); if (settingsOpen) fitSurface(); });
  document.addEventListener('visibilitychange', () => { document.body.classList.toggle('page-hidden', document.hidden); if (document.hidden) stopTour(); });
  document.addEventListener('pointerdown', (event) => {
    if (tourTimers.length && !event.target.closest('#follow-button')) stopTour();
    if (!expanded || event.target.closest('.island-surface, .preview-tools')) return;
    setExpanded(false);
  });
  window.addEventListener('resize', fitSurface);
  window.addEventListener('island-desktop-action', ({ detail }) => {
    if (detail === 'settings') openSettings();
    else if (detail === 'toggle') { if (expanded) setExpanded(false, true); else openFromCompact(); }
    else if (detail === 'show') { if (!expanded) openFromCompact(); }
    else if (detail === 'blur' && !settingsOpen && !terminalBusy) setExpanded(false);
    else if (detail === 'outside-click') setExpanded(false);
    else if (detail === 'outside-watch-error') notify('Outside-click dismissal is unavailable. Use the collapse button.');
    else if (detail === 'geometry') fitSurface();
  });
  window.addEventListener('island-desktop-ready', ({ detail }) => {
    const hint = $('shortcut-hint');
    if (hint) hint.textContent = detail.globalShortcut ? 'Global shortcut registered' : 'While this page has focus; global shortcut unavailable';
  });
  document.addEventListener('keydown', (event) => {
    if (tourTimers.length) stopTour();
    if (settingsOpen && event.key === 'Escape') { event.preventDefault(); backFromSettings(); return; }
    const typing = event.target.matches('input, textarea, select, [contenteditable="true"]');
    if (event.ctrlKey && event.altKey && event.code === 'Space') { event.preventDefault(); if (expanded) setExpanded(false, true); else openFromCompact(); return; }
    if (settingsOpen) return;
    if (event.key === 'Escape') {
      if (focused) { showOverview(); $('collapse-button').focus(); }
      else if (selected) { const id = selected; setSelected(null); rowMap.get(id)?.querySelector('.session-toggle').focus(); }
      else if (expanded) setExpanded(false, true);
    }
    if (typing && !(event.ctrlKey && event.key === 'Enter')) return;
    if (event.ctrlKey && event.key === 'Enter' && event.target.matches('.reply-input')) { event.preventDefault(); event.target.closest('form').requestSubmit(); }
    if (event.altKey && ['y', 'n'].includes(event.key.toLowerCase()) && selected) {
      const s = sessions.find((item) => item.sessionId === selected);
      if (s?.status === 'waiting_approval') { event.preventDefault(); sendResponse(s, event.key.toLowerCase() === 'y' ? 'allow' : 'deny'); }
    }
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && event.target.matches('.session-toggle')) {
      const buttons = [...document.querySelectorAll('.session-toggle')], index = buttons.indexOf(event.target);
      event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length].focus();
    }
  });
  renderSessions(); setExpanded(false); connectBridge(); if (!preview) window.IslandUsage.start();
  window.dispatchEvent(new Event('island-app-ready'));
  // Explicit preview API supports reproducible visual and interruption checks.
  window.IslandPreview = Object.freeze({
    enabled: preview, setAgent: setLabAgent, setState: setLabState, setExpanded, select: setSelected, showFocused, showOverview, openFromCompact, playTour, stopTour,
    showAggregate: () => { labFocused = false; setExpanded(false); },
    setReducedMotion: setMotion, applyEvent,
    snapshot: () => ({ preview, expanded, focused, selected, peek, settingsOpen, settingsPage, providerPage, reducedMotion: reduced(), sessions: structuredClone(sessions), delivery: Object.fromEntries(delivery), drafts: Object.fromEntries(drafts) })
  });
})();
