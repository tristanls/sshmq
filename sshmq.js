var exec = require( 'child_process' ).exec,
    fs = require( 'fs' ),
    logly = require( 'logly' ),
    spawn = require( 'child_process' ).spawn;

exports.version = 
  JSON.parse( fs.readFileSync( __dirname + '/package.json' ) ).version;

exports.sshmq = function( program, options ) {
  logly.name( program );
  logly.mode( options.loglyMode );
  
  _loadConfigFile( options );
};

var _loadConfigFile = function( options ) {
  var sshmqConfigPath = process.env.SSHMQ;
  
  if ( ! sshmqConfigPath ) {
    logly.debug( 'SSHMQ environment variable not defined' );
    logly.debug( 'looking for sshmq_config.json in ' + process.cwd() );
    sshmqConfigPath = './sshmq_config.json';
  } else {
    logly.debug( 'SSHMQ=' + sshmqConfigPath );
    sshmqConfigPath = sshmqConfigPath + '/sshmq_config.json';
  }
  
  fs.readFile( sshmqConfigPath, 'utf-8', function( err, data ) {
    if ( err ) {
      logly.error( err.message );
      process.exit( err.errno );
    }
    _parseConfigFile( data, options );
  });
};

var _parseConfigFile = function( data, options ) {
  logly.debug( 'parsing config file...' );
  
  var config = {};
  try {
    config = JSON.parse( data );
  } catch ( error ) {
    logly.error( 'failed to parse sshmq_config.json' );
    process.exit( 1 );
  }
  
  logly.debug( function() {
    var util = require( 'util' );
    logly.debug( 'parsed sshd_config.json\n' + util.inspect( config ) );
  });
  
  if ( options.mode == 'send' ) {
    logly.debug( 'sending to recipients: ' + options.recipients );
    var encodedMessage = new Buffer( options.message ).toString( 'base64' );
    for ( var index in options.recipients ) {
      var recipient = options.recipients[ index ];
      if ( config.recipients[ recipient ] ) {
        // only send messages if we configured the recipient in config file
        _send( config.username, 
          recipient, config.recipients[ recipient ], encodedMessage, 
          options.dryRun );
      } else {
        // warn about none-configured recipients
        logly.warn( 'ignoring recipient ' + recipient + ' because it is not ' +
            'configured in sshmq_config file' );
      }
    }
  } else if ( options.mode == 'receive' ) {
    logly.debug( 'receiving message...' );
    var decodedMessage = new Buffer( options.message, 'base64' ).toString( 'utf8' );
    _receive( config.handler, decodedMessage, options.dryRun );
  } else {
    logly.error( "invalid mode '" + options.mode + "', aborting..." );
  }
};

var _send = function( username, recipient, identityFile, encodedMessage, dryRun ) {
  var cmd = 'ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no ' 
    + username + '@' + recipient + ' -i ' + identityFile +
    ' "sshmq -r -m ' + encodedMessage + '"';
  logly.debug( 'executing: ' + cmd );
  if ( ! dryRun ) {
    var ssh = spawn( 'ssh',
      [ '-o', 'UserKnownHostsFile=/dev/null', '-o', 'StrictHostKeyChecking=no',
        username + '@' + recipient, '-i', identityFile, 
        '"sshmq -r -m ' + encodedMessage + '"'
        ]);
    var done = false;
    ssh.stdout.on( 'data', function( data ) {
      logly.log( '[' + recipient + '] - ' + data );
    });
    ssh.stderr.on( 'data', function( data ) {
      logly.error( '[' + recipient + '] - ' + data );
    });
    ssh.on( 'exit', function( code ) {
      done = true;
      if ( code == 0 ) {
        logly.debug( '[' + recipient + '] - message sent' );
      } else if ( code ){
        logly.error( '[' + recipient + '] - exited with error code: ' + code );
      } else {
        logly.error( '[' + recipient + '] - timed out (check for errors)' );
      }
    });
    setTimeout( function() {
      if ( ! done ) {
        ssh.kill(); // if process is still alive after 5 seconds, kill it
      }
    }, 10000 ); 
  }
};

var _receive = function( messageHandler, decodedMessage, dryRun ) {
  logly.debug( 'received: ' + decodedMessage );
  
  var handler = {};
  try {
    handler = require( messageHandler );
  } catch ( error ) {
    logly.error( error.message );
    process.exit( 1 );
  }
  
  if ( ! dryRun ) {
    handler.handle( decodedMessage );
  }
};