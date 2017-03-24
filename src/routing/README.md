# @dojo/routing

[![Build Status](https://travis-ci.org/dojo/routing.svg?branch=master)](https://travis-ci.org/dojo/routing)
[![codecov.io](https://codecov.io/github/dojo/routing/coverage.svg?branch=master)](https://codecov.io/github/dojo/routing?branch=master)
[![npm version](https://badge.fury.io/js/%40dojo%2Frouting.svg)](https://badge.fury.io/js/%40dojo%2Frouting)

A routing library for Dojo 2 applications.

**WARNING** This is _beta_ software. While we do not anticipate significant changes to the API at this stage, we may feel the need to do so. This is not yet production ready, so you should use at your own risk.

This routing library lets you construct route hierarchies that are matched against URLs. Each selected route can tell the application to materialize a different set of widgets and influence the state of those widgets.

History managers are included. The recommended manager uses `pushState()` and `replaceState()` to [add or modify history entries](https://developer.mozilla.org/en-US/docs/Web/API/History_API#Adding_and_modifying_history_entries). This requires server-side support to work well. The hash-based manager uses the fragment identifier, so can work for static HTML pages. A memory-backed manager is provided for debugging purposes.

 - [Features](#features)
   - [Creating a router](#creating-a-router)
   - [Appending routes](#appending-routes)
   - [Dispatching paths](#dispatching-paths)
   - [Creating routes](#creating-routes)
   - [Route hierarchies](#route-hierarchies)
     - [Index routes](#index-routes)
   - [Named parameters](#named-parameters)
     - [Extract pathname segments](#extract-pathname-segments)
     - [Extract query parameters](#extract-query-parameters)
   - [Preventing routes from being selected](#preventing-routes-from-being-selected)
   - [Fallback routes](#fallback-routes)
   - [Preventing dispatches altogether](#preventing-dispatches-altogether)
   - [Selecting routes even if trailing slashes don't match](#selecting-routes-even-if-trailing-slashes-dont-match)
   - [Repeated slashes](#repeated-slashes)
   - [Link generation](#link-generation)
   - [History management](#history-management)
     - [Using `pushState()` and friends](#using-pushstate-and-friends)
       - [Specifying a base pathname](#specifying-a-base-pathname)
     - [Fragment identifiers](#fragment-identifiers)
     - [Memory-only](#memory-only)
   - [Making the router aware of the history manager](#making-the-router-aware-of-the-history-manager)
     - [Automatic routing and clever linking through `start()`](#automatic-routing-and-clever-linking-through-start)
   - [Capturing errors](#capturing-errors)

## Usage

To use `@dojo/routing`, install the package along with its required peer dependencies:

```bash
npm install @dojo/routing

# peer dependencies
npm install @dojo/core
npm install @dojo/has
npm install @dojo/shim
```

## Features

The examples below are provided in TypeScript syntax. The package does work under JavaScript, but for clarity, the examples will only include one syntax.

### Creating a router

```ts
import Router from '@dojo/routing/Router';

const router = new Router();
```

### Appending routes

With the `router` from the previous example:

```ts
import Route from '@dojo/routing/Route';

router.append(new Route({ path: '/' }));
router.append(new Route({ path: '/about' }));
```

These routes won't (yet) do anything.

You can append multiple routes at once:

```ts
router.append([
	new Route({ path: '/' }),
	new Route({ path: '/about' })
]);
```

Routes can only be appended to a router once.

### Dispatching paths

The router doesn't track navigation events by itself. Changed paths need to be dispatched by application code. Context must be provided, this is made available to the matched routes.

```ts
import { Context } from '@dojo/routing/interfaces';

interface AppContext extends Context {
	someKey: string;
}

const context: AppContext = {
	someKey: 'someValue'
};

router.dispatch(context, '/about');
```

Route selection starts in a future turn. An async Task is returned (see [`@dojo/core`](https://github.com/dojo/core)) which is resolved with a result object. The object has a `success` property which is `false` if no route was selected, or dispatch was canceled. It's `true` otherwise.

An optional `redirect` property may be present, in case one of the matched routes requested a redirect. The value of the `redirect` property is the new path. It may be an empty string. No routes are executed when a redirect is returned, instead you're expected to change the path and call `dispatch()` again.

You can cancel the task in case a new navigation event occurs.

### Creating routes

The following creates a simple route. The `exec()` function is called when the route is executed.

```ts
import Route from '@dojo/routing/Route';

const route = new Route({
	path: '/',
	exec (request) {
		// Do stuff
	}
});
```

Note that `path` defaults to `/`, so the above is equivalent to:

```ts
const route = new Route({
	exec (request) {
		// Do stuff
	}
});
```

The context provided in the `router.dispatch()` call is available as `request.context`:

```ts
const route = new Route({
	exec (request) {
		const context: AppContext = request.context;
		// Do stuff
	}
});
```

You may return a thenable in order to [capture errors](#capturing-errors). Route dispatch does not wait for the thenable to resolve.

### Route hierarchies

Routes can be appended to other routes:

```ts
import Route from '@dojo/routing/Route';

const posts = new Route({
	path: '/posts',
	exec (request) {
		// Do stuff
	}
});

const create = new Route({
	path: 'new',
	exec (request) {
		// Do stuff
	}
});

posts.append(create);

router.append(posts);
```

In this example the `posts` route is executed for both `/posts` and `/posts/new` paths. The `create` route is only executed for the `/posts/new` path.

Like `Router#append()` you can append multiple routes at once by passing an array:

```ts
posts.append([
	create,
	new Route({ path: 'other' })
]);
```

Routes can only be appended to another route, or a router, once.

Starting the path of a nested route with a leading slash will not make it absolute. The nested route's path will still be relative to that of the route it's appended to.

#### Index routes

The `posts` route in the above example is executed for both `/posts` and `/posts/new` paths. You can handle `/posts` paths specifically by specifying an `index` method:

```ts
const posts = new Route({
	path: '/posts',
	exec (request) {
		// Do stuff for /posts/new
	},
	index (request) {
		// Do stuff for /posts
	}
});
```

You may return a thenable in order to [capture errors](#capturing-errors). Route dispatch does not wait for the thenable to resolve.

### Named parameters

#### Extract pathname segments

You can extract pathname segments. These will be added to the `params` object of the `request`:

```ts
import new Route from '@dojo/routing/Route';
import { DefaultParameters } from '@dojo/routing/interfaces';

new Route({
	path: '/posts/{id}',
	exec (request) {
		const params: DefaultParameters = request.params;
		const id = params['id'];
		// Do stuff with the id
	}
});
```

Parameter names must not be repeated in the route's path. They can't contain `{`, `&` or `:` characters. Only entire segments can be matched.

You can customize the `params` object:

```ts
import Route from '@dojo/routing/Route';
import { Parameters } from '@dojo/routing/interfaces';

interface MyParams extends Parameters {
	id: number;
}

const route = new Route<MyParams>({
	path: '/posts/{id}',
	params ([id]) {
		return {
			id: parseInt(id)
		};
	},
	exec (request) {
		const { id } = request.params;
		// Do stuff with the id
	}
});
```

The `params()` function receives an array with string values for the extracted parameters, in declaration order.

You can prevent the route from being selected by returning `null` from the `params()` function:

```ts
const route = new Route<MyParams>({
	path: '/posts/{id}',
	params ([id]) {
		if (!/^\d+$/.test(id)) {
			return null;
		}

		return {
			id: parseInt(id)
		};
	},
	exec (request) {
		const { id } = request.params;
		// Do stuff with the id
	}
});
```

This also prevents any nested routes from being selected.

#### Extract query parameters

Each route's path may include a search component. Name parameters to extract them into the `params` object:

```ts
import Route from '@dojo/routing/Route';
import { DefaultParameters } from '@dojo/routing/interfaces';

new Route({
	path: '/posts/{id}?{comment}',
	exec (request) {
		const params: DefaultParameters = request.params;
		const comment = params['comment'];
		// Do stuff with the comment
	}
});
```

Again, parameter names must not be repeated in the route's path, and can't contain `{`, `&` or `:` characters.

Named query parameters do not have to be present in a path for the route to be selected. Only the specified parameters are available in the `params` object. Each route in a hierarchy can extract parameters.

You cannot specify expected values or other non-named parameters:

```ts
new Route({
	path: '/posts/{id}?{comment}=yes' // Illegal!
});

new Route({
	path: '/posts/{id}?{comment}&foo=bar' // Illegal!
});
```

You can extract multiple parameters though:

```ts
new Route({
	path: '/posts/{id}?{comment}&{foo}'
});
```

By default the `params` object will contain the *first* occurrence of each query parameter. However if you specify a `params()` function you'll get access to *all* values:

```ts
import Route from '@dojo/routing/Route';
import { Parameters } from '@dojo/routing/interfaces';

interface MyParams extends Parameters {
	id: number;
	comments: number[];
}

const route = new Route<MyParams>({
	path: '/posts/{id}?{comments}',
	params ([id], searchParams) {
		let comments: number[] = [];
		if (searchParams.has('comments')) {
			comments = searchParams.getAll('comments').map(c => parseInt(c));
		}

		return {
			id: parseInt(id),
			comments
		};
	},
	exec (request) {
		const { comments } = request.params;
		// Do stuff with the comments
	}
});
```

`searchParams` is a `UrlSearchParams` instance from [`@dojo/core`](https://github.com/dojo/core).

### Preventing routes from being selected

You already know you can return `null` from a `params()` function to stop that route (and any nested routes) from being selected.

You can use a `guard()` function to decide whether a particular route (and any nested routes) should be selected. It receives the same `request` object as `exec()` functions:

```ts
new Route({
	path: '/posts',
	guard (request) {
		return false; // Don't select this route
	}
});
```

`guard()` functions must return a boolean. Use them if you can synchronously determine whether a route should be selected.

### Fallback routes

Sometimes paths are dispatched that don't match any routes. You can specify a `fallback()` function at the router level:

```ts
const router = new Route({
	fallback (request) {
		// Trigger a "not found" UI state here
	}
});
```

The `request` object will have a context, but no extracted parameters.

You can also use `fallback()` functions in a route hierarchy. The `fallback()` of the deepest route that matched the path will be called:

```ts
const posts = new Route({
	path: '/posts',
	exec () {
		// Do something
	}
});

const byId = new Route({
	path: '{id}',
	exec () {
		// Do something
	},
	fallback () {
		// Do something else
	}
});

const edit = new Route({
	path: 'edit',
	exec () {
		// Do something
	}
});

byId.append(edit);
posts.append(byId);
```

No route will match `/posts/5/stats`, however there is a fallback for the `byId` route. The router will call `exec()` on the `posts` route and `fallback()` on the `byId` route.

You may return a thenable in order to [capture errors](#capturing-errors). Route dispatch does not wait for the thenable to resolve.

### Preventing dispatches altogether

You may want to prevent new routes from executing until the user has completed a certain task. You can listen to the `navstart` event emitted by the router to cancel or defer dispatches:

```ts
const router = new Router();

router.on('navstart', event => {
	// Determine whether to cancel the dispatch
});
```

Use `event.path` to inspect the dispatched path. This is a regular string, so without any extracted parameters.

Use `event.cancel()` to cancel the dispatch outright. You need to invoke this method synchronously when the event listener is called.

Use `event.defer()` to defer the dispatch. This returns an object with `resume()` and `cancel()` functions. Dispatching will halt until you resume it using `resume()`, or cancel it using `cancel()`. This may be done asynchronously.

A dispatch may be deferred multiple times. All deferrers need to call `resume()` for the dispatch to continue.

Note that if you cancel the dispatch the URL displayed in the browser will still be for the new path!

### Selecting routes even if trailing slashes don't match

If the dispatched path ends with a `/`, a  route hierarchy can only be selected if its deepest route's path also ends with a `/`. Similarly, if the dispatched path does *not* end with a `/`, the deepest route's path also must not end with a `/`.

This behavior can be disabled on a per-route basis by setting the `trailingSlashMustMatch` option to `false`:

```ts
const posts = new Route({
	path: '/posts'
});
consts byId = new Route({
	path: '{id}',
	trailingSlashMustMatch: false
});

posts.append(byId);

const router = new Router();
router.append(posts);
```

Now the `posts` and `byId` routes will be selected both for `/posts/5` and `/posts/5/`.

Note that it's irrelevant whether any intermediate routes' paths end with a `/`.

### Repeated slashes

You cannot create routes with repeated slashes:

```ts
new Route({
	path: '/foo//bar'
}); // Throws!
```

However repeated slashes are ignored when dispatching:

```ts
const router = new Router();
router.append(new Route({
	path: '/foo/bar'
}));

router.dispatch(context, '//foo///bar'); // Selects the /foo/bar route
```

### Link generation

The router can generate links for a given route:

```ts
const router = new Router();
const blog = new Route({ path: '/blog' });
router.append(blog);

router.link(blog) === '/blog';
```

This also works with parameters:

```ts
const show = new Route({ path: '/{id}' });
blog.append(show);

router.link(show, { id: '5' }) === '/blog/5';
```

And query parameters:

```ts
const show = new Route({ path: '/{id}?{highlight}' });
blog.append(show);

router.link(show, { id: '5', highlight: '40' }) === '/blog/5?highlight=40';
router.link(show, { id: '5', highlight: [ '40' ] }) === '/blog/5?highlight=40';
router.link(show, { id: '5', highlight: [ '40', '55' ] }) === '/blog/5?highlight=40&highlight=55';
```

Note that if routes share the same parameter name they'll receive the same value:

```ts
const category = new Route({ path: '/categories/{id}' });
const post = new Route({ path: '/posts/{id}' });
blog.append(category);
category.append(post);

router.link(post, { id: '5' }) === '/blog/categories/5/posts/5';
```

You can also generate links without having a reference to the router:

```ts
const router = new Router();
const blog = new Route({ path: '/blog' });
const show = new Route({ path: '/{id}' });
blog.append(show);

show.link({ id: '5' }) === '/blog/5';
```

### History management

This library ships with three history managers. They share the same interface but have different ways of monitoring and changing the navigation state.

#### Using `pushState()` and friends

The recommended manager uses `pushState()` and `replaceState()` to [add or modify history entries](https://developer.mozilla.org/en-US/docs/Web/API/History_API#Adding_and_modifying_history_entries). This requires server-side support to work well:

```ts
import StateHistory from '@dojo/routing/history/StateHistory';

const history = new StateHistory();
```

This assumes the global object is a browser `window` object. It'll access `window.location` and `window.history`, as well as add an event listener for the `popstate` event.

You can provide an explicit `window` object:

```ts
const history = new StateHistory({ window: myWindowObject });
```

This is mostly useful for testing purposes.

Use `history.current` to get the current path. It's initialized to the browser's location when the history object was created. It always starts with a `/`, regardless of the path string passed to the `history.set()` and `history.replace()` methods.

Call `history.set()` with a path string to set a new path. This will use `window.history.pushState()` to change the URL shown in the browser.

`history.replace()` works like `history.set()`, but uses `window.history.replaceState()` instead.

The `change` event is emitted when history is set or replaced, or when `popstate` is emitted on the `window` object. The `value` property of the event object contains the new path:

```ts
history.on('change', event => {
	console.log(event.value);
});
```

Applications should call `Router#dispatch()` with this value as the path.

##### Specifying a base pathname

A base pathname can be provided when creating the history manager:

```ts
const history = new StateHistory({ base: '/myapp' });
```

In this example, if the browser's location is `/myapp/index`, the path available at `history.current` and the `change` event value will be `/index`. When calling `history.set()` and `history.replace()` with say `/settings`, the browser's location will be changed to `/myapp/settings`.

You may specify the base with or without a trailing slash.

#### Fragment identifiers

The hash-based manager uses the fragment identifier to store navigation state. This makes it a better fit for applications that are served as a static HTML file:

```ts
import HashHistory from '@dojo/routing/history/HashHistory';

const history = new HashHistory();
```

The `history` object has the same `current` getter and `set()` and `replace()` methods. The `HashHistory` class assumes the global object is a browser `window` object, but an explicit object can be provided. It'll access `window.history` and add an event listener for the `hashchange` event.

Path strings are stored in the fragment identifier. `history.current` returns the current path, without a `#` prefix. The same goes for the `value` property of the `change` event object.

#### Memory-only

Finally there is a memory-backed manager. This isn't very useful in browsers but can be helpful when writing tests.:

```ts
import MemoryHistory from '@dojo/routing/history/MemoryHistory';

const history = new MemoryHistory();
```

The `MemoryHistory` class accepts a `path` option. It defaults to the empty string.

### Making the router aware of the history manager

In browser-based applications it is desirable for the router to be aware of the history manager. This is why you can provide the history manager when creating the router:

```ts
const history = new StateHistory();
const router = new Router({ history });
```

Now instead of using `history.set()` and `history.replace()` you can use `router.setPath()` and `router.replacePath()`.

#### Automatic routing and clever linking through `start()`

You could manually wire a history manager's `change` event to a `Router#dispatch()`, but that's a bit cumbersome. Instead if you provided the history manager when creating the router, you can use the `start()` method to make the router observe the history manager:

```ts
const router = new Router({ history: new StateHistory() });
router.start();
```

By default `start()` dispatches for the current history value. You can disable this:

```ts
router.start({ dispatchCurrent: false });
```

As an added benefit, when you use `start()` it ensures the previous dispatch is canceled when the history changes and it dispatches a new request.

`start()` also ensures history is replaced with the new path when routes request a redirect.

The context for these dispatches defaults to an empty object. A new object is used for every dispatch. You can configure the context when creating the router:

```ts
const router = new Router({
	context: { someKey: 'someValue' },
	history: new StateHistory()
});
```

Provide a function if you want a new context for every dispatch:

```ts
const router = new Router({
	context() {
		return { someKey: 'someValue' };
	},
	history: new StateHistory()
});
```

`link()` can use the currently selected routes when generating a new link. For instance given this router:

```ts
const history = new StateHistory();
const router = new Router({ history });

const blog = new Route({ path: '/blog' });
const show = new Route({ path: '/{id}' });
const edit = new Route({ path: '/edit' });

router.append(blog);
blog.append(show);
show.append(edit);
```

If the current URL is `/blog/5`, then you can generate a link for the `edit` route without having to provide any parameters:

```ts
router.link(edit) === '/blog/5/edit';
```

Calling `dispatch()` directly will prevent the router from tracking selected routes. They'll also be unavailable after a redirect has been requested, before new routes have been selected.

### Capturing errors

Errors that occur during dispatch are emitted under the `error` event. The event object contains the error as well as the context and path used for the dispatch.

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

### Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project run `grunt dev` or `grunt dist`.

### Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

To test against browsers with a local selenium server run:

`grunt test:local`

To test against BrowserStack or Sauce Labs run:

`grunt test:browserstack`

or

`grunt test:saucelabs`

## Licensing information

© 2004–2017 [JS Foundation](https://js.foundation/) & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
