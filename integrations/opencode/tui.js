// Threadcap OpenCode TUI lifetime observer. Question replies use the separate scoped connector.
import { spawn } from 'node:child_process';
import { connectQuestions } from './questions.js';
const helper = __THREADCAP_HELPER__;
const port = __THREADCAP_PORT__;
export default {
  id: 'threadcap.monitor.tui',
  setup(context) {
    const sessions = new Set();
    let closeQuestions = null;
    void connectQuestions(context,id=>sessions.has(id)).then(close=>{if(stopped)close();else closeQuestions=close;}).catch(()=>{});
    let stopped = false, child = null, dirty = true, delivered = '', attempted = 0;
    const observe = () => {
      if (stopped) return;
      try {
        const route = context.ui.router.current();
        if (route?.type === 'session' && typeof route.sessionID === 'string' && route.sessionID.length <= 256 && sessions.size < 256) sessions.add(route.sessionID);
      } catch { return; }
      const body = JSON.stringify({ integrationId: 'threadcap.opencode-client.v1', sessionIds: [...sessions] });
      if (child || (!dirty && body === delivered && Date.now() - attempted < 10000)) return;
      attempted = Date.now(); dirty = false;
      const current = spawn(helper, ['opencode-client', '--port', String(port)], { windowsHide: true, stdio: ['pipe','ignore','ignore'] });
      child = current;
      const timeout = setTimeout(() => current.kill(), 2000);
      const finish = success => { clearTimeout(timeout); if (child === current) child = null; if (success) delivered = body; else dirty = true; };
      current.once('error', () => finish(false)); current.once('exit', code => finish(code === 0));
      current.stdin.on('error', () => {}); current.stdin.end(body);
    };
    observe();
    const timer = setInterval(observe, 500);
    return () => { stopped = true; clearInterval(timer); closeQuestions?.(); child?.kill(); };
  }
};
