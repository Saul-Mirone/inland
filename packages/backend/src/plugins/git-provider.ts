import { Effect, Layer } from 'effect';

import { GitProviderRepository } from '../repositories/git-provider-repository';
import { makeGitHubApiRepository } from '../repositories/implementations/github-api-repository';
import { ConfigService } from '../services/config-service';

// Layer that provides GitHub implementation
export const GitHubProviderLive = Layer.effect(
  GitProviderRepository,
  Effect.gen(function* () {
    const config = yield* ConfigService;
    return makeGitHubApiRepository({
      templateRepo: config.templateRepo,
    });
  })
);

// Default provider (currently GitHub)
export const GitProviderLive = GitHubProviderLive;
