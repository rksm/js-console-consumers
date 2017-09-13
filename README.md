# js-console-consumers

Wraps JavaScript's console object to notify "consumers" about log/warn/... calls.


## Usage

```js
import { prepareConsole } from "js-console-consumers";

prepareConsole(console);

let consumer = {log: s => alert(s), error: s => alert(s)};
console.addConsumer(c);
console.log("Hello"); // alert pops up!
```


## License

[MIT](License)
