import * as chrome from 'selenium-webdriver/chrome';
import { Builder, WebDriver, promise, logging } from 'selenium-webdriver';
import { BenchmarkType, Benchmark, benchmarks, fileName } from './benchmarks';
import { setUseShadowRoot } from './webdriverAccess';
import * as fs from 'fs';
import { JSONResult, config, FrameworkData, frameworks } from './common';
import * as R from 'ramda';
let jStat: any = require('jstat').jStat;

promise.USE_PROMISE_MANAGER = false;

interface Timingresult {
	type: string;
	ts: number;
	dur?: number;
	end?: number;
	mem?: number;
	evt?: any;
}

function extractRelevantEvents(entries: logging.Entry[]) {
	let filteredEvents: Timingresult[] = [];
	entries.forEach((x) => {
		let e = JSON.parse(x.message).message;
		if (config.LOG_DETAILS) {
			console.log(JSON.stringify(e));
		}
		if (e.params.name === 'EventDispatch') {
			if (e.params.args.data.type === 'click') {
				filteredEvents.push({
					type: 'click',
					ts: +e.params.ts,
					dur: +e.params.dur,
					end: +e.params.ts + e.params.dur
				});
			}
		} else if (
			e.params.name === 'TimeStamp' &&
			(e.params.args.data.message === 'afterBenchmark' ||
				e.params.args.data.message === 'finishedBenchmark' ||
				e.params.args.data.message === 'runBenchmark' ||
				e.params.args.data.message === 'initBenchmark')
		) {
			filteredEvents.push({ type: e.params.args.data.message, ts: +e.params.ts, dur: 0, end: +e.params.ts });
		} else if (e.params.name === 'navigationStart') {
			filteredEvents.push({ type: 'navigationStart', ts: +e.params.ts, dur: 0, end: +e.params.ts });
		} else if (e.params.name === 'Paint') {
			filteredEvents.push({
				type: 'paint',
				ts: +e.params.ts,
				dur: +e.params.dur,
				end: +e.params.ts + e.params.dur,
				evt: JSON.stringify(e)
			});
		} else if (e.params.name === 'MajorGC' && e.params.args.usedHeapSizeAfter) {
			filteredEvents.push({
				type: 'gc',
				ts: +e.params.ts,
				end: +e.params.ts,
				mem: Number(e.params.args.usedHeapSizeAfter) / 1024 / 1024
			});
		}
	});
	return filteredEvents;
}

async function fetchEventsFromPerformanceLog(driver: WebDriver): Promise<Timingresult[]> {
	let filteredEvents: Timingresult[] = [];
	let entries = [];
	do {
		entries = await driver
			.manage()
			.logs()
			.get(logging.Type.PERFORMANCE);
		filteredEvents = filteredEvents.concat(extractRelevantEvents(entries));
	} while (entries.length > 0);
	return filteredEvents;
}

function type_eq(requiredType: string) {
	return (e: Timingresult) => e.type === requiredType;
}
function type_neq(requiredType: string) {
	return (e: Timingresult) => e.type !== requiredType;
}

function asString(res: Timingresult[]): string {
	return res.reduce((old, cur) => old + '\n' + JSON.stringify(cur), '');
}

async function computeResultsCPU(driver: WebDriver): Promise<number[]> {
	let entriesBrowser = await driver
		.manage()
		.logs()
		.get(logging.Type.BROWSER);
	if (config.LOG_DEBUG) {
		console.log('browser entries', entriesBrowser);
	}
	let filteredEvents = await fetchEventsFromPerformanceLog(driver);

	if (config.LOG_DEBUG) {
		console.log('filteredEvents ', asString(filteredEvents));
	}

	let remaining = R.dropWhile(type_eq('initBenchmark'))(filteredEvents);
	let results = [];

	while (remaining.length > 0) {
		let evts = R.splitWhen(type_eq('finishedBenchmark'))(remaining);
		if (R.find(type_neq('runBenchmark'))(evts[0]) && evts[1].length > 0) {
			let eventsDuringBenchmark = R.dropWhile(type_neq('runBenchmark'))(evts[0]);

			if (config.LOG_DEBUG) {
				console.log('eventsDuringBenchmark ', eventsDuringBenchmark);
			}

			let clicks = R.filter(type_eq('click'))(eventsDuringBenchmark);
			if (clicks.length !== 1) {
				console.log('exactly one click event is expected', eventsDuringBenchmark);
				throw 'exactly one click event is expected';
			}

			let eventsAfterClick = R.dropWhile(type_neq('click'))(eventsDuringBenchmark);

			if (config.LOG_DEBUG) {
				console.log('eventsAfterClick', eventsAfterClick);
			}

			let paints = R.filter(type_eq('paint'))(eventsAfterClick);
			if (paints.length === 0) {
				console.log('at least one paint event is expected after the click event', eventsAfterClick);
				throw 'at least one paint event is expected after the click event';
			}

			let lastPaint = R.reduce((max: any, elem: any) => (max.end > elem.end ? max : elem), { end: 0 }, paints);

			const lastEvent: any = R.last(eventsDuringBenchmark);
			let eventsDuringBenchmarkEnd: any;

			if (lastEvent && lastEvent.end) {
				eventsDuringBenchmarkEnd = lastEvent.end;
			} else {
				eventsDuringBenchmarkEnd = 0;
			}

			const eventsDuringBenchmarkStart = eventsDuringBenchmark[0].ts;

			let upperBoundForSoundnessCheck = (eventsDuringBenchmarkEnd - eventsDuringBenchmarkStart) / 1000.0;
			let duration = (lastPaint.end - clicks[0].ts) / 1000.0;

			console.log('*** duraton', duration, 'upper bound ', upperBoundForSoundnessCheck);
			if (duration < 0) {
				console.log('soundness check failed. reported duration is less 0', asString(eventsDuringBenchmark));
				throw 'soundness check failed. reported duration is less 0';
			}

			if (duration > upperBoundForSoundnessCheck) {
				console.log(
					'soundness check failed. reported duration is bigger than whole benchmark duration',
					asString(eventsDuringBenchmark)
				);
				throw 'soundness check failed. reported duration is bigger than whole benchmark duration';
			}
			results.push(duration);
		}
		remaining = R.drop(1, evts[1]);
	}
	if (results.length !== config.REPEAT_RUN) {
		console.log(
			`soundness check failed. number or results isn't ${config.REPEAT_RUN}`,
			results,
			asString(filteredEvents)
		);
		throw `soundness check failed. number or results isn't ${config.REPEAT_RUN}`;
	}
	return results;
}

async function computeResultsMEM(driver: WebDriver): Promise<number[]> {
	let entriesBrowser = await driver
		.manage()
		.logs()
		.get(logging.Type.BROWSER);
	if (config.LOG_DEBUG) {
		console.log('browser entries', entriesBrowser);
	}
	let filteredEvents = await fetchEventsFromPerformanceLog(driver);

	if (config.LOG_DEBUG) {
		console.log('filteredEvents ', filteredEvents);
	}

	let remaining = R.dropWhile(type_eq('initBenchmark'))(filteredEvents);
	let results = [];

	while (remaining.length > 0) {
		let evts = R.splitWhen(type_eq('finishedBenchmark'))(remaining);
		if (R.find(type_neq('runBenchmark'))(evts[0]) && evts[1].length > 0) {
			let eventsDuringBenchmark = R.dropWhile(type_neq('runBenchmark'))(evts[0]);

			if (config.LOG_DEBUG) {
				console.log('eventsDuringBenchmark ', eventsDuringBenchmark);
			}

			let gcs = R.filter(type_eq('gc'))(eventsDuringBenchmark);

			const lastGcs: any = R.last(gcs);
			let mem = lastGcs ? lastGcs.mem : 0;
			console.log('*** memory', mem);
			results.push(mem);
		}
		remaining = R.drop(1, evts[1]);
	}
	if (results.length !== config.REPEAT_RUN) {
		console.log(
			`soundness check failed. number or results isn't ${config.REPEAT_RUN}`,
			results,
			asString(filteredEvents)
		);
		throw `soundness check failed. number or results isn't ${config.REPEAT_RUN}`;
	}
	return results;
}

async function computeResultsStartup(driver: WebDriver): Promise<number> {
	let durationJSArr: number[] = (await driver.executeScript(
		'return [window.performance.timing.loadEventEnd, window.performance.timing.navigationStart]'
	)) as number[];
	let durationJS = (durationJSArr[0] as number) - (durationJSArr[1] as number);

	let entriesBrowser = await driver
		.manage()
		.logs()
		.get(logging.Type.BROWSER);
	if (config.LOG_DEBUG) {
		console.log('browser entries', entriesBrowser);
	}
	let filteredEvents = await fetchEventsFromPerformanceLog(driver);

	if (config.LOG_DEBUG) {
		console.log('filteredEvents ', filteredEvents);
	}

	let eventsDuringBenchmark = R.pipe(
		R.dropWhile(type_neq('runBenchmark')),
		R.takeWhile(type_neq('finishedBenchmark'))
	)(filteredEvents);

	if (config.LOG_DEBUG) {
		console.log('eventsDuringBenchmark ', eventsDuringBenchmark);
	}

	let navigationStarts = R.filter(type_eq('navigationStart'))(eventsDuringBenchmark);
	if (navigationStarts.length !== 1) {
		console.log('exactly one navigationStart event is expected', eventsDuringBenchmark);
		throw 'exactly one navigationStart event is expected';
	}

	let eventsAfterNavigationStart = R.dropWhile(type_neq('navigationStart'))(eventsDuringBenchmark);

	if (config.LOG_DEBUG) {
		console.log('eventsAfterNavigationStart', eventsAfterNavigationStart);
	}

	let paints = R.filter(type_eq('paint'))(eventsAfterNavigationStart);
	if (paints.length === 0) {
		console.log('at least one paint event is expected after the navigationStart event', eventsAfterNavigationStart);
		throw 'at least one paint event is expected after the navigationStart event';
	}
	let lastPaint: any = R.last(paints);

	let upperBoundForSoundnessCheck = (lastPaint.end - eventsDuringBenchmark[0].ts) / 1000.0;
	let duration = (lastPaint.end - navigationStarts[0].ts) / 1000.0;

	console.log('*** duration', duration, 'upper bound ', upperBoundForSoundnessCheck, 'durationJS', durationJS);

	if (duration < 0) {
		console.log('soundness check failed. reported duration is less 0', asString(eventsDuringBenchmark));
		throw 'soundness check failed. reported duration is less 0';
	}

	if (duration > upperBoundForSoundnessCheck) {
		console.log(
			'soundness check failed. reported duration is bigger than whole benchmark duration',
			asString(eventsDuringBenchmark)
		);
		throw 'soundness check failed. reported duration is bigger than whole benchmark duration';
	}

	if (Math.abs(duration - durationJS) > 5) {
		console.log(
			'WARN: soundness check failed. reported duration is much bigger than JS comparison',
			asString(eventsDuringBenchmark)
		);
	}
	return durationJS;
}

function buildDriver() {
	let logPref = new logging.Preferences();
	logPref.setLevel(logging.Type.PERFORMANCE, logging.Level.ALL);
	logPref.setLevel(logging.Type.BROWSER, logging.Level.ALL);

	let options = new chrome.Options();

	if (config.HEADLESS) {
		options = options.addArguments('--headless');
	}

	options = options.addArguments('--no-sandbox');
	options = options.addArguments('--js-flags=--expose-gc');
	options = options.addArguments('--disable-infobars');
	options = options.addArguments('--disable-background-networking');
	options = options.addArguments('--disable-cache');
	options = options.addArguments('--disable-extensions');
	options = options.addArguments('--window-size=1200,800');
	options = options.setLoggingPrefs(logPref);
	options = options.setPerfLoggingPrefs({
		enableNetwork: false,
		enablePage: false,
		// enableTimeline: false, // This throws an error
		traceCategories: 'devtools.timeline, disabled-by-default-devtools.timeline,blink.user_timing'
	} as any);
	return new Builder()
		.forBrowser('chrome')
		.setChromeOptions(options)
		.build();
}

async function forceGC(framework: FrameworkData, driver: WebDriver): Promise<any> {
	for (let i = 0; i < 5; i++) {
		await driver.executeScript('window.gc();');
	}
}

async function runBenchmark(driver: WebDriver, benchmark: Benchmark, framework: FrameworkData): Promise<any> {
	await benchmark.run(driver, framework);
	if (config.LOG_PROGRESS) {
		console.log('after run ', benchmark.id, benchmark.type, framework.name);
	}
	if (benchmark.type === BenchmarkType.MEM) {
		await forceGC(framework, driver);
	}
}

async function afterBenchmark(driver: WebDriver, benchmark: Benchmark, framework: FrameworkData): Promise<any> {
	if (benchmark.after) {
		await benchmark.after(driver, framework);
		if (config.LOG_PROGRESS) {
			console.log('after benchmark ', benchmark.id, benchmark.type, framework.name);
		}
	}
}

async function initBenchmark(driver: WebDriver, benchmark: Benchmark, framework: FrameworkData): Promise<any> {
	await benchmark.init(driver, framework);
	if (config.LOG_PROGRESS) {
		console.log('after initialized ', benchmark.id, benchmark.type, framework.name);
	}
	if (benchmark.type === BenchmarkType.MEM) {
		await forceGC(framework, driver);
	}
}

interface Result {
	framework: FrameworkData;
	results: number[];
	benchmark: Benchmark;
}

function writeResult(res: Result, dir: string) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
	let benchmark = res.benchmark;
	let framework = res.framework.name;
	let data = res.results;
	data = data.slice(0).sort((a: number, b: number) => a - b);
	// data = data.slice(0, config.REPEAT_RUN - config.DROP_WORST_RUN);
	let s = jStat(data);
	console.log(
		`result ${fileName(
			res.framework,
			benchmark
		)} min ${s.min()} max ${s.max()} mean ${s.mean()} median ${s.median()} stddev ${s.stdev()}`
	);
	let result: JSONResult = {
		framework: framework,
		benchmark: benchmark.id,
		type: benchmark.type === BenchmarkType.CPU ? 'cpu' : 'memory',
		min: s.min(),
		max: s.max(),
		mean: s.mean(),
		median: s.median(),
		geometricMean: s.geomean(),
		standardDeviation: s.stdev(),
		values: res.results
	};
	fs.writeFileSync(`${dir}/${fileName(res.framework, benchmark)}`, JSON.stringify(result), { encoding: 'utf8' });
}

async function takeScreenshotOnError(driver: WebDriver, fileName: string, error: string, dir: string) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
	console.error('Benchmark failed', error);
	let image = await driver.takeScreenshot();
	console.error(`Writing screenshot ${fileName}`);
	fs.writeFileSync(`${dir}/${fileName}`, image, { encoding: 'base64' });
}

async function runMemOrCPUBenchmark(framework: FrameworkData, benchmark: Benchmark, dir: string) {
	console.log('benchmarking ', framework, benchmark.id);
	let driver = buildDriver();
	try {
		for (let i = 0; i < config.REPEAT_RUN; i++) {
			try {
				setUseShadowRoot(framework.useShadowRoot);
				await driver.get(`http://localhost:8080/${framework.uri}/`);
				await driver.executeScript("console.timeStamp('initBenchmark')");
				await initBenchmark(driver, benchmark, framework);
				await driver.executeScript("console.timeStamp('runBenchmark')");
				await runBenchmark(driver, benchmark, framework);
				await driver.executeScript("console.timeStamp('finishedBenchmark')");
				await afterBenchmark(driver, benchmark, framework);
				await driver.executeScript("console.timeStamp('afterBenchmark')");
			} catch (e) {
				await takeScreenshotOnError(driver, 'error-' + framework.name + '-' + benchmark.id + '.png', e, dir);
				throw e;
			}
		}
		let results =
			benchmark.type === BenchmarkType.CPU ? await computeResultsCPU(driver) : await computeResultsMEM(driver);
		await writeResult({ framework: framework, results: results, benchmark: benchmark }, dir);
		console.log('QUIT');
		await driver.quit();
	} catch (e) {
		console.log('ERROR:', e);
		console.log('QUIT');
		await driver.quit();
		if (config.EXIT_ON_ERROR) {
			throw 'Benchmarking failed';
		}
	}
}

async function runStartupBenchmark(framework: FrameworkData, benchmark: Benchmark, dir: string) {
	console.log('benchmarking startup', framework, benchmark.id);
	let results: number[] = [];

	try {
		for (let i = 0; i < config.REPEAT_RUN; i++) {
			let driver = buildDriver();
			try {
				setUseShadowRoot(framework.useShadowRoot);
				await driver.executeScript("console.timeStamp('initBenchmark')");
				await initBenchmark(driver, benchmark, framework);
				await driver.executeScript("console.timeStamp('runBenchmark')");
				await runBenchmark(driver, benchmark, framework);
				await driver.executeScript("console.timeStamp('finishedBenchmark')");
				await afterBenchmark(driver, benchmark, framework);
				await driver.executeScript("console.timeStamp('afterBenchmark')");
				results.push(await computeResultsStartup(driver));
			} catch (e) {
				await takeScreenshotOnError(driver, 'error-' + framework.name + '-' + benchmark.id + '.png', e, dir);
				throw e;
			} finally {
				await driver.quit();
			}
		}
		await writeResult({ framework: framework, results: results, benchmark: benchmark }, dir);
	} catch (e) {
		console.log('ERROR:', e);
		console.log('QUIT');
		if (config.EXIT_ON_ERROR) {
			throw 'Benchmarking failed';
		}
	}
}

export async function runBench(frameworkNames: string[], benchmarkNames: string[], dir: string, args: any) {
	if (args.count !== undefined) {
		config.REPEAT_RUN = args.count;
	}

	if (args.headless !== undefined) {
		config.HEADLESS = args.headless;
	}

	let runFrameworks = frameworks.filter((f) => frameworkNames.some((name) => f.name.indexOf(name) > -1));
	let runBenchmarks = benchmarks.filter((b) => benchmarkNames.some((name) => b.id.toLowerCase().indexOf(name) > -1));
	console.log('Frameworks that will be benchmarked', runFrameworks);
	console.log('Benchmarks that will be run', runBenchmarks.map((b) => b.id));

	let data: [[FrameworkData, Benchmark]] = [] as any;
	for (let i = 0; i < runFrameworks.length; i++) {
		for (let j = 0; j < runBenchmarks.length; j++) {
			data.push([runFrameworks[i], runBenchmarks[j]]);
		}
	}

	for (let i = 0; i < data.length; i++) {
		let framework = data[i][0];
		let benchmark = data[i][1];
		if (benchmark.type === BenchmarkType.STARTUP) {
			await runStartupBenchmark(framework, benchmark, dir);
		} else {
			await runMemOrCPUBenchmark(framework, benchmark, dir);
		}
	}
}
