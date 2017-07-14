var request = require("request")
// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */

        if (event.session.application.applicationId !== "amzn1.ask.skill.f695e7f3-edd7-49d9-9f1b-6741bdf4ee36") {
            context.fail("Invalid Application ID");
        }
        
        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                event.session,
                function callback(sessionAttributes, speechletResponse) {
                    context.succeed(buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    // add any session init logic here
}

/**
 * Called when the user invokes the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    getWelcomeResponse(callback)
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {

    var intent = intentRequest.intent
    var intentName = intentRequest.intent.name;
    
    //dispatch custom intents to handlers here
    if (intentName == "AskQuestionIntent") {
        handleResponse(intent, session, callback)
    } else if (intentName == "AMAZON.HelpIntent") {
        handleGetHelpRequest(intent, session, callback)
    } else if (intentName == "AMAZON.StopIntent") {
        handleFinishSessionRequest(intent, session, callback)
    } else if (intentName == "AMAZON.CancelIntent") {
        handleFinishSessionRequest(intent, session, callback)
    } else {
        throw "Invalid intent"
    }

}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {

}

// ------- Skill specific logic -------

function getWelcomeResponse(callback) {
    var speechOutput = "Welcome to Wolfram Howl! Ask me any question you wish"
    
    var reprompt = "What is your question?"
    
    var header = "Wolfram Howl"
    
    var shouldEndSession = false
    
    var sessionAttributes = {
        "speechOutput" : speechOutput,
        "repromptText" : reprompt
    }
    
    callback(sessionAttributes, buildSpeechletResponse(header, speechOutput, reprompt, shouldEndSession))
    
}


function url(words) {
    let API_KEY = "4XU7JE-KQVQWHAWXV"
    var url = "https://api.wolframalpha.com/v2/query?input="
    for (var i = 0; i < words.length; i++) {
        url += words[i]
        if (i != (words.length - 1)) {
             url += "+"   
        }
    }
    url += "&format=image,plaintext&output=JSON&appid="
    url += API_KEY
    return url
}

function imageSRC(words) {
    let API_KEY = "4XU7JE-KQVQWHAWXV"
    var url = "http://api.wolframalpha.com/v1/simple?appid="
    url += API_KEY
    url += "&i="
    for (var i = 0; i < words.length; i++) {
        url += words[i]
        if (i != (words.length - 1)) {
             url += "+"   
        }
    }
    return url
}

function getJSON(words, string, callback) {
    var link = url(words)
    console.log(link)
    request.get(link, function(error, response, body){
        var d = JSON.parse(body)
        var result = d //.results
        console.log(result.length)
        if (result != null) {
            if (result["queryresult"]["success"] == true) {
                callback(result["queryresult"]["pods"][1]["subpods"][0]["plaintext"] + ". Did you ask " + string)
            } else {
                callback("Wolfram can not answer this question. Did you ask " + string)
            }
        } else {
            callback("ERROR")
        }
    })
}

function breakDownString(string) {
    brokenDown = [];
    currentString = "";
    for (var i = 0, len = string.length; i <= len; i++) {
        if (string[i] == " " || i == string.length) {
            brokenDown.push(currentString);
            currentString = ""
        } else {
            currentString += string[i];
        }
    }   
    
    return brokenDown
}

function handleResponse(intent, session, callback) {
    var rquestion = intent.slots.answer.value.toLowerCase()
    
    var question = rquestion.replace(/\./g,'')
    
    var shouldRun = true
    if (question == "stop" || question == "cancel" || question == "Alexa stop" || question == "Alexa cancel" || question == "shut up" || question == "Alexa shut up") {
        handleFinishSessionRequest(intent, session, callback)
        shouldRun = false
    } else if (question == "yeah" || question == "yes" || question == "yerp" || question == "si" || question == "yup") {
        callback(session.attributes, buildSpeechletResponseWithoutCard("Great! Please ask another question.", "Please ask another question.", false))
        shouldRun = false
    } else if (question == "no" || question == "nah") {
        callback(session.attributes, buildSpeechletResponseWithoutCard("If you would like to stop the program, say stop or cancel. If not, please ask another question", "If you would like to stop the program, say stop or cancel", false))
        shouldRun = false
    }
    
    var words = breakDownString(question)
    
    var speechOutput = "We have an error"
    
    var shouldEndSession = false
    
    var header = "Wolfram Howl"
    
    getJSON(words, question, function(data) {
        if (data != "ERROR" && shouldRun == true) {
            speechOutput = data
        } else if (data != "ERROR" && shouldRun == false) {
            handleFinishSessionRequest(intent, session, callback)
        }
        callback(session.attributes, buildSpeechletResponseWithImage(header, speechOutput, "Would you like to ask another?", imageSRC(words), shouldEndSession))
    })
    
}

function handleGetHelpRequest(intent, session, callback) {
    if (!session.attributes) {
        session.attributes = {};
    }
    
    var speechOutput = "Please ask me a question"
    var repromptText = speechOutput
    var shouldEndSession = false
    callback(session.attributes, buildSpeechletResponseWithoutCard(speechOutput, repromptText, shouldEndSession))
}

function handleFinishSessionRequest(intent, session, callback) {
    callback(session.attributes, buildSpeechletResponseWithoutCard("Good bye! Thank you for using Wolfram Howl!", "", true));
}


// ------- Helper functions to build responses for Alexa -------


function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: title,
            content: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithImage (title, output, repromptText, imageURL, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Standard",
            title: title,
            text: output,
            image: imageURL
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildSpeechletResponseWithoutCard(output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    };
}

function capitalizeFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}