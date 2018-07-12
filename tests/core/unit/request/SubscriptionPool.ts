const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import SubscriptionPool from '../../../src/request/SubscriptionPool';
import Observable from '../../../src/Observable';

registerSuite('SubscriptionPool', {
	'registers observers'(this: any) {
		const dfd = this.async();

		const pool = new SubscriptionPool<any>();
		const obs = new Observable<any>((observer) => pool.add(observer));

		obs.subscribe((value) => {
			assert.deepEqual(value, 1);
			dfd.resolve();
		});

		pool.next(1);
	},

	'queues events when no observers are present'(this: any) {
		const dfd = this.async();

		const pool = new SubscriptionPool<any>();
		const obs = new Observable<any>((observer) => pool.add(observer));

		pool.next(1);

		obs.subscribe((value) => {
			assert.strictEqual(value, 1);
			dfd.resolve();
		});
	},

	'queued events have a maximum count'(this: any) {
		const dfd = this.async();

		const pool = new SubscriptionPool<any>(1);
		const obs = new Observable<any>((observer) => pool.add(observer));

		pool.next(1);
		pool.next(2);

		obs.subscribe((value) => {
			assert.strictEqual(value, 2);
			dfd.resolve();
		});
	}
});
