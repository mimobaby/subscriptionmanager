var SubMan = require('../');
var redis = require('redis');
var redisClient = redis.createClient();

after(function() {
  redisClient.end();
});

describe('SubscriptionManager', function() {
  var s, r;
  var obj1 = {};
  var obj2 = {};


  beforeEach(function() {
    r = redis.createClient();
  });

  afterEach(function() {
    r.unsubscribe();
    r.end();
  });


  it('should require a Redis instance', function() {
    try {
      var s = new SubMan();
    } catch (e) {
      return;
    }
    throw new Error('Didn\'t require a Redis instance.');
  });

  describe('#subscribe()', function() {
    // Should these tests really depend on internal implementation?
    it('should subscribe to channels', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test');
      var subs = s.subscriptions.test.map(function(i) { return i.thing; });
      subs.indexOf(obj1).should.be.eql(0);

      checkChannelList(['test'], done);
    });

    it('should allow multiple subscribers', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test');
      s.subscribe('obj2', obj2, 'test');

      var sl = s.subscriptions.test.map(function(i) { return i.thing; });

      sl.length.should.be.eql(2);
      sl.indexOf(obj1).should.be.above(-1);
      sl.indexOf(obj2).should.be.above(-1);

      checkChannelList(['test'], done);
    });

    it('should allow multiple channels', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test1');
      s.subscribe('obj2', obj2, 'test2');

      var subs1 = s.subscriptions.test1.map(function(i) { return i.thing; });
      var subs2 = s.subscriptions.test2.map(function(i) { return i.thing; });

      subs1.length.should.be.eql(1);
      subs2.length.should.be.eql(1);
      subs1.indexOf(obj1).should.be.eql(0);
      subs2.indexOf(obj2).should.be.eql(0);

      checkChannelList(['test1', 'test2'], done);
    });

    it('should use prefixes correctly', function(done) {
      s = new SubMan(r, {prefix: 'Test'});
      s.subscribe('obj1', obj1, 'channel');

      var subs = s.subscriptions['Test:channel'].map(function(i) {
        return i.thing;
      });

      subs.length.should.be.eql(1);
      subs.indexOf(obj1).should.be.eql(0);

      checkChannelList(['Test:channel'], done);
    });

  });


  describe('#unsubscribe()', function() {

    it('should unsubscribe from channels', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test');
      s.unsubscribe('obj1', 'test');
      (typeof subs).should.eql('undefined');
      checkChannelList([], done);
    });

    it('should unsubscribe multiple things from a channel', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test');
      s.subscribe('obj2', obj2, 'test');

      s.unsubscribe('obj1', 'test');

      var subs = s.subscriptions.test.map(function(i) { return i.thing; });
      subs.length.should.eql(1);
      subs.indexOf(obj1).should.eql(-1);
      subs.indexOf(obj2).should.eql(0);

      s.unsubscribe('obj2', 'test');

      subs = s.subscriptions.test;
      (typeof subs).should.eql('undefined');

      checkChannelList([], done);
    });

    it('should unsubscribe from one channel, but not all', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test1');
      s.subscribe('obj1', obj1, 'test2');

      s.unsubscribe('obj1', 'test1');

      var subs1 = s.subscriptions.test1;
      (typeof subs1).should.eql('undefined');
      
      var subs2 = s.subscriptions.test2.map(function(i) { return i.thing; });
      subs2.length.should.eql(1);
      subs2.indexOf(obj1).should.be.above(-1);

      checkChannelList(['test2'], done);
    });

  });


  describe('#getSubscribers()', function() {

    it('should return all subscribers', function() {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test');
      s.subscribe('obj2', obj2, 'test');

      var subs = s.getSubscribers('test');

      subs.length.should.eql(2);
      subs.indexOf(obj1).should.be.above(-1);
      subs.indexOf(obj2).should.be.above(-1);
    });

    it('should return different channels correctly', function() {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test1');
      s.subscribe('obj2', obj2, 'test2');

      var subs = s.getSubscribers('test1');

      subs.length.should.eql(1);
      subs.indexOf(obj1).should.be.above(-1);
      subs.indexOf(obj2).should.be.eql(-1);
    });

  });


  describe('#getChannels()', function() {

    it('should return the right channels', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test1');
      s.subscribe('obj2', obj2, 'test2');

      var c = s.getChannels();

      checkChannelList(c, done);
    });

    it('should return the right channels after unsubscribe', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test1');
      s.subscribe('obj2', obj2, 'test2');
      s.unsubscribe('obj2', 'test2');

      var c = s.getChannels();

      checkChannelList(c, done);
    });

  });


  describe('#on(\'message\')', function() {

    it('should emit messages', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test');
      s.subscribe('obj2', obj2, 'test');

      s.on('message', function(channel, subs, message) {

        channel.should.eql('test');
        subs.length.should.eql(2);
        subs.indexOf(obj1).should.be.above(-1);
        subs.indexOf(obj2).should.be.above(-1);
        message.should.eql('message');

        done();
      });

      setTimeout(function() {
        redisClient.publish('test', 'message');
      }, 10);
    });

    it('should not emit unsolicited messages', function(done) {
      s = new SubMan(r);

      var exited = false;
      s.on('message', function(channel, subs, message) {
        if (!exited) return done(new Error('Should not get here'));
      });

      setTimeout(function() {
        redisClient.publish('test2', 'message');
      }, 10);

      setTimeout(function() {
        exited = true;
        done();
      }, 100);
    });

    it('should not emit messages after unsubscribe', function(done) {
      s = new SubMan(r);
      s.subscribe('obj1', obj1, 'test');
      s.unsubscribe('obj1', 'test');

      var exited = false;
      s.on('message', function(channel, subs, message) {
        if (!exited) return done(new Error('Should not get here'));
      });

      setTimeout(function() {
        redisClient.publish('test', 'message');
      }, 10);

      setTimeout(function() {
        exited = true;
        done();
      }, 100);
    });

  });

});


/**
 * Helpers
 * =============================================================================
 */

function checkChannelList(channels, done) {
  channels = channels.sort(function (a,b) { return a > b; });
  setTimeout(function() {
    redisClient.pubsub('channels', function(err, c) {
      if (err) return done(err);

      c = c.sort(function (a,b) { return a > b; });

      c.should.eql(channels);
      done();
    });
  }, 20);
}