import InMemoryStorage from '../../../src/storage/InMemoryStorage';
import Promise from '@dojo/shim/Promise';
import { delay } from '@dojo/core/async/timing';
import { Query, FetchResult, CrudOptions } from '../../../src/interfaces';
import Patch from '../../../src/patch/Patch';

function getRandomInt(max = 100) {
	return Math.floor(Math.random() * max);
}

export default class AsyncStorage<T> extends InMemoryStorage<T> {
	timing: { [ index: string ]: number | undefined };

	constructor(options?: any) {
		super(options);
		this.timing = options || {};
	}

	get(ids: string[]): Promise<T[]> {
		return delay(this.timing['get'] || getRandomInt())(() => super.get(ids));
	}

	createId() {
		return delay(this.timing['createId'] || getRandomInt())(() => super.createId());
	}

	put(items: T[], options?: CrudOptions) {
		return delay(this.timing['put'] || getRandomInt())(() => super.put(items, options));
	}

	add(items: T[], options?: CrudOptions) {
		return delay(this.timing['put'] || getRandomInt())(() => super.add(items, options));
	}

	delete(ids: string[]) {
		return delay(this.timing['delete'] || getRandomInt())(() => super.delete(ids));
	}

	patch(updates: { id: string; patch: Patch<T, T> }[]) {
		return delay(this.timing['patch'] || getRandomInt())(() => super.patch(updates));
	}

	fetch(query?: Query<T>) {
		let totalLengthResolve: () => void;
		let totalLengthReject: () => void;
		let fetchResultResolve: () => void;
		let fetchResultReject: () => void;
		const totalLengthPromise = new Promise((resolve, reject) => {
			totalLengthResolve = resolve;
			totalLengthReject = reject;
		});
		const fetchResult: FetchResult<T> = <any> new Promise((resolve, reject) => {
			fetchResultResolve = resolve;
			fetchResultReject = reject;
		});
		fetchResult.totalLength = fetchResult.dataLength = totalLengthPromise;
		setTimeout(() => {
			const result = super.fetch();
			result.then(fetchResultResolve, fetchResultReject);
			result.totalLength.then(totalLengthResolve, totalLengthReject);
		}, this.timing['fetch'] || getRandomInt());

		return fetchResult;
	}
}
