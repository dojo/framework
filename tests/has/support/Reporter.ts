import * as fs from 'fs';
import * as nodeUtil from 'util';
import * as path from 'path';
import * as intern from 'intern';
import Collector = require('istanbul/lib/collector');
import glob = require('glob');
import JsonReporter = require('istanbul/lib/report/json');
import Instrumenter = require('istanbul/lib/instrumenter');
import 'istanbul/index';

import Runner = require('intern/lib/reporters/Runner');
import util = require('intern/lib/util');

const LIGHT_RED = '\x1b[91m';
const LIGHT_GREEN = '\x1b[92m';
const LIGHT_MAGENTA = '\x1b[95m';

class Reporter extends Runner {
	private _filename: string;
	private _collector: Collector;
	private _reporter: JsonReporter;
	private reporter: any;
	private _errors: { [sessionId: string ]: any[] } = {};

	constructor(config: any = {}) {
		super(config);

		this._filename = config.file || 'coverage-final.json';
		this._collector = new Collector();
		this.reporter = {
			writeReport: function () {}
		};
		this._reporter = new JsonReporter({
			file: this._filename,
			watermarks: config.watermarks
		});
	}

	coverage(sessionId: string, coverage: any) {
		if (intern.mode === 'client' || sessionId) {
			const session = this.sessions[sessionId || ''];
			session.coverage = true;
			this._collector.add(coverage);
		}
	}

	runEnd() {
		let numEnvironments = 0;
		let numTests = 0;
		let numFailedTests = 0;
		let numSkippedTests = 0;

		for (const sessionId in this.sessions) {
			const session = this.sessions[sessionId];
			++numEnvironments;
			numTests += session.suite.numTests;
			numFailedTests += session.suite.numFailedTests;
			numSkippedTests += session.suite.numSkippedTests;
		}

		this.charm.write('\n');

		if (intern.mode === 'client') {
			for (let sid in this._errors) {
				this._errors[sid].forEach((test) => {
					this.charm
						.write(LIGHT_RED)
						.write('× ' + test.id)
						.foreground('white')
						.write(' (' + (test.timeElapsed / 1000) + 's)')
						.write('\n')
						.foreground('red')
						.write(test.error)
						.display('reset')
						.write('\n\n');
				});
			}
		}

		let message = `TOTAL: tested ${numEnvironments} platforms, ${numFailedTests}/${numTests} failed`;

		if (numSkippedTests) {
			message += ` (${numSkippedTests} skipped)`;
		}
		if (this.hasErrors && !numFailedTests) {
			message += '; fatal error occurred';
		}

		this.charm
			.foreground(numFailedTests > 0 || this.hasErrors ? 'red' : 'green')
			.write(message)
			.display('reset')
			.write('\n');

		this._writeCoverage();
	}

	suiteStart(suite: any): void {
		if (!suite.hasParent) {
			this.sessions[suite.sessionId || ''] = { suite: suite };
			if (suite.sessionId) {
				this.charm.write('\n‣ Created session ' + suite.name + ' (' + suite.sessionId + ')\n');
			}
		}
	}

	suiteEnd(suite: any): void {
		if (!suite.hasParent) {
			// runEnd will report all of this information, so do not repeat it
			if (intern.mode === 'client') {
				return;
			}

			// Runner mode test with no sessionId was some failed test, not a bug
			if (!suite.sessionId) {
				return;
			}

			const session = this.sessions[suite.sessionId];

			if (session.coverage) {
				this.reporter.writeReport(session.coverage);
			}
			else {
				this.charm
					.write('No unit test coverage for ' + suite.name)
					.display('reset')
					.write('\n');
			}

			this.charm
				.write('\n\n');

			if (this._errors[suite.sessionId]) {
				this._errors[suite.sessionId].forEach((test) => {
					this.charm
						.write(LIGHT_RED)
						.write('× ' + test.id)
						.foreground('white')
						.write(' (' + (test.timeElapsed / 1000) + 's)')
						.write('\n')
						.foreground('red')
						.write(test.error)
						.display('reset')
						.write('\n\n');
				});
			}

			const name = suite.name;
			const hasError = (function hasError(suite: any) {
				return suite.tests ? (suite.error || suite.tests.some(hasError)) : false;
			})(suite);
			const numFailedTests = suite.numFailedTests;
			const numTests = suite.numTests;
			const numSkippedTests = suite.numSkippedTests;

			let summary = nodeUtil.format('%s: %d/%d tests failed', name, numFailedTests, numTests);
			if (numSkippedTests) {
				summary += ' (' + numSkippedTests + ' skipped)';
			}

			if (hasError) {
				summary += '; fatal error occurred';
			}

			this.charm
				.write(numFailedTests || hasError > 0 ? LIGHT_RED : LIGHT_GREEN)
				.write(summary)
				.display('reset')
				.write('\n\n');
		}
	}

	testFail(test: any): void {
		if (!this._errors[test.sessionId]) {
			this._errors[test.sessionId] = [];
		}

		this._errors[test.sessionId].push({
			id: test.id,
			timeElapsed: test.timeElapsed,
			error: util.getErrorMessage(test.error)
		});

		this.charm
			.write(LIGHT_RED)
			.write('×')
			.display('reset');
	}

	testPass(test: any): void {
		this.charm
			.write(LIGHT_GREEN)
			.write('✓')
			.display('reset');
	}

	testSkip(test: any): void {
		this.charm
			.write(LIGHT_MAGENTA)
			.write('~')
			.display('reset');
	}

	_writeCoverage(): void {
		let coverage: any;
		if (fs.existsSync(this._filename)) {
			coverage = JSON.parse(fs.readFileSync(this._filename, { encoding: 'utf8' }));
		}
		else {
			coverage = {};
			const coveredFiles = this._collector.files();
			const instrumenter = new Instrumenter({
				noCompact: true,
				noAutoWrap: true
			});
			glob.sync('_build/**/*.js').filter(function (filepath) {
				return !(<any> intern.executor).config.excludeInstrumentation.test(filepath) && coveredFiles.indexOf(path.resolve(filepath)) === -1;
			}).forEach(function (filepath) {
				try {
					const wholename = path.resolve(filepath);
					instrumenter.instrumentSync(fs.readFileSync(wholename, 'utf8'), wholename);
					coverage[wholename] = instrumenter.lastFileCoverage();
					for (let i in coverage[wholename].s) {
						coverage[wholename].s[i] = 0;
					}
				}
				catch (error) {
					console.error(filepath + ': ' + error);
				}
			});
		}
		this._collector.add(coverage);
		this._reporter.writeReport(this._collector, true);
	}
}

export = Reporter;
