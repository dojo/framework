# stringExtras

## `escapeRegExp`

Escapes a string to safely be included in regular expressions.

```ts
import { escapeRegExp } from '@dojo/core/string';

const str = 'cat file.js | grep -c';

const result = escapeRegExp(str);

result === 'cat file\\.js \\| grep -c'; // true

```

## `escapeXml`

Escapes XML (or HTML) content in a string.

```ts
import { escapeXml } from '@dojo/core/string';

const badCode = "<script>alert('hi')</script>";

const sanitized = escapeXml(badCode);

sanitized === '&lt;script&gt;alert(&#39;hi&#39;)&lt;/script&gt;'; // true
```
