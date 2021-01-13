import { create, invalidator } from '../vdom';

export interface Request {
	start: number;
	end: number;
	query: any;
}

type RawCacheItem = {
	pending: boolean;
	value: any;
	mtime: number;
	idKey: string;
};

export class RawCache {
	_subscriberCounter = 1;
	_rawCache = new Map<string, RawCacheItem>();
	_syntheticIdToIdMap = new Map<string, string | null>();
	_idToSyntheticIdMap = new Map<string, string>();
	_syntheticIdToSubscriberMap = new Map<string, Set<any>>();
	_subscriberMap = new Map<string, any>();
	subscribe(syntheticIds: string[], invalidator: any) {
		const subscriberId = `${this._subscriberCounter++}`;
		syntheticIds.forEach((syntheticId) => {
			let subscribers = this._syntheticIdToSubscriberMap.get(syntheticId);
			if (!subscribers) {
				subscribers = new Set();
			}
			subscribers.add(subscriberId);
			this._syntheticIdToSubscriberMap.set(syntheticId, subscribers);
		});
		this._subscriberMap.set(subscriberId, {
			syntheticIds,
			invalidator,
			refs: new Set(syntheticIds)
		});
	}
	notify(syntheticId: string) {
		const subscriberIds = this._syntheticIdToSubscriberMap.get(syntheticId);
		if (subscriberIds) {
			[...subscriberIds].forEach((subscriberId) => {
				const subscriber = this._subscriberMap.get(subscriberId);
				if (subscriber) {
					subscriber.refs.delete(syntheticId);
					if (subscriber.refs.size === 0) {
						subscriber.invalidator();
						this._subscriberMap.delete(subscriberId);
					}
					const subscribers = this._syntheticIdToSubscriberMap.get(syntheticId)!;
					subscribers.delete(subscriber);
					this._syntheticIdToSubscriberMap.set(syntheticId, subscribers);
				}
			});
		}
	}
	get(syntheticId: string) {
		const id = this._syntheticIdToIdMap.get(syntheticId)!;
		if (id === null) {
			return {
				pending: true,
				mtime: Date.now(),
				value: undefined
			};
		}
		return this._rawCache.get(id);
	}
	addSyntheticId(syntheticId: string) {
		this._syntheticIdToIdMap.set(syntheticId, null);
	}
	set(syntheticId: string, item: RawCacheItem) {
		const id = item.value[item.idKey];
		this._syntheticIdToIdMap.set(syntheticId, id);
		this._idToSyntheticIdMap.set(id, syntheticId);
		this._rawCache.set(id, item);
		this.notify(syntheticId);
	}
}

// raw cache is per resource template
const _rawCache = new RawCache();
// request cache is per resource template
const _requestCache = new Map<string, boolean>();
// ttl is per resource template
const ttl = 10000;

const middleware = create({ invalidator });

export const resourceCache = middleware(({ middleware: { invalidator } }) => {
	return {
		get(request: Request, reader?: (put: any) => void) {
			const stringifiedRequest = JSON.stringify(request);
			const requestInFlight = _requestCache.get(stringifiedRequest);
			if (requestInFlight) {
				return undefined;
			}
			const syntheticIds: string[] = [];
			for (let i = 0; i < request.end - request.start; i++) {
				syntheticIds[i] = `${request.query}/${request.start + i}`;
			}
			const incompletes: string[] = [];
			let shouldRead = false;
			const items: any[] = [];
			syntheticIds.forEach((syntheticId, idx) => {
				const item = _rawCache.get(syntheticId);
				if (item) {
					if (item.pending) {
						incompletes.push(syntheticId);
					} else if (item.mtime - Date.now() + ttl < 0) {
						incompletes.push(syntheticId);
						shouldRead = true;
						items[idx] = item.value;
					} else {
						items[idx] = item.value;
					}
				} else {
					incompletes.push(syntheticId);
					shouldRead = true;
				}
			});
			if (incompletes.length) {
				_rawCache.subscribe(incompletes, () => {
					invalidator();
				});
			} else {
				return items;
			}
			if (shouldRead && reader) {
				syntheticIds.forEach((syntheticId, idx) => {
					_rawCache.addSyntheticId(syntheticId);
				});
				const put = ({
					start,
					end,
					items,
					idKey
				}: {
					start: number;
					end: number;
					items: any[];
					idKey: string;
				}) => {
					items.forEach((item, idx) => {
						const syntheticId = syntheticIds[idx] ? syntheticIds[idx] : `${request.query}/${start + idx}`;
						_rawCache.set(syntheticId, {
							idKey,
							value: item,
							pending: false,
							mtime: Date.now()
						});
					});
					_requestCache.set(stringifiedRequest, false);
				};
				_requestCache.set(stringifiedRequest, true);
				reader(put);
				let items: any[] = [];
				for (let i = 0; i < syntheticIds.length; i++) {
					const syntheticId = syntheticIds[i];
					const item = _rawCache.get(syntheticId);
					if (item && !item.pending) {
						items[i] = item.value;
					} else {
						return undefined;
					}
				}
				return items;
			}
		}
	};
});

export default resourceCache;
