import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from 'src/has';
import * as text from 'src/text';
import { spy, stub } from 'sinon';
import * as fs from 'fs';

// The exported get function from the text module
// uses fs.readFile on node systems, which resolves
// paths differently than request, which can and
// should be used internally for browser environments.
// As such, this determines the appropriate base path
// for get tests.
const basePath = (function() {
	if (has('host-browser')) {
		return '../../_build/tests/support/data/';
	}
	else if (has('host-node')) {
		return '_build/tests/support/data/';
	}
})();

const absPathMock = (val: string) => val;
let fsSpy: Sinon.SinonSpy;

registerSuite({
		name: 'text',

		'get'() {
			text.get(basePath + 'correctText.txt').then(this.async().callback(function (text: string) {
				assert.strictEqual(text, 'abc');
			}));
		},

		'normalize': {
			'calls absMid function for relative path'() {
				const absMidStub = stub().returns('test');
				text.normalize('./test', absMidStub);
				assert.isTrue(absMidStub.calledOnce, 'Abs mid function should be called');
			},
			'does not call absMid function for abs path'() {
				const absMidStub = stub().returns('test');
				text.normalize('test', absMidStub);
				assert.isFalse(absMidStub.called, 'Abs mid function should not be called');
			},
			'should return passed strip flag for relative path'() {
				const normalized = text.normalize('./test!strip', absPathMock);
				assert.include(normalized, '!strip', 'Strip flag should be present');
			},
			'should return passed strip flag for abs path'() {
				const normalized = text.normalize('test!strip', absPathMock);
				assert.include(normalized, '!strip', 'Strip flag should be present');
			}
		},

		'load': {
			beforeEach() {
				fsSpy = spy(fs, 'readFile');
			},

			afterEach() {
				fsSpy.restore && fsSpy.restore();
			},

			'should return text and call require'() {
				text.load(basePath + 'textLoad.txt', (<DojoLoader.Require> require), this.async().callback((val: string) => {
					assert.isTrue(fsSpy.calledOnce, 'Read file should be called once');
					assert.strictEqual(val, 'test', 'Correct text should be returned');
				}));
			},
			'should return text from cache'() {
				text.load(basePath + 'textLoad.txt', (<DojoLoader.Require> require), this.async().callback((val: string) => {
					assert.isTrue(fsSpy.notCalled, 'Read file should not be called');
					assert.strictEqual(val, 'test', 'Correct text should be returned');
				}));
			},
			'should strip xml'() {
				text.load(basePath + 'strip.xml!strip', (<DojoLoader.Require> require), this.async().callback((val: string) => {
					assert.strictEqual(val, 'abc', 'Should have stripped the XML');
				}));
			},
			'should strip html'() {
				text.load(basePath + 'strip.html!strip', (<DojoLoader.Require> require), this.async().callback((val: string) => {
					assert.strictEqual(val, 'abc', 'Should have stripped the XML');
				}));
			}
		}
	}
);
