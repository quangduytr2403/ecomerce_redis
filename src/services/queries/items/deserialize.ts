import type { Item } from '$services/types';
import { DateTime } from 'luxon';

export const deserialize = (id: string, item: { [key: string]: string }): Item => {
    return {
        id,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        ownerId: item.ownerId,
        highestBidUserId: item.highestBidUserId,
        createdAt: DateTime.fromMillis(parseInt(item.createdAt)),
        endingAt: DateTime.fromMillis(parseInt(item.endingAt)),
        views: parseInt(item.views),
        bids: parseInt(item.bids),
        likes: parseInt(item.likes),
        price: parseFloat(item.price),
    };
};
