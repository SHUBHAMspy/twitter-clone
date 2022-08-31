import { rule, shield } from 'graphql-shield'
import { Context } from '../context'
import { getUserId } from '../utils'

const rules = {
  isAuthenticatedUser: rule()((_parent, _args, context: Context) => {
    const userId = getUserId(context)
    return Boolean(userId)
  }),
  isPostOwner: rule()(async (_parent, args, context) => {
    const userId = getUserId(context)
    const author = await context.prisma.post
      .findUnique({
        where: {
          id: Number(args.id),
        },
      })
      .author()
    return userId === author.id
  }),
}

export const permissions = shield({
  Query: {
    me: rules.isAuthenticatedUser,
    // draftsByUser: rules.isAuthenticatedUser,
    // postById: rules.isAuthenticatedUser,
    tweet: rules.isAuthenticatedUser,
  },
  Mutation: {
    // createDraft: rules.isAuthenticatedUser,
    // deletePost: rules.isPostOwner,
    // incrementPostViewCount: rules.isAuthenticatedUser,
    // togglePublishPost: rules.isPostOwner,
    createProfile: rules.isAuthenticatedUser,
  },
})
