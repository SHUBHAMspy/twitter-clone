/*
  Warnings:

  - You are about to drop the `Post` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropTable
DROP TABLE "Post";

-- CreateTable
CREATE TABLE "LikedTweet" (
    "id" SERIAL NOT NULL,
    "likedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tweetId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "LikedTweet_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LikedTweet" ADD CONSTRAINT "LikedTweet_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LikedTweet" ADD CONSTRAINT "LikedTweet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
