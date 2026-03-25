import { randomBytes } from 'crypto';
import { client } from './client';

export const withLock = async (key: string, cb: () => any) => {
	// Initalize variables to control retry behavior
	const retryDelayMs = 100;
	let retries = 20;

	// Generate random value to store in lock key
	const token = randomBytes(6).toString('hex');

	// Create lock key
	const lockKey = `lock:${key}`;

	while (retries >= 0) {
		retries--;

		// Try to acquire lock by SET NX
		const acquired = await client.set(lockKey, token, {
			NX: true,
			PX: 2000, // auto expire after 2s
		});

		if (!acquired) {
			await pause(retryDelayMs);
			continue;
		}

		try {
			const result = await cb();
			return result;
		} finally {
			await client.del(lockKey);
		}
	}
};

const buildClientProxy = () => {};

const pause = (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
