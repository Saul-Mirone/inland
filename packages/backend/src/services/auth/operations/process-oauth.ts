import { Effect } from 'effect'

import { UserService } from '../../user'
import { fetchUser } from './fetch-user'
import { fetchUserEmail } from './fetch-user-email'

export const processOAuth = (accessToken: string) =>
  Effect.gen(function* () {
    const userService = yield* UserService
    const platformUser = yield* fetchUser(accessToken)

    let email = platformUser.email
    if (!email) {
      email = yield* fetchUserEmail(accessToken)
    }

    const user = yield* userService.upsertUser({
      username: platformUser.username,
      email,
      avatarUrl: platformUser.avatarUrl,
    })

    yield* userService.upsertGitIntegration({
      userId: user.id,
      platform: 'github',
      platformUsername: platformUser.username,
      accessToken,
    })

    return { user, platformUser }
  })
