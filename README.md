# Subscription Manager

A handle little tool for subscribing objects to Redis Pub/Sub channels.

`npm install SubscriptionManager`

The original idea was to connect WebSocket clients to Pub/Sub channels with events being fired by background processes. For example, notify a client when a background process finishes encoding a video. Or, notify a client when their web-connected factory produces another item.

## Usage

```javascript
var redis = require('redis').createClient();
var SM = require('SubscriptionManager');

var subMan = new SM(redis);

// Do whatever you want with the clients when a message comes in.
subMan.on('message', function(channel, clients, message) {
  console.log('Received a message for: %s', clients);
  console.log('Listening on channel: %s', channel);
  console.log('Saying: %s', message);

  clients.forEach(function(client) {
    client.notify(message);
  });
});

// Subscribe a client to a channel
subMan.subscribe(myClient, 'myChannel');

// List clients subscribed to a channel
subMan.getSubscriptions('myChannel'); // -> [myClient]

// List channels with active subscriptions
subMan.getChannels(); // -> ['myChannel']

// Unsubscribe a client from a channel
subMan.unsubscribe(myClient, 'myChannel');

```

## API

### new SubscriptionManager(redis, options)

Creates a new subscription manager. Possible options include:

- `prefix`: Adds a prefix to your channels

```javascript
var sm = new SM(redis, {prefix: 'Channel'});

// This will subscribe client to 'Channel:myChannel'
sm.subscribe(client, 'myChannel');
```

### sm.subscribe(client, channel)

Subscribes a client to a given channel. Will also issue a Redis `SUBSCRIBE` if this is the first client to subscribe to this channel.

### sm.unsubscribe(client, channel)

Remove a client from a given channel. If no more clients are subscribed to this channel, it will issue a Redis `UNSUBSCRIBE` for this channel.

### sm.getSubscriptions(channel)

Returns an array of clients that are subscribed to this channel.

### sm.getChannels()

Returns an array of all channels that currently have a client subscribed to them.

## Events

### "message" (channel, clients, message)

The subscription manager will emit `message` events anytime a message is received from any of the subscribed channels.

- `channel`: String for which channel received the event, the prefix will be included on the channel.
- `clients`: Array of clients that are subscribed to this channel.
- `message`: The message the was published


## Redis Connection

Subscription Manager depends only on having a [node_redis](https://github.com/mranney/node_redis) style interface for the Redis object. Feel free to replace it with your own implementation. The only methods that are used are:

- `redis.subscribe(channel)`
- `redis.unsubscribe(channel)`
- `redis.on('message', function(channel, message) {})`

In addition, debugging uses:

- `redis.on('subscribe', function(channel, count) {})`
- `redis.on('unsubscribe' function(channel, count) {})`

However, these are not necessary to implement (no functionality depends on them).

## Debugging

We're using [debug](https://github.com/visionmedia/debug) for debug output here.

To see what's going on under the hood, set the `DEBUG` environment variable to `SubscriptionManager` when you run node.

```console
DEBUG=SubscriptionManager node file.js

# --- OR ---

export DEBUG=SubscriptionManager
node file.js

````

## To Do

- [ ] Add ability to unsubscribe from all channels simultaneously
- [ ] Get a list of channels for a given client