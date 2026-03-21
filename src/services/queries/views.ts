import { client } from "$services/redis";
import { itemsByViewsKey, itemsKey, itemsViewsKey } from "$services/keys";

export const incrementView = async (itemId: string, userId: string) => {
    //HyperLogLog to count unique views (approximate, not take many storage as set)
    const inserted = await client.pfAdd(itemsViewsKey(itemId), userId);

    if (inserted) {
        await Promise.all([
            client.zIncrBy(itemsByViewsKey(), 1, itemId),
            client.hIncrBy(itemsKey(itemId), 'views', 1),
        ]);
    }
};
