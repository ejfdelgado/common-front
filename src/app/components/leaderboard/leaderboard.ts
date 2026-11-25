import { Component, computed, effect, input, signal, untracked } from '@angular/core';
import { LeaderBoardService } from '@services/leaderboard.service';
import { LeaderEntryType } from 'types/LeaderBoardTypes';

const PAGE_SIZE = 5;
const PODIUM_SIZE = 3;

@Component({
  selector: 'app-leaderboard',
  imports: [],
  templateUrl: './leaderboard.html',
  styleUrl: './leaderboard.scss',
})
export class Leaderboard {
  roomId = input.required<string>();

  entries = signal<LeaderEntryType[]>([]);
  loading = signal(false);
  hasMore = signal(false);
  status = signal('');

  showPodium = computed(() => this.entries().length >= PODIUM_SIZE);
  // Visual order: 2nd at left, 1st in the center, 3rd at right.
  podium = computed(() => {
    if (!this.showPodium()) {
      return [];
    }
    const [first, second, third] = this.entries();
    return [
      { entry: second, rank: 2 },
      { entry: first, rank: 1 },
      { entry: third, rank: 3 },
    ];
  });
  // Entries shown in the table, below the podium when there is one.
  rest = computed(() => {
    const skip = this.showPodium() ? PODIUM_SIZE : 0;
    return this.entries()
      .slice(skip)
      .map((entry, i) => ({ entry, rank: skip + i + 1 }));
  });

  // Guards against a slow response of a previous room overwriting the current one.
  private requestId = 0;

  constructor(private leaderBoardSrv: LeaderBoardService) {
    effect(() => {
      const roomId = this.roomId();
      untracked(() => this.reset(roomId));
    });
  }

  async reload() {
    await this.reset(this.roomId());
  }

  private async reset(roomId: string) {
    this.entries.set([]);
    this.hasMore.set(false);
    this.status.set('');
    if (roomId) {
      await this.fetchPage(roomId);
    }
  }

  async loadMore() {
    if (this.loading() || !this.hasMore()) {
      return;
    }
    await this.fetchPage(this.roomId());
  }

  private async fetchPage(roomId: string) {
    const current = ++this.requestId;
    const offset = this.entries().length;
    this.loading.set(true);
    try {
      const page = await this.leaderBoardSrv.read(roomId, PAGE_SIZE, offset);
      if (current !== this.requestId) {
        return;
      }
      // Scores may change between pages; skip entries already shown.
      const known = new Set(this.entries().map((e) => e.id).filter((id) => id));
      const fresh = page.filter((e) => !e.id || !known.has(e.id));
      this.entries.update((old) => [...old, ...fresh]);
      this.hasMore.set(page.length === PAGE_SIZE);
      this.status.set('');
    } catch (err: any) {
      if (current !== this.requestId) {
        return;
      }
      this.status.set(`Error: ${err?.error?.message || err?.message || err}`);
    } finally {
      if (current === this.requestId) {
        this.loading.set(false);
      }
    }
  }
}
