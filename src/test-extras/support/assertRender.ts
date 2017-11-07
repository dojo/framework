import { assign } from '@dojo/core/lang';
import { isHNode, isWNode } from '@dojo/widget-core/d';
import { DNode, HNode, WNode } from '@dojo/widget-core/interfaces';
import AssertionError from './AssertionError';
import {diff, DiffOptions, getComparableObjects} from './compare';

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
 * Return a string that provides diagnostic information when comparing DNodes where one should be an array
 * @param actual The actual DNode
 * @param expected The expected DNode
 */
function getArrayPreamble(actual: DNode | DNode[], expected: DNode | DNode[]): string {
	return Array.isArray(actual) ?
		`Expected "${getTypeOf(expected)}" but got an array` :
		`Expected an array but got "${getTypeOf(actual)}"`;
}

/**
 * An internal function that returns a string that contains an array of child indexes which related to the message
 * @param childIndex The index of the child to add to the message
 * @param message The message, if any to prepend the child to
 */
function getChildMessage(childIndex: number, message: string = '') {
	const lastIndex = message.lastIndexOf(']');
	if (lastIndex === -1) {
		return `[${childIndex}] ${message}`;
	}
	else {
		return message.slice(0, lastIndex + 1) + `[${childIndex}]` + message.slice(lastIndex + 1);
	}
}

/**
 * Return a string that provides diagnostic information when two DNodes being compared are mismatched
 * @param actual The actual DNode
 * @param expected The expected DNode
 */
function getMismatchPreamble(actual: DNode, expected: DNode): string {
	return `DNode type mismatch, expected "${getTypeOf(expected)}" actual "${getTypeOf(actual)}"`;
}

/**
 * Return a string that represents the type of the value, including null as a seperate type.
 * @param value The value to get the type of
 */
function getTypeOf(value: any) {
	return value === null ? 'null' : typeof value;
}

/**
 * Internal function that throws an AssertionError
 * @param actual actual value
 * @param expected expected value
 * @param prolog a message that provides the specific assertion issue
 * @param message any message to be part of the error
 */
function throwAssertionError(actual: any, expected: any, prolog: string, message?: string): never {
	throw new AssertionError(`${RENDER_FAIL_MESSAGE}: ${prolog}${message ? `: ${message}` : ''}`, {
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
	ignoreProperties: [ 'bind' ]
};

/**
 * A function that asserts Dojo virtual DOM against expected virtual DOM.  When the actual and
 * expected differ, the function will throw an `AssertionError`.  It is expected to be used
 * in conjunction with `w` and `v` from `@dojo/widget-core/d` and would look something like this:
 *
 * @param actual The actual rendered DNode or DNode Array to be asserted
 * @param expected The expected DNode or DNode Array to be asserted against the actual
 * @param options A set of options that effect the behaviour of `assertRender`
 * @param message Any message to be part of an error thrown if actual and expected do not match
 */
export default function assertRender(actual: DNode | DNode[], expected: DNode | DNode[], message?: string): void;
export default function assertRender(actual: DNode | DNode[], expected: DNode | DNode[], options: AssertRenderOptions, message?: string): void;
export default function assertRender(actual: DNode | DNode[], expected: DNode | DNode[], options?: AssertRenderOptions | string, message?: string): void {
	if (typeof options === 'string') {
		message = options;
		options = undefined;
	}
	const { isHNode: localIsHNode = isHNode, isWNode: localIsWNode = isWNode, ...passedDiffOptions } = (options || {}) as AssertRenderOptions;
	const diffOptions: DiffOptions = assign({}, defaultDiffOptions, passedDiffOptions);

	function assertChildren(actual?: DNode[], expected?: DNode[]) {
		if (actual && expected) {
			if (actual.length !== expected.length) {
				throwAssertionError(actual, expected, `Children's length mismatch`, message);
			}
			actual.forEach((actualChild, index) => {
				assertRender(actualChild, expected[index], (options || {}) as AssertRenderOptions, getChildMessage(index, message));
			});
		}
		else {
			if (actual || expected) {
				throwAssertionError(actual, expected, actual ? 'Unxpected children' : 'Expected children', message);
			}
		}
	}

	if (Array.isArray(actual) && Array.isArray(expected)) {
		assertChildren(actual, expected);
	}
	else if (Array.isArray(actual) || Array.isArray(expected)) {
		throwAssertionError(actual, expected, getArrayPreamble(actual, expected), message);
	}
	else if ((localIsHNode(actual) && localIsHNode(expected)) || (localIsWNode(actual) && localIsWNode(expected))) {
		if (localIsHNode(actual) && localIsHNode(expected)) {
			if (actual.tag !== expected.tag) {
				/* The tags do not match */
				throwAssertionError(actual.tag, expected.tag, `Tags do not match`, message);
			}
		}
		/* istanbul ignore else: not being tracked by TypeScript properly */
		else if (localIsWNode(actual) && localIsWNode(expected)) {
			if (actual.widgetConstructor !== expected.widgetConstructor) {
				/* The WNode does not share the same constructor */
				throwAssertionError(actual.widgetConstructor, expected.widgetConstructor, `WNodes do not share constructor`, message);
			}
		}
		const delta = diff(actual.properties, expected.properties, diffOptions);
		if (delta.length) {
			/* The properties do not match */
			const { comparableA, comparableB } = getComparableObjects(actual.properties, expected.properties, diffOptions);
			throwAssertionError(comparableA, comparableB, `Properties do not match`, message);
		}
		/* We need to assert the children match */
		assertChildren(actual.children, expected.children);
	}
	else if (typeof actual === 'string' && typeof expected === 'string') {
		/* Both DNodes are strings */
		if (actual !== expected) {
			/* The strings do not match */
			throwAssertionError(actual, expected, `Unexpected string values`, message);
		}
	}
	else if (isHNode(actual) && typeof expected === 'string') {
		// when doing an expected render on already rendered nodes, strings are converted to _shell_ HNodes
		// so we want to compare to those instead
		if (actual.text !== expected) {
			throwAssertionError(actual.text, expected, `Expected text differs from rendered text`, message);
		}
	}
	else if (!(actual === null && expected === null)) {
		/* There is a mismatch between the types of DNodes */
		throwAssertionError(actual, expected, getMismatchPreamble(actual, expected), message);
	}
}
