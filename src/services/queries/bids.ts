import type { CreateBidAttrs, Bid } from '$services/types';
import { client, withLock } from '$services/redis';
import { bidHistoryKey, itemsKey, itemsByPriceKey } from '$services/keys';
import { DateTime } from 'luxon';
import { getItem } from './items';

export const createBid = async (attrs: CreateBidAttrs) => {
	// Use watch
	// return client.executeIsolated(async (isolatedClient) => {
	// 	await isolatedClient.watch(itemsKey(attrs.itemId));
	// 	const item = await getItem(attrs.itemId);

	// 	if (!item) {
	// 		throw new Error('Item not found');
	// 	}

	// 	if (item.price >= attrs.amount) {
	// 		throw new Error('Bid amount is too low');
	// 	}

	// 	if (item.endingAt.diff(DateTime.now()).toMillis() < 0) {
	// 		throw new Error('Item closed to bidding');
	// 	}

	// 	const serialized = serializeHistory(
	// 		attrs.amount,
	// 		attrs.createdAt.toMillis(),
	// 	)

	// 	return isolatedClient
	// 		.multi()
	// 		.rPush(bidHistoryKey(attrs.itemId), serialized)
	// 		.hSet(itemsKey(attrs.itemId), {
	// 			bids: item.bids + 1,
	// 			price: attrs.amount,
	// 			highestBidderId: attrs.userId,
	// 		})
	// 		.zAdd(itemsByPriceKey(), {
	// 			score: attrs.amount,
	// 			value: item.id,
	// 		})
	// 		.exec();
	// })

	// Use lock
	return withLock(`item:${attrs.itemId}:bids`, async () => {
		const item = await getItem(attrs.itemId);

		if (!item) {
			throw new Error('Item not found');
		}

		if (item.price >= attrs.amount) {
			throw new Error('Bid amount is too low');
		}

		if (item.endingAt.diff(DateTime.now()).toMillis() < 0) {
			throw new Error('Item closed to bidding');
		}

		const serialized = serializeHistory(
			attrs.amount,
			attrs.createdAt.toMillis(),
		)

		return Promise.all([
			client.rPush(bidHistoryKey(attrs.itemId), serialized),
			client.hSet(itemsKey(attrs.itemId), {
				bids: item.bids + 1,
				price: attrs.amount,
				highestBidderId: attrs.userId,
			})	,
			client.zAdd(itemsByPriceKey(), {
				score: attrs.amount,
				value: item.id,
			})
		]);
	});
};

export const getBidHistory = async (itemId: string, offset = 0, count = 10): Promise<Bid[]> => {
	const startIndex = -1 * offset - count;
	const endIndex = -1 - offset;

	const range = await client.lRange(bidHistoryKey(itemId), startIndex, endIndex);

	return range.map(bid => deserializeHistory(bid));
};

const serializeHistory = (amount: number, createdAt: number) => {
	return `${amount}:${createdAt}`;
};

const deserializeHistory = (value: string) => {
	const [amount, createdAt] = value.split(':');
	return {
		amount: parseFloat(amount),
		createdAt: DateTime.fromMillis(parseInt(createdAt)),
	};
};
