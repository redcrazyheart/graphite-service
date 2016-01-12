var dgram = require('dgram');
var util = require('util');
var EventEmitter = require('events');
var debug = require('debug')('[graphite]');

var defaults = {
    host: 'localhost',
    port: 8081,
    type: 'udp4',
    prefix: '',
    suffix: '',
    interval: 10000,
    verbose: true
};

function createServer(options) {
    this.options = util._extend(defaults, options);
    this.client = dgram.createSocket(options.type);
    this.queue = [];
    this.client.on('close', function () {
        debug('UDP socket closed');
    });

    this.client.on('error', function (err) {
        debug('UDP socket error: ' + err);
    });
    this.send = function (name, value) {
        if (this.queue.length === 0) {
            return;
        }

        var metrics = new Buffer(this.queue.join('\n'));

        debug('Sending: ' + this.queue.length + ' metrics to '
          + this.options.host + ':' + this.options.port);

        this.client.send(
            metrics,
            0,
            metrics.length,
            this.options.port,
            this.options.host,
            function (err) {
                if (err) {
                    return debug('Error sending metrics: ' + err);
                }

                if (this.options.callback) {
                    this.options.callback(err, metrics.toString());
                }
            }
        );

        this.queue = [];
    };
    setInterval(this.send.bind(this), this.options.interval);
    debug('Creating new Graphite UDP client');
}

util.inherits(createServer, EventEmitter);

module.exports = function (options) {
    var server = new createServer(options);
    server.on('addQueue', function (queue) {
        server.queue = this.queue.concat(queue);
    });

    server.createClient = function () {
        return new createClient(options);
    };

    function createClient(options) {
        this.options = options;
        this.uid = new Date();
        this.queue = [];
    }

    createClient.prototype.start = function (name) {
        debug('start: ' + name);
        this.queue[name] = {
            time: new Date(),
            type: 'ms'
        };
    };

    createClient.prototype.end = function (name) {
        debug('end: ' + name);
        if (this.queue[name]) {
            this.add(name, {
                time: new Date() - this.queue[name].time,
                type: 'ms'
            });
        }
        delete this.queue[name];
    };

    createClient.prototype.add = function (name, value) {
        debug('add: ' + name + ':' + value);
        var itemQueue = name;

        if (this.options.prefix) {
            itemQueue = this.options.prefix + '.' + itemQueue;
        }

        if (this.options.suffix) {
            itemQueue = itemQueue + '.' + this.options.suffix;
        }

        if (typeof value  === 'object') {
            value = ':' + value.time + '|' + value.type;
        } else {
            value = ' ' + value + ' ' + (new Date()).getTime();
        }

        itemQueue = itemQueue + value;

        server.emit('addQueue', itemQueue);

        debug('Adding metric to queue: ' + itemQueue);
    };
    return server;
};
