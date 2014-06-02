var debug = require('debug');
var assert = require('assert');

/**
 * Subscription Manager
 * =============================================================================
 */

var SubscriptionManager = module.exports = function(redis, options) {
  assert(redis);
  options = options || {};

  this.redis = redis;
  this.prefix = options.prefix + ':' || '';
  this.subscriptions = {};
};


/**
 * Subscribe WebSocket to channel
 *
 * Allows us to perform a one-to-many mapping of channels to WebSockets. The
 * return value will be true if this is the first WebSocket subscribed to that
 * channel, otherwise false.
 * 
 * @param  {WebSocket} ws   Socket that is subscribing
 * @param  {String} channel Channel to subscribe to
 * @return {bool}           Is this the first object subscribed?
 */
SubscriptionManager.prototype.subscribe = function(id, thing, channel) {
  var out = false;

  if (!this.subscriptions[channel]) {
    this.subscriptions[channel] = [];
    out = true;
  }

  this.subscriptions[channel].push({id: id, thing: thing});

  return out;
};

/**
 * Unsubscribe WebSocket to channel
 *
 * Allows us to remove a WebSocket from a list of subscribed WebSockets. The
 * return value will be true if there are other WebSockets listening to the
 * given channel.
 * 
 * @param  {WebSocket} ws   Socket that is unsubscribing
 * @param  {String} channel Channel to subscribe to
 * @return {bool}           Are other objects still listening?
 */
SubscriptionManager.prototype.unsubscribe = function(id, channel) {
  var out = true;
  var subscribers = this.subscriptions[channel];

  for (var i=subscribers.length-1; i>=0; i--) {
    var subscriber = subscribers[i];
    if (subscriber.id === id) {
      subscribers.splice(i, 1);
    }
  }

  if (subscribers.length === 0) {
    out = false;
    delete this.subscriptions[channel];
  }

  return out;
};


/**
 * Get subscribers to a channel
 *
 * @param  {String} channel
 * @return {Array} Array of WebSocket objects
 */
SubscriptionManager.prototype.getSubscribers = function(channel) {
  var subscribers = this.subscriptions[channel];
  if (!subscribers) return [];

  subscribers = subscribers.map(function(i) { return i.thing; });
  return subscribers;
};


/**
 * Get Channels
 *
 * Returns an array of channels that currently have subscribers
 * 
 * @return {Array} Channels that have subscribers
 */
SubscriptionManager.prototype.getChannels = function() {
  var channels = [];

  for (var channel in this.subscriptions) {
    if (!this.subscriptions.hasOwnProperty(channel)) { continue; }
    channels.push(channel);
  }

  return channels;
};