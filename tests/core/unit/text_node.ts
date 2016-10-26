import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as text from '../../src/text';
import { spy, SinonSpy } from 'sinon';
import * as fs from 'fs';
import { RootRequire } from '../../src/loader';

declare const require: RootRequire;

const basePath = '_build/tests/support/data/';
let fsSpy: SinonSpy;

registerSuite({
		name: 'text',

		'load': {
			beforeEach() {
				fsSpy = spy(fs, 'readFile');
			},

			afterEach() {
				fsSpy.restore && fsSpy.restore();
			},

			'should return text and call fs'(this: any) {
				text.load(basePath + 'textLoad.txt', require, this.async().callback((val: string) => {
					assert.isTrue(fsSpy.calledOnce, 'Read file should be called once');
					assert.strictEqual(val, 'test', 'Correct text should be returned');
				}));
			},
			'should return text from cache'(this: any) {
				text.load(basePath + 'textLoad.txt', require, this.async().callback((val: string) => {
					assert.isTrue(fsSpy.notCalled, 'Read file should not be called');
					assert.strictEqual(val, 'test', 'Correct text should be returned');
				}));
			}
		}
	}
);
