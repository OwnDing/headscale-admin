import { API_URL_NODE, API_URL_POLICY, API_URL_PREAUTHKEY, API_URL_ROUTES, API_URL_USER, apiGet } from '$lib/common/api';
import type {
	ApiNodes,
	ApiPolicy,
	ApiPreAuthKeys,
	ApiRoutes,
	ApiUsers,
	Node,
	PreAuthKey,
	Route,
	User,
} from '$lib/common/types';

export async function getPreAuthKeys(
	userIds?: string[],
	init?: RequestInit,
): Promise<PreAuthKey[]> {
	if (userIds == undefined) {
		userIds = (await getUsers(init)).map((u) => u.id);
	}
	const promises: Promise<ApiPreAuthKeys>[] = [];
	let preAuthKeysAll: PreAuthKey[] = [];

	userIds.forEach(async (userId: string) => {
		if(userId != ""){
			promises.push(
				apiGet<ApiPreAuthKeys>(API_URL_PREAUTHKEY + '?user=' + userId, init),
			);
		}
	});

	promises.forEach(async (p) => {
		const { preAuthKeys } = await p;
		preAuthKeysAll = preAuthKeysAll.concat(preAuthKeys);
	});

	await Promise.all(promises);
	return preAuthKeysAll;
}

// Helper function to get preauth keys by usernames (for backward compatibility)
export async function getPreAuthKeysByUsernames(
	usernames?: string[],
	init?: RequestInit,
): Promise<PreAuthKey[]> {
	if (usernames == undefined) {
		return getPreAuthKeys(undefined, init);
	}

	// Get all users to map usernames to user IDs
	const users = await getUsers(init);
	const userIds: string[] = [];

	usernames.forEach((username: string) => {
		const user = users.find(u => u.name === username);
		if (user) {
			userIds.push(user.id);
		}
	});

	return getPreAuthKeys(userIds, init);
}

type GetUserOptions = 
	{id: string, name?: never, email?: never} |
	{id?: never, name: string, email?: never} |
	{id?: never, name?: never, email: string}

export async function getUsers(init?: RequestInit, options?: GetUserOptions): Promise<User[]> {
	let url = API_URL_USER;
	if (options !== undefined){
		if(options.id !== undefined) {
			url += "?id=" + options.id
		} else if (options.name !== undefined) {
			url += "?name=" + options.name
		} else if (options.email !== undefined) {
			url += "?email=" + options.email
		} else {
			throw new Error("Invalid User Parameters")
		}
	}
	const { users } = await apiGet<ApiUsers>(url, init);
	return users;
}

export async function getNodes(): Promise<Node[]> {
	const { nodes } = await apiGet<ApiNodes>(API_URL_NODE);
	return nodes;
}

export async function getRoutes(): Promise<Route[]> {
	const { routes } = await apiGet<ApiRoutes>(API_URL_ROUTES);
	return routes;
}

export async function getPolicy(): Promise<string> {
	const { policy } = await apiGet<ApiPolicy>(API_URL_POLICY)
	return policy
}
