# Subscription Manager

A handle little tool for subscribing objects to Redis Pub/Sub channels.

`npm install SubscriptionManager`

The original idea was to connect WebSocket clients to Pub/Sub channels with events being fired by background processes. For example, notify a client when a background process finishes encoding a video. Or, notify a client when their web-connected factory produces another item.

## Usage

```
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
subMan.subscribe(myClient.id, myClient, 'myChannel');

// List clients subscribed to a channel
subMan.getSubscriptions('myChannel'); // -> [myClient]

// List channels with active subscriptions
subMan.getChannels(); // -> ['myChannel']

// Unsubscribe a client from a channel
subMan.unsubscribe(myClient.id, 'myChannel');

```

# API

## new SubscriptionManager(redis, options)

Creates a new subscription manager. Possible options include:

- `prefix`: Adds a prefix to your channels

```
var sm = new SM(redis, {prefix: 'Channel'});

// This will subscribe client to 'Channel:myChannel'
sm.subscribe(client.id, client, 'myChannel');
```

## sm.subscribe(clientID, client, channel)

Subscribes a client to a given channel, using a unique ID to identify the client.


## Redis Connection

Subscription Manager depends only on having a [node_redis](https://github.com/mranney/node_redis) style interface. 




## To Do

- [ ] Add ability to unsubscribe from all channels