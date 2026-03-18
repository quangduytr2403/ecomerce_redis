import type { CreateUserAttrs } from '$services/types';
import { genId } from '$services/utils';
import { usersKey, usernamesUniqueKey, usernamesKey } from '$services/keys';
import { client } from '$services/redis';

export const getUserByUsername = async (username: string) => {
    const decimalId = await client.zScore(usernamesKey(), username);
    if (!decimalId) {
        throw new Error('User does not exist');
    }

    const id = decimalId.toString(16);
    const user = await client.hGetAll(usersKey(id));
    return deserialize(id, user);
};

export const getUserById = async (id: string) => {
    const user = await client.hGetAll(usersKey(id));
    return deserialize(id, user);
};

export const createUser = async (attrs: CreateUserAttrs) => {
    const id = genId();
    const key = usersKey(id);
    const exists = await client.sIsMember(usernamesUniqueKey(), attrs.username);

    if (exists) {
        throw new Error('Username already exists');
    }

    await client.hSet(key, serialize(attrs));
    await client.sAdd(usernamesUniqueKey(), attrs.username);
    await client.zAdd(usernamesKey(), {
        value: attrs.username,
        score: parseInt(id, 16),
    });
    return id;
};

const serialize = (user: CreateUserAttrs) => {
    return { ...user }
};

const deserialize = (id: string, user: { [key: string]: string }) => {
    return { id, ...user };
}