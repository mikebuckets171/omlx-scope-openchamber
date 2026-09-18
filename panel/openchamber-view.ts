import type { HostClient, SessionSnapshot } from '@openchamber/sdk';
import { mountMenu, type MenuHandle } from '@openchamber/sdk/ui';

/** Sharing is a secondary action. Runtime readings never imply chat attribution. */
export class SharingControls {
  private session: SessionSnapshot | null = null;
  private busy = false;
  private disposed = false;
  private readonly menu: MenuHandle;
  private readonly unsubscribe: () => void;

  constructor(root: HTMLElement, private readonly host: Pick<HostClient, 'onSession' | 'compose' | 'writeClipboard'>,
    private readonly report: () => string, private readonly status: (message: string) => void) {
    this.menu = mountMenu(root, {
      label: 'Share', variant: 'ghost', size: 'xs', items: [],
      onSelect: id => { void this.share(id); },
    });
    this.unsubscribe = host.onSession(session => { this.session = session; this.render(); });
    this.render();
  }

  private render(): void {
    if (this.disposed) return;
    this.menu.update({
      label: this.busy ? 'Sharing…' : 'Share',
      items: [
        { id: 'copy-stats', label: 'Copy stats', disabled: this.busy },
        { id: 'compose-stats', label: 'Add to chat draft', disabled: this.busy || this.session === null },
      ],
    });
  }

  private async share(id: string): Promise<void> {
    if (this.disposed || this.busy || !['copy-stats', 'compose-stats'].includes(id)) return;
    if (id === 'compose-stats' && !this.session) return;
    this.busy = true;
    this.render();
    try {
      const text = this.report().slice(0, 15_500);
      if (id === 'copy-stats') {
        await this.host.writeClipboard(text);
        if (!this.disposed) this.status('Stats copied. No credentials or chat content included.');
      } else {
        await this.host.compose({ text, mode: 'append' });
        if (!this.disposed) this.status('Added to the chat draft. Nothing was sent automatically.');
      }
    } catch {
      if (!this.disposed) this.status(id === 'copy-stats'
        ? 'Could not copy stats. The clipboard was not confirmed.'
        : 'Could not confirm the draft update. Check the chat before trying again.');
    } finally {
      this.busy = false;
      this.render();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe();
    this.menu.dispose();
  }
}
