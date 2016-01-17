# graphite-services

Graphite UDP client for Node.js

## Install
```
npm install graphite-service
```

## Usage
```js
var Graphite = require('graphite-service')
var metric = new Graphite([options])
metric.add(name, value, type)
```

`options` is an object with the following defaults:

```js
{
  host: 'localhost', // graphite server host or ip
  port: 8081, // graphite server udp port
  type: 'udp4', // udp type (udp4 or udp6)
  prefix: '', // a prefix to prepend to the name of all metrics
  suffix: '', // a suffix to append to the name of all metrics
  interval: 5000, // group metrics for 5s and send only 1 request
  allow: {
  		production: true,
  		development: false
  }
}
```

## Example
```js
var Graphite = require('graphite-service')
var metric = new Graphite({
  prefix: 'app',
  interval: 10000
})

metric.add('user', 1, 'c') // add 1
```

Will generate

```
app.user 1 1447192345
```

# API

### metric.instance

add new instance graphite-service

```js
var userMetric = metric.instance();
userMetric.add('metric', 1, 'c');
```

### metric.start & metric.end 

add time metric

```js
var userMetric = metric.instance();
userMetric.start('metric');
....
userMetric.end('metric');
```

Will generate

```
app.metric:time|s;
```


### metric.add
During the `interval` time option, if 2 or more metrics with the same name
are sent, metrics will be added (summed)

```js
metric.add('metric', 1)
```
Will generate

```
app.metric 1 1447192345;
```

## License

Licensed under the MIT license.