import { compare, hash } from 'bcryptjs'
import { applyMiddleware } from 'graphql-middleware'
import { DateTimeResolver } from 'graphql-scalars'
import { sign } from 'jsonwebtoken'
import {
  arg,
  asNexusMethod,
  enumType,
  inputObjectType,
  intArg,
  makeSchema,
  nonNull,
  objectType,
  stringArg,
} from 'nexus'
import { Context } from './context'
import { permissions } from './permissions'
import { APP_SECRET, getUserId } from './utils'

export const DateTime = asNexusMethod(DateTimeResolver, 'date')

const Query = objectType({
  name: 'Query',
  definition(t) {
    t.nonNull.list.nonNull.field('allUsers', {
      type: 'User',
      resolve: (_parent, _args, context: Context) => {
        return context.prisma.user.findMany()
      },
    })

    t.nullable.field('me', {
      type: 'User',
      resolve: (parent, args, context: Context) => {
        const userId = getUserId(context)
        return context.prisma.user.findUnique({
          where: {
            id: Number(userId),
          },
        })
      },
    })

    t.list.field('tweets', {
      type: 'Tweet',
      resolve: (parent, args, context: Context) => {
        return context.prisma.tweet.findMany()
      },
    })

    t.nullable.field('tweet', {
      type: 'Tweet',
      args: {
        id: intArg(),
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.tweet.findUnique({
          where: { id: args.id || undefined },
        })
      },
    })
    //

    // t.nonNull.list.nonNull.field('feed', {
    //   type: 'Post',
    //   args: {
    //     searchString: stringArg(),
    //     skip: intArg(),
    //     take: intArg(),
    //     orderBy: arg({
    //       type: 'PostOrderByUpdatedAtInput',
    //     }),
    //   },
    //   resolve: (_parent, args, context: Context) => {
    //     const or = args.searchString
    //       ? {
    //           OR: [
    //             { title: { contains: args.searchString } },
    //             { content: { contains: args.searchString } },
    //           ],
    //         }
    //       : {}

    //     return context.prisma.post.findMany({
    //       where: {
    //         published: true,
    //         ...or,
    //       },
    //       take: args.take || undefined,
    //       skip: args.skip || undefined,
    //       orderBy: args.orderBy || undefined,
    //     })
    //   },
    // })

    // t.list.field('draftsByUser', {
    //   type: 'Post',
    //   args: {
    //     userUniqueInput: nonNull(
    //       arg({
    //         type: 'UserUniqueInput',
    //       }),
    //     ),
    //   },
    //   resolve: (_parent, args, context: Context) => {
    //     return context.prisma.user
    //       .findUnique({
    //         where: {
    //           id: args.userUniqueInput.id || undefined,
    //           email: args.userUniqueInput.email || undefined,
    //         },
    //       })
    //       .posts({
    //         where: {
    //           published: false,
    //         },
    //       })
    //   },
    // })
  },
})

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    t.field('signup', {
      type: 'AuthPayload',
      args: {
        name: stringArg(),
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, args, context: Context) => {
        const hashedPassword = await hash(args.password, 10)
        const user = await context.prisma.user.create({
          data: {
            name: args.name,
            email: args.email,
            password: hashedPassword,
          },
        })
        return {
          token: sign({ userId: user.id }, APP_SECRET),
          user,
        }
      },
    })

    t.field('login', {
      type: 'AuthPayload',
      args: {
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, { email, password }, context: Context) => {
        const user = await context.prisma.user.findUnique({
          where: {
            email,
          },
        })
        if (!user) {
          throw new Error(`No user found for email: ${email}`)
        }
        const passwordValid = await compare(password, user.password)
        if (!passwordValid) {
          throw new Error('Invalid password')
        }
        return {
          token: sign({ userId: user.id }, APP_SECRET),
          user,
        }
      },
    })
    t.field('createProfile', {
      type: 'Profile',
      args: {
        data: nonNull(
          arg({
            type: 'ProfileCreateInput',
          }),
        ),
      },
      resolve: (_, args, context: Context) => {
        const userId = getUserId(context)
        if (!userId) throw new Error('Could not authenticate user.')
        return context.prisma.profile.create({
          data: {
            bio: args.data.bio,
            location: args.data.location,
            website: args.data.website,
            avatar: args.data.avatar,
            user: { connect: { id: Number(userId) } },
          },
        })
      },
    })

    t.field('updateProfile', {
      type: 'Profile',
      args: {
        data: nonNull(
          arg({
            type: 'ProfileUpdateInput',
          }),
        ),
      },
      resolve: (_, args, context: Context) => {
        const userId = getUserId(context)
        if (!userId) throw new Error('Could not authenticate user.')
        const { id, ...data } = args.data
        return context.prisma.profile.update({
          data: {
            ...data,
          },
          where: {
            id: Number(id),
          },
        })
      },
    })

    t.field('createTweet', {
      type: 'Tweet',
      args: {
        data: nonNull(
          arg({
            type: 'TweetCreateInput',
          }),
        ),
      },
      resolve: (_, args, context: Context) => {
        const userId = getUserId(context)
        if (!userId) throw new Error('Could not authenticate user.')
        if (!args.data.content) throw new Error('Content is empty')
        return context.prisma.tweet.create({
          data: {
            content: args.data.content,
            author: { connect: { id: Number(userId) } },
          },
        })
      },
    })

    // t.field('createDraft', {
    //   type: 'Post',
    //   args: {
    //     data: nonNull(
    //       arg({
    //         type: 'PostCreateInput',
    //       }),
    //     ),
    //   },
    //   resolve: (_, args, context: Context) => {
    //     const userId = getUserId(context)
    //     return context.prisma.post.create({
    //       data: {
    //         title: args.data.title,
    //         content: args.data.content,
    //         authorId: userId,
    //       },
    //     })
    //   },
    // })

    // t.field('togglePublishPost', {
    //   type: 'Post',
    //   args: {
    //     id: nonNull(intArg()),
    //   },
    //   resolve: async (_, args, context: Context) => {
    //     try {
    //       const post = await context.prisma.post.findUnique({
    //         where: { id: args.id || undefined },
    //         select: {
    //           published: true,
    //         },
    //       })
    //       return context.prisma.post.update({
    //         where: { id: args.id || undefined },
    //         data: { published: !post?.published },
    //       })
    //     } catch (e) {
    //       throw new Error(
    //         `Post with ID ${args.id} does not exist in the database.`,
    //       )
    //     }
    //   },
    // })

    // t.field('incrementPostViewCount', {
    //   type: 'Post',
    //   args: {
    //     id: nonNull(intArg()),
    //   },
    //   resolve: (_, args, context: Context) => {
    //     return context.prisma.post.update({
    //       where: { id: args.id || undefined },
    //       data: {
    //         viewCount: {
    //           increment: 1,
    //         },
    //       },
    //     })
    //   },
    // })

    // t.field('deletePost', {
    //   type: 'Post',
    //   args: {
    //     id: nonNull(intArg()),
    //   },
    //   resolve: (_, args, context: Context) => {
    //     return context.prisma.post.delete({
    //       where: { id: args.id },
    //     })
    //   },
    // })
  },
})

const Profile = objectType({
  name: 'Profile',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.string('bio')
    t.string('location')
    t.string('website')
    t.string('avatar')
    t.field('user', {
      type: 'User',
      resolve: (parent, _, context: Context) => {
        return context.prisma.profile
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .user()
      },
    })
  },
})

const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')
    t.string('name')
    t.nonNull.string('email')
    // t.nonNull.list.nonNull.field('posts', {
    //   type: 'Post',
    //   resolve: (parent, _, context: Context) => {
    //     return context.prisma.user
    //       .findUnique({
    //         where: { id: parent.id || undefined },
    //       })
    //       .posts()
    //   },
    // })
    t.field('profile', {
      type: 'Profile',
      resolve: (parent, _, context: Context) => {
        return context.prisma.user
          .findUnique({
            where: { id: parent.id },
          })
          .Profile()
      },
    })

    t.nonNull.list.field('tweets', {
      type: 'Tweet',
      resolve: (parent, _, context: Context) => {
        return context.prisma.user
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .Tweet()
      },
    })
  },
})

const Tweet = objectType({
  name: 'Tweet',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.field('createdAt', { type: 'DateTime' })
    t.nonNull.string('content')
    t.field('author', {
      type: 'User',
      resolve: (parent, _, context: Context) => {
        return context.prisma.tweet
          .findUnique({
            where: { id: parent.id || undefined },
          })
          .author()
      },
    })
  },
})

// const Post = objectType({
//   name: 'Post',
//   definition(t) {
//     t.nonNull.int('id')
//     t.nonNull.field('createdAt', { type: 'DateTime' })
//     t.nonNull.field('updatedAt', { type: 'DateTime' })
//     t.nonNull.string('title')
//     t.string('content')
//     t.nonNull.boolean('published')
//     t.nonNull.int('viewCount')
//     t.field('author', {
//       type: 'User',
//       resolve: (parent, _, context: Context) => {
//         return context.prisma.post
//           .findUnique({
//             where: { id: parent.id || undefined },
//           })
//           .author()
//       },
//     })
//   },
// })

const SortOrder = enumType({
  name: 'SortOrder',
  members: ['asc', 'desc'],
})

// const PostOrderByUpdatedAtInput = inputObjectType({
//   name: 'PostOrderByUpdatedAtInput',
//   definition(t) {
//     t.nonNull.field('updatedAt', { type: 'SortOrder' })
//   },
// })

const UserUniqueInput = inputObjectType({
  name: 'UserUniqueInput',
  definition(t) {
    t.int('id')
    t.string('email')
  },
})

// const PostCreateInput = inputObjectType({
//   name: 'PostCreateInput',
//   definition(t) {
//     t.nonNull.string('title')
//     t.string('content')
//   },
// })

const UserCreateInput = inputObjectType({
  name: 'UserCreateInput',
  definition(t) {
    t.nonNull.string('email')
    t.string('name')
    t.list.nonNull.field('tweets', { type: 'TweetCreateInput' })
  },
})

const AuthPayload = objectType({
  name: 'AuthPayload',
  definition(t) {
    t.string('token')
    t.field('user', { type: 'User' })
  },
})

export const ProfileCreateInput = inputObjectType({
  name: 'ProfileCreateInput',
  definition(t) {
    t.string('bio')
    t.string('location')
    t.string('website')
    t.string('avatar')
  },
})

export const ProfileUpdateInput = inputObjectType({
  name: 'ProfileUpdateInput',
  definition(t) {
    t.int('id')
    t.string('bio')
    t.string('location')
    t.string('website')
    t.string('avatar')
  },
})

export const TweetCreateInput = inputObjectType({
  name: 'TweetCreateInput',
  definition(t) {
    t.string('content')
  },
})

export const TweetOrderByUpdatedAtInput = inputObjectType({
  name: 'TweetOrderByUpdatedAtInput',
  definition(t) {
    t.nonNull.field('updatedAt', { type: 'SortOrder' })
  },
})

const schemaWithoutPermissions = makeSchema({
  types: [
    Query,
    Mutation,
    User,
    Profile,
    Tweet,
    AuthPayload,
    UserUniqueInput,
    UserCreateInput,
    ProfileCreateInput,
    ProfileUpdateInput,
    TweetCreateInput,
    TweetOrderByUpdatedAtInput,
    SortOrder,
    DateTime,
  ],
  outputs: {
    schema: __dirname + '/../schema.graphql',
    typegen: __dirname + '/generated/nexus.ts',
  },
  contextType: {
    module: require.resolve('./context'),
    export: 'Context',
  },
  sourceTypes: {
    modules: [
      {
        module: '@prisma/client',
        alias: 'prisma',
      },
    ],
  },
})

export const schema = applyMiddleware(schemaWithoutPermissions, permissions)
