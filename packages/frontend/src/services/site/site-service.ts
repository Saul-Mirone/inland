import type { Effect } from 'effect';

import { Context } from 'effect';

// ── Request / Response types ────────────────────────────────────────

export interface CreateSiteData {
  name: string;
  description?: string;
  author?: string;
  templateOwner: string;
  templateRepo: string;
}

export interface ImportSiteData {
  name: string;
  gitRepoFullName: string;
  description?: string;
  setupWorkflow: boolean;
  enablePages: boolean;
  overrideExistingFiles: boolean;
}

// ── Service interface ───────────────────────────────────────────────

export interface SiteServiceInterface {
  readonly fetchSites: (page?: number, limit?: number) => Effect.Effect<void>;
  readonly deleteSite: (siteId: string) => Effect.Effect<void>;
  readonly createSite: (data: CreateSiteData) => Effect.Effect<void>;
  readonly importSite: (
    data: ImportSiteData
  ) => Effect.Effect<{ articlesImported?: number } | undefined>;
}

// ── DI tag ──────────────────────────────────────────────────────────

export class SiteService extends Context.Tag('SiteService')<
  SiteService,
  SiteServiceInterface
>() {}
