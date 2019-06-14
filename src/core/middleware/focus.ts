import global from '../../shim/global';
import { create, diffProperty, node, destroy, invalidator } from '../vdom';
import { icache } from './icache';
import { cache } from './cache';
import { FocusProperties } from '../mixins/Focus';

const factory = create({ icache, cache, diffProperty, node, destroy, invalidator }).properties<FocusProperties>();

export const focus = factory(({ middleware: { icache, cache, diffProperty, node, destroy, invalidator } }) => {
	let initialized = false;
	const nodeSet = new Set<HTMLElement>();
	diffProperty('focus', (_: FocusProperties, next: FocusProperties) => {
		const result = next.focus && next.focus();
		if (result) {
			let current = icache.get('current') || 0;
			icache.set('current', current + 1);
		}
	});
	function onFocusChange() {
		const currentElement = cache.get('active-element');
		const activeElement = global.document.activeElement;
		if (nodeSet.has(currentElement) || nodeSet.has(activeElement)) {
			invalidator();
		}
		cache.set('active-element', activeElement);
	}
	destroy(() => {
		global.document.removeEventListener('focusin', onFocusChange);
		global.document.removeEventListener('focusout', onFocusChange);
		nodeSet.clear();
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
		},
		isFocused(key: string | number): boolean {
			const domNode = node.get(key);
			if (!domNode) {
				return false;
			}
			nodeSet.add(domNode);
			if (!initialized) {
				global.document.addEventListener('focusin', onFocusChange);
				global.document.addEventListener('focusout', onFocusChange);
				initialized = true;
			}
			return global.document.activeElement === domNode;
		}
	};
});

export default focus;
