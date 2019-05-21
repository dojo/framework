import global from '../../../src/shim/global';
import String, * as stringUtil from '../../../src/shim/string';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

function testCodePointAt(text: string, codePoint?: number, expected?: number) {
	assert.strictEqual(stringUtil.codePointAt(text, codePoint as any), expected);

	if (typeof codePoint !== 'undefined') {
		assert.strictEqual(text.codePointAt(codePoint), expected);
	}
}

function getPositionAndExpected(
	position: number | boolean | undefined,
	expected?: boolean
): { positionArg: number | undefined; expectedValue: boolean } {
	let positionArg: number | undefined = position as any;
	let expectedValue = expected;
	if (arguments.length === 1) {
		expectedValue = position as any;
		positionArg = undefined;
	}

	return { positionArg, expectedValue: Boolean(expectedValue) };
}

function testEndsWith(text: string, endsWith: string, position: number | boolean | undefined, expected?: boolean) {
	const { expectedValue, positionArg } = getPositionAndExpected(position, expected);
	assert.strictEqual(stringUtil.endsWith(text, endsWith, positionArg), expectedValue);

	assert.strictEqual(text.endsWith(endsWith, positionArg), expectedValue);
}

function testFromCodePoint(codePoints: number[], expected: string) {
	assert.equal(stringUtil.fromCodePoint(...codePoints), expected);
	assert.equal(String.fromCodePoint(...codePoints), expected);
}

function testInclude(text: string, includes: string, position: number | boolean | undefined, expected?: boolean) {
	const { positionArg, expectedValue } = getPositionAndExpected(position, expected);
	assert.strictEqual(stringUtil.includes(text, includes, positionArg), expectedValue);

	assert.strictEqual(text.includes(includes, positionArg), expectedValue);
}

function testStartsWith(text: string, startsWith: string, position: number | boolean | undefined, expected?: boolean) {
	const { positionArg, expectedValue } = getPositionAndExpected(position, expected);
	assert.strictEqual(stringUtil.startsWith(text, startsWith, positionArg), expectedValue);

	assert.strictEqual(text.startsWith(startsWith, positionArg), expectedValue);
}

function testPadEnd(text: string, maxLength: number, fillString?: string, expected?: string) {
	if (expected === undefined) {
		expected = fillString;
		fillString = undefined;
	}

	assert.strictEqual(stringUtil.padEnd(text, maxLength, fillString), expected);
	assert.strictEqual(text.padEnd(maxLength, fillString), expected);
}

function testPadStart(text: string, maxLength: number, fillString?: string, expected?: string) {
	if (expected === undefined) {
		expected = fillString;
		fillString = undefined;
	}

	assert.strictEqual(stringUtil.padStart(text, maxLength, fillString), expected);
	assert.strictEqual(text.padStart(maxLength, fillString), expected);
}

registerSuite('shim - string functions', {
	polyfill() {
		assert.equal(String, global.String);
	},
	'.codePointAt()': {
		'throws on undefined or null string'() {
			assert.throws(function() {
				stringUtil.codePointAt(<any>undefined, <any>undefined);
			}, TypeError);
			assert.throws(function() {
				stringUtil.codePointAt(<any>null, <any>undefined);
			}, TypeError);
		},

		'string starting with a BMP symbol'() {
			const text = 'abc\uD834\uDF06def';

			// Cases expected to return the first code point (i.e. position 0)
			testCodePointAt(text, undefined, 0x61);
			testCodePointAt(text, 0, 0x61);
			testCodePointAt(text, NaN, 0x61);
			testCodePointAt(text, <any>null, 0x61);
			testCodePointAt(text, <any>undefined, 0x61);

			// Cases expected to return undefined (i.e. position out of range)
			testCodePointAt(text, -Infinity, <any>undefined);
			testCodePointAt(text, Infinity, <any>undefined);
			testCodePointAt(text, -1, <any>undefined);
			testCodePointAt(text, 42, <any>undefined);

			// Test various code points in the string
			testCodePointAt(text, 3, 0x1d306);
			testCodePointAt(text, 4, 0xdf06);
			testCodePointAt(text, 5, 0x64);
		},

		'string starting with an astral symbol'() {
			const text = '\uD834\uDF06def';
			testCodePointAt(text, 0, 0x1d306);
			testCodePointAt(text, 1, 0xdf06);
		},

		'lone high/low surrogates'() {
			testCodePointAt('\uD834abc', 0, 0xd834);
			testCodePointAt('\uDF06abc', 0, 0xdf06);
		}
	},

	'.endsWith()': {
		'throws on undefined or null string'() {
			assert.throws(function() {
				stringUtil.endsWith(<any>undefined, 'abc');
			});
			assert.throws(function() {
				stringUtil.endsWith(<any>null, 'abc');
			});
		},

		'null or undefined search value'() {
			testEndsWith('undefined', <any>undefined, true);
			testEndsWith('undefined', <any>null, false);
			testEndsWith('null', <any>null, true);
			testEndsWith('null', <any>undefined, false);
		},

		'position is Infinity, not included, or NaN'() {
			testEndsWith('abc', '', Infinity, true);
			testEndsWith('abc', '\0', Infinity, false);
			testEndsWith('abc', 'c', Infinity, true);
			testEndsWith('abc', 'b', Infinity, false);
			testEndsWith('abc', 'bc', Infinity, true);
			testEndsWith('abc', 'abc', Infinity, true);
			testEndsWith('abc', 'abcd', Infinity, false);

			testEndsWith('abc', '', undefined, true);
			testEndsWith('abc', '\0', undefined, false);
			testEndsWith('abc', 'c', undefined, true);
			testEndsWith('abc', 'b', undefined, false);
			testEndsWith('abc', 'bc', undefined, true);
			testEndsWith('abc', 'abc', undefined, true);
			testEndsWith('abc', 'abcd', undefined, false);

			testEndsWith('abc', '', null as any, true);
			testEndsWith('abc', '\0', null as any, false);
			testEndsWith('abc', 'c', null as any, false);
			testEndsWith('abc', 'b', null as any, false);
			testEndsWith('abc', 'bc', null as any, false);
			testEndsWith('abc', 'abc', null as any, false);
			testEndsWith('abc', 'abcd', null as any, false);

			testEndsWith('abc', '', NaN, true);
			testEndsWith('abc', '\0', NaN, false);
			testEndsWith('abc', 'c', NaN, false);
			testEndsWith('abc', 'b', NaN, false);
			testEndsWith('abc', 'bc', NaN, false);
			testEndsWith('abc', 'abc', NaN, false);
			testEndsWith('abc', 'abcd', NaN, false);
		},

		'position is 0 or negative'() {
			let counts = [0, -1];
			for (let count of counts) {
				testEndsWith('abc', '', count, true);
				testEndsWith('abc', '\0', count, false);
				testEndsWith('abc', 'a', count, false);
				testEndsWith('abc', 'b', count, false);
				testEndsWith('abc', 'ab', count, false);
				testEndsWith('abc', 'abc', count, false);
				testEndsWith('abc', 'abcd', count, false);
			}
		},

		'position is 1'() {
			testEndsWith('abc', '', 1, true);
			testEndsWith('abc', '\0', 1, false);
			testEndsWith('abc', 'a', 1, true);
			testEndsWith('abc', 'b', 1, false);
			testEndsWith('abc', 'bc', 1, false);
			testEndsWith('abc', 'abc', 1, false);
			testEndsWith('abc', 'abcd', 1, false);
		},

		'unicode support'() {
			testEndsWith('\xA2fa\xA3', 'fa\xA3', true);
			testEndsWith('\xA2fa', '\xA2', 1, true);
			testEndsWith('\xA2fa\uDA04', '\xA2fa\uDA04', true);
			testEndsWith('\xA2fa\uDA04', 'fa', 3, true);
			testEndsWith('\xA2fa\uDA04', '\uDA04', true);
		}
	},

	'.fromCodePoint()': {
		'error cases'() {
			let codePoints = [-1, 0x10ffff + 1, 3.14, 3e-2, Infinity, -Infinity, NaN, <any>undefined];
			let codePoint: any;
			for (codePoint of codePoints) {
				assert.throws(function() {
					stringUtil.fromCodePoint(codePoint);
				}, RangeError);
			}
		},

		'basic cases'() {
			testFromCodePoint([<any>null], '\0');
			testFromCodePoint([0], '\0');
			testFromCodePoint([], '');
			testFromCodePoint([0x1d306], '\uD834\uDF06');
			testFromCodePoint([0x1d306, 0x61, 0x1d307], '\uD834\uDF06a\uD834\uDF07');
			testFromCodePoint([0x61, 0x62, 0x1d307], 'ab\uD834\uDF07');
		},

		'test that valid cases do not throw'() {
			let counter = (Math.pow(2, 15) * 3) / 2;
			let oneUnitArgs: number[] = [];
			let twoUnitArgs: number[] = [];

			while (--counter >= 0) {
				oneUnitArgs.push(0); // one code unit per symbol
				twoUnitArgs.push(0xffff + 1); // two code units per symbol
			}

			assert.doesNotThrow(function() {
				stringUtil.fromCodePoint.apply(null, oneUnitArgs);
				stringUtil.fromCodePoint.apply(null, twoUnitArgs);
				String.fromCodePoint.apply(null, oneUnitArgs);
				String.fromCodePoint.apply(null, twoUnitArgs);
			});
		}
	},

	'.includes()': {
		'throws on undefined or null string'() {
			assert.throws(function() {
				stringUtil.includes(<any>undefined, 'abc');
			});
			assert.throws(function() {
				stringUtil.includes(<any>null, 'abc');
			});
		},

		'null or undefined search value'() {
			testInclude('undefined', <any>undefined, true);
			testInclude('undefined', <any>null, false);
			testInclude('null', <any>null, true);
			testInclude('null', <any>undefined, false);
		},

		'position is 0 (whether explicitly, by default, or due to NaN or negative)'() {
			let counts = [0, -1, NaN, <any>undefined, null];
			for (let count of counts) {
				testInclude('abc', '', count, true);
				testInclude('abc', '\0', count, false);
				testInclude('abc', 'a', count, true);
				testInclude('abc', 'b', count, true);
				testInclude('abc', 'ab', count, true);
				testInclude('abc', 'abc', count, true);
				testInclude('abc', 'abcd', count, false);
			}
		},

		'position is Infinity'() {
			testInclude('abc', '', Infinity, true);
			testInclude('abc', '\0', Infinity, false);
			testInclude('abc', 'a', Infinity, false);
			testInclude('abc', 'b', Infinity, false);
			testInclude('abc', 'ab', Infinity, false);
			testInclude('abc', 'abc', Infinity, false);
			testInclude('abc', 'abcd', Infinity, false);
		},

		'position is 1'() {
			testInclude('abc', '', 1, true);
			testInclude('abc', '\0', 1, false);
			testInclude('abc', 'a', 1, false);
			testInclude('abc', 'b', 1, true);
			testInclude('abc', 'bc', 1, true);
			testInclude('abc', 'abc', 1, false);
			testInclude('abc', 'abcd', 1, false);
		},

		'unicode support'() {
			testInclude('\xA2fa', '\xA2', true);
			testInclude('\xA2fa', 'fa', 1, true);
			testInclude('\xA2fa\uDA04', '\xA2fa\uDA04', true);
			testInclude('\xA2fa\uDA04', 'fa\uDA04', 1, true);
			testInclude('\xA2fa\uDA04', '\uDA04', 3, true);
		}
	},

	'.raw()': {
		'error cases'() {
			assert.throws(function() {
				stringUtil.raw(<any>null);
			}, TypeError);
		},

		'basic tests'() {
			let answer = 42;
			assert.strictEqual(
				stringUtil.raw`The answer is:\n${answer}`,
				'The answer is:\\n42',
				'stringUtil.raw applied to template string should result in expected value'
			);

			assert.strictEqual(
				String.raw`The answer is:\n${answer}`,
				'The answer is:\\n42',
				'stringUtil.raw applied to template string should result in expected value'
			);

			function getCallSite(callSite: TemplateStringsArray, ...substitutions: any[]): TemplateStringsArray {
				const result = [...callSite];
				(result as any).raw = callSite.raw;
				return result as any;
			}

			let callSite = getCallSite`The answer is:\n${answer}`;
			assert.strictEqual(
				stringUtil.raw(callSite),
				'The answer is:\\n',
				'stringUtil.raw applied with insufficient arguments should result in no substitution'
			);

			assert.strictEqual(
				String.raw(callSite),
				'The answer is:\\n',
				'stringUtil.raw applied with insufficient arguments should result in no substitution'
			);

			(callSite as any).raw = ['The answer is:\\n'];
			assert.strictEqual(
				stringUtil.raw(callSite, 42),
				'The answer is:\\n',
				'stringUtil.raw applied with insufficient raw fragments should result in truncation before substitution'
			);

			assert.strictEqual(
				String.raw(callSite, 42),
				'The answer is:\\n',
				'stringUtil.raw applied with insufficient raw fragments should result in truncation before substitution'
			);
		}
	},

	'.repeat()': {
		'throws on undefined or null string'() {
			assert.throws(function() {
				stringUtil.repeat(<any>undefined, <any>undefined);
			}, TypeError);
			assert.throws(function() {
				stringUtil.repeat(<any>null, <any>null);
			}, TypeError);
		},

		'throws on negative or infinite count'() {
			let counts = [-Infinity, -1, Infinity];
			let count: number;
			for (count of counts) {
				assert.throws(function() {
					stringUtil.repeat('abc', count);
				}, RangeError);

				assert.throws(function() {
					'abc'.repeat(count);
				}, RangeError);
			}
		},

		'returns empty string when passed 0, NaN, or no count'() {
			assert.strictEqual((stringUtil.repeat as any)('abc'), '');
			let counts = [<any>undefined, null, 0, NaN];
			for (let count of counts) {
				assert.strictEqual(stringUtil.repeat('abc', count), '');
				assert.strictEqual('abc'.repeat(count), '');
			}
		},

		'returns expected string for positive numbers'() {
			assert.strictEqual(stringUtil.repeat('abc', 1), 'abc');
			assert.strictEqual(stringUtil.repeat('abc', 2), 'abcabc');
			assert.strictEqual(stringUtil.repeat('abc', 3), 'abcabcabc');
			assert.strictEqual(stringUtil.repeat('abc', 4), 'abcabcabcabc');

			assert.strictEqual('abc'.repeat(1), 'abc');
			assert.strictEqual('abc'.repeat(2), 'abcabc');
			assert.strictEqual('abc'.repeat(3), 'abcabcabc');
			assert.strictEqual('abc'.repeat(4), 'abcabcabcabc');
		}
	},

	'.startsWith()': {
		'throws on undefined or null string'() {
			assert.throws(function() {
				stringUtil.startsWith(<any>undefined, 'abc');
			});
			assert.throws(function() {
				stringUtil.startsWith(<any>null, 'abc');
			});
		},

		'null or undefined search value'() {
			testStartsWith('undefined', <any>undefined, true);
			testStartsWith('undefined', <any>null, false);
			testStartsWith('null', <any>null, true);
			testStartsWith('null', <any>undefined, false);
		},

		'position is 0 (whether explicitly, by default, or due to NaN or negative)'() {
			let counts = [0, -1, NaN, <any>undefined, null];
			for (let count of counts) {
				testStartsWith('abc', '', count, true);
				testStartsWith('abc', '\0', count, false);
				testStartsWith('abc', 'a', count, true);
				testStartsWith('abc', 'b', count, false);
				testStartsWith('abc', 'ab', count, true);
				testStartsWith('abc', 'abc', count, true);
				testStartsWith('abc', 'abcd', count, false);
			}
		},

		'position is Infinity'() {
			testStartsWith('abc', '', Infinity, true);
			testStartsWith('abc', '\0', Infinity, false);
			testStartsWith('abc', 'a', Infinity, false);
			testStartsWith('abc', 'b', Infinity, false);
			testStartsWith('abc', 'ab', Infinity, false);
			testStartsWith('abc', 'abc', Infinity, false);
			testStartsWith('abc', 'abcd', Infinity, false);
		},

		'position is 1'() {
			testStartsWith('abc', '', 1, true);
			testStartsWith('abc', '\0', 1, false);
			testStartsWith('abc', 'a', 1, false);
			testStartsWith('abc', 'b', 1, true);
			testStartsWith('abc', 'bc', 1, true);
			testStartsWith('abc', 'abc', 1, false);
			testStartsWith('abc', 'abcd', 1, false);
		},

		'unicode support'() {
			testStartsWith('\xA2fa', '\xA2', true);
			testStartsWith('\xA2fa', 'fa', 1, true);
			testStartsWith('\xA2fa\uDA04', '\xA2fa\uDA04', true);
			testStartsWith('\xA2fa\uDA04', 'fa\uDA04', 1, true);
			testStartsWith('\xA2fa\uDA04', '\uDA04', 3, true);
		}
	},

	'.padEnd()': {
		'null/undefined string'() {
			assert.throws(() => {
				stringUtil.padEnd(<any>null, 12);
			});

			assert.throws(() => {
				stringUtil.padEnd(<any>undefined, 12);
			});
		},

		'null/undefined/invalid length'() {
			testPadEnd('test', <any>null, 'test');
			testPadEnd('test', <any>undefined, 'test');
			testPadEnd('test', -1, 'test');

			assert.throws(() => {
				stringUtil.padEnd('', Infinity);
			});

			assert.throws(() => {
				''.padEnd(Infinity);
			});
		},

		'padEnd()'() {
			testPadEnd('', 10, '          ');
			testPadEnd('test', 5, 'test ');
			testPadEnd('test', 10, 'test', 'testtestte');
			testPadEnd('test', 3, 'padding', 'test');
		}
	},

	'.padStart()': {
		'null/undefined string'() {
			assert.throws(() => {
				stringUtil.padStart(<any>null, 12);
			});

			assert.throws(() => {
				stringUtil.padStart(<any>undefined, 12);
			});
		},

		'null/undefined/invalid length'() {
			testPadStart('test', <any>null, 'test');
			testPadStart('test', <any>undefined, 'test');
			testPadStart('test', -1, 'test');

			assert.throws(() => {
				stringUtil.padStart('', Infinity);
			});

			assert.throws(() => {
				''.padStart(Infinity);
			});
		},

		'padStart()'() {
			testPadStart('', 10, '          ');
			testPadStart('test', 5, ' test');
			testPadStart('test', 10, 'test', 'testtetest');
			testPadStart('test', 3, 'padding', 'test');
		}
	}
});
