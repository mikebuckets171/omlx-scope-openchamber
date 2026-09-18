import type { HostClient, SessionSnapshot } from '@openchamber/sdk';

export const chamberMarkup = `<section class="chamber-context" aria-label="OpenChamber context"><div class="chamber-meta"><span class="eyebrow">IN OPENCHAMBER</span><strong id="chamber-session">No chat selected</strong><span id="chamber-state">Runtime readings are server-wide</span></div><button id="compose-stats" type="button" disabled title="Append a measurement report to the selected chat’s draft. Does not send, replace the draft, or run a model.">Add stats to chat</button></section>`;

/** Uses host-pushed metadata, not conversation reads, guessed attribution or another poller. */
export class OpenChamberView {
  private session: SessionSnapshot | null = null;
  private busy = false;
  constructor(private readonly root: HTMLElement, private readonly host: Pick<HostClient, 'onSession' | 'compose'>,
    private readonly report: () => string, private readonly status: (message: string) => void) {
    host.onSession(session => { this.session = session; this.render(); });
    this.button.addEventListener('click', async () => {
      if (!this.session || this.busy) return;
      this.busy = true; this.render();
      try {
        await host.compose({ text: this.report().slice(0, 15_500), mode: 'append' });
        this.status('Stats appended to the chat draft. Review before sending; nothing was sent automatically.');
      } catch { this.status('Could not confirm the draft update. Check the selected chat before trying again.'); }
      finally { this.busy = false; this.render(); }
    });
  }
  private get button(): HTMLButtonElement { return this.root.querySelector<HTMLButtonElement>('#compose-stats')!; }
  private render(): void {
    const title = this.root.querySelector<HTMLElement>('#chamber-session')!;
    title.textContent = this.session?.title.slice(0, 160) || 'No chat selected';
    const state = this.root.querySelector<HTMLElement>('#chamber-state')!;
    state.textContent = this.session
      ? `${this.session.busy ? 'Chat working' : 'Chat idle'}${this.session.agent ? ' · ' + this.session.agent.slice(0, 50) : ''} · server-wide readings`
      : 'Select a chat to add a stats report';
    this.button.disabled = this.session === null || this.busy;
    this.button.setAttribute('aria-busy', String(this.busy));
  }
}
