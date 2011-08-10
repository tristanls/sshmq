sshmq
====

`sshmq` is a way to send messages between machines using key-authenticated
`ssh`.

## Setup

`sshmq` needs to be setup on both the sending and receiving machine. 
Because of heavy reliance on `ssh` and ability for users to log in, `sshmq` is 
intended for use with "infrastructure-as-code" frameworks.

`sshmq` requires two files to be present: `sshmq_config.json` and a handler module.

### sshmq_config.json

Example file can be found at `/example/sshmq_config.json`. Because we have to
setup the machines anyway, the easiest ( and only ) way to specify where
a configuration file resides is via `SSHMQ` environment variable. If configuration
file is at `/etc/sshmq/sshmq_config.json` then `SSHMQ=/etc/sshmq`. Currently
the name of the file is hardcoded to `sshmq_config.json`. If `SSHMQ` environment
variable is not set, `sshmq` will attempt to look for `sshmq_config.json` inside
`process.cwd()`.

    { "username" : "ssh-username"
    , "handler" : "./example/handler.js"
    , "recipients" : {
        "192.168.1.2" : "/path/to/identity/file"
      , "192.168.1.1" : "/home/username/.ssh/private_key"
      }
    }
    
`username` is the username that `ssh` will try to connect with along the lines
of `ssh username@<server>`.

`recipients` is a dictionary of available recipients and the corresponding
identity files to use when `ssh` will attempt to connect to them. An example
of what `ssh` would try to do is `ssh username@192.168.1.2 -i /path/to/identity/file` or
`ssh username@192.168.1.1 -i /home/username/.ssh/private_key`

`handler` is a `node` module that exports `handle` function that accepts a single
`message` string ( see `./example/handler.js` ). `sshmq` will attempt to 
`require('your_handler_module_name')`.

### handler.js

    exports.handle = function( message ) {
      // code to handle the message
    }
    
## Usage

### sending messages

via command line:

    sshmq -s 192.168.1.1,192.168.1.2 -m "some message"
    
the best way to try to get `sshmq` to work is to turn on `debug` mode and 
solve each issue that comes up. `debug` is pretty descriptive in how `sshmq`
works

    sshmq -s 192.168.1.1,192.168.1.2 -m "some message" --debug
    
if you don't like attempting `ssh` connections while debugging, you can do 
a `dry-run`

    sshmq -s 192.168.1.1,192.168.1.2 -m "some message" --debug --dry-run
    
programmatically:

    var sshmq = require( 'sshmq' ),
        options = {
          loglyMode: 'debug',
          dryRun: true,
          message: 'some message',
          mode: 'send'
        };
    sshmq.sshmq( 'sshmq', options );
    
### receiving messages

When sending a message, `sshmq` will make an `ssh` connection to the server and
attempt to execute the follwing command `sshmq -r -m "<base64 message>"` on
the remote machine ( this is why `sshmq` must be set up on both machines ).

locally via command line:

    sshmq -r -m "c29tZSBtZXNzYWdl"
    
\*note: `sshmq` encodes messages in `base64` so that an arbitrary message can be sent
    
just like when sending, we can receive in `debug` mode or do a `dry-run`.

    sshmq -r -m "c29tZSBtZXNzYWdl" --debug
    sshmq -r -m "c29tZSBtZXNzYWdl" --debug --dry-run
    
programmatically: 

    var sshmq = require( 'sshmq' ),
        options = {
          loglyMode: 'debug',
          dryRun: true,
          message: 'c29tZSBtZXNzYWdl',
          mode: 'receive'
        };
    sshmq.sshmq( 'sshmq', options );