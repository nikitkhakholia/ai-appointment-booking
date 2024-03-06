import { useEffect, useState } from "react"
import io from "socket.io-client";
import { v4 as uuidv4 } from 'uuid';

const Appointmtnt = () => {
    let aiSocket = null
    let chatId = null
    const [aiConnected, setAiConnected] = useState(false)
    const [callStartTime, setCallStartTime] = useState(0)
    const [callDuration, setCallDuration] = useState(-1)
    const [messages, setMessages] = useState([])
    const [botSpeaking, setBotSpeaking] = useState(false)
    const [botListening, setBotListening] = useState(false)
    const [callConnected, setCallConnected] = useState(false)
    const [messageBeingSent, setMessageBeingSent] = useState('')
    const [doctors, setDoctors] = useState([])
    useEffect(() => {
        if (callStartTime) {
            if (aiConnected) {
                var timeDifferenceInSeconds = Math.floor((new Date() - callStartTime) / 1000);
                setCallDuration([timeDifferenceInSeconds])
            }
        }
        if (!aiConnected) {
            setTimeout(() => {
                setCallDuration(-1)
            }, 5000)
            setCallStartTime(0)
            window.speechSynthesis.cancel()

        }

    }, [callStartTime, callDuration, aiConnected])
    useEffect(() => {
        if (callConnected) {
            let uId = localStorage.getItem("uId")
            if (!uId) {
                uId = uuidv4()
                localStorage.setItem("uId", uId)
            }
            const socket = io("ws://3.26.167.52:8000/assistant");
            socket.on('connect', () => {
                socket.emit("user", { chatId, uId })
                console.log("connected");
                setAiConnected(socket.connected)
                setCallStartTime(new Date())
                aiSocket = socket
            });
            socket.on('disconnect', () => {
                setTimeout(() => {
                    closeSocket()
                }, 5000)
                console.log("disconnected");
            });
            socket.on(uId, (data) => {
                console.log(data);
                if (data.message == "start") {
                    speak(data.messages[0].message)
                    setMessages(data.messages)
                    chatId = data.chatId
                } else {
                    speak(data.message)
                    setMessages(data.messages)
                }
                setMessageBeingSent('')
            })
            aiSocket = socket
        }
    }, [callConnected])



    const createSocket = () => {
        setCallConnected(true)
    }
    const closeSocket = () => {
        aiSocket = null
        setAiConnected(false)
        setCallConnected(false)
        setMessages([])
        chatId = null
        setTimeout(() => {
            window.location.reload()
        }, 5000)
    }
    const speak = (text) => {
        if (!botListening) {
            var speaker = new SpeechSynthesisUtterance(text)
            speaker.onend = e => {
                setBotSpeaking(false)
                listen()
                speaker = null
            }
            window.speechSynthesis.speak(speaker)
            setBotSpeaking(true)
        }
    }

    const listen = () => {
        if (!botSpeaking) {
            setBotListening(true)
            let recognition
            if (window.webkitSpeechRecognition) {

                recognition = new window.webkitSpeechRecognition();
                // recognition.continuous = true
                // recognition.maxAlternatives = 1
                recognition.lang = "en-US"
                recognition.onresult = (e) => {
                    setMessageBeingSent(e.results[0][0].transcript)
                    aiSocket.emit("user", { chatId, uId: localStorage.getItem("uId"), message: e.results[0][0].transcript })
                    console.log('emitted');
                }
                recognition.onend = (e) => {

                }
                recognition.onerror = (e) => {
                    console.log(e.error == "no-speech");
                    closeSocket()
                }
                recognition.start()
            }

        }
    }
    const getDoctors = async () => {
        console.log('in');
        return await fetch("http://3.26.167.52:8000/doctor/appointments")
            .then((res) => res.json())
            .then((d) => setDoctors(d.data))
    }

    useEffect(() => {
        getDoctors();
    }, [])
    return <div className="h-full">
        <div className="h-full bg-cover bg-white" >

            <h1 className="p-4 font-black text-2xl text-center bg-cyan-500">Appointment Booking Platform using AI</h1>
            <div className="bg-white text-center text-lg p-2">
                <h2>Doctors with available appointments</h2>
                <div className="flex justify-center">
                    {doctors.length > 0 && doctors.map((doc) => {
                        return <div key={doc._id} className="p-4 bg-gray-50 shadow-lg rounded-lg m-4 min-w-40">
                            <h3 className="font-extrabold">Dr. {doc.name}</h3>
                            <h4 className="font-light" >{doc.degrees.join()}</h4>
                            <p className="font-thin">Available on</p>
                            <div>{doc.availableAppointments.map(d => <p>{d}</p>)}</div>

                        </div>
                    })}

                </div>
            </div>

            <div className="fixed bottom-4 left-1/2 w-full transform -translate-x-1/2 mb-32 overflow-y-scroll scroll-smooth">
                {messages.length > 0 && messages.map((message, i) => {
                    return <div key={i} className={"flex " + (message.from == "ai" ? "flex-row" : "flex-row-reverse")}>
                        <div className="bg-gray-950 w-10 h-10 p-2 m-2 rounded-full text-white font-bold align-middle text-center ">{message.from == "ai" ? "AI" : "U"}</div>
                        <div className={"m-2 p-2 px-4 bg-white rounded-lg " + (message.from == "user" ? "rounded-tr-none" : "rounded-tl-none")} >{message.message}</div>
                    </div>
                })}
                {messageBeingSent != '' && <div className={"flex " + "flex-row-reverse"}>
                    <div className="bg-gray-950 w-10 h-10 p-2 m-2 rounded-full text-white font-bold align-middle text-center ">{"U"}</div>
                    <div className={"m-2 p-2 px-4 bg-yellow-50 rounded-lg " + "rounded-tr-none"} >{messageBeingSent}</div>
                </div>}
            </div>
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col">

                {!aiConnected && <button
                    className={"bg-green-500 text-green-950 font-bold py-3 px-6 rounded-full m-3 " + (!aiConnected ? "shadow-lg hover:bg-green-700 hover:text-white " : "shadow-none")}
                    onClick={createSocket}
                >
                    {aiConnected ? `${parseInt(callDuration[0] / 60)}:${callDuration[0] % 60}` : "Tap to call"}
                </button>}
                {aiConnected && <div className="text-center">{parseInt(callDuration[0] / 60) + ":" + callDuration[0] % 60}</div>}
                {aiConnected && <button
                    className={"bg-red-500 text-red-950 font-bold py-3 px-6 rounded-full m-3 shadow-lg hover:bg-red-700 hover:text-white mt-1"}
                    onClick={closeSocket}
                >
                    End
                </button>}
            </div>
        </div>
    </div >
}

export default Appointmtnt