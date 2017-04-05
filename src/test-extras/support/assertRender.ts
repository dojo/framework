import { isHNode, isWNode } from '@dojo/widget-core/d';
import { DNode } from '@dojo/widget-core/interfaces';
import AssertionError from './AssertionError';
import { diff, DiffOptions } from './compare';

const RENDER_FAIL_MESSAGE = 'Render unexpected';

/**
 * Internal function that throws an AssertionError
 * @param actual actual value
 * @param expected expected value
 * @param message any message to be part of the error
 */
function throwAssertionError(actual: any, expected: any, message?: string): never {
	throw new AssertionError(message ? `${RENDER_FAIL_MESSAGE}: ${message}` : RENDER_FAIL_MESSAGE, {
		actual,
		expected,
		showDiff: true
	}, assertRender);
}

/**
 * Options used to configure diff to correctly compare `DNode`s
 */
const diffOptions: DiffOptions = {
	allowFunctionValues: true,
	ignorePropertyValues: [ 'bind' ]
};

/**
 * A function that asserts Dojo virtual DOM against expected virtual DOM.  When the actual and
 * expected differ, the function will throw an `AssertionError`.  It is expected to be used
 * in conjunction with `w` and `v` from `@dojo/widget-core/d` and would look something like this:
 *
 * ```ts
 * assertRender(results, v('div', {
 *     classes: [ css.root ]
 * }, [ w(SubWidget, { open: true }) ]));
 * ```
 *
 * @param actual The actual rendered DNode to be asserted
 * @param expected The expected DNode to be asserted against the actual
 * @param message Any message to be part of an error thrown if actual and expected do not match
 */
export default function assertRender(actual: DNode, expected: DNode, message?: string): void {

	function assertChildren(actual: DNode[], expected: DNode[]) {
		if (actual.length !== expected.length) {
			throwAssertionError(actual, expected, message);
		}
		actual.forEach((actualChild, index) => {
			assertRender(actualChild, expected[index], message);
		});
	}

	if (isHNode(actual) && isHNode(expected)) {
		if (actual.tag !== expected.tag) {
			/* The tags do not match */
			throwAssertionError(actual.tag, expected.tag, message);
		}
		const delta = diff(actual.properties, expected.properties, diffOptions);
		if (delta.length) {
			/* The properties do not match */
			throwAssertionError(actual.properties, expected.properties, message);
		}
		/* We need to assert the children match */
		assertChildren(actual.children, expected.children);
	}
	else if (isWNode(actual) && isWNode(expected)) {
		if (actual.widgetConstructor !== expected.widgetConstructor) {
			/* The WNode does not share the same constructor */
			throwAssertionError(actual.widgetConstructor, expected.widgetConstructor, message);
		}
		const delta = diff(actual.properties, expected.properties, diffOptions);
		if (delta.length) {
			/* There are differences in the properties between the two nodes */
			throwAssertionError(actual.properties, expected.properties, message);
		}
		if (actual.children && expected.children) {
			/* We need to assert the children match */
			assertChildren(actual.children, expected.children);
		}
		else if (actual.children || expected.children) {
			/* One WNode has children, but the other doesn't */
			throwAssertionError(actual.children, expected.children, message);
		}
	}
	else if (typeof actual === 'string' && typeof expected === 'string') {
		/* Both DNodes are strings */
		if (actual !== expected) {
			/* The strings do not match */
			throwAssertionError(actual, expected, message);
		}
	}
	else if (!(actual === null && expected === null)) {
		/* There is a mismatch between the types of DNodes */
		throwAssertionError(actual, expected, message);
	}
}
