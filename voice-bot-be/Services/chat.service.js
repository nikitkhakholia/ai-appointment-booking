const { default: OpenAI } = require("openai");
const Chat = require("../Models/Chat");
const { getDoctorsAndAvailableAppointments, bookAppointment, cancelAppointment } = require("./doctor.service");

let assistantId = "asst_cXD3xi2EoEy3gVdDvum4oXMM"
let openai = new OpenAI()

exports.getChat = async (newChat = true, user, chatId) => {
    try {
        // start a new chat
        if (newChat) {
            const thread = await openai.beta.threads.create();
            let chat = new Chat({
                user,
                threadId: thread.id,
                assistantId: assistantId,
                messages: [{
                    message: "Hello, thanks for calling Dr. Archer’s office. How may I assist you today?",
                    from: "ai"
                }]
            })
            await chat.save()

            // await openai.beta.threads.messages.create(
            //     chat.threadId,
            //     {
            //         role: "admin",
            //         content: "Appointments \n"+getDoctorsAndAvailableAppointments()
            //     }
            // );
            return chat
        }
        // existing chat
        else {
            let chat = await Chat.find({ user, _id: chatId }, {})
            return chat[chat.length - 1]
        }

    } catch (err) {
        console.log("getChat", err);
    }
}
exports.sendMessagesToChatAndRun = async (chatId, message, aiOnly) => {
    try {
        // add message to chat
        let chat = await this.replyToChat(chatId, message, "user")
        if (chat) {
            // send message to ai
            await openai.beta.threads.messages.create(
                chat.threadId,
                {
                    role: "user",
                    content: message
                }
            );

            // run ai
            let doctorsAvailibility = ""
            let docs = await getDoctorsAndAvailableAppointments()
            for (x = 0; x < docs.length; x++) {
                doctorsAvailibility += "doctor " + docs[x].name + " is available on " + docs[x].availableAppointments.join(",") + " and booked on " + docs[x].bookedAppointments.join(",") + " \n"
            }
            let run = await openai.beta.threads.runs.create(
                chat.threadId,
                {
                    assistant_id: "asst_cXD3xi2EoEy3gVdDvum4oXMM",
                    // model: "gpt-4-turbo-preview",
                    instructions: `
                        user id = "${chat.user}"
                        assume todays date is ${new Date().toDateString()}

                        doctor and appointment data
                        ${doctorsAvailibility}

                        You are a assistant who can book an appointment for the caller. you can also help with reschedule and cancel.Steps to do so are given below.

                        To book appointment:- identify the doctor and date of booking then check if date available in availableAppointments array of the same doctor given in instruction if date is available in instruction then call bookAppointment function if time is availavle for the doctor in instruction
                        To cancel an appointment:- identify the doctor, user id is "${chat.user}" in objects available in the bookedAppointments array of the same doctor, if found then call cancelAppointment function 
                        To reschedule an appointment:- do previous to steps book followed by cancel

                        try to gain all the details form user in multiple messages

                        if user replies with days like mondays or 24 march then you must convert it into required format

                        maintain a calm attitude throught the chat             
                    `,
                    tools: [{
                        "type": "function",
                        "function": {
                            "name": "bookAppointment",
                            "description": "Books an appointment for the given doctor name at given time in ISO format",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "name": { "type": "string", "description": "name of the doctor e.g. Ragini, Anushree, Poddar, Ankur, Mukesh" },
                                    "time": { "type": "string", "description": "date of the booking in this format  YYYY-MM-DD which must be present in in availableAppointments of the doctor given in instructions All Doctor Details" },
                                    "user": { "type": "string", "description": "user id given in instruction" }

                                },
                                "required": ["name", "time", "user"]
                            }
                        }
                    }, {
                        "type": "function",
                        "function": {
                            "name": "cancelAppointment",
                            "description": "cancels an appointment for given doctor and user",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "name": { "type": "string", "description": "name of the doctor e.g. Ragini, Anushree, Poddar, Ankur, Mukesh" },
                                    "user": { "type": "string", "description": "user id given in instruction" },
                                },
                                "required": ["name", "user"]
                            }
                        }
                    }]
                }
            )
            console.log(run.id, chat.threadId);
            // wait for reply
            let data = { status: "na" }
            while (!(data.status == "completed" || data.status == "requires_action")) {
                console.log(data.status);
                data = await openai.beta.threads.runs.retrieve(
                    chat.threadId,
                    run.id
                );

            }
            var messageToSend
            if (data.status == "requires_action") {
                for (let x = 0; x < data.required_action.submit_tool_outputs.tool_calls.length; x++) {
                    let action = data.required_action.submit_tool_outputs.tool_calls[x]
                    if (action.type == "function") {
                        if (action.function.name == "bookAppointment") {
                            let { name, time, user } = JSON.parse(action.function.arguments)
                            if (await bookAppointment(name, time, user)) messageToSend = "Appointment booked."
                            else messageToSend = "Could not book the appointment due to unavailability. Please reconnect the call"
                        }
                        if (action.function.name == "cancelAppointment") {
                            let { name, user } = JSON.parse(action.function.arguments)
                            if (await cancelAppointment(name, user)) messageToSend = "Appointment Canceled"
                            else messageToSend = "Could not book the appointment due to unavailability. Please reconnect the call"
                        }
                    }
                }

            } else if (data.status == "completed") {
                const messages = await openai.beta.threads.messages.list(chat.threadId);
                messageToSend = messages.body.data[0].content[0].text.value
            }
            // check message and send to user
            await this.replyToChat(chatId, messageToSend, "ai")
            return messageToSend
        } else {
            throw new Error("Chat not found " + chatId)
        }
    } catch (err) {
        console.error("sendMessagesToChatAndRun", err);
    }
}
exports.replyToChat = async (chatId, message, from) => {
    try {
        // add reply to chat
        let chat = await Chat.findOneAndUpdate(
            { _id: chatId },
            { $push: { "messages": { message, from } } },
            { new: true }
        )
        return chat
    } catch (err) {
        console.error("replyToChat", err);
    }
}

exports.runData = async (threadId, runId) => {
    let data = await openai.beta.threads.runs.retrieve(
        threadId,
        runId
    );
    if (data.status == "requires_action") {
        for (let x = 0; x < data.required_action.submit_tool_outputs.tool_calls.length; x++) {
            let action = data.required_action.submit_tool_outputs.tool_calls[x]
            console.log(action);
            if (action.type == "function") {
                console.log(2);
                if (action.function.name == "bookAppointment") {
                    console.log(3);
                    let { name, time, user } = JSON.parse(action.function.arguments)
                    if (!(await bookAppointment(name, time, user))) {

                    } else {
                        data.status
                    }
                }
                if (action.function.name == "cancelAppointment") {
                    let { name, user } = JSON.parse(action.function.arguments)
                    await cancelAppointment(name, user)
                }
            }
        }

    }
}