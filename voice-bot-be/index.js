const mongoose = require('mongoose');
const http = require('http')
const cors = require("cors")
let Express = require("express")
let Socket = require('socket.io');
const { getChat, sendMessagesToChatAndRun, runData } = require('./Services/chat.service');
const { getDoctorsAndAvailableAppointments } = require('./Services/doctor.service');

async function startApp(params) {
    // connecting to data base
    await mongoose.connect("db path from environment");
    console.log('🟢 DB Connected');


    // express apis
    let app = Express()
    app.use(Express.json())
    app.use(cors())

    app.use("/doctor", require("./Views/doctor.view"))

    // http server from express for web socket
    let server = http.createServer(app)

    // allowing socket from localhost
    const io = Socket(server, {
        cors: {
            origin: "http://localhost:3000"
        }
    });

    // creating socket endpoint and listening to events
    io.of("/assistant").on('connection', socket => {
        console.log("connected", socket.id)
        socket.on('user', async (data) => {
            let chat
            if (data.chatId) {
                let aiReply = await sendMessagesToChatAndRun(data.chatId, data.message)
                chat = await getChat(false, data.uId, data.chatId)
                socket.emit(data.uId, {
                    message: aiReply,
                    messages: chat.messages,
                    chatId: chat._id
                })
                if (aiReply.startsWith("Could not book the appointment") || aiReply.startsWith("Appointment booked.") || aiReply.startsWith("Appointment Canceled")) {
                    setTimeout(() => {
                        socket.disconnect()
                    }, 3000)
                }


            } else {
                chat = await getChat(true, data.uId, null)
                socket.emit(data.uId, {
                    message: "start",
                    messages: chat.messages,
                    chatId: chat._id
                })
            }
        });
        socket.on("disconnect", (x) => console.log("disconnected", socket.id))
    });

    server.listen(8000, async () => {
        console.log("🟢 Server Started");

        runData("thread_aWdWXn9qlTjRbKfU4NQHtdJ3", "run_TUGH0xpH8FTxKXKvzWPR7sCl")

    })
    // console.log(JSON.stringify(await getDoctorsAndAvailableAppointments()))
}
startApp()