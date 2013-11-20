"use strict";

// Load configuration and initialize server
var restify = require('restify');
var cluestrProvider = require('cluestr-provider');
var serverConfig = require('./lib/provider-exact-target');

var server = cluestrProvider.createServer(serverConfig);

server.get('/login', function (req, res, next) {

  var body = '<html><body>';
  body += '<form action="auth" method="post">';
  body += 'Login: <input type="text" name="login"><br>';
  body += 'Password: <input type="password" name="password"><br>';
  body += '<input type="hidden" name="code" value="' + req.params.code + '">';
  body += '<input type="submit" value="Submit">';
  body += '</form>';
  body += '</body></html>';

  res.writeHead(200, {
    'Content-Length': Buffer.byteLength(body),
    'Content-Type': 'text/html'
  });
  res.write(body);
  res.end();

  console.log('Display');

});

server.post('/auth', function(req, res, next) {
  console.log(req.params);
  
  res.params = req.params;
  res.header('Location', '/init/callback');
  res.send(302);
  return next(false);
});

// Expose the server
module.exports = server;
