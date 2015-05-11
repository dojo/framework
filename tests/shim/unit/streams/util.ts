import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as util from 'src/streams/util';

const BOOLEAN_SIZE = 4;
const NUMBER_SIZE = 8;

registerSuite({
	name: 'util',

	getApproximateByteSize: {
		boolean() {
			assert.strictEqual(util.getApproximateByteSize(true), BOOLEAN_SIZE);
			assert.strictEqual(util.getApproximateByteSize(false), BOOLEAN_SIZE);
		},

		number() {
			assert.strictEqual(util.getApproximateByteSize(0), NUMBER_SIZE);
			assert.strictEqual(util.getApproximateByteSize(Infinity), NUMBER_SIZE);
			assert.strictEqual(util.getApproximateByteSize(Math.pow(2, 16)), NUMBER_SIZE);
			assert.strictEqual(util.getApproximateByteSize(-Math.pow(2, 16)), NUMBER_SIZE);
		},

		string() {
			assert.strictEqual(util.getApproximateByteSize('a'), 2);
			assert.strictEqual(util.getApproximateByteSize('abc'), 6);
			assert.strictEqual(util.getApproximateByteSize(''), 0);
		},

		array() {
			let array = [
				true,
				1024,
				'abc',
				[
					false,
					8,
					'xyz'
				],
				{
					0: true,
					abc: 'xyz',
					xyz: 16
				}
			];

			assert.strictEqual(util.getApproximateByteSize(array), 58);
		},

		object() {
			let obj = {
				0: true,
				abc: 'xyz',
				xyz: 16,
				_d: [
					true,
					8,
					'abc'
				]
			};
			assert.strictEqual(util.getApproximateByteSize(obj), 50);
		}
	}
});
