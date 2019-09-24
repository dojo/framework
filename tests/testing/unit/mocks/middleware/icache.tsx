const { it } = intern.getInterface('bdd');
const { describe } = intern.getPlugin('jsdom');
import * as sinon from 'sinon';
import { tsx, create } from '../../../../../src/core/vdom';
import harness from '../../../../../src/testing/harness';
import createICacheMock from '../../../../../src/testing/mocks/middleware/icache';
import icache from '../../../../../src/core/middleware/icache';
import global from '../../../../../src/shim/global';

describe('icache mock', () => {
	it('should provide access to async icache loads', async () => {
		const iCacheMock = createICacheMock();
		const factory = create({ icache });
		const App = factory(({ middleware: { icache } }) => {
			const value = icache.getOrSet('users', async () => {
				const response = await fetch('https://reqres.in/api/users');
				return await response.json();
			});

			return value ? <div>{value}</div> : <div>Loading</div>;
		});

		global.fetch = sinon.stub().returns(Promise.resolve({ json: () => Promise.resolve('api data') }));

		const h = harness(() => <App />, { middleware: [[icache, iCacheMock]] });
		h.expect(() => <div>Loading</div>);
		await iCacheMock('users');
		h.expect(() => <div>api data</div>);
	});
});
