import type { CreateUserAttrs } from '$services/types';
import { genId } from '$services/utils';
import { usersKey } from '$services/keys';
import { client } from '$services/redis';

export const getUserByUsername = async (username: string) => { };

export const getUserById = async (id: string) => {
    const user = await client.hGetAll(usersKey(id));
    return deserialize(id, user);
};

export const createUser = async (attrs: CreateUserAttrs) => {
    const id = genId();
    const key = usersKey(id);
    await client.hSet(key, serialize(attrs));
    return id;
};

const serialize = (user: CreateUserAttrs) => {
    return { ...user }
};

const deserialize = (id: string, user: { [key: string]: string }) => {
    return { id, ...user };
}