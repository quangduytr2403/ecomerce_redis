import { randomBytes } from 'crypto';
import { client } from './client';

export const withLock = async (key: string, cb: (redisClient: Client) => any) => {
	// Initalize variables to control retry behavior
	const retryDelayMs = 100;
	let retries = 20;
	const timeoutMs = 2000;

	// Generate random value to store in lock key
	const token = randomBytes(6).toString('hex');

	// Create lock key
	const lockKey = `lock:${key}`;

	while (retries >= 0) {
		retries--;

		// Try to acquire lock by SET NX
		const acquired = await client.set(lockKey, token, {
			NX: true,
			PX: timeoutMs, // auto expire after 2s
		});

		if (!acquired) {
			await pause(retryDelayMs);
			continue;
		}

		try {
			const proxyClient = buildClientProxy(timeoutMs);
			const result = await cb(proxyClient);
			return result;
		} finally {
			// await client.del(lockKey);

			// Use unlock script instead of del to prevent when a process took long time to run
			// The lock will expire automatically after 2s
			// Then another process can acquire the lock
			// Then del command run and accidentally delete the lock of another process
			await client.unlock(lockKey, token);
		}
	}
};

type Client = typeof client;

// This proxy help to build a client that will throw error if the lock is expired
// When a process took long time to run
// The lock will expire automatically after 2s
// Then another process can acquire the lock
// Then write commands of old process run and accidentally override the data
const buildClientProxy = (timoutMs: number) => {
	const startTime = Date.now();
	const handler = {
		get(target: Client, prop: keyof Client) {
			if (Date.now() - startTime >= timoutMs) {
				throw new Error('Lock expired');
			}
			const value = target[prop];
			return typeof value === 'function' ? value.bind(target) : value;
		}
	};

	return new Proxy(client, handler) as Client;
};

const pause = (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
