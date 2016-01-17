import dgram from 'dgram';
import util from 'util';
import debug from 'debug';
import path from 'path';

let NODE_ENV = process.env.NODE_ENV;
let debugLog = debug('graphite-service');
let defaults = {
    host: 'localhost',
    port: 8081,
    type: 'udp4',
    prefix: '',
    suffix: '',
    interval: 10000,
    callback: null,
    allow: {
        production: true,
        development: false
    }
};

class graphiteService {

    static queue = [];
    static client = null;

    constructor(options, client) {
        this.options = util._extend(defaults, options);
        this.queue = [];
        if (client) {
            this.client = client;
        } else {
            this.init();
        }
    }

    instance() {
        return new graphiteService(this.options, this.client);
    }

    init() {
        debugLog('Init Graphite-service UDP client');
        this.client = dgram.createSocket(this.options.type);
        this.client.on('close', () => {
            debugLog('UDP socket closed');
        });

        this.client.on('error', err => {
            debugLog(`UDP socket error: ${err}`);
        });

        this.client.on('add', data => {
            this.queue.push(data);
        });

        setInterval(this.beforeSend.bind(this), this.options.interval);
        debugLog('Creating new Graphite-service UDP client');
    }

    event(event) {
        var options = this.options;
        options.host = path.join(this.options.host, '/event');
        this.send(new Buffer(JSON.stringify(event)), options);
    }

    start(name) {
        debugLog(`start: ${name}`);
        this.queue[name] = {
            value: new Date(),
            type: 'ms'
        };
    };

    end(name, replaceName) {
        debugLog(`end: ${name}`);
        if (this.queue[name]) {
            this.add(
                replaceName || name,
                new Date() - this.queue[name].value,
                this.queue[name].type
            );
        }
        delete this.queue[name];
    }

    beforeSend() {
        if (this.queue.length === 0) {
            return;
        }
        var metrics = new Buffer(this.queue.join('\n'));
        this.send(metrics);
    }
    send(metrics, options) {
        if (this.options.allow[NODE_ENV]) {
            options = options || this.options;
            debugLog(`Sending: \n ${metrics} metrics to
                ${this.options.host}: ${this.options.port}`);

            this.client.send(
                metrics,
                0,
                metrics.length,
                options.port,
                options.host,
                err => {
                    if (err) {
                        return debugLog(`Error sending metrics: ${err}`);
                    }
                }
            );
        }
        this.queue = [];

    }

    add(name, value, type = null) {
        var itemQueue = name;

        if (this.options.prefix) {
            itemQueue = `${this.options.prefix}.${itemQueue}`;
        }

        if (this.options.suffix) {
            itemQueue = `${itemQueue}.${this.options.suffix}`;
        }

        if (!type) {
            value = ` ${value} ${(new Date()).getTime()}`;
        } else {
            value = `:${value}|${type}`;
        }

        itemQueue = itemQueue + value;
        this.client.emit('add', itemQueue);
        debugLog(`Adding metric to queue: ${itemQueue}`);
    }
};

export default graphiteService;
