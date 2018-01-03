const benchmarkResultsPath = process.cwd() + '/benchmark-results';

const files = [
	'01_run1k.json',
	'02_replace1k.json',
	'03_update10th1k.json',
	'04_select1k.json',
	'05_swap1k.json',
	'06_remove-one-1k.json',
	'07_create10k.json',
	'08_create1k-after10k.json',
	'09_clear10k.json',
	'21_ready-memory.json',
	'22_run-memory.json',
	'23_update5-memory.json',
	'24_run5-memory.json',
	'25_run-clear-memory.json',
	'30_startup.json'
];

const results = files.map((file) => {
	const vanillaResult = require(`${benchmarkResultsPath}/vanillajs-non-keyed_${file}`);
	const dojoResult = require(`${benchmarkResultsPath}/dojo2-v0.2.0-non-keyed_${file}`);

	return {
		vanillaResult,
		dojoResult
	};
});

console.dir(results, { colors: true });

results.forEach(({ vanillaResult, dojoResult }) => {
	const percentSlower = (dojoResult.median - vanillaResult.median) / vanillaResult.median * 100;
	console.log(
		`${vanillaResult.benchmark} - vanilla: ${vanillaResult.median}. dojo: ${dojoResult.median} (${Math.round(
			percentSlower
		)}% slower)`
	);
});
