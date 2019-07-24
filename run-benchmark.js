const { exec } = require('child_process');
const rimraf = require('rimraf');
const { runBench } = require('./dist/dev/tests/core/benchmark/runner/src/benchmarkRunner.js');
const {
	processBenchmarkResults
} = require('./dist/dev/tests/core/benchmark/runner/process-benchmark-results.js');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const port = 8080;

// Run a local webserver to serve our applications
const server = http
	.createServer(function(req, res) {
		// parse URL
		const parsedUrl = url.parse(req.url);
		// extract URL path
		let pathname = `.${parsedUrl.pathname}`;
		// based on the URL path, extract the file extention. e.g. .js, .doc, ...
		const ext = path.parse(pathname).ext || '.html';

		// maps file extention to MIME typere
		const map = {
			'.ico': 'image/x-icon',
			'.html': 'text/html',
			'.js': 'text/javascript',
			'.json': 'application/json',
			'.css': 'text/css',
			'.png': 'image/png',
			'.jpg': 'image/jpeg',
			'.wav': 'audio/wav',
			'.mp3': 'audio/mpeg',
			'.svg': 'image/svg+xml',
			'.pdf': 'application/pdf',
			'.doc': 'application/msword'
		};

		fs.exists(pathname, function(exist) {
			if (!exist) {
				// console.error("Server Error: File not found: ", pathname);
				// if the file is not found, return 404
				res.statusCode = 404;
				res.end(`File ${pathname} not found!`);
				return;
			}

			// if is a directory search for index file matching the extention
			if (fs.statSync(pathname).isDirectory()) pathname += 'index' + ext;

			// read file from file system
			fs.readFile(pathname, function(err, data) {
				if (err) {
					res.statusCode = 500;
					res.end(`Error getting the file: ${err}.`);
				} else {
					// if the file is found, set Content-type and send data
					res.setHeader('Content-type', map[ext] || 'text/plain');
					res.end(data);
				}
			});
		});
	})
	.listen(parseInt(port));

rimraf('./benchmark-results', function() {
	console.log('Old benchmark files removed');
});

const headless = process.argv[2] == 'false' ? false : true;
console.log('Running headless? ', headless, '\n');

runBench(
	['vanillajs-non-keyed', 'dojo2-v0.2.0-non-keyed'],
	[''],
	'benchmark-results', // Directory
	{ count: 3, headless: headless } // args
).then(() => {
	// Close the Dojo server
	server.close();
	processBenchmarkResults();
});
