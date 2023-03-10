import { Post, User } from "@prisma/client";
import { Post as PostClass, User as UserClass } from "../../prisma/generated/type-graphql";
import { Context } from "../../types/context";
import { Ctx, FieldResolver, Resolver, Root } from "type-graphql";

@Resolver(of => UserClass)
export class CustomUserResolver {
  @FieldResolver(type => PostClass, { nullable: true })
  async favoritePost(
    @Root() user: User,
    @Ctx() { prisma }: Context,
  ): Promise<Post | undefined> {
    const posts = await prisma.user
      .findUnique({ where: { id: user.id } })
      .posts();

    return posts?.length ? posts[0] : undefined
  }
}