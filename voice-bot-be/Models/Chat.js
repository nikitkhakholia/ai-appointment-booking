const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    user: String,
    threadId: String,
    assistantId: String,
    messages: [Object]

}, { timestamps: true });

module.exports = mongoose.model("Chat", chatSchema);
