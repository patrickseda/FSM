/**
 * -- Finite State Machine (FSM) --
 *
 * DESCRIPTION:
 * A JavaScript module which provides simple finite-state machine behavior.
 *
 * These core elements of a traditional finite-state machine are available for configuration:
 *    - State names
 *    - Transitions (events)
 *    - Pre-transition behavior
 *    - Post-transition behavior
 *    - Actions always occurring upon state entry
 *    - Actions always occurring upon state exit
 *
 * SAMPLE USAGE:
 *     // Model a light switch.
 *     var config = {
 *          startState: 'Off',
 *          states: {
 *              'Off': { events: { 'turnOn': { toState: 'On' } } },
 *              'On': { events: { 'turnOff': { toState: 'Off' } } }
 *          }
 *     };
 *
 *     // Load the module and call the factory method to create a new instance.
 *     var FSM = require('FSM');
 *     var fsm = FSM.newFSM(config);
 *
 *     if (fsm.isValid()) {
 *         // Handle state-changing events.
 *         fsm.handleEvent('turnOn');   // fsm.currentState() === 'On';
 *         fsm.handleEvent('turnOff');  // fsm.currentState() === 'Off';
 *     }
 *
 * DEPENDENCIES:
 * This module is dependent on the 'lodash' JavaScript library.
 *
 * AUTHOR: Patrick Seda @pxtrick
 */

// Factory method to create a new object.
exports.newFSM = function(userConfig) {
    var _ = require('lodash');
    var config = _.cloneDeep(userConfig || {});

    var isInternalValid = false;
    var current = null;
    var initStatus = exports.OK;

    (function init() {
        // Keep track of validation errors.
        var hasInvalidStartState = false;
        var hasInvalidStateNodes = false;
        var hasInvalidEventNode = false;
        var hasInvalidToState = false;
        var hasInvalidTransitionFunction = false;
        var hasInvalidActionFunction = false;

        // Load the configuration.
        var states = config.states;
        if (states) {

            var stateNames = _.keys(states);

            // Verify the start state is valid.
            var startState = _.isString(config.startState) ? config.startState : null;
            if (states[startState]) {
                current = startState;
            } else {
                if (startState) {
                    console.log('[FSM] - WARNING: Start state "' + startState + '" is not a valid state name.');
                }
                hasInvalidStartState = true;
                initStatus = exports.ERROR_INVALID_START_STATE;
                console.error('[FSM] - ERROR: Could not determine a valid start state.');
            }

            if (stateNames.length < 1) {
                console.log('[FSM] - ERROR: Configuration has no valid States specified.');
                initStatus = exports.ERROR_NO_VALID_STATES;
                hasInvalidStateNodes = true;
            }

            // Inspect all the states for bad transitions.
            _.each(states, function(state, stateName) {

                var events = state.events;
                var eventNames = _.keys(events);
                if (eventNames.length < 1) {

                    // No events for this state.
                    console.log('[FSM] - WARNING: State "' + stateName + '" has no configured events, upon entry you will never be able to leave.');
                } else {
                    // Inspect the action functions.
                    var actions = state.actions;
                    if (actions) {
                        if (actions.onEnter && !_.isFunction(actions.onEnter)) {
                            console.log('[FSM] - ERROR: State "' + stateName + '" has an invalid "onEnter" action, it should be a function.');
                            hasInvalidActionFunction = true;
                        }
                        if (actions.onExit && !_.isFunction(actions.onExit)) {
                            console.log('[FSM] - ERROR: State "' + stateName + '" has an invalid "onExit" action, it should be a function.');
                            hasInvalidActionFunction = true;
                        }
                        hasInvalidActionFunction && (initStatus = exports.ERROR_INVALID_ACTION_FUNCTION);
                    }

                    // Inspect the events.
                    _.each(events, function(event, eventName) {
                        if (!event) {
                            console.log('[FSM] - ERROR: State "' + stateName + '" has an invalid "event" node.');
                            initStatus = exports.ERROR_INVALID_EVENT_NODE;
                            hasInvalidEventNode = true;
                        } else {
                            // Inspect the transition functions.
                            if (event.onBefore && !_.isFunction(event.onBefore)) {
                                console.log('[FSM] - ERROR: Event "' + eventName + '" for state "' + stateName + '" has an invalid "onBefore", it should be a function.');
                                hasInvalidTransitionFunction = true;
                            }
                            if (event.onAfter && !_.isFunction(event.onAfter)) {
                                console.log('[FSM] - ERROR: Event "' + eventName + '" for state "' + stateName + '" has an invalid "onAfter", it should be a function.');
                                hasInvalidTransitionFunction = true;
                            }
                            hasInvalidTransitionFunction && (initStatus = exports.ERROR_INVALID_TRANSISTION_FUNCTION);

                            var isToStateString = _.isString(event.toState);
                            if (!isToStateString || !states[event.toState]) {
                                hasInvalidToState = true;
                                if (isToStateString && event.toState) {
                                    console.log('[FSM] - ERROR: Event "' + eventName + '" for state "' + stateName + '" has an unknown target state of "' + event.toState + '".');
                                } else {
                                    console.log('[FSM] - ERROR: Event "' + eventName + '" for state "' + stateName + '" has no valid target state specified.');
                                }
                                initStatus = exports.ERROR_INVALID_TARGET_STATE;
                            }
                        }
                    });
                }
            });
        } else {
            console.log('[FSM] - ERROR: Configuration has no valid States specified.');
            initStatus = exports.ERROR_NO_VALID_STATES;
            hasInvalidStateNodes = true;
        }
        isInternalValid = !hasInvalidStartState && !hasInvalidStateNodes
                            && !hasInvalidEventNode && !hasInvalidToState
                            && !hasInvalidActionFunction && !hasInvalidTransitionFunction;
    })();


    // Attempt to handle the state transition for the given event.
    //    Possible return values:
    //    - Success: FSM.OK
    //    - Failure: FSM.ERROR_ILLEGAL_EVENT           - (An unknown event was requested)
    //               FSM.ERROR_IMPROPERLY_INITIALIZED  - (The FSM object was never initialized properly)
    //               FSM.ERROR_INVALID_TARGET_STATE    - (The requested event points to an unknown target state)
    function handleEvent(name) {
        if (!isInternalValid) {
            console.error('[FSM] - ERROR: This object was not initialized properly and is inoperable. (' + exports.ERROR_IMPROPERLY_INITIALIZED + ')');
            return exports.ERROR_IMPROPERLY_INITIALIZED;
        }

        if (canHandleEvent(name)) {

            // We know about this event name.
            var eventNode = config.states[current].events[name];
            // Check if we know about the target state.
            if (_.has(config.states, eventNode.toState)) {

                // Check for any "actions" callbacks.
                var currentActionsNode = config.states[current]['actions'] || {};
                var targetActionsNode = config.states[eventNode.toState]['actions'] || {};
                var onExitCurrentState = currentActionsNode.onExit;
                var onEnterTargetState = targetActionsNode.onEnter;

                // Pre-transition callbacks.
                _.isFunction(eventNode.onBefore) && eventNode.onBefore();
                _.isFunction(onExitCurrentState) && onExitCurrentState();

                // Perform the transition.
                current = eventNode.toState;

                // Post-transition callbacks.
                _.isFunction(onEnterTargetState) && onEnterTargetState();
                _.isFunction(eventNode.onAfter) && eventNode.onAfter();
                return exports.OK;

            } else {
                // We know about this event, but the target state is unknown.
                console.log('[FSM] - ERROR: Current state "' + current + '" cannot handle event "' + name + '", invalid target state "' + eventNode.toState + '".');
                return exports.ERROR_INVALID_TARGET_STATE;
            }
        } else {
            // We don't know about this event.
            console.log('[FSM] - ERROR: Event "' + name + '" is unknown to current state "' + current + '", no state change occurred.');
            return exports.ERROR_ILLEGAL_EVENT;
        }
    }

    // Check if the event is registered for the current state.
    function canHandleEvent(name) {
        if (!isInternalValid) {
            console.error('[FSM] - ERROR: This object was not initialized properly and is inoperable. (statusCode=' + exports.ERROR_IMPROPERLY_INITIALIZED + ')');
            return false;
        }
        return _.has(config.states[current].events, name);
    }

    // Get the status of the initialization.
    function status() {
        return initStatus;
    }

    // Get the name of the current state.
    function currentState() {
        return current;
    }

    // Get the name of the current state.
    function isValid() {
        return (initStatus === exports.OK);
    }


    // Public API.
    var publicApi = {
        isValid: isValid,
        status: status,
        currentState: currentState,
        canHandleEvent: canHandleEvent,
        handleEvent: handleEvent
    };
    return publicApi;
};


// Status codes.
exports.OK = 'OK';
exports.ERROR_ILLEGAL_EVENT ='ERROR_ILLEGAL_EVENT';
exports.ERROR_INVALID_START_STATE = 'ERROR_INVALID_START_STATE';
exports.ERROR_NO_VALID_STATES = 'ERROR_NO_VALID_STATES';
exports.ERROR_INVALID_EVENT_NODE = 'ERROR_INVALID_EVENT_NODE';
exports.ERROR_INVALID_TARGET_STATE = 'ERROR_INVALID_TARGET_STATE';
exports.ERROR_INVALID_TRANSISTION_FUNCTION = 'ERROR_INVALID_TRANSISTION_FUNCTION';
exports.ERROR_INVALID_ACTION_FUNCTION = 'ERROR_INVALID_ACTION_FUNCTION';
exports.ERROR_IMPROPERLY_INITIALIZED = 'ERROR_IMPROPERLY_INITIALIZED';
