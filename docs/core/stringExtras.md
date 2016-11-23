# stringExtras

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
