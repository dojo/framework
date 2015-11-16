# string

## `codePointAt` - Returns the UTF-16 encoded code point value of a position in a string
```ts
import { codePointAt } from 'src/string';

const str = 'string';
const position = 2; // zero index based position

const result = codePointAt(str, position);

result === 114; // true
```

## `endsWith` - Determines whether a string ends with the given substring
```ts
import { endsWith } from 'src/string';

const str = 'string';
const search = 'ing';
const endPosition = str.length; // the index the searching should stop before

const result = endsWith(str, search, endPosition);

result === true; // true
```

## `fromCodePoint` - Creates a string using the specified sequence of code points
```ts
import { fromCodePoint } from 'src/string';

const result = fromCodePoint(97, 98, 99, 49, 50, 51);

result === 'abc123'; // true
```

## `includes` - Determines whether a string includes the given substring
```ts
import { includes } from 'src/string';

const str = 'string';
const search = 'ring';
const position = 0; // index to begin searching at

const result = includes(str, search, position);

result === true; // true
```

## `repeat` - Returns a string containing a string repeated a given number of times
```ts
import { repeat } from 'src/string';

const str = 'string';
const times = 3; // the number of times to repeat the string

const result = repeat(str, times);

result === 'stringstringstring'; // true
```

## `startsWith` - Determines whether a string begins with the given substring
```ts
import { startsWith } from 'src/string';

const str = 'string';
const search = 'str';

const result = startsWith(str, search);

result === true; // true
```

Special thanks to Mathias Bynens for granting permission to adopt code from his
[`codePointAt`](https://github.com/mathiasbynens/String.prototype.codePointAt),
[`fromCodePoint`](https://github.com/mathiasbynens/String.fromCodePoint), and
[`repeat`](https://github.com/mathiasbynens/String.prototype.repeat) polyfills.

The `string` module also contains the following utility functions:

## `escapeRegExp` - Escapes a string to safely be included in regular expressions
```ts
import { escapeRegExp } from 'src/string';

const str = 'cat file.js | grep -c';

const result = escapeRegExp(str);

result === 'cat file\\.js \\| grep -c'; // true

```

## `escapeXml` - Escapes XML (or HTML) content in a string
```ts
import { escapeXml } from 'src/string';

const badCode = "<script>alert('hi')</script>";

const sanitized = escapeXml(badCode);

sanitized === '&lt;script&gt;alert(&#39;hi&#39;)&lt;/script&gt;'; // true
```

## `padEnd` - Adds padding to the end of a string to ensure it is a certain length
```ts
import { padEnd } from 'src/string';

const str = 'string';
const length = 10;
const char = '=';

const result = padEnd(str, length, char);

result === 'string===='; // true
```

## `padStart` - Adds padding to the beginning of a string to ensure it is a certain length
```ts
import { padStart } from 'src/string';

const str = 'string';
const length = 10;
const char = '=';

const result = padStart(str, length, char);

result === '====string'; // true
```
