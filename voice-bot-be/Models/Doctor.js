const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
    name: String,
    hospital: String,
    experience: String,
    degrees: [String],
    bookedAppointments: [Object],
    availableAppointments: [String]
}, { timestamps: true });

module.exports = mongoose.model("Doctor", doctorSchema);
