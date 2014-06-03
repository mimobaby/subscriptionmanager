var util = require('util');
var events = require('events');
var debug = require('debug')('SubscriptionManager');
var assert = require('assert');

/**
 * Subscription Manager
 * =============================================================================
 */

var SubscriptionManager = module.exports = function(redis, options) {
  var self = this;
  assert(redis, 'You must specify a Redis-compatible instance.');
  
  // Option parsing
  options = options || {};
  self.prefix = '';
  if (options.prefix) {
    self.prefix = options.prefix + ':';
  }

  self.subscriptions = {};
  self.redis = redis;

  self.redis.on('subscribe', function(channel, count) {
    debug('redis subscribe %s (%s channel)', channel, count);
  });
  
  self.redis.on('unsubscribe', function(channel, count) {
    debug('redis unsubscribe %s (%s channel)', channel, count);
  });

  self.redis.on('message', function(channel, message) {
    debug('message on %s', channel);

    var subscribers = self._getSubscribers(channel);

    if (subscribers && subscribers.length > 0) {
      self.emit('message', channel, subscribers, message);  
    }
  });
};

util.inherits(SubscriptionManager, events.EventEmitter);


/**
 * Subscribe thing to channel
 *
 * Allows us to perform a one-to-many mapping of channels to things.
 *
 * @param {Object} thing   Thing that is subscribing
 * @param {String} channel Channel to subscribe to
 */
SubscriptionManager.prototype.subscribe = function(thing, channel) {
  channel = this.prefix + channel;

  if (!this.subscriptions[channel]) {
    this.subscriptions[channel] = [];
    this.redis.subscribe(channel);
  }

  this.subscriptions[channel].push(thing);
};

/**
 * Unsubscribe thing to channel
 *
 * Allows us to remove a thing from a list of subscribed things.
 * 
 * @param {string} thing   Thing that is unsubscribing
 * @param {String} channel Channel to subscribe to
 */
SubscriptionManager.prototype.unsubscribe = function(thing, channel) {
  channel = this.prefix + channel;
  var subscribers = this.subscriptions[channel];

  for (var i=subscribers.length-1; i>=0; i--) {
    var subscriber = subscribers[i];
    if (subscriber === thing) {
      subscribers.splice(i, 1);
      break;
    }
  }

  if (subscribers.length === 0) {
    delete this.subscriptions[channel];
    this.redis.unsubscribe(channel);
  }
};


/**
 * Get subscribers to a channel. Does not use the specified prefix.
 *
 * @param  {String} channel
 * @return {Array} Array of things
 */
SubscriptionManager.prototype._getSubscribers = function(channel) {
  var subscribers = this.subscriptions[channel];
  if (!subscribers) return [];
  return subscribers;
};


/**
 * Get subscribers to a channel. Does not use the specified prefix.
 *
 * @param  {String} channel
 * @return {Array} Array of things
 */
SubscriptionManager.prototype.getSubscribers = function(channel) {
  channel = this.prefix + channel;
  return this._getSubscribers(channel);
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

  // Remove prefix
  var regexp = new RegExp('/^' + this.prefix + '/');
  channels = channels.map(function(i) {
    return i.replace(regexp, '');
  });

  return channels;
};