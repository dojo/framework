import { create, diffProperty } from '../vdom';
import { icache } from './icache';
import { cache } from './cache';
import { FocusProperties } from '../mixins/Focus';

const factory = create({ icache, cache, diffProperty }).properties<FocusProperties>();

export const focus = factory(({ middleware: { icache, cache, diffProperty } }) => {
	diffProperty('focus', (_: FocusProperties, next: FocusProperties) => {
		const result = next.focus && next.focus();
		if (result) {
			let current = icache.get('current') || 0;
			icache.set('current', current + 1);
		}
	});
	return {
		shouldFocus(): boolean {
			const current = icache.get('current') || 0;
			const previous = cache.get('previous') || 0;
			cache.set('previous', current);
			return current !== previous;
		},
		focus(): void {
			let current = cache.get('current') || 0;
			icache.set('current', current + 1);
		}
	};
});

export default focus;
