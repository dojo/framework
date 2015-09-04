import * as fs from 'fs';
import * as path from 'path';
import * as intern from 'intern';
import Collector = require('istanbul/lib/collector');
import glob = require('glob');
import JsonReporter = require('istanbul/lib/report/json');
import Instrumenter = require('istanbul/lib/instrumenter');
import 'istanbul/index';

import Runner = require('intern/lib/reporters/Runner');

class Reporter extends Runner {
	private _filename: string;
	private _collector: Collector;
	private _reporter: JsonReporter;
	private reporter: any;

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
