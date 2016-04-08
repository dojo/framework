import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as text from 'src/text';
import { spy } from 'sinon';
import * as fs from 'fs';

const basePath = '_build/tests/support/data/';
let fsSpy: Sinon.SinonSpy;

registerSuite({
		name: 'text',

		'load': {
			beforeEach() {
				fsSpy = spy(fs, 'readFile');
			},

			afterEach() {
				fsSpy.restore && fsSpy.restore();
			},

			'should return text and call fs'() {
				text.load(basePath + 'textLoad.txt', (<DojoLoader.RootRequire> require), this.async().callback((val: string) => {
					assert.isTrue(fsSpy.calledOnce, 'Read file should be called once');
					assert.strictEqual(val, 'test', 'Correct text should be returned');
				}));
			},
			'should return text from cache'() {
				text.load(basePath + 'textLoad.txt', (<DojoLoader.RootRequire> require), this.async().callback((val: string) => {
					assert.isTrue(fsSpy.notCalled, 'Read file should not be called');
					assert.strictEqual(val, 'test', 'Correct text should be returned');
				}));
			}
		}
	}
);
