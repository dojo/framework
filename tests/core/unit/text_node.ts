const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import * as text from '../../../src/core/text';
import { spy, SinonSpy } from 'sinon';
import * as fs from 'fs';
import { AmdRootRequire } from '../../../src/core/interfaces';

declare const require: AmdRootRequire;

const basePath = 'dist/dev/tests/core/support/data/';
let fsSpy: SinonSpy;

registerSuite('text - node', {
	load: {
		beforeEach() {
			fsSpy = spy(fs, 'readFile');
		},

		afterEach() {
			fsSpy.restore && fsSpy.restore();
		},

		tests: {
			'should return text and call fs'(this: any) {
				text.load(
					basePath + 'textLoad.txt',
					require,
					this.async().callback((val: string) => {
						assert.isTrue(fsSpy.calledOnce, 'Read file should be called once');
						assert.strictEqual(val, 'test', 'Correct text should be returned');
					})
				);
			},
			'should return text from cache'(this: any) {
				text.load(
					basePath + 'textLoad.txt',
					require,
					this.async().callback((val: string) => {
						assert.isTrue(fsSpy.notCalled, 'Read file should not be called');
						assert.strictEqual(val, 'test', 'Correct text should be returned');
					})
				);
			}
		}
	}
});
