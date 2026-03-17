import { client } from "$services/redis";
import { getItems } from "$services/queries/items";
import { userLikesKey, itemsKey } from "$services/keys";

export const userLikesItem = async (itemId: string, userId: string) => {
    return client.sIsMember(userLikesKey(userId), itemId);
};

export const likedItems = async (userId: string) => {
    const likedItemIds = await client.sMembers(userLikesKey(userId));

    return getItems(likedItemIds);
};

export const likeItem = async (itemId: string, userId: string) => {
    const inserted = await client.sAdd(userLikesKey(userId), itemId);

    if (inserted) {
        return await client.hIncrBy(itemsKey(itemId), 'likes', 1);
    }
};

export const unlikeItem = async (itemId: string, userId: string) => {
    const removed = await client.sRem(userLikesKey(userId), itemId);

    if (removed) {
        return await client.hIncrBy(itemsKey(itemId), 'likes', -1);
    }
};

export const commonLikedItems = async (userOneId: string, userTwoId: string) => {
    const intersection = await client.sInter([userLikesKey(userOneId), userLikesKey(userTwoId)]);

    return getItems(intersection);
};
