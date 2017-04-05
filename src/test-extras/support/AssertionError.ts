/*
 * (The MIT License)
 *
 * Copyright (c) 2013 Jake Luer <jake@qualiancy.com> (http://qualiancy.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*
 * This module is adapated from [assertion-error](https://github.com/chaijs/assertion-error)
 * from JavaScript to TypeScript
 */

/**
 * Return a function that will copy properties from
 * one object to another excluding any originally
 * listed. Returned function will create a new `{}`.
 *
 * @param excluds excluded properties
 */
function exclude(...excludes: string[]) {

	function excludeProps(res: any, obj: any) {
		Object.keys(obj).forEach(function (key) {
			if (!~excludes.indexOf(key)) {
				res[key] = obj[key];
			}
		});
	}

	return function extendExclude(...args: any[]): any {
		const res = {};

		for (let i = 0; i < args.length; i++) {
			excludeProps(res, args[i]);
		}

		return res;
	};
};

export interface AssertionError extends Error {
	[prop: string]: any;
	showDiff: boolean;
}

export interface AssertionErrorConstructor {
	new (message?: string, _props?: any, ssf?: Function): AssertionError;
	prototype: AssertionError;
}

/**
 * ### AssertionError
 *
 * An extension of the JavaScript `Error` constructor for
 * assertion and validation scenarios.
 *
 * @param message (optional)
 * @param _props properties to include (optional)
 * @param ssf start stack function (optional)
 */
function AssertionError(this: AssertionError, message?: string, _props?: any, ssf?: Function) {
	const extend = exclude('name', 'message', 'stack', 'constructor', 'toJSON');
	const props: { [key: string]: any } = extend(_props || {});

	// default values
	this.message = message || 'Unspecified AssertionError';
	this.showDiff = false;

	// copy from properties
	for (const key in props) {
		this[key] = props[key];
	}

	// capture stack trace
	if (ssf && Error.captureStackTrace) {
		Error.captureStackTrace(this, ssf);
	}
	else {
		try {
			throw new Error();
		}
		catch (e) {
			this.stack = e.stack;
		}
	}
}

/*!
 * Inherit from Error.prototype
 */

AssertionError.prototype = Object.create(Error.prototype);

/*!
 * Statically set name
 */

AssertionError.prototype.name = 'AssertionError';

/*!
 * Ensure correct constructor
 */

AssertionError.prototype.constructor = AssertionError;

/**
 * Allow errors to be converted to JSON for static transfer.
 *
 * @param stack include stack (default: `true`)
 */
AssertionError.prototype.toJSON = function (this: AssertionError, stack?: boolean) {
	const extend = exclude('constructor', 'toJSON', 'stack');
	const props: { [prop: string]: any } = extend({ name: this.name }, this);

	// include stack if exists and not turned off
	if (false !== stack && this.stack) {
		props.stack = this.stack;
	}

	return props;
};

/* tslint:disable:variable-name */
const AssertionErrorConstructor: AssertionErrorConstructor = <any> AssertionError;

export default AssertionErrorConstructor;
