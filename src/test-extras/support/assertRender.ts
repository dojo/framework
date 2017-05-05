import { assign } from '@dojo/core/lang';
import { isHNode, isWNode } from '@dojo/widget-core/d';
import { DNode, HNode, WNode } from '@dojo/widget-core/interfaces';
import AssertionError from './AssertionError';
import { diff, DiffOptions } from './compare';

const RENDER_FAIL_MESSAGE = 'Render unexpected';

export interface AssertRenderOptions extends DiffOptions {
	/**
	 * A replacement type guard for `isHNode`
	 */
	isHNode?(child: DNode): child is HNode;

	/**
	 * A replacement type guard for `isWNode`
	 */
	isWNode?(child: DNode): child is WNode;
}

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
const defaultDiffOptions: DiffOptions = {
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
 * @param options A set of options that effect the behaviour of `assertRender`
 * @param message Any message to be part of an error thrown if actual and expected do not match
 */
export default function assertRender(actual: DNode, expected: DNode, message?: string): void;
export default function assertRender(actual: DNode, expected: DNode, options: AssertRenderOptions, message?: string): void;
export default function assertRender(actual: DNode, expected: DNode, options?: AssertRenderOptions | string, message?: string): void {
	if (typeof options === 'string') {
		message = options;
		options = undefined;
	}
	const { isHNode: localIsHNode = isHNode, isWNode: localIsWNode = isWNode, ...passedDiffOptions } = (options || {}) as AssertRenderOptions;
	const diffOptions: DiffOptions = assign({}, defaultDiffOptions, passedDiffOptions);

	function assertChildren(actual: DNode[], expected: DNode[]) {
		if (actual.length !== expected.length) {
			throwAssertionError(actual, expected, message);
		}
		actual.forEach((actualChild, index) => {
			assertRender(actualChild, expected[index], message);
		});
	}

	if ((localIsHNode(actual) && localIsHNode(expected)) || (localIsWNode(actual) && localIsWNode(expected))) {
		if (localIsHNode(actual) && localIsHNode(expected)) {
			if (actual.tag !== expected.tag) {
				/* The tags do not match */
				throwAssertionError(actual.tag, expected.tag, message);
			}
		}
		/* istanbul ignore else: not being tracked by TypeScript properly */
		else if (localIsWNode(actual) && localIsWNode(expected)) {
			if (actual.widgetConstructor !== expected.widgetConstructor) {
				/* The WNode does not share the same constructor */
				throwAssertionError(actual.widgetConstructor, expected.widgetConstructor, message);
			}
		}
		const delta = diff(actual.properties, expected.properties, diffOptions);
		if (delta.length) {
			/* The properties do not match */
			throwAssertionError(actual.properties, expected.properties, message);
		}
		/* We need to assert the children match */
		assertChildren(actual.children, expected.children);
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
