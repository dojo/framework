import { Provider, ProviderTest } from './interfaces';
import MatchRegistry, { Test } from '../MatchRegistry';
import { Handle } from '../interfaces';

export default class ProviderRegistry extends MatchRegistry<Provider> {
	setDefaultProvider(provider: Provider) {
		this._defaultValue = provider;
	}

	register(test: string | RegExp | ProviderTest | null, value: Provider, first?: boolean): Handle {
		let entryTest: Test | null;

		if (typeof test === 'string') {
			entryTest = (url, options) => test === url;
		} else if (test instanceof RegExp) {
			entryTest = (url, options) => {
				return test ? test.test(url) : null;
			};
		} else {
			entryTest = test;
		}

		return super.register(entryTest, value, first);
	}
}
