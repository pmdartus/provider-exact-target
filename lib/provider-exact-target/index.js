'use strict';
/**
 * This object contains all the handlers to use for this provider
 */
var soap = require('soap');

var config = require('../../config/configuration.js');
var urlExactTarget = 'https://webservice.s4.exacttarget.com/etframework.wsdl';
var allowed_types = ['Sent', 'Open', 'Click', 'unsub', 'NotSent'];

var downloadEvent = function(err, i, events, client, cb){
  if(i<allowed_types.length){
    client.Retrieve({RetrieveRequest: {ObjectType: allowed_types[i]+'Event', "Properties" : ["SubscriberKey", "EventDate", "SendID"]}}, function(err, resEvent) {
      if(resEvent.Results){
        for (var j = 0; j < resEvent.Results.length; j++) {
          var evKey = resEvent.Results[j].SendID + "||" + resEvent.Results[j].SubscriberKey;
          if(typeof(events[evKey]) == "undefined" || events[evKey].time < new Date(resEvent.Results[j].EventDate)){
            events[evKey] = {
              time : new Date(resEvent.Results[j].EventDate),
              type : allowed_types[i]
            };
          }
        };
      }
      downloadEvent(err, ++i, events, client, cb);
    });
  }
  else{
    cb(err, events);
  }
};

var initAccount = function(req, next) {
  var redirectUrl = 'http://localhost:8000/login';
  redirectUrl += '?state=' + req.params.code;

  next(null, {state: req.params.code}, redirectUrl);
};

var connectAccountRetrievePreDatasIdentifier = function(req, next) {
  // Add all the infos and store it there
  next(null, {'datas.state': req.params.state});
};

var connectAccountRetrieveAuthDatas = function(req, preDatas, next) {
  console.log('Adding a new provider');

  next(null, req.params);
};

var updateAccount = function(idents, cursor, next) {
  soap.createClient(urlExactTarget, function(err, client) {
    // Authenticate the selected user
    client.setSecurity(new soap.WSSecurity(idents.login, idents.password));

    var campaigns  = [];
    client.Retrieve({RetrieveRequest: {ObjectType: 'Send', "Properties" : ["ID", "PreviewURL", "EmailName", "FromName", "SendDate", "Subject"]}}, function(err, resSends){
      if (err) {return next(err);}

      // Save All campaigns
      for (var i = 0; i < resSends.Results.length; i++) {
        campaigns["c" +resSends.Results[i].ID] = resSends.Results[i];
      }

      var upload = [];
      downloadEvent(err, 0, [], client, function(err, events){
        for(var k in events){
          var campaign = campaigns['c' + k.split('||')[0]];
          upload.push({
            identifier : k,
            creation_date : campaign.SendDate,
            last_modification : events[k].time,
            metadatas : {
              target : k.split('||')[1]
            },
            semantic_document_type: 'campaign',
            actions: {
              'show': campaign.PreviewURL
            },
            datas : {
              status : events[k].type,
              campaign_name : campaign.EmailName,
              subject : campaign.Subject,
              fromName : campaign.FromName,

            }
          });
        }
        next(null, upload, new Date());
      });    
    });
  });
};

var queueWorker = function(campaign, CluestrClient, cb) {
  campaign.user_access = [CluestrClient.accessToken];
  CluestrClient.sendDocument(campaign, function(err, res) {
    console.log(err, res);
    cb();
  });
};

module.exports = {
  initAccount: initAccount,
  connectAccountRetrievePreDatasIdentifier: connectAccountRetrievePreDatasIdentifier,
  connectAccountRetrieveAuthDatas: connectAccountRetrieveAuthDatas,
  updateAccount: updateAccount,
  queueWorker: queueWorker,

  cluestrAppId: config.cluestr_id,
  cluestrAppSecret: config.cluestr_secret,
  connectUrl: config.connect_url
};
