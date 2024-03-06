const Doctor = require("../Models/Doctor")
const { getDoctorsAndAvailableAppointments } = require("../Services/doctor.service")

exports.createDoctor = async (req, res) => {
    try {
        // creating a new doctor
        let { name, hospital, experience, degrees, } = req.body
        let doctor = new Doctor({ name, hospital, experience, degrees })
        let doctorSaved = await doctor.save()
        res.json({ data: doctorSaved })
    } catch (err) {
        console.error("createDoctor", err)
        res.status(400).json({ meaasge: err.message })
    }
}
exports.getDoctors = async (req, res) => {
    try {
        // get all doctors paginated
        let { page, limit } = req.query
        let doctors = await Doctor.find()
            .skip(limit * page)
            .limit(limit)
            .lean()
        res.json({ data: doctors })
    } catch (err) {
        console.error("getDoctors", err)
        res.status(400).json({ meaasge: err.message })
    }
}
exports.addAvailableAppointments = async (req, res) => {
    try {
        // add available slots for doctor
        let { date, _id } = req.body

        let doctor = await Doctor.findOneAndUpdate(
            { _id },
            {
                $push:
                    { "availableAppointments": date }
            },
            { new: true }
        )
        res.json({ data: doctor })
    } catch (err) {
        console.error("addAvailableAppointments", err)
        res.status(400).json({ meaasge: err.message })
    }
}
exports.getAvailableAppointments = async (req, res) => {
    try {
        res.json({ data: await getDoctorsAndAvailableAppointments() })
    } catch (err) {
        console.error("getAvailableAppointments", err)
        res.status(400).json({ meaasge: err.message })
    }
}