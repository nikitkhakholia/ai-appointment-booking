const Doctor = require("../Models/Doctor");

exports.getDoctorsAndAvailableAppointments = async () => {
    try {
        let doctors = await Doctor.find({ "availableAppointments": { $exists: true, $ne: [] } }).select("name availableAppointments bookedAppointments degrees").lean()
        return doctors
    } catch (err) {
        console.error("getDoctorsAndAvailableAppointments", err);
    }
}
exports.bookAppointment = async (name, time, user) => {
    try {
        let doctor = await Doctor.findOne({ name })
        let x = doctor.availableAppointments.indexOf(time)
        if (x > -1) {
            doctor.bookedAppointments.push({
                user, time
            })
            doctor.availableAppointments.splice(x, 1)
            doctor.markModified("availableAppointments bookedAppointments")
            await doctor.save()
            return true

        } else return false
    } catch (err) {
        console.error("bookAppointment", err);
    }
}
exports.cancelAppointment = async (name, user) => {
    try {
        let doctor = await Doctor.findOne({ name })
        let x = doctor.bookedAppointments.findIndex(a => a.user == user)
        if (x > -1) {
            let c = doctor.bookedAppointments.slice(x, 0)
            doctor.availableAppointments.push(c.time)
            doctor.markModified("availableAppointments bookedAppointments")
            await doctor.save()
            return true

        } else return false
    } catch (err) {
        console.error("cancelAppointment", err);
    }
}