# string

## `codePointAt`

Returns the UTF-16 encoded code point value of a position in a string.

```ts
import { codePointAt } from '@dojo/shim/string';

const str = 'string';
const position = 2; // zero index based position

const result = codePointAt(str, position);

result === 114; // true
```

## `endsWith`

Determines whether a string ends with the given substring.

```ts
import { endsWith } from '@dojo/shim/string';

const str = 'string';
const search = 'ing';
const endPosition = str.length; // the index the searching should stop before

const result = endsWith(str, search, endPosition);

result === true; // true
```

## `fromCodePoint`

Creates a string using the specified sequence of code points.

```ts
import { fromCodePoint } from '@dojo/shim/string';

const result = fromCodePoint(97, 98, 99, 49, 50, 51);

result === 'abc123'; // true
```

## `includes`

Determines whether a string includes the given substring.

```ts
import { includes } from '@dojo/shim/string';

const str = 'string';
const search = 'ring';
const position = 0; // index to begin searching at

const result = includes(str, search, position);

result === true; // true
```

## `repeat`

Returns a string containing a string repeated a given number of times.

```ts
import { repeat } from '@dojo/shim/string';

const str = 'string';
const times = 3; // the number of times to repeat the string

const result = repeat(str, times);

result === 'stringstringstring'; // true
```

## `startsWith`

Determines whether a string begins with the given substring.

```ts
import { startsWith } from '@dojo/shim/string';

const str = 'string';
const search = 'str';

const result = startsWith(str, search);

result === true; // true
```

Special thanks to Mathias Bynens for granting permission to adopt code from his [`codePointAt`](https://github.com/mathiasbynens/String.prototype.codePointAt), [`fromCodePoint`](https://github.com/mathiasbynens/String.fromCodePoint), and [`repeat`](https://github.com/mathiasbynens/String.prototype.repeat) polyfills.

The `string` module also contains the following utility functions:

## `padEnd`

Adds padding to the end of a string to ensure it is a certain length.

```ts
import { padEnd } from '@dojo/shim/string';

const str = 'string';
const length = 10;
const char = '=';

const result = padEnd(str, length, char);

result === 'string===='; // true
```

## `padStart`

Adds padding to the beginning of a string to ensure it is a certain length.

```ts
import { padStart } from '@dojo/shim/string';

const str = 'string';
const length = 10;
const char = '=';

const result = padStart(str, length, char);

result === '====string'; // true
```
