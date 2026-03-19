import { Effect } from 'effect';

import type { TemplateData } from '../git-provider-repository';

interface TaggedError {
  readonly _tag: string;
}

// Shared GitHub API request helper, parameterized over error type
export const githubFetch = <E extends TaggedError>(
  accessToken: string,
  endpoint: string,
  makeError: (message: string, status?: number) => E,
  options: RequestInit = {}
): Effect.Effect<unknown, E> =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`https://api.github.com${endpoint}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Inland-CMS/1.0',
            ...options.headers,
          },
        }),
      catch: (error) =>
        makeError(error instanceof Error ? error.message : 'Network error'),
    });

    if (!response.ok) {
      const errorText = yield* Effect.tryPromise({
        try: () => response.text(),
        catch: (error) =>
          makeError(
            error instanceof Error
              ? error.message
              : 'Failed to read error response'
          ),
      });
      return yield* Effect.fail(
        makeError(`GitHub API error: ${errorText}`, response.status)
      );
    }

    return yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (error) =>
        makeError(
          error instanceof Error
            ? error.message
            : 'Failed to parse response JSON'
        ),
    });
  });

// Shared runtime validation helper
export const assertFields = <E extends TaggedError>(
  response: unknown,
  fields: readonly string[],
  context: string,
  makeError: (message: string) => E
): Effect.Effect<Record<string, unknown>, E> => {
  if (typeof response !== 'object' || response === null) {
    return Effect.fail(
      makeError(`Expected object from ${context}, got ${typeof response}`)
    );
  }
  const obj = response as Record<string, unknown>;
  const missing = fields.filter((f) => !(f in obj));
  if (missing.length > 0) {
    return Effect.fail(
      makeError(
        `Missing fields [${missing.join(', ')}] in response from ${context}`
      )
    );
  }
  return Effect.succeed(obj);
};

// Shared placeholder building and replacement
export const buildTemplatePlaceholders = (
  templateData: TemplateData
): Record<string, string> => ({
  '{{SITE_NAME}}': templateData.siteName,
  '{{SITE_DESCRIPTION}}': templateData.siteDescription,
  '{{SITE_NAME_SLUG}}': templateData.siteNameSlug,
  '{{SITE_AUTHOR}}': templateData.siteAuthor,
  '{{GITHUB_USERNAME}}': templateData.platformUsername,
});

export const replacePlaceholders = (
  content: string,
  placeholders: Record<string, string>
): string => {
  let result = content;
  for (const [placeholder, value] of Object.entries(placeholders)) {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }
  return result;
};

// GitHub API response types
export interface GitHubRepoResponse {
  readonly id: number;
  readonly name: string;
  readonly full_name: string;
  readonly html_url: string;
  readonly clone_url: string;
  readonly default_branch: string;
}

export interface GitHubTreeResponse {
  readonly tree: Array<{
    readonly path: string;
    readonly type: string;
    readonly sha: string;
  }>;
}

export interface GitHubFileContentResponse {
  readonly content: string;
  readonly sha: string;
}

export interface GitHubUser {
  readonly id: number;
  readonly login: string;
  readonly email: string | null;
  readonly avatar_url: string;
}

export interface GitHubEmail {
  readonly email: string;
  readonly primary: boolean;
  readonly verified: boolean;
}
