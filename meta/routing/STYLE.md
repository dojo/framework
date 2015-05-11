# The Dojo Toolkit Style Guide

## Code Conventions

All names and comments MUST be written in English.

### Naming

The following naming conventions MUST be used:

<table>
	<tr>
		<th>Construct</th><th>Convention</th>
	</tr>
	<tr>
		<td>package</td><td>lower-dash-case</td>
	</tr>
	<tr>
		<td>module exporting default class</td><td>UpperCamelCase</td>
	</tr>
	<tr>
		<td>all other modules</td><td>lowerCamelCase</td>
	</tr>
	<tr>
		<td>classes, interfaces, and type aliases</td><td>UpperCamelCase</td>
	</tr>
	<tr>
		<td>enums and enum value names</td><td>UpperCamelCase</td>
	</tr>
	<tr>
		<td>constants</td><td>UPPER_CASE_WITH_UNDERSCORES</td>
	</tr>
	<tr>
		<td>variables</td><td>lowerCamelCase or _lowerCamelCase*</td>
	</tr>
	<tr>
		<td>parameters</td><td>lowerCamelCase or _lowerCamelCase*</td>
	</tr>
	<tr>
		<td>public properties</td><td>lowerCamelCase</td>
	</tr>
	<tr>
		<td>protected/private properties</td><td>_lowerCamelCase</td>
	</tr>
</table>

Variables and parameter names generally SHOULD NOT be prefixed with underscores,
but this may be warranted in rare cases where two variables in nested scopes
make sense to have the same name, while avoiding shadowing the outer variable.

<table>
	<tr>
		<th>Variable type</th><th>Convention</th>
	</tr>
	<tr>
		<td>Deferred</td><td>dfd</td>
	</tr>
	<tr>
		<td>Promise</td><td>promise</td>
	</tr>
	<tr>
		<td>Identifier</td><td>id</td>
	</tr>
	<tr>
		<td>Numeric iterator</td><td>i, j, k, l</td>
	</tr>
	<tr>
		<td>String iterator (for-in)</td><td>k, key</td>
	</tr>
	<tr>
		<td>Event</td><td>event</td>
	</tr>
	<tr>
		<td>Destroyable handle</td><td>handle</td>
	</tr>
	<tr>
		<td>Error object</td><td>error</td>
	</tr>
	<tr>
		<td>Keyword arguments object</td><td>kwArgs</td>
	</tr>
	<tr>
		<td>Origin, source, from</td><td>source</td>
	</tr>
	<tr>
		<td>Destination, target, to</td><td>target</td>
	</tr>
	<tr>
		<td>Coordinates</td><td>x, y, z, width, height, depth</td>
	</tr>
	<tr>
		<td>All others</td><td>Do not abbreviate</td>
	</tr>
</table>

1. All names SHOULD be as clear as necessary, SHOULD NOT be contracted just for
	the sake of less typing, and MUST avoid unclear shortenings and
	contractions (e.g. `MouseEventHandler`, not `MseEvtHdlr` or `hdl` or
	`h`).
1. Names representing an interface MUST NOT use "I" as a prefix (e.g. `Event`
	not `IEvent`).
1. Abbreviations and acronyms MUST NOT be uppercase when used as a name (e.g.
	`getXml` not `getXML`).
1. Collections MUST be named using a plural form.
1. Names representing boolean states SHOULD start with `is`, `has`, `can`, or
	`should`.
1. Names representing boolean states MUST NOT be negative (e.g. `isNotFoo` is
	unacceptable).
1. Names representing a count of a number of objects SHOULD start with `num`.
1. Names representing methods SHOULD be verbs or verb phrases (e.g.
	`getValue()`, not `value()`).
1. Non-constructor methods that generate new objects SHOULD use the verb
	"create".
1. Magic numbers MUST either be represented using a constant or enum, or be prefixed
	with a comment representing the literal value of the number (e.g.
	`if (event.keyCode === Keys.KEY_A)` or
	`if (event.keyCode === /* "a" */ 97)`).

### Variables

1. All immutable variables MUST be declared with `const`:

	```ts
	// right

	const a = 1;

	// wrong

	var a = 1;
	let a = 1;
	```

1. All mutable variables MUST be declared with `let`:

	```ts
	// right

	for (let i = 0; i < items.length; i++) {
	}

	// wrong

	for (var i = 0; i < items.length; i++) {
	}
	```

1. All variable declarations MUST use one `const` or `let` declaration per
	variable. The exception to this rule is the initialization expression of
	a `for` statement, and object/array destructuring (e.g. for imports).
	This prevents variable declarations being lost inside long lists that may also include immediate assignments:

	```ts
	// right

	const items = getItems();
	const length = items.length;
	let i = 0;
	let item;

	// also right

	const items = getItems();
	for (let i = 0, item; (item = items[i]); i++) {
	}

	// wrong

	const items = getItems(), length = items.length;
	let i = 0,
		item;
	```

1. Variable declarations SHOULD be grouped by declaration type; `const` first, then `let`:

	```ts
	// right

	const items = getItems();
	const length = items.length;
	let i = 0;
	let item;

	// wrong

	const items = getItems();
	let item;
	const length = items.length;
	let i = 0;
	```

1. Variables SHOULD be declared where they are first assigned:

	```ts
	// right

	render(): void {
		const items = this.getItems();

		if (!items.length) {
			return;
		}

		for (let i = 0, item; (item = items[i]); i++) {
			this.renderItem(item);
		}
	}

	// wrong

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

1. The most appropriate data types SHOULD be used in all cases (e.g. boolean for
	booleans, not number).

### Coding Conventions

1. Strings MUST use single quotes.

1. Equality comparisons MUST use strict comparison operators, with the exception that
	comparisons matching null or undefined MAY use `== null`.

1. When type coersion is necessary, it SHOULD be performed using the appropriate global function (*not* constructor):

	```ts
	// right

	let myBoolean = Boolean(something);
	let myNumber = Number(something);
	let myString = String(something);

	// wrong

	let myBoolean = !!something;
	let myNumber = +something;
	let myString = '' + something;

	// also wrong (and doesn't produce primitives, so don't do it!)

	let myBoolean = new Boolean(something);
	let myNumber = new Number(something);
	let myString = new String(something);
	```

1. Callbacks which need the execution context preserved SHOULD use arrow functions
	(if they aren't already using `Function#bind` or `lang.lateBind`).
	Arrow functions MUST include parentheses around parameters and curly braces around the function body
	(i.e. implicit returns aren't allowed):

	```ts
	// right
	promise.then((result) => {
		return this.processResult(result);
	});

	// wrong (harder to read and the significance of the return value is easily lost)
	promise.then(result => this.processResult(result));

	// wrong (more to write and risks forgetting to use self instead of this)
	let self = this;
	promise.then(function (result) {
		return self.processResult(result);
	});
	```

1. Arrow functions SHOULD NOT be used simply as function shorthand;
	they should ONLY be used *specifically* for execution context preservation.

1. `let self = this` MAY still be used instead if it enhances readability
	(e.g. for preservation across multiple nested scopes).

1. Avoid casts when possible.  If a type declaration can solve the problem instead, prefer that over a cast:

```ts
	// right
	let something: Something = {
		// ...
	};

	// wrong
	let something = <Something> {
		// ...
	};
```

### Ordering

1. Class properties SHOULD be ordered alphabetically, case-insensitively,
	ignoring leading underscores, in the following order:
	* static properties
	* static methods
	* instance index signature
	* instance properties (including getters and setters; private, protected, then public)
	* constructor
	* instance methods (private, protected, then public)

1. Interface properties SHOULD be ordered alphabetically, case-insensitively,
	ignoring leading underscores, in the following order:
	* constructor
	* function call
	* index signature
	* properties (private, protected, then public)
	* methods (private, protected, then public)

1. Module exports SHOULD be ordered alphabetically, case-insensitively, by identifier.

1. Module imports SHOULD be ordered alphabetically *by module ID*, starting with the package name.
	Module imports SHOULD NOT be ordered by variable name, due to potential confusion when destructuring is involved.

1. Functions MUST be declared before their use. The exceptions to this rule
	are functions exported from a module and methods of a class:

	```ts
	// right

	function getItems(): Item[] {
		// ...
	}

	const items = getItems();

	// also right

	export function one(): void {
		two();
	}

	export function two(): void {
		// ...
	}

	// wrong

	const items = getItems();

	function getItems(): Item[] {
		// ...
	}
	```

### Comments

1. Comments documenting methods MUST be written in JSDoc format.
	Type information SHOULD NOT be included, since it should be possible to pick up from function signatures.

	Example:

	```ts
	/**
	 * Produces something useful and/or interesting.
	 * @param foo Indicates how useful something should be.
	 * @param bar Indicates how interesting something should be.
	 * @return Something useful and/or interesting.
	 */
	export function doSomethingInteresting(foo: string, bar: number): SomethingInteresting {

	}
	```

1. Comments SHOULD be used to explain *why* something needs to be written, *not* what it does.
	If a "what" comment seems necessary, consider rewriting the code to be clearer instead.
	Comments summarizing entire blocks of code are permissible.

1. Comments indicating areas to revisit SHOULD start with `TODO` or `FIXME` to make them easy to find.
	Ideally, such comments should only ever appear in personal/feature branches,
	but may be merged at maintainers' discretion.

### Whitespace and Formatting

#### Files

1. Files MUST use hard tabs for indentation.
	Spaces MAY be used for alignment (under the assumption that hard tabs align to 4 spaces).

1. Files MUST end with a single newline character.

1. Lines SHOULD NOT exceed 120 characters in length.

#### Semicolons

1. Semicolons MUST be used.

1. Semicolons MUST NOT be preceded by a space.

1. Semicolons in `for` statements MUST be followed by a space.

#### Commas

1. Commas MUST be followed by a space or newline, and MUST NOT be preceded by a space.

1. Commas MUST NOT appear at the beginning of lines (i.e. no leading commas).

1. All other binary/ternary operators MUST be surrounded by a space on both sides,
	unless immediately followed by a newline, in which case the operator SHOULD *precede* the newline (except for `.`).

#### Colons

1. Colons in type definitions MUST be followed by a space or newline, and
	MUST NOT be preceded by a space.

1. Colons in object definitions MUST be followed by a space, and MUST NOT be preceded by a space.

1. Colons in `case` clauses MUST be followed by a newline, and MUST NOT be preceded by a space.
	The body of each `case` clause must be indented one level deeper than the `case` clause, and MUST conclude with
	the `break` keyword or a `// fall through` comment.

#### Braces, Brackets, and Parentheses

1. The opening and closing brackets on objects and arrays MUST be surrounded by
	whitespace on the inside of the object literal:

	```ts
	// right

	let object = { foo: 'foo' };
	let array = [ obj, 'foo' ];
	let arrayOfObjects = [ { foo: 'foo' } ];

	// wrong

	let object = {foo: 'foo'};
	let array = [obj, 'foo'];
	let arrayOfObjects = [{foo: 'foo'}];
	```

1. Parentheses MUST NOT have space on the inside:

	```ts
	// right

	if (foo) {
		doSomething(foo);
	}

	// wrong

	if ( foo ) {
		doSomething( foo );
	}
	```

1. Parentheses immediately preceding a block expression (e.g. `if`, `for`, `catch`)
	MUST be surrounded by a space on each side:

	```ts
	// right

	if (foo) {
	}

	// wrong
	if(foo){
	}
	```

1. Anonymous functions MUST have a space between the `function` keyword and the opening parenthesis;
	named functions MUST NOT have a space between the function name and the opening parenthesis:

	```ts
	// right

	function myFunction() {
		return function () {

		};
	}

	// wrong

	function myFunction () {
		return function() {

		}
	}
	```

1. The opening brace of a code block MUST be written on the same line as its
	statement, preceded by a space:

	```ts
	// right

	if (foo) {

	}

	// wrong

	if (foo)
	{

	}

	if(foo){

	}
	```

1. Blocks with a single statement MUST NOT be written on the same line as the
	opening brace:

	```ts
	// right

	if (foo) {
		bar;
	}

	// wrong

	if (foo) { bar; }
	```

1. `else` and `while` keywords MUST be on their own line, not cuddled with the
	closing brace of the previous `if`/`do` block. This is consistent with the
	use of all other block statements and allows comments to be placed
	consistently before conditional statements, rather than sometimes-before,
	sometimes-inside:

	```ts
	// right

	if (foo) {
	}
	else if (bar) {
	}
	else {
	}

	do {
	}
	while (baz)

	// wrong

	if (foo) {
	} else if (bar) {
	} else {
	}

	do {
	} while(baz)
	```
