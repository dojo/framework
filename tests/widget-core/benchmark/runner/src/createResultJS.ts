import * as fs from 'fs';
import Map from '@dojo/shim/Map';
import { frameworks, FrameworkData } from './common';
import { benchmarks, fileName } from './benchmarks';

let frameworkMap = new Map<string, FrameworkData>();
frameworks.map((f) => frameworkMap.set(f.name, f));

let resultJS = 'export let results=[';

frameworks.forEach((framework, fIdx) => {
	benchmarks.forEach((benchmark, bIdx) => {
		let name = `${fileName(framework, benchmark)}`;
		let file = './results/' + name;
		if (fs.existsSync(file)) {
			let data = fs.readFileSync(file, {
				encoding: 'utf-8'
			});
			resultJS += '\n' + data + ',';
		} else {
			console.log('MISSING FILE', file);
		}
	});
});

resultJS += '];\n';
resultJS += 'export let frameworks = ' + JSON.stringify(frameworks) + ';\n';
resultJS += 'export let benchmarks = ' + JSON.stringify(benchmarks) + ';\n';

fs.writeFileSync('../webdriver-ts-results/src/results.ts', resultJS, { encoding: 'utf-8' });
