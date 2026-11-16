// Threadcap OpenCode v2 server plugin. No approvals, prompts, or provider settings are changed.
import { spawn } from 'node:child_process';
const helper = __THREADCAP_HELPER__;
const port = __THREADCAP_PORT__;
export default {
  id: 'threadcap.monitor',
  setup(ctx) {
    const controller = new AbortController();
    const children = new Set();
    const observe = event => new Promise(resolve => {
      // A shared server's inherited terminal is not the source of every session.
      const env = { ...process.env };
      for (const key of ['ORCA_TERMINAL_HANDLE','ORCA_PANE_KEY','ORCA_WORKSPACE_ID','ORCA_WORKTREE_ID','ORCA_RUNTIME_SOURCE_INCARNATION']) delete env[key];
      const child = spawn(helper, ['provider-hook','--provider','opencode','--port',String(port)], { env, windowsHide: true, stdio: ['pipe','ignore','ignore'] });
      children.add(child);
      const timer = setTimeout(() => child.kill(), 2500);
      const done = () => { clearTimeout(timer); children.delete(child); resolve(); };
      child.once('error', done); child.once('exit', done);
      child.stdin.on('error', () => {});
      child.stdin.end(JSON.stringify(event));
    });
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ types: ['session.created','session.viewed','session.execution.started','session.execution.succeeded','session.execution.failed','session.execution.interrupted','session.deleted','session.status','session.idle','permission.asked','permission.replied','form.created','form.replied','form.cancelled'], signal: controller.signal })) {
          if (controller.signal.aborted) break;
          await observe(event);
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error('Threadcap monitoring stopped:', error?.message || 'event stream unavailable');
      }
    })();
    return () => { controller.abort(); for (const child of children) child.kill(); };
  }
};
