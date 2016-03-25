// Let's model a login sequence.
var config = {
    startState: 'LoggedOut',
    states: {
        'LoggedOut': {
			events: {
                'login': { toState: 'LoggingIn'}
            },
            actions: {
                onEnter: function() { console.log('You have been logged out.') }
            }
        },
        'LoggingIn': {
			events: {
                'success': { toState: 'LoggedIn'},
                'failure': {
                    toState: 'LoggedOut',
                    onBefore: function() { console.log('Login FAILED.') }
                }
            }
        },
        'LoggedIn': {
			events: {
                'logout': {
                    toState: 'LoggedOut',
                    onAfter: function() { console.log('Thanks for playing!') }
                }
            },
            actions: {
                onEnter: function() { console.log('You are now logged in.') }
            }
        }
    }
};

// Load the module and call the factory method to create a new instance.
var FSM = require('@pxtrick/fsm');
var fsm = FSM.newFSM(config);

if (fsm.isValid()) {
    // Handle state-changing events.

    console.log('I am ' + fsm.currentState() + ', calling "login" ...');
    fsm.handleEvent('login');

    console.log('I am ' + fsm.currentState() + ', calling "failure" ...');
    fsm.handleEvent('failure');

    console.log('I am ' + fsm.currentState() + ', calling "login" ...');
    fsm.handleEvent('login');

    console.log('I am ' + fsm.currentState() + ', calling "success" ...');
    fsm.handleEvent('success');

    console.log('I am ' + fsm.currentState() + ', calling "logout" ...');
    fsm.handleEvent('logout');
}
