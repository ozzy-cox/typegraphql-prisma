import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();

  await prisma.post.deleteMany({});
  await prisma.user.deleteMany({});

  const user1 = await prisma.user.create({
    data: {
      email: "alice@prisma.io",
      password: "asdf1234",
      name: "Alice",
      posts: {
        create: [
          {
            title: "Join us for Prisma Day 2019 in Berlin",
            content: "https://www.prisma.io/day/",
            published: true,
          },
          {
            title: "Join us for Prisma Day 2020 in Berlin",
            content: "https://www.prisma.io/day/",
            published: false,
          },
        ],
      },
    },
  });
  const user2 = await prisma.user.create({
    data: {
      email: "bob@prisma.io",
      password: "asdf12345",
      name: "Bob",
      posts: {
        create: [
          {
            title: "Subscribe to GraphQL Weekly for community news",
            content: "https://graphqlweekly.com/",
            published: true,
          },
          {
            title: "Follow Prisma on Twitter",
            content: "https://twitter.com/prisma",
            published: false,
          },
        ],
      },
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: "o@o.co",
      password: "asdf",
      name: "ozan",
      posts: {
        create: [
          {
            title: "Subscribe to GraphQL Weekly for community news",
            content: "https://graphqlweekly.com/",
            published: true,
          },
          {
            title: "Follow Prisma on Twitter",
            content: "https://twitter.com/prisma",
            published: false,
          },
        ],
      },
    },
  });

  console.log({ user1, user2, user3 });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });