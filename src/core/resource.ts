import { Invalidator } from './interfaces';

export type SubscriptionType = 'data' | 'total' | 'loading' | 'failed';

export interface ResourceOptions {
	pageNumber?: number;
	query?: ResourceQuery[];
	pageSize?: number;
}

export type ResourceQuery = { keys: string[]; value: string | undefined };

export interface Resource {
	getOrRead(options: ResourceOptions): any;
	get(options: ResourceOptions): any;
	getTotal(options: ResourceOptions): number | undefined;
	isLoading(options: ResourceOptions): boolean;
	isFailed(options: ResourceOptions): boolean;
	subscribe(type: SubscriptionType, options: ResourceOptions, invalidator: Invalidator): void;
	unsubscribe(invalidator: Invalidator): void;
	set(data: any[]): void;
}

export type TransformConfig<T, S = void> = { [P in keyof T]: (S extends void ? string : keyof S)[] };

export interface ReadOptions {
	offset?: number;
	size?: number;
	query?: ResourceQuery[];
}

type Putter<S> = (start: number, data: S[]) => void;
type Getter<S> = (query?: ResourceQuery[]) => S[];

export type DataResponse<S> = { data: S[]; total: number };
export type DataResponsePromise<S> = Promise<{ data: S[]; total: number }>;
export type DataFetcher<S> = (
	options: ReadOptions,
	put: Putter<S>,
	get: Getter<S>
) => DataResponse<S> | DataResponsePromise<S>;

export interface DataTemplate<S = {}> {
	read: DataFetcher<S>;
}

type Status = 'LOADING' | 'FAILED';
type InvalidatorMaps = { [key in SubscriptionType]: Map<string, Set<Invalidator>> };

export function createTransformer<S, T>(template: DataTemplate<S>, transformer: TransformConfig<T, S>) {
	return transformer;
}

function isAsyncResponse<S>(response: DataResponsePromise<S> | DataResponse<S>): response is DataResponsePromise<S> {
	return (response as any).then !== undefined;
}

export function createResource<S>(config: DataTemplate<S>): Resource {
	const { read } = config;
	let queryMap = new Map<string, S[]>();
	let statusMap = new Map<string, { [key: string]: Status }>();
	let totalMap = new Map<string, number>();

	const invalidatorMaps: InvalidatorMaps = {
		data: new Map<string, Set<Invalidator>>(),
		total: new Map<string, Set<Invalidator>>(),
		loading: new Map<string, Set<Invalidator>>(),
		failed: new Map<string, Set<Invalidator>>()
	};

	function invalidate(types: SubscriptionType[], options: ResourceOptions) {
		const key = `${getQueryKey(options)}-${getPageKey(options)}`;

		types.forEach((type) => {
			const keyedInvalidatorMap = invalidatorMaps[type];
			const invalidatorSet = keyedInvalidatorMap.get(key);
			if (invalidatorSet) {
				[...invalidatorSet].forEach((invalidator: any) => {
					invalidator();
				});
			}
		});
	}

	function getPageKey({ pageNumber, pageSize }: ResourceOptions): string {
		return `page-${pageNumber}-pageSize-${pageSize}`;
	}

	function getQueryKey(query = {}): string {
		return JSON.stringify(query);
	}

	function subscribe(type: SubscriptionType, options: ResourceOptions, invalidator: Invalidator) {
		const key = `${getQueryKey(options)}-${getPageKey(options)}`;
		const keyedInvalidatorMap = invalidatorMaps[type];
		const invalidatorSet = keyedInvalidatorMap.get(key) || new Set<Invalidator>();
		invalidatorSet.add(invalidator);
		keyedInvalidatorMap.set(key, invalidatorSet);
	}

	function unsubscribe(invalidator: Invalidator) {
		Object.keys(invalidatorMaps).forEach((type) => {
			const keyedInvalidatorMap = invalidatorMaps[type as SubscriptionType];

			const keys = keyedInvalidatorMap.keys();
			[...keys].forEach((key) => {
				const invalidatorSet = keyedInvalidatorMap.get(key);
				if (invalidatorSet && invalidatorSet.has(invalidator)) {
					invalidatorSet.delete(invalidator);
					keyedInvalidatorMap.set(key, invalidatorSet);
				}
			});
		});
	}

	function isStatus(status: Status, options: ResourceOptions) {
		const queryKey = getQueryKey(options.query);
		const pageKey = getPageKey(options);
		const pageStatuses = statusMap.get(queryKey);
		if (pageStatuses) {
			return pageStatuses[pageKey] === status;
		}
		return false;
	}

	function setStatus(status: Status, options: ResourceOptions) {
		const queryKey = getQueryKey(options.query);
		const pageKey = getPageKey(options);
		const pageStatuses = statusMap.get(queryKey) || {};
		pageStatuses[pageKey] = status;
		statusMap.set(queryKey, pageStatuses);
	}

	function clearStatus(options: ResourceOptions) {
		const queryKey = getQueryKey(options.query);
		const pageKey = getPageKey(options);
		const pageStatuses = statusMap.get(queryKey);
		if (pageStatuses && pageStatuses[pageKey]) {
			delete pageStatuses[pageKey];
			statusMap.set(queryKey, pageStatuses);
		}
	}

	function isLoading(options: ResourceOptions) {
		return isStatus('LOADING', options);
	}

	function isFailed(options: ResourceOptions) {
		return isStatus('FAILED', options);
	}

	function getTotal(options: ResourceOptions) {
		const queryKey = getQueryKey(options.query);
		return totalMap.get(queryKey);
	}

	function get(options: ResourceOptions): S[] {
		const { pageNumber, pageSize } = options;
		const queryKey = getQueryKey(options.query);
		const cachedQueryData = queryMap.get(queryKey);

		if (!cachedQueryData) {
			return [];
		}

		if (pageSize && pageNumber) {
			const start = (pageNumber - 1) * pageSize;
			const end = start + pageSize;
			const total = totalMap.get(queryKey) || end;
			const calculatedEnd = Math.min(end, total);
			const requiredData = cachedQueryData.slice(start, calculatedEnd);
			if (requiredData.filter(() => true).length === calculatedEnd - start) {
				return requiredData;
			} else {
				return [];
			}
		} else {
			return cachedQueryData;
		}
	}

	function setData(start: number, data: S[], size: number, query = {}) {
		const queryKey = getQueryKey(query);
		const cachedQueryData = queryMap.get(queryKey);
		const newQueryData = cachedQueryData && cachedQueryData.length ? cachedQueryData : [];

		for (let i = 0; i < size; i += 1) {
			newQueryData[start + i] = data[i];
		}

		queryMap.set(queryKey, newQueryData);
	}

	function getOrRead(options: ResourceOptions): S[] | undefined {
		const { pageNumber, query, pageSize } = options;
		const queryKey = getQueryKey(options.query);

		if (isLoading(options) || isFailed(options)) {
			return undefined;
		}

		const cachedQueryData = queryMap.get(queryKey);

		if (
			cachedQueryData &&
			(!pageSize || !pageNumber) &&
			cachedQueryData.filter(() => true).length === totalMap.get(queryKey)
		) {
			return cachedQueryData;
		}

		if (pageSize && pageNumber && cachedQueryData && cachedQueryData.length) {
			const start = (pageNumber - 1) * pageSize;
			const end = start + pageSize;
			const total = totalMap.get(queryKey) || end;
			const calculatedEnd = Math.min(end, total);
			const requiredData = cachedQueryData.slice(start, calculatedEnd);
			if (requiredData.length && requiredData.filter(() => true).length === calculatedEnd - start) {
				return requiredData;
			}
		}

		const readOptions: ReadOptions = {};

		if (pageNumber !== undefined && pageSize !== undefined) {
			readOptions.offset = (pageNumber - 1) * pageSize;
			readOptions.size = pageSize;
		}

		if (query) {
			readOptions.query = query;
		}

		const response = read(
			readOptions,
			(start = 0, data: S[]) => {
				setData(start, data, data.length, query);
			},
			(query) => {
				return get({ query });
			}
		);

		if (isAsyncResponse(response)) {
			setStatus('LOADING', options);
			invalidate(['loading'], options);

			response
				.then(({ data, total }) => {
					const start = readOptions.offset || 0;
					const size = Math.min(data.length, readOptions.size || data.length);
					setData(start, data, size, query);

					clearStatus(options);

					invalidate(['loading', 'data'], options);
					if (total !== totalMap.get(queryKey)) {
						totalMap.set(queryKey, total);
						invalidate(['total'], options);
					}
				})
				.catch(() => {
					setStatus('FAILED', options);
					invalidate(['failed', 'loading'], options);
				});

			return undefined;
		} else {
			const { data, total } = response;
			const start = readOptions.offset || 0;
			const size = Math.min(data.length, readOptions.size || data.length);
			setData(start, data, size, query);
			invalidate(['data'], options);

			if (total !== totalMap.get(queryKey)) {
				totalMap.set(queryKey, total);
				invalidate(['total'], options);
			}
			return data;
		}
	}

	return {
		getOrRead,
		get,
		getTotal,
		subscribe,
		unsubscribe,
		isFailed,
		isLoading,
		set(data: S[]) {
			setData(0, data, data.length);
			totalMap.set(getQueryKey(), data.length);
		}
	};
}
