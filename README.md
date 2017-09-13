# js-console-consumers

Wraps JavaScript's console object to notify "consumers" about log/warn/... calls.  Also installs handlers for window error and unhandledrejection events and calls `consumer.error()` accordingly.


## Usage

```js
import { prepareConsole } from "js-console-consumers";

prepareConsole(console);

let consumer = {log: s => window.alert("log: " + s), error: s => window.alert("error: " + s)};
console.addConsumer(c);
console.log("Hello"); // alert pops up!

// to uninstall:
console.removeConsumer(c);
```


## License

[MIT](LICENSE)
