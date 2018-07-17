# The Dojo Toolkit Style Guide

## Code Conventions

All names and comments *MUST* be written in English.

### Naming

The following naming conventions *MUST* be used:

|Construct|Convention|
|---------|----------|
|package|`lower-dash-case`|
|module exporting default class|`UpperCamelCase`|
|all other modules|`lowerCamelCase`|
|classes, interfaces, and type aliases|`UpperCamelCase`|
|enums and enum value names|`UpperCamelCase`|
|constants|`UPPER_CASE_WITH_UNDERSCORES` or `lowerCamelCase`|
|variables|`lowerCamelCase` or `_lowerCamelCase`*|
|parameters|`lowerCamelCase` or `_lowerCamelCase`*|
|public properties|`lowerCamelCase`|
|protected/private properties|`_lowerCamelCase`|

*:
  Variables and parameter names generally *SHOULD NOT* be prefixed with underscores, but this may be
  warranted in rare cases where two variables in nested scopes make sense to have the same name, while avoiding shadowing the outer variable.

The following naming conventions *SHOULD* be used:

|Variable type|Convention|
|-------------|----------|
|Deferred|`dfd`|
|Promise|`promise`|
|Identifier|`id`|
|Numeric iterator|`i`, `j`, `k`, `l`|
|String iterator (for-in)|`key`, `k`|
|Event|`event`|
|Destroyable handle|`handle`|
|Error object|`error`|
|Options arguments|`options`|
|Origin, source, from|`source`|
|Destination, target, to|`target`|
|Coordinates|`x`, `y`, `z`, `width`, `height`, `depth`|
|All others|Do not abbreviate|

1. All names *SHOULD* be as clear as necessary, *SHOULD NOT* be contracted just for
	the sake of less typing, and *MUST* avoid unclear shortenings and
	contractions (e.g. `MouseEventHandler`, not `MseEvtHdlr` or `hdl` or
	`h`).
1. Names *SHOULD* use American English (`en-us`) spelling.
1. Names representing an interface *MUST NOT* use "I" as a prefix (e.g. `Event`
	not `IEvent`).
1. Abbreviations and acronyms *SHOULD NOT* be uppercase when used as a name (e.g.
	`getXml` not `getXML`).
1. Collections *SHOULD* be named using a plural form.
1. Names representing boolean states *SHOULD* start with `is`, `has`, `can`, or
	`should`.
1. Names representing boolean states *SHOULD NOT* be negative (e.g. `isNotFoo` is
	unacceptable).
1. Names representing a count of a number of objects *SHOULD* start with `num`.
1. Names representing methods *SHOULD* be verbs or verb phrases (e.g.
	`getValue()`, not `value()`).
1. Factories or non-constructor methods that generate new objects *SHOULD* use the verb
	"create".
1. Magic numbers *MUST* either be represented using a constant or enum, or be prefixed
	with a comment representing the literal value of the number (e.g.
	`if (event.keyCode === Keys.KEY_A)` or
	`if (event.keyCode === /* "a" */ 97)`).
1. Const variables that are used as object property aliases *SHOULD* follow `lowerCamelCase` naming conventions (e.g. `const { firstName = 'firstName'} = this.properties;`)
### Variables

1. All variables which are not reassigned in the block *SHOULD* be declared with `const`:

	```ts
	// correct

	const a = 1;

	// incorrect

	var a = 1;
	let a = 1;
	```

1. All variables which are reassigned in the block *SHOULD* be declared with `let`:

	```ts
	// correct

	for (let i = 0; i < items.length; i++) {
	}

	// incorrect

	for (var i = 0; i < items.length; i++) {
	}
	```

1. All variable declarations *SHOULD* use one `const` or `let` declaration per
	variable. The exception to this rule is the initialization expression of
	a `for` statement, and object/array destructuring (e.g. for imports).
	This prevents variable declarations being lost inside long lists that may also include immediate assignments:

	```ts
	// correct

	const items = getItems();
	const length = items.length;
	let i = 0;
	let item;

	// also right

	const items = getItems();
	for (let i = 0, item; (item = items[i]); i++) {
	}

	// incorrect

	const items = getItems(), length = items.length;
	let i = 0,
		item;
	```

1. Variable declarations *SHOULD* be grouped by declaration type; `const` first, then `let`:

	```ts
	// correct

	const items = getItems();
	const length = items.length;
	let i = 0;
	let item;

	// incorrect

	const items = getItems();
	let item;
	const length = items.length;
	let i = 0;
	```

1. Variables *SHOULD* be declared where they are first assigned:

	```ts
	// correct

	render(): void {
		const items = this.getItems();

		if (!items.length) {
			return;
		}

		for (let i = 0, item; (item = items[i]); i++) {
			this.renderItem(item);
		}
	}

	// incorrect

	render(): void {
		const items = this.getItems();
		let i;
		let item;

		if (!items.length) {
			return;
		}

		for (i = 0; (item = items[i]); i++) {
			this.renderItem(item);
		}
	}
	```

1. The most appropriate data types *SHOULD* be used in all cases (e.g. boolean for
	booleans, not number).

### Coding Conventions

#### General

1. Strings *MUST* use single quotes.

1. Equality comparisons *MUST* use strict comparison operators, with the exception that
	comparisons matching null or undefined *MAY* use `== null`.

1. When type coersion is necessary, it *SHOULD* be performed using the appropriate global function (*not* constructor):

	```ts
	// correct

	let myBoolean = Boolean(something);
	let myNumber = Number(something);
	let myString = String(something);

	// incorrect

	let myBoolean = !!something;
	let myNumber = +something;
	let myString = '' + something;

	// also incorrect (and doesn't produce primitives, so don't do it!)

	let myBoolean = new Boolean(something);
	let myNumber = new Number(something);
	let myString = new String(something);
	```

1. When passing an anonymous function as an argument, arrow functions *SHOULD*
	be used. Implicit returns from arrow functions are allowed if they increase the code readability and the return
	value is not ignored:

	```ts
	// correct

	[ 1, 2, 3 ].forEach((value) => {
		 console.log(value);
	});

	const arr = [ 1, 2, 3 ].map((value) => value * 2);

	// incorrect

	[ 1, 2, 3 ].forEach((value) => console.log(value));
	```

1. When functions are not anonymous arguments to a function, arrow functions *SHOULD NOT* be used:

	```ts
	// correct

	const fn = function (): string {
		return 'foo';
	}

	// incorrect

	const fn = () => 'foo';
	```

1. `this` typing *MUST* be used if accessing `this` and *SHOULD NOT* be typed as `any`.  Use of `const self = this;`
	*SHOULD NOT* be used to scope arrow functions and *MAY* only be used when there is a need to preseve context across a
	normal `function` or IIFC.

	```ts
	// correct

	function foo(this: SomeType) {
		this.arr.forEach((item) => {
			if (this.doSomething(item)) {
				console.log(item);
			}
		});
	}

	// incorrect

	function foo(this: any) {
		this.dangerous();
	}

	function foo() {
		const self = this;
		self.arr.forEach((item) => {
			if (self.doSomething(item)) {
				console.log(item);
			}
		});
	}
	```

1. All code *SHOULD* assume it will run in *strict mode*.  ES Modules are always parsed in strict mode and TypeScript
	will automatically emit modules with the `'use strict';` prolog to help ensure that compatability.

1. `arguments.callee` *MUST NOT* be used.

1. The `debugger` statement *MUST NOT* be used.

1. The `eval` function *MUST NOT* be used.

1. The `radix` parameter of `parseInt` *MUST* be used.

1. There *MUST NOT* be unreachable code after `break`, `catch`, `throw`, and `return` statements.

1. All imports, variables, functions, and private class members *MUST* be used.

#### TypeScript

1. Avoid casts when possible.  If a type declaration can solve the problem instead, prefer that over a cast:

	```ts
	// correct

	const something: Something = {
		// ...
	};

	// incorrect

	const something = <Something> {
		// ...
	};
	```

1. Usage of `<any>` casts *SHOULD* be documented:

	```ts
	/* need to coerce to any, because of NodeJS typings */
	const req: RootRequire = <any> require;
	```

1. Variable declarations *SHOULD NOT* include an explicit type declaration if it can be easily and safely inferred on the
	same line.

	```ts
	// correct

	const count = 0;
	const message = '';

	// incorrect

	const count: number = 0;
	const message: string = '';
	```

1. Declarations for exported functions and public class methods *SHOULD* include an explicit return type declaration for clarity.

	```ts
	// correct

	export function foo(arg1: number, arg2: string): boolean {
		// ...
		return true;
	}

	// incorrect

	export function foo(arg1: number, arg2: string) {
		// ...
		return true;
	}
	```

1. Constructor parameters *MUST NOT* use `public` and `private` modifiers.

1. Parameter flags `noImplicitAny`, `noImplicitThis` and `strictNullChecks` must be enabled.

### Ordering

1. Class properties *SHOULD* be ordered alphabetically, case-insensitively,
	ignoring leading underscores, in the following order:
	* private fields (properties)
	* private methods
	* static fields (properties)
	* static methods
	* constructor
	* protected fields (properties)
	* protected methods
	* public fields (properties)
	* public methods

1. Interface properties *SHOULD* be ordered alphabetically, case-insensitively,
	ignoring leading underscores, in the following order:
	* constructor
	* function call
	* index signature
	* properties (private, protected, then public)
	* methods (private, protected, then public)

1. Module exports *SHOULD* be ordered alphabetically, case-insensitively, by identifier.

1. Module imports *SHOULD* be ordered alphabetically *by module ID*, starting with the package name.
	Module imports from the current package *SHOULD* come last.
	Module imports *SHOULD NOT* be ordered by variable name, due to potential confusion when destructuring is involved.

1. Functions *SHOULD* be declared before their use. The exceptions to this rule
	are functions exported from a module and methods of a class:

	```ts
	// correct

	function getItems(): Item[] {
		// ...
	}

	const items = getItems();

	// also correct

	export function one(): void {
		two();
	}

	export function two(): void {
		// ...
	}

	// incorrect

	const items = getItems();

	function getItems(): Item[] {
		// ...
	}
	```

### Inline Documentation

1. Comments documenting code entities *SHOULD* be written in JSDoc format.
	Type information *SHOULD NOT* be included, since it *should* be possible to pick up from function signatures.

	Example:

	```ts
	/**
	 * Produces something useful and/or interesting.
	 *
	 * @param foo Indicates how useful something *should* be.
	 * @param bar Indicates how interesting something *should* be.
	 * @template T Some sort
	 * @return Something useful and/or interesting.
	 */
	export function doSomethingInteresting<T>(foo: string, bar: T): SomethingInteresting {

	}
	```

	*Note:* That typescript services used to have a formatting issue when there was not a clear line break between
	the code block and additional parameters list.  This has been resolved, though it is preferred to have a break
	between the comment block and the first `@param`.

1. All exports and members of exported interfaces and classes *SHOULD* have a JSDoc code block documenting the
	function, class, method, type, variable, constant, or property.  Internal methods *MAY* also include JSDoc
	code blocks.

1. JSDoc blocks *SHOULD* use markdown syntax for providing formatting:

	```ts
	/**
	 * Blocks *SHOULD* use additional `markdown` syntax to make intellisense more expressive.
	 */
	```

1. The following block tags *SHOULD* be used as appropriate:

	|Block Tag|Notes|
	|---------|-----|
	|`@param`|Denotes an argument for a method or function.|
	|`@return`|A description of the return value.|
	|`@template`|A description of a generic slot.|

### Comments

1. Comments *SHOULD* be used to explain *why* something needs to be written, *not* what it does.
	If a "what" comment seems necessary, consider rewriting the code to be clearer instead.
	Comments summarizing entire blocks of code are permissible.

1. Comments indicating areas to revisit *SHOULD* start with `TODO` or `FIXME` to make them easy to find.
	Ideally, such comments *should* only ever appear in personal/feature branches,
	but may be merged at maintainers' discretion.

1. Single line comments *MUST* begin with a space, i.e., `// comment` and not `//comment`.

### Whitespace and Formatting

#### Files

1. Files *MUST* use hard tabs for indentation.
	Spaces MAY be used for alignment (under the assumption that hard tabs align to 4 spaces).

1. Files *MUST* end with a single newline character.

1. Files *MUST NOT* have more than one consecutive blank line.

1. Lines *SHOULD NOT* exceed 120 characters in length.

1. Lines *MUST NOT* contain trailing whitespace.

#### Semicolons

1. Semicolons *MUST* be used.

1. Semicolons *SHOULD NOT* be preceded by a space.

1. Semicolons in `for` statements *MUST* be followed by a space.

#### Commas

1. Commas *SHOULD* be followed by a space or newline, and *MUST NOT* be preceded by a space.

1. Commas *SHOULD NOT* appear at the beginning of lines (i.e. no leading commas).

1. All other binary/ternary operators *SHOULD* be surrounded by a space on both sides,
	unless immediately followed by a newline, in which case the operator *SHOULD* *precede* the newline (except for `.`).

#### Colons

1. Colons in type definitions *MUST* be followed by a space or newline, and
	*MUST NOT* be preceded by a space.

1. Colons in object definitions *SHOULD* be followed by a space, and *MUST NOT* be preceded by a space.

1. Colons in `case` clauses *SHOULD* be followed by a newline, and *MUST NOT* be preceded by a space.
	The body of each `case` clause *SHOULD* be indented one level deeper than the `case` clause, and *SHOULD* conclude with
	the `break` keyword or a `// fall through` comment.

#### Braces, Brackets, and Parentheses

1. Parentheses immediately preceding a block expression (e.g. `if`, `for`, `catch`)
	*MUST* be surrounded by a space on each side:

	```ts
	// correct

	if (foo) {
	}

	// incorrect

	if(foo){
	}
	```

1. The opening brace of a code block *MUST* be written on the same line as its
	statement, preceded by a space:

	```ts
	// correct

	if (foo) {

	}

	// incorrect

	if (foo)
	{

	}

	if(foo){

	}
	```

1. All `if`, `for`, `do`, `while` keywords *MUST* have opening and closing brackets.

1. The opening and closing brackets on objects and arrays *SHOULD* be surrounded by
	whitespace on the inside of the object literal:

	```ts
	// correct

	let object = { foo: 'foo' };
	let array = [ obj, 'foo' ];
	let arrayOfObjects = [ { foo: 'foo' } ];

	// incorrect

	let object = {foo: 'foo'};
	let array = [obj, 'foo'];
	let arrayOfObjects = [{foo: 'foo'}];
	```

1. Parentheses *SHOULD NOT* have space on the inside:

	```ts
	// correct

	if (foo) {
		doSomething(foo);
	}

	// incorrect

	if ( foo ) {
		doSomething( foo );
	}
	```

1. Anonymous functions *SHOULD* have a space between the `function` keyword and the opening parenthesis;
	named functions *SHOULD NOT* have a space between the function name and the opening parenthesis:

	```ts
	// correct

	function myFunction() {
		return function () {

		};
	}

	// incorrect

	function myFunction () {
		return function() {

		}
	}
	```

1. Blocks with a single statement *SHOULD NOT* be written on the same line as the
	opening brace:

	```ts
	// correct

	if (foo) {
		bar;
	}

	// incorrect

	if (foo) { bar; }
	```

1. Chained methods, when cannot be expressed on a single line, *SHOULD* line break after the first
	function call and before each subsequent function call in the chain, indented further than
	the original block:

	```ts
	// correct

	const promise = new Promise.resolve(() => {
			// return some value
		})
		.then((result) => {
			// do something with result
		})
		.catch((error) => {
			// do something with error
		});

	const body = fetchResponse.text()
		.then((text) => {
			// do something with text
		});

	// incorrect

	const promise = new Promise.resolve(() => {
			// return some value
	}).then((result) => {
		// do something with result
	}).catch((error) => {
		// do something with error
	});

	const promise = new Promise
		.resolve(() => {
			// return some value
		})
		.then((result) => {
			// do something with result
		});

	const body = fetchResponse
		.text().then((text) => {
			// do something with text
		});
	```

1. `else` and `while` keywords *SHOULD* be on their own line, not cuddled with the
	closing brace of the previous `if`/`do` block. This is consistent with the
	use of all other block statements and allows comments to be placed
	consistently before conditional statements, rather than sometimes-before,
	sometimes-inside:

	```ts
	// correct

	if (foo) {
	}
	else if (bar) {
	}
	else {
	}

	do {
	}
	while (baz)

	// incorrect

	if (foo) {
	} else if (bar) {
	} else {
	}

	do {
	} while(baz)
	```

#### Labels

1. Labels *MUST* only be used on `do`, `for`, `while` and `switch` statements.

    ```ts
    // correct

    loop:
    for (let i = 0; i < 10; i++) {
        break loop;
    }

    // incorrect

    console:
    console.log('1, 2, 3`);
    ```

1. Labels *MUST* be defined before usage.

   ```ts
   // correct

    loop:
    for (let i = 0; i < 10; i++) {
        break loop;
    }

   // incorrect

    loop:
    for (let i = 0; i < 10; i++) {
        break loop;
    }

    (function() {
        for (let i = 0; i < 10; i++) {
            // label out of scope
            break loop;
        }
    })();

   ```
