import * as express from 'express';
import * as multer from 'multer';
import * as path from 'path';

intern.registerPlugin('echo-service', () => {
	intern.on('serverStart', (server) => {
		const app: express.Express = (<any>server)._app;
		const echo = express();
		const upload = multer();

		echo.use((request, _, next) => {
			if (request.query.delay) {
				setTimeout(() => next(), Number(request.query.delay));
				return;
			}
			next();
		});

		echo.post('/post', upload.any());

		echo.use((request, response, next) => {
			const responseType: string | undefined = request.query.responseType;
			if (!responseType || responseType.localeCompare('json') === 0) {
				response
					.status(200)
					.type('json')
					.send({
						method: request.method,
						query: request.query,
						headers: request.headers,
						payload: request.files || request.body
					});
			} else {
				if (responseType.localeCompare('xml') === 0) {
					response.sendFile(path.resolve(__dirname, '..', 'support', 'data', 'foo.xml'));
					return;
				}
				next();
			}
		}, express.static(path.resolve(__dirname, '..', 'support', 'data'), { fallthrough: false }));

		// A hack until Intern allows custom middleware
		const stack: any[] = (<any>app)._router.stack;
		const layers = stack.splice(stack.length - 3);

		app.use('/__echo', echo);

		stack.push(...layers);
	});
});
