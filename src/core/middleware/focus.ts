import { create, diffProperties, invalidator } from '../vdom';
import { cache } from './cache';

export interface FocusProperties {
	focus?: (() => boolean);
}

const factory = create({ cache, diffProperties, invalidator }).properties<FocusProperties>();

export const focus = factory(({ middleware: { cache, diffProperties, invalidator } }) => {
	cache.set('current', 0);
	cache.set('previous', 0);
	diffProperties((_: FocusProperties, next: FocusProperties) => {
		const result = next.focus && next.focus();
		if (result) {
			let current = cache.get('current') || 0;
			current++;
			cache.set('current', current);
			invalidator();
		}
	});
	return {
		shouldFocus(): boolean {
			const current = cache.get('current') || 0;
			const previous = cache.get('previous') || 0;
			cache.set('previous', current);
			return current !== previous;
		},
		focus(): void {
			let current = cache.get('current') || 0;
			current++;
			cache.set('current', current);
			invalidator();
		}
	};
});

export default focus;
