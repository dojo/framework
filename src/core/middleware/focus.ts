import global from '../../shim/global';
import { create, diffProperty, node, destroy, invalidator } from '../vdom';
import { createICacheMiddleware } from './icache';
import { FocusProperties } from '../mixins/Focus';

interface FocusState {
	current: number;
	previous: number;
}

const icache = createICacheMiddleware<FocusState>();

const factory = create({ icache, diffProperty, node, destroy, invalidator }).properties<FocusProperties>();

export const focus = factory(({ middleware: { icache, diffProperty, node, destroy, invalidator } }) => {
	let initialized = false;
	let currentElement: HTMLElement | undefined;
	const nodeSet = new Set<HTMLElement>();
	diffProperty('focus', (_: FocusProperties, next: FocusProperties) => {
		const result = next.focus && next.focus();
		if (result) {
			const current = icache.getOrSet('current', 0);
			icache.set('current', current + 1);
		}
	});
	function onFocusChange() {
		const activeElement = global.document.activeElement;
		if ((nodeSet.has(currentElement!) || nodeSet.has(activeElement)) && currentElement !== activeElement) {
			invalidator();
		}
		currentElement = activeElement;
	}
	destroy(() => {
		global.document.removeEventListener('focusin', onFocusChange);
		global.document.removeEventListener('focusout', onFocusChange);
		nodeSet.clear();
	});
	return {
		shouldFocus(): boolean {
			const current = icache.getOrSet('current', 0);
			const previous = icache.getOrSet('previous', 0);
			icache.set('previous', current);
			return current !== previous;
		},
		focus(): void {
			const current = icache.getOrSet('current', 0);
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
